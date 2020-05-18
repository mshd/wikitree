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
var treeType, maxLevel, secondLang, chartOptions = [];
var labelIds = [];


unflatten = function (array, parent, tree) {
    tree = typeof tree !== 'undefined' ? tree : [];
    parent = typeof parent !== 'undefined' ? parent : { id: 0 };

    var children = _.filter(array, function (child) { return child.parent_id == parent.id; });
    if (children.length && children[0].sortValue) {
        children = children.sort(function (a, b) {
            return a.sortValue - b.sortValue
        })
    }
    // console.log(children);
    if (!_.isEmpty(children)) {
        if (parent.id == 0) {
            tree = children;
        } else {
            parent['children'] = children
        }
        _.each(children, function (child) { unflatten(array, child) });
    }

    return tree;
}
function selectFormField(name, value) {
    $("form#search select[name='" + name + "'] option").filter(function () { return $(this).html() == value; }).attr('selected', 'selected');
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

    var orientation = getParameterByName('orientation') || 'NORTH';
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

    $.getJSON('/createtree',
        {
            root: root,
            lang: lang,
            secondLang: secondLang,
            maxLevel: maxLevel,
            property: treeType,
            nocache: nocache,
            options: chartOptions,
        }, function (data) {
            rows = data.rows;
            if (!$("#searchbox").val()) {
                document.title = data.title;
                $("#searchbox").val(data.root.label);
                $("#searchbox_id").val(data.root.id);
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
        });
}
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
//tests