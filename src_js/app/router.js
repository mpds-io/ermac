/**
 * Ermac hash-based router: the url__<route>() functions.
 * Dispatch happens via an explicit route registry instead of the old window globals.
 */

import wmgui from '../core/settings.js';
import { wmutils } from '../core/utils.js';
import { $, $$, show, hide, set_html, set_val } from '../core/dom.js';
import { ajax } from '../core/ajax.js';
import {
  switch_view_mode,
  show_interpretation,
  request_search,
  show_tooltip,
  show_modal,
  arrange_menu_collateral,
  user_login,
  force_relogin,
  describe_perms,
  start_visavis,
  render_all_polyhedra,
} from './search.js';

export function url_redraw_react() {
  var anchors = window.location.hash.substr(1).split('/');

  if (!anchors.length) return;
  hide($$('#overlay, #aetmap, #dtypes_phid, div.modal, div.menu_collateral'));
  $$('#dtypes_phid > ul > li').forEach(function (li) {
    li.classList.remove('active');
  });

  try {
    wmgui.active_ajax.abort();
  } catch (e) {}
  try {
    wmgui.quick_ajax.abort();
  } catch (e) {}

  const route = routes[anchors[0]];
  if (route) route(anchors.slice(1).join('/'));
  else wmgui.notify('Sorry, unknown route requested');
}

/**
 * The main landing route /#start
 */
function url__start(arg) {
  switch_view_mode(1);
  if (wmgui.tooltip_counter < 2)
    setTimeout(function () {
      show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]);
    }, 4000);
}

/**
 * A free-form fuzzy search /#search/arg
 * given by the OptimadeNLP wmutils
 */
function url__search(arg, no_sync) {
  var query = decodeURIComponent(arg),
    parsed = wmutils.guess(query);
  //console.log(parsed);

  if (parsed.numeric) wmgui.search_type = 1;

  show_interpretation(parsed);
  delete parsed.ignored;

  const main_input = $('#search_field-selectized');
  if (main_input) main_input.value = '';
  wmgui.multiselects['main'].clear();
  wmgui.multiselects['main'].write(parsed);

  wmgui.search = parsed;
  parsed.search_type = wmgui.search_type;

  if (!no_sync) request_search(parsed, query, wmgui.search_type);
}

/**
 * The parameters-based exact search /#inquiry/arg
 */
function url__inquiry(arg, no_sync) {
  var inquiry = arg.split('&').map(
    function (n) {
      return ((n = n.split('=')), (this[n[0]] = n[1]), this);
    }.bind({}),
  )[0];

  wmgui.facets.forEach(function (item) {
    if (inquiry[item])
      inquiry[item] = decodeURIComponent(inquiry[item].replaceAll('+', ' '));
  });

  // re-inventing serialization for numeric nested arrays
  if (inquiry.numeric) {
    inquiry.numeric = decodeURIComponent(inquiry.numeric)
      .split(';')
      .map(function (item) {
        return item.split(',');
      });
    inquiry.numeric = inquiry.numeric.filter(function (item) {
      return item.length == 3;
    });
    wmgui.search_type = 1; // force phases search type
  }
  //console.log(inquiry);

  show_interpretation(inquiry);
  delete inquiry.ignored;

  var caption_items = [];
  for (var k in inquiry) {
    caption_items.push(inquiry[k]);
  }

  const main_input = $('#search_field-selectized');
  if (main_input) main_input.value = '';
  wmgui.multiselects['main'].clear();
  wmgui.multiselects['main'].write(inquiry);

  wmgui.search = inquiry;
  inquiry.search_type = wmgui.search_type;

  if (!no_sync)
    request_search(
      inquiry,
      caption_items.join(' ').replaceAll(',', ' '),
      wmgui.search_type,
    );
}

/**
 * The 3 brothers routing exact search into the search_type (TODO?)
 */
function url__inquiry_entries(arg) {
  wmgui.search_type = 0;
  return url__inquiry(arg);
}
function url__inquiry_phases(arg) {
  wmgui.search_type = 1;
  return url__inquiry(arg);
}
function url__inquiry_articles(arg) {
  wmgui.search_type = 2;
  return url__inquiry(arg);
}

/**
 * The plotting subsystem (Vis-a-vis) /#plot/arg
 */
function url__plot(arg) {
  var q = arg.split('/'),
    plot_type = q[0],
    search_verb = q[1],
    query = q[2];

  if (!plot_type || !search_verb || !query)
    return wmgui.notify('Sorry, unknown route: ' + arg);

  if (search_verb == 'search') url__search(query, true);
  else if (search_verb == 'inquiry') url__inquiry(query, true);
  else return wmgui.notify('Sorry, unknown route: ' + arg);

  wmgui.visavis_curtype = plot_type;

  //if (wmgui.view_mode == 1)
  switch_view_mode(2);

  setTimeout(function () {
    start_visavis(plot_type);
  }, 0);

  if (
    wmgui.tooltip_counter < 2 &&
    (plot_type == 'matrix' || plot_type == 'cube')
  ) {
    setTimeout(function () {
      show_tooltip(wmgui.tooltips['ss_axes'], true);
    }, 3000);
  }
}

