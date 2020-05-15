const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');
const async = require('async');
const moment = require('moment');
const fs = require('fs');

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
var defLanguage = getWikidataLanguages();
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
    //set MaxLevel to Global so it can be accessed 
    maxLevel = request.maxLevel || 3;
    stackChildren = true;//request.chartOptions.stackChildren ||
    //check primary selected language, change to english if not exist in default language
    lang = (request.lang in defLanguage)? request.lang : "en";
    treeType = request.property;    
    //Second language must in default language and not equal primary language
    secondLang = (request.secondLang in defLanguage && request.secondLang !== request.lang )? request.secondLang : null;
    if (stackChildren == "false" || treeType == "ancestors" || treeType == "owner") { stackChildren = false; }

    var nocache = request.nocache;
    //configure cached filename with second language
    var cachedFilename = request.root + "-L" + maxLevel + "-" + treeType + "-" + lang +(secondLang ? "-"+secondLang : '' ) + ".js";
    cachedFilename = __dirname + '/../public/cache/' + cachedFilename;
    if (fs.existsSync(cachedFilename) && nocache != '1') {
        console.log('The path exists.');
        let rawdata = fs.readFileSync(cachedFilename);
        let result = JSON.parse(rawdata);
        callback(result);
        return;
    }

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
                (match, offset) => (values && values[offset] && values[offset].labels && values[offset].labels[lang]) ?
                    values[offset].labels[lang].value :
                    (values[offset] ? values[offset].id : "??")
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
                }
                var result = processNode.result;
                result.rows = rows;
                result.nodeImages = processNode.nodeImages;
                fs.writeFileSync(cachedFilename, JSON.stringify(result));
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
    if (claims.P26 && level != maxLevel && treeType != "ancestors"){
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

function getWikidataLanguages() {
    return {"ab":"Abkhazian","abs":"Ambonese Malay","ace":"Achinese","ady":"Adyghe","ady-cyrl":"Adyghe (Cyrillic script)","aeb":"Tunisian Arabic","aeb-arab":"Tunisian Arabic (Arabic script)","aeb-latn":"Tunisian Arabic (Latin script)","af":"Afrikaans","ak":"Akan","aln":"Gheg Albanian","am":"Amharic","an":"Aragonese","ang":"Old English","anp":"Angika","ar":"Arabic","arc":"Aramaic","arn":"Mapuche","arq":"Algerian Arabic","ary":"Moroccan Arabic","arz":"Egyptian Arabic","as":"Assamese","ase":"American Sign Language","ast":"Asturian","atj":"Atikamekw","av":"Avaric","avk":"Kotava","awa":"Awadhi","ay":"Aymara","az":"Azerbaijani","azb":"South Azerbaijani","ba":"Bashkir","ban":"Balinese","bar":"Bavarian","bbc":"Batak Toba","bbc-latn":"Batak Toba (Latin script)","bcc":"Southern Balochi","bcl":"Central Bikol","be":"Belarusian","be-tarask":"Belarusian (Taraškievica orthography)","bg":
            "Bulgarian","bgn":"Western Balochi","bh":"Bhojpuri","bho":"Bhojpuri","bi":"Bislama","bjn":"Banjar","bm":"Bambara","bn":"Bangla","bo":"Tibetan","bpy":"Bishnupriya","bqi":"Bakhtiari","br":"Breton","brh":"Brahui","bs":"Bosnian","btm":"Batak Mandailing","bto":"Iriga Bicolano","bug":"Buginese","bxr":"Russia Buriat","ca":"Catalan","cbk-zam":"Chavacano","cdo":"Min Dong Chinese","ce":"Chechen","ceb":"Cebuano","ch":"Chamorro","chr":"Cherokee","chy":"Cheyenne","ckb":"Central Kurdish","co":"Corsican","cps":"Capiznon","cr":"Cree","crh":"Crimean Turkish","crh-cyrl":"Crimean Tatar (Cyrillic script)","crh-latn":"Crimean Tatar (Latin script)","cs":"Czech","csb":"Kashubian","cu":"Church Slavic","cv":"Chuvash","cy":"Welsh","da":"Danish","de":"German","de-at":"Austrian German","de-ch":"Swiss High German","de-formal":"German (formal address)","din":"Dinka","diq":"Zazaki","dsb":"Lower Sorbian","dtp":"Central Dusun","dty":"Doteli","dv":"Divehi","dz":"Dzongkha","ee":"Ewe","egl":"Emilian","el":"Greek","eml":
            "Emiliano-Romagnolo","en":"English","en-ca":"Canadian English","en-gb":"British English","eo":"Esperanto","es":"Spanish","es-formal":"español (formal)‎","et":"Estonian","eu":"Basque","ext":"Extremaduran","fa":"Persian","ff":"Fulah","fi":"Finnish","fit":"Tornedalen Finnish","fj":"Fijian","fo":"Faroese","fr":"French","frc":"Cajun French","frp":"Arpitan","frr":"Northern Frisian","fur":"Friulian","fy":"Western Frisian","ga":"Irish","gag":"Gagauz","gan":"Gan Chinese","gan-hans":"Gan (Simplified)","gan-hant":"Gan (Traditional)","gcr":"Guianan Creole","gd":"Scottish Gaelic","gl":"Galician","glk":"Gilaki","gn":"Guarani","gom":"Goan Konkani","gom-deva":"Goan Konkani (Devanagari script)","gom-latn":"Goan Konkani (Latin script)","gor":"Gorontalo","got":"Gothic","grc":"Ancient Greek","gsw":"Swiss German","gu":"Gujarati","gv":"Manx","ha":"Hausa","hak":"Hakka Chinese","haw":"Hawaiian","he":"Hebrew","hi":"Hindi","hif":"Fiji Hindi","hif-latn":"Fiji Hindi (Latin script)","hil":"Hiligaynon","hr":
            "Croatian","hrx":"Hunsrik","hsb":"Upper Sorbian","ht":"Haitian Creole","hu":"Hungarian","hu-formal":"magyar (formal)‎","hy":"Armenian","hyw":"Western Armenian","ia":"Interlingua","id":"Indonesian","ie":"Interlingue","ig":"Igbo","ii":"Sichuan Yi","ik":"Inupiaq","ike-cans":"Eastern Canadian (Aboriginal syllabics)","ike-latn":"Eastern Canadian (Latin script)","ilo":"Iloko","inh":"Ingush","io":"Ido","is":"Icelandic","it":"Italian","iu":"Inuktitut","ja":"Japanese","jam":"Jamaican Creole English","jbo":"Lojban","jut":"Jutish","jv":"Javanese","ka":"Georgian","kaa":"Kara-Kalpak","kab":"Kabyle","kbd":"Kabardian","kbd-cyrl":"Kabardian (Cyrillic script)","kbp":"Kabiye","kg":"Kongo","khw":"Khowar","ki":"Kikuyu","kiu":"Kirmanjki","kjp":"Eastern Pwo","kk":"Kazakh","kk-arab":"Kazakh (Arabic script)","kk-cn":"Kazakh (China)","kk-cyrl":"Kazakh (Cyrillic script)","kk-kz":"Kazakh (Kazakhstan)","kk-latn":"Kazakh (Latin script)","kk-tr":"Kazakh (Turkey)","kl":"Kalaallisut","km":"Khmer","kn":"Kannada",
        "ko":"Korean","ko-kp":"Korean (North Korea)","koi":"Komi-Permyak","krc":"Karachay-Balkar","kri":"Krio","krj":"Kinaray-a","krl":"Karelian","ks":"Kashmiri","ks-arab":"Kashmiri (Arabic script)","ks-deva":"Kashmiri (Devanagari script)","ksh":"Colognian","ku":"Kurdish","ku-arab":"Kurdish (Arabic script)","ku-latn":"Kurdish (Latin script)","kum":"Kumyk","kv":"Komi","kw":"Cornish","ky":"Kyrgyz","la":"Latin","lad":"Ladino","lb":"Luxembourgish","lbe":"Lak","lez":"Lezghian","lfn":"Lingua Franca Nova","lg":"Ganda","li":"Limburgish","lij":"Ligurian","liv":"Livonian","lki":"Laki","lmo":"Lombard","ln":"Lingala","lo":"Lao","loz":"Lozi","lrc":"Northern Luri","lt":"Lithuanian","ltg":"Latgalian","lus":"Mizo","luz":"Southern Luri","lv":"Latvian","lzh":"Literary Chinese","lzz":"Laz","mai":"Maithili","map-bms":"Basa Banyumasan","mdf":"Moksha","mg":"Malagasy","mhr":"Eastern Mari","mi":"Maori","min":"Minangkabau","mk":"Macedonian","ml":"Malayalam","mn":"Mongolian","mni":"Manipuri","mnw":"Mon","mo":"Moldovan"
        ,"mr":"Marathi","mrj":"Western Mari","ms":"Malay","mt":"Maltese","mwl":"Mirandese","my":"Burmese","myv":"Erzya","mzn":"Mazanderani","na":"Nauru","nah":"Nāhuatl","nan":"Min Nan Chinese","nap":"Neapolitan","nb":"Norwegian Bokmål","nds":"Low German","nds-nl":"Low Saxon","ne":"Nepali","new":"Newari","niu":"Niuean","nl":"Dutch","nl-informal":"Nederlands (informeel)‎","nn":"Norwegian Nynorsk","nov":"Novial","nqo":"N’Ko","nrm":"Norman","nso":"Northern Sotho","nv":"Navajo","ny":"Nyanja","nys":"Nyungar","oc":"Occitan","olo":"Livvi-Karelian","om":"Oromo","or":"Odia","os":"Ossetic","pa":"Punjabi","pag":"Pangasinan","pam":"Pampanga","pap":"Papiamento","pcd":"Picard","pdc":"Pennsylvania German","pdt":"Plautdietsch","pfl":"Palatine German","pi":"Pali","pih":"Norfuk / Pitkern","pl":"Polish","pms":"Piedmontese","pnb":"Western Punjabi","pnt":"Pontic","prg":"Prussian","ps":"Pashto","pt":"Portuguese","pt-br":"Brazilian Portuguese","qu":"Quechua","qug":"Chimborazo Highland Quichua","rgn":"Romagnol",
        "rif":"Riffian","rm":"Romansh","rmy":"Vlax Romani","ro":"Romanian","roa-tara":"Tarantino","ru":"Russian","rue":"Rusyn","rup":"Aromanian","ruq":"Megleno-Romanian","ruq-cyrl":"Megleno-Romanian (Cyrillic script)","ruq-latn":"Megleno-Romanian (Latin script)","rw":"Kinyarwanda","sa":"Sanskrit","sah":"Sakha","sat":"Santali","sc":"Sardinian","scn":"Sicilian","sco":"Scots","sd":"Sindhi","sdc":"Sassarese Sardinian","sdh":"Southern Kurdish","se":"Northern Sami","sei":"Seri","ses":"Koyraboro Senni","sg":"Sango","sgs":"Samogitian","sh":"Serbo-Croatian","shi":"Tachelhit","shn":"Shan","shy-latn":"Shawiya (Latin script)","si":"Sinhala","sk":"Slovak","skr":"Saraiki","skr-arab":"Saraiki (Arabic script)","sl":"Slovenian","sli":"Lower Silesian","sm":"Samoan","sma":"Southern Sami","smn":"Inari Sami","sn":"Shona","so":"Somali","sq":"Albanian","sr":"Serbian","sr-ec":"Serbian (Cyrillic script)","sr-el":"Serbian (Latin script)","srn":"Sranan Tongo","ss":"Swati","st":"Southern Sotho","stq":"Saterland Frisian",
        "sty":"cебертатар","su":"Sundanese","sv":"Swedish","sw":"Swahili","szl":"Silesian","szy":"Sakizaya","ta":"Tamil","tay":"Tayal","tcy":"Tulu","te":"Telugu","tet":"Tetum","tg":"Tajik","tg-cyrl":"Tajik (Cyrillic script)","tg-latn":"Tajik (Latin script)","th":"Thai","ti":"Tigrinya","tk":"Turkmen","tl":"Tagalog","tly":"Talysh","tn":"Tswana","to":"Tongan","tpi":"Tok Pisin","tr":"Turkish","tru":"Turoyo","ts":"Tsonga","tt":"Tatar","tt-cyrl":"Tatar (Cyrillic script)","tt-latn":"Tatar (Latin script)","tw":"Twi","ty":"Tahitian","tyv":"Tuvinian","tzm":"Central Atlas Tamazight","udm":"Udmurt","ug":"Uyghur","ug-arab":"Uyghur (Arabic script)","ug-latn":"Uyghur (Latin script)","uk":"Ukrainian","ur":"Urdu","uz":"Uzbek","ve":"Venda","vec":"Venetian","vep":"Veps","vi":"Vietnamese","vls":"West Flemish","vmf":"Main-Franconian","vo":"Volapük","vot":"Votic","vro":"Võro","wa":"Walloon","war":"Waray","wo":"Wolof","wuu":"Wu Chinese","xal":"Kalmyk","xh":"Xhosa","xmf":"Mingrelian","xsy":"Saisiyat","yi":
            "Yiddish","yo":"Yoruba","yue":"Cantonese","za":"Zhuang","zea":"Zeelandic","zgh":"Standard Moroccan Tamazight","zh":"Chinese","zh-cn":"Chinese (China)","zh-hans":"Simplified Chinese","zh-hant":"Traditional Chinese","zh-hk":"Chinese (Hong Kong)","zh-mo":"Chinese (Macau)","zh-my":"Chinese (Malaysia)","zh-sg":"Chinese (Singapore)","zh-tw":"Chinese (Taiwan)","zu":"Zulu"};
}