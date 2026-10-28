/**
 * Ermac search logic: request_search, display/render functions,
 * user session handling, and the selectize read/write helpers.
 */

import wmgui from '../core/settings.js';
import { wmutils } from '../core/utils.js';
import {
  $,
  $$,
  show,
  hide,
  set_html,
  append_html,
  prepend_html,
  empty,
  remove,
  isVisible,
  position,
  slide_down,
  slide_up,
  data,
  get_val,
  set_val,
} from '../core/dom.js';
import { ajax, param, is_empty } from '../core/ajax.js';
import {
  create_floating_slider,
  destroy_numericbox,
  get_sliders_ranges,
  serialize_numeric,
  inquiry_param,
} from '../components/sliders.js';
import { make_sortable } from '../components/tablesort.js';

let db_sorter = null;

wmgui.notify = function (msg) {
  var delay = 0;
  if (wmgui.notify_counter) {
    clearTimeout(wmgui.notify_counter);
    wmgui.notify_counter = null;
    delay = 1500;
  }
  setTimeout(function () {
    set_html($('#notifybox'), wmgui.clean(msg));
    show($('#notifybox'));
    wmgui.notify_counter = setTimeout(function () {
      hide($('#notifybox'));
    }, 4000);
  }, delay);
};

// external API function
wmgui.aug_search_cmd = function (new_fct, new_val) {
  // Take care of mutually exclusive facets
  var checks = [
    ['elements', 'formulae'],
    ['formulae', 'elements'],
    ['lattices', 'sgs'],
    ['sgs', 'lattices'],
    ['protos', 'sgs'],
    ['sgs', 'protos'],
    ['lattices', 'protos'],
    ['protos', 'lattices'],
  ];
  for (var i = 0; i < checks.length; i++) {
    if (wmgui.search[checks[i][0]] && new_fct == checks[i][1]) {
      delete wmgui.search[checks[i][0]];
      break;
    }
  }

  var orepr = {};

  wmgui.facets.forEach(function (fct) {
    if (wmgui.search[fct] && fct == new_fct) {
      if (wmgui.multi_facets.indexOf(fct) !== -1)
        orepr[fct] = wmgui.search[fct] + ',' + new_val;
      else orepr[fct] = new_val;
    } else if (wmgui.search[fct]) {
      orepr[fct] = wmgui.search[fct];
    } else if (fct == new_fct) {
      orepr[fct] = new_val;
    }
  });
  return '#inquiry/' + inquiry_param(orepr);
};

// reading the multiselect at the main search input (landing)
wmgui._selectize_read_main = function () {
  var result = {},
    instance = wmgui.multiselects['main'];

  (instance ? instance.items : []).forEach(function (item) {
    var facet = item.facet;

    if (wmgui.other_facets.indexOf(facet) !== -1 && wmgui.search[facet])
      result[facet] = wmgui.search[facet];
    else if (facet == 'numeric') {
      if (wmgui.search[facet]) {
        result[facet] = '';
        wmgui.search[facet].forEach(function (num_item) {
          result[facet] += serialize_numeric.apply(this, num_item); // unpack
        });
        if (result[facet].length)
          result[facet] = result[facet].substr(0, result[facet].length - 1);
      } // NB else just skip!
    } else if (result[facet] && facet == 'elements')
      result[facet] += '-' + item.label;
    else if (result[facet] && wmgui.multi_facets.indexOf(facet) !== -1)
      result[facet] += ', ' + item.label;
    else if (facet == 'formulae')
      result[facet] = item.label
        .replaceAll('<sub>', '')
        .replaceAll('</sub>', '');
    else result[facet] = item.label;
  });

  return result;
};

// reading the multiselect at the *wmgui.multi_facets* categories
wmgui._selectize_read_facet = function (fct) {
  var result = {},
    instance = wmgui.multiselects[fct];

  (instance ? instance.items : []).forEach(function (item) {
    var facet = item.facet;

    if (result[facet]) result[facet] += ', ' + item.label;
    else result[facet] = item.label;
    return;
  });

  return result;
};

wmgui._selectize_write = function (multiselect, name, search_obj) {
  wmgui.selectize_emit = false;

  var given_search = {};
  Object.assign(given_search, search_obj);

  if (name == 'main') {
    name = ['formulae', 'props', 'elements', 'classes', 'lattices', 'aetypes'];

    for (var i = 0; i < wmgui.other_facets.length; i++) {
      if (given_search[wmgui.other_facets[i]]) {
        wmgui._selectize_display(
          multiselect,
          wmgui.other_facets[i],
          wmgui.facet_names[wmgui.other_facets[i]].toLowerCase(),
        ); // stub display
      }
    }

    if (given_search.numeric)
      wmgui._selectize_display(multiselect, 'numeric', 'range search');
  } else name = [name];

  name.forEach(function (facet) {
    // facets supported for multiselect autocomplete
    if (!given_search[facet]) return;
    else if (facet == 'elements' && given_search[facet].indexOf('-') > 0) {
      given_search[facet].split('-').forEach(function (part) {
        wmgui._selectize_display(multiselect, facet, part);
      });
    } else if (
      wmgui.multi_facets.indexOf(facet) !== -1 &&
      given_search[facet].indexOf(',') > 0
    ) {
      given_search[facet].split(',').forEach(function (part) {
        wmgui._selectize_display(multiselect, facet, part);
      });
    } else if (facet == 'formulae') {
      given_search[facet] = wmgui.to_formula(given_search[facet]);
      wmgui._selectize_display(multiselect, facet, given_search[facet]);
    } else wmgui._selectize_display(multiselect, facet, given_search[facet]);
  });

  multiselect.clearOptions();
  wmgui.selectize_emit = true;
};

wmgui._selectize_display = function (multiselect, facet, term) {
  // NB consume one random value, exactly like the old implementation did
  // (Math.floor(Math.random() * 1000) ids), to keep the global random
  // sequence aligned between page loads, e.g. for the rotating legends
  Math.random();
  const option_data = { facet: facet, label: term };
  multiselect.addOption(option_data);
  multiselect.addItem(option_data.id);
};

export function show_interpretation(search) {
  // FIXME only allow pre-defined props
  set_html(
    $('#interpret'),
    wmgui.clean(
      wmgui.get_interpretation(search, wmgui.facet_names, wmgui.numerics),
    ),
  );
}

// re-loading without history affection
export function re_view_request(search_type) {
  var caption_items = [];
  for (var k in wmgui.search) {
    if (k == 'search_type') continue;
    caption_items.push(wmgui.search[k]);
  }
  if (!caption_items.length) return;

  wmgui.search_type = search_type;
  wmgui.search.search_type = search_type;
  request_search(
    wmgui.search,
    caption_items.join(' ').replaceAll(',', ' '),
    true,
  );
  $$('#dtypes_phid > ul > li').forEach(function (li) {
    li.classList.remove('active');
  });
}

export function update_databrowser_sort() {
  if (db_sorter) db_sorter.update();
}

