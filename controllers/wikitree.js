const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');
const async = require('async');
const moment = require('moment');
const fs = require('fs');
// var cache = require('memory-cache');
const wikidataLang = require('../public/js/wikidataLang');
var wikidataController = require('../controllers/wikidata');
var processNode = require('../controllers/processNode');
var treeType;
var stackChildren = true;

var maxLevel, chartOptions = [];
var labelIds = [];
var rows = [];
var lang;
var secondLang;
//get all default language 
var defLanguage = getWDLanguages;
var relations = [
    { prop: 'P22', name: 'father', to_q: false, edge_color: '#3923D6' },
    { prop: 'P25', name: 'mother', to_q: false, edge_color: '#FF4848' },
    // { prop : 'P40' , name : 'child' , to_q : false , edge_color : '#888888' }
];

var supportedTypes = {
    'ancestors': relations,
    'descendants': [{ prop: 'P40', name: 'child', to_q: false, edge_color: '#888888' }],
    'owner': [
        { prop: 'P127', name: 'owner', to_q: false, edge_color: '#3923D6' },
        { prop: 'P749', name: 'parentOrg', to_q: false, edge_color: '#FF4848' },
    ],
    'owns': [
        { prop: 'P1830', name: 'owns', to_q: false, edge_color: '#3923D6' },
        { prop: 'P355', name: 'subsidiary', to_q: false, edge_color: '#FF4848' },
    ],
    'subclasses': [
        // { prop : 'P1830' , name : 'owns' ,      to_q : false , edge_color : '#3923D6' } ,
        { prop: 'P279', name: 'subclass', to_q: false, edge_color: '#FF4848' },
    ]
};
exports.init = function (request, callback) {
    //from the debugging, it's seems that the data is append to the rows, so we need to initialized it for every request
    //Init container data
    rows =[];
    labelIds = [];
    processNode.nodeImages = [];
    processNode.result.root = null;

    //set MaxLevel to Global so it can be accessed 
    maxLevel = request.maxLevel || 3;
    stackChildren = true;//request.chartOptions.stackChildren ||
    //check primary selected language, change to english if not exist in default language
    lang = (request.lang in defLanguage)? request.lang : "en";
    treeType = request.property;    
    //Second language must in default language and not equal primary language
    secondLang = (request.secondLang in defLanguage && request.secondLang !== request.lang )? request.secondLang : null;
    if (stackChildren == "false" || treeType == "ancestors" || treeType == "owner") { stackChildren = false; }
    // let memCache = new cache.Cache();
    var nocache = request.nocache;
    //configure cached filename with second language
    var cachedKey = "Cache"+request.root + "-L" + maxLevel + "-" + treeType + "-" + lang +(secondLang ? "-"+secondLang : '' ) + ".js";
    console.log("KEy" + cachedKey);
    cachedFilename = __dirname + '/../public/cache/' + cachedKey;
    // let cacheContent = memCache.get(cachedKey);
    // if(cacheContent && nocache != '1'){
    //     callback(cacheContent);
    //     return;
    // }
    // if (fs.existsSync(cachedFilename) && nocache != '1') {
    //     console.log('The path exists.');
    //     let rawdata = fs.readFileSync(cachedFilename);
    //     let result = JSON.parse(rawdata);
    //     callback(result);
    //     return;
    // }

    var itemIds = {};
    itemIds[request.root] = 0;
    getLevel(
        itemIds,
        '',
        lang,
        secondLang,
        maxLevel,
        function () {
            // console.log("DONE");
            // console.log(rows);
            const replaceLabels = (string, values) => string.replace(/{(.*?)}/g,
                /*(match, offset) => (values && values[offset] && values[offset].labels && values[offset].labels[lang]) ?
                    values[offset].labels[lang].value :
                    (values[offset] ? values[offset].id : "??")*/

                (match, offset) => {
                    if (values && values[offset] && values[offset].labels && values[offset].labels[lang]){
                        return values[offset].labels[lang].value
                    }else{
                        if (values[offset]){
                            //Use english label if in not defined in selected language
                            if (values[offset].labels['en'].value){
                                return values[offset].labels['en'].value
                            }else{
                                return values[offset].id 
                            }
                        }else{ 
                            return "??"
                        }
                    }
                }
            );
            //fetch labels for vars
            //TODO no labels
            var data = wikidataController.wikidataApi({
                ids: Array.from(new Set(processNode.labelIds)),//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
                props: 'labels',
                lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
            }, function (data) {

                // console.log(data);
                labels = data.entities;
                console.log("Labels Count :"+ Object.keys(labels).length);
                labels["undefined"] = {
                    id:"null",
                    labels:{
                        en: "null"
                    }
                };
                labels["null"] = labels["undefined"];
                //     // console.log(labels);
                for (row in rows) {
                    //         // console.log(rows[row].innerHTML);
                    rows[row].innerHTML = replaceLabels(rows[row].innerHTML, labels);
                    //replace label for spouse
                    if (rows[row].spouse){
                        rows[row].spouse[0].innerHTML = replaceLabels(rows[row].spouse[0].innerHTML, labels);
                    }
                }
                var result = processNode.result;
                result.rows = rows;
                result.nodeImages = processNode.nodeImages;
                // fs.writeFileSync(cachedFilename, JSON.stringify(result));
                // memCache.put(cachedKey,result,3000*1000);
                callback(result);
            });
        },
        rows
    );
};
var childrenInLevel = {};
function getLevel(item_ids, child_id, lang, secondLang, level, callback, rows) {
    console.log("getLevel", level);
    if (level === 0 || item_ids.length) {
        callback();
        return;
    }
    wikidataController.wikidataApi({
        ids: Object.keys(item_ids),
        // props : 'labels|descriptions|claims|sitelinks/urls' ,
        lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
    }, function (data, items) {
        childrenInLevel = {};
        for(var item_id in data.entities){
            processLevel(data, item_id, item_ids[item_id], lang, secondLang, level, callback, rows);
        }
        if(Object.keys(childrenInLevel).length) {
            getLevel(
                childrenInLevel,
                item_id,
                lang,
                secondLang,
                level - 1,
                callback,
                rows
            );
        }else{
            callback();
        }

    });
}


