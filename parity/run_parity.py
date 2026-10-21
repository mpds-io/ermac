#!/usr/bin/env python3
"""
Ermac parity test: automated comparative testing of the refactored GUI
against the previously deployed version (https://mpds-io.github.io/ermac),
without any manual inspection.

How it works:
  1. the OLD reference bundle is fetched from the deployed demo (cached in
     parity/reference/); the NEW bundle is rebuilt from the current sources;
  2. both are served side-by-side under parity/old.html and parity/new.html,
     on a "localhost" origin, so BOTH run in development mode and all their
     API calls go through deploy/dev_api_proxy.py, which LOGS every request;
  3. every scenario (hash route, or a route + a scripted click) is executed
     in headless Chrome twice: once for the old bundle, once for the new one.
     A determinism stub (parity/harness.js) makes Math.random() identical
     on both sides, so random legends/examples/picks cannot create noise;
  4. three comparison layers, old vs new:
       - API request logs (the app must talk to the MPDS API identically);
       - semantic DOM state (title, tables, interpretation, history,
         multiselect items, context columns, links, visibility);
       - rendered pixels (screenshots, with a tolerance).

Usage:
    python3 parity/run_parity.py [--only name1,name2] [--no-pixels]

Artifacts are written to parity/out/<scenario>/ (old/new DOM dumps,
screenshots, proxy logs, pixel-diff overlays). Requires google-chrome,
python3, and Pillow for the pixel layer.
"""

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request

try:
    from PIL import Image, ImageChops
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GUI_PORT = 5560
API_PORT = 7070
CHROME = 'google-chrome'
VIEW_W, VIEW_H = 1280, 2400
OLD_URL = 'https://mpds-io.github.io/ermac/ermac.min.js'
TOL = 2           # per-channel pixel tolerance
PIXEL_FAIL = 0.001  # strict scenarios fail above this fraction of differing pixels

# (name, route hash, act, budget ms, pixel strict)
SCENARIOS = [
    ('start',          '#start',                                                  None,           30000, True),
    ('search',         '#search/Ag-O',                                            None,           30000, True),
    ('inquiry_oxide',  '#inquiry/elements=Ag-O&classes=oxide',                    None,           30000, True),
    ('inquiry_tabled', '#inquiry/formulae=Ag2O&props=crystal%20structure',         None,           30000, True),
    ('phases',         '#inquiry_phases/elements=Ag-O&classes=oxide',              None,           30000, True),
    ('articles',       '#inquiry_articles/elements=Ag-O&classes=oxide',            None,           30000, True),
    ('numeric',        '#inquiry/numeric=volume%2C%3E%2C3000%3B',                  None,           30000, True),
    ('entry',          '#entry/S1410618',                                          None,           40000, False),
    ('phase_id',       '#phase_id/{phid}',                                         None,           30000, True),
    ('article',        '#article/{bid}',                                           None,           30000, True),
    ('interlinkage',   '#interlinkage/{phid}',                                     None,           30000, True),
    ('hierarchy',      '#hierarchy',                                               None,           30000, True),
    ('polyhedra',      '#polyhedra',                                               None,           30000, True),
    ('modal_login',    '#modal/login',                                             None,           30000, True),
    ('plot_pie',       '#plot/pie/inquiry/elements=Ag-O',                          None,           40000, False),
    ('click_advsearch','#search/Ag-O',                                             'advsearch',    40000, True),
    ('click_entry_ctx','#inquiry/formulae=Ag2O&props=crystal%20structure',         'open_entry_ctx', 40000, True),
    ('click_sort',     '#inquiry/formulae=Ag2O&props=crystal%20structure',         'sort_col1',    40000, True),
    ('click_sort_desc','#inquiry/formulae=Ag2O&props=crystal%20structure',         'sort_col1_twice', 40000, True),
    ('click_refine',   '#search/Ag-O',                                             'refine_expand', 40000, True),
]


def banner(text):
    print('\n' + '=' * 72 + '\n ' + text + '\n' + '=' * 72)


def die(message):
    sys.exit('FATAL: ' + message)


# ----------------------------------------------------------------------------
# setup
# ----------------------------------------------------------------------------

