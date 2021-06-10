Ermac
==========

Ermac is an embeddable GUI of the [MPDS platform](https://mpds.io). It allows browsing the MPDS scientific data from any webpage.

Currently it uses an old-style JQuery-based JavaScript ES5 predominantly (see `src_js` folder) and does not use Node. The only exception is `optimize-js` (experimental) installed with `npm install -g optimize-js` and used for creating the production bundle.

Several external dependencies are supplied along with the codebase just in `src_js` folder.


## Usage

An arbitrary web-server is required, e.g. `php -S localhost:5555` or Node.

See `example_dev.html` and `example_prod.html`.

Compilation into the production bundle `ermac.min.js` is done via the Google Closure Compiler supplied in `third_party/jscomp` folder, see `deploy/build_js.sh` script.


## License

[MIT](https://en.wikipedia.org/wiki/MIT_License)