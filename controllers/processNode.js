const wbk = require('wikidata-sdk');
const moment = require('moment');
const fetch = require('node-fetch');
const thirdPartyImages = require('../public/storage/images');
exports.nodeImages = {};
exports.result = {
    root: null,
};
exports.labelIds = [];
exports.birthAndDeathPlace = [];
exports.ownValue = [];
exports.createNode = function (data, item_id, child_id, lang, secondLang, treeType) {

    // data.entities = data;
    var label = (data.entities[item_id].labels[lang] ? data.entities[item_id].labels[lang].value : "undefined");
    if (label === "undefined") {
        label = (data.entities[item_id].labels.en ? data.entities[item_id].labels.en.value : "undefined");
    }
    var secondLabel = (data.entities[item_id].labels[secondLang] ? data.entities[item_id].labels[secondLang].value : "undefined");
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
    if (claims['P154'] && claims['P154'][0]) {//logo propery
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
    // if (thirdPartyImages.imageURLS[itemIdNumber]) {
    //     images.push({ 'url': thirdPartyImages.imageURLS[itemIdNumber] });
    // }
    // Get from wikipedia images if there is no image
    // if (images.length == 0) {
    //     //check if has wikipedia name, and set the name and id to be fetch in the client side;
    //     if (data.entities[item_id].sitelinks && data.entities[item_id].sitelinks[lang + "wiki"]) {
    //         var wikipediaName = data.entities[item_id].sitelinks[lang + "wiki"].url.split('/wiki/')[1];
    //         //Async Await the response fetch
    //         const getImage = async () => {
    //             const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + wikipediaName);
    //             const json = await response.json();
    //             if (json.thumbnail) {
    //                 console.log(json.thumbnail.source);
    //                 images.push({ 'url': json.thumbnail.source });
    //             }
    //         }
    //         getImage().catch(error => console.log("Error get Wikipedia Image : "+error.message)); //add Error catch
    //     }
    // }
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
    //get father_id and mother_id if descendants
    if(treeType === "descendants"){
        var father_id;
        //father P22
        if (claims['P22'] && claims['P22'].length > 0) {
            father_id = claims['P22'][0].value;
        }

        var mother_id;
        //mother P25
        if (claims['P25'] && claims['P25'].length > 0) {
            mother_id = claims['P25'][0].value;
        }
    }else if (treeType === "owner"){
        //add percentage value to array to be used on next child iteration
        if (claims['P127']){
            //get owner ids and the value
            claims['P127'].forEach((item)=>exports.ownValue.push(item));
        }
        //check if exist
        var value_exist = exports.ownValue.find(x => x.value == item_id)
        if (value_exist){
            // add percentages value only if the value exist
            if (value_exist.qualifiers && value_exist.qualifiers.P1107){
                html += '<span class="float-right" style="margin-top:-20px;">'+ parseFloat(exports.ownValue.find(x => x.value == item_id).qualifiers.P1107[0])*100+' %</span>';
            }
        }
    }else if (treeType === "owns"){
        //add percentage value to array to be used on next child iteration
        if (claims['P355']){
            //get owner ids and the value
            claims['P355'].forEach((item)=>exports.ownValue.push(item));
        }
        //check if exist
        var value_exist = exports.ownValue.find(x => x.value == item_id)
        if (value_exist){
            // add percentages value only if the value exist
            if (value_exist.qualifiers && value_exist.qualifiers.P1107){
                html += '<span class="float-right" style="margin-top:-20px;">'+ parseFloat(exports.ownValue.find(x => x.value == item_id).qualifiers.P1107[0])*100+' %</span>';
            }
        }
    }
    
    //name in selected language
    var langName = data.entities[item_id].sitelinks && data.entities[item_id].sitelinks[lang + "wiki"];
    //name in english language
    var englishName = data.entities[item_id].sitelinks && data.entities[item_id].sitelinks["enwiki"];
    //check if there is wikidata title in selected language
    if (langName) {
        //if exist, continue as usual
        var wikipediaName = data.entities[item_id].sitelinks[lang + "wiki"].url.split('/wiki/')[1];
        html += '<a href="javascript:void(0);" onclick="wikipedia(this,\''+lang+'\',false ,  )" data-wiki="' + wikipediaName + '" data-id="' + itemIdNumber + '" data-original-title="" title="">' + label + '</a>';
    } else if (lang != 'en' && englishName){
        //if the wikidata title doesn't exist in language other than english, get english version title        
        var wikipediaName = data.entities[item_id].sitelinks["enwiki"].url.split('/wiki/')[1];
        html += '<a href="javascript:void(0);" onclick="wikipedia(this,'+'\'en\''+',false ,  )" data-wiki="' + wikipediaName + '" data-id="' + itemIdNumber + '" data-original-title="" title="">' + label + '</a>';
    }else{
        html += '<a target="_blank" href="https://www.wikidata.org/wiki/' + item_id + '">' + label + '</a>';
    }
    //add second label if defined
    if (secondLabel && secondLabel !== label && secondLabel !== "undefined"){
        html += '<br />'+secondLabel;
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
    //using birthdate sort value if the tree type is descendants
     if(treeType === "descendants"){
         sortValue = peopleData.sortValue;
     }
    html += '</p>';
    if (images.length > 0) {
        exports.nodeImages[item_id] = [0, images];
        html = '<img class="node_image" id="image_' + item_id + '" data-item="' + item_id + '" alt="" src="' + images[0].url + '">' + html;
    }
    //add mother_id and father_id to child node if type is descendants
    if(treeType === "descendants"){
        return newRow = {
            id: item_id,
            innerHTML: html,
            parent_id: child_id,
            mother_id: mother_id,
            father_id: father_id,
            HTMLclass: className,
            sortValue: sortValue,
        };
    }else{
        return newRow = {
            id: item_id,
            innerHTML: html,
            parent_id: child_id,
            HTMLclass: className,
            sortValue: sortValue,
        };
    }

};


function getPeopleData(claims, newClaims, treeType) {

    // date of birth P569
    var birthDate = (newClaims.P569 && newClaims.P569[0].value !== undefined  ? parseDate2(newClaims.P569[0].value) : null);
    var birthPlace = addLabel(newClaims['P19'],'BD');
    var sortValue = null;

    // date of death P570
    var deathDate = (newClaims.P570 && newClaims.P570[0].value !== undefined ? (parseDate2(newClaims.P570[0].value).output) : null);
    var deathPlace = addLabel(newClaims['P20'],'BD');

    // burial date P4602, burial place P119
    var burialDate = (newClaims.P4602 && newClaims.P4602[0].value !== undefined ? (parseDate2(newClaims.P4602[0].value)) : null);
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
                sortValue = birthDate.dateObject;
            }
            html += birthDate.output;
        }
        html += (birthPlace ? " {" + birthPlace + "}" : "") + '<br />';
    }

    if (deathDate || deathPlace) {
        html += "†";
        html += (deathDate ? deathDate + " " : "");
        html += (deathPlace ? "{" + deathPlace + "}" : "");
        html += '<br />';
    }

    // if (burialDate || burialPlace) {
    //     html += "⎧ᴿᴵᴾ⎫ ";
    //     html += (burialDate ? burialDate + " " : "");
    //     html += (burialPlace ? "{" + burialPlace + "}" : "");
    //     html += "<br />";
    // }

    // // number of occupations P106
    var occupationsCount = (newClaims['P106'] && newClaims['P106'].length) || 0;
    if (occupationsCount > 0) {
        html += '<span class="co_index co_occupations">';
        html += "<b>💼</b> ";
        var i = 0;
        newClaims.P106.forEach(function (claim) {
            if (i > 0) {
                html += ", ";
            } i++;
            var qid = addLabel(claim.value);
            if (qid) {//catch unknown value /=> null error
                html += "{" + qid + "} <br />";
            }
        });
        html += '</span>';
    }

    // // number of spouses P26 commented already new entitiy TODO optional
    // var spousesCount = (newClaims['P26'] && newClaims['P26'].length) || 0;
    // if (spousesCount > 0) {
    //     // html +="Spouse: "+number_of_spouses+ " <br>" + getSpousesNames(claims['P26']);
    //     html += '<span class="co_index co_spouses">';
    //     html += "<b>⚭</b> ";
    //     var i = 0;
    //     newClaims.P26.forEach(function (claim) {
    //         if (i > 0) {
    //             html += ", ";
    //         } i++;
    //         var qid = addLabel(claim.value);
    //         if (qid) {//catch unknown value /=> null error
    //             html += "{" + qid + "}";
    //         }
    //     });
    //     html += "<br>";
    //     html += '</span>';
    //
    // }


    if (newClaims['P69']) {
        html += '<span class="co_index co_education">';

        newClaims.P69.forEach(function (claim) {
            var qid = addLabel(claim.value);
            var htmlTitle = '';
            var start = claim.qualifiers.P580 ? claim.qualifiers.P580[0] : false;
            var end = claim.qualifiers.P582 ? claim.qualifiers.P582[0] : false;
            if (start || end) {
                //Set start and end of education
                htmlTitle += "("
                if (start && !end) {
                    htmlTitle += 'Start: ' + getYearOfQualifier(wbk.wikibaseTimeToSimpleDay(start));
                } else if (!start && end) {
                    htmlTitle += 'End : ' + getYearOfQualifier(wbk.wikibaseTimeToSimpleDay(end))
                } else if (start && end) {
                    htmlTitle += (start ? getYearOfQualifier(wbk.wikibaseTimeToSimpleDay(start)) : "") + "-" + (end ? getYearOfQualifier(wbk.wikibaseTimeToSimpleDay(end)) : "");
                }
                htmlTitle += ")";

                //Academic Degree 512
                var degree = claim.qualifiers.P512 ? claim.qualifiers.P512[0] : false;
                if (degree)
                    htmlTitle += (degree) ? ' Degree : {' + addLabel(degree) + '} ' : '';

                //Major P812
                var major = claim.qualifiers.P812 ? claim.qualifiers.P812[0] : false;
                if (major)
                    htmlTitle += (major) ? ' Major: {' + addLabel(major) + '}' : '';

            }
            html += '<span title="' + htmlTitle + '" >Edu: {' + qid + '} </span > <br/>';
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
        if (newClaims[s]) {
            html += '<a target="_blank" href="' + socialMedia[s][1].replace("$1", newClaims[s][0].value) + '"  style="margin-right: 5px"><img src="storage/icons/' + socialMedia[s][0] + '.png" style="height: 16px;"/></a>';
        }
    }
    html += '</span>';



    return {
        html: html,
        sortValue: sortValue
    };

}
function parseDate2(wikidatatime){
    //check if an object
    //example of  valid object {time: "+1500-07-07T00:00:00Z" ,precision:8}
    if (wikidatatime instanceof Object){
        /*
        0 - billion years
        3 - million years
        4 - hundred thousand years
        6 - millenium
        7 - century
        8 - decade
        9 - year (only year)
        10 - month (only month);
        11 - day
        */
       var momentFormat = { 
            6: "y [millennium]",
            7: "y[th century]",
            8: "y[s]",
            9: "y",
            10: "Y-MM",
            11: "Y-MM-DD"
        };
       var parsedDate;
        //check moment js validity
        //Moment year date range valid -271820 - 275760
        parsedDate = moment(wbk.wikibaseTimeToISOString(wikidatatime.time+''));
        if (parsedDate.isValid()){
            var year = parsedDate.year();
            if (year<0){
                return {
                    'output' : parsedDate.format(" y N"),
                    'dateObject' : moment(wbk.wikibaseTimeToISOString(wikidatatime.time+'')).valueOf()
                }
            }else{
                var precision = wikidatatime.precision;
                if (precision == 6){
                    parsedDate.set({'year':(year/1000)});
                }else if (precision == 7){
                    parsedDate.set({'year':(year/100)});
                }else if (!precision){
                    precision = 9;
                }
                return {
                    'output' : parsedDate.format(momentFormat[wikidatatime.precision]),
                    'dateObject' : moment(wbk.wikibaseTimeToISOString(wikidatatime.time+'')).valueOf()
                }
            }
            
        } else {
            //if not covered with momentjs, try using simpleday
            return {
                'output' : wbk.wikibaseTimeToSimpleDay(wikidatatime),
                'dateObject' : null
            }
        }
    }else{
        return false;
    }

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
    return (claim && claim.value) || null;
}


function addLabel(claim,type = null) {
    if (claim && Array.isArray(claim) && claim.length > 0) {
        claim = claim[0].value;
    }
    if (claim) {//&& labelIds.indexOf(value) == -1
        if (type == 'BD')
            exports.birthAndDeathPlace.push(claim);
        exports.labelIds.push(claim);
    }
    return claim;
}
function getYearOfQualifier(q) {
    return moment(q).get('year');
    //return q.datavalue.value.time.substr(1, 4);
}

