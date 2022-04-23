"use strict";

var wmgui = window.wmgui || {};
console.log(window);

// DOM
wmgui.$ = (NODES = '', METHODS = {}) => {
    NODES = NODES.length > 1 ? document.querySelectorAll(NODES) : [NODES];
    // console.log('NODES:', NODES);

    METHODS = {
        each(callback) {
            if (NODES.length) {
                return NODES.length > 1 ? NODES.forEach(callback) : callback(NODES[0]);
            }
        },
        show(show = true) {
            this.each((node) => node.style.display = show ? 'block' : 'none');
            return this;
        },
        hide() {
            this.each((node) => node.style.display = 'none');
            return this;
        },
        toggle() {
            this.each((node) => node.style.display = (node.style.display === 'none') ? '' : 'none');
            return this;
        },
        is(param) {
            return this.each((node) => {
                switch (param) {
                    case '[style="display: block"]':
                        return node.style.display === 'block';
                    case ':empty':
                        return !node.childNodes.length;
                    case ':checked':
                        return node.checked;
                    case ':disabled':
                        return node.hasAttribute('disabled');
                    case '[required]':
                        return node.hasAttribute('required');
                    default:
                        return false;
                }
            });
        },
        style(styles) {
            return this.each((node) => {
                if (styles) {
                    for (const property in styles) {
                        node.style[property] = styles[property];
                    }
                } else {
                    const style = node.getAttribute('style')
                        ?.split(';').filter(Boolean)
                        ?.reduce((a, c) => {
                            const [k, v] = c.split(':');
                            return { ...a, ...{ [k]: v } };
                        }, {});
                    return style;
                }
            });
        },
        attr(name, value) {
            return this.each((node) => {
                if (value) node.setAttribute(name, value);
                return node.getAttribute(name);
            });
        },
        prop(string) {
            return this.each((node) => {
                if (string.length >= 0) node[prop] = string;
                return node[prop];
            });
        },
        val(string) {
            return this.each((node) => {
                if (string.length >= 0) node.value = string;
                return node.value;
            });
        },
        text(string) {
            return this.each((node) => {
                if (string.length >= 0) node.innerText = string;
                return node.innerText;
            });
        },
        html(string) {
            return this.each((node) => {
                if (string.length >= 0) node.innerHTML = string;
                return node.innerHTML;
            });
        },
        find(selector) {
            return this.each((node) => {
                this.NODES = node.querySelectorAll(selector);
                return this;
            });
        },
        parent() {
            this.each((node) => node.parentNode);
            return this;
        },
        children() {
            this.each((node) => node.childNodes);
            return this;
        },
        siblings() {
            this.each((node) => node.childNodes);
            return this;
        },
        append(string) {
            this.each((node) => node.append(wmgui.$.decode(string).html));
            return this;
        },
        prepend(string) {
            this.each((node) => node.prepend(wmgui.$.decode(string).html));
            return this;
        },
        remove() {
            this.each((node) => node.remove());
            return this;
        },
        empty() {
            this.each((node) => node.innerHTML = '');
            return this;
        },
        addClass() {
            this.each((node) => node.classList.add(...arguments));
            return this;
        },
        removeClass() {
            this.each((node) => node.classList.remove(...arguments));
            return this;
        },
        replaceClass() {
            this.each((node) => node.classList.replace(...arguments));
            return this;
        },
        toggleClass() {
            this.each((node) => node.classList.toggle(...arguments));
            return this;
        },

        click(handler) {
            return this.each((node) => {
                return node.onclick = handler;
            });
        },
        on() {
            return this.each((node) => {
                const event = arguments[0];
                const target = typeof arguments[1] === 'string'
                    ? node.querySelector(arguments[1])
                    : node;
                const handler = (typeof arguments[1] === 'function')
                    ? arguments[1]
                    : arguments[2];
                return target[`on${event}`] = handler;
            });
        },
        off() {
            return this.each((node) => {
                const event = arguments[0];
                const target = typeof arguments[1] === 'string'
                    ? node.querySelector(arguments[1])
                    : node;
                return target[`on${event}`] = null;
            });
        },
        trigger(event) {
            return this.each((node) => {
                return node[event]();
            });
        },
        selectize(opts) {
            return this.each((node) => {
                return new Selectize(node, opts);
            });
        }
    };

    return { NODES, ...METHODS };
};


// UTILS
wmgui.$.object = (obj) => !!obj && obj.constructor === Object;
wmgui.$.merge = (target, source) => {
    return (wmgui.$.object(target) || wmgui.$.object(source))
        ? Object.entries(source)
            .reduce((result, [key, value]) => ({
                ...result, [key]: wmgui.$.merge(result[key], value)
            }), { ...target })
        : source;
};

wmgui.$.isEmpty = (item) => item.length ? item.length : Object.keys(item).length;
wmgui.$.param = (object) => new URLSearchParams(object).toString();
wmgui.$.extend = function (target) {
    const objects = [...arguments].slice(1);
    return objects.reduce((a, c) => {
        return wmgui.$.object(target)
            ? Object.assign(target, { ...a, ...c })
            : target === true
                ? wmgui.$.merge(a, c)
                : ({ ...a, ...c });
    }, {});
};
wmgui.$.decode = (string, decoder) => {
    decoder = document.createElement('div');
    decoder.innerHTML = string;
    return {
        text: decoder.textContent,
        html: decoder.firstChild
    };
};
wmgui.$.fetch = async (url) => {
    const res = await fetch(url);
    const data = await res.json();
    return data;
};
wmgui.$.each = function (items, callback) {
    return items.length
        ? items.forEach(callback)
        : Object.entries(items).forEach(callback);
};

wmgui.$.getJSON = async function (url, callback) {
    const res = await fetch(url);
    const data = await res.json();
    return callback(data);
};


$.isEmptyObject = function (item) {
    return item.length ? item.length : Object.keys(item).length;
};
$.trim = function (str) {
    return str.trim();
};
$.data = function (el, key, value) {
    if (value) $.data[key] = value;
    // console.log(this, el, el.data, key, value);
    return key ? $.data[key] : $.data;
};

const events = ['blur', 'focus', 'focusin', 'focusout', 'resize', 'scroll', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'change', 'select', 'submit', 'keydown', 'keypress', 'keyup', 'contextmenu'];

$.each(events, (i, event) => {
    $.fn[event] = function (callback) {
        if (callback) return this.on(event, callback);
        return this.trigger(event);
    };
});

$.ajax = function (settings) {
    settings.beforeSend();

    const url = settings.data ? `${settings.url}?${new URLSearchParams(settings.data).toString()}` : settings.url;
    console.log(url);
    fetch(url, {
        method: settings.type, // *GET, POST, PUT, DELETE, etc.
        // mode: 'cors', // no-cors, *cors, same-origin
        // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        // credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            // 'Content-Type': 'application/json'
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        // redirect: 'follow', // manual, *follow, error
        // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        // body: JSON.stringify(settings.data) // body data type must match "Content-Type" header
    }).then(response => {
        const data = response.json();
        always(data);
        done(data);
    }).catch((e) => {
        always(e);
        fail(e);
        return { fail };
    }); // parses JSON response into native JavaScript objects

    function always(callback) {
        callback();
        return this;
    }
    function done(callback) {
        callback();
    }
    function fail(callback) {
        callback();
    }
    return { always, done, fail };
};

// ANIMATIONS

$.fn.slideDown = function (duration) {
    console.log($(this).show(), duration);
};