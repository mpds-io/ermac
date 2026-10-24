# AGENTS.md

Guidance for coding agents working on Ermac. The README explains what Ermac is
and how to serve it; this file is about **changing it without breaking users**.
Ermac is embedded in third-party sites and its URLs are shared in papers and
emails, so "it still works on my page" is not the bar: the bar is **parity
with the deployed version**, checked by `parity/`.

## Rules that are easy to break

1. **No Node, npm, Java or any new toolchain.** Python 3 stdlib only for build
   and tooling; Playwright and Pillow are allowed for `parity/` only. Do not add
   `package.json`, lockfiles, transpilers or minifiers (they are gitignored on
   purpose).
2. **No new runtime dependencies.** Vendored, framework-free libraries in
   `src_js/third_party/` only; jQuery and its plugins were removed and must
   stay out.
3. **`window.wmgui` is a public API.** Host pages read and call it
   (`wmgui.search`, `wmgui.notify`, `wmgui.aug_search_cmd`, endpoints, ...).
   Do not rename or remove its members; add new ones only deliberately.
4. **Hash routes are public URLs.** `#search/...`, `#inquiry/...`,
   `#phase_id/...`, `#entry/...` etc. live in bookmarks and publications. Never
   change their syntax or parameter encoding; only add routes.
5. **Never edit `ermac.min.js`.** It is a build product
   (`python3 deploy/build_js.py`), gitignored, and deployed by CI from `master`.
6. **Do not "fix" a parity failure by editing its scenario.** The OLD deployed
   bundle is the specification. Change a scenario only for an *intentional*,
   maintainer-approved behavior change, and say why: `xfail = "<reason>"`
   plus a `[scenario.expect_new]` table pinning the new behavior (an xfail
   scenario without it would pass whatever the new code does), or `ignore`
   for a layer that is irrelevant to the scenario.

## Where a change goes

| you want to... | edit | also |
|---|---|---|
| add or change a route | `src_js/app/router.js` (`url__<name>` + the `routes` registry) | add a route scenario |
| add an API call | endpoint URL in `src_js/core/settings.js` (`wmgui.<x>_endpoint`), call via `ajax()` from `core/ajax.js` | check the request encoding (see below) |
| change rendered HTML | `src_js/app/markup.js` (static shell) or the render functions in `src_js/app/search.js` | ids/classes are CSS and embedding contracts |
| change a click/key behavior | `src_js/app/events.js` (`register_events()`) | add a narrow interaction scenario |
| change search-box behavior | `src_js/components/multiselect.js` (selectize stand-in) | `parity --tag multiselect` |
| change table sorting | `src_js/components/tablesort.js` (tablesorter stand-in) | `parity --tag sort` |
| change styling | `webassets/ermac.css` | pixels layer; keep class names |
| change per-site behavior | `wmgui.editions` in `core/settings.js` (edition picked from the hostname by `assign_edition()`) | |

## The bundler is not a real module system

`deploy/build_js.py` concatenates every module into **one classic script with
one shared top-level scope** under a single `"use strict"`, after the vendored
libraries in the fixed `VENDORED` order. Consequences:

- **Top-level names must be unique across all modules**, exported or not. Two
  private `function helper()` in different files collide in the bundle while
  working fine in dev mode (real ES modules). Prefix or nest private helpers.
- Imports must be relative (`./x.js`), and use the exporter's own names:
  `import { a as b }` is not supported, and a default import must be named
  exactly like the exporter's local default name. `export { a, b }` blocks are
  rejected; use `export function` / `export const`.
- Module top-level code runs in topological order (DFS post-order from
  `app/run.js`, cycles tolerated). Do not rely on a module's side effects
  having run unless you import it.
- Dev mode (`example_dev.html`, native ES modules) and the bundle can differ.
  **The parity suite tests the bundle only**; for scope-sensitive changes, also
  load `example_dev.html` once.
- The build fails loudly on unresolved names in imports. It does **not** catch
  a missing import of a name that happens to exist globally in the bundle
  (it works bundled, throws in dev). Import everything you use.

## Compatibility contracts

