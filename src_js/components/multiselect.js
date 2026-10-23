/**
 * Ermac multiselect: a vanilla port of the subset of selectize.js 0.12
 * (with the remove_button and preserve_on_blur plugins) used by Ermac.
 *
 * NB the specification is the vendored selectize.js of the jQuery era
 * (see git history: src_js/third_party/selectize.js): the DOM it renders,
 * the CSS state classes it toggles and the moments it toggles them, its
 * keyboard and mouse semantics. Deliberate quirks of that vendored copy:
 *  - the Enter handler is commented out: Enter never picks a suggestion,
 *    it bubbles up to the app handlers that run the search with the text;
 *  - hideSelected (multi mode default): selected options are not offered;
 *  - clearOptions() keeps the options of the selected items.
 *
 * API used by the app: addOption, addItem, removeItem, clearOptions, clear,
 * open, close, items (array of option data objects), input_el, and the
 * settings callbacks onInitialize, onChange, onItemAdd, onItemRemove, load.
 * The text input keeps the selectize id convention: <select id>-selectized.
 */

const KEY = {
  A: 65, RETURN: 13, ESC: 27, LEFT: 37, UP: 38, P: 80, RIGHT: 39, DOWN: 40,
  N: 78, BACKSPACE: 8, DELETE: 46, SHIFT: 16, CTRL: 17, CMD: 91, TAB: 9,
};
const IS_MAC = /Mac/.test(navigator.userAgent);

let test_span = null;

function measure_string(str, input) {
  if (!str) return 0;
  if (!test_span) {
    test_span = document.createElement('span');
    Object.assign(test_span.style, {
      position: 'absolute', top: '-99999px', left: '-99999px',
      width: 'auto', padding: '0', whiteSpace: 'pre',
    });
    document.body.appendChild(test_span);
  }
  test_span.textContent = str;
  const cs = window.getComputedStyle(input);
  ['letterSpacing', 'fontSize', 'fontFamily', 'fontWeight', 'textTransform'].forEach(
    function (name) {
      test_span.style[name] = cs[name];
    },
  );
  return parseFloat(window.getComputedStyle(test_span).width) || 0;
}

// NB jQuery .width(value): the value is the content width, border-box
// elements get their padding and border added
function set_content_width(el, width) {
  const cs = window.getComputedStyle(el);
  if (cs.boxSizing === 'border-box')
    width +=
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) +
      parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
  el.style.width = width + 'px';
}

function escape_html(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function html_to_element(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html).trim();
  return tpl.content.firstElementChild;
}

