// google.load("visualization", "1", {packages:["orgchart"]});
// google.setOnLoadCallback(drawChart);

moment.locale('de');// , { longDateFormat: {'L': "DD.MM.YYYY" } });
var relations = [
    { prop : 'P22' , name : 'father' , to_q : false , edge_color : '#3923D6' } ,
    { prop : 'P25' , name : 'mother' , to_q : false , edge_color : '#FF4848' } ,
    // { prop : 'P40' , name : 'child' , to_q : false , edge_color : '#888888' }
] ;

var supportedTypes  = {
    'ancestors': relations,
    'descendants' : [{ prop : 'P40' , name : 'child' , to_q : false , edge_color : '#888888' }],
    'owner'    : [
        { prop : 'P127' , name : 'owner' ,      to_q : false , edge_color : '#3923D6' } ,
        { prop : 'P749' , name : 'parentOrg' ,  to_q : false , edge_color : '#FF4848' } ,
    ],
    'owns'    : [
        { prop : 'P1830' , name : 'owns' ,      to_q : false , edge_color : '#3923D6' } ,
        { prop : 'P355' , name : 'subsidiary' ,  to_q : false , edge_color : '#FF4848' } ,
    ],
    'subclasses'    : [
        // { prop : 'P1830' , name : 'owns' ,      to_q : false , edge_color : '#3923D6' } ,
        { prop : 'P279' , name : 'subclass' ,  to_q : false , edge_color : '#FF4848' } ,
    ]
};
function wikidataApi(para, callback) {
    $.getJSON(
        "https://www.wikidata.org/w/api.php?callback=?",
        {
            action : 'wbgetentities' ,
            ids :  para.ids ,
            props : para.props || 'labels|descriptions|claims' ,
            languages : para.lang || 'en',
            languagefallback : '1',
            format : 'json'
        },callback
    );
}
function getLevel(item_id, child_id, lang, level, callback, rows) {
    // console.log("getLevel", level);
    if (level === 0) {
        callback();
        return;
    }
    wikidataApi({
        ids :  item_id ,
        props : 'labels|descriptions|claims|sitelinks/urls' ,
        lang : lang + (secondLang ? "|"+secondLang : ""),
        languagefallback : '1',
    },function (data) {
        processLevel(data, item_id, child_id, lang, level, callback, rows);
    });
}

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
        labelIds.push(value);
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
var treeType, maxLevel, stackChildren, secondLang, showBirthName, chartOptions = [];
var labelIds= [];

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


