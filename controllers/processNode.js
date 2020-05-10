const wbk = require('wikidata-sdk');
const moment = require('moment');

var imageURLS = [];

exports.result = {
    root : null,
};
exports.labelIds = [];
exports.createNode = function(data, item_id, child_id, lang, treeType){

    // data.entities = data;
    var label = (data.entities[item_id].labels[lang] ? data.entities[item_id].labels[lang].value : "undefined");
    if(label === "undefined"){
        label = (data.entities[item_id].labels.en ? data.entities[item_id].labels.en.value : "undefined");
    }
    // if(secondLang){
    //     var label2 = (data.entities[item_id].labels[secondLang] ? data.entities[item_id].labels[secondLang].value : null);
    // }
    // for (label_lang in data.entities[item_id].labels) {
    //     var label =  data.entities[item_id].labels[label_lang].value;
    //     break;
    // }
    // for(descr_lang in data.entities[item_id].descriptions) {
    //     var descr =  data.entities[item_id].descriptions[descr_lang].value;
    //     break;
    // }
    var originalClaims = data.entities[item_id].claims;
    const claims = wbk.simplify.claims(data.entities[item_id].claims, { keepQualifiers: true });


    if(!exports.result.root){
        exports.result.title =  "Wikitree: " + treeType +" of "+ label;
        exports.result.root  = {
            id: item_id,
            label: label
        };
    }
    var images = [];
    if(claims['P18']){//image
        for(claim in claims['P18']) {
            images.push({
                'url': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + claims['P18'][claim].value + '?width=100px',
            });
        }
    }
    // console.log(claims['P154']);
    if(claims['P154']){//logo propery
        images.push({
            'url': 'https://commons.wikimedia.org/wiki/Special:FilePath/'+  claims['P154'][0].value +'?width=100px',
        });
    }
    // if(!image_page){
    //     image_page = getValue(claims['P6500']);
    // }
    var itemIdNumber = item_id.substr(1);
    if(imageURLS[itemIdNumber]) {
        images.push({'url': imageURLS[itemIdNumber] });
    }

    // gender P21
    var className = "";

    var sortValue = null;

    if (claims['P21']) {
        var gender_id = parseInt((claims['P21'][0].value).substr(1));
        var gender_html = '';
        if (gender_id === 6581097) {
            sortValue=0;
            gender_html = '<i class="fa fa-mars"></i>';
            className = 'node-male'
        } else if (gender_id === 6581072) {
            sortValue=1;
            gender_html = '<i class="fa fa-venus"></i>';
            className = 'node-female'
        } else{
            className = 'node-thirdgender';
        }
    }


    var html = '<p class="node-name">';
    html += '<a target="_blank" href="https://www.wikidata.org/wiki/' + item_id + '">' + label + '</a>';
    // if(label2 && label != label2){//add second language icon
    //     html += '<br />'+label2;
    // }
    //'<a href="' + location.href.replace(location.search, '') + '?q=' + item_id + '">' + label + '</a>';
    html += '</p><p class="node-title">' ;
    var peopleData = getPeopleData(originalClaims, claims, treeType);
    html += peopleData.html;
    // if(chartOptions.socialmedia && data.entities[item_id].sitelinks && data.entities[item_id].sitelinks[lang+"wiki"])
    //     html += '<a title="Read on Wikipedia" target="_blank" href="'+ data.entities[item_id].sitelinks[lang+"wiki"].url +'" style="margin-right: 5px"><img src="storage/icons/wikipedia.png" style="height: 16px;"/></a>';
    //
    //
    // if(treeType === "descendants"){
    //     sortValue = peopleData.sortValue;
    // }
    html += '</p>';
    if(images.length > 0){
        nodeImages[item_id] = [0,images];
        html = '<img class="node_image" id="image_'+ item_id +'" data-item="'+ item_id +'" alt="" src="'+  images[0].url +'">'  + html;
    }
    return newRow = {
        id: item_id,
        innerHTML: html,
        parent_id: child_id,
        HTMLclass : className,
        sortValue: sortValue,
    };

};


