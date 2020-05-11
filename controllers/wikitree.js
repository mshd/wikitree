const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');
const async = require('async');
const moment = require('moment');
const fs = require('fs');

var wikidataController = require('../controllers/wikidata');
var processNode = require('../controllers/processNode');
var treeType;
var stackChildren = true;

var maxLevel, secondLang, chartOptions = [];
var labelIds = [];
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
    var maxLevel = request.maxLevel || 3;
    var rows = [];
    stackChildren = true;//request.chartOptions.stackChildren ||
    treeType = request.property;
    var lang = "en";
    if (stackChildren == "false" || treeType == "ancestors" || treeType == "owner") { stackChildren = false; }

    var nocache = request.nocache;

    var cachedFilename = request.root + "-L" + maxLevel + "-" + treeType + ".js";
    cachedFilename = __dirname + '/../public/cache/' + cachedFilename;
    if (fs.existsSync(cachedFilename) && nocache != '1') {
        console.log('The path exists.');
        let rawdata = fs.readFileSync(cachedFilename);
        let result = JSON.parse(rawdata);
        callback(result);
        return;
    }


    getLevel(
        request.root,
        '',
        request.lang,
        maxLevel,
        function () {
            // console.log("DONE");
            // console.log(rows);
            const replaceLabels = (string, values) => string.replace(/{(.*?)}/g,
                (match, offset) => (values && values[offset].labels && values[offset].labels[lang]) ?
                    values[offset].labels[lang].value :
                    values[offset].id
            );
            //fetch labels for vars
            //TODO no labels
            var data = wikidataController.wikidataApi({
                ids: Array.from(new Set(processNode.labelIds)),//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
                props: 'labels',
                lang: lang,
            }, function (data) {

                console.log(data);
                labels = data.entities;
                //     // console.log(labels);
                for (row in rows) {
                    //         // console.log(rows[row].innerHTML);
                    rows[row].innerHTML = replaceLabels(rows[row].innerHTML, labels);
                }
                var result = processNode.result;
                result.rows = rows;
                fs.writeFileSync(cachedFilename, JSON.stringify(result));
                callback(result);
            });
        },
        rows
    );
};

function getLevel(item_id, child_id, lang, level, callback, rows) {
    console.log("getLevel", level);
    if (level === 0) {
        callback();
        return;
    }
    setTimeout(function () {

        wikidataController.wikidataApi({
            ids: [item_id],
            // props : 'labels|descriptions|claims|sitelinks/urls' ,
            lang: lang //+ (secondLang ? "|"+secondLang : ""),
        }, function (data) {
            // console.log(data);
            processLevel(data, item_id, child_id, lang, level, callback, rows);
        });
    }, 3000);
}


function processLevel(data, item_id, child_id, lang, level, levelCb, rows) {

    const claims = wbk.simplify.claims(data.entities[item_id].claims, { keepQualifiers: true });//TODO duplicate

    var newRow = processNode.createNode(data, item_id, child_id, lang, treeType);
    newRow.stackChildren = stackChildren;

    var asyncFunctions = [
        function (callback) {
            rows.push(newRow);
            callback(null, rows);
        }
    ];
    var duplicates = rows.some(o => o.id === item_id);
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
        // console.log("list");
        var children_distinct_Qids = [];
        console.log(children);
        for (var child in children) {
            // if (!hasEndQualifier(children[child])) {
            var child_item_id = children[child].value;
            if (children_distinct_Qids.indexOf(child_item_id) == -1) {
                children_distinct_Qids.push(child_item_id);
            }
            // }
        }
        // console.log(children_distinct_Qids);
        for (child in children_distinct_Qids) {
            // console.log(owner_distinct_ids[owner]);
            asyncFunctions.push(function (child_item_id, callback) {
                // console.log(child_item_id);
                if (child_item_id) {
                    getLevel(
                        child_item_id,
                        item_id,
                        lang,
                        level - 1,
                        callback,
                        rows
                    );
                } else {
                    callback();
                }
            }.bind(null, children_distinct_Qids[child]));
        }
    }




    async.parallel(asyncFunctions,
        function (err, results) {
            // console.log("level", level);
            // updateRows(rows);
            levelCb();
        }
    );
    //do stuff

}


