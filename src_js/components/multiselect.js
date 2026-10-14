/**
 * Ermac multiselect: a vanilla replacement for the selectize jQuery plugin,
 * reusing the same CSS class contract (.selectize-control / .selectize-input /
 * .selectize-dropdown, see webassets/ermac.css) and the same item DOM contract
 * (data-facet / data-term attributes), so that the app reading paths stay identical.
 *
 * API mirrors the subset of selectize actually used by Ermac:
 *   addOption(data), addItem(id), clearOptions(), clear(), close(), items,
 *   and the callbacks: onInitialize, onChange, onItemAdd, onItemRemove, load.
 * The text input keeps the selectize id convention: <id of the original select>-selectized.
 */

export function create_multiselect(select_el, settings) {
  const self = {
    settings: settings || {},
    options: {}, // id -> {facet, label, id}
    items: [], // array of {facet, label, id}
    opened: false,
    active_option: null,
    counter: 0,
    load_timer: null,
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
  control.className = 'selectize-control plugin-remove_button multi';

  const input_holder = document.createElement('div');
  input_holder.className = 'selectize-input items not-full';
  control.appendChild(input_holder);

  const text_input = document.createElement('input');
  text_input.type = 'text';
  text_input.autocomplete = 'off';
  text_input.id = (select_el.id ? select_el.id : '') + '-selectized';
  text_input.setAttribute('role', 'combobox');
  input_holder.appendChild(text_input);

  const dropdown = document.createElement('div');
  dropdown.className = 'selectize-dropdown multi plugin-remove_button';
  dropdown.style.display = 'none';
  const dropdown_content = document.createElement('div');
  dropdown_content.className = 'selectize-dropdown-content';
  dropdown.appendChild(dropdown_content);
  control.appendChild(dropdown);

  select_el.style.display = 'none';
  select_el.insertAdjacentElement('afterend', control);

  /**
   * Options dropdown management
   */

  function render_dropdown() {
    dropdown_content.innerHTML = '';
    for (const id in self.options) {
      const option_data = self.options[id];
      const tpl = document.createElement('template');
      tpl.innerHTML = render_option(option_data).trim();
      const option_el = tpl.content.firstElementChild;
      if (option_el) {
        option_el.setAttribute('data-selectable', '');
        option_el.setAttribute('data-value', id);
        if (self.active_option === id) option_el.classList.add('active');
        dropdown_content.appendChild(option_el);
      }
    }
  }

  function open() {
    if (self.opened || !dropdown_content.children.length) return;
    self.opened = true;
    input_holder.classList.add('dropdown-active');
    dropdown.style.display = 'block';
  }

  self.open = open;

  self.close = function () {
    if (!self.opened) return;
    self.opened = false;
    self.active_option = null;
    input_holder.classList.remove('dropdown-active');
    dropdown.style.display = 'none';
  };

  function set_active_option(id) {
    self.active_option = id;
    dropdown_content
      .querySelectorAll('.option, [data-selectable]')
      .forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-value') === id);
      });
  }

  /**
   * Items management
   */

  function get_value(data) {
    // valueField is 'id' by contract with the app
    return data.id;
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
  };

  self.clearOptions = function () {
    self.options = {};
    self.active_option = null;
    self.close();
  };

  function refresh_state() {
    input_holder.classList.toggle('has-items', self.items.length > 0);
    input_holder.classList.toggle('full', self.items.length >= max_items);
    text_input.readOnly = self.items.length >= max_items;
  }

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

  self.addItem = function (id) {
    if (
      self.items.some(function (item) {
        return get_value(item) === id;
      })
    )
      return;
    if (!self.options.hasOwnProperty(id)) return;
    if (self.items.length >= max_items) return;

    const option_data = self.options[id];

    const tpl = document.createElement('template');
    tpl.innerHTML = render_item(option_data).trim();
    const item_el = tpl.content.firstElementChild;
    if (!item_el) return;

    // remove_button plugin behavior
    const remove_anchor = document.createElement('a');
    remove_anchor.href = 'javascript:void(0)';
    remove_anchor.className = 'remove';
    remove_anchor.tabIndex = -1;
    remove_anchor.title = 'Remove';
    remove_anchor.innerHTML = '&times;';
    item_el.appendChild(remove_anchor);

    input_holder.insertBefore(item_el, text_input);
    self.items.push(option_data);
    refresh_state();

    if (self.settings.closeAfterSelect !== false) self.close();
    text_input.value = '';
    set_active_option(null);

    trigger('onItemAdd', id, item_el);
  };

  self.removeItem = function (id, item_el) {
    const index = self.items.findIndex(function (item) {
      return get_value(item) === id;
    });
    if (index === -1) return;
    if (!item_el)
      item_el = input_holder.querySelector(
        '[data-value="' +
          id +
          '"], [data-term="' +
          (self.items[index] && self.items[index].label) +
          '"]',
      );
    if (item_el && item_el.parentNode === input_holder)
      input_holder.removeChild(item_el);
    self.items.splice(index, 1);
    refresh_state();
    trigger('onItemRemove', id, item_el);
  };

  self.clear = function () {
    const previous = self.items;
    self.items = [];
    input_holder.querySelectorAll('div').forEach(function (el) {
      input_holder.removeChild(el);
    });
    refresh_state();
    if (previous.length) trigger('clear');
  };

  /**
   * Event wiring
   */

  input_holder.addEventListener('mousedown', function (event) {
    // item click: focus the text input (mimicking selectize caret behavior)
    if (event.target === text_input) return;
    event.preventDefault();
    text_input.focus();
  });

  control.addEventListener('click', function (event) {
    const remove_button = event.target.closest('a.remove');
    if (remove_button) {
      event.preventDefault();
      event.stopPropagation();
      const item_el = remove_button.parentNode;
      const data_term = item_el.getAttribute('data-term');
      const found = self.items.find(function (item) {
        return item.label === data_term;
      });
      if (found) self.removeItem(get_value(found), item_el);
      text_input.focus();
      return;
    }

    const option_el = event.target.closest('[data-selectable]');
    if (option_el && dropdown_content.contains(option_el)) {
      event.preventDefault();
      event.stopPropagation();
      self.addItem(option_el.getAttribute('data-value'));
    }
  });

  dropdown_content.addEventListener('mouseover', function (event) {
    const option_el = event.target.closest('[data-selectable]');
    if (option_el) set_active_option(option_el.getAttribute('data-value'));
  });

  text_input.addEventListener('input', function () {
    clearTimeout(self.load_timer);
    const query = text_input.value;
    if (typeof self.settings.load !== 'function') return;
    self.load_timer = setTimeout(function () {
      self.settings.load.call(self, query, function (suggestions) {
        if (!suggestions || !suggestions.length) {
          self.close();
          return;
        }
        self.addOption(suggestions);
        render_dropdown();
        open();
      });
    }, 300); // mimicking selectize default loadThrottle
  });

  text_input.addEventListener('keydown', function (event) {
    const selectable = dropdown_content.querySelectorAll('[data-selectable]');
    const active_el = dropdown_content.querySelector(
      '[data-selectable].active',
    );

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!selectable.length) return;
      event.preventDefault();
      if (!self.opened) {
        open();
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
    } else if (event.key === 'Enter') {
      if (self.opened && active_el) {
        event.preventDefault();
        event.stopPropagation();
        self.addItem(active_el.getAttribute('data-value'));
      }
    } else if (event.key === 'Escape') {
      if (self.opened) event.stopPropagation();
      self.close();
    } else if (
      event.key === 'Backspace' &&
      !text_input.value &&
      self.items.length
    ) {
      const last = self.items[self.items.length - 1];
      const item_el = input_holder.querySelector('div:last-of-type');
      self.removeItem(get_value(last), item_el);
    }
  });

  text_input.addEventListener('focus', function () {
    input_holder.classList.add('focus');
    input_holder.classList.add('input-active');
    if (dropdown_content.children.length) open();
  });

  text_input.addEventListener('blur', function () {
    input_holder.classList.remove('focus');
    input_holder.classList.remove('input-active');
    // preserve_on_blur plugin behavior: keep the typed text
    self.close();
  });

  // the "rest input" is read by the app via the id convention
  self.input_el = text_input;

  refresh_state();
  if (typeof self.settings.onInitialize === 'function')
    self.settings.onInitialize();

  return self;
}