/**
 * The individual entry display /#entry/ID
 */
function url__entry(arg) {
  wmgui.search_type = 0;
  wmgui.visavis_terminating = true;
  request_search({ entry: arg }, 'entry ' + arg, true);
  wmgui.search = {}; // mockup to reset previous properties
  wmgui.passive_sim_col = true;
  const main_input = $('#search_field-selectized');
  if (main_input) main_input.value = '';
  wmgui.multiselects['main'].clear();
  show_interpretation();
}

/**
 * The individual phase display /#phase_id/integer
 */
function url__phase_id(arg) {
  wmgui.search_type = 0;
  if (!wmgui.ptable.visible) {
    const main_input = $('#search_field-selectized');
    if (main_input) main_input.value = '';
    wmgui.multiselects['main'].clear();
  }
  show_interpretation();
  var phid = parseInt(arg);
  wmgui.search = { phid: phid };
  wmgui.search.search_type = wmgui.search_type;
  request_search({ phid: phid }, 'phase ' + phid, true);
}

/**
 * The individual phase display /#phase/ID
 */
function url__phase(arg) {
  var phase_data = arg.split('/'),
    formula = phase_data[0],
    spg = phase_data[1],
    pearson = phase_data[2];

  if (formula && spg && pearson) {
    wmgui.show_preloader();
    const request = ajax({
      type: 'GET',
      url: wmgui.phph_endpoint,
      data: { phase: [formula, spg, pearson].join('/') },
    });
    wmgui.active_ajax = request;

    request
      .then(function (data) {
        wmgui.hide_preloader();
        if (data.error) return wmgui.notify(data.error);
        window.location.replace('#phase_id/' + data.phid);
      })
      .catch(function (error) {
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify('Sorry, a network error occured. Please, try again');
      });
  } else return wmgui.notify('Sorry, wrong phase given');
}

/**
 * The individual B-entry display /#article/integer
 */
function url__article(arg) {
  wmgui.search_type = 0;
  const main_input = $('#search_field-selectized');
  if (main_input) main_input.value = '';
  wmgui.multiselects['main'].clear();
  show_interpretation();
  var bentry = parseInt(arg);
  wmgui.search = { bid: bentry };
  wmgui.search.search_type = wmgui.search_type;
  request_search({ bid: bentry }, 'B' + bentry, true);
}

/**
 * The display of menu with all the physical props
 */
function url__hierarchy() {
  document.body.classList.remove('noscroll');
  show($('#overlay'));
  window.scrollTo(0, 0);
  show($('#hy_box'));
}

/**
 * The different types of modal windows
 */
function url__modal(arg) {
  //var url_params = new URLSearchParams(window.location.search),
  //    redir = url_params.get('redir');

  if (arg == 'login') {
    if (wmgui.sid) return window.location.replace('#modal/menu');

    // edition-based OAuth login (mpdsgui only)
    if (wmgui.edition == 1) {
      return window.location.replace('oauth/asm.html'); // NB history replacement
    }
    show_modal(arg);
  } else if (arg == 'restore' || arg == 'factor') {
    if (wmgui.sid) return window.location.replace('#modal/menu');
    show_modal(arg);
  } else if (arg == 'menu') {
    if (!wmgui.sid) return window.location.replace('#modal/login');
    set_val($('#new_password_1'), '');
    set_val($('#new_password_2'), '');
    arrange_menu_collateral();
    show($$('#menubox, div.menu_collateral'));
  } else return wmgui.notify('Sorry, unknown modal window');

  show($('#overlay'));
}

/**
 * Retrieving the access via email by the secret link
 */
function url__access(arg) {
  ajax({
    type: 'POST',
    url: wmgui.access_endpoint,
    data: { a: arg, ed: wmgui.edition },
  })
    .then(function (data) {
      if (data.error) {
        window.location.replace('#start');
        return wmgui.notify(data.error);
      }
      if (!data.sid || !data.name || !data.acclogin) {
        window.location.replace('#start');
        return wmgui.notify(
          'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
        );
      }
      user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
      window.location.replace('#start');
    })
    .catch(function () {
      window.location.replace('#start');
      return wmgui.notify('Sorry, a network error occured. Please, try again');
    });
}

/**
 * Confirming the access via email by the secret link
 */
function url__ratify(arg) {
  ajax({
    type: 'POST',
    url: wmgui.ratify_endpoint,
    data: { a: arg, ed: wmgui.edition },
  })
    .then(function (data) {
      if (data.error) {
        window.location.replace('#start');
        return wmgui.notify(data.error);
      }
      if (!data.sid || !data.name || !data.acclogin) {
        window.location.replace('#start');
        return wmgui.notify(
          'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
        );
      }
      user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
      window.location.replace('#modal/menu');
    })
    .catch(function () {
      window.location.replace('#start');
      return wmgui.notify('Sorry, a network error occured. Please, try again');
    });
}

