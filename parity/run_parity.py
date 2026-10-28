#!/usr/bin/env python3
"""
Ermac parity test: automated comparative testing of the refactored GUI
against the previously deployed version (https://mpds-io.github.io/ermac).

Every scenario of parity/scenarios.json (a hash route + optional scripted
steps + optional probes, see parity/README.md) runs twice under identical,
deterministic conditions: once with the OLD reference bundle, once with the
NEW one. Then the two sides are compared layer by layer:

  api      the MPDS API requests (method, path, sorted query, POST body)
  ext      external requests (thumbnails, iframes, ...), blocked on both sides
  dom      the legacy semantic DOM keys (title, tables, interpretation, ...)
  probes   the scenario-declared probes (narrow, in-page observations)
  expect   absolute assertions on probes, checked on EACH side
  expect_new  absolute assertions checked on the NEW side only: they pin an
           approved behaviour change (`xfail`) and fail the scenario even
           when it is xfail
  steps    the outcome of every scripted step (ok / missing / timeout / ...)
  errors   uncaught JS errors: the new side must not throw more than the old
  pixels   rendered screenshots (tolerance, strict or loose per scenario)

Drivers:
  playwright  (default) native input via Playwright, static files and API
              served by request interception (no sockets, no proxy
              process), Playwright fake clock = virtual time; every side
              runs in a watched worker process, so a freeze costs at most
              --stall-timeout seconds (see parity/README.md);
  chrome-cli  google-chrome --dump-dom --virtual-time-budget, the static
              server + deploy/dev_api_proxy.py; steps are replayed in-page
              with synthetic events by parity/harness.js.

Usage:
    python3 parity/run_parity.py                       # everything
    python3 parity/run_parity.py --only 'ms_*,start'   # names / globs
    python3 parity/run_parity.py --tag multiselect
    python3 parity/run_parity.py --list | --lint
"""

import argparse
import base64
import fnmatch
import hashlib
import importlib.util
import json
import mimetypes
import os
import re
import queue
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


try:
    from PIL import Image, ImageChops
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.environ.get('PARITY_OUT') or os.path.join(HERE, 'out')
SCENARIOS_PATH = os.path.join(HERE, 'scenarios.json')  # a list of scenario objects
CONFIG_PATH = os.path.join(HERE, 'config.json')  # {"defaults": {...}, "fixtures": [...]}
GUI_PORT = 5560
API_PORT = 7070
GUI_ORIGIN = 'http://localhost:%d' % GUI_PORT
API_ORIGIN = 'http://localhost:%d' % API_PORT
# NB the specification is PINNED: the gh-pages commit deployed from master
# a71cabb (the merge base of the refactoring). The live demo URL must not be
# used: once the refactoring is deployed, it serves the NEW bundle and the
# suite would silently compare new against new.
OLD_URL = ('https://raw.githubusercontent.com/mpds-io/ermac/'
           '5978778447bcc3b1bf423088801163cbe5f28c4e/ermac.min.js')
OLD_SHA1 = 'c8619d4c1d425b34b9dad5f34ea9e34448b8fd57'
TOL = 2  # per-channel pixel tolerance
IDLE_BUDGET = 60.0  # s per side spent waiting for pending requests, in total
KEY_HOLD_MS = 30  # real ms between keydown and keyup of a `key` step

# NB keep in sync with parity/harness.js (checked at runtime by the playwright driver)
STEP_KINDS = ['click', 'dblclick', 'mousedown', 'hover', 'focus', 'blur', 'type', 'key',
              'fill', 'check', 'uncheck', 'hash', 'back', 'scroll', 'scroll_y', 'eval',
              'wait', 'wait_for', 'wait_gone']
STEP_OPTIONS = {'nth', 'after', 'text', 'clear', 'on', 'timeout'}
PROBE_KINDS = {  # kind: (needs selector, needs @arg)
    'text': (1, 0), 'texts': (1, 0), 'html': (1, 0), 'value': (1, 0), 'values': (1, 0),
    'checked': (1, 0), 'disabled': (1, 0), 'readonly': (1, 0), 'count': (1, 0),
    'visible': (1, 0), 'visibles': (1, 0), 'nvisible': (1, 0), 'class': (1, 0),
    'classes': (1, 0), 'attr': (1, 1), 'attrs': (1, 1), 'style': (1, 1), 'rect': (1, 0),
    'rects': (1, 0), 'focus': (0, 0), 'hash': (0, 0), 'title': (0, 0), 'scroll': (0, 0),
    'history': (0, 0), 'selection': (0, 0), 'storage': (1, 0), 'js': (1, 0),
}
LAYERS = ['api', 'ext', 'dom', 'probes', 'expect', 'expect_new', 'steps', 'errors', 'pixels']
# expect = { "<probe>" = value } or { "<probe>" = { <operator> = value } }
EXPECT_OPERATORS = ['equals', 'not', 'contains', 'not_contains', 'matches', 'gt', 'ge', 'lt', 'le']
DEFAULTS = {
    'boot': 3000,             # virtual ms after page load, before the first step
    'step_after': 400,        # virtual ms after every step (unless the step sets `after`)
    'settle': 3000,           # virtual ms after the last step, before the capture
    'wait_for_timeout': 10000,
    'budget': None,           # chrome-cli: virtual-time budget, default boot+steps+settle+margin
    'pixels': 'strict',       # strict | loose (reported, never fails) | off
    'pixel_threshold': 0.001, # fraction of differing pixels tolerated in strict mode
    'api': 'ordered',         # ordered | unordered | off
    'semantics': True,        # the legacy semantic DOM keys
    'probe': [],              # probes applied to every scenario
    'ignore': [],             # layers (or "probe:<probe>" / "dom:<key>") not compared
    'viewport': [1280, 2400],
}
SCENARIO_KEYS = set(DEFAULTS) | {'name', 'route', 'desc', 'steps', 'tags', 'skip', 'xfail', 'mock', 'storage', 'tooltips',
                                 'expect', 'expect_new'}
# NB the app shows onboarding tooltips (landing: 4 s after boot, first search:
# 3 s after the results) until 2 searches are logged; they cover the VIEW
# controls. `tooltips = false` presets such a neutral 2-entry search log.
QUIET_TOOLTIPS = {'wm_search_log_v5': '[{"elements":"Zr-Hf"},{"elements":"Nb-Ta"}]'}
MOCK_KEYS = {'path', 'method', 'status', 'body', 'json', 'abort'}


def banner(text):
    print('\n' + '=' * 72 + '\n ' + text + '\n' + '=' * 72)


def die(message):
    sys.exit('FATAL: ' + message)


# NB freeze protection: a side run reports what it is doing; in the worker
# process (see WorkerDriver) this feeds the watchdog and the heartbeat lines
_PROGRESS = None


def progress(message):
    if _PROGRESS is not None:
        _PROGRESS(message)


# ----------------------------------------------------------------------------
# scenarios: loading and linting
# ----------------------------------------------------------------------------

def read_json(path, problems):
    """JSON with the errors a hand-edited file needs: the line and column of a
    syntax error, and duplicate keys (json would silently keep the last one)."""
    label = os.path.relpath(path)

    def no_duplicates(pairs):
        seen, name = {}, dict(pairs).get('name')
        for key, value in pairs:
            if key in seen:
                problems.append('%s: duplicate key "%s"%s' % (label, key, ' in "%s"' % name if isinstance(name, str) else ''))
            seen[key] = value
        return seen
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f, object_pairs_hook=no_duplicates)
    except FileNotFoundError:
        problems.append('%s: not found' % label)
    except ValueError as error:
        problems.append('%s: invalid JSON: %s' % (label, error))
    return None


def strip_comments(value):
    """`comment` (a string or a list of strings) is allowed on any object and ignored."""
    if isinstance(value, dict):
        return {k: strip_comments(v) for k, v in value.items() if k != 'comment'}
    if isinstance(value, list):
        return [strip_comments(v) for v in value]
    return value