export async function request_search(search, caption, without_history) {
  if (manage_visavis(rebuild_history_box, search, caption)) return;

  try {
    wmgui.active_ajax.abort();
  } catch (e) {}
  try {
    wmgui.quick_ajax.abort();
  } catch (e) {}

  wmgui.show_preloader();
  const request = ajax({
    type: 'GET',
    url: wmgui.search_endpoint,
    data: {
      q: JSON.stringify(search),
      strict: wmgui.ctx_strict_phases,
      //subphases: wmgui.ctx_subphases,
      sid: wmgui.sid,
    },
  });
  wmgui.active_ajax = request;

  let data;
  try {
    data = await request;
  } catch (error) {
    wmgui.hide_preloader();
    if (!(error && error.aborted))
      wmgui.notify(
        'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
      );
    return;
  }
  wmgui.hide_preloader();

  if (data.error) return wmgui.notify(data.error);

  caption = caption.replaceAll('%2F', '/');

  if (!data.out.length) return wmgui.notify('No hits for ' + caption);

  wmgui.fuzzyout = false;
  if (data.fuzzy_notice) {
    wmgui.fuzzyout = true;
    wmgui.notify(data.fuzzy_notice);
  }

  var res_str = data.estimated_count == 1 ? ' result' : ' results',
    notice = data.estimated_count > 150 ? 'At least ' : '';
  document.title = notice + data.estimated_count + res_str; // + ' (' + wmgui.estimate + ')';
  //console.log('Obtained: '+data.estimated_count+', expected: '+wmgui.estimate);
  switch_view_mode(2);

  if (!wmgui.chosen_table_browser)
    // TODO add smarter check?
    wmgui.thumbed_display = data.out.length > wmgui.ntab_tolerance;

  if (wmgui.thumbed_display) {
    var db = $('#databrowser');
    db.className = 'thumbed';
    // NB the old jQuery .append('<tr>...') put the tr directly under the
    // table (no tbody wrapper), so the DOM stays identical
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + build_thumbs(data.out) + '</td>';
    db.innerHTML = '';
    db.appendChild(tr);
    slide_down($('#results'), 250);
  } else {
    var db = $('#databrowser');
    db.className = 'tabled';
    db.innerHTML = build_cells(data.out, '<tbody>', '</tbody>');
    slide_down($('#results'), 250);

    if (wmgui.search_type == 2) {
      db.classList.add('tablesorter');
      db_sorter = make_sortable(db, {
        sortMultiSortKey: 'ctrlKey',
        headers: {
          0: { sorter: 'doi' },
          5: { sorter: false },
        },
        selectorHeaders: '#dataheader_articles > thead > tr > th',
      });
      show($('#header_articles'));
    } else if (wmgui.search_type == 1) {
      db.classList.add('tablesorter');
      db_sorter = make_sortable(db, {
        sortMultiSortKey: 'ctrlKey',
        headers: {
          0: { sorter: 'chemical' },
          1: { sorter: 'digit' },
          2: { sorter: 'digit' },
          3: { sorter: 'digit' },
          4: { sorter: false },
        },
        selectorHeaders: '#dataheader_phases > thead > tr > th',
      });
      show($('#header_phases'));
    } else {
      db.classList.add('tablesorter');
      db_sorter = make_sortable(db, {
        sortMultiSortKey: 'ctrlKey',
        headers: {
          0: { sorter: 'chemical' },
          1: { sorter: false },
          5: { sorter: 'doi' },
        },
        selectorHeaders: '#dataheader_entries > thead > tr > th',
      });
      show($('#header_entries'));
    }
  }

  // count & show ctx
  wmgui.unfinished_page = false;
  if (wmgui.search_type || search.phid) {
    if (data.estimated_count >= wmgui.quick_page_size * 3) {
      set_html($('#toomuch span'), 'other');
      show($('#toomuch'));
    }
    show_hints(search.entry || search.interlinkage);
  } else {
    if (data.estimated_count > wmgui.quick_page_size + wmgui.fetch_page_size) {
      set_html(
        $('#toomuch span'),
        'nearly ' + (data.estimated_count - wmgui.quick_page_size),
      );
      show($('#toomuch'));
      show_hints(search.entry, data.estimated_count);
    } else if (data.estimated_count > wmgui.quick_page_size) {
      show($('#loadscroll'));
      wmgui.unfinished_page = true;
    } else show_hints(search.entry, data.estimated_count);
  }

  // switchers
  if (wmgui.visavis_terminating) stop_visavis();

  if (
    wmgui.search_type ||
    search.phid ||
    search.bid ||
    search.entry ||
    search.interlinkage ||
    search.doi ||
    search.numeric
  ) {
    if (search.phid || search.bid || search.entry) {
      switch_control_mode(9, 11, 'a', 'c');
      show_dunit_info(search.phid, search.bid, search.entry);
    } else if (search.interlinkage) {
      switch_control_mode(9, 11, 'a', 'c');
      show_examples('#examples', true, true);
      hide($('#dtypes'));
    } else if (search.numeric) {
      switch_control_mode(1, 12, 'b', false);
      //console.log(search.numeric);
      destroy_numericbox();
      get_sliders_ranges(search.numeric, wmgui.numerics).forEach(
        function (item) {
          create_floating_slider.apply(this, item); // unpack
        },
      );
      show_examples('#examples', true, true);
    } else {
      switch_control_mode(1, 10, false, false);
      show_examples('#examples', true, true);
    }

    if (search.entry) {
      var that = document.getElementById('e__' + search.entry);
      if (search.entry.indexOf('-') == -1 && !that)
        that = document.getElementById('e__' + search.entry + '-1');
      if (that && that.getAttribute('data-rank') != 0) {
        // NB "!=", not "!=="
        that.classList.remove('busy_entry');
        open_context(that, true);
      }
    }
  } else {
    wmgui.fuzzyout
      ? switch_control_mode(1, 11, 'a', false)
      : switch_control_mode(0, 10, false, false);
    request_refinement(search, data.estimated_count > wmgui.quick_page_size);
  }

  //console.log(search);
  if (!search.numeric) {
    destroy_numericbox();
    delete wmgui.search.numeric;
  }
  if (search.props && wmgui.numerics[search.props]) {
    // making a hint
    var num_data = wmgui.numerics[search.props],
      prop_id = num_data[0],
      units = num_data[1],
      min = num_data[2],
      max = num_data[3],
      step = num_data[4];
    create_floating_slider(search.props, prop_id, units, min, max, step);
  }
  if (!without_history) rebuild_history_box(search, caption);
  wmgui.search.elements && wmgui.search_type == 1
    ? show($('#phases_ctx'))
    : hide($('#phases_ctx'));
}

function rebuild_history_box(search, caption) {
  var orepr = {};
  wmgui.facets.forEach(function (item) {
    if (search[item]) orepr[item] = search[item];
  });

  var inquiry = false;
  for (var m = 0; m < wmgui.inquiries.length; m++) {
    if (orepr[wmgui.inquiries[m]]) {
      inquiry = true;
      break;
    }
  }

  var title = [];
  for (var prop in orepr) {
    title.push(orepr[prop].toLowerCase());
  }
  title.sort();
  var fingerprint = title.join(' '),
    search_log = JSON.parse(
      window.localStorage.getItem(wmgui.store_history_key) || '[]',
    ),
    chk_searches = [];
  if (search_log.length > 8) search_log = search_log.slice(0, 7);
  search_log.forEach(function (item) {
    var past_title = [];
    for (var p in item) {
      past_title.push(item[p].toLowerCase());
    }
    past_title.sort();
    chk_searches.push(past_title.join(' '));
  });
  if (chk_searches.indexOf(fingerprint) == -1) {
    var item;
    if (inquiry)
      item = '<a href="#inquiry/' + inquiry_param(orepr) + '">' + caption + '</a>';
    else
      item =
        '<a href="#search/' +
        encodeURIComponent(caption) +
        '">' +
        caption +
        '</a>';

    prepend_html($('#history ul'), '<li>' + wmgui.clean(item) + '</li>');
    search_log.unshift(orepr);
    window.localStorage.setItem(
      wmgui.store_history_key,
      JSON.stringify(search_log),
    );
    const history_lis = $$('#history ul li');
    if (history_lis.length > 8) history_lis[history_lis.length - 1].remove();
  }
  wmgui.tooltip_counter++;
  if (wmgui.tooltip_counter == 1) {
    setTimeout(function () {
      show_tooltip(wmgui.tooltips['interpretation']);
    }, 3000);
  }
}

export function rotate_interesting() {
  set_html(
    $('#legend'),
    '<i>e.g.</i> <a href="#">' +
      wmgui.get_interesting()['text'].replace(/\d/g, '&#x208$&;') +
      '</a>',
  );
}

export function show_examples(box, more_examples, fix_rfn_header) {
  if (wmgui.cliff_counter === null)
    wmgui.cliff_counter = Math.floor(Math.random() * wmgui.cliffhangers.length);
  var html = '';
  for (var i = 0; i < (more_examples ? 7 : 3); i++) {
    wmgui.cliff_counter += 1;
    if (wmgui.cliff_counter > wmgui.cliffhangers.length - 1)
      wmgui.cliff_counter = 0;
    html +=
      '<li><a href="#search/' +
      wmutils.termify_formulae(wmgui.cliffhangers[wmgui.cliff_counter]) +
      '">' +
      wmgui.cliffhangers[wmgui.cliff_counter].charAt(0).toUpperCase() +
      wmgui.cliffhangers[wmgui.cliff_counter].slice(1) +
      '</a></li>';

    var legend = wmgui.get_interesting()['text'];
    html +=
      '<li><a href="#search/' +
      encodeURIComponent(legend) +
      '">' +
      legend.charAt(0).toUpperCase() +
      legend.slice(1).replace(/\d/g, '&#x208$&;') +
      '</a></li>';
  }
  empty($(box + ' > ul'));
  append_html($(box + ' > ul'), html);
  show($(box));

  if (fix_rfn_header) {
    hide($$('#refine_col > div.col_title, #refine_col > ul'));
    show($('#refine_col'));
  }
}

export function arrange_menu_collateral() {
  empty($$('#hintsbox_msg, #tagcloudbox'));

  var links_html = '';
  for (var i = 0; i < wmgui.collateral_links.length; i++) {
    var rel = wmgui.collateral_links[i][1],
      cls = wmgui.collateral_links[i][1] ? 'collateral' : false,
      target = '',
      lbr = '';
    if (i % 2) {
      cls = cls ? cls + ' violet' : 'violet';
      lbr = '<br />';
    }
    if (wmgui.collateral_links[i][3]) target = ' target="_blank"';
    links_html +=
      '<a' +
      target +
      ' href="' +
      wmgui.collateral_links[i][0] +
      '"' +
      (cls ? ' class="' + cls + '"' : '') +
      (rel ? ' rel=' + rel : '') +
      '>' +
      wmgui.collateral_links[i][2] +
      '</a>' +
      lbr;
  }
  append_html($('#tagcloudbox'), links_html);

  append_html($('#hintsbox_msg'), wmgui.get_random_term(wmgui.welcome_msgs));
}

export function switch_view_mode(mode) {
  wmgui.view_mode = mode;
  hide($$('div.autocomplete-suggestions'));
  hide($$('#results, #header_entries, #header_phases, #header_articles'));
  hide($$('div.context_msg'));
  close_vibox();

  if (mode == 1) {
    stop_visavis();
    document.title = 'Materials Platform for Data Science';
    document.body.classList.add('noscroll');
    $('#search_box').classList.remove('fluid');

    hide($$('div.side_cols'));
    show($('#legend'));

    $('#search_holder').classList.remove('prolonged');
    $('#search_area').classList.remove('prolonged');
    $('#ermac_logo').classList.remove('cornered');

    wmgui.ptable.decide();
    if (wmgui.ptable.activated)
      document.getElementById('ptable_dtypes_box').classList.add('resulted');
  } else if (mode == 2) {
    hide($('#legend'));
    hide($('#ctx_col'));
    if (wmgui.passive_sim_col) hide($('#sim_col'));

    document.body.classList.remove('noscroll');
    $('#search_box').classList.add('fluid');

    show($('#right_col'));
    show($('#dtypes'));
    $('#search_holder').classList.add('prolonged');
    $('#search_area').classList.add('prolonged');
    $('#ermac_logo').classList.add('cornered');

    wmgui.ptable.hide();
    document.getElementById('ptable_dtypes_box').classList.remove('resulted');
  }
  // hook back into a parent integration
  wmgui.mpdsgui.view(mode);
}

