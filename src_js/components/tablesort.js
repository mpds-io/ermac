/**
 * Ermac table sorter: a vanilla replacement for the jquery.tablesorter plugin,
 * reusing the same CSS class contract (th.header, th.headerSortUp,
 * th.headerSortDown, see webassets/ermac.css).
 *
 * The data table body and the header cells live in two separate tables
 * (the old tablesorter 'selectorHeaders' / 'selectorHeaderParent' use case).
 * Ctrl-click appends a column to the current multi-sort.
 */

function cell_text(row, col) {
  const cell = row.cells[col];
  return cell ? cell.textContent.trim() : '';
}

function format_float(str) {
  const num = parseFloat(str.replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function compare_cells(a, b, col, sorter) {
  const va = cell_text(a, col),
    vb = cell_text(b, col);
  if (sorter === 'digit') {
    const na = format_float(va),
      nb = format_float(vb);
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  // NB 'doi' and 'chemical' behave as plain text, exactly like the old plugin
  return va < vb ? -1 : va > vb ? 1 : 0;
}

export function make_sortable(data_table, options) {
  options = options || {};
  const header_cells = document.querySelectorAll(options.selectorHeaders);
  const headers_conf = options.headers || {};
  const tbody = data_table.tBodies[0];

  let sortlist = []; // [{col, dir}] where dir 0 = asc, 1 = desc

  function header_sorter(index) {
    const conf = headers_conf[index];
    return conf && conf.sorter !== undefined ? conf.sorter : 'text';
  }

  function apply() {
    if (!sortlist.length || !tbody) return;
    const rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) {
      for (let i = 0; i < sortlist.length; i++) {
        const { col, dir } = sortlist[i];
        const result = compare_cells(a, b, col, header_sorter(col));
        if (result !== 0) return dir === 1 ? -result : result;
      }
      return 0;
    });
    rows.forEach(function (row) {
      tbody.appendChild(row);
    });
  }

  function refresh_header_classes() {
    header_cells.forEach(function (th, index) {
      th.classList.remove('headerSortUp', 'headerSortDown');
      const found = sortlist.find(function (entry) {
        return entry.col === index;
      });
      if (found)
        // NB parity with the old vendored jquery.tablesorter: it applied
        // sortCSS = [cssDesc, cssAsc], i.e. ascending order was marked
        // with the headerSortDown class, and vice versa
        th.classList.add(found.dir === 1 ? 'headerSortUp' : 'headerSortDown');
    });
  }

  header_cells.forEach(function (th, index) {
    if (header_sorter(index) === false) return; // unsortable column
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
      refresh_header_classes();
      apply();
    });
  });

  return {
    update: apply,
    destroy: function () {
      sortlist = [];
      header_cells.forEach(function (th) {
        th.classList.remove('header', 'headerSortUp', 'headerSortDown');
      });
    },
  };
}
