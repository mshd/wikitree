
//source : http://coreymaynard.com/blog/extending-a-javascript-function/

(function () {
    var old_getPeopleData = getPeopleData;

    getPeopleData = function () {

        var result = old_getPeopleData.apply(this, arguments);
        var temp = result.html.split('<br />');
        if (temp[1].length) {
            temp[1] = '👻' + temp[1];
        }

        if (arguments[0]['P7085']) {
            temp[2] = 'Tiktok : ' + getValueQidAndAddLabel(arguments[0]['P7085']) + ' ';
            temp[3] = `<a href ="https://www.tiktok.com/@${getValueQidAndAddLabel(arguments[0]['P7085'])}">${getValueQidAndAddLabel(arguments[0]['P7085'])}</a> `;
        }
        if (arguments[0]['P106']) {
            temp[4] = 'Profession : {' + getValueQidAndAddLabel(arguments[0]['P106']) + '}';
        }
        result.html = temp.join('<br />');
        return result;
    }
})();