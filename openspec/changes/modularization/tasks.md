## 1. Bundler Setup

- [x] 1.1 Install esbuild as a dev dependency (`npm install --save-dev esbuild`)
- [x] 1.2 Create `src_js/modules/` directory structure with subdirectories: `state/`, `search/`, `ui/`, `events/`, `router/`, `ptable/`, `entry/`
- [x] 1.3 Create third-party shim files in `src_js/third_party/` for jQuery, selectize, noUiSlider, wNumb, jquery.tablesorter, autocomplete, darkmode, optimade_mpds_nlp (each shim: import the vendored script and re-export the global)
- [x] 1.4 Update `deploy/build_js.sh` to invoke esbuild with the entry module as input, producing `ermac.min.js` as IIFE output (production: minified; dev: with source maps)
- [x] 1.5 Update `example_dev.html` to load the esbuild dev bundle output instead of injecting individual `<script>` tags

## 2. State Module

- [x] 2.1 Extract all constants and configuration from `wmsettings.js` into `src_js/modules/state/config.js`: facets, inquiries, multi_facets, simple_facets, facet_names, numerics, aets, elemental_names, collateral_links, editions, entries_messages, poly_limits, s_examples
- [ ] 2.2 Extract runtime-initialized values from `wmsettings.js` into `src_js/modules/state/endpoints.js`: gui_host, api_host, static_host, app_folder, and all `*_endpoint` URLs — computed during `init()` based on `window.location`
- [ ] 2.3 Extract mutable application state from `wmsettings.js` into `src_js/modules/state/app-state.js`: search, search_type, view_mode, active_ajax, quick_ajax, notify_counter, bid_history, mydata_history, oauths, sid, darkmode, unfinished_page, tooltip_counter, visavis_* flags
- [x] 2.4 Extract `assign_edition` function into `src_js/modules/state/edition.js` with exported `init()` that detects hostname and sets the active edition
- [x] 2.5 Create `src_js/modules/state/index.js` barrel file that re-exports all state modules
- [ ] 2.6 Verify state module has zero imports from other `src_js/modules/` modules

## 3. Utility Module (wmcore.js)

- [x] 3.1 Extract DOM/CSS helper functions from `wmcore.js` into `src_js/modules/ui/dom-utils.js`: clean, cancel_event, debounce, is_inview, show_preloader, hide_preloader, loadCSS, and domain subject data
- [ ] 3.2 Extract AJAX helper functions from `wmcore.js` into `src_js/modules/search/ajax-utils.js` (noted: AJAX calls are inline in other modules, so this remains a placeholder)
- [x] 3.3 Remove `Array.prototype.extend`, `String.prototype.startswith`, `Number.prototype.count_decimals` polyfills from `wmcore.js` into `src_js/modules/state/polyfills.js` (imported at entry for side effects)

## 4. Ptable Module

- [x] 4.1 Extract all `wmgui.ptable.*` properties and methods from `ptable.js` into `src_js/modules/ptable/ptable-core.js`: show, hide, activate, deactivate, element state, dtypes, query, visible, activated
- [x] 4.2 Extract `select_ptable_el`, `select_ptable_series`, `read_ptable_html`, and element click handlers from `ptable.js` into `src_js/modules/ptable/ptable-core.js` (combined with 4.1)
- [x] 4.3 Extract ptable AJAX/rendering functions (SVG fetching, distribution images) into `src_js/modules/ptable/ptable-core.js` (combined with 4.1)
- [x] 4.4 Create `src_js/modules/ptable/index.js` barrel file
- [ ] 4.5 Replace all `wmgui.ptable.*` accesses in other files with imports from the ptable module (uses bridge pattern — wmgui.ptable is set in ptable-core.js)

## 5. Router Module

- [x] 5.1 Extract `url_redraw_react` from `router.js` into `src_js/modules/router/dispatcher.js`
- [x] 5.2 Extract all `url__*` handler functions from `router.js` into `src_js/modules/router/dispatcher.js` — each handler delegates to search/UI/ptable modules via explicit imports
- [ ] 5.3 Extract hash change listener registration into `src_js/modules/router/init.js` (currently in events/register.js inline)
- [x] 5.4 Create `src_js/modules/router/index.js` barrel file
- [ ] 5.5 Replace all global `url__*` function references with imports from the router module (uses bridge pattern — set on window)

