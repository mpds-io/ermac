Ermac
==========

Ermac is an embeddable GUI of the [MPDS platform](https://mpds.io). It allows browsing the MPDS scientific data from any website or integrating the MPDS GUI into the existing codebases.


**WARNING!** Currently Ermac is based on the old-style JQuery-fashioned ES5 JavaScript (see `src_js` folder). The `Node` or `npm` is intentionally **NOT** used. Several external dependencies are supplied simply along with the codebase in `third_party` and `src_js/third_party` folders. For future, we might consider re-implementation of the codebase in the modular TypeScript framework. Please [contact us](mailto:hello@tilde.pro) if you'd like to know more or help.


## Usage

An arbitrary static web-server is required, e.g. `python -m SimpleHTTPServer` or `php -S localhost:5555` or `npm i -g http-server && http-server` or whatever. All the content is static. In the **development mode**, the code is served from the `src_js` folder. In the **production mode**, the code bundle `ermac.min.js` is served. See `example_dev.html` and `example_prod.html` correspondingly.

```
git clone https://bitbucket.org/tilde-mi/ermac
cd ermac
# then run your static web-server and open example in a web-browser
```


## Compilation

Compilation into the production bundle `ermac.min.js` from `src_js` is done via the Google Closure Compiler supplied in `third_party/jscomp` folder, see `deploy/build_js.sh` script. For that you need a Java Runtime Environment (JRE), i.e. `java -version` should not produce an error in your terminal. On a typical Unix, such as Debian, JRE is installed like this:

```
apt-get -y update && apt-get -y upgrade
apt-get install default-jre
java -version
```

Given your JRE works, compilation is done as follows:

```
bash deploy/build_js.sh
```

The resulted file `ermac.min.js` is to be included into your webpage (e.g. `example_prod.html`).


## License

MIT &copy; Evgeny Blokhin, Tilde Materials Informatics