function switch_control_mode(mode, next_mode, active_abf, active_cde) {
  // NB (0, 10) is the most common 6-button layout
  if (mode == 0) {
    // cde, second
    $$('#control_c, #control_d, #control_e').forEach(function (el) {
      el.style.width = '33.3%';
    });
    show($$('#control_c, #control_d, #control_e'));
  } else if (mode == 1) {
    // cde, second
    hide($('#control_e'));
    $$('#control_c, #control_d').forEach(function (el) {
      el.style.width = '50%';
    });
    show($$('#control_c, #control_d'));
  } else if (mode == 9) {
    // cde, second
    hide($$('#control_e, #control_d'));
    $('#control_c').style.width = '100%';
    show($('#control_c'));
  } else if (mode == 10) {
    // abf, first
    $$('#control_a, #control_b, #control_f').forEach(function (el) {
      el.style.width = '33.3%';
    });
    show($$('#control_a, #control_b, #control_f'));
  } else if (mode == 11) {
    // abf, first
    hide($$('#control_b, #control_f'));
    $('#control_a').style.width = '100%';
    show($('#control_a'));
  } else if (mode == 12) {
    // abf, first
    hide($$('#control_a, #control_f'));
    $('#control_b').style.width = '100%';
    show($('#control_b'));
  }
  if (!next_mode) return;

  if (!active_abf) active_abf = { 0: 'a', 1: 'b', 2: 'f' }[wmgui.search_type];
  if (!active_cde) active_cde = wmgui.thumbed_display ? 'd' : 'c';

  // NB like the old $('div.controlswitch > div').removeClass(): ALL six
  // switches lose ALL their classes before the two current ones are set
  $$('div.controlswitch > div').forEach(function (el) {
    el.className = '';
  });
  $('#control_' + active_abf).classList.add('active');
  $('#control_' + active_cde).classList.add('active');

  switch_control_mode(next_mode);
}

export function build_cells(json, header, footer) {
  var cls_map = {
      7: 'ml_data',
      8: 'ab_data',
      9: 'ab_data',
      10: 'ab_data',
      11: 'ab_data',
      13: 'deactivated',
    },
    result_html = '';

  if (header) result_html += header;

  if (wmgui.search_type == 2) {
    if (json[0].length != 6) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    var act_link = '';

    json.forEach(function (row, k) {
      act_link = '<a class="launch_id" href="#article/' + row[0] + '">Show</a>';

      row[0] = parseInt(row[0]);
      if (row[0] == 999999) {
        row[4] = wmgui.mockyear; // special *ref_id*, only handled in GUI
        act_link = '&nbsp;';
      }
      result_html +=
        '<tr id="e__B' +
        row[0] +
        '" class="tcell" data-type="B"><td class=c55>[<a class="resolve_ref' +
        (wmgui.bid_history.indexOf(row[0]) !== -1 ? ' visited' : '') +
        '" href="' +
        wmgui.refs_endpoint +
        '?ref_id=' +
        row[0] +
        '&sid=' +
        wmgui.sid +
        '&ed=' +
        wmgui.edition +
        '" rel="' +
        row[0] +
        '" target="_blank" rel="noopener noreferrer">' +
        row[0] +
        '</a>]</td><td class=a1>' +
        row[1] +
        '</td><td class=a2 title="' +
        row[2] +
        '">' +
        row[2] +
        '</td><td class=a5>' +
        row[5] +
        '</td><td class=c4>' +
        row[4] +
        '</td><td class=a6>' +
        act_link +
        '</td></tr>';
    });
  } else if (wmgui.search_type == 1) {
    if (json[0].length != 5) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    json.forEach(function (row, k) {
      result_html +=
        '<tr id="e__Z' +
        row[0] +
        '" class="tcell" data-type="Z"><td class=p1>' +
        row[1] +
        '</td><td class=p2>' +
        row[2] +
        '</td><td class=p3>' +
        row[3] +
        '</td><td class=p4>' +
        row[4] +
        '</td><td class=p5><a class="launch_id" href="#phase_id/' +
        row[0] +
        '">Show entries</a></td></tr>';
    });
  } else {
    if (json[0].length != 8) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    json.forEach(function (row, k) {
      row[7] = parseInt(row[7]);
      var dtype = row[0].substr(0, 1),
        preview =
          row[3] == 4 ||
          row[3] == 5 ||
          row[3] == 6 ||
          row[3] == 9 ||
          row[3] == 10 ||
          row[3] == 12
            ? '<span class=launch_v>Show</span>'
            : ' ', // FIXME? w.r.t. open_context
        biblio_html =
          row[7] == 999999
            ? '<td class=cj>&mdash;</td><td class=c4>' +
              wmgui.mockyear +
              '</td><td class=c5>&mdash;</td>'
            : '<td class=cj>' +
              row[5] +
              '</td><td class=c4>' +
              row[6] +
              '</td><td class=c5>[<a class="resolve_ref' +
              (wmgui.bid_history.indexOf(row[7]) !== -1 ? ' visited' : '') +
              '" href="' +
              wmgui.refs_endpoint +
              '?ref_id=' +
              row[7] +
              '&sid=' +
              wmgui.sid +
              '&ed=' +
              wmgui.edition +
              '" rel="' +
              row[7] +
              '" target="_blank" rel="noopener noreferrer">' +
              row[7] +
              '</a>]</td>'; // special *ref_id*, only handled in GUI

      result_html +=
        '<tr id="e__' +
        row[0] +
        '" class="tcell ' +
        (cls_map[row[3]] || '') +
        (row[4] ? ' opened' : '') +
        '" data-type="' +
        dtype +
        '" data-rank="' +
        row[3] +
        '" title="Click for more info"><td class=c1>' +
        row[1] +
        '</td><td class=cp>' +
        preview +
        '</td><td class=c2>' +
        row[2] +
        '</td>' +
        biblio_html +
        '</tr>';
    });
  }
  if (footer) result_html += footer;
  return result_html;
}

