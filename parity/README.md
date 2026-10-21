# Ermac parity test

Automated comparative testing of the refactored GUI (`refactor-vanilla-es-modules`)
against the previously deployed version at <https://mpds-io.github.io/ermac>,
no manual inspection needed.

```
python3 parity/run_parity.py                 # full battery (20 scenarios)
python3 parity/run_parity.py --only search  # a single scenario
python3 parity/run_parity.py --no-pixels    # API + DOM layers only
```

Prerequisites: `google-chrome`, `python3`, Pillow (pixel layer), and the
deployed old demo reachable once (the reference bundle is cached in
`reference/`).

## How it works

1. The OLD reference bundle is fetched from the deployed demo; the NEW
   bundle is rebuilt from the current sources.
2. Both are served side-by-side (`parity/old.html` / `parity/new.html`) from
   a localhost origin, so both run in development mode and their API traffic
   flows through `deploy/dev_api_proxy.py`.
3. Every scenario (a hash route, or a route + a scripted click) runs in
   headless Chrome once per side, under identical, deterministic conditions:
   - `harness.js` stubs `Math.random` with the same seeded sequence and
     freezes the rotating legend (its ticks are network-latency-dependent);
     the text ink of random-content elements (`#legend`, `#examples`) is
     masked identically on both sides, and their content is compared
     structurally instead (the old bundle consumes extra random values
     inside jQuery/Sizzle internals, so exact strings legitimately differ);
   - the proxy runs with `--cache`: the old side populates the response
     cache, the new side replays it, so both sides see identical API data
     regardless of live index changes at the MPDS server;
   - external static assets (thumbnails, ptable SVGs) are host-blocked so
     they fail identically on both sides;
   - the anonymous `POST /users/ip` ping is excluded from the API log
     comparison (it races with page teardown; its effects are covered by
     the DOM layer).
4. Three comparison layers per scenario:
   - **API request logs** — the app must talk to the MPDS API identically;
   - **semantic DOM state** — title, tables and row order, interpretation,
     history, multiselect items, context columns, links, visibility states;
   - **rendered pixels** — screenshots compared with a small tolerance
     (threshold 0.1% of pixels).

## Scenario coverage

Routes: landing + periodic table, fuzzy search, inquiry (thumbnailed /
tabled+sorting / phases / articles / numeric sliders), individual entry,
phase and article views, interlinkage, property hierarchy, polyhedra,
login modal, plotting embed. Click scenarios: advanced search popup,
entry context column, table sorting (ascending + descending),
refinement expansion.

## Artifacts

`out/<scenario>/`: old/new DOM dumps, screenshots, API logs, the replayed
response cache (`api-cache/`), pixel-diff overlay (`pixel-diff.png`),
semantic diff (`semantic-diff.txt`). `reference/` holds the old bundle.
Both directories are gitignored.

## Debugging aid

`?trace=1` on either harness page records every `Math.random` call with a
stack trace into the DOM (visible in the dumps), for diagnosing
random-sequence divergence.