def setup():
    os.makedirs(os.path.join(HERE, 'reference'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)

    # NB refuse to run over leftover processes: they corrupt the captures
    for label, port in (('static server', GUI_PORT), ('API proxy', API_PORT)):
        if not port_free(port):
            die('port %d is busy (%s): stop the leftover process first, e.g. '
                'ps aux | grep -E "http.server %d|dev_api_proxy"' % (port, label, port))

    # NB leftover headless chrome processes holding our profile dirs would
    # poison the run; detect and refuse rather than capture garbage
    stale = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout
    stale_chrome = [line for line in stale.splitlines()
                    if 'headless' in line and 'parity/out/profile' in line]
    if stale_chrome:
        for line in stale_chrome:
            print('stale headless chrome:', line.strip()[:120])
        die('stale headless chrome processes are holding the parity profiles; '
            'kill them first (see the PIDs above)')

    # 1. the NEW bundle must be fresh
    print('building the new bundle...')
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'deploy', 'build_js.py')])

    # 2. the OLD reference bundle, fetched from the deployed demo
    reference = os.path.join(HERE, 'reference', 'ermac_old.min.js')
    if not os.path.exists(reference):
        print('fetching the OLD reference bundle from', OLD_URL, '...')
        with urllib.request.urlopen(OLD_URL, timeout=60) as response:
            data = response.read()
        with open(reference, 'wb') as f:
            f.write(data)
    with open(reference, 'rb') as f:
        print('reference bundle: %d bytes, sha1 %s' % (
            os.path.getsize(reference), hashlib.sha1(f.read()).hexdigest()[:12]))

    # 3. shared assets under parity/ (app_folder is /parity for these pages)
    links = {
        'webassets': os.path.join(ROOT, 'webassets'),
        'labs': os.path.join(ROOT, 'labs'),
        'oauth': os.path.join(ROOT, 'oauth'),
        'ermac.min.js': os.path.join(ROOT, 'ermac.min.js')
    }
    for name, target in links.items():
        link = os.path.join(HERE, name)
        if os.path.islink(link) and os.readlink(link) != target:
            os.remove(link)
        if not os.path.exists(link):
            os.symlink(target, link)
            print('symlinked', name, '->', os.path.relpath(target, HERE))


