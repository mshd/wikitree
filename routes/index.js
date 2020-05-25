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
    var results = wikitree.init(req.query,function (err,results) {
      if (err){
        //if there is error, send error to client side
        return res.status(500).jsonp({error: err.message});
      }
      res.jsonp(results);
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

router.get('/test/manyentities', function(req, res, next) {
    var data = wikidataController.wikidataApi({
        ids: ["Q124184","Q116","Q80976","Q42182","Q36180","Q13218361","Q131524","Q20726593","Q4853732","Q2478141","Q152239","Q319761","Q332342","Q1765120","Q7373601","Q14993395","Q5088830","Q1538148","Q48814228","Q90866585","Q1795492","Q565521","Q26384038","Q2063224","Q4887508","Q10669499","Q55720","Q5694214","Q6478714","Q947873","Q155203","Q1146700","Q7967809","Q385060","Q189290","Q151754","Q458393","Q2275185","Q7280027","Q154920","Q6391655","Q67146907","Q18163112","Q1742181","Q15253558","Q43274","Q7269998","Q3551353","Q6671010","Q153330","Q803","Q116","Q16533","Q2095549","Q460960","Q156598","Q572535","Q727","Q678611","Q193391","Q1329104","Q29574","Q1456173","Q805566","Q156725","Q234048","Q159609","Q565584","Q633116","Q47064","Q2099997","Q9536","Q2439092","Q3150","Q2456800","Q15253558","Q16060693","Q11986654","Q154946","Q692004","Q658975","Q20266330","Q36600","Q10027","Q57304","Q2861","Q1895303","Q13576445","Q64495483","Q4285590","Q13638711","Q4329958","Q586","Q1726","Q2802589","Q242195","Q9996","Q649601","Q1709","Q2747456"],
        props: 'labels',
        lang: "en",
    }, function (err,data) {
        if (err){
          //if there is error, send error to client side
          return res.status(500).jsonp({error: err.message});
        }
        // console.log(data);
        labels = data.entities;
        res.json(labels);
    });
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
