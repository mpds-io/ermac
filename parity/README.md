# Ermac parity test

Automated comparative testing of the refactored GUI against the previously
deployed version at <https://mpds-io.github.io/ermac>: every scenario runs on
the OLD bundle and on the NEW one under identical, deterministic conditions,
and the two sides must agree. No manual inspection needed.

```
# NB one interpreter throughout: install with the python3 that runs the suite
python3 -m pip install playwright==1.50.0 pillow && python3 -m playwright install chromium

python3 parity/run_parity.py                      # everything
python3 parity/run_parity.py --only 'ms_*,start'  # names or glob patterns
python3 parity/run_parity.py --tag multiselect    # by tag
python3 parity/run_parity.py --list               # what is there
python3 parity/run_parity.py --lint               # validate scenarios.json + config.json only
python3 parity/run_parity.py --no-pixels          # skip the screenshot layer
```

The tests live in **[`scenarios.json`](scenarios.json)**, a list of scenario
objects; the defaults applied to every scenario and the fixtures are in
**[`config.json`](config.json)**. The runner (`run_parity.py`) and the
in-page harness (`harness.js`) contain no test-specific code.

JSON has no comments: any object (a scenario, a step, the defaults, a
fixture) may carry a `"comment"` (a string or a list of strings), which is
ignored. Scenarios that open a group of related tests carry
`"comment": "section: ..."`. The linter reports syntax errors with their line
and column, duplicate keys (which JSON parsers otherwise silently resolve to
the last one) and unknown keys.

## Adding a parity test

Add an object to the list in `scenarios.json`. A route alone is a valid test:

```json
{
  "name": "route_inquiry_entries",
  "route": "#inquiry_entries/elements=Ag-O&classes=oxide"
}
```

A narrow interaction test is a route, a few **steps**, and the **probes** that
pin the behavior down:

```json
{
  "name": "ms_backspace_removes_last_item",
  "desc": "Backspace in the empty input removes the last item",
  "route": "#search/Ag-O",
  "steps": [
    {"focus": "#search_field-selectized"},
    {"key": "Backspace", "after": 1200}
  ],
  "probe": ["texts:#search_holder .selectize-input > div[data-term]"],
  "tags": ["multiselect", "keyboard"]
}
```

Then `python3 parity/run_parity.py --lint` and
`python3 parity/run_parity.py --only ms_backspace_removes_last_item`.

