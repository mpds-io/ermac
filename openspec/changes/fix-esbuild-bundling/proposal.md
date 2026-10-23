## Why

The project had no dev build script, and the production build (`deploy/build_js.sh`) produced broken bundles due to UMD module conflicts when processed by esbuild. jQuery plugins (tablesorter, selectize) use UMD wrappers that detect esbuild's CommonJS shim and route through `require('jquery')` etc., which either become unresolved dynamic requires (with `--external`) or fail to resolve (without `--external`). Additionally, `dist/dev-bundle.js` referenced by `example_dev.html` was never generated because no dev build script existed.

## What Changes

- Added `deploy/build_js_dev.sh` — dev build script using esbuild with `--sourcemap` and no `--minify`, outputting to `dist/dev-bundle.js`
- Added `scripts` section to `package.json` with `build:dev` and `build:prod` commands
- Fixed `jquery.shim.js` — explicitly assigns the imported jQuery module to `window.jQuery`/`window.$` so downstream UMD plugins can find it as a global
- Fixed `jquery.tablesorter.js` — changed IIFE invocation from `})(jQuery)` to `})(window.jQuery)` so it resolves jQuery from the global scope instead of the CJS module scope
- Fixed `selectize.js` — removed the CommonJS branch (`else if (typeof exports === 'object')`) from its UMD wrapper, forcing it to use the browser global branch (`root.jQuery`, `root.Sifter`, `root.MicroPlugin`)

## Capabilities

### New Capabilities
- `dev-build`: Dev build pipeline using esbuild with sourcemaps, outputting an unminified bundle for browser debugging

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- `deploy/build_js_dev.sh` (new file)
- `deploy/build_js.sh` (unchanged — prod build still uses `--external` flags which work because selectize's CJS branch is removed)
- `package.json` (added `scripts` section)
- `src_js/third_party/jquery.shim.js` (modified)
- `src_js/third_party/jquery.tablesorter.js` (modified — line 904)
- `src_js/third_party/selectize.js` (modified — removed CJS/AMD branch from UMD wrapper)