function getPeopleData(claims) {

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

    if(chartOptions.birthname && claims.P1477){
        html +="(born as "+ getValueData(claims.P1477,"text")+")<br />";
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

    if(chartOptions.spouses && number_of_spouses > 0){
        // html +="Spouse: "+number_of_spouses+ " <br>" + getSpousesNames(claims['P26']);
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


    }
    if(chartOptions.education && claims['P69']){
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
        // getValueQidOfClaim
    }
    var socialMedia = {
    'P6634' : ['linkedin','https://www.linkedin.com/in/$1/'],
    'P2003' : ['instagram',' https://www.instagram.com/$1/'],
    'P2002' : ['twitter','  https://twitter.com/$1'],
    'P2013' : ['facebook',' https://www.facebook.com/$1/'],
    // 'P345' : ['imdb',' https://www.imdb.com/name/$1/']

    };
    if(chartOptions.socialmedia) {
        for (s in socialMedia) {
            if (claims[s]) {
                // html += '<a target="_blank" href="'+ socialMedia[s][1].replace("$1",getValue(claims[s])) +'" class="fa fa-'+socialMedia[s][0]+'" style="margin-right: 5px"></a>';
                html += '<a target="_blank" href="' + socialMedia[s][1].replace("$1", getValue(claims[s])) + '" style="margin-right: 5px"><img src="storage/icons/' + socialMedia[s][0] + '.png" style="height: 16px;"/></a>';
            }
        }
    }


    return {
        html: html,
        sortValue: sortValue
    };

}


function processLevel(data, item_id, child_id, lang, level, levelCb, rows) {
    // console.log("processLevel", level);
    // add a different class for fallback language
    $( "#progressbar" ).progressbar({value: ($( "#progressbar" ).progressbar( "option", "value" ))+5 });

    var label = (data.entities[item_id].labels[lang] ? data.entities[item_id].labels[lang].value : "undefined");
    if(label == "undefined"){
        label = (data.entities[item_id].labels.en ? data.entities[item_id].labels.en.value : "undefined");
    }
    if(secondLang){
       var label2 = (data.entities[item_id].labels[secondLang] ? data.entities[item_id].labels[secondLang].value : null);
    }
    // for (label_lang in data.entities[item_id].labels) {
    //     var label =  data.entities[item_id].labels[label_lang].value;
    //     break;
    // }
    for (descr_lang in data.entities[item_id].descriptions) {
        var descr =  data.entities[item_id].descriptions[descr_lang].value;
        break;
    }
    var claims = data.entities[item_id].claims;

    // console.log($("#searchbox").val());
    if(!$( "#searchbox" ).val()){
        document.title = "Wikitree: " + treeType +" of "+ label;
        $( "#searchbox" ).val(label );
        $( "#searchbox_id" ).val( item_id );
    }


    // console.log(treeType);
    if(treeType == "ancestors") {
        // mother P25
        var mother_item_id = getValueQid(claims['P25']);
        // father P22
        var father_item_id = getValueQid(claims['P22']);
        // image P18
    }
    var image_page = getValue(claims['P18']);
    if(!image_page){
        image_page = getValue(claims['P154']);
    }if(!image_page){
        image_page = getValue(claims['P6500']);
    }

    var imageUrl=false;
    var itemIdNumber = item_id.substr(1);
    if(image_page){
        imageUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/'+  image_page +'?width=100px';
    }else if(getValue(claims['P2002'])){
        imageUrl = 'https://avatars.io/twitter/'+getValue(claims['P2002']);//    https://avatars.io/twitter/jesslynewidjaja
    }else if(imageURLS[itemIdNumber]) {
        imageUrl = imageURLS[itemIdNumber];
    }

    // gender P21
    var className = "";

    var sortValue = null;

    if (claims['P21']) {
        var gender_id = getValueData(claims['P21'], 'numeric-id');
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




    var asyncFunctions = [
        function(callback) {
            var html = '<p class="node-name">';
            html += '<a target="_blank" href="https://www.wikidata.org/wiki/' + item_id + '">' + label + '</a>';
            if(label2 && label != label2){//add second language icon
                html += '<br />'+label2;
            }
                //'<a href="' + location.href.replace(location.search, '') + '?q=' + item_id + '">' + label + '</a>';
            html += '</p><p class="node-title">' ;
            var peopleData = getPeopleData(claims);
            html += peopleData.html;
            if(chartOptions.socialmedia && data.entities[item_id].sitelinks && data.entities[item_id].sitelinks[lang+"wiki"])
            html += '<a title="Read on Wikipedia" target="_blank" href="'+ data.entities[item_id].sitelinks[lang+"wiki"].url +'" style="margin-right: 5px"><img src="storage/icons/wikipedia.png" style="height: 16px;"/></a>';


            if(treeType === "descendants"){
                sortValue = peopleData.sortValue;
            }
            html += '</p>';
            if(treeType === "owner") {
                // html += '<p>Proportion</p>';
                var industry = getValueQid(claims['P452']);
                if(industry) {
                    labelIds.push(industry);
                    html += '<p>Industry: {' + industry + '}</p>';
                }
            }
            if(imageUrl){
                html = '<img alt="" src="'+  imageUrl +'">'  + html;
            }
            var newRow = {
                id: item_id,
                innerHTML: html,
                parent_id: child_id,
                stackChildren: stackChildren,
                HTMLclass : className,
                sortValue: sortValue,
            };

            //fetch GENI pic if present TODO
            // if (!image_page && getValue(claims['P2600'])) {
            //     $.getJSON(
            //         // "https://www.geni.com/api/profile-g" + getValue(claims['P2600']) +"/photos",
            //         "/treeapi",
            //         {
            //             source : "geniPhotos",
            //             profile: getValue(claims['P2600']),
            //         },
            //         function (data) {
            //             console.log(data);
            //             newRow.innerHTML = '<img alt="File:" src="">'  + html;
            //             rows.push(newRow);
            //             callback(null, rows);
            //         }
            //     );
            // }
            // // fetch wikitree pic if present
            // else
                if (false && !image_page && getValue(claims['P2949'])) {
                $.getJSON(
                    // "https://api.wikitree.com/api.php?callback=?",
                    "/treeapi",
                    {
                        source : "wikitree",
                        action: "getProfile",
                        key : getValue(claims['P2949'])
                    },
                    function (data) {
                        console.log("Fetched from Wikitree");
                        if(data[0] && data[0].profile.PhotoData && data[0].profile.PhotoData.url){
                            newRow.innerHTML = '<img title="FileSource:Wikitree.com" src="https://www.wikitree.com'+ data[0].profile.PhotoData.url +'">'  + html;
                        }
                        rows.push(newRow);
                        callback(null, rows);
                    }
                );
            } else {
                rows.push(newRow);
                callback(null, rows);
            }
        }
    ];
    var duplicates = rows.some(o => o.id === item_id);
    // console.log(duplicates);
    if(!duplicates) {
        // if( && treeType != "ancestors")
        var r = supportedTypes[treeType];
        if(!r){
            var children = claims[treeType] || [];
        }else {
            // console.log(r);
            var children = claims[r[0].prop] || [];
            if (r[1]) {
                children = children.concat(claims[r[1].prop]);
            }
        }
        // var owners = (claims['P127'] || []).concat(claims['P749']);
        // console.log("list");
        var children_distinct_Qids = [];
        for(var child in children) {
            if (!hasEndQualifier(children[child])) {
                var child_item_id = getValueQidOfClaim(children[child]);
                if(children_distinct_Qids.indexOf(child_item_id) == -1){
                    children_distinct_Qids.push(child_item_id);
                }
            }
        }
        // console.log(children_distinct_Qids);
        for(child in children_distinct_Qids){
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
        function(err, results) {
            // console.log("level", level);
            // updateRows(rows);
            levelCb();
        }
    );
}

unflatten = function( array, parent, tree ){
    tree = typeof tree !== 'undefined' ? tree : [];
    parent = typeof parent !== 'undefined' ? parent : { id: 0 };

    var children = _.filter( array, function(child){ return child.parent_id == parent.id; });
    if(children.length && children[0].sortValue){
        children = children.sort(function(a, b){
            return a.sortValue-b.sortValue
        })
    }
    // console.log(children);
    if( !_.isEmpty( children )  ){
        if( parent.id == 0 ){
            tree = children;
        }else{
            parent['children'] = children
        }
        _.each( children, function( child ){ unflatten( array, child ) } );
    }

    return tree;
}
function selectFormField(name,value) {
    $("form#search select[name='"+name+"'] option").filter(function () { return $(this).html() == value; }).attr('selected','selected');
}
function getUrlVars() {

    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[decodeURIComponent(key)] = value;
    });
    return vars;
}

function drawChart() {
    var rows = [];
    var root = getParameterByName('q') || 'Q154952';
    var lang = getParameterByName('lang') || 'en';
    moment.locale(lang);

    chartOptions.lang = lang;

    var urlVars = getUrlVars();


    chartOptions.birthname      = urlVars['options[birthname]'] || false;
    chartOptions.socialmedia    = urlVars['options[socialmedia]'] || false;
    chartOptions.education      = urlVars['options[education]'] || false;
    chartOptions.spouses        = urlVars['options[spouses]'] || false;


    $(".dropdown-settings a input").each(function (i) {
        $(this).prop( 'checked', chartOptions[$(this).attr("data-value")] );
    });

    secondLang = getParameterByName('second_lang') || null;
    // selectFormField('lang',lang);
    $( "#option_lang" ).val( getWikidataLanguages()[lang] );
    $( "#option_lang_hidden" ).val( lang );


    $( "#progressbar" ).progressbar({value: 10});


    for(var i = 2;i<11;i++){
        $("#option_level").append($("<option />").val(i).text(i));
    }
    maxLevel = getParameterByName('level') || '3';
    selectFormField('level',maxLevel);

    treeType = getParameterByName('type') || 'ancestors';
    selectFormField('type',treeType);

    stackChildren = getParameterByName('stack') || true
    chartOptions.stackChildren = stackChildren;

    if(stackChildren == "false" || treeType == "ancestors" || treeType == "owner"){stackChildren=false;}
    console.log(chartOptions);//c

    var orientation =getParameterByName('orientation') || 'NORTH';
    selectFormField('orientation',orientation);

    // console.log("draw");
    // console.log(stackChildren);

    getLevel(
        root,
        '',
        lang,
        maxLevel,
        function() {
            // console.log("DONE");
            // console.log(rows);
            $( "#progressbar" ).progressbar({value: 80});

            const replaceLabels = (string, values) => string.replace(/{(.*?)}/g,
                (match, offset) => (values[offset].labels && values[offset].labels[lang]) ? values[offset].labels[lang].value : values[offset].id);
            //fetch labels
            wikidataApi({
                ids : ($.unique(labelIds)).join("|"),
                props: "labels",
                lang: lang,
            },function (data) {
                labels = data.entities;
                // console.log(labels);
                for(row in rows){
                    // console.log(rows[row].innerHTML);
                    rows[row].innerHTML =replaceLabels(rows[row].innerHTML,labels);
                }

                var treeStructure = unflatten(rows);
                treeStructure = treeStructure[0];
                console.log(treeStructure);

                var chart_config = {
                    chart: {
                        container: "#collapsable-example",
                        nodeAlign: "BOTTOM",
                        scrollbar: "None",
                        connectors: {
                            type: 'step' //curve bCurve step straight
                        },
                        animateOnInit: true,
                        rootOrientation: orientation.toUpperCase(),
                        node: {
                            collapsable: true
                        },
                        animation: {
                            // nodeAnimation: "easeOutBounce",
                            // nodeSpeed: 700,
                            connectorsAnimation: "bounce",
                            connectorsSpeed: 700
                        }
                    },
                    nodeStructure: treeStructure
                };
                tree = new Treant( chart_config );
                $( "#progressbar" ).progressbar({value: 100});
                $( "#progressbar" ).hide(500);



            });


            // var treantGui = new treantGui("guiButtons", tree);
            // var nodes = tree.tree.getNodeDb().db;
            // console.log(nodes);
            // tree.tree.addNode(nodes[6], { text: { name: "newNodeText" } });
        },
        rows
   );
}


function updateRows(rows) {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Name');
    data.addColumn('string', 'Child');
    data.addColumn('string', 'ToolTip');
    data.addRows(rows);
    var chart = new google.visualization.OrgChart(document.getElementById('chart_div'));
    chart.draw(data, {allowHtml:true});
}


function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
drawChart();
//tests