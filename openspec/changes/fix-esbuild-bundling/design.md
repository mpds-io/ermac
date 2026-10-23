## Context

The project uses esbuild to bundle JavaScript from `src_js/modules/entry/main.js` into a single IIFE bundle. Two entry points exist: `example_prod.html` (loads `ermac.min.js`) and `example_dev.html` (loads `dist/dev-bundle.js`). The dev build script was missing entirely.

The core problem: third-party libraries (`jquery.tablesorter.js`, `selectize.js`) use UMD wrappers that detect esbuild's CommonJS module shim at runtime. When esbuild wraps these files in `__commonJS()`, the UMD's `typeof exports === 'object'` check passes, causing execution of `require('jquery')`, `require('sifter')`, `require('microplugin')` — bare module specifiers that can't be resolved in the browser. The existing `--external` flags suppress the build error but produce runtime failures ("Dynamic require of jquery is not supported").

Separately, `jquery.min.js` uses a UMD pattern where `module.exports` is assigned instead of `window.jQuery` when a CJS environment is detected, so downstream plugins that reference `jQuery` as a global fail.

## Goals / Non-Goals

**Goals:**
- Enable a working dev build with sourcemaps for browser debugging
- Fix UMD/CJS conflicts so all jQuery plugins resolve their dependencies correctly in the bundled output
- Maintain the existing production build path unchanged in behavior
- Keep `--external:jquery`, `--external:sifter`, `--external:microplugin` flags to suppress any remaining bare `require()` calls from AMD branches

**Non-Goals:**
- Replacing esbuild with another bundler
- Converting third-party libraries to proper ES modules (they are vendored, not ours to refactor)
- Adding HMR or watch mode to the dev build

## Decisions

1. **Create separate dev build script (`deploy/build_js_dev.sh`)** — Mirrors prod script but omits `--minify` and adds `--sourcemap`. Output goes to `dist/dev-bundle.js` matching the path in `example_dev.html`. `mkdir -p dist` ensures the directory exists.

2. **Fix `jquery.shim.js` to assign jQuery to `window`** — After importing `jquery.min.js` as a module, explicitly assign `window.jQuery` and `window.$`. This bridges the gap between esbuild's CJS wrapper (which captures jQuery into `module.exports`) and downstream插件 that expect `jQuery` as a global.

3. **Fix `jquery.tablesorter.js` IIFE invocation** — Changed `})(jQuery)` to `})(window.jQuery)`. Inside esbuild's `__commonJS` wrapper, the bare `jQuery` identifier is undefined; `window.jQuery` is set by the shim before tablesorter runs.

4. **Remove CJS/AMD branches from `selectize.js` UMD wrapper** — Removed the `else if (typeof exports === 'object')` and `if (typeof define === 'function' && define.amd)` branches, leaving only the browser global branch: `root.Selectize = factory(root.jQuery, root.Sifter, root.MicroPlugin)`. This prevents esbuild from hitting the `require('jquery')` / `require('sifter')` / `require('microplugin')` calls. The globals are available because `jquery.shim.js`, `selectize.js`'s own Sifter definition, and the MicroPlugin mixin are all bundled before selectize's factory executes.

5. **Keep `--external` flags** — Even with the CJS branch removed, the AMD branch references bare `'jquery'`, `'sifter'`, `'microplugin'` specifiers. `--external` ensures esbuild doesn't try to resolve these (which would fail since they aren't npm packages). At runtime the AMD branch is dead code since `define` is not defined in the IIFE bundle.

## Risks / Trade-offs

- **[Vendored third-party code modified]** → The edits to `jquery.tablesorter.js` and `selectize.js` modify vendored files. If these are ever updated from upstream, the UMD wrapper changes must be re-applied. Mitigation: the changes are minimal and well-documented in this openspec change.
- **[Global namespace reliance]** → The fixes rely on `window.jQuery`, `window.Sifter`, `window.MicroPlugin` being set before selectize's factory runs. This is guaranteed by the import order in `main.js` and the shim chain, but it's implicit. Mitigation: the entry point's import order is stable and the shims explicitly set these globals.
- **[esbuild CJS wrapping is implementation-specific]** → If esbuild changes how it wraps UMD modules in future versions, these workarounds may need adjustment. Mitigation: pin esbuild version in `devDependencies` (currently `^0.28.0`).