function processLevel(data, item_id, child_id, lang, secondLang, level) {

    const claims = wbk.simplify.claims(data.entities[item_id].claims, { keepQualifiers: true });//TODO duplicate

    var newRow = processNode.createNode(data, item_id, child_id, lang, secondLang, treeType);
    newRow.stackChildren = stackChildren;
    //check Spouses
    if (claims.P26 && level != maxLevel && treeType === "descendants" ){
        var spouseId = claims.P26[0].value;
        console.log(` SPOUSE EXIST for ${item_id} , the spouse is  ${spouseId} on level ${level}`);
       
        if (spouseId){
            //The spouseId can be combined later
            wikidataController.wikidataApi({
                ids: [spouseId],//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
                props: 'labels|descriptions|claims|sitelinks/urls',
                lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
            }, function (response) {
                if (response.entities){
                    var spouseNode = processNode.createNode(response, spouseId, child_id, lang, treeType);
                    
                    newRow['spouse'] = [spouseNode];
                }
            });
        } 
      
    }//end of spouse

    //check siblings only at the top of the node
    if (claims.P3373 && level == maxLevel && treeType === "ancestors"){

        var siblings = claims.P3373.map(item => (item.value));
        
        console.log(` Sibling EXIST for ${item_id} , sibling count is  ${siblings.length} on level ${level}`);
        
        if (siblings && siblings.length > 0 ){
            //get all siblings
            wikidataController.wikidataApi({
                ids: Array.from(new Set(siblings)),//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
                props: 'labels|descriptions|claims|sitelinks/urls',
                lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
            }, function (response) {
                if (response.entities){
                    Object.keys(response.entities).forEach((key)=>{
                        //push siblings to row and add S_ to identify the sibling connection (to be processed in treant-wikidata.js)
                        var node = processNode.createNode(response, key, 'S_'+item_id, lang, treeType);
                        rows.push(node);
                    });
                }
            });
        } 
    
    }//end of siblings

    // var asyncFunctions = [
    //     function (callback) {
    //         callback(null, rows);
    //     }
    // ];
    var duplicates = rows.some(o => o.id === item_id);
    console.log("Push new row : "+ item_id);
    rows.push(newRow);
    // console.log(duplicates);
    if (!duplicates) {
        // if( && treeType != "ancestors")
        var r = supportedTypes[treeType];
        if (!r) {
            var children = claims[treeType] || [];
        } else {
            // console.log(r);
            var children = claims[r[0].prop] || [];
            if (r[1] && claims[r[1].prop]) {
                children = children.concat(claims[r[1].prop]);
            }
        }
        // var owners = (claims['P127'] || []).concat(claims['P749']);
        var children_distinct_Qids = [];
        // childrenInLevel[item_id]=[];
        for (var child in children) {
            // if (!hasEndQualifier(children[child])) {
            var child_item_id = children[child].value;
            if (children_distinct_Qids.indexOf(child_item_id) == -1) {
                children_distinct_Qids.push(child_item_id);
            }
            // if (childrenInLevel[item_id].indexOf(child_item_id) == -1) {
                childrenInLevel[child_item_id] = item_id;//.push();
            // }
            // }
        }
        // console.log(children_distinct_Qids);
        // for (child in children_distinct_Qids) {
        //     // console.log(owner_distinct_ids[owner]);
        //     asyncFunctions.push(function (child_item_id, callback) {
        //         // console.log(child_item_id);
        //         if (child_item_id) {
        //             getLevel(
        //                 child_item_id,
        //                 item_id,
        //                 lang,
        //                 level - 1,
        //                 callback,
        //                 rows
        //             );
        //         } else {
        //             callback();
        //         }
        //     }.bind(null, children_distinct_Qids[child]));
        // }
        return children_distinct_Qids;



    }




    // async.parallel(asyncFunctions,
    //     function (err, results) {
    //         // console.log("level", level);
    //         // updateRows(rows);
    //         levelCb();
    //     }
    // );
    //do stuff

}