/**
 * Ermac keyboard and assistive-technology support (VPAT / WCAG 2.1.1
 * Keyboard), see the accessibility plan. Everything here is declarative:
 *
 *  - A11Y_CONTROLS: which existing elements are controls (role, name, state
 *    derived from the classes the app already toggles). A MutationObserver
 *    applies them to static and dynamically rendered markup alike, so the
 *    app code that renders rows, chips, crosses etc. stays unchanged.
 *  - Enter / Space activate a non-native control by clicking it, so the
 *    existing click handlers do the work.
 *  - A11Y_ROVING: composite widgets (periodic table, results, thumbnails,
 *    tabs, VIEW switches) are one Tab stop each, arrow keys move inside.
 *  - Dialogs (div.modal.user_dialogue): when one becomes visible, focus moves
 *    into it and the rest of the page is made inert; when none is visible,
 *    focus returns to the control that was focused before.
 *
 * NB the bundle is one shared scope: every top-level name is a11y_-prefixed.
 */

import { $, $$, isVisible } from './dom.js';

const A11Y_NATIVE = 'a[href], button, input, select, textarea, label';
const A11Y_ACTIVATABLE = '[role=button], [role=tab], [role=radio], [role=link], [data-a11y-activate]';

function a11y_text(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

// selector -> {role, label (string or function), state (function -> {attr: value})}
const A11Y_CONTROLS = [
  { selector: 'div.cross', role: 'button', label: 'Close' },
  { selector: 'div.slider_close', role: 'button', label: 'Remove this range' },
  { selector: 'div.wmbutton', role: 'button', label: function (el) { return el.getAttribute('title') || a11y_text(el); } },
  {
    selector: '#userbox',
    role: 'button',
    label: function () {
      const inside = $('#userbox div.logged_in');
      return inside && isVisible(inside) ? 'Account menu' : 'Log in';
    },
    attrs: { 'aria-haspopup': 'dialog' },
  },
  { selector: '#darkmode_trigger', role: 'button', label: function (el) { return 'Dark mode: ' + a11y_text(el); } },
  { selector: 'span.href[rel]', role: 'link' },
  { selector: '#notifybox span.relogin', role: 'button' },
  { selector: 'strong.numeric', role: 'button', label: function (el) { return 'Numeric search: ' + (el.parentNode ? a11y_text(el.parentNode) : a11y_text(el)); } },
  { selector: '#hy_box span[class^="hy"]', role: 'button', state: function (el) { return { 'aria-expanded': String(a11y_text(el) === 'collapse') }; } },
  { selector: '#hy_box a.dynprop', role: 'button' },
  {
    selector: '#ptable_area > ul > li[data-pos]',
    role: 'button',
    label: function (el) {
      const name = el.querySelector('span');
      const symbol = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue.trim() : '';
      return (name ? a11y_text(name) : '') + (symbol ? ' (' + symbol + ')' : '');
    },
    state: function (el) { return { 'aria-pressed': String(/\bselected_[abc]\b/.test(el.className)) }; },
    roving: true,
  },
  { selector: '#ptable_area > ul', role: 'group', label: 'Periodic table', tabindex: null },
  { selector: '#dtypes > ul > li, #dtypes_phid > ul > li', role: 'button', state: function (el) { return { 'aria-pressed': String(el.classList.contains('active')) }; } },
  { selector: '#interpret > li', role: 'button' },
  // NB the chips keep the multiselect's own keyboard model (Backspace in the
  // empty search field removes the last one, the arrows move between them)
  { selector: '#search_holder div.selectize-input > div[data-term]', role: null, tabindex: null,
    label: function (el) { return a11y_text(el).replace(/×$/, '') + ', press Backspace in the search field to remove'; },
    attrs: { 'data-a11y-keyboard': 'Backspace in the search field' } },
  { selector: 'div.controlswitch', role: 'radiogroup', tabindex: null, label: function (el) { return el.querySelector('#control_a') ? 'Results' : 'Display'; } },
  { selector: 'div.controlswitch > div', role: 'radio', state: function (el) { return { 'aria-checked': String(el.classList.contains('active')) }; }, roving: true },
  { selector: '#advstab_options, #hy_options, #tab_links', role: 'tablist', tabindex: null },
  {
    selector: '#advstab_options > li, #hy_options > li, #tab_links > li',
    role: 'tab',
    state: function (el) {
      const state = { 'aria-selected': String(el.classList.contains('working')) };
      if (el.getAttribute('rev')) state['aria-controls'] = el.getAttribute('rev');
      return state;
    },
    roving: true,
  },
  { selector: 'div.advstab, #hy_box div.hy_tabs, div.menu_tabs', role: 'tabpanel', tabindex: null },
  { selector: 'th.header', role: null, state: function (el) {
      const sort = el.classList.contains('headerSortDown') ? 'ascending' : el.classList.contains('headerSortUp') ? 'descending' : 'none';
      return { 'aria-sort': sort };
    }, activate: true },
  { selector: '#databrowser span.launch_v', role: 'button', label: 'Preview' },
  { selector: '#visualize, #xrpdize', role: 'button' },
  { selector: '#ctxpanel_matrix > ul > li, #ctxpanel_cube > ul > li, #ctxpanel_graph > ul > li, li.discovery_custom', role: 'button' },
  { selector: '#ss_gear_matrix, #ss_gear_cube', role: 'button', label: 'Settings' },
  { selector: '#discovery_custom_box div.rearrange', role: 'button' },
  { selector: '#tooltip span', role: 'button' },
  { selector: '#ctx_col span.extd', role: 'button' },
  // composite widgets: the items get data-a11y-activate (Enter / Space click them)
  { selector: '#databrowser tr.tcell, #databrowser div.gallery_item', role: null, roving: true, activate: true },
  { selector: '#all_polyhedra_content div.gallery_item', role: 'button', roving: true, label: function (el) { return a11y_text(el); } },
];

// container -> item selector; columns: a number, 'auto' (items per visual row) or 'grid'
const A11Y_ROVING = [
  { container: '#ptable_area > ul', items: 'li[data-pos]', columns: 'grid', grid_cells: 'li', grid_width: 18 },
  { container: '#databrowser', items: 'tr.tcell, div.gallery_item', columns: 'auto' },
  { container: '#all_polyhedra_content', items: 'div.gallery_item', columns: 'auto' },
  { container: '#advstab_options', items: 'li', columns: 0 },
  { container: '#hy_options', items: 'li', columns: 0 },
  { container: '#tab_links', items: 'li', columns: 0 },
  { container: 'div.controlswitch', items: 'div', columns: 0 },
];

function a11y_set(el, name, value) {
  if (value === null || value === undefined) return;
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function a11y_apply(spec, el) {
  if (spec.role && !el.hasAttribute('role')) el.setAttribute('role', spec.role);
  // NB roving items get their tabindex from a11y_roving_sync()
  if (spec.tabindex !== null && !spec.roving && !el.matches(A11Y_NATIVE) && !el.hasAttribute('tabindex'))
    el.setAttribute('tabindex', '0');
  if (spec.activate) a11y_set(el, 'data-a11y-activate', '');
  if (spec.label) a11y_set(el, 'aria-label', typeof spec.label === 'function' ? spec.label(el) : spec.label);
  for (const name in spec.attrs || {}) a11y_set(el, name, spec.attrs[name]);
  if (spec.state) {
    const state = spec.state(el);
    for (const name in state) a11y_set(el, name, state[name]);
  }
}

function a11y_columns(spec, items) {
  if (typeof spec.columns === 'number') return spec.columns;
  // 'auto': the number of items on the first visual row
  const top = items.length ? items[0].offsetTop : 0;
  let n = 0;
  while (n < items.length && items[n].offsetTop === top) n++;
  return Math.max(n, 1);
}

function a11y_roving_items(spec, container) {
  return Array.prototype.filter.call(container.querySelectorAll(spec.items), function (el) {
    return el.parentNode === container || container.contains(el);
  }).filter(isVisible);
}

function a11y_roving_sync(spec, container) {
  const items = a11y_roving_items(spec, container);
  if (!items.length) return;
  // the focused item, else the selected tab / checked radio, else the previous stop, else the first
  const chosen = function (el) {
    return el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true';
  };
  const current = items.indexOf(document.activeElement) !== -1 ? document.activeElement :
    items.filter(chosen)[0] ||
    items.filter(function (el) { return el.getAttribute('tabindex') === '0'; })[0] ||
    items[0];
  items.forEach(function (el) {
    a11y_set(el, 'tabindex', el === current ? '0' : '-1');
  });
}

function a11y_roving_key(spec, container, event) {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (keys.indexOf(event.key) === -1) return;
  const items = a11y_roving_items(spec, container);
  const index = items.indexOf(event.target);
  if (index === -1) return;
  let target = null;
  if (event.key === 'Home') target = items[0];
  else if (event.key === 'End') target = items[items.length - 1];
  else if (spec.columns === 'grid') {
    // NB the periodic table: a fixed grid that includes empty spacer cells
    const cells = Array.prototype.slice.call(container.querySelectorAll(':scope > ' + spec.grid_cells));
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: spec.grid_width, ArrowUp: -spec.grid_width }[event.key];
    let at = cells.indexOf(event.target) + step;
    while (at >= 0 && at < cells.length && items.indexOf(cells[at]) === -1) at += step;
    target = cells[at] || null;
  } else {
    const columns = a11y_columns(spec, items);
    const step = columns === 0
      ? { ArrowRight: 1, ArrowLeft: -1 }[event.key] // NB tabs and switches: horizontal only
      : { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
    if (step) target = items[index + step] || null;
  }
  if (!target) return;
  event.preventDefault();
  items.forEach(function (el) { a11y_set(el, 'tabindex', el === target ? '0' : '-1'); });
  target.focus();
  if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
}

function a11y_sync() {
  A11Y_CONTROLS.forEach(function (spec) {
    $$(spec.selector).forEach(function (el) { a11y_apply(spec, el); });
  });
  A11Y_ROVING.forEach(function (spec) {
    $$(spec.container).forEach(function (container) { a11y_roving_sync(spec, container); });
  });
}

// -- dialogs ----------------------------------------------------------------

const A11Y_DIALOG = 'div.modal.user_dialogue';
// shown together with dialogs: must stay usable
// NB #numericbox: the sliders opened from the advanced search, next to it;
// #userbox stays above the overlay and toggles the login / account dialogs;
// div.autocomplete-suggestions: appended to <body>, used by dialog fields
const A11Y_NOT_INERT = ['#overlay', '#notifybox', '#aetmap', '#numericbox', '#userbox', 'div.menu_collateral',
  'div.autocomplete-suggestions', '#tooltip', '#preloader'];
let a11y_dialog_state = null; // {box, opener}
let a11y_last_outside = null; // the last focused element outside any dialog

function a11y_visible_dialog() {
  return $$(A11Y_DIALOG).filter(isVisible).pop() || null;
}

export function open_dialog(box, initial) {
  const opener = a11y_dialog_state ? a11y_dialog_state.opener : a11y_last_outside;
  release_dialog(false);
  a11y_set(box, 'role', 'dialog');
  a11y_set(box, 'aria-modal', 'true');
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (el === box || el.contains(box) || el.inert) return;
    if (A11Y_NOT_INERT.some(function (selector) { return el.matches(selector); })) return;
    el.inert = true;
    el.setAttribute('data-a11y-inert', '');
  });
  // NB code that shows a dialog may already have focused a field in it;
  // otherwise the dialog itself takes focus (no focus ring for mouse users),
  // and the next Tab reaches its first control
  if (!box.contains(document.activeElement)) {
    const target = (initial && box.querySelector(initial)) || box;
    if (target === box) a11y_set(box, 'tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  a11y_dialog_state = { box: box, opener: opener };
}

export function release_dialog(restore) {
  $$('[data-a11y-inert]').forEach(function (el) {
    el.inert = false;
    el.removeAttribute('data-a11y-inert');
  });
  const state = a11y_dialog_state;
  a11y_dialog_state = null;
  if (restore !== false && state && state.opener && state.opener.isConnected && isVisible(state.opener)) {
    const focus = document.activeElement;
    if (!focus || focus === document.body || state.box.contains(focus)) state.opener.focus();
  }
}

function a11y_dialog_check() {
  const box = a11y_visible_dialog();
  if (box && (!a11y_dialog_state || a11y_dialog_state.box !== box)) open_dialog(box);
  else if (!box && a11y_dialog_state) release_dialog();
}

// -- entry columns: focus in on keyboard activation, back to the row on close --

let a11y_context_row = null;

export function a11y_context_opened(row, by_keyboard) {
  a11y_context_row = row;
  const title = $('#ctx_col div.col_title');
  if (!by_keyboard || !title || !isVisible($('#ctx_col'))) return;
  title.setAttribute('tabindex', '-1');
  title.focus();
}

export function a11y_context_closed() {
  const row = a11y_context_row;
  a11y_context_row = null;
  const focus = document.activeElement;
  if (row && row.isConnected && isVisible(row) &&
      (!focus || focus === document.body || focus.closest('#ctx_col, #sim_col'))) row.focus();
}

// -- non-modal popups: focus back to the opener on close -------------------------

// NB #numericbox (the sliders of a numeric property) opens next to a dialog;
// hiding it with the focus inside would drop the focus to <body>
const A11Y_POPUPS = ['#numericbox'];
const a11y_popup_state = {}; // selector -> the element focused when it opened

function a11y_popup_check() {
  A11Y_POPUPS.forEach(function (selector) {
    const box = $(selector);
    if (!box) return;
    const shown = isVisible(box);
    if (shown && !(selector in a11y_popup_state)) {
      a11y_popup_state[selector] = box.contains(document.activeElement) ? null : document.activeElement;
    } else if (!shown && selector in a11y_popup_state) {
      const opener = a11y_popup_state[selector];
      delete a11y_popup_state[selector];
      const focus = document.activeElement;
      if (opener && opener.isConnected && isVisible(opener) &&
          (!focus || focus === document.body || box.contains(focus))) opener.focus({ preventScroll: true });
    }
  });
}

// -- skip control --------------------------------------------------------------

function a11y_skip() {
  const targets = ['#databrowser [tabindex="0"]', '#ptable_area [tabindex="0"]', '#databrowser'];
  for (let i = 0; i < targets.length; i++) {
    const el = $(targets[i]);
    if (el && isVisible(el)) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus();
      return;
    }
  }
}

// -- installation ---------------------------------------------------------------

export function install_a11y() {
  a11y_sync();

  document.addEventListener('keydown', function (event) {
    const el = event.target;
    if ((event.key === 'Enter' || event.key === ' ') && el && el.matches &&
        el.matches(A11Y_ACTIVATABLE) && !el.matches(A11Y_NATIVE)) {
      event.preventDefault(); // NB Space must not scroll the page
      el.click();
      return;
    }
    for (let i = 0; i < A11Y_ROVING.length; i++) {
      const spec = A11Y_ROVING[i];
      const container = el && el.closest ? el.closest(spec.container) : null;
      if (container) return a11y_roving_key(spec, container, event);
    }
  });

  document.addEventListener('focusin', function (event) {
    if (!event.target.closest || !event.target.closest(A11Y_DIALOG)) a11y_last_outside = event.target;
  });

  const skip = $('#a11y_skip');
  if (skip) skip.addEventListener('click', a11y_skip);

  // NB microtask-driven, no timers: deterministic under the parity fake clock
  new MutationObserver(function (mutations) {
    let dialogs = false,
      popups = false,
      content = false;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type !== 'attributes' || m.attributeName === 'class') content = true;
      if (m.target.nodeType === 1 && m.target.matches(A11Y_DIALOG)) dialogs = true;
      if (m.target.nodeType === 1 && A11Y_POPUPS.some(function (s) { return m.target.matches(s); })) popups = true;
    }
    // NB style-only changes (animations, show/hide) need no new attributes
    if (content) a11y_sync();
    if (dialogs) a11y_dialog_check();
    if (popups) a11y_popup_check();
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
}
