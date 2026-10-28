/**
 * Ermac multiselect: a vanilla replacement for the selectize jQuery plugin.
 *
 * This is a port of the *vendored* selectize 0.12 subset the app uses (not
 * of the upstream documentation), preserving the observable UX contract:
 * the DOM structure and CSS class names (.selectize-control / .selectize-input /
 * .selectize-dropdown, see webassets/ermac.css), the item DOM contract
 * (data-facet / data-term), the input id convention (<id>-selectized) with
 * the input of type="select-multiple", the hidden original <select multiple
 * class="selectized"> mirroring the chips, option selection on MOUSEDOWN,
 * item activation (.active) with the hidden-input mode, the caret movement
 * and deleteSelection() of the arrows/Backspace keys, ctrl/cmd+A select all,
 * the input auto-grow measurement, and the full state-class set of
 * selectize's refreshClasses().
 *
 * NB Enter is NOT handled: the vendored selectize has its Enter handler
 * commented out, so Enter bubbles to the #search_holder and document
 * handlers, which run the search with the chips and the raw typed text.
 */

/* module-scoped measurement span, shared by all instances like Selectize.$testInput */
var measure_span = null;

function measure_string(str, parent_el) {
  if (!str) return 0;
  if (!measure_span) {
    measure_span = document.createElement('span');
    var style = measure_span.style;
    style.position = 'absolute';
    style.top = '-99999px';
    style.left = '-99999px';
    style.width = 'auto';
    style.padding = '0';
    style.whiteSpace = 'pre';
    document.body.appendChild(measure_span);
  }
  measure_span.textContent = str;
  var parent_style = window.getComputedStyle(parent_el);
  [
    'letterSpacing',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'textTransform',
  ].forEach(function (property) {
    measure_span.style[property] = parent_style[property];
  });
  return measure_span.getBoundingClientRect().width;
}

