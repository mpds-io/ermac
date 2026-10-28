/**
 * Ermac DOM helpers: a minimal vanilla replacement for the jQuery idioms used in this codebase.
 */

export function $(selector, root) {
  return (root || document).querySelector(selector);
}

export function $$(selector, root) {
  return Array.prototype.slice.call(
    (root || document).querySelectorAll(selector),
  );
}

/**
 * Element data store, mimicking jQuery .data(key, value)
 */

const data_store = new WeakMap();

export function data(el, key, value) {
  if (value !== undefined) {
    if (!data_store.has(el)) data_store.set(el, {});
    data_store.get(el)[key] = value;
    return value;
  }
  const stored = data_store.get(el);
  return stored && stored[key] !== undefined ? stored[key] : undefined;
}

/**
 * Display control, with the jQuery 3 .show() / .hide() / .toggle() semantics:
 * hide() remembers the inline display it overrides, show() restores it, or
 * clears the inline value and, if the stylesheet still hides the element,
 * uses the default display of its tag (block for div, list-item for li...).
 * NB only the element itself is considered, not its ancestors.
 */

const olddisplay = new WeakMap();
const default_displays = {};

function default_display(el) {
  const name = el.nodeName;
  if (default_displays[name]) return default_displays[name];
  const temp = document.body.appendChild(document.createElement(name));
  let display = window.getComputedStyle(temp).display;
  temp.parentNode.removeChild(temp);
  if (display === 'none') display = 'block';
  default_displays[name] = display;
  return display;
}

function hidden_within_tree(el) {
  return (
    el.style.display === 'none' ||
    (el.style.display === '' &&
      el.isConnected &&
      window.getComputedStyle(el).display === 'none')
  );
}

function show_one(el) {
  let value = null;
  if (el.style.display === 'none') {
    value = olddisplay.get(el) || null;
    if (!value) el.style.display = '';
  }
  if (el.style.display === '' && hidden_within_tree(el)) value = default_display(el);
  if (value !== null) el.style.display = value;
}

function hide_one(el) {
  const display = el.style.display;
  if (display !== 'none') {
    olddisplay.set(el, display);
    el.style.display = 'none';
  }
}

export function show(els) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el) show_one(el);
  });
}

export function hide(els) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el) hide_one(el);
  });
}

// NB jQuery .toggle(): the display argument is kept for the call sites, but
// like jQuery the shown state is the restored/default display
export function toggle_display(els) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (!el) return;
    if (hidden_within_tree(el)) show_one(el);
    else hide_one(el);
  });
}

export function isVisible(el) {
  return !!(
    el &&
    (el.offsetParent ||
      el.offsetWidth ||
      el.offsetHeight ||
      el.getClientRects().length)
  );
}

/**
 * Content manipulation
 */

export function set_html(el, markup) {
  if (el) el.innerHTML = markup;
}

export function append_html(el, markup) {
  if (el) el.insertAdjacentHTML('beforeend', markup);
}

export function prepend_html(el, markup) {
  if (el) el.insertAdjacentHTML('afterbegin', markup);
}

export function after_html(el, markup) {
  if (el) el.insertAdjacentHTML('afterend', markup);
}

export function empty(els) {
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el) while (el.firstChild) el.removeChild(el.firstChild);
  });
}

export function remove(els) {
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
}

/**
 * Attributes, values, classes
 */

export function get_attr(el, name) {
  return el ? el.getAttribute(name) : null;
}

export function set_attr(el, name, value) {
  if (el) el.setAttribute(name, value);
}

export function get_val(el) {
  return el ? el.value : '';
}

export function set_val(el, value) {
  if (el) el.value = value;
}

export function get_text(el) {
  return el ? el.textContent : '';
}

/**
 * Geometry, mimicking jQuery .offset() and .position()
 */

export function offset(el) {
  if (!el) return { left: 0, top: 0 };
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
}

export function position(el) {
  if (!el) return { left: 0, top: 0 };
  const rect = el.getBoundingClientRect();
  if (!el.offsetParent) return { left: rect.left, top: rect.top };
  const parent = el.offsetParent.getBoundingClientRect();
  return {
    left: rect.left - parent.left - el.offsetParent.clientLeft,
    top: rect.top - parent.top - el.offsetParent.clientTop,
  };
}