export function build_thumbs(json) {
  var cls_map = {
      6: 'pd_full',
      7: 'ml_data',
      8: 'ab_data',
      9: 'ab_data',
      10: 'ab_data',
      11: 'ab_data',
      13: 'deactivated',
    },
    result_html = '';

  if (wmgui.search_type == 2) {
    if (json[0].length != 6) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    json.sort(function (a, b) {
      return a[4] > b[4] ? 1 : a[4] < b[4] ? -1 : 0; // pubyear
    });

    var title_html = '',
      full_display = !!wmgui.sid,
      act_link = '';

    json.forEach(function (row, k) {
      act_link =
        '<a class="launch_id" href="#article/' + row[0] + '">Show entries</a>';

      row[0] = parseInt(row[0]);
      if (row[0] == 999999) {
        row[4] = wmgui.mockyear; // special *ref_id*, only handled in GUI
        act_link = 'Too many to show...';
      }
      if (full_display)
        title_html =
          (row[1].length > 60 ? row[1].substr(0, 60) + '&hellip;' : row[1]) +
          ', <span>' +
          (row[2].length > 80 ? row[2].substr(0, 80) + '&hellip;' : row[2]) +
          '</span>';
      else title_html = '<b>&#x1f4d6;</b>'; // book icon

      result_html +=
        '<div class="gallery_item" id="e__B' +
        row[0] +
        '" data-type="B"><div class="gallery_img"><div class="articled">' +
        title_html +
        '</div></div><div class="gallery_label">' +
        act_link +
        '<br />[<a class="resolve_ref' +
        (wmgui.bid_history.indexOf(row[0]) !== -1 ? ' visited' : '') +
        '" href="' +
        wmgui.refs_endpoint +
        '?ref_id=' +
        row[0] +
        '&sid=' +
        wmgui.sid +
        '&ed=' +
        wmgui.edition +
        '" rel="' +
        row[0] +
        '" target="_blank" rel="noopener noreferrer">' +
        row[3] +
        '&rsquo;' +
        row[4].toString().substr(2, 2) +
        '</a>]</div></div>';
    });
  } else if (wmgui.search_type == 1) {
    if (json[0].length != 5) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    json.sort(function (a, b) {
      return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
    });
    json.forEach(function (row, k) {
      result_html +=
        '<div class="gallery_item" id="e__Z' +
        row[0] +
        '" data-type="Z"><div class="gallery_img" rel="' +
        row[0] +
        '"><div class="phased">' +
        row[1] +
        '<br /><br />space group ' +
        row[2] +
        '</div></div><div class="gallery_label"><a class="launch_id" href="#phase_id/' +
        row[0] +
        '">Show ' +
        row[3] +
        (row[3] == 1 ? ' entry' : ' entries') +
        '</a><br />Publications: ' +
        row[4] +
        '</div></div>';
    });
  } else {
    if (json[0].length != 8) {
      wmgui.notify(
        'Rendering error, please try to <a href=javascript:location.reload()>reload</a>',
      );
      return '';
    }

    json.sort(function (a, b) {
      var dtype_a = a[0].substr(0, 1),
        dtype_b = b[0].substr(0, 1);

      if (dtype_a == 'S') {
        if (dtype_b == 'S') return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
        return -1;
      }
      if (dtype_a == 'C') {
        if (dtype_b == 'C') return a[7] > b[7] ? 1 : a[7] < b[7] ? -1 : 0;
        if (dtype_b == 'S') return 1;
        if (dtype_b == 'P') return -1;
      }
      if (dtype_a == 'P') {
        if (dtype_b == 'P')
          return a[2].toUpperCase() > b[2].toUpperCase()
            ? 1
            : a[2].toUpperCase() < b[2].toUpperCase()
              ? -1
              : 0;
        return 1;
      }
    });
    json.forEach(function (row, k) {
      row[7] = parseInt(row[7]);
      var dtype = row[0].substr(0, 1),
        content,
        biblio_html =
          row[7] == 999999
            ? '<br />&mdash;'
            : '<br />[<a class="resolve_ref' +
              (wmgui.bid_history.indexOf(row[7]) !== -1 ? ' visited' : '') +
              '" href="' +
              wmgui.refs_endpoint +
              '?ref_id=' +
              row[7] +
              '&sid=' +
              wmgui.sid +
              '&ed=' +
              wmgui.edition +
              '" rel="' +
              row[7] +
              '" target="_blank" rel="noopener noreferrer">' +
              row[5] +
              '&rsquo;' +
              row[6].toString().substr(2, 2) +
              '</a>]'; // special *ref_id*, only handled in GUI

      if (dtype == 'P') content = '<div>' + row[2] + '</div>';
      else if (dtype == 'S')
        content =
          '<img loading="lazy" alt="' +
          row[0] +
          '" src="' +
          wmgui.static_host +
          '/rd_thumbs/' +
          row[0].split('-')[0] +
          '.png" />';
      else {
        // FIXME
        row[2] = row[2].split(';')[0];
        row[2] = row[2].split(' ')[row[2].split(' ').length - 1];
        var url_dest =
          row[3] == 12
            ? row[2].split('-').length == 3
              ? '/prism'
              : '/tetrahedron'
            : '/pd_thumbs/' + row[0].split('-')[0];
        content =
          '<img loading="lazy" alt="' +
          row[0] +
          '" src="' +
          wmgui.static_host +
          url_dest +
          '.png" /><p>' +
          row[2] +
          '</p>';
      }
      result_html +=
        '<div class="gallery_item ' +
        (cls_map[row[3]] || '') +
        (row[4] ? ' opened' : '') +
        '" id="e__' +
        row[0] +
        '" data-type="' +
        dtype +
        '" data-rank="' +
        row[3] +
        '" title="Click for more info"><div class="gallery_img">' +
        content +
        '</div><div class="gallery_label">' +
        row[1] +
        biblio_html +
        '</div></div>';
    });
  }
  return result_html;
}

export async function request_refinement(query_obj, is_heavy) {
  hide($$('#examples, #ind_col'));
  empty($('#ind_col > span'));
  empty($('#refine_col > ul'));
  show($('#refine_col'));
  show($('#refine_col > div.col_title'));

  var given_search = { is_heavy: is_heavy };
  Object.assign(given_search, query_obj);
  try {
    wmgui.active_ajax.abort();
  } catch (e) {}

  //console.log(given_search);
  show($('#rfn_preloader'));
  const request = ajax({
    type: 'GET',
    url: wmgui.rfn_endpoint,
    data: { q: JSON.stringify(given_search) },
  });
  wmgui.active_ajax = request;

  let data;
  try {
    data = await request;
  } catch (error) {
    hide($('#rfn_preloader'));
    if (!(error && error.aborted))
      wmgui.notify(
        'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
      );
    return;
  }
  hide($('#rfn_preloader'));

  if (data.error) return wmgui.notify(data.error);

  var was_facet = null,
    refine_html = '',
    classes_chk = [],
    num_terms = 0;
  delete given_search['is_heavy'];

  if (given_search.classes) {
    // no whitespace in multiple classes
    classes_chk = given_search.classes.split(',').map(function (x) {
      return x.trim();
    });
    given_search.classes = classes_chk.join(',');
  }

  var inquiry = false;
  for (var m = 0; m < wmgui.inquiries.length; m++) {
    if (given_search[wmgui.inquiries[m]]) {
      inquiry = true;
      break;
    }
  }

  for (var i = 0; i < data.payload.length; i++) {
    const found_obj = data.payload[i];
    if (query_obj.formulae && found_obj.facet == 'elements') continue; // NB no sense to show elements in this context

    var link_base = '',
      //count_text = ' ('+found_obj.count+')',
      nested_skip = false,
      orepr = {};

    for (var key in given_search) {
      const val = given_search[key];
      if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
      else if (
        found_obj.facet == 'elements' &&
        (key == 'elements' || key == 'formulae')
      )
        continue;
      else if (found_obj.facet == 'props' && key == 'props') continue;

      link_base += val + ' ';

      if (orepr[key]) orepr[key] += ', ' + val;
      else orepr[key] = val;
    }
    //if (found_obj.facet == 'elements') count_text = '';
    if (query_obj.classes && found_obj.facet == 'classes') {
      for (var n = 0; n < classes_chk.length; n++) {
        if (classes_chk[n] == found_obj.value) {
          nested_skip = true;
          break;
        }
      }
    }
    if (nested_skip) continue;

    if (found_obj.facet != was_facet) {
      if (was_facet && is_heavy)
        refine_html +=
          '<li class="fct_' +
          was_facet +
          ' extd_refine"><a class="extd_refine" rel="' +
          was_facet +
          '" href="#">Show more&nbsp;</a></li>';
      refine_html +=
        '<li class="new_rfn_facet fct_' +
        found_obj.facet +
        '">' +
        wmgui.facet_names[found_obj.facet] +
        '</li>';
      was_facet = found_obj.facet;
    }
    if (found_obj.facet == 'props') {
      found_obj.value = found_obj.value
        .replace(/\(|\)/g, '')
        .replace(/\/[\w\-]*/g, ''); // FIXME
    }

    if (orepr[found_obj.facet])
      orepr[found_obj.facet] += ', ' + found_obj.value;
    else orepr[found_obj.facet] = found_obj.value;

    if (orepr['elements'])
      orepr['elements'] = orepr['elements'].replaceAll(', ', '-');

    if (inquiry)
      refine_html +=
        '<li class="fct_' +
        found_obj.facet +
        '"><a href="#inquiry/' +
        inquiry_param(orepr) +
        '">' +
        found_obj.value +
        '</a></li>';
    else
      refine_html +=
        '<li class="fct_' +
        found_obj.facet +
        '"><a href="#search/' +
        link_base +
        found_obj.value +
        '">' +
        found_obj.value +
        '</a></li>';
    num_terms++;
  }

  if (is_heavy)
    refine_html +=
      '<li class="fct_' +
      was_facet +
      ' extd_refine"><a class="extd_refine" rel="' +
      was_facet +
      '" href="#">Show more&nbsp;</a></li>';

  if (num_terms == 0) show_examples('#examples', true, true);
  else {
    show($('#refine_col > ul'));
    append_html($('#refine_col > ul'), wmgui.clean(refine_html));
    if (num_terms <= 10) show_examples('#examples', false, false);
  }
}

/**
 * NB: Ranks legend
 * 0 - bib-ref (unproc) + P-entries data on
 * 1 - textual (diagrammatic) P-entry
 * 2 - scalar (numeric) P-entry
 * 3 - C-phase
 * 4 - SD-entry (P-array)
 * 5 - S-entry
 * 6 - C-diagram
 * 7 - ML P-entry
 * 8 - ab initio entry (scalar)
 * 9 - ab initio entry (P-array) electron spectra
 * 10 - ab initio entry (P-array) phonon spectra
 * 11 - ab initio data in progress (unproc)
 * 12 - 3d combination of C-diagrams
 * 13 - deactivated entries
 */
