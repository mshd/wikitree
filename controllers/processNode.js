const wbk = require('wikidata-sdk');
const moment = require('moment');
const thirdPartyImages = require('../public/storage/images');
exports.nodeImages = {};
exports.result = {
    root: null,
};
exports.labelIds = [];
exports.createNode = function (data, item_id, child_id, lang, treeType) {

    // data.entities = data;
    var label = (data.entities[item_id].labels[lang] ? data.entities[item_id].labels[lang].value : "undefined");
    if (label === "undefined") {
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
    const timeConverterFn = ({ time, precision }) => { return { time: time, precision: precision } };
    const claims = wbk.simplify.claims(data.entities[item_id].claims, { keepQualifiers: true, timeConverter: timeConverterFn });


    if (!exports.result.root) {
        exports.result.title = "Wikitree: " + treeType + " of " + label;
        exports.result.root = {
            id: item_id,
            label: label
        };
    }
    var images = [];
    if (claims['P18']) {//image
        for (claim in claims['P18']) {
            images.push({
                'url': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + claims['P18'][claim].value + '?width=100px',
            });
        }
    }
    // console.log(claims['P154']);
    if (claims['P154']) {//logo propery
        images.push({
            'url': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + claims['P154'][0].value + '?width=100px',
        });
    }
    //Twitter
    if (claims['P2002']) {//https://github.com/siddharthkp/twitter-avatar
        images.push({
            'url': 'https://twitter-avatar.now.sh/' + claims['P2002'][0].value + '',
            'source': "Twitter",
        });
    }
    // if(!image_page){
    //     image_page = getValue(claims['P6500']);
    // }
    var itemIdNumber = item_id.substr(1);

    //TODO adding ImageURL from external file
    if (thirdPartyImages.imageURLS[itemIdNumber]) {
        images.push({ 'url': thirdPartyImages.imageURLS[itemIdNumber] });
    }

    // gender P21
    var className = "";

    var sortValue = null;

    if (claims['P21']) {
        var gender_id = parseInt((claims['P21'][0].value).substr(1));
        var gender_html = '';
        if (gender_id === 6581097) {
            sortValue = 0;
            gender_html = '<i class="fa fa-mars"></i>';
            className = 'node-male'
        } else if (gender_id === 6581072) {
            sortValue = 1;
            gender_html = '<i class="fa fa-venus"></i>';
            className = 'node-female'
        } else {
            className = 'node-thirdgender';
        }
    }


    var html = '<p class="node-name">';
    if (data.entities[item_id].sitelinks && data.entities[item_id].sitelinks[lang + "wiki"]) {
        var wikipediaName = data.entities[item_id].sitelinks[lang + "wiki"].url.split('/wiki/')[1];
        html += '<a href="javascript:void(0);" onclick="wikipedia(this,false ,  )" data-wiki="' + wikipediaName + '" data-id="' + itemIdNumber + '" data-original-title="" title="">' + label + '</a>';
    } else {
        html += '<a target="_blank" href="https://www.wikidata.org/wiki/' + item_id + '">' + label + '</a>';
    }
    // if(label2 && label != label2){//add second language icon
    //     html += '<br />'+label2;
    // }
    //'<a href="' + location.href.replace(location.search, '') + '?q=' + item_id + '">' + label + '</a>';
    html += '</p><p class="node-title">';
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
    if (images.length > 0) {
        exports.nodeImages[item_id] = [0, images];
        html = '<img class="node_image" id="image_' + item_id + '" data-item="' + item_id + '" alt="" src="' + images[0].url + '">' + html;
    }
    return newRow = {
        id: item_id,
        innerHTML: html,
        parent_id: child_id,
        HTMLclass: className,
        sortValue: sortValue,
    };

};


function getPeopleData(claims, newClaims, treeType) {

    // date of birth P569
    var birthDate = (newClaims.P569 ? wbk.wikibaseTimeToSimpleDay(newClaims.P569[0].value) : null);
    var birthPlace = addLabel(newClaims['P19']);
    var sortValue = null;

    // date of death P570
    var deathDate = (newClaims.P570 ? wbk.wikibaseTimeToSimpleDay(newClaims.P570[0].value) : null);
    var deathPlace = addLabel(newClaims['P20']);

    // burial date P4602, burial place P119
    var burialDate = (newClaims.P4602 ? wbk.wikibaseTimeToSimpleDay(newClaims.P4602[0].value) : null);
    var burialPlace = addLabel(newClaims['P119']);

    // console.log(newClaims);

    html = "";

    if (newClaims.P1477) {
        html += '<span class="co_index co_birthname">';
        html += "(born as " + newClaims.P1477[0].value + ")<br />";
        html += '</span>';
    }


    if (birthDate || birthPlace) {
        html += "*";
        if (birthDate) {
            // var birth = parseDate(birth_value);
            if (treeType === "descendants" && birthDate) {
                sortValue = birthDate;
            }
            html += parseBCE(birthDate);
        }
        html += (birthPlace ? " {" + birthPlace + "}" : "") + '<br />';
    }

    if (deathDate || deathPlace) {
        html += "†";
        html += (deathDate ? parseBCE(deathDate) + " " : "");
        html += (deathPlace ? "{" + deathPlace + "}" : "");
        html += '<br />';
    }

    if (burialDate || burialPlace) {
        html += "⎧ᴿᴵᴾ⎫ ";
        html += (burialDate ? parseBCE(burialDate) + " " : "");
        html += (burialPlace ? "{" + burialPlace + "}" : "");
        html += "<br />";
    }

    // // number of occupations P106
    var occupationsCount = (claims['P106'] && claims['P106'].length) || 0;
    if (occupationsCount > 0) {
        html += '<span class="co_index co_occupations">';
        html += "<b>💼</b> ";
        newClaims.P106.forEach(function (claim) {
            if (i > 0) {
                html += ", ";
            } i++;
            var qid = addLabel(claim.value);
            if (qid) {//catch unknown value /=> null error
                html += "{" + qid + "} <br />";
            }
        });
        html += "<br>";
        html += '</span>';
    }

    // // number of spouses P26
    var spousesCount = (claims['P26'] && claims['P26'].length) || 0;
    if (spousesCount > 0) {
        // html +="Spouse: "+number_of_spouses+ " <br>" + getSpousesNames(claims['P26']);
        html += '<span class="co_index co_spouses">';
        html += "<b>⚭</b> ";
        var i = 0;
        newClaims.P26.forEach(function (claim) {
            if (i > 0) {
                html += ", ";
            } i++;
            var qid = addLabel(claim.value);
            if (qid) {//catch unknown value /=> null error
                html += "{" + qid + "}";
            }
        });
        html += "<br>";
        html += '</span>';

    }
    if (claims['P69']) {
        html += '<span class="co_index co_education">';

        newClaims['P69'].forEach(function (claim) {
            var qid = addLabel(claim.value);
            html += "Edu: {" + qid + "} ";
            // var start = getQualifiers(claim, "P580")[0] || false;
            // var end = getQualifiers(claim, "P582")[0] || false;
            // if (start || end){
            //     console.log(start);
            //     html += "("+ (start ? getYearOfQualifier(start) : "") + "-"+(end ? getYearOfQualifier(end) : "")+")";
            // }
            html += "<br>";
        });
        html += '</span>';

        // getValueQidOfClaim
    }
    var socialMedia = {
        'P6634': ['linkedin', 'https://www.linkedin.com/in/$1/'],
        'P2003': ['instagram', 'https://www.instagram.com/$1/'],
        'P2002': ['twitter', 'https://twitter.com/$1'],
        'P2013': ['facebook', 'https://www.facebook.com/$1/'],
        'P2949': ['wikitree', 'https://www.wikitree.com/wiki/$1'],
        'P2600': ['geni', ' https://www.geni.com/profile/index/$1'],
        'P7085': ['tiktok', ' https://www.tiktok.com/@$1'],
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

//further handle BCE because other functionality is already done from wbk.wikibaseTimeToSimpleDay 
function parseBCE(wikibaseSimpleDay) {
    var output = wikibaseSimpleDay;

    if (wikibaseSimpleDay.substr(0, 1) == "-") {
        output = wikibaseSimpleDay.substring(1) + " BCE";
    }
    return output;
}

function parseDate(unformattedDate) {
    var bce = (unformattedDate.substr(0, 1) == "-" ? " BCE" : "");
    dateObject = moment(unformattedDate.substr('+'.length));
    var output = "";
    if (dateObject.isValid()) {
        output += dateObject.format('L');
    } else {
        output += unformattedDate.substr('+'.length, 4);
        dateObject = moment(unformattedDate.substr('+'.length).replace("-00-00", "-01-01"));
    }
    output += bce;
    return {
        output: output,
        dateObject: dateObject
    }
}

var result = {
    root: null,
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
    if (value) {//&& labelIds.indexOf(value) == -1
        exports.labelIds.push(value);
    }
    return value;
}
function addLabel(claim) {
    if (claim && Array.isArray(claim) && claim.length > 0) {
        claim = claim[0].value;
    }
    if (claim) {//&& labelIds.indexOf(value) == -1
        exports.labelIds.push(claim);
    }
    return claim;
}
function getYearOfQualifier(q) {
    return q.datavalue.value.time.substr(1, 4);
}
function getValueQidOfClaim(claim) {
    var value = (claim && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value) || null;
    var numericId = value ? value['numeric-id'] : null;
    return numericId ? 'Q' + numericId : null;
}

function getQualifiers(claim, q) {
    var qualifiers = (claim && claim.qualifiers) || null;
    if (q) {
        if (!qualifiers) {
            return [];
        }
        return (qualifiers[q]) || [];
    }
    return qualifiers;
}
function hasEndQualifier(claim) {
    return getQualifiers(claim, "P582").length > 0;
}