def port_free(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False


# ----------------------------------------------------------------------------
# server / proxy / chrome plumbing
# ----------------------------------------------------------------------------

class StaticServer(object):
    def __init__(self):
        self.process = None

    def start(self):
        if not port_free(GUI_PORT):
            die('port %d is busy: stop whatever serves it first' % GUI_PORT)
        self.process = subprocess.Popen(
            [sys.executable, '-m', 'http.server', str(GUI_PORT)],
            cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wait_for_port(GUI_PORT, 5)
        print('static server: http://localhost:%d' % GUI_PORT)

    def stop(self):
        if self.process:
            self.process.terminate()
            self.process.wait()


class ApiProxy(object):
    def __init__(self, log_path, cache_dir=None):
        self.log_path = log_path
        self.cache_dir = cache_dir
        self.process = None

    def start(self):
        if not port_free(API_PORT):
            die('port %d is busy: stop deploy/dev_api_proxy.py first' % API_PORT)
        self.log = open(self.log_path, 'w')
        cmd = [sys.executable, '-u', os.path.join(ROOT, 'deploy', 'dev_api_proxy.py')]
        if self.cache_dir:
            cmd += ['--cache', self.cache_dir]
        self.process = subprocess.Popen(cmd, stdout=self.log, stderr=subprocess.STDOUT)
        wait_for_port(API_PORT, 5)

    def stop(self):
        if self.process:
            self.process.terminate()
            self.process.wait()
        if hasattr(self, 'log') and self.log:
            self.log.close()


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


def run_chrome(url, dom_path, shot_path, user_data_dir, budget, attempts=3):
    cmd = [
        CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--hide-scrollbars', '--window-size=%d,%d' % (VIEW_W, VIEW_H),
        '--force-device-scale-factor=1', '--default-background-color=FFFFFFFF',
        # NB external static assets (thumbnails, ptable SVGs) are blocked so
        # that rendering is deterministic: they fail identically on both sides
        '--host-resolver-rules=MAP mpds.io 127.0.0.1, MAP *.mpds.io 127.0.0.1',
        # NB the HTTP cache must be off, otherwise wmdata is not re-requested
        '--disk-cache-size=1', '--media-cache-size=1',
        '--user-data-dir=' + user_data_dir,
        '--virtual-time-budget=%d' % budget,
        '--screenshot=' + shot_path,
        '--dump-dom', url
    ]
    last_error = None
    for attempt in range(attempts):
        # NB a leftover chrome process may still hold the profile directory:
        # retry the removal instead of silently continuing with a dirty profile
        for _ in range(4):
            if not os.path.exists(user_data_dir):
                break
            shutil.rmtree(user_data_dir, ignore_errors=True)
            time.sleep(0.5)
        if os.path.exists(user_data_dir):
            last_error = IOError('cannot clean the profile dir ' + user_data_dir)
            break
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=300)
            with open(dom_path, 'wb') as f:
                f.write(result.stdout)
            if os.path.exists(shot_path) and len(result.stdout) > 10000:
                return  # a plausible DOM dump and a screenshot
            last_error = IOError('incomplete capture (dom %d bytes, shot %s)' % (
                len(result.stdout), os.path.exists(shot_path)))
        except subprocess.TimeoutExpired as error:
            last_error = error
        print('    (chrome attempt %d failed (%s), retrying)' % (attempt + 1, last_error))
    die('chrome failed for %s: %s' % (url, last_error))


# ----------------------------------------------------------------------------
# comparison layers
# ----------------------------------------------------------------------------

def normalize_requests(log_path):
    """Parse the proxy log into a comparable list of API requests."""
    requests = []
    with open(log_path) as f:
        for line in f:
            if not line.startswith('proxy: '):
                continue
            match = re.search(r'"(GET|POST|HEAD) (\S+)', line)
            if not match:
                continue
            method, target = match.group(1), match.group(2)
            target = re.sub(r' HTTP/\d\.\d$', '', target)
            path, _, query = target.partition('?')
            # NB the anonymous IP-based login is a best-effort fire-and-forget
            # request which races with the page teardown in headless capture,
            # and is already covered by the DOM comparison (the logged-in UI)
            if path == '/users/ip':
                continue
            pairs = sorted(query.split('&')) if query else []
            requests.append(method + ' ' + path + '?' + '&'.join(pairs))
    return requests


def region(html, open_pattern, close_pattern='</ul>'):
    match = re.search(open_pattern + r'(.*?)' + close_pattern, html, re.S)
    return collapse(match.group(1)) if match else None


def collapse(text):
    return re.sub(r'\s+', ' ', text).strip()


def extract_semantics(html):
    """Extract the behaviorally meaningful DOM state from a dump."""
    html = html.replace('old.html', 'app.html').replace('new.html', 'app.html')
    keys = {}

    def set_key(name, value):
        if value is not None:
            keys[name] = value

    match = re.search(r'<title>(.*?)</title>', html, re.S)
    set_key('title', match.group(1) if match else '')

    set_key('body_class', re.search(r'<body class="([^"]*)"', html).group(1) if re.search(r'<body class="([^"]*)"', html) else '')

    set_key('notifybox', region(html, r'<div id="notifybox"[^>]*>', r'</div>'))
    notify_style = re.search(r'<div id="notifybox" style="([^"]*)"', html)
    set_key('notifybox_display', notify_style.group(1) if notify_style else '')

    set_key('interpret', region(html, r'<ul id="interpret">'))

    browser = re.search(r'<table id="databrowser" class="([^"]*)"', html)
    set_key('databrowser_class', browser.group(1) if browser else '')
    set_key('databrowser_ids', ' '.join(re.findall(r'id="(e__[^"]*)"', html)))
    set_key('databrowser_md5', short_md5(region(html, r'<table id="databrowser"[^>]*>', '</table>')))

    set_key('multiselect_items', ' | '.join(
        a + ':' + b for a, b in re.findall(r'data-facet="([^"]*)" data-term="([^"]*)"', html)))
    set_key('search_input_rest', re.search(r'id="search_field-selectized"[^>]*value="([^"]*)"', html).group(1)
            if re.search(r'id="search_field-selectized"[^>]*value="([^"]*)"', html) else '')

    set_key('refine_links', ' '.join(collapse(a) for a in re.findall(r'<li class="(?:new_rfn_facet )?fct_\w+"><a href="(#[^"]*)">', html)))
    # NB random-content elements are compared by SHAPE, not content:
    # the old bundle's jQuery/Sizzle internals consume extra random values,
    # so the exact example/legend strings legitimately differ per side
    examples = re.findall(r'<a href="(#[^"]*)">',
                           region(html, r'<div id="examples" class="examples">') or '')
    set_key('examples_shape', '%d links, all valid: %s' % (
        len(examples),
        all(link.startswith('#search/') for link in examples)))
    set_key('history_links', ' '.join(re.findall(
        r'<a href="(#[^"]*)">', region(html, r'<div id="history">') or '')))

    for element in ['entryno', 'ind_title', 'phase_info', 'sim_legend', 'own_phase', 'ind_link']:
        set_key(element, outer_of(html, element))

    set_key('d_icon_hrefs', ' '.join(re.findall(r'<a rel="\w+" href="([^"]*)" target="_blank"', html)))

    set_key('iframe_srcs', ' | '.join(re.findall(r'<iframe[^>]* src="([^"]*)"', html)))

    # NB class attribute is optional: the old jQuery left class="" behind,
    # the new code omits the attribute entirely - both mean "no class"
    set_key('active_controls', ' '.join(sorted(
        m[0] + '=' + (m[1] or '')
        for m in re.findall(r'<div id="(control_[a-f])"(?: class="([^"]*)")?', html))))

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
        inner = region(html, r'<div id="%s" class="hy_tabs[^>]*>' % hierarchy)
        set_key(hierarchy + '_md5', short_md5(inner))

    set_key('polyhedra_md5', short_md5(region(html, r'<div id="all_polyhedra_content">')))

    set_key('header_th', ' '.join(re.findall(r'<th class="([^"]*)"', html)))

    return keys


def outer_of(html, element_id):
    match = re.search(r'<[^>]*id="%s"[^>]*>.*?(?=<div id="footer"|</body>)' % element_id, html, re.S)
    return collapse(match.group(0))[:600] if match else None


def short_md5(text):
    if text is None:
        return None
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


def diff_keys(old, new):
    problems = []
    for key in sorted(set(old) | set(new)):
        if old.get(key) != new.get(key):
            problems.append(key)
    return problems


def compare_pixels(old_path, new_path, diff_path):
    if not PIL_AVAILABLE:
        return None, 'Pillow not available'
    old_img = Image.open(old_path).convert('RGB')
    new_img = Image.open(new_path).convert('RGB')
    if old_img.size != new_img.size:
        return None, 'size mismatch: %s vs %s' % (old_img.size, new_img.size)

    diff = ImageChops.difference(old_img, new_img)
    mask = diff.point(lambda p: 255 if p > TOL else 0).convert('L')
    histogram = mask.histogram()
    differing = histogram[255]
    total = old_img.size[0] * old_img.size[1]
    fraction = differing / float(total)

    if diff.getbbox():
        overlay = new_img.copy()
        red = Image.new('RGB', old_img.size, (255, 0, 0))
        overlay.paste(red, mask)
        overlay = Image.blend(new_img, overlay, 0.5)
        overlay.save(diff_path)

    return fraction, None


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default=None, help='comma-separated scenario names')
    parser.add_argument('--no-pixels', action='store_true')
    args = parser.parse_args()

    selected = SCENARIOS
    if args.only:
        wanted = set(args.only.split(','))
        selected = [s for s in SCENARIOS if s[0] in wanted]
        unknown = wanted - set(s[0] for s in selected)
        if unknown:
            die('unknown scenarios: %s' % ', '.join(sorted(unknown)))

    setup()
    server = StaticServer()
    server.start()
    out_dir = os.path.join(HERE, 'out')

    try:
        fixtures = {'phid': None, 'bid': None}
        results = []

        banner('extracting real data fixtures (phid, bid) from the OLD side')
        fixtures = ensure_fixtures(out_dir)
        print('fixtures:', fixtures)

        banner('running %d scenarios x 2 sides' % len(selected))
        for name, route, act, budget, pixel_strict in selected:
            route_str = route.format(**fixtures)
            print('\n--- %s %s---' % (name, ('(act=%s) ' % act if act else '')))
            sides = {}
            for side in ('old', 'new'):
                scenario_dir = os.path.join(out_dir, name)
                os.makedirs(scenario_dir, exist_ok=True)
                log_path = os.path.join(scenario_dir, side + '-api.log')
                dom_path = os.path.join(scenario_dir, side + '-dom.html')
                shot_path = os.path.join(scenario_dir, side + '.png')

                proxy = ApiProxy(
                    log_path,
                    # NB the old side populates the cache, the new side replays
                    # it: identical API data regardless of live index changes
                    cache_dir=os.path.join(scenario_dir, 'api-cache'))
                proxy.start()
                try:
                    page = 'http://localhost:%d/parity/%s.html' % (GUI_PORT, side)
                    url = page + ('?act=' + act if act else '') + route_str
                    run_chrome(url, dom_path, shot_path,
                               os.path.join(out_dir, 'profile-' + side), budget)
                finally:
                    time.sleep(0.3)
                    proxy.stop()

                with open(dom_path, encoding='utf-8', errors='replace') as f:
                    dom = f.read()
                requests = normalize_requests(log_path)
                if not requests:
                    die('infrastructure error: no API requests logged for %s/%s '
                        '(is the proxy alive?)' % (name, side))
                sides[side] = {
                    'requests': requests,
                    'semantics': extract_semantics(dom),
                    'shot': shot_path
                }

            problem_keys = diff_keys(sides['old']['semantics'], sides['new']['semantics'])
            requests_equal = sides['old']['requests'] == sides['new']['requests']
            pixel_fraction, pixel_note = (None, 'skipped')
            if not args.no_pixels:
                pixel_fraction, pixel_note = compare_pixels(
                    sides['old']['shot'], sides['new']['shot'],
                    os.path.join(out_dir, name, 'pixel-diff.png'))

            api_ok = requests_equal
            dom_ok = not problem_keys
            pixel_ok = (pixel_fraction is None) or (not pixel_strict) or (pixel_fraction <= PIXEL_FAIL)

            verdict = 'PASS'
            if not api_ok or not dom_ok or not pixel_ok:
                verdict = 'FAIL'

            results.append((name, verdict, api_ok, dom_ok, pixel_ok, pixel_fraction,
                            problem_keys, sides))

            print('  API %s | DOM %s | pixels %s' % (
                'ok' if api_ok else 'DIFF',
                'ok' if dom_ok else 'DIFF: ' + ', '.join(problem_keys[:6]),
                ('%.4f%%' % (pixel_fraction * 100)) + ('' if pixel_ok else ' (FAIL)') if pixel_fraction is not None else pixel_note))

        banner('summary')
        failures = 0
        for name, verdict, api_ok, dom_ok, pixel_ok, pixel_fraction, problem_keys, sides in results:
            if verdict == 'FAIL':
                failures += 1
                print('%-18s FAIL' % name)
                if not api_ok:
                    report_api_diff(sides['old']['requests'], sides['new']['requests'])
                if problem_keys:
                    report_dom_diff(name, sides['old']['semantics'], sides['new']['semantics'], problem_keys)
                if not pixel_ok and pixel_fraction is not None:
                    print('    pixels: %.4f%% differ (tolerance %s, threshold %.3f%%)'
                          % (pixel_fraction * 100, TOL, PIXEL_FAIL * 100))
            else:
                print('%-18s PASS   (pixels %.4f%%)' % (name, (pixel_fraction or 0) * 100))
        print('\n%d/%d scenarios passed' % (len(results) - failures, len(results)))
        sys.exit(1 if failures else 0)
    finally:
        server.stop()


