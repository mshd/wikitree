# wikitree
Tree structure of Wikidata entities

# Project Title

## Family Trees

This tool can show family trees of notable people, a tree of ancestors or descendants.

## Install NODEJS app

```console
git clone https://github.com/dataprick/wikitree
cd wikitree/
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000/)

## Browserify

Please use 
```console
npm install -g browserify
browserify main.js > public/js/bundle.js 
```
to build the javascript file

If you want to use the script server side, use parameter "&serverSide=1", this might make sense for debugging and testing

## Built With

* TreantJS


## Authors

* **M. Schibel** - *Main work* - [mshd](https://github.com/mshd)

## License

GNU General Public License v3.0
see LICENSE

## Acknowledgments

* Wikidata community
