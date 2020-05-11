
// // var options = [];
// wikidataController.wikidataApi({
//   ids     :  ['Q1','Q2'],//make labelIds unique https://futurestud.io/tutorials/node-js-get-an-array-with-unique-values-delete-duplicates
//   props   : 'labels' ,
//   lang    : 'en',
// },function (data) {
//   console.log(data);
// });
// var wbk = require('wikidata-sdk');
//
// const url = wbk.getManyEntities({
//   ids: ['Q1','Q2'],
//   languages: [ 'en', 'fr', 'de' ], // returns all languages if not specified
//   props: [ 'labels', 'descriptions', 'claims', 'sitelinks/urls' ], // returns all data if not specified
//   // format: 'xml', // defaults to json
//   // redirections: false // defaults to true
// });
// console.log(url);

$('.dropdown-settings a').on('click', function (event) {

    var $target = $(event.currentTarget),
        // val = $target.attr( 'data-value' ),
        $inp = $target.find('input'),
        val = $inp.attr('name'),
        idx;

    // if ( ( idx = options.indexOf( val ) ) > -1 ) {
    //   options.splice( idx, 1 );
    //   setTimeout( function() { $inp.prop( 'checked', false ) }, 0);
    // } else {
    //   options.push( val );
    //   setTimeout( function() { $inp.prop( 'checked', true ) }, 0);
    // }
    $inp.prop('checked', !$inp.prop('checked'));


    $(event.target).blur();

    // console.log( options );
    return false;
});

$("#option_lang").autocomplete({
    source: getWikidataLanguagesSource(),
    select: function (event, ui) {
        $("#option_lang").val(ui.item.label);
        $("#option_lang_hidden").val(ui.item.id);
        return false;
    }
});

$(".searchbox").autocomplete({
    minLength: 2,
    source: function (request, response) {
        console.log(request.term);
        $.ajax({
            // https://www.wikidata.org/w/api.php?action=wbsearchentities&search=W&format=json&errorformat=plaintext&language=en&uselang=en&type=item
            url: "https://www.wikidata.org/w/api.php",
            dataType: "jsonp",
            data: {
                'action': "wbsearchentities",
                'format': "json",
                'errorformat': "plaintext",
                'language': "en",
                'uselang': "en",
                'type': "item",
                'search': request.term
            },
            success: function (data) {
                // console.log(data);
                data = data.search;
                response(data);
            }
        });
    },
    change: function (event, ui) {
        //Detect changes and clear input search field when not select the autocomplete option
        if (ui.item == null || ui.item == undefined) {
            $("#searchbox").val("");
            $("#search-button").attr("disabled", true);
        } else {
            $("#search-button").attr("disabled", false);
        }
    },
    select: function (event, ui) {
        $("#searchbox").val(ui.item.label);
        $("#searchbox_id").val(ui.item.id);
        $("#search-button").attr("disabled", false);
        return false;
    }
}).autocomplete("instance")._renderItem = function (ul, item) {
    return $("<li>")
        .append("<div><b>" + item.label + "</b><br>" + item.description + "</div>")
        .appendTo(ul);
};

$('#search-button').click(function () {
    const search_text = $('#searchbox').val();
    if (!search_text) {
        alert('Please choose item from the auto complete first');
        return false;
    }
});