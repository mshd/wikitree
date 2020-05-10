const wbk = require('wikidata-sdk');
const fetch = require('node-fetch');

exports.wikidataApi = function(para, callback) {
    const url = wbk.getManyEntities({
        ids: para.ids,
        languages: para.lang || [ 'en', 'fr', 'de' ], // returns all languages if not specified
        props: para.props || [ 'labels', 'descriptions', 'claims', 'sitelinks/urls' ], // returns all data if not specified
        // format: 'xml', // defaults to json
        // redirections: false // defaults to true
    });
       console.log(url);
    // return url;
    fetch(url)
        // .then(response => console.log(response))
        .then(response => response.json())
        // .then(wbk.parse.wd.entities)
        .then(entities => {
            // console.log(entities);
            callback(entities);
            // return entities;
        });
};