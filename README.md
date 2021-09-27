Ermac
==========

Ermac is an embeddable GUI of the [MPDS platform](https://mpds.io). It allows browsing the MPDS scientific data from any website.

Currently it predominantly uses an old-style JQuery-based ES5 JavaScript (see `src_js` folder). The Node is NOT used except the `optimize-js` module (experimental) installed with `npm install -g optimize-js` and used while creating the production bundle.

Several external dependencies are supplied along with the codebase simply in `src_js` folder.


## Usage

An arbitrary web-server is required, e.g. `php -S localhost:5555`. All the content is static. In the **development mode**, the code is served from the `src_js` folder. In the **production mode**, the code bundle `ermac.min.js`  is served. See `example_dev.html` and `example_prod.html`.


## Compilation

Compilation into the production bundle `ermac.min.js` is done via the Google Closure Compiler supplied in `third_party/jscomp` folder, see `deploy/build_js.sh` script.

```
apt-get -y update && apt-get -y upgrade
apt-get install default-jre
git clone https://bitbucket.org/tilde-mi/ermac
cd ermac
npm install -g optimize-js
bash deploy/build_js.sh
```


## License

MIT &copy; Evgeny Blokhin, Tilde Materials Informatics