function getPeopleData(claims, newClaims, treeType) {

    // date of birth P569
    var birth_value = getValueData(claims['P569'], 'time');
    var birth_place = getValueQidAndAddLabel(claims['P19']);
    var sortValue = null;
    // date of death P570
    var death_value = getValueData(claims['P570'], 'time');
    var death_place = getValueQidAndAddLabel(claims['P20']);

    // // number of spouses P26
    var number_of_spouses = (claims['P26'] && claims['P26'].length) || 0;


    html = "";

    if(claims.P1477){
        html += '<span class="co_index co_birthname">';
        html +="(born as "+ getValueData(claims.P1477,"text")+")<br />";
        html += '</span>';
    }


    if(birth_value || birth_place) {
        html +="*";
        if(birth_value) {
            var birth = parseDate(birth_value);
            if (treeType === "descendants" && birth_value) {
                sortValue = birth.dateObject;
            }
            html += birth.output;
        }
        html += (birth_place ? " {"+birth_place+"}": "") + '<br />';
    }
    if(death_value || death_place) {
        html +="†";
        html += (death_value ? parseDate(death_value).output + " ": "") ;
        html += (death_place ? "{"+death_place+"}": "") ;
        html += '<br />'
    }


    if(number_of_spouses > 0){
        // html +="Spouse: "+number_of_spouses+ " <br>" + getSpousesNames(claims['P26']);
        html += '<span class="co_index co_spouses">';
        html +="<b>⚭</b> ";
        var i=0;
        claims.P26.forEach(function (claim) {
            if(i>0){
                html += ", ";
            }i++;
            var qid = getValueQidAndAddLabel([claim]);
            if(qid) {//catch unknown value /=> null error
                html += "{" + qid + "}";
            }
        });
        html +=  "<br>";
        html += '</span>';


    }
    if(claims['P69']){
        html += '<span class="co_index co_education">';

        claims['P69'].forEach(function (claim) {
            html += "Edu: {" + getValueQidAndAddLabel([claim]) + "} ";
            var start = getQualifiers(claim,"P580")[0] || false;
            var end = getQualifiers(claim,"P582")[0] || false;
            // if (start || end){
            //     console.log(start);
            //     html += "("+ (start ? getYearOfQualifier(start) : "") + "-"+(end ? getYearOfQualifier(end) : "")+")";
            // }
            html +=   "<br>";
        });
        html += '</span>';

        // getValueQidOfClaim
    }
    var socialMedia = {
        'P6634' : ['linkedin','https://www.linkedin.com/in/$1/'],
        'P2003' : ['instagram','https://www.instagram.com/$1/'],
        'P2002' : ['twitter','https://twitter.com/$1'],
        'P2013' : ['facebook','https://www.facebook.com/$1/'],
        'P2949' : ['wikitree','https://www.wikitree.com/wiki/$1'],
        'P2600' : ['geni',' https://www.geni.com/profile/index/$1'],
        'P7085' : ['tiktok', ' https://www.tiktok.com/@$1'],
        // 'P345' : ['imdb',' https://www.imdb.com/name/$1/']

    };
    html += '<span class="co_index co_socialmedia">';
     for (s in socialMedia) {
            if (claims[s]) {
                html += '<a target="_blank" href="' + socialMedia[s][1].replace("$1", getValue(claims[s])) + '" style="margin-right: 5px"><img src="storage/icons/' + socialMedia[s][0] + '.png" style="height: 16px;"/></a>';
            }
        }
    html += '</span>';



    return {
        html: html,
        sortValue: sortValue
    };

}

function parseDate(unformattedDate){
    var bce = (unformattedDate.substr(0,1) == "-" ? " BCE" :"");
    dateObject = moment(unformattedDate.substr('+'.length));
    var output ="";
    if (dateObject.isValid()) {
        output += dateObject.format('L');
    } else {
        output += unformattedDate.substr('+'.length, 4);
        dateObject = moment(unformattedDate.substr('+'.length).replace("-00-00","-01-01"));
    }
    output += bce;
    return {
        output: output,
        dateObject: dateObject
    }
}

var nodeImages = [];
var result = {
    root : null,
};


function getValue(claim) {
    return (claim && claim[0].mainsnak.datavalue && claim[0].mainsnak.datavalue.value) || null;
}

function getValueData(claim, dataType) {
    var value = getValue(claim);
    return value ? value[dataType] : null;
}

function getValueQid(claim) {
    var numericId = getValueData(claim, 'numeric-id');
    return numericId ? 'Q' + numericId : null;
}
function getValueQidAndAddLabel(claim) {
    value = getValueQid(claim);
    if(value ) {//&& labelIds.indexOf(value) == -1
        exports.labelIds.push(value);
    }
    return value;
}
function getYearOfQualifier(q) {
    return q.datavalue.value.time.substr(1,4);
}
function getValueQidOfClaim(claim) {
    var value = (claim && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value) || null;
    var numericId = value ? value['numeric-id'] : null;
    return numericId ? 'Q' + numericId : null;
}

function getQualifiers(claim,q) {
    var qualifiers = (claim && claim.qualifiers) || null;
    if(q){
        if(!qualifiers){
            return [];
        }
        return (qualifiers[q]) || [];
    }
    return qualifiers;
}
function hasEndQualifier(claim) {
    return getQualifiers(claim,"P582").length > 0;
}