export function create_multiselect(select_el, settings) {
  settings = settings || {};
  const plugins = settings.plugins || [];
  const max_items = settings.maxItems || null;
  const hide_selected = settings.hideSelected == null ? true : settings.hideSelected;
  const load_throttle = settings.loadThrottle == null ? 300 : settings.loadThrottle;

  const self = {
    settings: settings,
    items: [], // option data objects, in display order
    is_open: false,
    is_focused: false,
    is_input_hidden: false,
    caret_pos: 0,
    last_value: '',
    ignore_hover: false,
    is_shift_down: false,
    is_ctrl_down: false,
    is_cmd_down: false,
  };
  const options = new Map(); // value (string) -> option data, insertion order
  let values = []; // values of self.items
  let active_items = []; // chip elements
  let active_option = null; // option element
  let counter = 0;
  let search_timer = null;

  const render_item =
    (settings.render && settings.render.item) ||
    function (data) {
      return '<div>' + escape_html(data.label) + '</div>';
    };
  const render_option =
    (settings.render && settings.render.option) ||
    function (data) {
      return '<div>' + escape_html(data.label) + '</div>';
    };
  const remove_button_html =
    '<a href="javascript:void(0)" class="remove" tabindex="-1" title="Remove">&times;</a>';

  // ---------------------------------------------------------------- DOM
  // NB the exact structure, attributes and classes of selectize 0.12

  select_el.setAttribute('multiple', 'multiple');
  const tab_index = select_el.getAttribute('tabindex') || '';
  select_el.setAttribute('tabindex', '-1');
  select_el.classList.add('selectized');
  select_el.style.display = 'none';

  const plugin_classes = plugins.map(function (name) {
    return 'plugin-' + name;
  });

  const wrapper = document.createElement('div');
  wrapper.className = ['selectize-control', 'multi'].concat(plugin_classes).join(' ');
  const control = document.createElement('div');
  control.className = 'selectize-input items';
  wrapper.appendChild(control);

  const text_input = document.createElement('input');
  text_input.setAttribute('type', 'select-multiple');
  text_input.setAttribute('autocomplete', 'off');
  text_input.setAttribute('tabindex', tab_index);
  text_input.id = (select_el.id || '') + '-selectized';
  control.appendChild(text_input);

  const dropdown = document.createElement('div');
  dropdown.className = ['selectize-dropdown', 'multi'].concat(plugin_classes).join(' ');
  dropdown.style.display = 'none';
  const dropdown_content = document.createElement('div');
  dropdown_content.className = 'selectize-dropdown-content';
  dropdown.appendChild(dropdown_content);
  wrapper.appendChild(dropdown);

  select_el.insertAdjacentElement('afterend', wrapper);

  // ---------------------------------------------------------------- helpers

  function trigger(name) {
    const callback = settings[name];
    if (typeof callback === 'function')
      callback.apply(self, Array.prototype.slice.call(arguments, 1));
  }

  function is_full() {
    return max_items !== null && self.items.length >= max_items;
  }

  function item_elements() {
    return Array.prototype.filter.call(control.children, function (el) {
      return el !== text_input;
    });
  }

  function option_elements() {
    return Array.prototype.slice.call(
      dropdown_content.querySelectorAll('[data-selectable]'),
    );
  }

  function get_option_element(value) {
    return (
      option_elements().find(function (el) {
        return el.getAttribute('data-value') === value;
      }) || null
    );
  }

  function get_item_element(value) {
    return (
      item_elements().find(function (el) {
        return el.getAttribute('data-value') === value;
      }) || null
    );
  }

  function input_selection() {
    return {
      start: text_input.selectionStart || 0,
      length: (text_input.selectionEnd || 0) - (text_input.selectionStart || 0),
    };
  }

  function refresh_classes() {
    const full = is_full();
    const list = control.classList;
    list.toggle('focus', self.is_focused);
    list.toggle('full', full);
    list.toggle('not-full', !full);
    list.toggle('input-active', self.is_focused && !self.is_input_hidden);
    list.toggle('dropdown-active', self.is_open);
    list.toggle('has-options', options.size > 0);
    list.toggle('has-items', self.items.length > 0);
  }

  function update_original_input() {
    select_el.innerHTML = values
      .map(function (value) {
        return (
          '<option value="' + escape_html(value) + '" selected="selected">' +
          escape_html(options.get(value).label || '') + '</option>'
        );
      })
      .join('');
    trigger(
      'onChange',
      values.length ? values.slice() : null,
    );
  }

  // autoGrow: the input is as wide as its text (+4px)
  let current_width = null;
  function auto_grow(event, force) {
    event = event || {};
    if (event.metaKey || event.altKey) return;
    if (!force && (is_full() || false)) return; // NB selectize data('grow')
    let value = text_input.value;
    if (event.type === 'keydown') {
      const code = event.keyCode;
      const printable =
        (code >= 48 && code <= 57) || (code >= 65 && code <= 90) ||
        (code >= 96 && code <= 111) || (code >= 186 && code <= 222) || code === 32;
      if (code === KEY.DELETE || code === KEY.BACKSPACE) {
        const sel = input_selection();
        if (sel.length)
          value = value.substring(0, sel.start) + value.substring(sel.start + sel.length);
        else if (code === KEY.BACKSPACE && sel.start)
          value = value.substring(0, sel.start - 1) + value.substring(sel.start + 1);
        else if (code === KEY.DELETE)
          value = value.substring(0, sel.start) + value.substring(sel.start + 1);
      } else if (printable) {
        const character = String.fromCharCode(code);
        value += event.shiftKey ? character.toUpperCase() : character.toLowerCase();
      }
    }
    const width = measure_string(value, text_input) + 4;
    if (width !== current_width) {
      current_width = width;
      set_content_width(text_input, width);
      position_dropdown();
    }
  }

  function set_textbox_value(value) {
    if (text_input.value !== value) {
      text_input.value = value;
      self.last_value = value;
      auto_grow({ type: 'update' });
    }
  }

  function hide_input() {
    set_textbox_value('');
    Object.assign(text_input.style, { opacity: '0', position: 'absolute', left: '-10000px' });
    self.is_input_hidden = true;
  }

  function show_input() {
    Object.assign(text_input.style, { opacity: '1', position: 'relative', left: '0px' });
    self.is_input_hidden = false;
  }

  // NB like selectize: the CHIPS are moved around the input, never the input
  // itself (re-inserting a focused element would blur it)
  function set_caret(i) {
    i = Math.max(0, Math.min(values.length, i));
    item_elements().forEach(function (child, j) {
      if (j < i) control.insertBefore(child, text_input);
      else control.appendChild(child);
    });
    self.caret_pos = i;
  }

  function position_dropdown() {
    // NB jQuery $control.position() + outerHeight(true)
    const parent = control.offsetParent || document.documentElement;
    const rect = control.getBoundingClientRect();
    const prect = parent.getBoundingClientRect();
    const pcs = window.getComputedStyle(parent);
    const cs = window.getComputedStyle(control);
    const margin_top = parseFloat(cs.marginTop) || 0;
    const margin_bottom = parseFloat(cs.marginBottom) || 0;
    const margin_left = parseFloat(cs.marginLeft) || 0;
    const top =
      rect.top - prect.top - (parseFloat(pcs.borderTopWidth) || 0) - margin_top +
      rect.height + margin_top + margin_bottom;
    const left = rect.left - prect.left - (parseFloat(pcs.borderLeftWidth) || 0) - margin_left;
    dropdown.style.width = rect.width + 'px';
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';
  }

  function set_active_option(el, no_scroll) {
    if (active_option) active_option.classList.remove('active');
    active_option = el || null;
    if (active_option) active_option.classList.add('active');
    if (active_option && !no_scroll) {
      // keep the active option scrolled into the dropdown viewport
      const menu = dropdown_content;
      const y = active_option.offsetTop - menu.offsetTop;
      if (y + active_option.offsetHeight > menu.clientHeight + menu.scrollTop)
        menu.scrollTop = y - menu.clientHeight + active_option.offsetHeight;
      else if (y < menu.scrollTop) menu.scrollTop = y;
    }
  }

  function set_active_item(item_el, event) {
    if (!item_el) {
      active_items.forEach(function (el) {
        el.classList.remove('active');
      });
      active_items = [];
      if (self.is_focused) show_input();
      return;
    }
    const type = event && event.type;
    if (type === 'mousedown' && self.is_shift_down && active_items.length) {
      const children = Array.prototype.slice.call(control.childNodes);
      const last = active_items[active_items.length - 1];
      let begin = children.indexOf(last), end = children.indexOf(item_el);
      if (begin > end) { const swap = begin; begin = end; end = swap; }
      for (let i = begin; i <= end; i++) {
        const node = children[i];
        if (node !== text_input && active_items.indexOf(node) === -1) {
          node.classList.add('active');
          active_items.push(node);
        }
      }
      event.preventDefault();
    } else if (type === 'mousedown' && self.is_ctrl_down) {
      if (item_el.classList.contains('active')) {
        active_items.splice(active_items.indexOf(item_el), 1);
        item_el.classList.remove('active');
      } else {
        item_el.classList.add('active');
        active_items.push(item_el);
      }
    } else {
      active_items.forEach(function (el) {
        el.classList.remove('active');
      });
      item_el.classList.add('active');
      active_items = [item_el];
    }
    hide_input();
    if (!self.is_focused) focus();
  }

  // NB selectize focus(): the native focus event is ignored, onFocus runs on
  // the next tick instead; e.g. the dropdown opened while the app writes a
  // route's chips gets refreshed (and closed) after write() completed
  let ignore_focus = false;
  function focus() {
    ignore_focus = true;
    text_input.focus();
    setTimeout(function () {
      ignore_focus = false;
      on_focus();
    }, 0);
  }

  // ---------------------------------------------------------------- options

  self.addOption = function (data) {
    if (Array.isArray(data)) {
      data.forEach(self.addOption);
      return;
    }
    counter += 1;
    if (data.id === undefined || data.id === null) data.id = counter;
    const value = String(data.id);
    if (options.has(value)) return;
    options.set(value, data);
  };

  self.clearOptions = function () {
    // NB the vendored selectize keeps the options of the selected items
    Array.from(options.keys()).forEach(function (value) {
      if (values.indexOf(value) === -1) options.delete(value);
    });
  };

  function refresh_options(trigger_dropdown) {
    if (trigger_dropdown === undefined) trigger_dropdown = true;
    const active_before = active_option && active_option.getAttribute('data-value');

    dropdown_content.innerHTML = '';
    options.forEach(function (data, value) {
      if (hide_selected && values.indexOf(value) !== -1) return;
      const el = html_to_element(render_option(data, escape_html));
      if (!el) return;
      el.setAttribute('data-selectable', '');
      el.setAttribute('data-value', value);
      dropdown_content.appendChild(el);
    });
    active_option = null;

    const has_options = dropdown_content.children.length > 0;
    self.has_options = has_options;
    if (has_options) {
      let active = active_before && get_option_element(active_before);
      if (!active) active = dropdown_content.querySelector('[data-selectable]');
      set_active_option(active);
      if (trigger_dropdown && !self.is_open) self.open();
    } else {
      set_active_option(null);
      if (trigger_dropdown && self.is_open) self.close();
    }
  }
  self.refreshOptions = refresh_options;

  self.open = function () {
    if (self.is_open || is_full()) return;
    focus();
    self.is_open = true;
    refresh_classes();
    dropdown.style.visibility = 'hidden';
    dropdown.style.display = 'block';
    position_dropdown();
    dropdown.style.visibility = 'visible';
  };

  self.close = function () {
    self.is_open = false;
    dropdown.style.display = 'none';
    set_active_option(null);
    refresh_classes();
  };

  // ---------------------------------------------------------------- items

  self.addItem = function (id) {
    const value = String(id);
    if (values.indexOf(value) !== -1) return;
    if (!options.has(value)) return;
    if (is_full()) return;

    const data = options.get(value);
    const item_el = html_to_element(render_item(data, escape_html));
    if (!item_el) return;
    item_el.setAttribute('data-value', value);
    // remove_button plugin: the anchor goes before the closing tag
    item_el.insertAdjacentHTML('beforeend', remove_button_html);

    const was_full = is_full();
    values.splice(self.caret_pos, 0, value);
    self.items.splice(self.caret_pos, 0, data);
    // insertAtCaret: the chips before the caret precede the input
    control.insertBefore(item_el, text_input);
    self.caret_pos += 1;
    if (!was_full || is_full()) refresh_classes();

    const had_options = option_elements().length;
    const next = (function () {
      const el = get_option_element(value);
      return el && el.nextElementSibling ? el.nextElementSibling.getAttribute('data-value') : null;
    })();
    refresh_options(self.is_focused);
    if (next && get_option_element(next)) set_active_option(get_option_element(next));
    if (!had_options || is_full()) self.close();
    else position_dropdown();

    trigger('onItemAdd', value, item_el);
    update_original_input();
  };

  self.removeItem = function (id, item_el) {
    const value = String(id);
    const i = values.indexOf(value);
    if (i === -1) return;
    item_el = item_el || get_item_element(value);
    if (item_el && item_el.parentNode === control) control.removeChild(item_el);
    const active_index = active_items.indexOf(item_el);
    if (active_index !== -1) active_items.splice(active_index, 1);
    values.splice(i, 1);
    self.items.splice(i, 1);
    if (i < self.caret_pos) self.caret_pos -= 1;
    refresh_classes();
    // NB selectize order: 'change' (updateOriginalInput) before 'item_remove'
    update_original_input();
    position_dropdown();
    trigger('onItemRemove', value, item_el);
  };

  self.clear = function () {
    if (!values.length) return;
    item_elements().forEach(function (el) {
      control.removeChild(el);
    });
    values = [];
    self.items = [];
    set_caret(0);
    set_active_item(null);
    update_original_input();
    refresh_classes();
    show_input();
  };

  function delete_selection(event) {
    const direction = event && event.keyCode === KEY.BACKSPACE ? -1 : 1;
    const selection = input_selection();
    let to_remove = [];
    let caret;
    if (active_items.length) {
      const children = item_elements();
      const ordered = children.filter(function (el) {
        return active_items.indexOf(el) !== -1;
      });
      const tail = direction > 0 ? ordered[ordered.length - 1] : ordered[0];
      caret = children.indexOf(tail);
      if (direction > 0) caret++;
      to_remove = active_items.map(function (el) {
        return el.getAttribute('data-value');
      });
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else if (self.is_focused && values.length) {
      if (direction < 0 && selection.start === 0 && selection.length === 0)
        to_remove.push(values[self.caret_pos - 1]);
      else if (direction > 0 && selection.start === text_input.value.length)
        to_remove.push(values[self.caret_pos]);
    }
    to_remove = to_remove.filter(function (v) {
      return v !== undefined;
    });
    if (!to_remove.length) return false;
    if (caret !== undefined) set_caret(caret);
    while (to_remove.length) self.removeItem(to_remove.pop());
    show_input();
    position_dropdown();
    refresh_options(true);
    return true;
  }

  function advance_selection(direction, event) {
    if (direction === 0) return;
    const selection = input_selection();
    if (self.is_focused && !self.is_input_hidden) {
      const length = text_input.value.length;
      const at_edge = direction < 0
        ? selection.start === 0 && selection.length === 0
        : selection.start === length;
      if (at_edge && !length) {
        // advanceCaret
        if (self.is_shift_down) {
          const adjacent = direction > 0
            ? text_input.nextElementSibling
            : text_input.previousElementSibling;
          if (adjacent) {
            hide_input();
            set_active_item(adjacent);
            if (event) event.preventDefault();
          }
        } else {
          set_caret(self.caret_pos + direction);
        }
      }
    } else if (active_items.length) {
      const children = item_elements();
      const ordered = children.filter(function (el) {
        return active_items.indexOf(el) !== -1;
      });
      const tail = direction > 0 ? ordered[ordered.length - 1] : ordered[0];
      const index = children.indexOf(tail);
      set_active_item(null);
      set_caret(direction > 0 ? index + 1 : index);
    }
  }

  // ---------------------------------------------------------------- events

  // keys held (ctrl/shift/cmd modify chip selection), like selectize
  document.addEventListener('keydown', function (e) {
    self.is_cmd_down = e[IS_MAC ? 'metaKey' : 'ctrlKey'];
    self.is_ctrl_down = e[IS_MAC ? 'altKey' : 'ctrlKey'];
    self.is_shift_down = e.shiftKey;
  });
  document.addEventListener('keyup', function (e) {
    if (e.keyCode === KEY.CTRL) self.is_ctrl_down = false;
    if (e.keyCode === KEY.SHIFT) self.is_shift_down = false;
    if (e.keyCode === KEY.CMD) self.is_cmd_down = false;
  });
  window.addEventListener('mousemove', function () {
    self.ignore_hover = false;
  });
  window.addEventListener('scroll', function () {
    if (self.is_open) position_dropdown();
  });
  window.addEventListener('resize', function () {
    if (self.is_open) position_dropdown();
  });

  // a mousedown outside blurs (even a synthetic one, like selectize);
  // on the dropdown frame (e.g. its scrollbar) it must not
  document.addEventListener('mousedown', function (e) {
    if (!self.is_focused) return;
    if (e.target === dropdown || e.target.parentNode === dropdown) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!control.contains(e.target) && e.target !== control) text_input.blur();
  });

  // chips: mousedown selects (onItemSelect), the control keeps the focus
  control.addEventListener('mousedown', function (e) {
    if (e.target === text_input) return;
    let child = e.target;
    while (child && child.parentNode !== control) child = child.parentNode;
    if (child && child !== text_input) {
      e.preventDefault();
      set_active_item(child, e);
    }
    // onMouseDown
    if (self.is_focused) {
      if (!e.defaultPrevented) set_active_item(null);
      // NB jQuery `return false`
      e.preventDefault();
      e.stopPropagation();
    } else if (!e.defaultPrevented) {
      setTimeout(focus, 0);
    }
  });

  control.addEventListener('click', function (e) {
    const remove = e.target.closest('a.remove');
    if (remove && control.contains(remove)) {
      // remove_button plugin
      e.preventDefault();
      set_active_item(remove.parentNode);
      if (delete_selection()) set_caret(values.length);
      return;
    }
    if (!self.is_focused || !self.is_open) {
      focus();
      e.preventDefault();
    }
  });

  // options: hover highlights, mousedown/click selects, focus is retained
  dropdown.addEventListener('mouseover', function (e) {
    const option = e.target.closest('[data-selectable]');
    if (!option || !dropdown_content.contains(option)) return;
    if (e.relatedTarget && option.contains(e.relatedTarget)) return; // mouseenter
    if (self.ignore_hover) return;
    set_active_option(option, true);
  });
  function on_option_select(e) {
    const option = e.target.closest('[data-selectable]');
    if (!option || !dropdown_content.contains(option)) return;
    e.preventDefault();
    e.stopPropagation();
    const value = option.getAttribute('data-value');
    if (value === null) return;
    set_textbox_value('');
    self.addItem(value);
    if (settings.closeAfterSelect) self.close();
  }
  dropdown.addEventListener('mousedown', on_option_select);
  dropdown.addEventListener('click', on_option_select);

  text_input.addEventListener('mousedown', function (e) {
    e.stopPropagation();
  });

  text_input.addEventListener('keydown', function (e) {
    auto_grow(e);
    switch (e.keyCode) {
      case KEY.A:
        if (self.is_cmd_down) {
          active_items = item_elements();
          active_items.forEach(function (el) {
            el.classList.add('active');
          });
          if (active_items.length) {
            hide_input();
            self.close();
          }
          focus();
          return;
        }
        break;
      case KEY.ESC:
        if (self.is_open) {
          e.preventDefault();
          e.stopPropagation();
          self.close();
        }
        return;
      case KEY.N:
        if (!e.ctrlKey || e.altKey) break;
      // falls through
      case KEY.DOWN:
        if (!self.is_open && self.has_options) self.open();
        else if (active_option) {
          self.ignore_hover = true;
          const next = active_option.nextElementSibling;
          if (next) set_active_option(next);
        }
        e.preventDefault();
        return;
      case KEY.P:
        if (!e.ctrlKey || e.altKey) break;
      // falls through
      case KEY.UP:
        if (active_option) {
          self.ignore_hover = true;
          const prev = active_option.previousElementSibling;
          if (prev) set_active_option(prev);
        }
        e.preventDefault();
        return;
      // NB KEY.RETURN is deliberately not handled (commented out in the
      // vendored selectize): Enter bubbles to the app's search handlers
      case KEY.LEFT:
        advance_selection(-1, e);
        return;
      case KEY.RIGHT:
        advance_selection(1, e);
        return;
      case KEY.TAB:
        return;
      case KEY.BACKSPACE:
      case KEY.DELETE:
        delete_selection(e);
        return;
    }
    if ((is_full() || self.is_input_hidden) && !(IS_MAC ? e.metaKey : e.ctrlKey)) {
      e.preventDefault();
    }
  });

  // NB debounced like selectize (loadThrottle): the LAST value wins, so a
  // value cleared by the app (e.g. on search) cancels a pending lookup
  function on_search_change(value) {
    if (typeof settings.load !== 'function') return;
    settings.load.call(self, value, function (results) {
      if (results && results.length) {
        self.addOption(results);
        refresh_options(self.is_focused && !self.is_input_hidden);
      }
    });
  }

  text_input.addEventListener('keyup', function (e) {
    auto_grow(e);
    const value = text_input.value || '';
    if (self.last_value !== value) {
      self.last_value = value;
      clearTimeout(search_timer);
      search_timer = setTimeout(function () {
        on_search_change(value);
      }, load_throttle);
      refresh_options();
    }
  });

  function on_focus() {
    if (ignore_focus) return;
    const was_focused = self.is_focused;
    self.is_focused = true;
    if (!active_items.length) {
      show_input();
      set_active_item(null);
      refresh_options(true);
    }
    refresh_classes();
    if (!was_focused) trigger('onFocus');
  }
  text_input.addEventListener('focus', on_focus);

  text_input.addEventListener('blur', function () {
    if (!self.is_focused) return;
    // preserve_on_blur plugin: keep the typed text
    const preserved = text_input.value;
    self.is_focused = false;
    self.close();
    set_textbox_value('');
    set_active_item(null);
    set_active_option(null);
    set_caret(values.length);
    refresh_classes();
    if (plugins.indexOf('preserve_on_blur') !== -1) set_textbox_value(preserved);
    auto_grow({ type: 'blur' });
  });

  // the "rest input" is read by the app via the id convention
  self.input_el = text_input;

  auto_grow({}, true);
  refresh_classes();
  if (typeof settings.onInitialize === 'function') settings.onInitialize.call(self);

  return self;
}
