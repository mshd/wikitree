
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