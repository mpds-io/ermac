## ADDED Requirements

### Requirement: esbuild bundler integration
The project SHALL use esbuild as the bundler for both development and production builds, replacing the Google Closure Compiler pipeline and the `<script>` tag loader.

#### Scenario: Development build
- **WHEN** a developer runs the development build command
- **THEN** esbuild bundles all `src_js/modules/` application code and `src_js/third_party/` vendor shims into a single output that can be served by any static web server
- **THEN** the output includes source maps for debugging

#### Scenario: Production build
- **WHEN** a developer runs the production build command
- **THEN** esbuild produces a minified IIFE bundle at `ermac.min.js` with no source maps
- **THEN** the bundle is functionally equivalent to the previous Closure Compiler output

#### Scenario: Build script replacement
- **WHEN** `deploy/build_js.sh` is executed
- **THEN** it invokes esbuild instead of the Google Closure Compiler
- **THEN** the output file `ermac.min.js` is produced in the project root

### Requirement: ES module syntax in application source files
All application source files under `src_js/modules/` SHALL use ES module syntax (`import`/`export`) instead of global namespace mutation.

#### Scenario: Module exports
- **WHEN** a function or constant is needed by another module
- **THEN** it SHALL be exported using a named `export` statement

#### Scenario: Module imports
- **WHEN** a module needs a function or constant from another module
- **THEN** it SHALL use an `import` statement with the relative path to the source module

#### Scenario: No global namespace mutation in application code
- **WHEN** application source code is written under `src_js/modules/`
- **THEN** it SHALL NOT assign properties to `window.wmgui` or any other global object (except during the temporary bridge period)

### Requirement: Third-party library shims
Each vendored third-party library SHALL be consumable via ES module `import` through a thin shim file that re-exports the library's global.

#### Scenario: jQuery import
- **WHEN** application code needs jQuery
- **THEN** it SHALL `import { $ } from '../third_party/jquery.shim.js'` (or equivalent path)
- **THEN** the shim SHALL export the jQuery global created by the vendored `jquery.min.js`

#### Scenario: selectize import
- **WHEN** application code needs the selectize plugin
- **THEN** the shim SHALL ensure jQuery is loaded first and export the selectize constructor

### Requirement: Entry point module
The application SHALL have a single entry point module that imports and initializes all application modules.

#### Scenario: Application startup
- **WHEN** the bundled script is loaded in a browser
- **THEN** the entry point SHALL import and call initialization functions in the correct order: state setup, HTML registration, startup/requirements, event registration, and routing

#### Scenario: example_dev.html update
- **WHEN** `example_dev.html` is loaded in development mode
- **THEN** it SHALL load the esbuild-bundled output instead of injecting individual `<script>` tags

### Requirement: Module directory structure
Application modules SHALL be organized under `src_js/modules/` with subdirectories grouping related files by domain.

#### Scenario: Module file location
- **WHEN** a new module is created for the search domain
- **THEN** it SHALL be placed at `src_js/modules/search/` with a descriptive filename

#### Scenario: Third-party library separation
- **WHEN** third-party libraries are referenced
- **THEN** they SHALL remain in `src_js/third_party/` unchanged; only shim files MAY be added alongside them