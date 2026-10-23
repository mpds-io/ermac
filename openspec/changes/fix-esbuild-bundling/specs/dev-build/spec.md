## ADDED Requirements

### Requirement: Dev build script with sourcemaps
The project SHALL provide a dev build script at `deploy/build_js_dev.sh` that bundles `src_js/modules/entry/main.js` using esbuild with `--sourcemap` enabled and without `--minify`, outputting to `dist/dev-bundle.js`. The `dist/` directory SHALL be created automatically if absent.

#### Scenario: Running the dev build
- **WHEN** `npm run build:dev` is executed
- **THEN** esbuild produces `dist/dev-bundle.js` (unminified IIFE) and `dist/dev-bundle.js.map` (sourcemap)

#### Scenario: Sourcemap availability in browser
- **WHEN** `example_dev.html` is loaded in a browser with devtools open
- **THEN** original source files are mapped via the sourcemap and breakpoints can be set on them

### Requirement: npm build scripts
`package.json` SHALL define `scripts.build:dev` pointing to `bash deploy/build_js_dev.sh` and `scripts.build:prod` pointing to `bash deploy/build_js.sh`.

#### Scenario: npm run build:dev
- **WHEN** a developer runs `npm run build:dev`
- **THEN** the dev build script executes and produces `dist/dev-bundle.js`

#### Scenario: npm run build:prod
- **WHEN** a developer runs `npm run build:prod`
- **THEN** the production build script executes and produces `ermac.min.js`

### Requirement: UMD plugin globals resolution
Third-party jQuery plugins bundled via shims SHALL resolve their jQuery dependency from `window.jQuery` rather than from CommonJS `require()` calls. The `jquery.shim.js` SHALL import the jQuery module and explicitly assign it to `window.jQuery` and `window.$` before any plugin code executes.

#### Scenario: jQuery available as global in bundled output
- **WHEN** the bundle is loaded in a browser
- **THEN** `window.jQuery` and `window.$` are defined and point to the bundled jQuery instance

#### Scenario: Tablesorter resolves jQuery
- **WHEN** `jquery.tablesorter.js` IIFE executes inside the bundle
- **THEN** it receives `window.jQuery` as its `$` parameter and initializes correctly

### Requirement: Selectize browser-global UMD path
`selectize.js` SHALL use the browser global branch of its UMD wrapper exclusively, receiving dependencies via `root.jQuery`, `root.Sifter`, and `root.MicroPlugin`. The CommonJS and AMD branches SHALL be removed to prevent `require('jquery')` / `require('sifter')` / `require('microplugin')` calls from executing inside esbuild's `__commonJS` wrapper.

#### Scenario: Selectize initializes in bundle
- **WHEN** the bundle is loaded in a browser
- **THEN** selectize obtains jQuery, Sifter, and MicroPlugin from `window` globals and attaches `Selectize` to `window`

#### Scenario: No dynamic require errors
- **WHEN** `example_dev.html` or `example_prod.html` is loaded in a browser
- **THEN** no "Dynamic require of jquery is not supported" or similar errors appear in the console