export function open_context(el, launch_ext) {
  close_vibox();
  if (el.classList.contains('busy_entry')) {
    el.classList.remove('busy_entry');
    hide($$('#ctx_col, #sim_col'));
    try {
      wmgui.quick_ajax.abort();
    } catch (e) {}
  } else {
    var entry = el.id.substr(3),
      rank = parseInt(el.getAttribute('data-rank')),
      entype = entry.substr(0, 1),
      orig_id = entry.split('-')[0];

    $$('.busy_entry').forEach(function (busy) {
      busy.classList.remove('busy_entry');
    });
    el.classList.add('busy_entry');

    if (entype == 'Z' || entype == 'B') return;

    set_html(
      $('#entryno'),
      '<a href="#entry/' + orig_id + '">' + orig_id + '</a>',
    );

    show($('#ctx_col'));
    const visualize = $('#visualize');
    if (visualize) visualize.setAttribute('data-rank', rank);
    const xrpdize = $('#xrpdize');
    if (xrpdize) xrpdize.setAttribute('data-rank', 99); // FIXME hack
    //$('#visualize, #xrpdize, #absolidize, div.spinoff_pane, li.d_icon').hide();
    hide($$('#visualize, #xrpdize, div.spinoff_pane, li.d_icon'));

    open_sim_col(entry, entype, rank);

    if (rank == 0) {
      show($('#download_bib'));
    } else if (rank == 1) {
      show($$('#download_bib, #download_pdf'));
      ajax({ type: 'GET', url: wmgui.path_pp_ping + entry })
        .then(function () {
          show($$('#visualize, #download_png, #download_json'));
        })
        .catch(function () {});
    } else if (rank == 2) {
      show($$('#download_bib, #download_pdf, #download_json'));
    } else if (rank == 3) {
      show($$('#download_bib, #download_png, #download_cdr'));
    } else if (rank == 4) {
      show($$('#download_bib, #download_json, #visualize'));
    } else if (rank == 5) {
      //$('#absolidize, #download_bib, #download_pdf, #visualize, #xrpdize, #absolidize, #download_cif, #download_inp, #download_json').show();
      show(
        $$(
          '#download_bib, #download_pdf, #visualize, #xrpdize, #download_cif, #download_inp, #download_json',
        ),
      );
    } else if (rank == 6) {
      show(
        $$(
          '#download_bib, #download_pdf, #visualize, #download_png, #download_cdr, #download_json',
        ),
      );
    } else if (rank == 7) {
      show($$('#ml_data, #download_pdf, #download_json'));
    } else if (rank == 8) {
      show($$('#ab_data, #download_pdf, #download_json, #download_raw'));
    } else if (rank == 9) {
      show(
        $$(
          '#ab_data, #download_pdf, #download_json, #visualize, #download_png, #download_raw',
        ),
      );
    } else if (rank == 10) {
      show(
        $$(
          '#ab_data, #download_pdf, #download_json, #visualize, #download_raw',
        ),
      );
    } else if (rank == 11) {
      show($$('#ab_promise, #download_json'));
    } else if (rank == 12) {
      show($$('#pd3d_data, #visualize'));
    } else if (rank == 13) {
      show($$('#deactivated_data, #download_bib'));
    }
    $$('#ctx_col > ul > li.d_icon > a').forEach(function (a) {
      var fmt = a.getAttribute('rel'),
        link_add = entype == 'S' ? '&export=1' : '',
        link_sid = fmt == 'raw' ? 'null' : wmgui.sid,
        link_url =
          wmgui.dd_addr_tpl +
          '/' +
          entype.toLowerCase() +
          '?q=' +
          entry +
          '&fmt=' +
          fmt +
          '&sid=' +
          link_sid +
          link_add +
          '&ed=' +
          wmgui.edition;

      a.setAttribute('href', link_url);
    });

    //(wmgui.mydata_history.indexOf(entry) == -1) ? $('#absolidize').addClass('wmbutton') : $('#absolidize').removeClass('wmbutton');

    if (launch_ext) launch_db_iframed(rank);
  }
}

async function open_sim_col(entry, entype, rank) {
  empty($$('#sim_col > ul, #sim_legend'));
  hide($$('.sim_col_ctx'));
  show($('#sim_col'));

  var cur_obj = { q: entry },
    allpurpose = [0, 1, 4, 9].indexOf(rank) !== -1;
  if (allpurpose) cur_obj.allpurpose = true;

  try {
    wmgui.quick_ajax.abort();
  } catch (e) {}

  show($('#sim_preloader'));
  const request = ajax({
    type: 'GET',
    url: wmgui.sim_endpoint,
    data: cur_obj,
  });
  wmgui.quick_ajax = request;

  let data;
  try {
    data = await request;
  } catch (error) {
    hide($('#sim_preloader'));
    if (!(error && error.aborted))
      wmgui.notify(
        'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
      );
    return;
  }
  hide($('#sim_preloader'));

  if (data.error) return wmgui.notify(data.error);
  var counter = 0,
    sim_html = '';

  if (allpurpose) {
    data.out.sim.forEach(function (row, k) {
      if (counter == 7) return;
      if (row[4])
        sim_html +=
          '<li><a href="#inquiry/' +
          param({
            elements: row[1],
            years: row[2],
            codens: row[3],
            classes: row[4] == 1 ? '' : row[4],
          }) +
          '">' +
          row[0] +
          '</a></li>';
      else
        sim_html +=
          '<li><a href="#inquiry/' +
          param({ formulae: row[1], years: row[2], codens: row[3] }) +
          '">' +
          row[0] +
          '</a></li>';
      counter++;
    });
  } else if (entype == 'C' || entype == 'S') {
    if (rank > 3) {
      data.out.sim.forEach(function (row, k) {
        if (counter == 8) return;
        sim_html +=
          '<li><a href="#phase_id/' + row[1] + '">' + row[0] + '</a></li>';
        counter++;
      });
      if (entype == 'C') show($('#pd_legend'));
      else if (counter == 1) counter = 0;
    }
  } else {
    // FIXME this is fragile
    // NB the selected (busy) entry is in the results (#databrowser), not in
    // #sim_col; like jQuery's .text(), a missing element gives ''
    var prop_el = wmgui.thumbed_display
        ? $('div.busy_entry > div.gallery_img > div')
        : $('tr.busy_entry > td.c2'),
      prop = (prop_el ? prop_el.textContent : '').split(';')[0];

    data.out.sim.forEach(function (row, k) {
      if (counter == 8) return;
      sim_html +=
        '<li><a href="#search/' +
        prop +
        ' ' +
        row[1] +
        '">' +
        row[0] +
        '</a></li>';
      counter++;
    });
  }

  if (counter) {
    $('#sim_legend').classList.remove('apparent');

    if (allpurpose)
      $('#sim_legend').textContent = 'Also studied by these authors:';
    else if (entype == 'C')
      $('#sim_legend').textContent = 'Phases at the diagram:';
    else if (entype == 'S')
      $('#sim_legend').textContent = 'The same prototype structures:';
    else $('#sim_legend').textContent = 'Similar ' + prop + ':';

    if (counter > 7) {
      //var link = (entype == 'C') ? '#entry/' + $('#entryno').text() : '#interlinkage/' + entry;
      $('#sim_trigger').setAttribute('href', '#interlinkage/' + entry);
      show($('#sim_trigger'));
    }
    set_html($('#sim_col > ul'), sim_html);
  } else {
    if (allpurpose) {
      $('#sim_legend').classList.add('apparent');
      $('#sim_legend').textContent = 'No cross-links found';
    } else if (entype == 'C' && rank == 3) {
      // FIXME this is fragile
      var els,
        html_3d = '';

      if (wmgui.thumbed_display) {
        els = $('div.busy_entry > div.gallery_img > p').textContent.split('-');
      } else {
        els = $('tr.busy_entry > td.c2')
          .textContent.replace('; ', '')
          .split(' ');
        els = els[els.length - 1].split('-');
      }
      if (els.length == 3 || els.length == 4)
        html_3d =
          '<br /><br /><a href="#inquiry/classes=' +
          (els.length == 3 ? 'prism' : 'tetrahedron') +
          '&props=phase%20diagram&elements=' +
          els.join('-') +
          '"><img alt="3d" src="' +
          wmgui.static_host +
          '/' +
          (els.length == 3 ? 'prism' : 'tetrahedron') +
          '.png" /><br /><span>3d phase diagram</span></a>';

      $('#sim_legend').classList.add('apparent');
      set_html(
        $('#sim_legend'),
        '<br /><a href="#entry/' +
          entry.split('-')[0] +
          '"><img alt="C-entry" src="' +
          wmgui.static_host +
          '/pd_thumbs/' +
          entry.split('-')[0] +
          '.png" /><br /><span>Full phase diagram</span></a>' +
          html_3d,
      );
    } else if (entype == 'C' && rank == 5) {
      $('#sim_legend').classList.add('apparent');
      $('#sim_legend').textContent = 'No links to other phases found.';
    } else if (entype == 'C' && rank == 12) {
      $('#sim_legend').classList.add('apparent');
      $('#sim_legend').textContent =
        'Hover the binary or ternary diagrams for more data.';
    } else if (entype == 'S') {
      $('#sim_legend').classList.add('apparent');
      $('#sim_legend').textContent =
        'No other structures for this prototype found.';
    } else {
      $('#sim_legend').classList.add('apparent');
      $('#sim_legend').textContent = 'No similar values found.';
    }
  }

  if (data.out.own.length && !wmgui.search.phid) {
    set_html(
      $('#own_phase'),
      '<a href="#phase_id/' +
        data.out.own[0][1] +
        '"><img alt="Phase" src="' +
        wmgui.static_host +
        '/rd_thumbs/' +
        data.out.own[0][0] +
        '.png" /><br /><span>Linked ' +
        (entype == 'S' ? 'distinct phase' : 'crystalline structure') +
        '</span></a>',
    );
    show($('#own_phase'));
  }
}

export function close_vibox() {
  const iframe = $('#iframe');
  if (iframe) {
    if (wmgui.thumbed_display)
      slide_up(iframe, 400, function () {
        iframe.remove();
      });
    else iframe.remove();
    hide($('#vibox'));
    return true;
  }
  return false;
}

