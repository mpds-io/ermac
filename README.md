Ermac
==========

[![DOI](https://zenodo.org/badge/468932582.svg)](https://doi.org/10.5281/zenodo.7693197)

![MPDS free open-source GUI](https://raw.githubusercontent.com/mpds-io/ermac/master/ermac.png "MPDS free open-source GUI")

Ermac is an embeddable GUI of the [MPDS platform](https://mpds.io). It allows browsing the MPDS scientific data from any website or integrating the MPDS GUI into the existing codebases.

**Ermac is completely free software. Upon compilation it's just a few _static_ web assets. Copy these files to your web-server in a subfolder and enjoy your _own_ MPDS platform. The data stays at the MPDS server.**


## Usage

An arbitrary static web-server is required, e.g. `python -m http.server` or `php -S localhost:5555` or `npm i -g http-server && http-server` or whatever. All the content is static. In the **development mode**, the code is served from the `src_js` folder. In the **production mode**, the code in `src_js` should be compiled into a bundle `ermac.min.js`, which is then served. See `example_dev.html` and `example_prod.html` correspondingly.

```
git clone https://github.com/mpds-io/ermac
cd ermac
# then run your static web-server and open it in a web-browser
```


## Technical details

Ermac is just a thin browser client (with a little fat). From whatever physical location, it talks to the MPDS platform servers at the `api.mpds.io` domain. Beware, Ermac employs the old-style JQuery-fashioned ES5 JavaScript (see `src_js` folder). The `Node` and `npm` are intentionally **NOT** used. Several external dependencies are supplied simply along with the codebase in `third_party` and `src_js/third_party` folders. For future, we consider re-implementation of this codebase in the modular TypeScript framework. Please [contact us](mailto:hello@tilde.pro) if you'd like to know more or help.


## Compilation

Compilation into the production bundle `ermac.min.js` from `src_js` is done via the Google Closure Compiler supplied in `third_party/jscomp` folder, see `deploy/build_js.sh` script. For that you need a Java Runtime Environment (JRE), i.e. a command `java -version` should _not_ produce an error in your terminal. On a typical Unix, such as Debian, JRE is installed e.g. like this:

```
apt-get -y update && apt-get -y upgrade
apt-get install default-jre
java -version
```

Given your JRE works, compilation is done as follows:

```
bash deploy/build_js.sh
```

The resulted file `ermac.min.js` is to be included into your webpage (see `example_prod.html`). Alternatively, see [Ermac demo](https://ermac.absolidix.com) which is just a repository branch `gh-pages` compiled by GitHub action and served at the custom domain.


## License

MIT &copy; Evgeny Blokhin, Tilde Materials Informatics
