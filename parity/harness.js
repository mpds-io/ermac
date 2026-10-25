/*
 * Ermac parity harness, loaded BEFORE the application bundle (old or new).
 *
 *  1. determinism: Math.random() yields an identical seeded sequence on both
 *     sides, the rotating legend interval is frozen, random-content ink is
 *     masked identically;
 *  2. error capture: uncaught errors, unhandled rejections and console.error
 *     calls are recorded (window.__parity.errors), so a refactoring that
 *     starts throwing is caught even when the DOM happens to look right;
 *  3. probes: window.__parity.probe([...]) evaluates the declarative probe
 *     strings of parity/scenarios.json (see parity/README.md) in-page, for
 *     BOTH drivers, so the observation semantics are identical everywhere;
 *  4. synthetic step executor: for the chrome-cli driver (no remote control),
 *     the scenario is passed as ?p=<base64url JSON> and its steps are
 *     replayed here with synthetic DOM events; the results are serialized
 *     into <script id="__parity_result"> for the --dump-dom capture.
 *     The playwright driver performs the SAME steps with native input instead.
 *
 * Nothing here may depend on the application internals beyond what the
 * probes ask for: the harness must be equally valid for the old and the new code.
 */

(function(){
    var params = new URLSearchParams(location.search);

    // ------------------------------------------------------------------
    // 1. determinism
    // ------------------------------------------------------------------

    var seed = 0x2F6E2B1;
    Math.random = function(){
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };

    // NB the rotating legend interval consumes random values at
    // network-latency-dependent moments, which makes the page capture
    // race-y (e.g. the examples box draws from different random sequence
    // positions). The legend is therefore frozen at its boot state,
    // identical on both sides; the no-op interval only keeps the headless
    // Chrome virtual-time clock marching so the budget expires after
    // the app has settled.
    var real_set_timeout = window.setTimeout;
    var real_set_interval = window.setInterval;
    window.setInterval = function(fn, ms){
        real_set_timeout.call(window, function(){
            real_set_interval.call(window, function(){}, ms);
        }, 20000);
        return 0;
    };

    // NB parity debugging aid: ?trace=1 records every Math.random call
    if (params.get('trace')){
        window.name = (parseInt(window.name || '0', 10) + 1) + '';
        var seeded_random = Math.random;
        var calls = 0, stacks = [], values = [];
        Math.random = function(){
            calls++;
            var value = seeded_random();
            if (values.length < 60) values.push(value.toFixed(6));
            if (stacks.length < 16) stacks.push('call#' + calls + ' <- ' + String(new Error().stack).split('\n').slice(2, 5).join(' | '));
            var el = document.getElementById('__randtrace');
            if (!el){
                el = document.createElement('div');
                el.id = '__randtrace';
                (document.body || document.documentElement).appendChild(el);
            }
            el.textContent = 'LOADS=' + window.name + ' RANDCOUNT=' + calls + ' VALS=' + values.join(',') + ' STACKS=' + stacks.join(' ;; ');
            return value;
        };
    }

    // NB the old bundle consumes extra random values inside jQuery/Sizzle
    // internals (the selector engine uses Math.random as its expando
    // counter), so random-content elements (the rotating legend, the
    // examples box) can never be content-aligned between the sides.
    // Their text ink is masked IDENTICALLY on both sides, and their
    // content parity is verified structurally by the runner instead.
    var style = document.createElement('style');
    style.textContent =
        '#legend a, #examples li a { color: rgba(0,0,0,0) !important; }';
    document.head.appendChild(style);

    // ------------------------------------------------------------------
    // 2. error capture
    // ------------------------------------------------------------------

    var errors = [];
    window.addEventListener('error', function(e){
        // NB resource load failures (blocked thumbnails etc.) are not script errors
        if (!(e instanceof ErrorEvent)) return;
        errors.push('error: ' + (e.message || 'unknown'));
    });
    window.addEventListener('unhandledrejection', function(e){
        var reason = e.reason;
        errors.push('unhandledrejection: ' + (reason && reason.message ? reason.message : String(reason)));
    });
    var real_console_error = console.error;
    console.error = function(){
        try {
            errors.push('console.error: ' + Array.prototype.map.call(arguments, String).join(' ').slice(0, 300));
        } catch (e) {}
        return real_console_error.apply(console, arguments);
    };

    // ------------------------------------------------------------------
    // 3. probes
    // ------------------------------------------------------------------

    function norm(text){
        return text === null || text === undefined ? null : String(text).replace(/\s+/g, ' ').trim();
    }

    function side_neutral(text){
        // NB the harness pages are old.html / new.html: links must compare equal
        return text === null ? null : text.replace(/\b(old|new)\.html\b/g, 'app.html');
    }

    function is_visible(el){
        if (!el) return null;
        if (!el.isConnected || !el.getClientRects().length) return false;
        var cs = window.getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none';
    }

    function describe(el){
        if (!el || el === document.body || el === document.documentElement) return el ? el.tagName.toLowerCase() : null;
        if (el.id) return '#' + el.id;
        var cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).sort().join('.');
        var parent = el.parentElement ? describe(el.parentElement) : '';
        return parent + ' > ' + el.tagName.toLowerCase() + (cls ? '.' + cls : '');
    }

    function class_list(el){
        if (!el) return null;
        return (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
    }

    function rect(el){
        if (!el) return null;
        var r = el.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)];
    }

    // kind -> [needs selector, needs @arg, evaluator(selector, arg)]
    var KINDS = {
        'text':     [1, 0, function(s){ var el = one(s); return el ? norm(el.textContent) : null; }],
        'texts':    [1, 0, function(s){ return all(s).map(function(el){ return norm(el.textContent); }); }],
        'html':     [1, 0, function(s){ var el = one(s); return el ? side_neutral(norm(el.innerHTML)) : null; }],
        'value':    [1, 0, function(s){ var el = one(s); return el ? el.value : null; }],
        'values':   [1, 0, function(s){ return all(s).map(function(el){ return el.value; }); }],
        'checked':  [1, 0, function(s){ var el = one(s); return el ? !!el.checked : null; }],
        'disabled': [1, 0, function(s){ var el = one(s); return el ? !!el.disabled : null; }],
        'readonly': [1, 0, function(s){ var el = one(s); return el ? !!el.readOnly : null; }],
        'count':    [1, 0, function(s){ return all(s).length; }],
        'visible':  [1, 0, function(s){ return is_visible(one(s)); }],
        'visibles': [1, 0, function(s){ return all(s).map(is_visible); }],
        'nvisible': [1, 0, function(s){ return all(s).filter(is_visible).length; }],
        'class':    [1, 0, function(s){ return class_list(one(s)); }],
        'classes':  [1, 0, function(s){ return all(s).map(class_list); }],
        'attr':     [1, 1, function(s, a){ var el = one(s); return el ? side_neutral(el.getAttribute(a)) : null; }],
        'attrs':    [1, 1, function(s, a){ return all(s).map(function(el){ return side_neutral(el.getAttribute(a)); }); }],
        'style':    [1, 1, function(s, a){ var el = one(s); return el ? window.getComputedStyle(el).getPropertyValue(a) : null; }],
        'rect':     [1, 0, function(s){ return rect(one(s)); }],
        'rects':    [1, 0, function(s){ return all(s).map(rect); }],
        'focus':    [0, 0, function(){ return describe(document.activeElement); }],
        'hash':     [0, 0, function(){ return location.hash; }],
        'title':    [0, 0, function(){ return document.title; }],
        'scroll':   [0, 0, function(){ return [Math.round(window.scrollX), Math.round(window.scrollY)]; }],
        'history':  [0, 0, function(){ return history.length; }],
        'selection':[0, 0, function(){ return norm(String(window.getSelection())); }],
        'storage':  [1, 0, function(s){ return window.localStorage.getItem(s); }],
        'js':       [1, 0, function(s){ return JSON.parse(JSON.stringify((0, eval)(s), function(k, v){ return v === undefined ? '__undefined__' : v; }) || 'null'); }]
    };

    function one(selector){ return document.querySelector(selector); }
    function all(selector){ return Array.prototype.slice.call(document.querySelectorAll(selector)); }

    function parse_probe(probe){
        var colon = probe.indexOf(':');
        var kind = colon === -1 ? probe : probe.slice(0, colon);
        var rest = colon === -1 ? '' : probe.slice(colon + 1);
        var spec = KINDS[kind];
        if (!spec) throw new Error('unknown probe kind "' + kind + '"');
        var arg = null;
        if (spec[1]){
            var at = rest.lastIndexOf('@');
            if (at === -1) throw new Error('probe "' + probe + '" needs @argument');
            arg = rest.slice(at + 1);
            rest = rest.slice(0, at);
        }
        return {kind: kind, selector: rest, arg: arg, fn: spec[2]};
    }

    function probe(list){
        var out = {};
        (list || []).forEach(function(p){
            try {
                var parsed = parse_probe(p);
                out[p] = parsed.fn(parsed.selector, parsed.arg);
            } catch (e) {
                out[p] = 'PROBE ERROR: ' + e.message;
            }
        });
        return out;
    }

    // ------------------------------------------------------------------
    // 4. synthetic step executor (chrome-cli driver)
    // ------------------------------------------------------------------

    var KEYCODES = {
        Enter: 13, Escape: 27, Backspace: 8, Tab: 9, ArrowUp: 38, ArrowDown: 40,
        ArrowLeft: 37, ArrowRight: 39, Delete: 46, ' ': 32, ',': 188, Home: 36, End: 35
    };

    function key_event(type, key, target){
        var code = KEYCODES[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
        var ev = new KeyboardEvent(type, {key: key, bubbles: true, cancelable: true});
        // NB the app (and jQuery) read the legacy keyCode/which/charCode
        var char_code = type === 'keypress' && key.length === 1 ? key.charCodeAt(0) : 0;
        Object.defineProperty(ev, 'keyCode', {get: function(){ return type === 'keypress' ? char_code : code; }});
        Object.defineProperty(ev, 'which', {get: function(){ return type === 'keypress' ? char_code : code; }});
        Object.defineProperty(ev, 'charCode', {get: function(){ return char_code; }});
        return target.dispatchEvent(ev);
    }

    function mouse(type, el){
        var r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent(type, {
            bubbles: type !== 'mouseenter' && type !== 'mouseleave', cancelable: true, view: window,
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0
        }));
    }

    function press(key, target, held){
        target = target || document.activeElement || document.body;
        var proceed = key_event('keydown', key, target);
        if (proceed && key.length === 1) {
            key_event('keypress', key, target);
            insert_text(target, key);
        } else if (proceed && key === 'Backspace' && 'value' in target && target.value) {
            target.value = target.value.slice(0, -1);
            target.dispatchEvent(new Event('input', {bubbles: true}));
        }
        // NB a held key (`key` steps): keyup after what keydown triggered,
        // like the playwright driver's KEY_HOLD_MS
        if (held) real_set_timeout(function(){ key_event('keyup', key, target); }, 30);
        else key_event('keyup', key, target);
    }

    function insert_text(target, text){
        if (!('value' in target) || target.readOnly) return;
        target.value += text;
        target.dispatchEvent(new InputEvent('input', {bubbles: true, data: text, inputType: 'insertText'}));
    }

    function target_of(step, key){
        var els = all(step[key]);
        return els[step.nth || 0] || null;
    }

    // step name -> handler(step) returning null (ok) or an outcome string
    var STEPS = {
        click: function(s){ var el = target_of(s, 'click'); if (!el) return 'missing'; mouse('mousedown', el); if (el.focus) el.focus(); mouse('mouseup', el); el.click(); },
        dblclick: function(s){ var el = target_of(s, 'dblclick'); if (!el) return 'missing'; el.click(); el.click(); mouse('dblclick', el); },
        mousedown: function(s){ var el = target_of(s, 'mousedown'); if (!el) return 'missing'; mouse('mousedown', el); },
        hover: function(s){ var el = target_of(s, 'hover'); if (!el) return 'missing'; mouse('mouseover', el); mouse('mouseenter', el); mouse('mousemove', el); },
        focus: function(s){ var el = target_of(s, 'focus'); if (!el) return 'missing'; el.focus(); },
        blur: function(s){ var el = s.blur === true ? document.activeElement : target_of(s, 'blur'); if (!el) return 'missing'; el.blur(); },
        type: function(s){
            var el = target_of(s, 'type'); if (!el) return 'missing';
            el.focus();
            if (s.clear) { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); }
            String(s.text).split('').forEach(function(ch){ press(ch, el); });
        },
        key: function(s){
            var el = s.on ? all(s.on)[s.nth || 0] : document.activeElement;
            if (!el) return 'missing';
            if (s.on && el.focus) el.focus();
            press(s.key, el, true);
        },
        fill: function(s){
            var el = target_of(s, 'fill'); if (!el) return 'missing';
            el.focus(); el.value = s.text;
            el.dispatchEvent(new Event('input', {bubbles: true}));
            el.dispatchEvent(new Event('change', {bubbles: true}));
        },
        check: function(s){ var el = target_of(s, 'check'); if (!el) return 'missing'; if (!el.checked) el.click(); },
        uncheck: function(s){ var el = target_of(s, 'uncheck'); if (!el) return 'missing'; if (el.checked) el.click(); },
        hash: function(s){ location.hash = s.hash; },
        back: function(){ history.back(); },
        scroll: function(s){ var el = target_of(s, 'scroll'); if (!el) return 'missing'; el.scrollIntoView(); },
        scroll_y: function(s){ window.scrollTo(0, s.scroll_y); window.dispatchEvent(new Event('scroll')); },
        eval: function(s){ (0, eval)(s.eval); },
        wait: function(){},      // the delay itself is handled by the scheduler
        wait_for: function(){},  // polled by the scheduler
        wait_gone: function(){}  // polled by the scheduler
    };

    function step_name(step){
        for (var name in STEPS) if (step.hasOwnProperty(name)) return name;
        return null;
    }

    function run_steps(scenario, finish){
        var steps = scenario.steps || [], log = [], i = 0;
        var defaults = scenario.timing || {};
        var step_after = defaults.step_after || 400, poll_limit = defaults.wait_for_timeout || 10000;

        function next(){
            if (i >= steps.length) return finish(log);
            var step = steps[i++], name = step_name(step);
            if (name === 'wait') { log.push('ok'); return real_set_timeout(next, step.wait); }
            if (name === 'wait_for' || name === 'wait_gone') {
                var waited = 0;
                (function poll(){
                    var present = !!one(step[name]);
                    if (present === (name === 'wait_for')) { log.push('ok'); return real_set_timeout(next, 50); }
                    if ((waited += 100) > (step.timeout || poll_limit)) {
                        log.push('timeout');
                        return abort();
                    }
                    real_set_timeout(poll, 100);
                })();
                return;
            }
            var outcome;
            try { outcome = STEPS[name](step); } catch (e) { outcome = 'error: ' + e.message; }
            log.push(outcome || 'ok');
            if (outcome) return abort();
            real_set_timeout(next, step.after !== undefined ? step.after : step_after);
        }
        function abort(){
            while (i++ < steps.length) log.push('skipped');
            finish(log);
        }
        next();
    }

    function write_result(scenario, log){
        var node = document.getElementById('__parity_result');
        if (!node){
            node = document.createElement('script');
            node.type = 'application/json';
            node.id = '__parity_result';
            document.documentElement.appendChild(node);
        }
        node.textContent = JSON.stringify({
            steps: log, errors: errors.slice(),
            probes: probe(scenario.probe || [])
        });
    }

    window.__parity = {probe: probe, errors: errors, parse_probe: parse_probe, kinds: Object.keys(KINDS), steps: Object.keys(STEPS)};

    var packed = params.get('p');
    if (packed){
        var scenario = JSON.parse(decodeURIComponent(escape(atob(packed.replace(/-/g, '+').replace(/_/g, '/')))));
        // NB storage presets must land BEFORE the app bundle reads them
        for (var key in (scenario.storage || {})) window.localStorage.setItem(key, scenario.storage[key]);
        window.addEventListener('load', function(){
            real_set_timeout(function(){
                run_steps(scenario, function(log){
                    // NB the probes are captured ONCE, `settle` ms after the
                    // last step, exactly like the playwright driver: time-
                    // sensitive observations (e.g. a notification that hides
                    // after 4 s) must not depend on the driver's budget
                    real_set_timeout(function(){
                        write_result(scenario, log);
                    }, (scenario.timing || {}).settle || 3000);
                });
            }, (scenario.timing || {}).boot || 3000);
        });
    }
})();