## 6. Search Module

- [x] 6.1 Extract `request_search` and related orchestration functions from `main_logic.js` into `src_js/modules/search/request.js`
- [x] 6.2 Extract `aug_search_cmd`, search query construction, and facet manipulation from `main_logic.js` into `src_js/modules/search/facets.js`
- [x] 6.3 Extract result rendering, pagination, quick-search, and data display functions from `main_logic.js` into `src_js/modules/search/display.js`: build_cells, build_thumbs, open_context, show_hints, launch_db_iframed, show_dunit_info
- [x] 6.4 Extract numeric search ranges and serialization from `sliders.js` into `src_js/modules/search/numeric.js` (get_sliders_ranges, serialize_numeric)
- [x] 6.5 Extract user login/access API functions from `main_logic.js` and `startup.js` into `src_js/modules/search/auth.js` (init_user_login, access check, factor authentication)
- [x] 6.6 Create `src_js/modules/search/index.js` barrel file
- [ ] 6.7 Replace all search-related `wmgui.*` and global function accesses with explicit imports from the search module (uses bridge pattern — functions set on both wmgui and window)

## 7. UI Module

- [x] 7.1 Extract `register_html` and all HTML template generation from `markup.js` into `src_js/modules/ui/markup.js`
- [x] 7.2 Extract `notify`, tooltip system (`show_tooltip`, tooltip data), and cliffhanger functions from `main_logic.js` into `src_js/modules/ui/notifications.js`
- [x] 7.3 Extract `switch_view_mode`, overlay management, and modal show/hide functions into `src_js/modules/ui/view-mode.js`
- [x] 7.4 Extract slider UI functions (`create_floating_slider`, `destroy_numericbox`) from `sliders.js` into `src_js/modules/search/numeric.js`
- [x] 7.5 Create `src_js/modules/ui/index.js` barrel file

## 8. Events Module

- [x] 8.1 Create `src_js/modules/events/` and split `events.js` handlers: search events (search trigger, selectize changes, facet clicks) into `search-events.js`
- [x] 8.2 Extract navigation events (hash changes, menu clicks, modal triggers, userbox) into `src_js/modules/events/nav-events.js`
- [x] 8.3 Extract ptable interaction events (element clicks, dtype radio changes) into `src_js/modules/events/ptable-events.js`
- [x] 8.4 Create `src_js/modules/events/register.js` with `register_events()` that imports and attaches all event handler groups
- [x] 8.5 Create `src_js/modules/events/index.js` barrel file

## 9. Startup and Entry Module

- [x] 9.1 Extract `satisfy_requirements` from `startup.js` into `src_js/modules/entry/main.js` — update all internal references to use explicit imports
- [x] 9.2 Create `src_js/modules/entry/main.js` as the application entry point: import and call init functions in order: state.init, register_html, satisfy_requirements, register_events, router.init
- [x] 9.3 Ensure the entry point is the sole input to esbuild bundling

## 10. Bridge Removal and Cleanup

- [ ] 10.1 Remove all temporary `window.wmgui = window.wmgui || {}` and bridge assignments from converted modules
- [ ] 10.2 Remove original monolithic files (`wmsettings.js`, `wmcore.js`, `router.js`, `events.js`, `markup.js`, `main_logic.js`, `startup.js`, `run.js`, `ptable.js`, `sliders.js`) — verify all code is migrated
- [ ] 10.3 Update `example_dev.html` to remove the script-tag loader entirely and reference only the esbuild bundle
- [ ] 10.4 Verify `example_prod.html` works with the new `ermac.min.js` bundle produced by esbuild
- [ ] 10.5 Update README.md to reflect the new module architecture and build process

## 11. Verification

- [x] 11.1 Run `bash deploy/build_js.sh` and verify `ermac.min.js` is produced without errors
- [ ] 11.2 Serve the dev build in a browser and verify: search field, periodic table, facet selection, result display, pagination, navigation routing, tooltips, modals, CIF player iframe, VisAVIS iframe
- [ ] 11.3 Serve the production build in a browser and verify the same features
- [ ] 11.4 Verify no `window.wmgui` references remain in `src_js/modules/` code (bridge pattern intentionally uses wmgui during transition)
- [ ] 11.5 Verify no circular dependencies between modules