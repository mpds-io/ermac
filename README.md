Ermac
==========

Ermac is an embeddable GUI of the [MPDS platform](https://mpds.io). It allows browsing the MPDS scientific data from any website or integrating the MPDS GUI into the existing codebases.


**WARNING!** Currently Ermac is based on the old-style JQuery-based ES5 JavaScript (see `src_js` folder). The Nodejs is **NOT** used except the only `optimize-js` module installed with `npm i -g optimize-js` and invoked while creating the production bundle. Several external dependencies are supplied along with the codebase simply in `src_js/third_party` folder. We are now considering re-implementation of the codebase in the modular TypeScript framework. Please [contact us](mailto:hello@tilde.pro) if you'd like to know more or help.


## Usage

An arbitrary web-server is required, e.g. `npm i -g http-server && http-server` or `python -m SimpleHTTPServer` or `php -S localhost:5555` or whatever. All the content is static. In the **development mode**, the code is served from the `src_js` folder. In the **production mode**, the code bundle `ermac.min.js` is served. See `example_dev.html` and `example_prod.html` correspondingly.


## Compilation

Compilation into the production bundle `ermac.min.js` is done via the Google Closure Compiler supplied in `third_party/jscomp` folder, see `deploy/build_js.sh` script.

```
apt-get -y update && apt-get -y upgrade
apt-get install default-jre
git clone https://bitbucket.org/tilde-mi/ermac
cd ermac
npm i -g optimize-js
bash deploy/build_js.sh
```


## License

MIT &copy; Evgeny Blokhin, Tilde Materials Informatics