export function launch_db_iframed(rank) {
  const that = $$('.busy_entry')[0];
  if (!that) return;

  var entry = that.id.substr(3),
    entype = entry.substr(0, 1),
    iframe_src,
    iframe_height;

  if (entype == 'S') {
    if (rank == 99) {
      ((iframe_src =
        wmgui.engines_addrs['visavis'] + wmgui.path_s_xrpd + entry),
        (iframe_height = 550));
    } else
      ((iframe_src =
        wmgui.engines_addrs['cifplayer'] + wmgui.path_s_entry + entry),
        (iframe_height = 650));
  } else if (entype == 'P') {
    if (rank == 1) {
      ((iframe_src =
        wmgui.engines_addrs['visavis'] + wmgui.path_pp_plot + entry),
        (iframe_height = 550));
      wmgui.notify('P-curves are in beta-testing');
    } else if (rank == 4)
      ((iframe_src =
        wmgui.engines_addrs['visavis'] + wmgui.path_sd_plot + entry),
        (iframe_height = 550));
    else if (rank == 9)
      ((iframe_src =
        wmgui.v_pd_user_addr +
        wmgui.api_host +
        '/download/p?fmt=png&q=' +
        entry),
        (iframe_height = 600));
    else if (rank == 10)
      ((iframe_src = wmgui.v_ab_vis_addr + entry), (iframe_height = 600));
    else return;
  } else {
    if (rank == 12) {
      var triple = wmgui.thumbed_display
        ? $('div.busy_entry > div.gallery_img > p').textContent
        : $('tr.busy_entry > td.c1').textContent.split(' ')[0];
      ((iframe_src = wmgui.v_pd_3d_addr + triple), (iframe_height = 550));
    } else if (rank == 6)
      ((iframe_src =
        (wmgui.sid
          ? wmgui.v_pd_user_addr + wmgui.api_host + '/download/c?fmt=png&q='
          : wmgui.engines_addrs['visavis'] + wmgui.path_c_entry) + entry),
        (iframe_height = 600));
    else return;

    if (wmgui.entries_messages[entry])
      wmgui.notify(wmgui.entries_messages[entry]);
  }

  if (wmgui.sid) iframe_src += '&sid=' + wmgui.sid;

  var iframe_html =
    '<iframe frameborder=0 scrolling="no" width="100%" height="' +
    iframe_height +
    '" src="' +
    iframe_src +
    '"></iframe>';
  if (wmgui.thumbed_display)
    iframe_html =
      '<div id="iframe" style="display:block;width:100%;border:1px solid #ddd;margin:10px 0;">' +
      iframe_html +
      '</div>';
  else
    iframe_html =
      '<tr id="iframe"><td colspan="20" style="width:100%;padding:0;border-right:1px solid #eee;border-left:1px solid #eee;">' +
      iframe_html +
      '</td></tr>';

  that.insertAdjacentHTML('afterend', iframe_html);
  window.scrollTo(0, position(that).top - 95);
}

export function start_visavis(plot_type) {
  destroy_numericbox();
  delete wmgui.search.numeric;
  if (plot_type) wmgui.visavis_curtype = plot_type;

  hide($$('div.ctxpanel'));
  const toshow = $('#ctxpanel_' + wmgui.visavis_curtype);
  if (toshow) show(toshow);
  if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) !== -1)
    show($('#cmppanel_plots'));

  if (wmgui.visavis_working) return manage_visavis();

  rebuild_visavis();

  // visavis_col preparation
  show($('#visavis_col'));
  show($('#visavis'));

  switch_control_mode(0, 11, 'a', 'e');
  document.body.classList.add('noscroll');

  wmgui.search_type = 0;
  wmgui.visavis_working = true;

  var cur_obj = { total_count: 1 };
  Object.assign(cur_obj, wmgui.search);

  try {
    document
      .getElementById('visavis_iframe')
      .contentWindow.location.replace(get_visavis_url(cur_obj));
  } catch (e) {
    console.error('No iframe access');
  }
}

function manage_visavis(callback_fn, param_a, param_b) {
  if (wmgui.visavis_terminating || !wmgui.visavis_working) {
    return false;
  }

  if (wmgui.search.numeric) {
    // not supported for plotting yet!
    wmgui.visavis_terminating = true;
    return false;
  }

  try {
    wmgui.active_ajax.abort();
  } catch (e) {}
  try {
    wmgui.quick_ajax.abort();
  } catch (e) {}

  rebuild_visavis();

  var cur_obj = { total_count: 1 };
  Object.assign(cur_obj, wmgui.search);

  try {
    document
      .getElementById('visavis_iframe')
      .contentWindow.location.replace(get_visavis_url(cur_obj));
  } catch (e) {
    console.error('No iframe access');
  }

  if (callback_fn) callback_fn(param_a, param_b);
  return true;
}

function rebuild_visavis() {
  var extr = window.location.hash.indexOf('search/');
  if (extr == -1) {
    var extr = window.location.hash.indexOf('inquiry/');
    if (extr == -1) return;
  }

  var query = window.location.hash.substr(extr);

  $$('a.pltcol_links').forEach(function (a) {
    var plot_type = a.getAttribute('rev');
    a.setAttribute(
      'href',
      wmgui.gui_host +
        window.location.pathname +
        '#plot/' +
        plot_type +
        '/' +
        query,
    );
  });

  $$('#visavis_col > ul > li').forEach(function (li) {
    li.classList.remove('embodied');
  });
  const pltchoice = $('#pltchoice_' + wmgui.visavis_curtype);
  if (pltchoice) pltchoice.classList.add('embodied');

  // ctx reset
  if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) !== -1)
    update_dc();

  if (wmgui.visavis_curtype == 'matrix') {
    $$('#ctxpanel_matrix > ul > li.embodied').forEach(function (li) {
      li.classList.remove('embodied');
    });
    $$('#ctxpanel_matrix > ul > li.ss_y').forEach(function (li) {
      li.classList.remove('ss_y');
    });
    $('#vismatrix_nump').classList.add('embodied'); // set the default sort order, also in Visavis: TODO
    remove($$('span.sops'));
  } else if (wmgui.visavis_curtype == 'cube') {
    $$('#ctxpanel_cube > ul > li.embodied').forEach(function (li) {
      li.classList.remove('embodied');
    });
    $$('#ctxpanel_cube > ul > li.ss_y').forEach(function (li) {
      li.classList.remove('ss_y');
    });
    $$('#ctxpanel_cube > ul > li.ss_z').forEach(function (li) {
      li.classList.remove('ss_z');
    });
    $('#viscube_nump').classList.add('embodied');
    remove($$('span.sops'));
  } else if (wmgui.visavis_curtype == 'graph') {
    $$('#ctxpanel_graph > ul > li.embodied').forEach(function (li) {
      li.classList.remove('embodied');
    });
    $('#visgraph_props').classList.add('embodied');
  }

  try {
    document
      .getElementById('visavis_iframe')
      .contentWindow.fixel_manage(
        wmgui.visavis_curtype == 'cube' && wmgui.search.elements,
      );
  } catch (e) {
    console.error('No iframe access');
  }
}

function stop_visavis() {
  hide($$('#visavis, #visavis_col'));
  wmgui.visavis_working = false;
  wmgui.visavis_terminating = false;
}

export function get_visavis_url(request, type, height) {
  if (wmgui.visavis_curtype == 'pie' && !type)
    return (
      wmgui.engines_addrs['visavis'] +
      '#' +
      wmgui.rfn_endpoint +
      '?q=' +
      encodeURIComponent(JSON.stringify(request))
    );

  var height_str = height ? '&visavis_height=' + height : '';

  return (
    wmgui.engines_addrs['visavis'] +
    '#' +
    wmgui.vis_endpoint +
    '/' +
    (type || wmgui.visavis_curtype) +
    '?q=' +
    encodeURIComponent(JSON.stringify(request)) +
    height_str
  );
}

export function describe_perms(perms) {
  var out_gui = '<h3>Web-browser access = GUI</h3><ul>',
    out_api = '<h3>Programmatic access = API</h3><ul>';

  if (perms.gui) {
    if (perms.gui.root) out_gui += '<li>complete access</li>';
    else {
      if (!Array.isArray(perms.gui)) perms.gui = [perms.gui];
      for (var m = 0; m < perms.gui.length; m++) {
        const ruleset = perms.gui[m];
        if (m > 3) {
          out_gui += '<li>and ' + (perms.gui.length - 4) + ' more...</li>';
          break;
        }
        wmgui.facets.forEach(function (item) {
          if (ruleset[item]) {
            try {
              out_gui +=
                '<li class="perms_view fct_' +
                item +
                '"><strong>' +
                wmgui.facet_names[item] +
                '</strong>: ' +
                ruleset[item]
                  .map(function (x) {
                    return x.replace(', ', ' &amp; ');
                  })
                  .join(', ') +
                '</li>';
            } catch (e) {}
          }
        });
        if (ruleset.refs == 'ALL')
          out_gui += '<li>full access to reference details</li>';
        else if (ruleset.refs == 'MENTIONED')
          out_gui += '<li>access to corresponding references</li>';
        else out_gui += '<li>no access to reference details</li>';
        out_gui += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
      }
    }
  } else out_gui += '<li>only open data</li>';

  if (perms.api) {
    if (perms.api.root) out_api += '<li>complete access</li>';
    else if (perms.api.disabled)
      out_api += '<li>disabled &mdash; please check on the other device</li>';
    else {
      if (!Array.isArray(perms.api)) perms.api = [perms.api];
      for (var m = 0; m < perms.api.length; m++) {
        const ruleset = perms.api[m];
        if (m > 3) {
          out_api += '<li>and ' + (perms.api.length - 4) + ' more...</li>';
          break;
        }
        wmgui.facets.forEach(function (item) {
          if (ruleset[item]) {
            try {
              out_api +=
                '<li class="perms_view fct_' +
                item +
                '"><strong>' +
                wmgui.facet_names[item] +
                '</strong>: ' +
                ruleset[item]
                  .map(function (x) {
                    return x.replace(', ', ' &amp; ');
                  })
                  .join(', ') +
                '</li>';
            } catch (e) {}
          }
        });
        out_api += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
      }
    }
  } else out_api += '<li>only open data</li>';

  return out_gui + '</ul><div class="divider"></div>' + out_api + '</ul>';
}

