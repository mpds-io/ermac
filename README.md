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

**NB local development.** When served from a "localhost" origin, the GUI switches to development mode and expects the MPDS API at `http://localhost:7070` (see `src_js/core/settings.js`). There is no local backend in this repository — the data stays at the MPDS server — so run the bundled reverse proxy to the real API in a second terminal:

```
python3 deploy/dev_api_proxy.py     # 127.0.0.1:7070 -> https://api.mpds.io/v0
```

Without it, the client data request fails and the GUI won't finish initializing (`Failed to load GUI`). Alternatively, serve the GUI from any non-"localhost" origin (e.g. `http://127.0.0.1:5555` or a LAN address): the GUI then talks to `https://api.mpds.io/v0` directly, no proxy needed.


## Technical details

Ermac is just a thin browser client (with a little fat). From whatever physical location, it talks to the MPDS platform servers at the `api.mpds.io` domain. Ermac is written in modular **pure vanilla JavaScript (ES modules)**, without any framework. The `Node` and `npm` are intentionally **NOT** used. The few remaining external dependencies are supplied simply along with the codebase in `src_js/third_party` (noUiSlider, wNumb, the MPDS NLP parser, and darkmode.js — all framework-free), with the jQuery era of this codebase being over. Please [contact us](mailto:hello@tilde.pro) if you'd like to know more or help.


## Compilation

Compilation into the production bundle `ermac.min.js` from the ES modules in `src_js` is done via the dependency-aware script `deploy/build_js.py`, which requires only a Python 3 interpreter (still no Node). It concatenates the vendored libraries and the application modules in topological order, stripping the `import`/`export` statements:

```
python3 deploy/build_js.py
```

The resulted file `ermac.min.js` is to be included into your webpage (see `example_prod.html`). Alternatively, see [Ermac demo](https://mpds-io.github.io/ermac) which is just a repository branch `gh-pages` compiled by GitHub action.


## Code architecture

The entire app lives in the global state object `window.wmgui` (kept for embeddability) while being structured as ES modules with explicit dependencies. In the **development mode**, the code is served directly from the `src_js/app/run.js` ES module entry (see `example_dev.html`). In the **production mode**, the code is compiled into a single static bundle `ermac.min.js` (see `example_prod.html`).

**Module map** (entry: `src_js/app/run.js`):

| Module | Role |
|---|---|
| `core/dom.js` | Vanilla DOM helpers (`$`, `$$`, show/hide, delegated events, offsets) |
| `core/ajax.js` | Abortable promise-based XHR wrapper, URL serialization (`param`), `is_empty` |
| `core/settings.js` | All global state (`window.wmgui`), constants, API endpoint URLs, edition configs |
| `core/utils.js` | Base-type extensions, `wmgui.clean`, `loadCSS`, domain data, interpretation HTML, random query generators |
| `core/a11y.js` | Keyboard accessibility: a declarative registry giving the clickable `div`/`span`/`li` controls roles, labels, states and Tab stops, Enter/Space activation, arrow keys in grouped widgets, focus management of dialogs (`wmgui.open_dialog()` / `wmgui.release_dialog()`) |
| `components/multiselect.js` | Vanilla multi-select input (replaces selectize.js, same CSS classes) |
| `components/tablesort.js` | Vanilla table sorting (replaces jquery.tablesorter, same CSS classes) |
| `components/autocomplete.js` | Simple autocompletion (converted from the vendored spin-off) |
| `components/sliders.js` | Numeric range slider UI (noUiSlider-based) |
| `app/ptable.js` | Interactive periodic table widget |
| `app/router.js` | Hash-based routing — an explicit registry of `url__<route>()` handlers for `#search/`, `#inquiry/`, `#phase/`, `#polyhedra/`, etc. |
| `app/events.js` | DOM event listeners and `register_events()` |
| `app/markup.js` | HTML generation and `register_html()` (injects the full UI into `<body>`) |
| `app/search.js` | Core search logic: `request_search()`, display/render functions, `wmgui.notify()`, `wmgui.aug_search_cmd()`, user session |
| `app/startup.js` | `satisfy_requirements()` — initializes multiselects, loads client data, wires autocomplete, triggers initial route |
| `app/run.js` | Entry point — calls `assign_edition()`, `register_html()`, `satisfy_requirements()`, `register_events()` and `install_a11y()` |

**Key concepts:**

- `wmgui.search` — the live search state object, synced with URL hash parameters
- `wmgui.search_type` — `0` = entries, `1` = phases, `2` = articles
- `wmgui.facets` — the 15 search categories (formulae, props, elements, classes, lattices, sgs, protos, authors, years, codens, doi, aeatoms, aetypes, geos, orgs)
- `wmdata` — client-side data (properties list, journal CODENs, property hierarchy) fetched at startup from `wmgui.wmdata_endpoint`
- `wmgui.editions` — multi-tenant config keyed by edition ID (0 = MPDS, 1 = ASM, 10/15/16 = Ermac variants); the active edition is detected from the current hostname
- Accessibility — every control is reachable and operable with the keyboard (Tab, Enter/Space, arrow keys in the periodic table, the results, the tabs and the VIEW switches; ESC closes panels), dialogs keep the focus inside and return it on close, and the layout stays usable at 200% zoom. A host page that adds its own dialog can use `wmgui.open_dialog(box, initial_selector)` / `wmgui.release_dialog()`

**Embedded sub-apps** (loaded in iframes):

- `webassets/iframe_cifplayer.html` → `webassets/cifplayer.js` — crystal structure 3D viewer
- `webassets/iframe_visavis.html` → `webassets/visavis.js` — data visualisation engine
- `labs/pd3d/` — 3D phase diagram viewer (Three.js-based)
- `labs/view-phonons/` — phonon visualiser

**Third-party libraries** (all framework-free, vendored in `src_js/third_party/`):

- noUiSlider, wNumb, darkmode.js
- `optimade_mpds_nlp.js` — NLP parser that converts free-text queries to structured facet objects

### Parity tests

The `parity/` suite checks that the GUI behaves exactly like the deployed version at [mpds-io.github.io/ermac](https://mpds-io.github.io/ermac): every scenario (a route, optional clicks and keystrokes, and the observations to compare) runs against the old and the new bundle in a headless browser, comparing API requests, DOM state, focus, JS errors and screenshots. Scenarios are declared in `parity/scenarios.json` (a list of scenario objects; defaults and fixtures in `parity/config.json`); see [`parity/README.md`](parity/README.md) for running them and adding new ones.

```
# NB one interpreter throughout: install with the python3 that runs the suite
python3 -m pip install playwright==1.50.0 pillow && python3 -m playwright install chromium
python3 parity/run_parity.py
```

Contributors and coding agents: see [`AGENTS.md`](AGENTS.md) for the compatibility contracts and pitfalls of changing this codebase.


## License

MIT &copy; Evgeny Blokhin, Tilde Materials Informatics