- **The DOM and CSS contracts of the replaced plugins** are relied on by
  `webassets/ermac.css` and by host-page CSS and scripts. The vanilla
  components are ports of the *vendored* selectize 0.12 and jquery.tablesorter
  2.0 (read them in git history: `git show master:src_js/third_party/...`),
  not of their documentation. Search box: `.selectize-control.multi.plugin-*`,
  `.selectize-input` (+ `items`, `full`/`not-full`, `has-items`,
  `has-options`, `focus`, `input-active`, `dropdown-active`),
  `.selectize-dropdown(-content)` positioned with explicit
  `width`/`top`/`left`, chips with `data-facet`/`data-term`/`data-value`,
  options with `data-selectable`/`data-value`, the hidden original
  `<select multiple class="selectized">` mirroring the chips as
  `<option selected>`, the `<select id>-selectized` input of
  `type="select-multiple"` auto-sized to its text. Table: `tablesorter`,
  `th.header`, `headerSortUp`/`headerSortDown` (NB ascending is marked
  `headerSortDown`). Keep the names **and** the moments they are toggled.
- **Request encoding is part of the server contract.** The server was written
  against jQuery `$.param` and jQuery `.data()`: values that were numbers must
  stay numbers (`data-rankfilter="5"` read via `getAttribute` is the string
  `"5"`: convert it, as `events.js` now does), nested objects/arrays serialize the jQuery way
  (`param()` in `core/ajax.js` is a faithful port of jQuery 3.7.1 `$.param`),
  form posts stay `application/x-www-form-urlencoded`. The parity API layer
  compares method, path, sorted query and POST body.
