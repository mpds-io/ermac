/**
 * Ermac table sorter: a vanilla port of the subset of the vendored
 * jquery.tablesorter 2.0 used by Ermac (see git history:
 * src_js/third_party/jquery.tablesorter.js), keeping its CSS class contract
 * (th.header, th.headerSortUp, th.headerSortDown, see webassets/ermac.css)
 * and its semantics:
 *  - rows are sorted from a cache built at init (or on update()), ties keep
 *    the cached order; update() re-reads the rows WITHOUT re-sorting;
 *  - cell text is the raw textContent (or data-sort-value), formatted by the
 *    column parser; columns without a configured sorter auto-detect to
 *    'chemical' (the first registered parser whose is() accepts anything);
 *  - every header keeps its own click counter: asc, desc, asc, ...;
 *    ctrl-click (sortMultiSortKey) adds a column or flips its direction;
 *  - a header mousedown is cancelled (cancelSelection): no text selection,
 *    and the focus stays where it was (e.g. in the search box);
 *  - re-initializing on the same headers replaces the old handlers.
 *
 * The data table body and the header cells live in two separate tables
 * (the old 'selectorHeaders' / 'selectorHeaderParent' use case).
 */

function format_float(s) {
  const i = parseFloat(s);
  return isNaN(i) ? 0 : i;
}

function format_int(s) {
  const i = parseInt(s);
  return isNaN(i) ? 0 : i;
}

// NB the parsers registered by the vendored plugin, in registration order
const PARSERS = {
  text: { type: 'text', format: (s) => s.toLocaleLowerCase().trim() },
  chemical: { type: 'text', format: (s) => s.replace('[', '').replace('(', '').trim() },
  digit: { type: 'numeric', format: (s) => format_float(s) },
  url: { type: 'text', format: (s) => s.replace(/(https?|ftp|file):\/\//, '').trim() },
  doi: { type: 'numeric', format: (s) => format_int(s.replace('[', '').replace(']', '')) },
};
const DETECTED = 'chemical';

function cell_text(cell) {
  if (!cell) return '';
  const sort_value = cell.getAttribute('data-sort-value');
  return sort_value !== null ? sort_value : cell.textContent;
}

function compare(type, a, b) {
  if (type === 'text') return a == b ? 0 : a < b ? -1 : 1;
  return a - b;
}

const bound_headers = new WeakMap(); // th -> its listeners, for re-init

export function make_sortable(data_table, options) {
  options = options || {};
  const header_cells = Array.prototype.slice.call(
    document.querySelectorAll(options.selectorHeaders),
  );
  const headers_conf = options.headers || {};
  const multi_key = options.sortMultiSortKey || 'shiftKey';

  function parser_of(index) {
    const conf = headers_conf[index];
    if (conf && conf.sorter === false) return null; // unsortable
    const name = conf && conf.sorter ? conf.sorter : DETECTED;
    return PARSERS[name] || PARSERS[DETECTED];
  }

  let cache = [];
  function build_cache() {
    const tbody = data_table.tBodies[0];
    cache = tbody
      ? Array.prototype.map.call(tbody.rows, function (row, position) {
          const values = header_cells.map(function (th, index) {
            const parser = parser_of(index);
            return parser ? parser.format(cell_text(row.cells[index])) : null;
          });
          return { row: row, values: values, position: position };
        })
      : [];
  }

  let sort_list = []; // [[column, order]], order 0 = asc, 1 = desc

  function set_headers_css() {
    header_cells.forEach(function (th) {
      th.classList.remove('headerSortUp', 'headerSortDown');
    });
    // NB sortCSS = [cssDesc, cssAsc]: ascending is marked headerSortDown
    sort_list.forEach(function (entry) {
      const th = header_cells[entry[0]];
      if (th) th.classList.add(entry[1] === 0 ? 'headerSortDown' : 'headerSortUp');
    });
  }

  function multisort() {
    cache.sort(function (a, b) {
      for (let i = 0; i < sort_list.length; i++) {
        const column = sort_list[i][0], order = sort_list[i][1];
        const type = parser_of(column).type;
        const result = order === 0
          ? compare(type, a.values[column], b.values[column])
          : compare(type, b.values[column], a.values[column]);
        if (result) return result;
      }
      return a.position - b.position;
    });
    const tbody = data_table.tBodies[0];
    cache.forEach(function (entry) {
      tbody.appendChild(entry.row);
    });
  }

  build_cache();

  header_cells.forEach(function (th, index) {
    // NB like $headers.unbind(): a new table replaces the old handlers
    const previous = bound_headers.get(th);
    if (previous) {
      th.removeEventListener('click', previous.click);
      th.removeEventListener('mousedown', previous.mousedown);
    }
    th.count = 0;
    const sortable = parser_of(index) !== null;
    if (sortable) th.classList.add('header');

    const click = function (event) {
      // NB the old plugin ignored header clicks while a visualization
      // iframe (id="iframe", a named window property) was open
      if (window.iframe) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const tbody = data_table.tBodies[0];
      if (sortable && tbody && tbody.rows.length) {
        const order = th.count++ % 2;
        if (!event[multi_key]) {
          sort_list = [[index, order]];
        } else {
          const existing = sort_list.find(function (entry) {
            return entry[0] === index;
          });
          if (existing) {
            th.count = existing[1] + 1;
            existing[1] = th.count % 2;
          } else {
            sort_list.push([index, order]);
          }
        }
        setTimeout(function () {
          set_headers_css();
          multisort();
        }, 1);
        // NB jQuery `return false`, only for an actual sort
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const mousedown = function (event) {
      // cancelSelection
      th.onselectstart = function () {
        return false;
      };
      event.preventDefault();
      event.stopPropagation();
    };
    th.addEventListener('click', click);
    th.addEventListener('mousedown', mousedown);
    bound_headers.set(th, { click: click, mousedown: mousedown });
  });

  return {
    // NB like trigger('update'): re-read the rows, keep their current order
    update: function () {
      setTimeout(build_cache, 1);
    },
  };
}
