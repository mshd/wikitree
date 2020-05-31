// var wbk = require('wikidata-sdk/types');
var wikitree = require('./controllers/wikitree');



moment.locale('de');// , { longDateFormat: {'L': "DD.MM.YYYY" } });
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
var treeType, maxLevel, secondLang, orientation, chartOptions = [];
var labelIds = [];


unflatten = function (array, parent, tree) {
    tree = typeof tree !== 'undefined' ? tree : [];
    parent = typeof parent !== 'undefined' ? parent : { id: 0 };
    //filter child with mother_id or father_id if it's a child node, if not continue usage parent.id
    var children = _.filter(array, function (child) { return ((child.mother_id || child.father_id) && parent.id !== 0)? (child.mother_id == parent.id || child.father_id == parent.id) : child.parent_id == parent.id });
    if (children.length && children[0].sortValue) {
        children = children.sort(function (a, b) {
            return a.sortValue - b.sortValue
        })
    }

    //get all siblings by S_ identifier and configure the sibling link only when show siblings option selected
    if (chartOptions.siblings){
        //get all the siblings with S_ identifier we configured
        var siblings = _.filter(array, function (sibling) { return sibling.parent_id == 'S_'+parent.id; });
        if (siblings.length && siblings[0].sortValue) {
            siblings = siblings.sort(function (a, b) {
                return a.sortValue - b.sortValue
            })
        }
        // bind all the siblings to the ['siblings'] in the node
        // console.log(siblings);
        if (!_.isEmpty(siblings)) {
            if (parent.id != 0) {
                parent['sibling'] = siblings
            }
        }
    }
    //get all the spouse with SP_ identifier we configured
    var spouses = _.filter(array, function (spouse) { return spouse.parent_id == 'SP_'+parent.id; });
    if (spouses.length && spouses[0].sortValue) {
        spouses = spouses.sort(function (a, b) {
            return a.sortValue - b.sortValue
        })
    }
    if (!_.isEmpty(spouses)) {
        if (parent.id == 0) {
            tree = spouses;
        } else {
            parent['spouse'] = spouses
        }
        //iterate each spouse
        _.each(spouses, function (spouse) { unflatten(array, spouse) });
    }

    // console.log(children);
    if (!_.isEmpty(children)) {
        //check if parent have spouse
        if (parent['spouse']){
            var spouseChildren = [];

            _.each(parent['spouse'], function(spouse){
                //check children for each parent spouse and get it' id
                _.each(spouse['children'], function(spouseChild){
                    spouseChildren.push(spouseChild.id);
                });
            })
            //if the parent spouse has children, filter it from children for next iteration
            if (spouseChildren.length > 0){
                children = _.filter(children, function (child) { return !spouseChildren.includes(child.id)});
            }
        }
        if (parent.id == 0) {
            tree = children;
        } else {
            parent['children'] = children
        }
        _.each(children, function (child) { unflatten(array, child) });
    }

    return tree;
};
function selectFormField(name, value) {
    $("form#search select[name='" + name + "'] option").filter(function () { return $(this).html() == value; }).attr('selected', 'selected');
}


function renderData(data) {
    rows = data.rows;
    if (!$("#searchbox").val()) {
        document.title = data.title;
        $("#searchbox").val(data.root.label);
        $("#searchbox_id").val(data.root.id);
    }
    var treeStructure = unflatten(rows);
    treeStructure = treeStructure[0];
    console.log(treeStructure);
    console.log(JSON.stringify(treeStructure));

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
    tree = new Treant(chart_config);
    $("#progressbar").progressbar({ value: 100 });
    $("#progressbar").hide(500);
    for (i in chartOptions) {
        // console.log(i);
        if (chartOptions[i]) {
            $(".co_" + i).show();
        }
    }
    $('img.node_image').on('click',  function(event){
        console.log("click");
        var images =data.nodeImages[$(this).data('item')];
        if(images.length > 1){
            images[0]++;//counter up
            if(images[0] === images[1].length){
                images[0]=0;//reset counter;
            }
            $(this).attr('src', images[1][images[0]].url);
        }
    });
}

function drawChart() {
    var rows = [];
    var root = getParameterByName('q') || 'Q154952';
    var lang = getParameterByName('lang') || 'en';
    //Add nocache parameter
    var nocache = getParameterByName('nocache') || '0';;
    moment.locale(lang);

    chartOptions.lang = lang;

    var urlVars = getUrlVars();

    chartOptions.birthname = urlVars['options[birthname]'] || false;
    chartOptions.socialmedia = urlVars['options[socialmedia]'] || false;
    chartOptions.education = urlVars['options[education]'] || false;
    chartOptions.spouses = urlVars['options[spouses]'] || false;
    chartOptions.occupations = urlVars['options[occupations]'] || false;
    chartOptions.siblings = urlVars['options[siblings]'] || false;
    chartOptions.stackChildren = getParameterByName('stack') || true;



    //set false for certain treeTypes
    if (chartOptions.stackChildren == "false" || treeType == "ancestors" || treeType == "owner") { chartOptions.stackChildren = false; }


    $(".dropdown-settings a input").each(function (i) {
        $(this).prop('checked', chartOptions[$(this).attr("data-value")]);
    });

    secondLang = getParameterByName('second_lang') || null;
    // selectFormField('lang',lang);
    $("#option_lang").val(getWikidataLanguages()[lang]);
    $("#option_lang_hidden").val(lang);


    $("#progressbar").progressbar({ value: 10 });


    for (var i = 2; i < 11; i++) {
        $("#option_level").append($("<option />").val(i).text(i));
    }
    maxLevel = getParameterByName('level') || '3';
    selectFormField('level', maxLevel);

    treeType = getParameterByName('type') || 'ancestors';
    selectFormField('type', treeType);

    console.log(chartOptions);//c

    orientation = getParameterByName('orientation') || 'NORTH';
    selectFormField('orientation', orientation);
    //set the animation progressbar
    var progressBar = $("#progressbar");
    var i = 10;
    var progressTimer = setInterval(frame,500);
    function frame() {
        //stop timer and hide progress bar when value >= 100
        if ( progressBar.progressbar('value') >= 100) {
            clearInterval(progressTimer);
            $("#progressbar").hide(500);
        } else {
            i += 2+(10/maxLevel);
            progressBar.progressbar('value',i);
        }
    }
    console.log(window.location.hostname);
    var createtreeUrl = '/createtree';
    if(window.location.hostname === "dataprick.github.io"){
        createtreeUrl = 'http://116.203.111.168:3000/createtree?callback=?';
    }
    var settings ={
        root: root,
        lang: lang,
        secondLang: secondLang,
        maxLevel: maxLevel,
        property: treeType,
        nocache: nocache,
        options: chartOptions,
        spouses: (chartOptions.spouses ? 1 : 0),

    };
    if(false) {// previous
        $.getJSON(createtreeUrl,
            settings, function (data) {
                renderData(data)
            });
    }else{
        // var wikitree = require('./controllers/wikitree');
        // console.log(wikitree.)
        wikitree.init(settings,function (err,data) {
            console.log("entered fu");
            console.log(data);
            renderData(data)

        });
    }


}

// .fail(function( jqxhr ) {
//     //finish progressbar and show error
//     $("#progressbar").progressbar({ value: 100 });
//     console.log("Error processing data " +jqxhr.responseJSON.error);
//     alert("Error processing data, please try again");
// });

function getUrlVars() {

    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[decodeURIComponent(key)] = value;
    });
    return vars;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
drawChart();