
$('.dropdown-settings a').on('click', function (event) {

    var $target = $(event.currentTarget),
        // val = $target.attr( 'data-value' ),
        $inp = $target.find('input'),
        val = $inp.attr('name'),
        idx;

    $inp.prop('checked', !$inp.prop('checked'));


    $(event.target).blur();

    return false;
});
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
var lang = getParameterByName('lang') || 'en';
$("#option_lang").autocomplete({
    source: getWikidataLanguagesSource(),
    select: function (event, ui) {
        $("#option_lang").val(ui.item.label);
        $("#option_lang_hidden").val(ui.item.id);
        lang = ui.item.id;
        return false;
    }
});

$(".searchbox").autocomplete({
    minLength: 2,
    source: function (request, response) {
        console.log(request.term);
        ajaxCall(request,"item",response)
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

$(".type_select").autocomplete({
    minLength: 2,
    source: function (request, response) {
        console.log(request.term);
        ajaxCall(request,"property",response)
    },
    change: function (event, ui) {
        //Detect changes and clear input search field when not select the autocomplete option
        if (ui.item == null || ui.item == undefined) {
            $("#type_select").val("");
            $("#search-button").attr("disabled", true);
        } else {
            $("#search-button").attr("disabled", false);
        }
    },
    select: function (event, ui) {
        $("#type_select").val(ui.item.label);
        $("#type_select_id").val(ui.item.id);
        $("#search-button").attr("disabled", false);
        return false;
    }
}).on('click', function() {
    //display popover when input text is clicked
    $(this).popover({
        html: true,
        trigger: 'focus',
        content: (
            `<div class="card>
                <div class="card-body ">
                    Most common :
                    <ul class="list-group">
                        <li class="list-group-item p-1"><a class="btn btn-sm common-property">ancestors</a></li>
                        <li class="list-group-item p-1"><a class="btn btn-sm common-property">descendants</a></li>
                        <li class="list-group-item p-1"><a class="btn btn-sm common-property">owner</a></li>
                        <li class="list-group-item p-1"><a class="btn btn-sm common-property">owns</a></li>
                    </ul>
                </div>
            </card>`
        )

      }).popover('show');
      //set text if child item in popover clicked
      $('.common-property').click(function(){
        const selected = $(this).html();
        $("#type_select").val(selected);
        $("#type_select_id").val(selected);
      })
      

}).autocomplete("instance")._renderItem = function (ul, item) {
    $('#type_select').popover('hide'); //hide popover
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

function ajaxCall(request,type,response){
    $.ajax({
        // https://www.wikidata.org/w/api.php?action=wbsearchentities&search=W&format=json&errorformat=plaintext&language=en&uselang=en&type=item
        url: "https://www.wikidata.org/w/api.php",
        dataType: "jsonp",
        data: {
            'action': "wbsearchentities",
            'format': "json",
            'errorformat': "plaintext",
            'language': lang,
            'uselang': lang,
            'type': type,
            'search': request.term
        },
        success: function (data) {
            // console.log(data);
            data = data.search;
            if (type === 'property')
                data = data.filter((item)=> item.datatype === 'wikibase-item');
            response(data);
        }
    });
}

//check and add query string parameter to property input text
const params = new URLSearchParams(window.location.search)
if (params.has('type_label'))
    $('#type_select').val(params.get('type_label'));
if (params.has('type'))
    $('#type_select_id').val(params.get('type'));