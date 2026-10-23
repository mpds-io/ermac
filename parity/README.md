# Ermac parity test

Automated comparative testing of the refactored GUI against the previously
deployed version at <https://mpds-io.github.io/ermac>: every scenario runs on
the OLD bundle and on the NEW one under identical, deterministic conditions,
and the two sides must agree. No manual inspection needed.

```
pip install playwright pillow && python -m playwright install chromium

python3 parity/run_parity.py                      # everything
python3 parity/run_parity.py --only 'ms_*,start'  # names or glob patterns
python3 parity/run_parity.py --tag multiselect    # by tag
python3 parity/run_parity.py --list               # what is there
python3 parity/run_parity.py --lint               # validate scenarios.toml only
python3 parity/run_parity.py --no-pixels          # skip the screenshot layer
```

The tests live in **[`scenarios.toml`](scenarios.toml)**, one `[[scenario]]`
table each. The runner (`run_parity.py`) and the in-page harness
(`harness.js`) contain no test-specific code.

## Adding a parity test

Append a table to `scenarios.toml`. A route alone is a valid test:

```toml
[[scenario]]
name = "route_inquiry_entries"
route = "#inquiry_entries/elements=Ag-O&classes=oxide"
```

A narrow interaction test is a route, a few **steps**, and the **probes** that
pin the behavior down:

```toml
[[scenario]]
name = "ms_backspace_removes_last_item"
desc = "Backspace in the empty input removes the last item"
route = "#search/Ag-O"
steps = [
  { focus = "#search_field-selectized" },
  { key = "Backspace", after = 1200 },
]
probe = ["texts:#search_holder .selectize-input > div[data-term]"]
tags = ["multiselect", "keyboard"]
```

Then `python3 parity/run_parity.py --lint` and
`python3 parity/run_parity.py --only ms_backspace_removes_last_item`.

You never write expected values: the OLD side **is** the expectation. You
only say what to do and what to look at.

### Steps

Each step is an inline table with exactly one action. `nth = N` picks the
N-th match of a selector (default 0). `after = ms` overrides the virtual time
allowed after the step (default `step_after`, 400 ms).

| step | meaning |
|---|---|
| `{ click = "sel" }` / `dblclick` / `hover` | mouse on the element |
| `{ mousedown = "sel" }` | a bare `mousedown` event (e.g. reference links) |
| `{ focus = "sel" }` / `{ blur = "sel" }` / `{ blur = true }` | focus management (`true` = the active element) |
| `{ type = "sel", text = "Ag O", clear = true }` | key-by-key typing (fires keydown/keypress/input/keyup) |
| `{ key = "Enter", on = "sel" }` | a single key press, on `sel` or the focused element: `Enter`, `Escape`, `Backspace`, `ArrowDown`, `ArrowUp`, `Tab`, ... |
| `{ fill = "sel", text = "..." }` | set an input value at once (input + change events) |
| `{ check = "sel" }` / `uncheck` | checkboxes and radios |
| `{ hash = "#route" }` / `{ back = true }` | in-app navigation, browser Back |
| `{ scroll = "sel" }` / `{ scroll_y = 600 }` | scroll an element into view / the window to y |
| `{ wait = 2000 }` | let 2000 ms of virtual time pass |
| `{ wait_for = "sel", timeout = 10000 }` / `wait_gone` | until an element appears / disappears |
| `{ eval = "js" }` | escape hatch: run JS in the page |

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

`[defaults].probe` lists the probes evaluated in **every** scenario (focus,
notification text and visibility, search box items/text/dropdown, open
modals, `wmgui.search`, localStorage keys, ...). A probe that is `null` on
both sides (selector matching nothing) is reported as a *vacuous* warning.

### Other scenario keys

| key | meaning |
|---|---|
| `desc`, `tags` | free text; `--tag` selects by tag |
| `storage = { key = "value" }` | localStorage preset, set before the app boots |
| `mock = [ { path = "/users/login", json = {...} } ]` | stub an API path (prefix): `json`/`body`, `status`, `method`, or `abort = true` for a network failure. Mocked scenarios never reach the MPDS server (playwright driver only) |
| `boot`, `settle`, `step_after`, `wait_for_timeout` | virtual-time budget (ms) around the steps |
| `pixels = "strict" \| "loose" \| "off"`, `pixel_threshold` | screenshot comparison; `loose` reports but never fails |
| `api = "ordered" \| "unordered" \| "off"` | API request log comparison |
| `viewport = [w, h]` | default `[1280, 2400]` |
| `ignore = ["pixels", "probe:focus", "dom:header_th"]` | accept an intentional difference (say why in `desc`) |
| `xfail = "reason"` | known divergence: reported XFAIL, and XPASS (failing) once it is fixed |
| `skip = "reason"` | not run |

Route placeholders such as `#phase_id/{phid}` are filled from `[[fixture]]`
tables, harvested from the OLD side before the run (`probe` or regex `pattern`).

## How it works

1. The OLD reference bundle is fetched from the deployed demo once (cached in
   `reference/`); the NEW bundle is rebuilt from the current sources.
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
6. Seven comparison layers per scenario:
   - **api** — MPDS API requests: method, path, sorted query, and (playwright
     driver) the POST content type and body;
   - **ext** — requests to external hosts (playwright driver);
   - **dom** — the legacy semantic keys (title, tables and row order,
     interpretation, history, multiselect items, visibility states, ...);
   - **probes** — the declared probes;
   - **steps** — the step outcomes;
   - **errors** — the NEW side must not throw more than the OLD side;
   - **pixels** — screenshots, per-channel tolerance 2, strict threshold 0.1%.

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
  mocks, no external-request layer.

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