def load_scenarios(path=SCENARIOS_PATH, config_path=CONFIG_PATH):
    problems = []
    config = read_json(config_path, problems)
    listing = read_json(path, problems)
    if config is None or listing is None:
        return [], [], problems
    if not isinstance(config, dict):
        return [], [], problems + ['%s: must be an object {"defaults": {...}, "fixtures": [...]}' % os.path.relpath(config_path)]
    for key in config:
        if key not in ('comment', 'defaults', 'fixtures'):
            problems.append('%s: unknown key "%s"' % (os.path.relpath(config_path), key))
    if not isinstance(listing, list):
        return [], [], problems + ['%s: must be a list of scenario objects' % os.path.relpath(path)]
    for index, entry in enumerate(listing):
        if not isinstance(entry, dict):
            problems.append('%s: entry %d is not an object' % (os.path.relpath(path), index + 1))
    data = {'defaults': strip_comments(config.get('defaults', {})),
            'fixture': strip_comments(config.get('fixtures', [])),
            'scenario': strip_comments([e for e in listing if isinstance(e, dict)])}
    defaults = dict(DEFAULTS)
    for key, value in data.get('defaults', {}).items():
        if key not in DEFAULTS:
            problems.append('defaults: unknown key "%s"' % key)
        defaults[key] = value
    for probe in defaults['probe']:
        problems += lint_probe('defaults', probe)

    fixtures = []
    for fixture in data.get('fixture', []):
        where = 'fixture "%s"' % fixture.get('name')
        for key in fixture:
            if key not in ('name', 'route', 'probe', 'pattern', 'steps'):
                problems.append('%s: unknown key "%s"' % (where, key))
        if not fixture.get('name') or not fixture.get('route'):
            problems.append('%s: needs name and route' % where)
        if not (fixture.get('probe') or fixture.get('pattern')):
            problems.append('%s: needs probe or pattern' % where)
        if fixture.get('probe'):
            problems += lint_probe(where, fixture['probe'])
        fixtures.append(fixture)

    scenarios, seen = [], set()
    for raw in data.get('scenario', []):
        name = raw.get('name')
        where = 'scenario "%s"' % name
        if not name or not re.match(r'^[A-Za-z0-9_\-]+$', name):
            problems.append('%s: needs a [A-Za-z0-9_-] name' % where)
        if name in seen:
            problems.append('%s: duplicate name' % where)
        seen.add(name)
        if not str(raw.get('route', '')).startswith('#'):
            problems.append('%s: route must start with "#"' % where)
        for key in raw:
            if key not in SCENARIO_KEYS:
                problems.append('%s: unknown key "%s"' % (where, key))
        for i, step in enumerate(raw.get('steps', [])):
            problems += lint_step('%s step %d' % (where, i + 1), step)
        for probe in raw.get('probe', []):
            problems += lint_probe(where, probe)
        for layer in raw.get('ignore', []):
            if layer.split(':')[0] not in LAYERS + ['probe']:
                problems.append('%s: cannot ignore unknown layer "%s"' % (where, layer))
        for mock in raw.get('mock', []):
            if not str(mock.get('path', '')).startswith('/'):
                problems.append('%s: mock needs a path starting with "/"' % where)
            for key in mock:
                if key not in MOCK_KEYS:
                    problems.append('%s: unknown mock key "%s"' % (where, key))
        tables = {}
        for table in ('expect', 'expect_new'):
            tables[table] = raw.get(table, {})
            if not isinstance(tables[table], dict):
                problems.append('%s: %s must be a table of "<probe>" = value' % (where, table))
                tables[table] = {}
            for probe, wanted in tables[table].items():
                problems += lint_probe(where + ' ' + table, probe)
                if isinstance(wanted, dict):
                    if len(wanted) != 1 or list(wanted)[0] not in EXPECT_OPERATORS:
                        problems.append('%s: %s "%s" needs exactly one operator of %s'
                                        % (where, table, probe, ', '.join(EXPECT_OPERATORS)))
                    elif list(wanted)[0] == 'matches':
                        try:
                            re.compile(wanted['matches'])
                        except re.error as error:
                            problems.append('%s: %s "%s": bad regex (%s)' % (where, table, probe, error))
        if tables['expect_new'] and not raw.get('xfail'):
            problems.append('%s: expect_new pins an approved change: it needs xfail = "<reason>"' % where)
        expect, expect_new = tables['expect'], tables['expect_new']
        if not isinstance(raw.get('storage', {}), dict):
            problems.append('%s: storage must be a table of key = "value"' % where)
        if raw.get('pixels', 'strict') not in ('strict', 'loose', 'off'):
            problems.append('%s: pixels must be strict, loose or off' % where)
        if raw.get('api', 'ordered') not in ('ordered', 'unordered', 'off'):
            problems.append('%s: api must be ordered, unordered or off' % where)

        scenario = dict(defaults)
        scenario.update(raw)
        scenario['probe'] = list(defaults['probe']) + [p for p in raw.get('probe', []) if p not in defaults['probe']]
        # NB expected probes are evaluated (and compared old vs new) like any other
        scenario['probe'] += [p for p in list(expect) + list(expect_new) if p not in scenario['probe']]
        scenario['expect'] = expect
        scenario['expect_new'] = expect_new
        scenario['ignore'] = list(defaults['ignore']) + list(raw.get('ignore', []))
        scenario.setdefault('steps', [])
        scenario.setdefault('tags', [])
        scenario.setdefault('mock', [])
        scenario.setdefault('storage', {})
        if raw.get('tooltips') is False:
            scenario['storage'] = dict(QUIET_TOOLTIPS, **scenario['storage'])
        scenarios.append(scenario)
    return scenarios, fixtures, problems


def lint_step(where, step):
    kinds = [k for k in step if k in STEP_KINDS]
    if len(kinds) != 1:
        return ['%s: exactly one action expected among %s, got %s' % (where, '/'.join(STEP_KINDS), sorted(step))]
    unknown = [k for k in step if k not in STEP_KINDS and k not in STEP_OPTIONS]
    problems = ['%s: unknown option "%s"' % (where, k) for k in unknown]
    kind = kinds[0]
    if kind == 'type' and 'text' not in step:
        problems.append('%s: type needs text' % where)
    if kind == 'fill' and 'text' not in step:
        problems.append('%s: fill needs text' % where)
    if kind in ('wait', 'scroll_y') and not isinstance(step[kind], int):
        problems.append('%s: %s needs an integer' % (where, kind))
    return problems


def lint_probe(where, probe):
    if not isinstance(probe, str):
        return ['%s: probe must be a string, got %r' % (where, probe)]
    kind, _, rest = probe.partition(':')
    if kind not in PROBE_KINDS:
        return ['%s: unknown probe kind "%s" in "%s" (known: %s)' % (where, kind, probe, ', '.join(sorted(PROBE_KINDS)))]
    needs_selector, needs_arg = PROBE_KINDS[kind]
    if needs_selector and not rest:
        return ['%s: probe "%s" needs a selector' % (where, probe)]
    if needs_arg and '@' not in rest:
        return ['%s: probe "%s" needs @argument' % (where, probe)]
    return []


def select(scenarios, only=None, tags=None):
    selected = scenarios
    if only:
        patterns = [p.strip() for p in only.split(',') if p.strip()]
        selected = [s for s in selected if any(fnmatch.fnmatch(s['name'], p) for p in patterns)]
        for pattern in patterns:
            if not any(fnmatch.fnmatch(s['name'], pattern) for s in scenarios):
                die('no scenario matches "%s"' % pattern)
    if tags:
        wanted = set(t.strip() for t in tags.split(','))
        selected = [s for s in selected if wanted & set(s['tags'])]
    return selected


def total_virtual_ms(scenario):
    ms = scenario['boot'] + scenario['settle']
    for step in scenario['steps']:
        if 'wait' in step:
            ms += step['wait']
        elif 'wait_for' in step or 'wait_gone' in step:
            ms += step.get('timeout', scenario['wait_for_timeout'])
        else:
            ms += step.get('after', scenario['step_after'])
    return ms


def packed_scenario(scenario):
    """The scenario as the in-page (synthetic) executor of harness.js sees it."""
    payload = {
        'steps': scenario['steps'],
        'probe': scenario['probe'],
        'storage': scenario.get('storage', {}),
        'timing': {k: scenario[k] for k in ('boot', 'step_after', 'wait_for_timeout', 'settle')},
    }
    raw = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    return base64.urlsafe_b64encode(raw).decode('ascii')


# ----------------------------------------------------------------------------
# shared setup
# ----------------------------------------------------------------------------

def build_new_bundle():
    print('building the new bundle...')
    try:
        subprocess.check_call([sys.executable, os.path.join(ROOT, 'deploy', 'build_js.py')],
                              stdout=subprocess.DEVNULL, timeout=300)
    except subprocess.TimeoutExpired:
        die('deploy/build_js.py did not finish within 300 s')


def ensure_reference(url=OLD_URL, expected_sha1=OLD_SHA1):
    os.makedirs(os.path.join(HERE, 'reference'), exist_ok=True)
    reference = os.path.join(HERE, 'reference', 'ermac_old.min.js')
    if not os.path.exists(reference):
        print('fetching the OLD reference bundle from', url, '...')
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        if expected_sha1 and hashlib.sha1(data).hexdigest() != expected_sha1:
            die('the downloaded reference has sha1 %s, expected %s: refusing to use it'
                % (hashlib.sha1(data).hexdigest(), expected_sha1))
        with open(reference, 'wb') as f:
            f.write(data)
    with open(reference, 'rb') as f:
        sha1 = hashlib.sha1(f.read()).hexdigest()
    if expected_sha1 and sha1 != expected_sha1:
        die('parity/reference/ermac_old.min.js has sha1 %s, expected %s (the pinned '
            'specification); delete it to re-fetch, or pass --reference-sha1 to move '
            'the specification deliberately' % (sha1, expected_sha1))
    print('reference bundle: %d bytes, sha1 %s (pinned)' % (os.path.getsize(reference), sha1[:12]))