export function create_multiselect(select_el, settings) {
  const self = {
    settings: settings || {},
    options: {}, // id -> {facet, label, id}
    items: [], // ordered option data, like selectize's items
    caret_pos: 0,
    opened: false,
    has_options: false,
    is_focused: false,
    is_input_hidden: false,
    active_option_id: null,
    active_item_els: [],
    counter: 0,
    load_timer: null,
    last_value: '',
    loaded_searches: {}, // NB like the old loadedSearches: a query loads once
  };

  const render_item =
    (settings.render && settings.render.item) ||
    function (item) {
      return (
        '<div class="fct_' +
        item.facet +
        '" data-facet="' +
        item.facet +
        '" data-term="' +
        item.label +
        '">' +
        item.label +
        '</div>'
      );
    };

  const render_option =
    (settings.render && settings.render.option) ||
    function (item) {
      return '<div class="fct_' + item.facet + '">' + item.label + '</div>';
    };

  const max_items = settings.maxItems || Infinity;

  // DOM structure mirroring selectize:

  const control = document.createElement('div');
  control.className =
    'selectize-control multi plugin-remove_button plugin-preserve_on_blur';

  const input_holder = document.createElement('div');
  input_holder.className = 'selectize-input items not-full';
  control.appendChild(input_holder);

  const text_input = document.createElement('input');
  // NB the vendored selectize input type, part of the DOM contract
  text_input.type = 'select-multiple';
  text_input.autocomplete = 'off';
  text_input.id = (select_el.id ? select_el.id : '') + '-selectized';
  input_holder.appendChild(text_input);

  const dropdown = document.createElement('div');
  dropdown.className = 'selectize-dropdown multi plugin-remove_button';
  dropdown.style.display = 'none';
  const dropdown_content = document.createElement('div');
  dropdown_content.className = 'selectize-dropdown-content';
  dropdown.appendChild(dropdown_content);
  control.appendChild(dropdown);

  // NB the original <select> becomes the hidden mirror, part of the contract
  select_el.style.display = 'none';
  select_el.setAttribute('multiple', 'multiple');
  select_el.classList.add('selectized');
  select_el.insertAdjacentElement('afterend', control);

  /**
   * State classes: the full contract of selectize refreshClasses()
   */

  function refresh_classes() {
    const is_full = self.items.length >= max_items;
    input_holder.classList.toggle('focus', self.is_focused);
    input_holder.classList.toggle('full', is_full);
    input_holder.classList.toggle('not-full', !is_full);
    input_holder.classList.toggle(
      'input-active',
      self.is_focused && !self.is_input_hidden,
    );
    input_holder.classList.toggle('dropdown-active', self.opened);
    input_holder.classList.toggle('has-options', self.has_options);
    input_holder.classList.toggle('has-items', self.items.length > 0);
  }

  /**
   * The original <select> mirrors the items, like selectize updateOriginalInput()
   */

  function update_original_input() {
    select_el.innerHTML = '';
    self.items.forEach(function (item) {
      const option = document.createElement('option');
      option.selected = true;
      option.value = String(item.id);
      option.textContent = item.label;
      select_el.appendChild(option);
    });
  }

  /**
   * The input auto-grow: like selectize's autoGrow(), the width follows
   * the typed text (measured), 4px for the empty input
   */

  function auto_grow() {
    var value = text_input.value;
    var width = measure_string(value, text_input) + 4;
    if (width !== text_input.style.width) text_input.style.width = width + 'px';
  }

  function set_textbox_value(value) {
    text_input.value = value;
    auto_grow();
  }

  /**
   * The caret: like selectize setCaret(), the input stays in place and the
   * item elements move around it
   */

  function item_elements() {
    return Array.prototype.slice.call(
      input_holder.querySelectorAll('div[data-value]'),
    );
  }

  function set_caret(index) {
    index = Math.max(0, Math.min(self.items.length, index));
    const elements = item_elements();
    for (var j = 0; j < elements.length; j++) {
      const el = elements[j];
      input_holder.removeChild(el);
      if (j < index) input_holder.insertBefore(el, text_input);
      else input_holder.appendChild(el);
    }
    self.caret_pos = index;
  }

  /**
   * Options dropdown management
   */

  function is_selected(id) {
    return self.items.some(function (item) {
      return String(item.id) === String(id);
    });
  }

  function render_dropdown() {
    dropdown_content.innerHTML = '';
    // NB like refreshOptions() with hideSelected (multi mode): the options
    // belonging to the existing items are not offered again
    for (const id in self.options) {
      if (is_selected(id)) continue;
      const option_data = self.options[id];
      const tpl = document.createElement('template');
      tpl.innerHTML = render_option(option_data).trim();
      const option_el = tpl.content.firstElementChild;
      if (!option_el) continue;
      option_el.setAttribute('data-selectable', '');
      option_el.setAttribute('data-value', id);
      if (self.active_option_id === id) option_el.classList.add('active');
      dropdown_content.appendChild(option_el);
    }
    self.has_options = !!dropdown_content.children.length;
  }

  function position_dropdown() {
    // NB like selectize positionDropdown(): $control is the INPUT HOLDER,
    // and jQuery position() EXCLUDES the holder's own margins (border-box
    // offset minus marginTop/marginLeft), while outerHeight(true) adds
    // them back. The wrapper-relative coordinates follow.
    const holder_rect = input_holder.getBoundingClientRect();
    const control_rect = control.getBoundingClientRect();
    const holder_style = getComputedStyle(input_holder);
    const pos_top =
      holder_rect.top -
      control_rect.top -
      parseFloat(getComputedStyle(control).borderTopWidth || '0') -
      parseFloat(holder_style.marginTop || '0');
    const pos_left =
      holder_rect.left -
      control_rect.left -
      parseFloat(getComputedStyle(control).borderLeftWidth || '0') -
      parseFloat(holder_style.marginLeft || '0');
    const outer =
      input_holder.offsetHeight +
      parseFloat(holder_style.marginTop) +
      parseFloat(holder_style.marginBottom);
    dropdown.style.width = holder_rect.width + 'px';
    dropdown.style.top = pos_top + outer + 'px';
    dropdown.style.left = pos_left + 'px';
  }

  function open() {
    if (self.opened) return;
    if (!self.has_options) return; // NB like selectize: nothing to show
    self.opened = true;
    dropdown.style.display = 'block';
    position_dropdown();
    refresh_classes();
  }

  self.open = open;

  self.close = function () {
    if (!self.opened) return;
    self.opened = false;
    self.active_option_id = null;
    dropdown.style.display = 'none';
    refresh_classes();
  };

  function set_active_option(id) {
    self.active_option_id = id;
    dropdown_content
      .querySelectorAll('[data-selectable]')
      .forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-value') === id);
      });
  }

  /**
   * Items management
   */

  function trigger(event_name, a, b) {
    const callback = self.settings[event_name];
    if (typeof callback === 'function') callback.apply(self, [a, b]);
    if (
      event_name === 'onItemAdd' ||
      event_name === 'onItemRemove' ||
      event_name === 'clear'
    ) {
      if (typeof self.settings.onChange === 'function')
        self.settings.onChange.call(
          self,
          self.items
            .map(function (item) {
              return item.label;
            })
            .join(','),
        );
    }
  }

  function build_item_el(option_data) {
    const tpl = document.createElement('template');
    tpl.innerHTML = render_item(option_data).trim();
    const item_el = tpl.content.firstElementChild;
    if (!item_el) return null;

    // remove_button plugin behavior
    const remove_anchor = document.createElement('a');
    remove_anchor.href = 'javascript:void(0)';
    remove_anchor.className = 'remove';
    remove_anchor.tabIndex = -1;
    remove_anchor.title = 'Remove';
    remove_anchor.innerHTML = '&times;';
    item_el.appendChild(remove_anchor);
    return item_el;
  }

  self.addOption = function (data) {
    if (Array.isArray(data)) {
      data.forEach(function (d) {
        self.addOption(d);
      });
      return;
    }
    self.counter += 1;
    if (data.id === undefined) data.id = self.counter;
    self.options[data.id] = data;
    self.has_options = true;
    refresh_classes();
  };

  // NB the vendored clearOptions() keeps the options belonging to the
  // current items (only the others are deleted), which is why the input
  // holder keeps the has-options class after a write()
  self.clearOptions = function () {
    for (const id in self.options) {
      if (!is_selected(id)) delete self.options[id];
    }
    self.active_option_id = null;
    self.loaded_searches = {};
    self.has_options = !!Object.keys(self.options).length;
    // NB like the vendored clearOptions(): the dropdown is NOT closed here,
    // the app's load handler clears options on every keystroke while the
    // dropdown stays open
    refresh_classes();
  };

  self.addItem = function (id) {
    const option_data = self.options[id];
    if (!option_data) return;
    if (
      self.items.some(function (item) {
        return String(item.id) === String(id);
      })
    )
      return;
    if (self.items.length >= max_items) return;

    const item_el = build_item_el(option_data);
    if (!item_el) return;

    // NB like selectize addItem(): the item enters at the caret
    item_el.setAttribute('data-value', String(id));
    input_holder.insertBefore(item_el, text_input);
    self.items.splice(self.caret_pos, 0, option_data);
    self.caret_pos += 1;

    refresh_classes();
    update_original_input();

    if (self.settings.closeAfterSelect !== false) self.close();
    set_textbox_value('');
    set_active_option(null);

    trigger('onItemAdd', id, item_el);
  };

  function remove_item_el(item_el) {
    if (item_el && item_el.parentNode === input_holder)
      input_holder.removeChild(item_el);
  }

  self.removeItem = function (id, item_el) {
    const index = self.items.findIndex(function (item) {
      return String(item.id) === String(id);
    });
    if (index === -1) return;
    if (!item_el)
      item_el = input_holder.querySelector('[data-value="' + id + '"]');
    remove_item_el(item_el);
    const active_index = self.active_item_els.indexOf(item_el);
    if (active_index !== -1) self.active_item_els.splice(active_index, 1);
    self.items.splice(index, 1);
    if (index < self.caret_pos)
      self.caret_pos = Math.max(0, self.caret_pos - 1);
    refresh_classes();
    update_original_input();
    trigger('onItemRemove', id, item_el);
  };

  self.clear = function () {
    const previous = self.items;
    self.items = [];
    self.caret_pos = 0;
    self.active_item_els = [];
    input_holder.querySelectorAll('div[data-value]').forEach(remove_item_el);
    refresh_classes();
    update_original_input();
    if (previous.length) trigger('clear');
  };

  /**
   * Item activation: the plain-click part of selectize setActiveItem():
   * the clicked item is marked .active and the text input is hidden
   */

  function show_input() {
    text_input.style.opacity = '1';
    text_input.style.position = 'relative';
    text_input.style.left = '0';
    self.is_input_hidden = false;
    refresh_classes();
  }

  function hide_input() {
    set_textbox_value('');
    text_input.style.opacity = '0';
    text_input.style.position = 'absolute';
    text_input.style.left = '-10000px';
    self.is_input_hidden = true;
    refresh_classes();
  }

  function set_active_item(item_el) {
    if (!item_el) {
      self.active_item_els.forEach(function (el) {
        el.classList.remove('active');
      });
      self.active_item_els = [];
      if (self.is_focused) show_input();
      return;
    }
    self.active_item_els.forEach(function (el) {
      el.classList.remove('active');
    });
    self.active_item_els = [item_el];
    item_el.classList.add('active');
    hide_input(); // NB like selectize: no text editing with a selected item
    if (!self.is_focused) text_input.focus();
  }

  // NB like selectize selectAll(), bound to ctrl/cmd+A
  function select_all() {
    self.active_item_els = item_elements();
    self.active_item_els.forEach(function (el) {
      el.classList.add('active');
    });
    if (self.active_item_els.length) {
      hide_input();
      self.close();
    }
    text_input.focus();
  }

  /**
   * deleteSelection: a faithful port of the vendored function
   */

  function delete_selection(event) {
    if (self.active_item_els.length) {
      self.active_item_els.slice().forEach(function (el) {
        self.removeItem(el.getAttribute('data-value'), el);
      });
      set_active_item(null);
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    // NB direction -1 is Backspace: remove the item before the caret,
    // when the cursor is at the very start of the empty input
    const selection_start = text_input.selectionStart;
    if (self.items.length && !text_input.value && selection_start === 0) {
      const doomed = self.items[self.caret_pos - 1];
      if (doomed) {
        const item_el = item_elements()[self.caret_pos - 1];
        self.removeItem(doomed.id, item_el);
        if (event) event.preventDefault();
      }
    }
  }

  /**
   * onOptionSelect: NB selectize binds MOUSEDOWN (not click), and prevents
   * the default so the text input keeps its focus
   */

  function on_option_select(option_el) {
    if (!option_el) return;
    self.addItem(option_el.getAttribute('data-value'));
  }

  /**
   * Event wiring
   */

  control.addEventListener('mousedown', function (event) {
    // NB the vendored selectize onMouseDown: when focused, prevent the
    // default everywhere except on the input itself (text selection!)
    const target_is_input = event.target === text_input;
    if (self.is_focused) {
      if (!target_is_input) {
        set_active_item(null);
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      event.preventDefault();
      event.stopPropagation();
      window.setTimeout(function () {
        text_input.focus();
      }, 0);
    }
  });

  control.addEventListener('click', function (event) {
    // NB remove_button anchor click: remove the item
    const remove_button = event.target.closest('a.remove');
    if (remove_button) {
      event.preventDefault();
      event.stopPropagation();
      const item_el = remove_button.parentNode;
      const data_term = item_el.getAttribute('data-term');
      const found = self.items.find(function (item) {
        return item.label === data_term;
      });
      if (found) self.removeItem(found.id, item_el);
      text_input.focus();
      return;
    }

    // NB selectize onClick: focus back (and reopen the dropdown) after a
    // closeAfterSelect, or give the control focus from an outside click
    if (!self.is_focused || !self.opened) {
      event.preventDefault();
      text_input.focus();
    }
  });

  dropdown_content.addEventListener('mouseover', function (event) {
    const option_el = event.target.closest('[data-selectable]');
    if (option_el) set_active_option(option_el.getAttribute('data-value'));
  });

  dropdown_content.addEventListener('mousedown', function (event) {
    const option_el = event.target.closest('[data-selectable]');
    if (!option_el || !dropdown_content.contains(option_el)) return;
    event.preventDefault();
    event.stopPropagation();
    on_option_select(option_el);
  });

  input_holder.addEventListener('mousedown', function (event) {
    // NB item mousedown (like watchChildEvent($control, 'mousedown', '*:not(input)')):
    // the clicked item becomes active; not on the remove anchor
    if (event.target === text_input) return;
    if (event.target.closest('a.remove')) return;
    const item_el = event.target.closest('div[data-value]');
    if (item_el && input_holder.contains(item_el)) {
      event.preventDefault();
      event.stopPropagation();
      set_active_item(item_el);
    }
  });

  function load_suggestions(query) {
    clearTimeout(self.load_timer);
    if (typeof self.settings.load !== 'function') return;
    // NB like the old debounced onSearchChange + loadedSearches:
    // a query value loads at most once, and a later call cancels the
    // pending debounce (e.g. the Enter keyup with the cleared value)
    if (self.loaded_searches.hasOwnProperty(query)) return;
    self.loaded_searches[query] = true;
    self.load_timer = setTimeout(function () {
      self.settings.load.call(self, query, function (suggestions) {
        if (!suggestions || !suggestions.length) {
          // NB like the old load() with no results: nothing rendered,
          // nothing opened
          return;
        }
        self.addOption(suggestions);
        render_dropdown();
        // NB like refreshOptions: highlight the first option, unless the
        // prior one survived; the dropdown only opens when the input is
        // still focused (the old triggerDropdown: isFocused && !isInputHidden)
        if (
          self.active_option_id === null ||
          !self.options[self.active_option_id]
        )
          set_active_option(
            dropdown_content
              .querySelector('[data-selectable]')
              .getAttribute('data-value'),
          );
        if (self.is_focused && !self.is_input_hidden) open();
        refresh_classes();
      });
    }, 300); // mimicking selectize default loadThrottle
  }

  text_input.addEventListener('input', function () {
    auto_grow();
  });

  document.addEventListener('mousedown', function (event) {
    // NB like the old $document.on('mousedown') handler: blur on click
    // outside the control (except the dropdown itself)
    if (!self.is_focused) return;
    if (
      event.target === dropdown ||
      event.target.parentNode === dropdown
    )
      return;
    if (!control.contains(event.target)) text_input.blur();
  });

  window.addEventListener('scroll', function () {
    if (self.opened) position_dropdown();
  });

  text_input.addEventListener('keydown', function (event) {
    const is_mac = /Mac/.test(navigator.userAgent);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const selectable = dropdown_content.querySelectorAll('[data-selectable]');
      const active_el = dropdown_content.querySelector(
        '[data-selectable].active',
      );
      if (!selectable.length) return;
      event.preventDefault();
      if (!self.opened) {
        open();
        if (self.active_option_id === null)
          set_active_option(selectable[0].getAttribute('data-value'));
        return;
      }
      let next;
      if (!active_el) {
        next =
          event.key === 'ArrowDown'
            ? selectable[0]
            : selectable[selectable.length - 1];
      } else {
        next =
          event.key === 'ArrowDown'
            ? active_el.nextElementSibling
            : active_el.previousElementSibling;
      }
      if (next) set_active_option(next.getAttribute('data-value'));
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // NB like advanceSelection(): the caret moves among the items when
      // the input is empty and the cursor is at its edge
      if (self.is_focused && !self.is_input_hidden && !text_input.value) {
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const at_edge =
          direction < 0
            ? text_input.selectionStart === 0
            : text_input.selectionStart === 0; // empty input: both edges are 0
        if (at_edge) set_caret(self.caret_pos + direction);
      }
      return;
    }

    if (event.key === 'Escape') {
      if (self.opened) event.stopPropagation();
      self.close();
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      delete_selection(event);
      return;
    }

    if (
      (is_mac ? event.metaKey : event.ctrlKey) &&
      (event.key === 'a' || event.key === 'A')
    ) {
      select_all();
      return;
    }

    // NB Enter is NOT consumed (see the header comment): it bubbles to
    // the #search_holder and document handlers, which run the search

    // NB like the vendored onKeyDown tail: with a hidden input or a full
    // box, plain typing is prevented
    if (
      (self.items.length >= max_items || self.is_input_hidden) &&
      !event.ctrlKey
    ) {
      event.preventDefault();
    }
  });

  text_input.addEventListener('keyup', function () {
    auto_grow();
    const value = text_input.value;
    if (self.last_value !== value) {
      self.last_value = value;
      load_suggestions(value);
    }
  });

  text_input.addEventListener('focus', function () {
    self.is_focused = true;
    refresh_classes();
    if (self.has_options) open(); // NB like selectize onFocus
  });

  text_input.addEventListener('blur', function () {
    self.is_focused = false;
    // NB preserve_on_blur plugin behavior: keep the typed text
    self.close();
    refresh_classes();
  });

  // the "rest input" is read by the app via the id convention
  self.input_el = text_input;

  set_textbox_value(''); // sets the initial 4px width, like selectize's autoGrow()
  show_input(); // NB the initial opacity/position/left inline styles, as in selectize
  refresh_classes();
  update_original_input();
  if (typeof self.settings.onInitialize === 'function')
    self.settings.onInitialize();

  return self;
}
