exports.getProfilePic = function (id, callback){//getValue(claims['P2600'])
    var url = "https://api.wikitree.com/api.php?action=getProfile&key=" + id  +"";
    fetch(url)
        .then(response => response.json())
        .then(entities => {
            callback(entities);
            //TODO get only image
        });
};