export function scroll_top() {
  return window.scrollY || document.documentElement.scrollTop;
}

export function window_height() {
  return window.innerHeight || document.documentElement.clientHeight;
}

/**
 * Simple animations, mimicking jQuery slideUp/slideDown/fadeOut.
 * NB the ticks are setTimeout-driven (like the old jQuery fx loop), NOT
 * requestAnimationFrame: compositor-driven frames do not advance while a
 * headless virtual-time budget runs, freezing rAF animations mid-flight.
 */

function animate(el, from, to, duration, on_finish) {
  const start = performance.now();
  el.style.overflow = 'hidden';
  function step() {
    const progress = Math.min((performance.now() - start) / duration, 1);
    el.style.height = from + (to - from) * progress + 'px';
    if (progress < 1) setTimeout(step, 16);
    else {
      el.style.overflow = '';
      el.style.height = '';
      if (on_finish) on_finish();
    }
  }
  setTimeout(step, 16);
}

export function slide_up(el, duration, on_finish) {
  if (!el || !isVisible(el)) {
    if (on_finish) on_finish();
    return;
  }
  const h = el.offsetHeight;
  animate(el, h, 0, duration || 250, function () {
    el.style.display = 'none';
    if (on_finish) on_finish();
  });
}

export function slide_down(el, duration) {
  if (!el) return;
  el.style.display = ''; // NB let the natural display apply, mimicking jQuery
  if (!isVisible(el)) el.style.display = 'block';
  const h = el.offsetHeight;
  animate(el, 0, h, duration || 250);
}

export function fade_out(el, duration, on_finish) {
  if (!el) {
    if (on_finish) on_finish();
    return;
  }
  const start_opacity = parseFloat(el.style.opacity || '1');
  const start = performance.now();
  function step() {
    const progress = Math.min((performance.now() - start) / (duration || 250), 1);
    el.style.opacity = String(start_opacity * (1 - progress));
    if (progress < 1) setTimeout(step, 16);
    else if (on_finish) on_finish();
  }
  setTimeout(step, 16);
}

/**
 * Delegated events with the jQuery .on(event, selector, handler) semantics:
 *  - all delegated handlers of a root run from ONE native listener, the
 *    deepest matching element first (registration order within a level);
 *  - stopPropagation() in a handler stops the handlers of the outer
 *    matching elements of the same root (e.g. a button inside a row);
 *  - a handler returning false means preventDefault() + stopPropagation();
 *  - delegated clicks ignore non-primary mouse buttons.
 */

const delegations = new WeakMap(); // root -> {type: [{selector, handler}]}

export function on(root, selector, type, handler) {
  root = root || document;
  let types = delegations.get(root);
  if (!types) {
    types = {};
    delegations.set(root, types);
  }
  if (!types[type]) {
    types[type] = [];
    const entries = types[type];
    root.addEventListener(type, function (event) {
      if (type === 'click' && event.button >= 1) return;
      const queue = [];
      for (let cur = event.target; cur && cur !== root; cur = cur.parentNode) {
        if (cur.nodeType !== 1) continue;
        const matched = entries.filter(function (entry) {
          return cur.matches(entry.selector);
        });
        if (matched.length) queue.push({ el: cur, entries: matched });
      }
      let immediate_stop = false;
      const native_stop_immediate = event.stopImmediatePropagation;
      event.stopImmediatePropagation = function () {
        immediate_stop = true;
        return native_stop_immediate.call(event);
      };
      try {
        for (let i = 0; i < queue.length; i++) {
          if (event.cancelBubble) break;
          const level = queue[i];
          for (let j = 0; j < level.entries.length; j++) {
            const result = level.entries[j].handler.call(level.el, event, level.el);
            if (result === false) {
              event.preventDefault();
              event.stopPropagation();
            }
            if (immediate_stop) break;
          }
          if (immediate_stop) break;
        }
      } finally {
        event.stopImmediatePropagation = native_stop_immediate;
      }
    });
  }
  types[type].push({ selector: selector, handler: handler });
}
