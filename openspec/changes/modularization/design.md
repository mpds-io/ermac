## Context

Ermac is an embeddable GUI for the MPDS materials science platform. The ~6,300-line JavaScript codebase in `src_js/` is structured as loosely ordered ES5/ES6 scripts that all mutate a shared `window.wmgui` global object. Files are loaded via sequential `<script>` tags in `example_dev.html` and concatenated by the Google Closure Compiler in `deploy/build_js.sh`. There are no modules, no imports, and no test suite. The README explicitly notes that a future modular TypeScript re-implementation is being considered.

Current file structure and responsibilities:
- `wmsettings.js` (364 lines): Global state, constants, API endpoints, edition configs, facet definitions
- `wmcore.js` (434 lines): Utility functions, DOM helpers, AJAX wrappers
- `sliders.js` (102 lines): noUiSlider numeric range UI
- `ptable.js` (520 lines): Interactive periodic table widget
- `router.js` (431 lines): Hash-based routing with `url__*` handler functions
- `events.js` (1,571 lines): All DOM event listeners and handlers
- `markup.js` (877 lines): Full HTML generation injected into `<body>`
- `main_logic.js` (1,635 lines): Core search logic, display/render, notify
- `startup.js` (386 lines): App initialization, selectize wiring
- `run.js` (14 lines): Entry point calling init functions

## Goals / Non-Goals

**Goals:**
- Introduce ES module syntax (`import`/`export`) across all `src_js/` application files
- Replace the global `window.wmgui` namespace with explicit module imports and exports
- Split the three largest files (`main_logic.js`, `events.js`, `markup.js`) into focused, single-responsibility modules
- Replace the script-tag loader and Closure Compiler pipeline with esbuild for both development and production builds
- Maintain 100% behavioral parity — no visual or functional changes
- Preserve the existing vendored third-party libraries as-is, consumed by the bundler

**Non-Goals:**
- TypeScript conversion (future consideration, not this change)
- Rewriting or updating `webassets/cifplayer.js`, `webassets/visavis.js`, or any iframe sub-apps
- Changing any MPDS API integration or endpoint URLs
- Adding automated tests (though modularization enables this for future work)
- Refactoring the data model or state management patterns beyond extracting to modules
- Updating third-party library versions or replacing vendored libraries with npm packages

## Decisions

### 1. Use esbuild as the bundler

**Choice**: esbuild
**Alternatives considered**: Rollup, Webpack, Vite, Google Closure Compiler (current)
**Rationale**: esbuild is zero-config for this use case, extremely fast, supports ES module input natively, and produces a single IIFE bundle matching the current `ermac.min.js` output. It requires no Node.js project transformation — just a single `esbuild` call in the build script. Rollup and Webpack require more configuration for equivalent output. Vite introduces a dev server paradigm that doesn't match the simple static-file-serving model. The Closure Compiler does not support ES module input.

### 2. Module file organization under `src_js/modules/`

**Choice**: Create `src_js/modules/` with subdirectories per module; keep `src_js/third_party/` untouched
**Alternatives considered**: Flat flat file structure in `src_js/`, separate `src/` directory at project root
**Rationale**: A `modules/` subdirectory cleanly separates refactored code from the vendored third-party files that must remain unchanged for the bundler. Subdirectories per module group related files. A separate `src/` at root would break the existing `deploy/build_js.sh` path conventions. Flat structure would create too many files in one directory.

### 3. Single shared state module

**Choice**: One `state` module that exports all previously-global `wmgui` properties as named exports
**Alternatives considered**: Distributed state (each module owns its slice), a state management library, class-based state object
**Rationale**: The current codebase treats `wmgui` as a mutable shared object with cross-cutting access from every file. Creating a single state module with named exports preserves the existing data flow while making dependencies explicit. Distributed state would require refactoring every access site simultaneously — too risky for a zero-behavioral-change migration. A state management library or class-based approach adds unnecessary abstraction for this stage.

### 4. Gradual migration: global→module bridge during transition

**Choice**: During migration, each refactored module will both export its API and (temporarily) assign back to `window.wmgui` so that unmigrated code continues to work
**Alternatives considered**: Big-bang rewrite of all files at once
**Rationale**: A progressive migration allows each module to be converted and tested independently. The `window.wmgui` bridge ensures that partially-migrated states still function. Once all files are converted, the bridge assignments are removed. A big-bang approach risks an untestable intermediate state where nothing works until everything is done.

### 5. Third-party library consumption strategy

**Choice**: Wrap each vendored library in a thin shim that `export`s the global it creates, allowing ES module `import` by application code
**Alternatives considered**: Install via npm, leave as `<script>` tags loaded separately
**Rationale**: Vendored libraries define globals (e.g., `jQuery`, `noUiSlider`, `selectize`). esbuild can consume them directly as external globals, but wrapping in shims gives clean `import` statements in application code. npm installation is out of scope (non-goal). Separate `<script>` tags would undermine the single-bundle goal.

### 6. Production output format: IIFE bundle

**Choice**: esbuild outputs a single IIFE bundle as `ermac.min.js`, matching the current production artifact
**Alternatives considered**: ESM output, multiple chunks
**Rationale**: The existing `example_prod.html` includes a single `<script src="ermac.min.js">`. IIFE ensures the bundle works in any browser context without module support. Multiple chunks would require import map or module script tags — unnecessary complexity for a single-page app embedding a single script.

## Risks / Trade-offs

- **[Implicit coupling in global state mutation]** → The `state` module exports mutable objects; any module can still mutate them. This preserves current behavior but doesn't enforce immutability. Mitigation: the explicit imports make coupling visible; future work can add immutability.

- **[Large files split into many smaller modules increases file count]** → Going from 10 files to ~20+ modules increases navigation cost. Mitigation: subdirectory grouping by domain keeps related modules discoverable.

- **[Third-party shim maintenance]** → Each vendored library shim is one more file to maintain. Mitigation: shims are trivial (1-3 lines each) and stable; they can be replaced by npm packages in the future.

- **[Bridge period complexity]** → The temporary `window.wmgui` bridge means two patterns coexist. Mitigation: the bridge is removed in a single final cleanup step; ESLint or a custom check can flag any remaining bridge assignments.

- **[No automated tests to verify behavioral parity]** → Without tests, the only verification is manual browser testing. Mitigation: migrate one module at a time and manually test after each; esbuild's bundling is deterministic and reproducible.

- **[esbuild adds a Node.js dev dependency]** → Currently the project intentionally avoids Node.js/npm for app dependencies. Mitigation: esbuild is a build-only tool (not a runtime dependency); JRE was already required for the Closure Compiler. The `package.json` already exists with dev-tool dependencies.