var express = require('express');
var router = express.Router();
var request = require('request');

const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');
const wikitree = require('../controllers/wikitree');

var wikidataController = require('../controllers/wikidata');

/* GET home page. */
router.get('/', function(req, res, next) {
        res.render('index', { title: 'Express' });
});

router.get('/createtree', function(req, res, next) {
    var results = wikitree.init(req.query,function (results) {
        res.json(results);
    });
   // var wikidata = wikidataController.wikidataApi({
   //     ids: [ 'Q1', 'Q5', 'Q571' ]
   //  },function (result) {
   //     console.log(result);
   //     // res.json(result);
   //
   //     // res.render('index', { title: 'Express' });
   //
   // });
});


router.get('/testaa', function(req, res, next) {
  res.send('test page');
});




router.get('/api', function(req, res, next) {
  if(req.query.source === "wikitree"){
    // unset($_GET["source"]);
    res.send('Response send to client::'+req.query.source);
    // $data = json_decode(file_get_contents("https://api.wikitree.com/api.php?".http_build_query($_GET)));
    // echo json_encode($data);
  }
    // elseif($_GET["source"] == "geniPhotos"){
  //   unset($_GET["source"]);
//    echo "https://www.geni.com/api/profile-g".$_GET["profile"]."/photos";
//     echo  file_get_contents("https://www.geni.com/api/profile-g".$_GET["profile"]."/photos");
//    return;
//    $data = json_decode(file_get_contents("https://www.geni.com/api/profile-g".$_GET["profile"]."/photos"));
//    echo json_encode($data);
//   }
//   res.send('test page');
});


module.exports = router;
