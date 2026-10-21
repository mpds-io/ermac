/*
 * Ermac parity harness: determinism stub + scripted interactions.
 *
 * Loaded BEFORE the application bundle (old or new) on both sides, so that:
 *  - Math.random() yields an identical sequence on both sides (legends, examples,
 *    tooltips, random phase picks, etc.);
 *  - the ?act=<scenario> parameter performs the scripted click AFTER the app
 *    has initialized (wmdata fetched, routes served), exercising the
 *    click-driven UI paths (popups, context columns, sorting, refinement).
 */

(function(){
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
    var real_set_interval = window.setInterval;
    window.setInterval = function(fn, ms){
        window.setTimeout(function(){
            real_set_interval.call(window, function(){}, ms);
        }, 20000);
        return 0;
    };

    // NB parity debugging aid: ?trace=1 records every Math.random call
    var trace = new URLSearchParams(location.search).get('trace');
    if (trace){
        window.name = (parseInt(window.name || '0', 10) + 1) + '';
        var real_random = Math.random;
        var calls = 0;
        var stacks = [];
        var values = [];
        Math.random = function(){
            calls++;
            var value = real_random();
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

    function wait_for(selector, callback, tries) {
        tries = tries || 80;
        if (document.querySelector(selector)) {
            callback();
            return;
        }
        if (tries <= 0) return;
        window.setTimeout(function(){ wait_for(selector, callback, tries - 1); }, 250);
    }

    var acts = {
        'advsearch': function(){
            wait_for('#databrowser div.gallery_item, #databrowser tr.tcell', function(){
                document.getElementById('advsearch_init_trigger').click();
            });
        },
        'open_entry_ctx': function(){
            wait_for('#databrowser tr.tcell', function(){
                document.querySelector('#databrowser tr.tcell').click();
            });
        },
        'sort_col1': function(){
            wait_for('#dataheader_entries th.c2.header', function(){
                document.querySelector('#dataheader_entries th.c2.header').click();
            });
        },
        'sort_col1_twice': function(){
            wait_for('#dataheader_entries th.c2.header', function(){
                var th = document.querySelector('#dataheader_entries th.c2.header');
                th.click();
                window.setTimeout(function(){ th.click(); }, 500);
            });
        },
        'refine_expand': function(){
            wait_for('#refine_col a.extd_refine', function(){
                document.querySelector('#refine_col a.extd_refine').click();
            });
        }
    };

    var act = new URLSearchParams(location.search).get('act');
    if (act && acts[act]){
        window.addEventListener('load', function(){
            acts[act]();
        });
    }
})();