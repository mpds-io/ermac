/**
 * Ermac table sorter: a vanilla replacement for the jquery.tablesorter plugin.
 *
 * This is a port of the *vendored* tablesorter 2.0 subset the app uses (not
 * of the upstream documentation), preserving the observable contract:
 * the CSS class names (th.header, headerSortUp, headerSortDown, see
 * webassets/ermac.css), the custom chemical/doi parsers added in the
 * vendored file, the locale-aware text comparison (sortLocaleCompare),
 * and the mousedown text-selection cancellation (cancelSelection).
 *
 * The data table body and the header cells live in two separate tables
 * (the old tablesorter 'selectorHeaders' / 'selectorHeaderParent' use case).
 * Ctrl-click appends a column to the current multi-sort.
 */

/*
 * The parsers of the vendored tablesorter, formats verbatim:
 *
 *   text     trim(s.toLocaleLowerCase())                 type text
 *   chemical trim(s.replace('[', '').replace('(', ''))   type text
 *   digit    parseFloat(s) || 0                         type numeric
 *   doi      parseInt(s.replace('[', '').replace(']', '')) || 0  type numeric
 */

var PARSERS = {
  text: {
    type: 'text',
    format: function (s) {
      return s.trim().toLocaleLowerCase();
    },
  },
  chemical: {
    type: 'text',
    format: function (s) {
      return s.trim().replace('[', '').replace('(', '');
    },
  },
  digit: {
    type: 'numeric',
    format: function (s) {
      var value = parseFloat(s);
      return isNaN(value) ? 0 : value;
    },
  },
  doi: {
    type: 'numeric',
    format: function (s) {
      var value = parseInt(s.replace('[', '').replace(']', ''));
      return isNaN(value) ? 0 : value;
    },
  },
};

function cell_text(row, col) {
  const cell = row.cells[col];
  return cell ? cell.textContent.trim() : '';
}

export function make_sortable(data_table, options) {
  options = options || {};
  const header_cells = document.querySelectorAll(options.selectorHeaders);
  const headers_conf = options.headers || {};
  const tbody = data_table.tBodies[0];

  let sortlist = []; // [{col, dir}] where dir 0 = asc, 1 = desc
  var counts = {}; // per-column click counter, like the old this.count
  var parsers = null; // NB detected once like the old buildParserCache()
  // NB the old comparator ends with the orgOrderCol tie-break: equal values
  // fall back to the position in the cache built at init/update time, NOT
  // to the browser sort stability
  var original_index = new WeakMap();

  function parser_for(index) {
    const conf = headers_conf[index];
    if (conf !== undefined && conf.sorter === false) return false;
    const name = conf && conf.sorter !== undefined ? conf.sorter : undefined;
    if (name !== undefined && PARSERS[name]) return PARSERS[name];
    // NB like the old detectParserForColumn: auto-detect digits, else text
    for (var row_index = 0; row_index < tbody.rows.length; row_index++) {
      const value = cell_text(tbody.rows[row_index], index);
      if (value !== '') {
        return /^[-+]?\d*$/.test(value.replace(/[,.']/g, ''))
          ? PARSERS.digit
          : PARSERS.text;
      }
    }
    return PARSERS.text;
  }

  function detect_parsers() {
    parsers = [];
    const first_row = tbody.rows[0];
    for (var col = 0; col < (first_row ? first_row.cells.length : 0); col++)
      parsers.push(parser_for(col));
    for (var i = 0; i < tbody.rows.length; i++)
      original_index.set(tbody.rows[i], i);
  }

  // NB like the old buildCache(): every cell formatted once per sort
  function apply() {
    if (!sortlist.length || !tbody) return;
    const rows = Array.prototype.slice.call(tbody.rows);

    const keyed = rows.map(function (row) {
      const values = [];
      for (var col = 0; col < row.cells.length; col++) {
        values.push(
          parsers[col] ? parsers[col].format(cell_text(row, col)) : '',
        );
      }
      return { row: row, values: values };
    });

    // NB the vendored makeSortFunction() builds RAW codepoint comparisons,
    // the localeCompare branch is dead code in that version
    const comparators = [];
    sortlist.forEach(function (entry) {
      const col = entry.col;
      const parser = parsers[col];
      const a = function (x) { return x.values[col]; };
      if (parser && parser.type === 'text') {
        comparators.push(
          entry.dir === 0
            ? function (x, y) {
                const va = a(x), vb = a(y);
                return va === vb
                  ? 0
                  : va === null
                    ? Number.POSITIVE_INFINITY
                    : vb === null
                      ? Number.NEGATIVE_INFINITY
                      : va < vb
                        ? -1
                        : 1;
              }
            : function (x, y) {
                const va = a(x), vb = a(y);
                return va === vb
                  ? 0
                  : va === null
                    ? Number.POSITIVE_INFINITY
                    : vb === null
                      ? Number.NEGATIVE_INFINITY
                      : vb < va
                        ? -1
                        : 1;
              },
        );
      } else {
        comparators.push(
          entry.dir === 0
            ? function (x, y) { return a(x) - a(y); }
            : function (x, y) { return a(y) - a(x); },
        );
      }
    });

    keyed.sort(function (a, b) {
      for (var i = 0; i < comparators.length; i++) {
        const result = comparators[i](a, b);
        if (result !== 0) return result;
      }
      // NB the orgOrderCol tie-break of the old comparator
      const oa = original_index.get(a.row), ob = original_index.get(b.row);
      return oa === undefined || ob === undefined ? 0 : oa - ob;
    });
    keyed.forEach(function (entry) {
      tbody.appendChild(entry.row);
    });
  }

  function refresh_header_classes() {
    header_cells.forEach(function (th, index) {
      th.classList.remove('headerSortUp', 'headerSortDown');
      const found = sortlist.find(function (entry) {
        return entry.col === index;
      });
      // NB parity with the old vendored plugin: it applied
      // sortCSS = [cssDesc, cssAsc], i.e. ascending order was marked
      // with the headerSortDown class, and vice versa
      if (found)
        th.classList.add(found.dir === 1 ? 'headerSortUp' : 'headerSortDown');
    });
  }

  header_cells.forEach(function (th, index) {
    // NB cancelSelection is bound to ALL header cells in the old plugin,
    // the unsortable ones too: a click on them must not move the focus
    th.addEventListener('mousedown', function (event) {
      event.preventDefault();
      event.stopPropagation();
    });
    if (parser_for(index) === false) return; // unsortable column
    th.classList.add('header');
    th.style.cursor = 'pointer';
    th.addEventListener('click', function (event) {
      const existing = sortlist.find(function (entry) {
        return entry.col === index;
      });

      if (event.ctrlKey && options.sortMultiSortKey === 'ctrlKey') {
        if (existing) existing.dir = existing.dir === 0 ? 1 : 0;
        else sortlist.push({ col: index, dir: 0 });
      } else {
        if (existing && sortlist.length === 1)
          existing.dir = existing.dir === 0 ? 1 : 0;
        else sortlist = [{ col: index, dir: 0 }];
      }
      counts[index] = (counts[index] || 0) + 1;
      refresh_header_classes();
      apply();
    });
  });

  detect_parsers();

  return {
    // NB like the old 'update' event: the parsers are re-detected,
    // the current sort is re-applied to the appended rows
    update: function () {
      detect_parsers();
      apply();
    },
    destroy: function () {
      sortlist = [];
      header_cells.forEach(function (th) {
        th.classList.remove('header', 'headerSortUp', 'headerSortDown');
      });
    },
  };
}