/**
 * A special display of the related entries
 */
function url__interlinkage(arg) {
  wmgui.search_type = 1;
  request_search({ interlinkage: arg }, 'linked phases for ' + arg, true);
  wmgui.search = { numeric: true }; // mockup FIXME?
  //$('#search_field-selectized').val('');
  //wmgui.multiselects['main'].clear();
  show_interpretation();
}

/**
 * All polyhedra menu
 */
function url__polyhedra(arg) {
  document.body.classList.remove('noscroll');
  show($('#overlay'));
  window.scrollTo(0, 0);
  render_all_polyhedra();
  show($('#all_polyhedra_box'));
}

/**
 * Access denied route: trying to identify the reason
 */
function url__junction(arg) {
  if (!wmgui.sid) return window.location.replace('#products');

  var locals = JSON.parse(
    window.localStorage.getItem(wmgui.store_user_key) || '{}',
  );

  wmgui.show_preloader();
  const request = ajax({
    type: 'POST',
    url: locals.ipbased ? wmgui.ip_perms_endpoint : wmgui.perms_endpoint,
    data: { sid: wmgui.sid },
  });
  wmgui.active_ajax = request;

  request
    .then(function (data) {
      wmgui.hide_preloader();

      if (data.error) return wmgui.notify(data.error);

      if (!data.hasOwnProperty('gui') || !data.hasOwnProperty('api'))
        return force_relogin('Please, re-login');

      window.location.replace('#modal/menu');
      $$('#tab_links > li').forEach(function (li) {
        li.classList.remove('working');
      });
      $$('#tab_links > li[rev=usr_tab_perms]').forEach(function (li) {
        li.classList.add('working');
      });
      hide($$('div.menu_tabs'));
      show($('#usr_tab_perms'));
      set_html($('#perms_view'), describe_perms(data));
      setTimeout(function () {
        wmgui.notify('Please, check your data access.');
      }, 1500);
    })
    .catch(function (error) {
      wmgui.hide_preloader();
      if (!(error && error.aborted)) return force_relogin('Please, re-login');
    });
}

/**
 * Moved from mpdsgui
 */
function url__products(arg) {
  if (!wmgui.mpds_native)
    window.location.href = wmgui.static_host + '/#products';

  if (wmgui.edition === 1) {
    // NB no history replacement and no new windows
    window.location.href =
      'https://www.asminternational.org/asm-materials-platform-for-data-science-api';
  } else {
    show($('#overlay'));
    window.scrollTo(0, 0);
    show($('#productbox'));
  }
}

/**
 * Moved from mpdsgui
 */
function url__formal(arg) {
  if (!wmgui.mpds_native)
    window.location.href = wmgui.static_host + '/#formal/' + arg;

  var header = '',
    addr = '';

  if (arg == 'terms')
    ((header = 'Website Terms &amp; Conditions'), (addr = '/terms.json'));
  else if (arg == 'api')
    ((header = 'MPDS API Terms &amp; Conditions'), (addr = '/api.json'));
  else if (arg == 'usfed')
    ((header = 'Procurement Details'), (addr = '/usfed.json'));
  else if (arg == 'refunds')
    ((header = 'Refund Policy'), (addr = '/refunds.json'));
  else if (arg == 'privacy')
    ((header = 'Privacy Policy'), (addr = '/privacy.json'));
  else return wmgui.notify('Sorry, unknown document requested');

  wmgui.show_preloader();

  $$('#formalbox_navi > ul > li').forEach(function (li) {
    li.classList.remove('working');
  });
  $$('a[href="#formal/' + arg + '"]').forEach(function (a) {
    a.parentNode.classList.add('working');
  });

  const request = ajax({
    url: addr,
    type: 'GET',
    data: { nocache: Math.floor(Math.random() * 1000) },
  });
  request
    .then(function (answer) {
      wmgui.hide_preloader();
      var html = '<h2>' + header + '</h2>';
      answer.forEach(function (value, n) {
        html +=
          '<strong>&sect;' +
          (n + 1) +
          '. ' +
          value.header +
          '</strong><p>' +
          value.content +
          '</p>';
      });
      set_html($('#formalbox_content'), html);
      show($$('#formalbox, #overlay'));
      window.scrollTo(0, 0);
      wmgui.hide_preloader();
    })
    .catch(function () {
      wmgui.hide_preloader();
    });
}

const routes = {
  start: url__start,
  search: url__search,
  inquiry: url__inquiry,
  inquiry_entries: url__inquiry_entries,
  inquiry_phases: url__inquiry_phases,
  inquiry_articles: url__inquiry_articles,
  plot: url__plot,
  entry: url__entry,
  phase_id: url__phase_id,
  phase: url__phase,
  article: url__article,
  hierarchy: url__hierarchy,
  modal: url__modal,
  access: url__access,
  ratify: url__ratify,
  interlinkage: url__interlinkage,
  polyhedra: url__polyhedra,
  junction: url__junction,
  products: url__products,
  formal: url__formal,
};