def load_proxy_module():
    """deploy/dev_api_proxy.py: its response cache format is shared by both drivers."""
    spec = importlib.util.spec_from_file_location('dev_api_proxy', os.path.join(ROOT, 'deploy', 'dev_api_proxy.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalize_request(method, path, body=None, content_type=None):
    """A comparable one-line description of an API request."""
    path, _, query = path.partition('?')
    pairs = sorted(query.split('&')) if query else []
    line = method + ' ' + path + '?' + '&'.join(pairs)
    if method == 'POST':
        body = body or b''
        text = body.decode('utf-8', 'replace')
        if (content_type or '').startswith('application/x-www-form-urlencoded'):
            text = '&'.join(sorted(text.split('&'))) if text else ''
        line += ' [%s] %s' % ((content_type or '-').split(';')[0], text[:400])
    return line


# ----------------------------------------------------------------------------
# driver: playwright
# ----------------------------------------------------------------------------

class PlaywrightDriver(object):
    """Native input, request interception, fake clock: no sockets needed."""

    name = 'playwright'

    def __init__(self, browser_path=None, browser_args=(), synthetic=False, live=False, defer_close=False):
        from playwright.sync_api import sync_playwright
        self.synthetic = synthetic
        self.live = live
        # NB in the worker, the browser is closed AFTER the result is sent: a
        # browser that does not close then costs a worker, not the result
        self.defer_close = defer_close
        self._pending_close = []
        self.proxy = load_proxy_module()
        self._pw = sync_playwright().start()
        self.launch = {'headless': True, 'args': list(browser_args)}
        if browser_path:
            self.launch['executable_path'] = browser_path

    def close_pending(self):
        while self._pending_close:
            try:
                self._pending_close.pop().close()
            except Exception:
                pass

    def close(self):
        self.close_pending()
        self._pw.stop()

    # -- network ------------------------------------------------------------

    def _static(self, route, request):
        path = urllib.parse.unquote(urllib.parse.urlsplit(request.url).path)
        candidates = [os.path.join(ROOT, path.lstrip('/'))]
        if path.startswith('/parity/'):
            # NB app_folder is /parity on the harness pages: shared assets resolve to the root
            candidates.append(os.path.join(ROOT, path[len('/parity/'):]))
        for candidate in candidates:
            candidate = os.path.normpath(candidate)
            if candidate.startswith(ROOT) and os.path.isfile(candidate):
                with open(candidate, 'rb') as f:
                    body = f.read()
                ctype = mimetypes.guess_type(candidate)[0] or 'application/octet-stream'
                return route.fulfill(status=200, body=body, headers={'Content-Type': ctype})
        route.fulfill(status=404, body=b'not found', headers={'Content-Type': 'text/plain'})

    def _api(self, route, request, run):
        url = request.url
        path = url[len(API_ORIGIN):] or '/'
        method = request.method
        origin = request.headers.get('origin', GUI_ORIGIN)
        cors = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true'}
        if method == 'OPTIONS':
            cors.update({'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                         'Access-Control-Allow-Headers': 'Content-Type'})
            return route.fulfill(status=200, body=b'', headers=cors)
        body = request.post_data_buffer if method == 'POST' else None
        content_type = request.headers.get('content-type')
        line = normalize_request(method, path, body, content_type)
        # NB fire-and-forget anonymous IP login: kept out of the comparison,
        # exactly as in the proxy-based driver
        if not path.startswith('/users/ip'):
            run['api'].append(line)

        for mock in run['mock']:
            if path.split('?')[0].startswith(mock['path']) and mock.get('method', method) == method:
                if mock.get('abort'):
                    return route.abort('connectionrefused')
                payload = json.dumps(mock['json']) if 'json' in mock else mock.get('body', '')
                headers = dict(cors)
                headers['Content-Type'] = 'application/json'
                return route.fulfill(status=mock.get('status', 200), body=payload, headers=headers)

        self.proxy.CACHE_DIR = run['cache']
        # NB the cache keys of deploy/dev_api_proxy.py: both drivers share one cache
        key = self.proxy.cache_key_path(method, path, body)
        cached = None if self.live else self.proxy.cache_lookup(method, key)
        if cached is None:
            headers = {k: v for k, v in (('Content-Type', content_type),
                                          ('Accept-Language', request.headers.get('accept-language')))
                       if v}
            progress('API %s %s' % (method, path[:120]))
            # NB redirects are NOT followed, exactly as in deploy/dev_api_proxy.py
            status, response_headers, payload = self.proxy.fetch_remote(method, path, body, headers)
            # NB a transport failure (502, no headers) carries a JSON error payload
            ctype = (response_headers or {}).get('Content-Type', '') or ('application/json' if status == 502 else '')
            location = (response_headers or {}).get('Location', '')
            # NB transient failures must not become permanent in the replay cache
            if self.proxy.cacheable(status):
                self.proxy.cache_store(method, key, status, ctype, payload, location)
            cached = (status, ctype, payload, location)
        status, ctype, payload, location = cached
        headers = dict(cors)
        if ctype:
            headers['Content-Type'] = ctype
        if location:
            headers['Location'] = self.proxy.local_location(location, path, API_ORIGIN)
        route.fulfill(status=status, body=payload, headers=headers)

    def _external(self, route, request, run):
        # NB external assets (thumbnails, ptable SVGs, ...) fail identically on both sides.
        # Images are not logged: <img loading="lazy"> fetches depend on the browser
        # build's lazy-load distance, not on the app; their URLs are compared via the DOM
        if request.resource_type != 'image':
            run['ext'].append(request.method + ' ' + request.url)
        route.abort('connectionrefused')

    # -- virtual time -------------------------------------------------------

    def _idle(self, page, run, limit=30.0):
        """Wait for the pending requests, at most `limit` s per call and
        IDLE_BUDGET s per side in total: a request that never completes must
        not cost `limit` seconds again at every virtual-time chunk."""
        if not run['inflight']:
            return
        started = time.time()
        deadline = started + min(limit, run['idle_left'])
        reported = started
        while run['inflight'] and time.time() < deadline:
            page.wait_for_timeout(10)
            if time.time() - reported > 2:
                reported = time.time()
                pending = sorted(q.url for q in list(run['inflight']))
                progress('waiting %.0f s for %d request(s): %s' % (reported - started, len(pending),
                                                                  pending[0][:120] if pending else '?'))
        run['idle_left'] -= time.time() - started
        if run['inflight']:
            run['notes'].append('network not idle after %.0fs (%d in flight: %s)%s' % (
                time.time() - started, len(run['inflight']),
                ', '.join(sorted(q.url for q in list(run['inflight'])))[:200],
                '; idle budget exhausted' if run['idle_left'] <= 0 else ''))
            run['inflight'].clear()

    def _vrun(self, page, run, ms, chunk=50):
        """Advance the fake clock by ms, pausing it while network fetches are pending
        (the same policy as Chrome's --virtual-time-budget)."""
        elapsed = 0
        while elapsed < ms:
            self._idle(page, run)
            step = min(chunk, ms - elapsed)
            page.clock.run_for(step)
            page.wait_for_timeout(2)
            elapsed += step

    # -- steps --------------------------------------------------------------

    def _native_step(self, page, run, scenario, step):
        kind = [k for k in step if k in STEP_KINDS][0]
        target = step[kind]
        nth = step.get('nth', 0)
        timeout = 5000

        def locate(selector):
            if page.locator(selector).count() <= nth:
                return None
            return page.locator(selector).nth(nth)

        if kind == 'wait':
            self._vrun(page, run, step['wait'])
            return 'ok'
        if kind in ('wait_for', 'wait_gone'):
            limit, waited = step.get('timeout', scenario['wait_for_timeout']), 0
            while True:
                present = page.locator(target).count() > 0
                if present == (kind == 'wait_for'):
                    self._vrun(page, run, 50)
                    return 'ok'
                if waited > limit:
                    return 'timeout'
                self._vrun(page, run, 100)
                waited += 100

        if kind == 'hash':
            page.evaluate('h => { location.hash = h; }', target)
        elif kind == 'back':
            page.evaluate('() => history.back()')
        elif kind == 'scroll_y':
            page.evaluate('y => window.scrollTo(0, y)', target)
        elif kind == 'eval':
            page.evaluate('js => (0, eval)(js)', target)
        elif kind == 'key':
            # NB the key is held KEY_HOLD_MS like a person does: what keydown
            # triggers (e.g. a hashchange route) runs before keyup, instead of
            # racing it (back-to-back CDP keydown/keyup)
            if step.get('on'):
                el = page.locator(step['on'])
                if el.count() <= nth:
                    return 'missing'
                el.nth(nth).press(target, timeout=timeout, delay=KEY_HOLD_MS)
            else:
                page.keyboard.press(target, delay=KEY_HOLD_MS)
        elif kind == 'blur' and target is True:
            page.evaluate('() => document.activeElement && document.activeElement.blur()')
        else:
            el = locate(target)
            if el is None:
                return 'missing'
            if kind == 'click':
                el.click(timeout=timeout)
            elif kind == 'dblclick':
                el.dblclick(timeout=timeout)
            elif kind == 'mousedown':
                el.dispatch_event('mousedown')
            elif kind == 'hover':
                el.hover(timeout=timeout)
            elif kind == 'focus':
                el.focus(timeout=timeout)
            elif kind == 'blur':
                el.blur(timeout=timeout)
            elif kind == 'type':
                if step.get('clear'):
                    el.fill('', timeout=timeout)
                el.focus(timeout=timeout)
                el.press_sequentially(str(step['text']), timeout=timeout)
            elif kind == 'fill':
                el.fill(str(step['text']), timeout=timeout)
            elif kind == 'check':
                el.check(timeout=timeout)
            elif kind == 'uncheck':
                el.uncheck(timeout=timeout)
            elif kind == 'scroll':
                el.scroll_into_view_if_needed(timeout=timeout)
        self._vrun(page, run, step.get('after', scenario['step_after']))
        return 'ok'

    # -- a side run ---------------------------------------------------------

    def run(self, side, scenario, route_str, side_dir, cache_dir, budget=None):
        import datetime
        run = {'api': [], 'ext': [], 'inflight': set(), 'notes': [], 'cache': cache_dir,
               'mock': scenario.get('mock', []), 'idle_left': IDLE_BUDGET}
        progress('launching the browser')
        width, height = scenario['viewport']
        # NB a fresh browser per side run: a clean profile (no localStorage
        # carry-over), and single-process builds cannot close contexts
        try:
            browser = self._pw.chromium.launch(**self.launch)
        except Exception as error:
            if "Executable doesn't exist" in str(error) or 'playwright install' in str(error):
                die("playwright is installed but its Chromium is not: run\n"
                    "  %s -m playwright install chromium\n"
                    "(or point PARITY_BROWSER / --browser at a Chromium executable)\n%s"
                    % (sys.executable, str(error).strip().split('\n')[0]))
            raise
        context = browser.new_context(
            viewport={'width': width, 'height': height}, device_scale_factor=1,
            locale='en-US', timezone_id='UTC')
        try:
            context.route('**/*', lambda r, q: self._external(r, q, run))
            context.route(API_ORIGIN + '/**', lambda r, q: self._api(r, q, run))
            context.route(GUI_ORIGIN + '/**', self._static)
            context.on('request', lambda q: run['inflight'].add(q))
            context.on('requestfinished', lambda q: run['inflight'].discard(q))
            context.on('requestfailed', lambda q: run['inflight'].discard(q))
            if scenario.get('storage'):
                # NB init scripts run in EVERY document of the page; frames with an
                # opaque origin have no localStorage (and would throw a pageerror)
                context.add_init_script(
                    'if (location.origin === %s) { var s = %s; '
                    'for (var k in s) window.localStorage.setItem(k, s[k]); }'
                    % (json.dumps(GUI_ORIGIN), json.dumps(scenario['storage'])))
            page = context.new_page()
            # NB no Playwright call may wait forever (evaluate() itself has no
            # timeout: a renderer stuck in JS is the watchdog's job)
            page.set_default_timeout(30000)
            page.set_default_navigation_timeout(120000)
            page_errors = []
            page.on('pageerror', lambda e: page_errors.append(str(e)))

            # NB fake clock with a fixed epoch: timers only fire when the
            # driver advances virtual time, identically on both sides.
            # NB pause_at must stay AHEAD of the running fake clock: after
            # install(time=t0) the clock ticks in real time, and the RPC
            # roundtrip already puts it past t0 + 1ms ("fast-forward to the
            # past" crash), hence a comfortable 1s margin below
            t0 = datetime.datetime(2026, 1, 15, 12, 0, 0, tzinfo=datetime.timezone.utc)
            page.clock.install(time=t0)
            page.clock.pause_at(t0 + datetime.timedelta(seconds=1))

            query = ('?p=' + packed_scenario(scenario)) if self.synthetic else ''
            url = '%s/parity/%s.html%s%s' % (GUI_ORIGIN, side, query, route_str)
            progress('loading %s' % (route_str or '/'))
            page.goto(url, wait_until='load', timeout=120000)

            try:
                kinds = page.evaluate('() => window.__parity && window.__parity.kinds')
            except Exception:
                kinds = None  # NB the app navigated away during boot
            if kinds is not None and set(kinds) != set(PROBE_KINDS):
                die('harness.js and run_parity.py disagree on probe kinds: %s' % sorted(set(kinds) ^ set(PROBE_KINDS)))

            if self.synthetic:
                self._vrun(page, run, budget or total_virtual_ms(scenario) + 2000)
                raw = page.evaluate("() => { var n = document.getElementById('__parity_result'); return n ? n.textContent : null; }")
                result = json.loads(raw) if raw else {'steps': ['harness did not finish'], 'errors': [], 'probes': {}}
            else:
                progress('boot (%d virtual ms)' % scenario['boot'])
                self._vrun(page, run, scenario['boot'])
                steps_log = []
                for index, step in enumerate(scenario['steps']):
                    if steps_log and steps_log[-1] != 'ok':
                        steps_log.append('skipped')
                        continue
                    progress('step %d/%d: %s' % (index + 1, len(scenario['steps']), step_label(scenario, index)))
                    try:
                        outcome = self._native_step(page, run, scenario, step)
                    except Exception as error:
                        outcome = 'error: ' + str(error).split('\n')[0][:120]
                    steps_log.append(outcome)
                progress('settle (%d virtual ms)' % scenario['settle'])
                self._vrun(page, run, scenario['settle'])
                progress('capturing the probes')
                try:
                    result = page.evaluate(
                        '(probes) => ({probes: window.__parity.probe(probes), errors: window.__parity.errors.slice()})',
                        scenario['probe'])
                except Exception:
                    # NB the app left the harness page (e.g. a redirect to mpds.io)
                    result = {'probes': {p: 'UNAVAILABLE: page left' for p in scenario['probe']}, 'errors': []}
                result['steps'] = steps_log
            result.setdefault('probes', {})['(url)'] = re.sub(r'\b(old|new)\.html\b', 'app.html', page.url)

            # NB uncaught errors are seen by both the harness and Playwright: de-duplicate
            for error in page_errors:
                if not any(error.split('\n')[0] in e for e in result['errors']):
                    result['errors'].append('pageerror: ' + error.split('\n')[0])
            progress('capturing the DOM and the screenshot')
            dom = page.content()
            shot = os.path.join(side_dir, side + '.png')
            page.screenshot(path=shot, timeout=60000, animations='allow', caret='hide')
            return {'dom': dom, 'shot': shot, 'api': run['api'], 'ext': sorted(run['ext']),
                    'result': result, 'notes': run['notes']}
        finally:
            if self.defer_close:
                self._pending_close.append(browser)
            else:
                try:
                    browser.close()
                except Exception:
                    pass


# ----------------------------------------------------------------------------
# driver: chrome-cli (the original approach: real servers + proxy)
# ----------------------------------------------------------------------------

class ChromeCliDriver(object):
    """google-chrome --dump-dom with --virtual-time-budget; synthetic in-page steps."""

    name = 'chrome-cli'
    synthetic = True

    def __init__(self, browser_path=None, browser_args=()):
        self.chrome = browser_path or find_chrome()
        self.browser_args = list(browser_args)
        for label, port in (('static server', GUI_PORT), ('API proxy', API_PORT)):
            if not port_free(port):
                die('port %d is busy (%s): stop the leftover process first' % (port, label))
        stale = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout
        stale_chrome = [l for l in stale.splitlines() if 'headless' in l and 'parity/out/profile' in l]
        if stale_chrome:
            die('stale headless chrome processes hold the parity profiles: ' + '; '.join(stale_chrome)[:300])
        # NB shared assets under parity/ (app_folder is /parity for the harness pages)
        for name in ('webassets', 'labs', 'oauth', 'crystvis', 'ermac.min.js'):
            link, target = os.path.join(HERE, name), os.path.join(ROOT, name)
            if os.path.islink(link) and os.readlink(link) != target:
                os.remove(link)
            if not os.path.exists(link):
                os.symlink(target, link)
        self.server = subprocess.Popen([sys.executable, '-m', 'http.server', str(GUI_PORT)],
                                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wait_for_port(GUI_PORT, 5)

    def close(self):
        self.server.terminate()
        self.server.wait()

    def run(self, side, scenario, route_str, side_dir, cache_dir, budget=None):
        if scenario.get('mock'):
            raise NotSupported('API mocks need the playwright driver')
        log_path = os.path.join(side_dir, side + '-api.log')
        log = open(log_path, 'w')
        proxy = subprocess.Popen([sys.executable, '-u', os.path.join(ROOT, 'deploy', 'dev_api_proxy.py'),
                                  '--cache', cache_dir], stdout=log, stderr=subprocess.STDOUT)
        try:
            wait_for_port(API_PORT, 5)
            url = '%s/parity/%s.html?p=%s%s' % (GUI_ORIGIN, side, packed_scenario(scenario), route_str)
            dom_path = os.path.join(side_dir, side + '-dom.html')
            shot = os.path.join(side_dir, side + '.png')
            self._chrome(url, dom_path, shot, os.path.join(OUT, 'profile-' + side),
                         budget or total_virtual_ms(scenario) + 5000, scenario['viewport'])
        finally:
            time.sleep(0.3)
            proxy.terminate()
            proxy.wait()
            log.close()
        with open(dom_path, encoding='utf-8', errors='replace') as f:
            dom = f.read()
        match = re.search(r'<script type="application/json" id="__parity_result">(.*?)</script>', dom, re.S)
        result = json.loads(match.group(1)) if match else {'steps': ['harness did not finish'], 'errors': [], 'probes': {}}
        return {'dom': dom, 'shot': shot, 'api': parse_proxy_log(log_path), 'ext': [],
                'result': result, 'notes': []}

    def _chrome(self, url, dom_path, shot_path, user_data_dir, budget, viewport, attempts=3):
        cmd = [self.chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
               '--window-size=%d,%d' % tuple(viewport), '--force-device-scale-factor=1',
               '--default-background-color=FFFFFFFF',
               '--host-resolver-rules=MAP mpds.io 127.0.0.1, MAP *.mpds.io 127.0.0.1',
               '--disk-cache-size=1', '--media-cache-size=1', '--user-data-dir=' + user_data_dir,
               '--virtual-time-budget=%d' % budget, '--screenshot=' + shot_path, '--dump-dom'
               ] + self.browser_args + [url]
        last_error = None
        for attempt in range(attempts):
            for _ in range(4):
                if not os.path.exists(user_data_dir):
                    break
                shutil.rmtree(user_data_dir, ignore_errors=True)
                time.sleep(0.5)
            try:
                result = subprocess.run(cmd, capture_output=True, timeout=300)
                with open(dom_path, 'wb') as f:
                    f.write(result.stdout)
                if os.path.exists(shot_path) and len(result.stdout) > 10000:
                    return
                last_error = IOError('incomplete capture (dom %d bytes)' % len(result.stdout))
            except subprocess.TimeoutExpired as error:
                last_error = error
            print('    (chrome attempt %d failed (%s), retrying)' % (attempt + 1, last_error))
        die('chrome failed for %s: %s' % (url, last_error))


class NotSupported(Exception):
    pass


def parse_proxy_log(log_path):
    requests = []
    with open(log_path) as f:
        for line in f:
            if not line.startswith('proxy: '):
                continue
            match = re.search(r'"(GET|POST|HEAD) (\S+)', line)
            if not match:
                continue
            method, target = match.group(1), re.sub(r' HTTP/\d\.\d$', '', match.group(2))
            if target.startswith('/users/ip'):
                continue
            requests.append(normalize_request(method, target))
    return requests


def port_free(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False


def wait_for_port(port, timeout):
    import socket
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.2)
            try:
                s.connect(('127.0.0.1', port))
                return
            except OSError:
                time.sleep(0.05)
    die('port %d did not open in time' % port)


# ----------------------------------------------------------------------------
# comparison layers
# ----------------------------------------------------------------------------

def region(html, open_pattern, close_pattern='</ul>'):
    match = re.search(open_pattern + r'(.*?)' + close_pattern, html, re.S)
    return collapse(match.group(1)) if match else None


def collapse(text):
    return re.sub(r'\s+', ' ', text).strip()


def short_md5(text):
    return None if text is None else hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


def outer_of(html, element_id):
    match = re.search(r'<[^>]*id="%s"[^>]*>.*?(?=<div id="footer"|</body>)' % element_id, html, re.S)
    return collapse(match.group(0))[:600] if match else None


def extract_semantics(html):
    """The legacy semantic DOM keys of the original parity suite (unchanged)."""
    html = re.sub(r'<script type="application/json" id="__parity_result">.*?</script>', '', html, flags=re.S)
    html = html.replace('old.html', 'app.html').replace('new.html', 'app.html')
    keys = {}

    def set_key(name, value):
        if value is not None:
            keys[name] = value

    match = re.search(r'<title>(.*?)</title>', html, re.S)
    set_key('title', match.group(1) if match else '')
    match = re.search(r'<body class="([^"]*)"', html)
    set_key('body_class', match.group(1) if match else '')
    set_key('notifybox', region(html, r'<div id="notifybox"[^>]*>', r'</div>'))
    match = re.search(r'<div id="notifybox" style="([^"]*)"', html)
    set_key('notifybox_display', match.group(1) if match else '')
    set_key('interpret', region(html, r'<ul id="interpret">'))
    match = re.search(r'<table id="databrowser" class="([^"]*)"', html)
    set_key('databrowser_class', match.group(1) if match else '')
    set_key('databrowser_ids', ' '.join(re.findall(r'id="(e__[^"]*)"', html)))
    set_key('databrowser_md5', short_md5(region(html, r'<table id="databrowser"[^>]*>', '</table>')))
    set_key('multiselect_items', ' | '.join(
        a + ':' + b for a, b in re.findall(r'data-facet="([^"]*)" data-term="([^"]*)"', html)))
    match = re.search(r'id="search_field-selectized"[^>]*value="([^"]*)"', html)
    set_key('search_input_rest', match.group(1) if match else '')
    set_key('refine_links', ' '.join(collapse(a) for a in re.findall(
        r'<li class="(?:new_rfn_facet )?fct_\w+"><a href="(#[^"]*)">', html)))
    examples = re.findall(r'<a href="(#[^"]*)">', region(html, r'<div id="examples" class="examples">') or '')
    set_key('examples_shape', '%d links, all valid: %s' % (
        len(examples), all(link.startswith('#search/') for link in examples)))
    set_key('history_links', ' '.join(re.findall(r'<a href="(#[^"]*)">', region(html, r'<div id="history">') or '')))
    for element in ['entryno', 'ind_title', 'phase_info', 'sim_legend', 'own_phase', 'ind_link']:
        set_key(element, outer_of(html, element))
    set_key('d_icon_hrefs', ' '.join(re.findall(r'<a rel="\w+" href="([^"]*)" target="_blank"', html)))
    set_key('iframe_srcs', ' | '.join(re.findall(r'<iframe[^>]* src="([^"]*)"', html)))
    set_key('active_controls', ' '.join(sorted(
        m[0] + '=' + (m[1] or '') for m in re.findall(r'<div id="(control_[a-f])"(?: class="([^"]*)")?', html))))
    for element, pattern in [
        ('header_entries', r'<div id="header_entries" style="([^"]*)"'),
        ('header_phases', r'<div id="header_phases" style="([^"]*)"'),
        ('header_articles', r'<div id="header_articles" style="([^"]*)"'),
        ('phases_ctx', r'<div id="phases_ctx" style="([^"]*)"'),
        ('dtypes_phid_box', r'<div id="dtypes_phid" style="([^"]*)"'),
        ('ind_col', r'<div id="ind_col" class="[^"]*" style="([^"]*)"'),
        ('ctx_col', r'<div id="ctx_col" class="[^"]*" style="([^"]*)"'),
        ('sim_col', r'<div id="sim_col" class="[^"]*" style="([^"]*)"'),
        ('hy_box', r'<div id="hy_box"[^>]*style="([^"]*)"'),
        ('advsbox', r'<div id="advsbox"[^>]*style="([^"]*)"'),
        ('loginbox', r'<div id="loginbox"[^>]*style="([^"]*)"'),
        ('overlay', r'<div id="overlay" style="([^"]*)"'),
        ('toomuch', r'<div id="toomuch" class="context_msg" style="([^"]*)"'),
        ('plthint', r'<div id="plthint" class="context_msg" style="([^"]*)"'),
        ('apihint', r'<div id="apihint" class="context_msg" style="([^"]*)"'),
        ('loadscroll', r'<div id="loadscroll" class="context_msg" style="([^"]*)"'),
        ('numericbox', r'<div id="numericbox" style="([^"]*)"'),
    ]:
        match = re.search(pattern, html)
        set_key(element + '_display', match.group(1) if match else 'ABSENT')
    set_key('numericbox_md5', short_md5(region(html, r'<div id="numericbox">', r'</div>\s*<div id="footer"')))
    for hierarchy in ['hy_scalars', 'hy_complex', 'hy_arrays']:
        set_key(hierarchy + '_md5', short_md5(region(html, r'<div id="%s" class="hy_tabs[^>]*>' % hierarchy)))
    set_key('polyhedra_md5', short_md5(region(html, r'<div id="all_polyhedra_content">')))
    set_key('header_th', ' '.join(re.findall(r'<th class="([^"]*)"', html)))
    return keys


def compare_pixels(old_path, new_path, diff_path):
    if not PIL_AVAILABLE:
        return None, 'Pillow not available'
    old_img = Image.open(old_path).convert('RGB')
    new_img = Image.open(new_path).convert('RGB')
    if old_img.size != new_img.size:
        return 1.0, 'size mismatch: %s vs %s' % (old_img.size, new_img.size)
    diff = ImageChops.difference(old_img, new_img)
    # NB a pixel differs when ANY channel exceeds the tolerance: threshold
    # every band, then combine them (a plain .convert('L') of the
    # thresholded image would count only pixels differing in all channels)
    red, green, blue = [band.point(lambda p: 255 if p > TOL else 0) for band in diff.split()]
    mask = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    fraction = mask.histogram()[255] / float(old_img.size[0] * old_img.size[1])
    if diff.getbbox():
        overlay = new_img.copy()
        overlay.paste(Image.new('RGB', old_img.size, (255, 0, 0)), mask)
        Image.blend(new_img, overlay, 0.5).save(diff_path)
    elif os.path.exists(diff_path):
        os.remove(diff_path)
    return fraction, None


def ignored(scenario, layer, key=None):
    ignore = scenario['ignore']
    return layer in ignore or (key is not None and '%s:%s' % (layer, key) in ignore)


def compare(scenario, old, new, pixels_enabled, side_dir):
    """Returns {layer: [difference descriptions]} and vacuity warnings."""
    diffs, warnings = {}, []

    if scenario['api'] != 'off' and not ignored(scenario, 'api'):
        a, b = old['api'], new['api']
        if scenario['api'] == 'unordered':
            a, b = sorted(a), sorted(b)
        if a != b:
            diffs['api'] = multiset_diff(old['api'], new['api']) or ['same requests, different order']
    if not ignored(scenario, 'ext') and old['ext'] != new['ext']:
        diffs['ext'] = multiset_diff(old['ext'], new['ext'])

    if scenario['semantics'] and not ignored(scenario, 'dom'):
        so, sn = extract_semantics(old['dom']), extract_semantics(new['dom'])
        keys = [k for k in sorted(set(so) | set(sn)) if so.get(k) != sn.get(k) and not ignored(scenario, 'dom', k)]
        if keys:
            diffs['dom'] = ['%s: OLD %r | NEW %r' % (k, clip(so.get(k)), clip(sn.get(k))) for k in keys]

    po, pn = old['result'].get('probes', {}), new['result'].get('probes', {})
    probe_diffs = []
    for probe in scenario['probe'] + ['(url)']:
        if ignored(scenario, 'probe', probe):
            continue
        if po.get(probe) != pn.get(probe):
            probe_diffs.append('%s: OLD %s | NEW %s' % (probe, clip(po.get(probe)), clip(pn.get(probe))))
        elif po.get(probe) is None and probe != '(url)':
            warnings.append('vacuous probe (null on both sides): ' + probe)
        elif isinstance(po.get(probe), str) and po[probe].startswith('PROBE ERROR'):
            warnings.append('%s -> %s' % (probe, po[probe]))
    if probe_diffs:
        diffs['probes'] = probe_diffs

    # absolute expectations: BOTH sides must meet them (a failing OLD side
    # means the data or the specification changed, not the refactoring)
    if not ignored(scenario, 'expect'):
        expect_diffs = []
        for probe, wanted in scenario.get('expect', {}).items():
            for side, captured in (('OLD', po), ('NEW', pn)):
                violation = check_expectation(captured.get(probe), wanted)
                if violation:
                    expect_diffs.append('%s %s %s' % (side, probe, violation))
        if expect_diffs:
            diffs['expect'] = expect_diffs
    # NEW-only expectations of an approved change (see the verdict: they make
    # an xfail scenario FAIL, otherwise it would be XFAIL whatever NEW does)
    if not ignored(scenario, 'expect_new'):
        new_diffs = []
        for probe, wanted in scenario.get('expect_new', {}).items():
            violation = check_expectation(pn.get(probe), wanted)
            if violation:
                new_diffs.append('NEW %s %s' % (probe, violation))
        if new_diffs:
            diffs['expect_new'] = new_diffs

    so, sn = old['result'].get('steps', []), new['result'].get('steps', [])
    if not ignored(scenario, 'steps') and so != sn:
        diffs['steps'] = ['step %d %s: OLD %s | NEW %s' % (i + 1, step_label(scenario, i), a, b)
                          for i, (a, b) in enumerate(zip(so, sn)) if a != b] or ['OLD %s | NEW %s' % (so, sn)]
    bad_old = [i for i, outcome in enumerate(so) if outcome != 'ok']
    if bad_old:
        warnings.append('the OLD side itself failed step %d %s (%s): the scenario does not exercise what it claims'
                        % (bad_old[0] + 1, step_label(scenario, bad_old[0]), so[bad_old[0]]))

    eo, en = old['result'].get('errors', []), new['result'].get('errors', [])
    if not ignored(scenario, 'errors') and len(en) > len(eo):
        diffs['errors'] = ['NEW side throws %d error(s), OLD side %d' % (len(en), len(eo))] + \
                          ['NEW: ' + e[:200] for e in en[:5]]

    fraction, note = None, 'skipped'
    if pixels_enabled and scenario['pixels'] != 'off' and not ignored(scenario, 'pixels'):
        fraction, note = compare_pixels(old['shot'], new['shot'], os.path.join(side_dir, 'pixel-diff.png'))
        if fraction is not None and scenario['pixels'] == 'strict' and fraction > scenario['pixel_threshold']:
            diffs['pixels'] = ['%.4f%% pixels differ (threshold %.3f%%)%s' % (
                fraction * 100, scenario['pixel_threshold'] * 100, (', ' + note) if note else '')]
    return diffs, warnings, fraction


def check_expectation(value, wanted):
    """None if value meets wanted, else a description of the violation."""
    operator, target = ('equals', wanted)
    if isinstance(wanted, dict):
        operator, target = list(wanted.items())[0]
    try:
        if operator == 'equals':
            ok = value == target
        elif operator == 'not':
            ok = value != target
        elif operator == 'contains':
            ok = value is not None and target in value
        elif operator == 'not_contains':
            ok = value is None or target not in value
        elif operator == 'matches':
            ok = isinstance(value, str) and re.search(target, value) is not None
        else:
            ok = isinstance(value, (int, float)) and not isinstance(value, bool) and {
                'gt': value > target, 'ge': value >= target,
                'lt': value < target, 'le': value <= target}[operator]
    except TypeError:
        ok = False
    if ok:
        return None
    return 'is %s, expected %s %s' % (clip(value), operator, clip(target))


def step_label(scenario, index):
    if index >= len(scenario['steps']):
        return ''
    step = scenario['steps'][index]
    kind = [k for k in step if k in STEP_KINDS][0]
    return '(%s %s)' % (kind, json.dumps(step[kind]))


def multiset_diff(old, new):
    remaining_new, out = list(new), []
    for item in old:
        if item in remaining_new:
            remaining_new.remove(item)
        else:
            out.append('only in OLD: ' + item[:220])
    out += ['only in NEW: ' + item[:220] for item in remaining_new]
    return out


def clip(value, limit=260):
    text = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else repr(value)
    return text if len(text) <= limit else text[:limit] + '...'


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def harvest_fixtures(driver, fixtures):
    """Run the fixture routes on the OLD side to harvest real ids (phid, bid, ...)."""
    values = {}
    for fixture in fixtures:
        fixture_dir = os.path.join(OUT, '_fixtures', fixture['name'])
        os.makedirs(fixture_dir, exist_ok=True)
        scenario = dict(DEFAULTS)
        scenario.update({'name': '_fixture_' + fixture['name'], 'route': fixture['route'],
                         'steps': fixture.get('steps', []),
                         'probe': [fixture['probe']] if fixture.get('probe') else []})
        side = driver.run('old', scenario, fixture['route'].format(**values), fixture_dir,
                          os.path.join(fixture_dir, 'api-cache'))
        value = None
        if fixture.get('probe'):
            value = side['result'].get('probes', {}).get(fixture['probe'])
        else:
            match = re.search(fixture['pattern'], side['dom'])
            value = match.group(1) if match else None
        if value in (None, '', []):
            die('could not extract fixture %s from the old side' % fixture['name'])
        values[fixture['name']] = value
    return values


# ----------------------------------------------------------------------------
# freeze protection: every Playwright side run happens in a worker process
# ----------------------------------------------------------------------------

class SideFrozen(Exception):
    pass


class WorkerDriver(object):
    """Runs the Playwright driver in a child process with its own process
    group, so that ANY freeze is bounded: a renderer stuck in JS, a CDP call
    that never returns, a request that never completes, a browser that does
    not close. The worker streams progress; no progress for `stall` seconds,
    or more than `cap` seconds for one side, kills the whole group (worker,
    Playwright's node driver and, through its SIGTERM handler, Chromium) and
    the side raises SideFrozen. The next side gets a fresh worker."""

    name = 'playwright'
    HEARTBEAT = 15  # s between "still running" lines
    CLOSE_TIMEOUT = 20  # s for the worker to close the previous browser

    def __init__(self, config, stall, cap):
        self.config = config
        self.synthetic = config['synthetic']
        self.stall, self.cap = stall, cap
        self.proc, self.lines, self.awaiting_ready = None, None, False

    def _start(self):
        self.proc = subprocess.Popen(
            [sys.executable, '-u', os.path.abspath(__file__), '--_worker', json.dumps(self.config)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=None,
            start_new_session=True, text=True, encoding='utf-8', bufsize=1)
        self.lines = queue.Queue()

        def reader(stream, sink):
            for line in stream:
                try:
                    sink.put(json.loads(line))
                except ValueError:
                    pass  # NB not protocol: ignore
            sink.put(None)  # EOF: the worker is gone
        threading.Thread(target=reader, args=(self.proc.stdout, self.lines), daemon=True).start()
        self.awaiting_ready = False

    def _kill(self):
        proc, self.proc = self.proc, None
        if proc is None or proc.poll() is not None:
            return
        # NB SIGTERM first: Playwright's node driver then kills the browsers it
        # launched (they live in process groups of their own); SIGKILL after 5 s
        for sig, grace in ((signal.SIGTERM, 5), (signal.SIGKILL, 5)):
            try:
                os.killpg(proc.pid, sig)
            except (ProcessLookupError, PermissionError, AttributeError):
                try:
                    proc.kill()
                except Exception:
                    pass
            try:
                proc.wait(timeout=grace)
                return
            except subprocess.TimeoutExpired:
                continue

    def _next(self, timeout):
        try:
            return self.lines.get(timeout=timeout)
        except queue.Empty:
            return 'timeout'

    def _await_ready(self):
        """The worker closes the previous browser after sending its result."""
        if not self.awaiting_ready:
            return
        deadline = time.time() + self.CLOSE_TIMEOUT
        while time.time() < deadline:
            message = self._next(deadline - time.time())
            if message is None or message == 'timeout':
                break
            if message.get('ready'):
                self.awaiting_ready = False
                return
        print('      NB the browser of the previous side did not close within %d s: worker restarted'
              % self.CLOSE_TIMEOUT, flush=True)
        self._kill()

    def run(self, side, scenario, route_str, side_dir, cache_dir, budget=None):
        self._await_ready()
        if self.proc is None or self.proc.poll() is not None:
            self._start()
        job = {'op': 'run', 'side': side, 'scenario': scenario, 'route': route_str,
               'side_dir': side_dir, 'cache_dir': cache_dir, 'budget': budget}
        try:
            self.proc.stdin.write(json.dumps(job) + '\n')
            self.proc.stdin.flush()
        except (BrokenPipeError, OSError):
            self._kill()
            raise RuntimeError('the worker process died before the %s side started' % side.upper())
        started = last_progress = last_beat = time.time()
        activity = 'starting'
        while True:
            now = time.time()
            wait = min(self.stall - (now - last_progress), self.cap - (now - started),
                       self.HEARTBEAT - (now - last_beat))
            message = self._next(max(wait, 0.05))
            now = time.time()
            if message == 'timeout':
                if now - last_progress >= self.stall or now - started >= self.cap:
                    self._kill()
                    why = ('no progress for %d s' % self.stall) if now - last_progress >= self.stall \
                        else ('over the %d s cap' % self.cap)
                    raise SideFrozen('%s side froze (%s), last activity: %s' % (side.upper(), why, activity))
                if now - last_beat >= self.HEARTBEAT:
                    print('      ... %s %s side, %.0f s: %s' % (scenario['name'], side.upper(), now - started,
                                                              activity), flush=True)
                    last_beat = now
                continue
            if message is None:
                code = self.proc.poll() if self.proc else None
                self._kill()
                raise RuntimeError('the worker process exited (code %s) during the %s side, last activity: %s'
                                   % (code, side.upper(), activity))
            if 'progress' in message:
                activity, last_progress = message['progress'], now
            elif 'fatal' in message:
                self._kill()
                die(message['fatal'].replace('FATAL: ', '', 1))
            elif 'error' in message:
                self.awaiting_ready = True
                if message.get('type') == 'NotSupported':
                    raise NotSupported(message['error'])
                raise RuntimeError(message['error'])
            elif 'result' in message:
                self.awaiting_ready = True
                return message['result']

    def close(self):
        proc = self.proc
        if proc is not None and proc.poll() is None:
            try:
                proc.stdin.write(json.dumps({'op': 'stop'}) + '\n')
                proc.stdin.flush()
                proc.wait(timeout=10)
            except Exception:
                pass
        self._kill()


def worker_main(config_json):
    """The worker side of WorkerDriver: one JSON job per stdin line; protocol
    messages (progress, result, error, ready) on the original stdout, which
    is then pointed at stderr so stray output cannot corrupt the protocol."""
    global _PROGRESS
    config = json.loads(config_json)
    channel = os.fdopen(os.dup(1), 'w', encoding='utf-8', buffering=1)
    os.dup2(2, 1)
    lock = threading.Lock()

    def send(message):
        with lock:
            channel.write(json.dumps(message) + '\n')
            channel.flush()
    _PROGRESS = lambda text: send({'progress': text})
    try:
        driver = PlaywrightDriver(config['browser'], config['browser_args'], synthetic=config['synthetic'],
                                  live=config['live'], defer_close=True)
    except SystemExit as error:
        send({'fatal': str(error.code)})
        return
    try:
        for line in sys.stdin:
            job = json.loads(line)
            if job.get('op') == 'stop':
                break
            try:
                send({'result': driver.run(job['side'], job['scenario'], job['route'], job['side_dir'],
                                           job['cache_dir'], budget=job.get('budget'))})
            except SystemExit as error:
                send({'fatal': str(error.code)})
                return
            except NotSupported as error:
                send({'error': str(error), 'type': 'NotSupported'})
            except Exception as error:
                send({'error': '%s: %s' % (type(error).__name__, str(error).split('\n')[0][:300])})
            finally:
                driver.close_pending()
                send({'ready': True})
    finally:
        try:
            driver.close()
        except Exception:
            pass


def make_driver(args):
    browser_args = list(args.browser_arg or [])
    if args.driver == 'chrome-cli':
        return ChromeCliDriver(args.browser, browser_args)
    # NB no silent fallback to chrome-cli: it needs a Chrome binary and real
    # sockets, and its synthetic input misses focus/blur regressions
    try:
        import playwright  # noqa: F401
    except ImportError:
        die('the playwright driver needs playwright, which this Python cannot import:\n'
            '  %s (Python %s)\n'
            '`pip` may have installed it for another interpreter. Install it for this one:\n'
            '  %s -m pip install playwright==1.50.0\n'
            '  %s -m playwright install chromium\n'
            '(or run with --driver chrome-cli and an installed Chrome: synthetic input only)'
            % (sys.executable, sys.version.split()[0], sys.executable, sys.executable))
    if args.stall_timeout > 0:
        return WorkerDriver({'browser': args.browser, 'browser_args': browser_args,
                             'synthetic': args.input == 'synthetic', 'live': args.live},
                            stall=args.stall_timeout, cap=args.side_timeout)
    return PlaywrightDriver(args.browser, browser_args, synthetic=(args.input == 'synthetic'), live=args.live)


CHROME_CANDIDATES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome',
                     '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                     '/Applications/Chromium.app/Contents/MacOS/Chromium']


def find_chrome():
    for candidate in CHROME_CANDIDATES:
        found = shutil.which(candidate) or (os.path.isfile(candidate) and candidate)
        if found:
            return found
    die('--driver chrome-cli found no Chrome/Chromium (tried %s): set PARITY_BROWSER or --browser'
        % ', '.join(os.path.basename(c) for c in CHROME_CANDIDATES))


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--_worker':
        return worker_main(sys.argv[2])
    # NB progress must show even when the output is piped (CI logs, | tee)
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:
        pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--only', help='comma-separated scenario names or glob patterns')
    parser.add_argument('--tag', help='comma-separated tags')
    parser.add_argument('--list', action='store_true', help='list the scenarios and exit')
    parser.add_argument('--lint', action='store_true', help='validate scenarios.json and config.json and exit')
    parser.add_argument('--scenarios', default=SCENARIOS_PATH, help='a JSON list of scenario objects')
    parser.add_argument('--config', default=CONFIG_PATH, help='JSON {"defaults": {...}, "fixtures": [...]}')
    parser.add_argument('--driver', choices=['playwright', 'chrome-cli'], default='playwright')
    parser.add_argument('--input', choices=['native', 'synthetic'], default='native',
                        help='playwright driver: native input (default) or the in-page synthetic executor')
    parser.add_argument('--browser', default=os.environ.get('PARITY_BROWSER'),
                        help='browser executable (env PARITY_BROWSER)')
    parser.add_argument('--browser-arg', action='append',
                        help='extra browser flag, repeatable (env PARITY_BROWSER_ARGS, space-separated)')
    parser.add_argument('--no-pixels', action='store_true')
    parser.add_argument('--fresh-cache', action='store_true', help='drop the recorded API responses first')
    parser.add_argument('--live', action='store_true', help='playwright driver: never replay the API cache')
    parser.add_argument('--no-build', action='store_true', help='do not rebuild ermac.min.js')
    parser.add_argument('--stall-timeout', type=float, default=float(os.environ.get('PARITY_STALL_TIMEOUT', 90)),
                        help='playwright: kill a side that reports no progress for this many seconds '
                             '(env PARITY_STALL_TIMEOUT, default 90; 0 runs in-process, unguarded)')
    parser.add_argument('--side-timeout', type=float, default=float(os.environ.get('PARITY_SIDE_TIMEOUT', 600)),
                        help='playwright: hard cap per side in seconds (env PARITY_SIDE_TIMEOUT, default 600)')
    parser.add_argument('--reference-url', default=OLD_URL, help='where to fetch the OLD bundle')
    parser.add_argument('--reference-sha1', default=OLD_SHA1,
                        help='expected sha1 of the OLD bundle ("" disables the check)')
    args = parser.parse_args()
    if not args.browser_arg and os.environ.get('PARITY_BROWSER_ARGS'):
        args.browser_arg = os.environ['PARITY_BROWSER_ARGS'].split()

    scenarios, fixtures, problems = load_scenarios(args.scenarios, args.config)
    if problems:
        print('\n'.join(problems))
        die('%d problem(s) in %s' % (len(problems), args.scenarios))
    selected = select(scenarios, args.only, args.tag)
    if args.lint:
        print('%s: %d scenarios, %d fixtures, OK' % (os.path.relpath(args.scenarios), len(scenarios), len(fixtures)))
        return
    if args.list:
        for s in selected:
            flag = ' [skip: %s]' % s['skip'] if s.get('skip') else (' [xfail: %s]' % s['xfail'] if s.get('xfail') else '')
            print('%-34s %-58s %s%s' % (s['name'], s['route'][:58], ','.join(s['tags']), flag))
        print('%d scenarios' % len(selected))
        return

    os.makedirs(OUT, exist_ok=True)
    if not args.no_build:
        build_new_bundle()
    ensure_reference(args.reference_url, args.reference_sha1)
    driver = make_driver(args)
    print('driver: %s%s%s' % (driver.name, ' (synthetic input)' if driver.synthetic else '',
                              (', watchdog: stall %ds, cap %ds per side' % (args.stall_timeout, args.side_timeout))
                              if isinstance(driver, WorkerDriver) else ''))
    results = []
    interrupted = False
    frozen_in_a_row = 0
    try:
        needed = set(re.findall(r'\{(\w+)\}', ' '.join(s['route'] for s in selected)))
        fixture_values = {}
        if needed:
            banner('harvesting fixtures from the OLD side: %s' % ', '.join(sorted(needed)))
            try:
                fixture_values = harvest_fixtures(driver, [f for f in fixtures if f['name'] in needed])
            except SideFrozen as error:
                die('harvesting the fixtures froze: %s' % error)
            print('fixtures:', fixture_values)

        banner('running %d scenarios x 2 sides' % len(selected))
        for scenario in selected:
            name = scenario['name']
            if scenario.get('skip'):
                results.append({'name': name, 'verdict': 'SKIP', 'reason': scenario['skip']})
                print('%-34s SKIP (%s)' % (name, scenario['skip']))
                continue
            side_dir = os.path.join(OUT, name)
            cache_dir = os.path.join(side_dir, 'api-cache')
            if args.fresh_cache and os.path.isdir(cache_dir):
                shutil.rmtree(cache_dir)
            os.makedirs(side_dir, exist_ok=True)
            route_str = scenario['route'].format(**fixture_values)
            started = time.time()
            sides = {}
            try:
                for side in ('old', 'new'):
                    # NB the old side populates the API cache, the new side replays it
                    sides[side] = driver.run(side, scenario, route_str, side_dir, cache_dir,
                                             budget=scenario.get('budget'))
            except NotSupported as reason:
                results.append({'name': name, 'verdict': 'SKIP', 'reason': str(reason)})
                print('%-34s SKIP (%s)' % (name, reason))
                continue
            except Exception as error:
                message = '%s: %s' % (type(error).__name__, str(error).split('\n')[0][:300])
                results.append({'name': name, 'verdict': 'ERROR', 'reason': message,
                                'seconds': round(time.time() - started, 1)})
                print('%-34s ERROR %s' % (name, message))
                write_report(driver, results, complete=False)
                frozen_in_a_row = frozen_in_a_row + 1 if isinstance(error, SideFrozen) else 0
                if frozen_in_a_row >= 3:
                    die('%d scenarios in a row froze: the environment (browser, network, API) is likely '
                        'broken rather than the scenarios; see the ERROR lines above and %s'
                        % (frozen_in_a_row, os.path.relpath(os.path.join(OUT, 'report.json'))))
                continue
            frozen_in_a_row = 0
            for side in ('old', 'new'):
                with open(os.path.join(side_dir, side + '-dom.html'), 'w', encoding='utf-8') as f:
                    f.write(sides[side]['dom'])
                with open(os.path.join(side_dir, side + '-capture.json'), 'w', encoding='utf-8') as f:
                    json.dump({k: v for k, v in sides[side].items() if k != 'dom'}, f, indent=1, ensure_ascii=False)
            if not sides['old']['api']:
                message = 'infrastructure error: no API requests at all (is the API reachable?)'
                results.append({'name': name, 'verdict': 'ERROR', 'reason': message})
                print('%-34s ERROR %s' % (name, message))
                continue
            diffs, warnings, fraction = compare(scenario, sides['old'], sides['new'], not args.no_pixels, side_dir)
            verdict = 'FAIL' if diffs else 'PASS'
            if scenario.get('xfail'):
                verdict = 'XFAIL' if diffs else 'XPASS'
                if 'expect_new' in diffs:
                    verdict = 'FAIL'  # the approved new behaviour itself broke
            entry = {'name': name, 'verdict': verdict, 'diffs': diffs, 'warnings': warnings,
                     'pixels': fraction, 'seconds': round(time.time() - started, 1),
                     'notes': sides['old']['notes'] + sides['new']['notes']}
            results.append(entry)
            with open(os.path.join(side_dir, 'diff.txt'), 'w', encoding='utf-8') as f:
                for layer, items in diffs.items():
                    f.write('== %s ==\n%s\n\n' % (layer, '\n'.join(items)))
                for warning in warnings:
                    f.write('WARN %s\n' % warning)
            pixel_text = ('%.4f%%' % (fraction * 100)) if fraction is not None else '-'
            print('%-34s %-5s %5.1fs  pixels %-9s %s' % (
                name, verdict, entry['seconds'], pixel_text,
                ('differs: ' + ', '.join(diffs)) if diffs else ''))
            for layer, items in diffs.items():
                for item in items[:4]:
                    print('      %-6s %s' % (layer, item))
                if len(items) > 4:
                    print('      %-6s ... %d more (see %s)' % (layer, len(items) - 4, os.path.relpath(os.path.join(side_dir, 'diff.txt'))))
            for warning in warnings:
                print('      WARN   %s' % warning)
            write_report(driver, results, complete=False)
    except KeyboardInterrupt:
        interrupted = True
        print('\ninterrupted: stopping the browser processes...', flush=True)
        if isinstance(driver, WorkerDriver):
            driver._kill()  # NB no polite stop: the worker may be mid-scenario
    finally:
        driver.close()

    write_report(driver, results, complete=not interrupted)
    banner('summary' + (' (INTERRUPTED: partial)' if interrupted else ''))
    counts = {}
    for r in results:
        counts[r['verdict']] = counts.get(r['verdict'], 0) + 1
    print('  '.join('%s %d' % kv for kv in sorted(counts.items())))
    failed = [r['name'] for r in results if r['verdict'] in ('FAIL', 'XPASS', 'ERROR')]
    if failed:
        print('failing:', ' '.join(failed))
    print('report: %s' % os.path.relpath(os.path.join(OUT, 'report.json')))
    sys.exit(130 if interrupted else (1 if failed else 0))


def write_report(driver, results, complete):
    """Rewritten after every scenario: a run that is killed or interrupted
    still leaves its results so far."""
    path = os.path.join(OUT, 'report.json')
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump({'driver': driver.name, 'synthetic': driver.synthetic, 'complete': complete,
                   'results': results}, f, indent=1)
    os.replace(path + '.tmp', path)


if __name__ == '__main__':
    main()
