exports.geniGetProfilePic = function (id, callback){//getValue(claims['P2600'])
   var url = "https://www.geni.com/api/profile-g" + id  +"/photos";
    fetch(url)
    .then(response => response.json())
    .then(entities => {
        callback(entities);
        //TODO get only image
    });
};