- **Numeric searches in hashes** use the router's own `prop,sign,value;...`
  form (`#inquiry/numeric=band%20gap%2C%3E%2C3`). Build every `#inquiry...`
  hash with `inquiry_param()` (`components/sliders.js`), which serializes a
  numeric array that way, never with `param()` directly. Approved fix: the old
  GUI passed the arrays to `$.param` in the typed-text search and the VIEW
  buttons, giving `numeric[0][]=...` keys the router cannot read ("Unrecognized
  input"); see the `search_numeric_text*` and `numeric_view_phases_button`
  scenarios. The route syntax itself is unchanged (rule 4).
- **localStorage keys** (`wm_search_log_v5`, `wm`, `bid_history`,
  `absolidix_v1`, `wm_u_email`, `wm_reload_v1`, `wm_redir_v1`, `darkmode`) hold
  users' history and session: never rename or reshape them without a migration.
- **The "hash-hack"**: re-submitting the current inquiry toggles a trailing `=`
  on the hash to force a `hashchange`. It looks like a bug; it is load-bearing.
- **`String.prototype.startswith`** (lowercase) and friends are deliberate
  base-type extensions in `core/utils.js`; `startswith` is not a typo of
  `startsWith`.

## jQuery-migration traps (each has bitten this codebase)

- `return false` from a handler: `on()` in `core/dom.js` honors it like
  jQuery (`preventDefault()` + `stopPropagation()`), plain
  `addEventListener` handlers do **not**. Several handlers in `events.js`
  still end with `return false` from the jQuery era; where one is a direct
  listener, call `event.preventDefault()` / `stopPropagation()` explicitly.
- Delegation order: jQuery ran the delegated handlers of one root deepest
  element first, and a `stopPropagation()` in an inner handler skipped the
  outer ones (the row "Show" button must not also open the row). `on()`
  reproduces this; separate `addEventListener` calls on one root do not.
- Event order with a real mouse is `mousedown → (blur of the focused input) →
  mouseup → click`. A widget that closes on blur loses the click unless its
  `mousedown` calls `preventDefault()`: selectize options and chips, and
  tablesorter headers (`cancelSelection`), all do; keep it that way.
- Selectize deferred `onFocus` to the next tick and blurred on any document
  mousedown outside the control; app code that writes chips while the box is
  focused relies on that timing (the dropdown opened by the write is closed
  again by the deferred refresh).
- **Enter is not handled by the multiselect**: the vendored selectize has its
  Enter handler commented out, so Enter bubbles to the `#search_holder` and
  document handlers, which run the search with the chips **and the raw
  typed text** (a highlighted suggestion is not picked). Never consume Enter
  in the component.
- `show()`/`hide()`/`toggle_display()` in `core/dom.js` implement jQuery 3:
  `hide()` remembers the inline display, `show()` restores it or falls back
  to the tag's default display (`list-item` for `<li>`...), and only the
  element itself is considered, not its ancestors. Do not replace them with
  `style.display = 'block'`.
- jQuery `.data('x')` coerced `"5"` to `5`, `"true"` to `true`, JSON to
  objects; `getAttribute` / `dataset` return strings.
- `ajax()` rejects with `{aborted: true}` only for `.abort()`; a network
  failure is `{aborted: false, status: 0}` and must reach the "Connection to
  server is lost" notification, like jQuery's `'error'` vs `'abort'`.
- `Math.random` drives visible content (legend, examples, tooltips' random
  picks, `control_e` plot type). Code that consumes random values in a
  different order shifts all of them; parity seeds the sequence but cannot
  realign it.
- `wmgui.clean()` is the only sanitizer for server text shown in
  notifications: keep it stripping scripts, embedded documents, `on*`
  attributes and `javascript:` URLs (bar the app's own `location.reload()`).
- A "simplified" `$.param` that just `encodeURIComponent`s each value turns
  an array into `a,b,c` instead of `key[]=a&key[]=b&key[]=c`. This once
  silently changed (and half-fixed) the numeric search URLs; `param()` is
  tested against the vendored jQuery for nested arrays, objects, `null`,
  functions and top-level `{name, value}` arrays.

## Verifying a change: the parity loop

```
python3 parity/run_parity.py --lint                 # after editing scenarios.toml
python3 parity/run_parity.py --only 'ms_*'          # the area you touched
python3 parity/run_parity.py                        # everything: 7-25 min, host-dependent
```

- Before changing code, run the scenarios of the area and **record which
  already fail**. A failing scenario is a divergence from the deployed
  version, not flakiness: runs are deterministic (seeded random, virtual
  time, replayed API responses), so reruns give the same set.
- For every behavior you touch, **add a narrow scenario** (one route, the
  fewest steps, probes that pin exactly that behavior) — see
  `parity/README.md` for the step and probe vocabulary. Prefer a specific
  probe (`classes:`, `focus`, `texts:`, `attr:`) over relying on pixels.
- Read failures from `out/<scenario>/diff.txt` and `old|new-capture.json`;
  `pixel-diff.png` shows *where*. The default probes (focus, search box
  state, notification, `wmgui.search`) catch many collateral changes.
- Parity is relative (new matches old). For a fact that must hold on its
  own, add `expect` (see `parity/README.md`); an `expect` failure on the OLD
  side means the data or the specification moved, not your change.
- A `WARN the OLD side itself failed step N` means the scenario is wrong
  (selector, hidden element, onboarding tooltip covering the target — use
  `tooltips = false`), not the code.
- Use native input (the default). `--input synthetic` (and the chrome-cli
  driver) dispatch synthetic events and **miss focus/blur regressions**.
- The specification is the bundle **pinned** in `run_parity.py` (`OLD_URL`
  at a fixed gh-pages commit, `OLD_SHA1`), not the live demo, which serves
  the new code once it is deployed. Move it only deliberately
  (`--reference-url` / `--reference-sha1`), after a release.
- CI (`.github/workflows/parity.yml`) runs the component scenarios on every
  pull request with a pinned Playwright/Chromium build; a red run is a
  divergence to explain, not to re-run.
- Sandboxed or macOS hosts without Chrome:
  `PARITY_BROWSER=<chromium or headless_shell> PARITY_BROWSER_ARGS=--single-process`
  with the Playwright driver; it needs no listening sockets.

## The MPDS API: be a good citizen

- The data are live at `api.mpds.io`; automated usage beyond the public API
  violates the MPDS ToS (see the console warning in `app/run.js`). Keep test
  traffic small: parity replays recorded responses (`out/*/api-cache/`), and
  `--fresh-cache` should be the exception.
- **Never exercise account endpoints against production** (`/users/login`,
  `factor`, `access`, `ratify`, `lost_password`, `new_password`, `api_key`):
  use `mock = [...]` in the scenario. Never put real credentials or API keys in
  scenarios, fixtures, caches or commits.
- Do not commit `parity/out/`, `parity/reference/` or recorded responses.

## Style

Match the surrounding code: 2-space indent, single quotes, semicolons,
`snake_case` functions, the `$`/`$$`/`on` helpers from `core/dom.js`, comments
starting with `NB` for non-obvious decisions. Keep diffs local; do not
reformat files you are not changing.