You normally never write expected values: the OLD side **is** the
expectation. You only say what to do and what to look at. When a fact must
hold regardless of the old GUI (e.g. "this search shows the 'similar data'
notice"), add an [`expect`](#absolute-expectations) object.

### Steps

Each step is an object with exactly one action. `"nth": N` picks the
N-th match of a selector (default 0). `"after": ms` overrides the virtual time
allowed after the step (default `step_after`, 400 ms).

| step | meaning |
|---|---|
| `{"click": "sel"}` / `dblclick` / `hover` | mouse on the element |
| `{"mousedown": "sel"}` | a bare `mousedown` event (e.g. reference links) |
| `{"focus": "sel"}` / `{"blur": "sel"}` / `{"blur": true}` | focus management (`true` = the active element) |
| `{"type": "sel", "text": "Ag O", "clear": true}` | key-by-key typing (fires keydown/keypress/input/keyup) |
| `{"key": "Enter", "on": "sel"}` | a single key press, on `sel` or the focused element: `Enter`, `Escape`, `Backspace`, `ArrowDown`, `ArrowUp`, `Tab`, `ControlOrMeta+a`, ... The key is held 30 ms, like a person: what keydown triggers (e.g. a route change) runs before keyup instead of racing it |
| `{"fill": "sel", "text": "..."}` | set an input value at once (input + change events) |
| `{"check": "sel"}` / `uncheck` | checkboxes and radios |
| `{"hash": "#route"}` / `{"back": true}` | in-app navigation, browser Back |
| `{"scroll": "sel"}` / `{"scroll_y": 600}` | scroll an element into view / the window to y |
| `{"wait": 2000}` | let 2000 ms of virtual time pass |
| `{"wait_for": "sel", "timeout": 10000}` / `wait_gone` | until an element appears / disappears |
| `{"eval": "js"}` | escape hatch: run JS in the page |

A step whose selector matches nothing is recorded as `missing`, a wait that
expires as `timeout`; the remaining steps are `skipped`. The step outcomes are
compared too, and a scenario whose steps fail on the OLD side is flagged with
a warning (it does not test what it claims).

### Probes

A probe is a string `kind:selector` (or `kind:selector@argument`) evaluated in
the page after the last step; its value must be identical on both sides.

| probe | value |
|---|---|
| `text:sel` / `texts:sel` | normalized textContent of the first / all matches |
| `html:sel` | normalized innerHTML |
| `value:sel` / `values:sel` | form values |
| `checked:sel`, `disabled:sel`, `readonly:sel` | booleans |
| `count:sel` | number of matches |
| `visible:sel` / `visibles:sel` / `nvisible:sel` | rendered visibility (first / list / how many) |
| `class:sel` / `classes:sel` | sorted class list |
| `attr:sel@name` / `attrs:sel@name` | attribute value(s) |
| `style:sel@property` | computed style |
| `rect:sel` / `rects:sel` | `[x, y, width, height]` (layout) |
| `focus` | which element has the keyboard focus |
| `hash`, `title`, `scroll`, `history`, `selection` | location hash, document title, scroll offsets, history length, selected text |
| `storage:key` | a localStorage value |
| `js:expression` | any JSON-able JS expression, e.g. `js:wmgui.search` |

`defaults.probe` in `config.json` lists the probes evaluated in **every** scenario (focus,
notification text and visibility, search box items/text/dropdown, open
modals, `wmgui.search`, localStorage keys, ...). A probe that is `null` on
both sides (selector matching nothing) is reported as a *vacuous* warning.

### Absolute expectations

Parity is relative: if the old and the new GUI both show 8 hits, a "no hits"
scenario still passes. `expect` adds absolute assertions on probes, checked
on **each** side independently:

```json
{
  "comment": "settle: NB the notification hides 4 s after it appears",
  "name": "search_am_ru_binary_similar",
  "route": "#start",
  "steps": [
    {"type": "#search_field-selectized", "text": "Am Ru binary", "after": 300},
    {"key": "Enter", "after": 1500}
  ],
  "settle": 1000,
  "expect": {
    "text:#notifybox": {"contains": "similar data shown"},
    "visible:#notifybox": true,
    "hash": "#inquiry/elements=Am-Ru&classes=binary"
  }
}
```

E.g. `"expect": {"count:#databrowser tr.tcell, #databrowser div.gallery_item": {"gt": 0}}`
asserts that there are results. A plain value means equality; operators: `equals`, `not`, `contains`,
`not_contains` (strings, lists), `matches` (regex search), `gt`, `ge`,
`lt`, `le` (numbers). The probes of `expect` are also compared old vs new
like any other. Failures are reported per side in the `expect` layer, e.g.
`OLD count:... is 8, expected equals 0`: a failing OLD side means the data or
the specification changed, not the refactoring. NB in JSON a backslash in a
probe must be doubled, e.g. `"js:(document.title.match(/(\\d+) results?$/) || [0, 0])[1] * 1"`.

The `qa` scenarios (`--tag qa`) are result-count checks for 78 facet
searches from a QA list: route `#inquiry/<facets>`, expecting the number the
GUI reports in the page title (`[At least ]N result(s)`, i.e. the API's
`estimated_count`). The counts were re-recorded from the live API (the QA
list's own numbers were outdated; each `desc` keeps them) and are checked
loosely so that growing data keeps them green: nonzero cases expect at least
the recorded count (`ge`), cases hitting the server's fuzzy fallback also
expect its "similar data shown" notice, and zero cases expect 0 plus their
notice ("No hits" / "Unrecognized property"), so a page that failed to load
cannot pass as 0. Runs replay the recorded responses, so the counts only
move with `--fresh-cache` or `--live`, e.g. a periodic
`--tag qa --fresh-cache` to watch the data. Their parity comparison counts
like any other scenario; the tag is not part of the PR CI set.

### Approved behaviour changes

When the new GUI deliberately differs from the old one (a fix the maintainer
approved), the scenario keeps comparing both sides, is marked `xfail` with the
reason, and pins the **new** behaviour with `expect_new`, checked on the NEW
side only. A violated `expect_new` makes the scenario FAIL even though it is
xfail; without it an xfail scenario would pass whatever NEW does.

```json
{
  "name": "search_numeric_text",
  "route": "#start",
  "steps": [
    {"type": "#search_field-selectized", "text": "band gap > 3", "after": 100},
    {"key": "Enter", "after": 1500}
  ],
  "xfail": "APPROVED CHANGE: the old GUI wrote numeric[0][]=... keys the router cannot read",
  "expect_new": {
    "hash": "#inquiry/numeric=band%20gap%2C%3E%2C3",
    "js:JSON.stringify(wmgui.search.numeric)": "[[\"band gap\",\">\",\"3\"]]"
  }
}
```

When the change is confined to a few probes (an a11y change moving the
`focus`, say) a whole-scenario `xfail` would be too wide: it tolerates every
layer, so an unrelated regression in the same scenario would go unnoticed.
Use `"approved": "<reason>"` instead: the probes named in `expect_new` are
pinned on NEW and left out of the OLD-vs-NEW comparison, everything else is
compared as usual and the scenario PASSes or FAILs normally (the summary
counts these PASSes, `report.json` carries the reason).

```json
{
  "name": "control_phases",
  "route": "#inquiry/elements=Ag-O&classes=oxide",
  "steps": [{"wait_for": "#control_b"}, {"click": "#control_b", "after": 1500}],
  "approved": "APPROVED CHANGE (VPAT 2.1.1 Keyboard): the clicked control is focusable now and keeps the focus, like a native button",
  "expect_new": {"focus": "#control_b"}
}
```

The linter rejects `expect_new` without `xfail` or `approved`, `approved`
without `expect_new`, and both `approved` and `xfail` on one scenario.

### Accessibility audit (`--tag a11y`)

`harness.js` defines `window.__a11y()`, usable in any `js:` probe, e.g.
`"js:window.__a11y().mouse_only_total"`. It returns:

| key | meaning |
|---|---|
| `mouse_only_total`, `mouse_only` | visible `cursor:pointer` elements (outermost of a pointer subtree) that are neither focusable nor inside a focusable element or a `<label>`, by region, with examples; members of a roving group (`tabindex="-1"` under a `tabindex="0"` sibling) and `[data-a11y-keyboard]` elements (documented other keyboard model) count as reachable |
| `tab_count`, `tab_order` | the Tab sequence (the first 40, with their region) |
| `modal`, `focusable_outside_modal`, `outside_modal` | the visible dialog and the Tab stops outside it (`#userbox` is exempt: it stays above the overlay by design) |
| `unreachable_total`, `unreachable` | controls cut off by the viewport or by an `overflow:hidden` ancestor (4 px tolerance in scrollable columns), i.e. that zooming makes unusable |
| `viewport`, `scroll_width`, `overflow_x`, `focus_after_open` | context |

The `a11y_audit_*` scenarios pin 0 mouse-only controls on the main screens and
0 Tab stops outside each dialog; `a11y_zoom150_*` / `a11y_zoom200_*` pin 0
unreachable controls at 853×533 / 640×400 (150% / 200% of 1280×800); the others pin single keyboard contracts (arrows in
the periodic table, Enter on a VIEW switch, focus into and back out of
dialogs, the skip control). They are `xfail` against the deployed GUI, which
has none of this, and `expect_new` pins the result.

### Other scenario keys

| key | meaning |
|---|---|
| `desc`, `tags` | free text; `--tag` selects by tag |
| `"storage": {"key": "value"}` | localStorage preset, set before the app boots |
| `"mock": [{"path": "/users/login", "json": {...}}]` | stub an API path (prefix): `json`/`body`, `status`, `method`, or `"abort": true` for a network failure. Mocked scenarios never reach the MPDS server (playwright driver only) |
| `boot`, `settle`, `step_after`, `wait_for_timeout` | virtual-time budget (ms) around the steps |
| `"pixels": "strict" \| "loose" \| "off"`, `pixel_threshold` | screenshot comparison; `loose` reports but never fails |
| `"api": "ordered" \| "unordered" \| "off"` | API request log comparison |
| `"viewport": [w, h]` | default `[1280, 2400]` |
| `"expect": {"<probe>": value}` | absolute assertions, see above |
| `"ignore": ["pixels", "probe:focus", "dom:header_th"]` | accept an intentional difference (say why in `desc`); `expect` can be ignored too |
| `"ignore_attributes": ["role", "aria-*"]` | attributes stripped from the DOM and the probe values before the comparison (`aria-*` is a prefix); the default in `config.json` strips the accessibility markup (`role`, `tabindex`, `aria-*`, `inert`, `data-a11y-*`). `expect`/`expect_new` see the raw values |
| `"xfail": "reason"` | known or approved divergence: reported XFAIL, and XPASS (failing) once the sides agree; pair it with `expect_new` |
| `"approved": "reason"` | an approved change confined to the `expect_new` probes, see above |
| `"skip": "reason"` | not run |

Route placeholders such as `#phase_id/{phid}` are filled from the `fixtures`
of `config.json`, harvested from the OLD side before the run (`probe` or regex
`pattern`).

## How it works

1. The OLD reference bundle is **pinned**: fetched once from a fixed gh-pages
   commit (`OLD_URL`, the deployment of master `a71cabb`) and verified
   against `OLD_SHA1` on every run (cached in `reference/`). The live demo
   is deliberately not used: once the refactoring is deployed it serves the
   NEW bundle. `--reference-url` / `--reference-sha1` move the specification
   deliberately. The NEW bundle is rebuilt from the current sources.
   The OLD **stylesheet** is pinned the same way (`OLD_CSS_URL`,
   `OLD_CSS_SHA1`, `--reference-css-url` / `--reference-css-sha1`): `old.html`
   loads `reference/ermac_old.css` (its `url()`s rewritten to `webassets/`),
   `new.html` the working tree's `webassets/ermac.css`, so a CSS change is a
   pixel diff like any other.
2. Both are loaded by `old.html` / `new.html` on a `localhost` origin, so
   both run in development mode and talk to the API at `localhost:7070`.
3. `harness.js` runs before either bundle: seeded `Math.random`, frozen
   rotating legend, identical masking of random-content ink, capture of
   uncaught errors / unhandled rejections / `console.error`, the probe
   engine, and a synthetic step executor (for the chrome-cli driver).
4. Time is virtual on both drivers: it only advances while no API fetch is
   pending, so app timers (tooltips after 4 s, notifications hiding after
   4 s, autocomplete throttles) fire at the same logical moment on both sides.
5. API responses: the OLD side records them in `out/<scenario>/api-cache/`,
   the NEW side replays them, so both see identical data regardless of live
   index changes. External hosts (thumbnails etc.) are blocked on both sides.
6. Eight comparison layers per scenario:
   - **api** — MPDS API requests: method, path, sorted query, and (playwright
     driver) the POST content type and body;
   - **ext** — requests to external hosts except images (playwright driver;
     `<img loading="lazy">` fetches depend on the browser build's lazy-load
     distance, the image URLs are compared through the DOM instead);
   - **dom** — the legacy semantic keys (title, tables and row order,
     interpretation, history, multiselect items, visibility states, ...);
   - **probes** — the declared probes;
   - **expect** — the absolute expectations, on each side;
   - **steps** — the step outcomes;
   - **errors** — the NEW side must not throw more than the OLD side;
   - **pixels** — screenshots: a pixel differs when any channel differs by
     more than 2; strict scenarios fail above 0.1% of differing pixels.

A scenario whose capture fails (e.g. no API traffic at all) is reported as
**ERROR** and the run continues; ERROR, FAIL and XPASS make the exit code 1.
A full run takes 7-25 min depending on the host (2 sides x ~3-8 s per
scenario).

## CI

`.github/workflows/parity.yml` runs the component scenarios
(`--tag legacy,multiselect,sort,controls,mock,keyboard`) on every pull
request and the whole battery on manual dispatch, with Playwright pinned
(Chromium 133: rendering and lazy loading depend on the browser build) and
the recorded API responses cached between runs to keep the load on
api.mpds.io minimal. The evidence (`report.json`, diffs, captures,
screenshots) is uploaded as the `parity-out` artifact.

## Drivers

* `--driver playwright` (default when the package is installed): native
  input, files and API served through request interception (no listening
  sockets, no proxy process), Playwright's fake clock as virtual time, a
  fresh browser per side. `--input synthetic` replays the steps with the
  in-page executor instead (useful to check what the chrome-cli driver sees).
  `--browser PATH` / `PARITY_BROWSER` and `--browser-arg` /
  `PARITY_BROWSER_ARGS` select another Chromium build, e.g.
  `--browser-arg=--single-process` for sandboxed macOS hosts.
* `--driver chrome-cli`: the original approach, `google-chrome --dump-dom
  --virtual-time-budget` with `python -m http.server` and
  `deploy/dev_api_proxy.py --cache`; steps are replayed in-page with
  synthetic DOM events, results are read back from the dumped DOM. No API
  mocks, no external-request layer. Both drivers share the response cache
  format of `deploy/dev_api_proxy.py` (POSTs are keyed by URL and body;
  rate limits and server errors are never cached; redirects are passed to
  the browser, not followed, and replayed with their `Location`). The
  browser is `--browser` / `PARITY_BROWSER`, else the first Chrome/Chromium
  found in `PATH` or `/Applications`.

The Playwright driver is the default and never falls back to chrome-cli on
its own: if this Python cannot import playwright, or its Chromium is not
downloaded, the run stops and prints the exact install commands for the
interpreter it runs under.

## Freezes and interruptions

A run cannot hang. With the Playwright driver every side runs in a worker
process (its own process group) that reports what it is doing: launching,
loading, each step, each live API request, capturing. A side that reports
nothing for `--stall-timeout` seconds (default 90, env
`PARITY_STALL_TIMEOUT`), or runs longer than `--side-timeout` (default 600,
env `PARITY_SIDE_TIMEOUT`), is killed together with its browser and the
scenario is reported as ERROR with its last activity, e.g.
`SideFrozen: OLD side froze (no progress for 90 s), last activity: step 2/3:
(click "#control_d")`; the next scenario gets a fresh worker. Three frozen
scenarios in a row stop the run: the environment is then broken, not the
scenarios. While a side runs longer than 15 s a heartbeat line shows what it
is waiting for, so a slow API (`API GET /search/facet...`) is told apart from
a freeze. Waiting for pending requests is capped at 60 s per side in total.

`report.json` is rewritten after every scenario (`"complete": false` until
the end); Ctrl-C stops the browsers at once, prints the partial summary and
exits with 130. `--stall-timeout 0` runs in-process without the watchdog
(for debugging the driver itself).

## Artifacts

`out/<scenario>/` (or `$PARITY_OUT/<scenario>/`): `old|new-dom.html`,
`old|new.png`, `old|new-capture.json` (API log, step outcomes, probe
values, errors), `pixel-diff.png`, `diff.txt`, the replayed `api-cache/`.
`out/report.json` summarizes the run. `--fresh-cache` re-records the API.
Both `out/` and `reference/` are gitignored.

## Debugging aid

`?trace=1` on either harness page records every `Math.random` call with a
stack trace into the DOM (visible in the dumps), for diagnosing
random-sequence divergence.
