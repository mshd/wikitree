const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');
const async = require('async');
const moment = require('moment');
const fs = require('fs');
const NodeCache = require('node-cache');
// var cache = require('memory-cache');
const wikidataLang = require('../public/js/wikidataLang');
var wikidataController = require('../controllers/wikidata');
var processNode = require('../controllers/processNode');
var treeType;
var stackChildren = true;
var dataCache = new NodeCache();

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
    processNode.ownValue = [];
    processNode.nodeImages = [];
    processNode.birthAndDeathPlace = [];
    processNode.result.root = null;

    //set MaxLevel to Global so it can be accessed 
    maxLevel = request.maxLevel || 3;
    stackChildren = true;//request.chartOptions.stackChildren ||
    //check primary selected language, change to english if not exist in default language
    lang = (request.lang in defLanguage)? request.lang : "en";
    treeType = request.property;
    // chartOptions = request.options;
    chartOptions.spouses = (request.spouses === "1" ? true: false);
    console.log("fetch spouses: "+(chartOptions.spouses?"yes":"no"));
    //Second language must in default language and not equal primary language
    secondLang = (request.secondLang in defLanguage && request.secondLang !== request.lang )? request.secondLang : null;
    if (stackChildren == "false" || treeType == "ancestors" || treeType == "owner") { stackChildren = false; }
    // let memCache = new cache.Cache();
    var nocache = request.nocache;
    //configure cached filename with second language
    var cachedKey = "Cache"+request.root + "-L" + maxLevel + "-" + treeType + "-" + lang +(secondLang ? "-"+secondLang : '' ) + (chartOptions.spouses?"addSpouses":"") + ".js";
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

    if(dataCache.has(cachedKey.toString()) && nocache != '1'){
        console.log("Pulling data from cache...");
        callback(null,dataCache.get(cachedKey.toString()));
    }
    else{
        var itemIds = {};
        itemIds[request.root] = 0;
        getLevel(
            itemIds,
            '',
            lang,
            secondLang,
            maxLevel,
            function (err) {
                if (err){
                    callback(err,null);
                    return;
                }
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
                                if (values[offset].labels && values[offset].labels.en && values[offset].labels['en'].value){
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
                    props: 'labels|claims',
                    lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
                }, function (err,data) {
                    if (err){
                        callback(err,null);
                        return;
                    }
                    //Process Label
                    function processLabel(){
                        console.log("Labels Count :"+ Object.keys(labels).length);
                        labels["undefined"] = {
                            id:"null",
                            labels:{
                                en: "null"
                            }
                        };
                        labels["null"] = labels["undefined"];
                        for (row in rows) {
                            rows[row].innerHTML = replaceLabels(rows[row].innerHTML, labels);
                        }
                    }

                    //Process Result
                    function processResult(){
                        var result = processNode.result;
                        result.rows = rows;
                        result.nodeImages = processNode.nodeImages;
                        // fs.writeFileSync(cachedFilename, JSON.stringify(result));
                        // memCache.put(cachedKey,result,3000*1000);
                        console.log("Pushing data to cache...");
                        dataCache.set(cachedKey.toString(),result);

                        callback(null,result);
                    }

                    // console.log(data);
                    labels = {};
                    if (data != null){
                        labels = data.entities;
                        var labelChange = [];
                        var keyChange = [];
                        const birthDeathPlace = Array.from(new Set(processNode.birthAndDeathPlace));
                        //iterate each of the place of birth and death label to see if it's instance of hospital
                        birthDeathPlace.forEach((key)=>{
                            const claims = wbk.simplify.claims(labels[key].claims);
                             //check if it's instance of Hospital
                             if (claims.P31 && claims.P31 == 'Q16917'){
                                if (claims.P131){
                                    //use administrative territorial entity P131 if exist
                                    labelChange.push(claims.P131[0]);
                                    keyChange[claims.P131[0]] = key;
                                }else if (claims.P276){
                                    //or use location P276 if entity P131 not exist
                                    labelChange.push(claims.P276[0]);
                                    keyChange[claims.P276[0]] = key;
                                }
                            }
                        });

                        //check if need to further change the label (if instance of hospital)
                        if (labelChange.length > 0 ){
                            console.log("Get city/country label");
                            //Branch 1 : wait for promise to get the city/country label
                            function promiseWrapper() {
                                return new Promise((resolve, reject) => {
                                    wikidataController.wikidataApi({
                                        ids: Array.from(new Set(labelChange)),//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
                                        props: 'labels|claims',
                                        lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
                                    }, function (err,data) {
                                        if (err){
                                            console.log(err);
                                            reject(err);
                                        }
                                        resolve(data);
                                    });
                                });
                            }
                            async function list() {
                                const newLabels = await promiseWrapper();
                                if (Object.keys(newLabels.entities).length){
                                    Object.keys(newLabels.entities).forEach((key)=>{
                                        labels[keyChange[key]]=newLabels.entities[key];
                                    });
                                }
                            }
                            list()
                                .catch(e => console.error(e))
                                .finally(()=>{
                                    processLabel();
                                    processResult();
                                });
                        }else{
                            //Branch 2 : process label as usual
                            processLabel();
                            processResult();
                         }
                    }else{
                        //Branch 3 : continue without label processing
                        processResult();
                    }
                });
            },
            rows
        );
    }
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
        props : 'labels|descriptions|claims|sitelinks/urls' ,
        lang: ((lang !== "en" || secondLang !== "en")? "en|" :"" ) + lang + (secondLang ? "|"+secondLang : ""), //add default english language if selected primary or second language not english
    }, function (err, data, items) {
        if (err){
            callback(err,null);
            return;
        }
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
    // i am using non simplify claims for this, because the simplify claims it's showing wrong spouse count
    if (chartOptions && chartOptions.spouses && data.entities[item_id].claims.P26 && data.entities[item_id].claims.P26 !== undefined && level != maxLevel && treeType === "descendants" ){
        var oldClaimSpouse = data.entities[item_id].claims.P26;
        var spouses = [];
        //populate all the spouses
        Object.keys(oldClaimSpouse).forEach((key)=>{
            var spouseId = wbk.simplify.claim(oldClaimSpouse[key]);
            spouses.push(spouseId);
        });

        //get spouses data
        if (spouses.length > 0 ){
            wikidataController.wikidataApi({
                ids: Array.from(new Set(spouses)),
                props: 'labels|descriptions|claims|sitelinks/urls',
                lang: ((lang !== "en" || secondLang !== "en") ? "en|" : "") + lang + (secondLang ? "|" + secondLang : ""),
            }, function (err,response) {
                if (response.entities) {
                    Object.keys(response.entities).forEach((key) => {
                        //push spouses to row and add SP_ to identify the spouse connection (to be processed in treant-wikidata.js)
                        var node = processNode.createNode(response, key, 'SP_' + item_id, lang, treeType);             
                        rows.push(node);
                    });
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
            }, function (err,response) {
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
    //check if there is not image exist, call wikitree image;
    if (!newRow.innerHTML.includes('node_image')){
        if (claims['P2949'] && claims['P2949'][0]){
            var objIndex = rows.findIndex((row => row.id == item_id));
            console.log("Get wikitree image");
            fetch('https://api.wikitree.com/api.php?action=getProfile&key='+claims['P2949'][0].value+'&fields=Photo')
                .then(response => response.json())
                .then(data => {
                    if (data && data[0].profile.PhotoData){
                        const imageUrl = 'https://wikitree.com' + data[0].profile.PhotoData.url + '';
                        //console.log("image : "+imageUrl);
                        processNode.nodeImages[item_id] = [0, [{
                            'url': imageUrl,
                            'source': "Wikitree",
                        }]];
                        //add image on top of innerHTML
                        rows[objIndex].innerHTML = '<img class="node_image" id="image_' + item_id + '" data-item="' + item_id + '" alt="" src="' + imageUrl + '">' + rows[objIndex].innerHTML;
                    }
                })
                .catch(err => {
                    console.log("Error Get wikitree image : "+err);
                });
        }
    }
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