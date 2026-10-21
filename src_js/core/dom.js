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
 * Display control
 */

export function show(els, display) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (!el) return;
    // NB restore the natural display, like jQuery .show(): only set an
    // explicit value when the element is still hidden by the stylesheet
    el.style.display = '';
    if (!isVisible(el)) el.style.display = display || 'block';
  });
}

export function hide(els) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el) el.style.display = 'none';
  });
}

export function toggle_display(els, display) {
  if (!els) return;
  if (!Array.isArray(els)) els = [els];
  els.forEach(function (el) {
    if (el) el.style.display = isVisible(el) ? 'none' : display || 'block';
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
 * Delegated events, mimicking jQuery .on(event, selector, handler)
 */

export function on(root, selector, type, handler) {
  (root || document).addEventListener(type, function (event) {
    const matched = event.target.closest
      ? event.target.closest(selector)
      : null;
    if (matched && (root || document).contains(matched))
      handler.call(matched, event, matched);
  });
}
