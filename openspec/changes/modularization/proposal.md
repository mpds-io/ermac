## Why

The Ermac codebase is a monolithic ES5 jQuery application where ~6,300 lines across 10 files share a single global namespace (`window.wmgui`) with no module boundaries. Functions are implicitly coupled through shared mutable state and implicit load-order dependencies. This makes the code difficult to test, reason about, or extend — any change risks unintended side effects across the entire codebase. Modularization is needed now because the project is considering a future re-implementation in a modular TypeScript framework, and establishing clear module boundaries first will make that transition incremental rather than disruptive.

## What Changes

- Introduce ES module (`import`/`export`) syntax across all `src_js/` source files
- Split monolithic files (`main_logic.js` at 1,635 lines, `events.js` at 1,571 lines, `markup.js` at 877 lines) into focused modules with single responsibilities
- Replace the shared `window.wmgui` global namespace with explicit module exports and imports
- Replace the script-tag loader in `example_dev.html` with a bundler (esbuild) that resolves ES module imports
- Update `deploy/build_js.sh` to use the bundler for both dev and production builds
- Remove implicit load-order dependencies — modules will declare their dependencies explicitly via `import`

## Capabilities

### New Capabilities
- `module-system`: ES module architecture for the codebase — import/export syntax, bundler integration (esbuild), and the mapping of old global-based files to new module files
- `search-module`: Extract search-related logic (request_search, aug_search_cmd, search state management) from main_logic.js and wmsettings.js into a dedicated search module
- `ui-module`: Extract UI rendering and DOM manipulation (register_html, markup generation, notify, tooltips) from markup.js and main_logic.js into a dedicated UI module
- `events-module`: Extract DOM event registration (register_events) and event handlers from events.js into a dedicated events module with explicit imports from other modules
- `router-module`: Extract hash-based routing (url__* functions, url_redraw_react) from router.js into a dedicated router module with clean dependencies
- `ptable-module`: Extract periodic table widget logic from ptable.js into a self-contained periodic table module
- `state-module`: Extract shared application state (wmgui.search, facets, endpoints, editions, settings) from wmsettings.js into a centralized state module with explicit exports

### Modified Capabilities

## Impact

- All `src_js/*.js` files will be rewritten to use ES module syntax
- `example_dev.html` will switch from script-tag injection to a bundled dev server
- `deploy/build_js.sh` will be updated to use esbuild bundler
- `webassets/cifplayer.js` and `webassets/visavis.js` are iframe-based sub-apps and will remain unchanged
- `third_party/` vendored libraries remain unchanged (consumed as-is by the bundler)
- No API changes — the MPDS API integration remains the same
- No visual/behavioral changes — this is purely a structural refactor