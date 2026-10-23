## 1. Dev Build Script

- [ ] 1.1 Create `deploy/build_js_dev.sh` — esbuild bundle with `--sourcemap`, no `--minify`, output to `dist/dev-bundle.js`, `mkdir -p dist`, `--external` flags for jquery/sifter/microplugin, executable (`chmod +x`)
- [ ] 1.2 Add `scripts` section to `package.json` with `build:dev` and `build:prod` commands

## 2. UMD Global Fixes

- [ ] 2.1 Fix `src_js/third_party/jquery.shim.js` — import jQuery module and explicitly assign to `window.jQuery` and `window.$`
- [ ] 2.2 Fix `src_js/third_party/jquery.tablesorter.js` — change IIFE invocation from `})(jQuery)` to `})(window.jQuery)` on line 904
- [ ] 2.3 Fix `src_js/third_party/selectize.js` — remove CJS and AMD branches from UMD wrapper (lines 657-660), keeping only the browser global branch

## 3. Verification

- [ ] 3.1 Run `npm run build:dev` and confirm `dist/dev-bundle.js` and `dist/dev-bundle.js.map` are produced without errors
- [ ] 3.2 Run `npm run build:prod` and confirm `ermac.min.js` is produced without errors
- [ ] 3.3 Verify no "Dynamic require" or "jQuery not defined" errors appear in browser console when loading `example_dev.html`