export function show_advsbox() {
  hide($$('div.modal'));
  show($$('#advsbox, #overlay'));

  // show typed terms
  if (!is_empty(wmgui.search)) {
    wmgui.simple_facets.forEach(function (item) {
      if (wmgui.search[item]) {
        var value = wmgui.search[item];

        if (item == 'codens') value = wmgui.journal_converter.c2j(value);
        else if (item == 'doi') value = value.replaceAll('%2F', '/');

        $('#advs_fct_' + item).value = decodeURIComponent(
          value.replace(/\+/g, '%20'),
        );
      } else $('#advs_fct_' + item).value = '';
    });

    wmgui.multi_facets.forEach(function (item) {
      const rest_input = $('#advs_fct_' + item + '-selectized');
      if (rest_input) rest_input.value = '';
      wmgui.multiselects[item].clear();

      if (wmgui.search[item]) {
        var obj = {};
        obj[item] = wmgui.search[item];
        wmgui.multiselects[item].write(obj);
        //wmgui.multiselects[item].write({[item]: wmgui.search[item]});
        if (item == 'aetypes')
          show_aetmap(wmgui.search[item].split(',').pop().trim());
      }
    });
  }
  if (!show_aetmap.cached_aetmap) {
    show_aetmap.cached_aetmap = new Image();
    show_aetmap.cached_aetmap.src = wmgui.aetmap_addr;
  }
}

export function show_hints(disabled, res_count) {
  //$('#fdwidget').html('Were you satisfied with the data quality? Did everything work as expected? <span id="fdwidget_yes">Yes</span><span id="fdwidget_no">No</span>').show();

  if (
    disabled ||
    wmgui.search.numeric ||
    wmgui.search.doi ||
    wmgui.search.phid ||
    wmgui.search.bid ||
    wmgui.fuzzyout ||
    wmgui.search_type == 2
  )
    return;

  var cur_obj = {};
  Object.assign(cur_obj, wmgui.search);
  delete cur_obj.ignored;
  delete cur_obj.search_type;

  var hint = JSON.stringify(cur_obj)
    .replaceAll(' ', '+')
    .replace('\{', '\\{')
    .replace('\}', '\\}');
  set_html($('#apihint kbd'), hint);
  show($('#apihint'));

  if (wmgui.search_type === 0 && (res_count > 3 || res_count === undefined)) {
    $$('a.plthint_links').forEach(function (a) {
      var plot_type = a.getAttribute('rev');
      a.setAttribute(
        'href',
        wmgui.gui_host +
          window.location.pathname +
          '#plot/' +
          plot_type +
          '/' +
          window.location.hash.substr(1),
      );
    });
    show($('#plthint'));
  }
}

export function show_tooltip(info, forced) {
  if (
    info.view_mode != wmgui.view_mode ||
    (wmgui.visavis_working && !forced) ||
    $$('.modal').some(isVisible)
  )
    return;

  var ref = position($('#' + info.el)),
    tooltip_el = document.getElementById('tooltip');

  tooltip_el.style.left = ref.left + info.oleft + 'px';
  tooltip_el.style.top = ref.top + info.otop + 'px';
  tooltip_el.firstChild.innerHTML = info.text;
  document.getElementById('tooltip').style.display = 'block';
}

export function show_modal(which) {
  if (which == 'login') {
    if ($('#factor_by_email').value)
      $('#login_email').value = $('#factor_by_email').value;
    else $('#login_email').value = '';

    $('#login_password').value = '';
    show($('#loginbox'));
    $('#login_email').focus();

    // for OAuth linking redirect only
    // see email_chain.html
    var u_email =
      window.localStorage.getItem(wmgui.store_oauth_email_key) || false;
    if (u_email) {
      $('#login_email').value = u_email;
      window.localStorage.removeItem(wmgui.store_oauth_email_key);
    }
  } else if (which == 'factor') {
    if ($('#login_email').value)
      $('#factor_by_email').value = $('#login_email').value;
    else $('#factor_by_email').value = '';

    show($('#factorbox'));
    $('#factor_by_email').focus();
  } else if (which == 'restore') {
    if ($('#login_email').value)
      $('#restore_by_email').value = $('#login_email').value;
    else $('#restore_by_email').value = '';

    show($('#restorebox'));
    $('#restore_by_email').focus();
  }
}

export function init_user_login() {
  // to prevent re-execution
  var locals = JSON.parse(
    window.localStorage.getItem(wmgui.store_user_key) || '{}',
  );
  if (locals.sid === wmgui.sid) return;

  if (!locals.ipbased && locals.sid && locals.name && locals.acclogin) {
    user_login(
      locals.sid,
      locals.name,
      locals.acclogin,
      locals.admin,
      locals.oauths,
      false,
    );
  } else {
    // attempt IP-based login
    ajax({
      type: 'POST',
      url: wmgui.ip_endpoint,
    })
      .then(function (data) {
        if (data.sid && data.name && data.acclogin)
          user_login(
            data.sid,
            data.name,
            data.acclogin,
            data.admin,
            data.oauths,
            true,
          );
      })
      .catch(function () {});
  }
}

export function user_login(sid, name, acclogin, admin, oauths, ipbased) {
  var corner_name = name.length > 40 ? name.substr(0, 37) + '&hellip;' : name;
  set_html($('#auth_user'), corner_name);
  set_html($('#account_holder_name'), 'Hello ' + name + ' &#x1f44d;');
  set_html(
    $('#account_holder_acclogin > span'),
    ipbased
      ? 'location-based'
      : '<a href="mailto:' + acclogin + '">' + acclogin + '</a>',
  );

  wmgui.sid = sid;
  wmgui.oauths = oauths;

  hide($$('div.logged_out'));
  show($$('div.logged_in'));
  hide($('#account_pass_change'));

  window.localStorage.setItem(
    wmgui.store_user_key,
    JSON.stringify({
      sid: sid,
      name: name,
      acclogin: acclogin,
      admin: admin,
      ipbased: ipbased,
    }),
  ); // TODO? oauths: oauths

  if (admin && (wmgui.edition == 0 || wmgui.edition == 1)) show($$('li.admin'));
  else hide($$('li.admin'));

  if (ipbased) {
    hide($$('.only_regular'));
    $('#logout_trigger').classList.add('disabled');
    $('#accpass_trigger').textContent = 'disabled';
    $('#accpass_trigger').classList.add('disabled');
  } else {
    show($$('.only_regular'));
    $('#logout_trigger').classList.remove('disabled');
    $('#accpass_trigger').textContent = 'change';
    $('#accpass_trigger').classList.remove('disabled');
  }

  try {
    document.getElementById('visavis_iframe').contentWindow.location.reload();
  } catch (e) {
    console.error('No iframe access');
  }
  communicate_windows('tab_user_login');

  wmgui.notify('Logged in as ' + name);

  // One-off redirection
  var redir = window.localStorage.getItem(wmgui.store_redir_key);
  if (redir) {
    window.localStorage.removeItem(wmgui.store_redir_key);
    return window.location.replace(redir); // FIXME? replace vs. href
  }
}

export function tab_user_login() {
  // to prevent re-execution
  var locals = JSON.parse(
    window.localStorage.getItem(wmgui.store_user_key) || '{}',
  );
  if (locals.sid === wmgui.sid) return;

  window.location.reload();
}

export function user_logout(silent) {
  if (!wmgui.sid) return;

  wmgui.sid = null;
  wmgui.oauths = null;
  hide($$('li.admin'));
  hide($$('div.logged_in'));
  show($$('div.logged_out'));

  window.localStorage.removeItem(wmgui.store_user_key);

  try {
    document.getElementById('visavis_iframe').contentWindow.location.reload();
  } catch (e) {
    console.error('No iframe access');
  }
  communicate_windows('user_logout');

  if (!silent) wmgui.notify('You are logged out');
}

export function force_relogin(show_msg) {
  ajax({
    type: 'POST',
    url: wmgui.logout_endpoint,
    data: { sid: wmgui.sid },
  })
    .then(function () {})
    .catch(function () {});
  user_logout(true);
  window.location.replace('#modal/login');
  if (show_msg) wmgui.notify(show_msg);
}

function communicate_windows(runnable_name) {
  // NB the active window doesn't receive a storage event
  window.localStorage.setItem(wmgui.store_comm_exec_key, runnable_name);
  setTimeout(function () {
    window.localStorage.removeItem(wmgui.store_comm_exec_key);
  }, 0);
}

function reset_factor_form() {
  document.getElementById('factor_trigger').style.display = 'block';
  document.getElementById('factor_form_step_one').style.display = 'block';
  document.getElementById('factor_form_step_two').style.display = 'none';
  var resps = document.getElementsByClassName('factor_form_resp');
  for (var i = 0; i < resps.length; i++) {
    resps[i].value = '';
  }
}