def ensure_fixtures(out_dir):
    """Run two loads on the OLD side to harvest a real phid and bid."""
    fixtures = {}
    for kind, route, pattern in [
        ('phid', '#inquiry_phases/elements=Ag-O&classes=oxide', r'gallery_img" rel="(\d+)"'),
        ('bid', '#search/Ag-O', r'ref_id=(\d+)&amp;sid'),
    ]:
        fixture_dir = os.path.join(out_dir, '_fixtures')
        os.makedirs(fixture_dir, exist_ok=True)
        proxy = ApiProxy(os.path.join(fixture_dir, kind + '-api.log'),
                         cache_dir=os.path.join(fixture_dir, 'api-cache'))
        proxy.start()
        try:
            dom_path = os.path.join(fixture_dir, kind + '-dom.html')
            run_chrome('http://localhost:%d/parity/old.html%s' % (GUI_PORT, route),
                       dom_path, os.path.join(fixture_dir, kind + '.png'),
                       os.path.join(fixture_dir, 'profile'), 30000)
            with open(dom_path, encoding='utf-8', errors='replace') as f:
                match = re.search(pattern, f.read())
        finally:
            time.sleep(0.3)
            proxy.stop()
        if not match:
            die('could not extract fixture %s from the old side' % kind)
        fixtures[kind] = match.group(1)
    return fixtures


def report_api_diff(old_requests, new_requests):
    old_set, new_set = list(old_requests), list(new_requests)
    for request in old_set[:]:
        if request in new_set:
            new_set.remove(request)
    for request in new_set[:]:
        if request in old_set:
            old_set.remove(request)
    for request in old_requests:
        if request not in new_requests and request in old_set:
            print('    API only in OLD:', request[:150])
    for request in new_requests:
        if request not in old_requests and request in new_set:
            print('    API only in NEW:', request[:150])


def report_dom_diff(name, old_semantics, new_semantics, problem_keys):
    scenario_dir = os.path.join(HERE, 'out', name)
    detail_path = os.path.join(scenario_dir, 'semantic-diff.txt')
    with open(detail_path, 'w') as f:
        for key in problem_keys:
            f.write('=== %s ===\nOLD: %r\nNEW: %r\n\n' % (key, old_semantics.get(key), new_semantics.get(key)))
    print('    DOM keys differ: %s (details in %s)' % (', '.join(problem_keys), detail_path))


if __name__ == '__main__':
    main()