export function submit_factor_form_resp() {
  var result = '';
  var resps = document.getElementsByClassName('factor_form_resp');
  for (var i = 0; i < resps.length; i++) {
    result += resps[i].value;
  }
  if (result.length !== 6 || !Number.isInteger(parseInt(result))) return false;

  ajax({
    type: 'POST',
    url: wmgui.factor_v_endpoint,
    data: { a: result, ed: wmgui.edition },
  })
    .then(function (data) {
      if (data.error) return wmgui.notify(data.error);
      if (!data.sid || !data.name || !data.acclogin) {
        window.location.replace('#start');
        return wmgui.notify(
          'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
        );
      }
      user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);

      reset_factor_form();

      $('#userbox').click();
    })
    .catch(function () {});
}

function update_dc() {
  var title = [],
    orepr = {};
  for (var key in wmgui.search) {
    if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
    orepr[key] = wmgui.search[key];
    title.push(wmgui.search[key]);
  }
  title = title.join(' ');

  var count = 0,
    cur_str = JSON.stringify(orepr),
    cmp_html = '<option value="X" selected>To last searches...</option>';

  JSON.parse(
    window.localStorage.getItem(wmgui.store_history_key) || '[]',
  ).forEach(function (past) {
    if (count > 6) return;

    var past_title = [],
      past_str = JSON.stringify(past);
    if (cur_str == past_str) return;

    for (var prop in past) {
      past_title.push(past[prop]);
    }
    past_title = past_title.join(' ');
    cmp_html +=
      '<option value="' +
      encodeURIComponent(past_str) +
      '">' +
      past_title +
      '</option>';
    count++;
  });
  cmp_html += '<option value="Y">No comparison</option>';
  const select_cmp = $('#select_cmp_trigger');
  select_cmp.innerHTML = '';
  select_cmp.insertAdjacentHTML('beforeend', cmp_html);
}

export function show_aetmap(term) {
  var coords = wmgui.aets[term];
  if (coords) {
    const aetmap = $('#aetmap');
    aetmap.style.height = coords[1] + 'px';
    aetmap.style.background =
      'url(' + wmgui.aetmap_addr + ') 0 -' + coords[0] + 'px no-repeat';
    show(aetmap);
  } else hide($('#aetmap'));
}

export function render_all_polyhedra() {
  const content = $('#all_polyhedra_content');
  if (content.firstChild) return;
  var aetypes_html = '',
    defined_aetypes = Object.keys(wmgui.aets);
  defined_aetypes.sort(function (a, b) {
    var partsa = a.split('-vertex')[0].split(' '),
      va = parseInt(partsa[partsa.length - 1]),
      partsb = b.split('-vertex')[0].split(' '),
      vb = parseInt(partsb[partsb.length - 1]);
    return va > vb
      ? 1
      : va < vb
        ? -1
        : a.length > b.length
          ? 1
          : a.length < b.length
            ? -1
            : 0;
  });
  defined_aetypes.forEach(function (value) {
    var coords = wmgui.aets[value];
    aetypes_html +=
      '<div class="gallery_item" rel="' +
      value +
      '"><div style="width:125px;height:' +
      coords[1] +
      'px;margin:10px auto;background:url(' +
      wmgui.aetmap_addr +
      ') 0 -' +
      coords[0] +
      'px no-repeat;"></div><span>' +
      value +
      '</span></div>';
  });
  set_html(content, aetypes_html);
}

function show_dunit_info(phid, bid, entry) {
  if (phid) {
    set_html($('#ind_title'), 'Phase ' + phid);
    const ind_link = $('#ind_link');
    ind_link.setAttribute('href', 'https://mpds.io/phase_id/' + phid);
    set_html(ind_link, 'www.mpds.io/phase_id/' + phid);
  } else if (bid) {
    set_html($('#ind_title'), 'Publication B' + bid);
    const ind_link = $('#ind_link');
    ind_link.setAttribute('href', 'https://mpds.io/article/' + bid);
    set_html(ind_link, 'www.mpds.io/article/' + bid);
  } else if (entry) {
    set_html($('#ind_title'), 'Entry ' + entry);
    const ind_link = $('#ind_link');
    ind_link.setAttribute('href', 'https://mpds.io/entry/' + entry);
    set_html(ind_link, 'www.mpds.io/entry/' + entry);
  }

  hide($$('#refine_col, #ctx_col'));
  empty($$('#phase_info, #ind_col > span'));

  if (phid) {
    set_html(
      $('#ind_col > span'),
      '<img src="' + wmgui.static_host + '/phid_thumbs/' + phid + '.png" />',
    );

    wmgui.show_preloader();
    const request = ajax({
      type: 'GET',
      url: wmgui.phase_endpoint,
      data: { phid: phid },
    });
    wmgui.active_ajax = request;

    request
      .then(function (data) {
        wmgui.hide_preloader();
        if (data.error) return wmgui.notify(data.error);

        var html =
          '<h4>' +
          data.out.formula_html.split(' ')[0] +
          ' ' +
          (data.out.spg || '?') +
          ' ' +
          (data.out.pearson || '&mdash;') +
          '</h4>';

        if (data.out.mpid)
          html +=
            '<h4 style="background:#ddd;margin-top:-7px;">Materials Project <a target="_blank" href="https://materialsproject.org/materials/mp-' +
            data.out.mpid +
            '">mp-' +
            data.out.mpid +
            '</a></h4>';

        html += '<p>';
        if (data.out.articles_count)
          html +=
            'This phase was reported in ' +
            data.out.articles_count +
            ' article' +
            (data.out.articles_count > 1 ? 's' : '') +
            '.';
        if (data.out.sim_count > 1)
          html +=
            ' There are <a href="#interlinkage/' +
            phid +
            '">' +
            data.out.sim_count +
            ' structurally similar phases</a> from other articles.';
        html += '</p>';

        set_html($('#phase_info'), html);
        show($('#dtypes_phid'));
      })
      .catch(function (error) {
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify('Sorry, a network error occured. Please, try again');
      });
  } else if (bid) {
    set_html($('#ind_col > span'), '<strong>&#x1f4d6;</strong>'); // book icon
    set_html(
      $('#phase_info'),
      '<h4>Ref. ' +
        bid +
        '</h4><p>Please make sure you are<br /><a target="_blank" href="#modal/menu">logged in</a> to see all the details.</p>',
    );

    wmgui.show_preloader();
    const request = ajax({
      type: 'GET',
      url:
        wmgui.refs_endpoint +
        '?noredir=1&fmt=bib&ref_id=' +
        bid +
        '&sid=' +
        wmgui.sid,
      dataType: 'text',
    });
    wmgui.active_ajax = request;

    request
      .then(function (data) {
        wmgui.hide_preloader();
        var citation = wmgui.parse_bib(data),
          citation_html = '',
          main_author = '',
          links_html = '';

        if (citation[0].length) {
          citation[0].split(',').forEach(function (item, index) {
            var author_name = item.trim().split('.')[0];
            author_name = author_name
              .substr(0, author_name.length - 2)
              .replace("'", '');
            if (index === 0) main_author = author_name;
            links_html +=
              '<a href="#inquiry/authors=' +
              author_name +
              '" style="color:#777;border-bottom-color:#777;">' +
              author_name +
              '</a> or ';
          });
          links_html = links_html.substr(0, links_html.length - 4); // " or "
          if (citation[0].indexOf(',') !== -1) main_author += ' et al.';
          citation_html +=
            ' <a href="' +
            wmgui.refs_endpoint +
            '?fmt=bib&ref_id=' +
            bid +
            '&sid=' +
            wmgui.sid +
            '">' +
            main_author +
            ', ' +
            citation[1] +
            '. ' +
            citation[2] +
            ' <i>(' +
            citation[3] +
            ')</i></a>';
        }

        if (bid == 999999) {
          set_html(
            $('#phase_info'),
            '<h4>In-house data</h4><p>These data were generated automatically on the MPDS platform based on the original peer-reviewed Pauling File data. Please cite as ' +
              citation_html +
              '.</p>',
          );
        } else {
          var n_entries = wmgui.thumbed_display
            ? $$('div.gallery_item').length
            : $$('tr.tcell').length;
          if (n_entries == 1000) n_entries = 'more than ' + n_entries;
          set_html(
            $('#phase_info'),
            '<h4>Ref. ' +
              bid +
              '</h4><p>We have ' +
              (n_entries == 1 ? 'one entry' : n_entries + ' entries') +
              ' from this reference' +
              citation_html +
              '.</p>' +
              (links_html.length
                ? '<p>Retrieve all data co-authored by ' + links_html + '.</p>'
                : ''),
          );
        }
      })
      .catch(function () {
        wmgui.hide_preloader();
      });
  } else {
    set_html($('#ind_col > span'), '<strong>&#x1f52c;</strong>'); // microscope icon
  }

  show($('#ind_col'));
  hide($('#dtypes'));
}

export function assign_edition() {
  function run_edition(edition_key) {
    edition_key = parseInt(edition_key);
    if (!wmgui.editions[edition_key]) edition_key = 0;
    wmgui.edition = edition_key;
    if (wmgui.editions[edition_key].css)
      wmgui.loadCSS(wmgui.editions[edition_key].css);
    if (wmgui.editions[edition_key].actions)
      wmgui.editions[edition_key].actions();
  }

  for (var key in wmgui.editions) {
    if (
      wmgui.gui_host == wmgui.editions[key]['prod_url'] ||
      wmgui.gui_host == wmgui.editions[key]['dev_url']
    ) {
      run_edition(key);
      break;
    }
  }

  // for any unknown domain, ICDD MPDS is assumed
  if (!wmgui.edition) run_edition(0);

  // for any third-party integrations, id="mpds_native" should not be used
  wmgui.mpds_native = !!document.getElementById('mpds_native');
}
