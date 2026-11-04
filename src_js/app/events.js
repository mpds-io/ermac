/**
 * Ermac event wiring: register_events() binds all DOM listeners.
 */

import wmgui from '../core/settings.js';
import { a11y_context_opened, a11y_context_closed } from '../core/a11y.js';
import { wmutils } from '../core/utils.js';
import {
  $,
  $$,
  show,
  hide,
  toggle_display,
  set_html,
  append_html,
  after_html,
  empty,
  remove,
  isVisible,
  on,
  position,
  offset,
  scroll_top,
  window_height,
  data,
  fade_out,
  slide_up,
  slide_down,
} from '../core/dom.js';
import { ajax, is_empty } from '../core/ajax.js';
import {
  create_floating_slider,
  destroy_numericbox,
  serialize_numeric,
  inquiry_param,
} from '../components/sliders.js';
import {
  select_ptable_el,
  select_ptable_series,
  ajax_download,
  render_left,
} from './ptable.js';
import {
  request_search,
  re_view_request,
  show_advsbox,
  show_aetmap,
  show_tooltip,
  show_hints,
  open_context,
  close_vibox,
  launch_db_iframed,
  build_cells,
  build_thumbs,
  update_databrowser_sort,
  user_login,
  user_logout,
  force_relogin,
  tab_user_login,
  submit_factor_form_resp,
  describe_perms,
  get_visavis_url,
} from './search.js';
import { url_redraw_react } from './router.js';

export function register_events() {
  document
    .querySelector('#ptable_area > ul')
    .addEventListener('click', function (event) {
      var that = event.target;
      if (!that.hasAttribute || !that.hasAttribute('data-pos')) return;

      wmgui.ptable.update_selectize = true;
      var selected_el = wmgui.ptable.elements[that.getAttribute('data-pos')];
      select_ptable_el(selected_el, that);
    });

  var radios = document.querySelectorAll('input[name="ptable_dtypes"]');
  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener('change', function () {
      if (!this.checked) return;
      wmgui.ptable.dtypes = this.value;
      var check = wmgui.multiselects['main'].read();
      select_ptable_series(check.elements);
    });
  }

  // NB an <a href="#"> element: like the old jQuery return false,
  // the default navigation must be suppressed explicitly
  $('#search_trigger').addEventListener('click', function (event) {
    event.preventDefault();
    var query = wmgui.multiselects['main'].read(),
      val = $('#search_field-selectized')
        ? $('#search_field-selectized').value
        : '';

    if (val) {
      if (val.endsWith(' ') || val.endsWith(','))
        val = val.substr(0, val.length - 1);
      var parsed = wmutils.guess(val);

      for (var key in parsed) {
        if (key == 'ignored') continue;
        else if (query[key] && key == 'elements')
          query[key] += '-' + parsed[key];
        else if (query[key] && key == 'classes')
          query[key] += ', ' + parsed[key];
        else query[key] = parsed[key];
      }
    }

    if (wmgui.search.numeric && !query.numeric) {
      query.numeric = '';
      wmgui.search.numeric.forEach(function (item) {
        query.numeric += serialize_numeric.apply(this, item); // unpack
      });
      delete query.props; // NB to make the numeric results "more clear"
    }

    if (is_empty(query)) {
      wmgui.notify('Sorry, unrecognized input');
      return false;
    }

    wmgui.ctx_strict_phases = '';
    $('#ctx_strict_phases_trigger').checked = true;

    var urlstr = inquiry_param(query);
    if (window.location.hash == '#inquiry/' + urlstr) {
      // hash-hack FIXME?
      if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
      else urlstr += '=';
    }
    window.location.hash = '#inquiry/' + urlstr;
    return false;
  });

  $('#advsearch_do_trigger').addEventListener('click', function () {
    var curval = '',
      rest_input = '',
      query = {};

    wmgui.simple_facets.forEach(function (item) {
      curval = $('#advs_fct_' + item).value;
      if (curval) {
        if (item == 'formulae') curval = wmutils.termify_formulae(curval);
        else if (item == 'elements')
          curval = curval.replaceAll(',', '').replaceAll(' ', '-');
        else if (item == 'doi')
          curval = curval
            .replace('http:\/\/dx\.doi\.org\/', '')
            .replace('http:\/\/doi\.org\/', '')
            .trim();
        else if (item == 'codens') curval = wmgui.journal_converter.j2c(curval);
        query[item] = curval;
      }
    });

    wmgui.multi_facets.forEach(function (item) {
      curval = wmgui.multiselects[item].read();

      if (curval[item]) {
        curval = curval[item];
        if (item == 'authors')
          curval = curval
            .replace(/'/g, '')
            .replaceAll('\\.', ' ')
            .replaceAll('\\b\\w{1}\\b', '')
            .trim();
        query[item] = curval;
      }
      rest_input = $('#advs_fct_' + item + '-selectized')
        ? $('#advs_fct_' + item + '-selectized').value
        : '';
      if (rest_input) {
        if (query[item]) query[item] += ', ' + rest_input;
        else query[item] = rest_input;
      }
    });

    if (wmgui.search.numeric) {
      query.numeric = '';
      wmgui.search.numeric.forEach(function (item) {
        query.numeric += serialize_numeric.apply(this, item); // unpack
      });
      delete query.props; // NB to make the numeric results "more clear"
    }

    if (is_empty(query)) return wmgui.notify('Sorry, search is empty');

    wmgui.ctx_strict_phases = '';
    $('#ctx_strict_phases_trigger').checked = true;

    var urlstr = inquiry_param(query);
    if (window.location.hash == '#inquiry/' + urlstr) {
      // hash-hack FIXME?
      if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
      else urlstr += '=';
    }
    window.location.hash = '#inquiry/' + urlstr;
  });

  $('#advsearch_drop_trigger').addEventListener('click', function () {
    $$('input.advs_input').forEach(function (input) {
      input.value = '';
    });

    wmgui.multi_facets.forEach(function (item) {
      const rest_input = $('#advs_fct_' + item + '-selectized');
      if (rest_input) rest_input.value = '';
      wmgui.multiselects[item].clear();
    });

    hide($('#aetmap'));
    $('#aet_limit').checked = false;

    destroy_numericbox();
    delete wmgui.search.numeric;
    // TODO? delete wmgui.search
  });

  // NB an <a href="#"> element: like the old jQuery return false,
  // the default navigation must be suppressed explicitly
  $('#advsearch_init_trigger').addEventListener('click', function (event) {
    event.preventDefault();
    $$('#advstab_options li').forEach(function (li) {
      li.classList.remove('working');
    });
    $$('#advstab_options li[rev=advstab_cry]').forEach(function (li) {
      li.classList.add('working');
    });
    show($('#advstab_cry'));
    hide($$('#advstab_main, #advstab_bib'));
    show_advsbox();
    return false;
  });

  on($('#search_box'), '#legend a', 'click', function (event) {
    var legend = this.textContent;
    window.location.hash = '#search/' + encodeURIComponent(legend);
    event.preventDefault();
    return false;
  });

  $$('div.advs_legend > a').forEach(function (a) {
    a.addEventListener('click', function (event) {
      var legend = a.getAttribute('rel') || a.textContent,
        multiselects = a.parentNode.dataset.multiselects;

      if (multiselects) {
        const rest_input = $('#advs_fct_' + multiselects + '-selectized');
        if (rest_input) rest_input.value = '';
        wmgui.multiselects[multiselects].clear();
        var obj = {};
        obj[multiselects] = legend;
        wmgui.multiselects[multiselects].write(obj);
        //wmgui.multiselects[multiselects].write({[multiselects]: legend});
      } else {
        const target_input = a.parentNode.parentNode.querySelector('input');
        if (target_input) {
          target_input.value = legend;
          target_input.focus();
        }
      }
      //if (legend.indexOf('-vertex') !== -1) show_aetmap(legend);

      event.preventDefault();
      return false;
    });
  });

  on($('#databrowser'), 'div.gallery_img', 'click', function (event) {
    handle_gallery_img_click(this, event);
  });
  on($('#ptable_results'), 'div.gallery_img', 'click', function (event) {
    handle_gallery_img_click(this, event);
  });

  function handle_gallery_img_click(el, event) {
    if (el.getAttribute('rel')) {
      if (wmgui.view_mode === 1 && wmgui.ptable.dtypes > 1) {
        var phid = el.getAttribute('rel');

        if (wmgui.ptable.dtypes == 2)
          document.querySelector(
            '#ptable_vis > iframe',
          ).contentWindow.location.hash =
            '#' + wmgui.phase_endpoint + '?phid=' + phid + '&struct=1';
        else
          document
            .querySelector('#ptable_vis > iframe')
            .contentWindow.location.replace(
              get_visavis_url({ phid: phid }, 'graph', window.innerHeight - 50),
            );

        $$('div.gallery_item.active').forEach(function (item) {
          item.classList.remove('active');
        });
        el.parentNode.classList.add('active');
      } else {
        var path = el.getAttribute('data-path') || 'phase_id';
        window.location.hash = '#' + path + '/' + el.getAttribute('rel');
      }
    }
  }

  on($('#databrowser'), 'a.resolve_ref', 'mousedown', function (event) {
    var bid = this.getAttribute('rel');
    $$('a.resolve_ref[rel="' + bid + '"]').forEach(function (a) {
      a.classList.add('visited');
    }); // :visited
    wmgui.bid_history.push(parseInt(bid));
    window.localStorage.setItem(
      wmgui.store_bids_key,
      JSON.stringify(wmgui.bid_history),
    );
    return true;
  });

  on(
    $('#databrowser'),
    'tr.tcell, div.gallery_item',
    'click',
    function (event) {
      open_context(this, false);
      // NB event.detail is 0 for a keyboard activation (Enter / Space)
      a11y_context_opened(this, event.detail === 0);
    },
  );

  on($('#databrowser'), 'span.launch_v', 'click', function (event) {
    wmgui.cancel_event(event);
    var parent_row = this.closest('tr');
    parent_row.classList.remove('busy_entry');
    open_context(parent_row, true);
  });

  on($('#databrowser'), 'a.launch_id', 'click', function (event) {
    wmgui.cancel_event(event);
    var phid_link = this.getAttribute('href');
    if (window.location.hash == phid_link) {
      // hash-hack FIXME?
      phid_link += '.';
    }
    window.location.hash = phid_link;
    return false;
  });

  on(
    $('#all_polyhedra_content'),
    'div.gallery_item',
    'click',
    function (event) {
      $$('#advstab_options li').forEach(function (li) {
        li.classList.remove('working');
      });
      $$('#advstab_options li[rev=advstab_cry]').forEach(function (li) {
        li.classList.add('working');
      });
      hide($$('div.advstab'));
      show($('#advstab_cry'));
      hide($$('div.modal'));
      show($$('#advsbox, #overlay'));

      var term = this.getAttribute('rel'),
        selected_aetypes = (
          wmgui.multiselects['aetypes'].read()['aetypes'] || ''
        ).split(', ');
      if (selected_aetypes.indexOf(term) == -1)
        wmgui.multiselects['aetypes'].write({ aetypes: term });
      show_aetmap(term);
    },
  );

  $('#aet_limit').addEventListener('click', function (event) {
    var selected_classes = (
      wmgui.multiselects['classes'].read()['classes'] || ''
    ).split(', ');

    if (this.checked) {
      var selected_aetypes = (
          wmgui.multiselects['aetypes'].read()['aetypes'] || ''
        )
          .split(', ')
          .filter(function (x) {
            return x;
          }),
        limit_kwd = wmgui.poly_limits[selected_aetypes.length];

      if (!limit_kwd) {
        wmgui.cancel_event(event);
        wmgui.notify('Sorry, only up to 3 supported');
        return false;
      }
      if (selected_classes.indexOf(limit_kwd) == -1) {
        wmgui.multiselects['classes'].write({ classes: limit_kwd });
      }
    } else {
      var poly_limits = Object.values(wmgui.poly_limits);
      wmgui.multiselects['classes'].clear();
      wmgui.multiselects['classes'].write({
        classes: selected_classes
          .filter(function (x) {
            return poly_limits.indexOf(x) == -1;
          })
          .join(', '),
      });
    }
    return true;
  });

  $$('#visualize, #xrpdize').forEach(function (el) {
    el.addEventListener('click', function () {
      close_vibox();
      launch_db_iframed(parseInt(this.getAttribute('data-rank')));
    });
  });

  /*$('#absolidize').click(function(){
        ... commented out in the original ...
    });*/

  on($('#refine_col'), 'a.extd_refine', 'click', async function (event) {
    var facet = this.getAttribute('rel');
    event.preventDefault();

    if ($('#refine_col > ul > li.extd_rfns.fct_' + facet)) {
      $$('#refine_col > ul > li:not(.fct_' + facet + ')').forEach(
        function (li) {
          li.classList.add('hidden_rfns');
        },
      );
      $$('#refine_col > ul > li:not(.fct_' + facet + ')').forEach(
        function (li) {
          if (li.classList.contains('hidden_rfns')) slide_up(li, 400);
        },
      );
      $$('#refine_col > ul > li.extd_rfns.fct_' + facet).forEach(function (li) {
        li.style.display = 'list-item';
      });
      $$('a.extd_refine[rel="' + facet + '"]').forEach(function (a) {
        a.parentNode.style.display = 'none';
      });
      return false;
    }
    var given_search = { extd_refine: facet };
    Object.assign(given_search, wmgui.search);
    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.active_ajax = ajax({
      type: 'GET',
      url: wmgui.rfn_endpoint,
      data: { q: JSON.stringify(given_search) },
    });

    let found_data;
    try {
      found_data = await wmgui.active_ajax;
    } catch (error) {
      if (!(error && error.aborted))
        wmgui.notify(
          'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
        );
      return false;
    }

    if (found_data.error) return wmgui.notify(found_data.error);
    var html = '';
    delete given_search['numeric'];
    delete given_search['extd_refine'];
    //if (given_search.classes) given_search.classes = given_search.classes.split(',').join(' ');

    var inquiry = false;
    for (var n = 0; n < wmgui.inquiries.length; n++) {
      if (given_search[wmgui.inquiries[n]]) {
        inquiry = true;
        break;
      }
    }

    found_data.payload.forEach(function (found, i) {
      // FIXME: duplicating
      var link_base = '',
        orepr = {};
      //count_text = ' ('+found[1]+')';

      for (var key in given_search) {
        const val = given_search[key];
        if (key == 'search_type') continue;
        else if (
          facet == 'elements' &&
          (key == 'elements' || key == 'formulae')
        )
          continue;
        else if (facet == 'props' && key == 'props') continue;

        link_base += val + ' ';

        if (orepr[key]) orepr[key] += ', ' + val;
        else orepr[key] = val;
      }

      //if (facet == 'elements') count_text = '';
      if (facet == 'props') {
        found[0] = found[0].replace(/\(|\)/g, '').replace(/\/[\w\-]*/g, ''); // FIXME
      }

      if (orepr[facet]) orepr[facet] += ', ' + found[0];
      else orepr[facet] = found[0];

      if (orepr['elements'])
        orepr['elements'] = orepr['elements'].replaceAll(', ', '-');

      if (inquiry)
        html +=
          '<li class="extd_rfns fct_' +
          facet +
          '"><a href="#inquiry/' +
          inquiry_param(orepr) +
          '">' +
          found[0] +
          '</a></li>';
      else
        html +=
          '<li class="extd_rfns fct_' +
          facet +
          '"><a href="#search/' +
          link_base +
          found[0] +
          '">' +
          found[0] +
          '</a></li>';
    });

    html +=
      '<li class="extd_rfns fct_' +
      facet +
      ' collapse_refine"><a class="collapse_refine" rel="' +
      facet +
      '" href="#">Show less&nbsp;</a></li>';
    $$('#refine_col > ul > li:not(.fct_' + facet + ')').forEach(function (li) {
      li.classList.add('hidden_rfns');
      slide_up(li, 400);
    });
    $$('a.extd_refine[rel="' + facet + '"]').forEach(function (a) {
      a.parentNode.style.display = 'none';
    });
    const anchor = $$('a.extd_refine[rel="' + facet + '"]')[0];
    if (anchor) after_html(anchor.parentNode, wmgui.clean(html));

    return false;
  });

  on($('#refine_col'), 'a.collapse_refine', 'click', function (event) {
    var facet = this.getAttribute('rel');
    event.preventDefault();
    $$('a.extd_refine[rel="' + facet + '"]').forEach(function (a) {
      a.parentNode.style.display = 'list-item';
    });
    $$('#refine_col > ul > li.hidden_rfns').forEach(function (li) {
      li.classList.remove('hidden_rfns');
      slide_down(li, 250);
    });
    $$('#refine_col > ul > li.extd_rfns').forEach(function (li) {
      li.style.display = 'none';
    });
    return false;
  });

  /*$('#fdwidget').on('click', 'span', function(){
        ... commented out in the original ...
    });*/

  on($('#tagcloudbox'), 'a.collateral', 'click', function (event) {
    data($('#userbox'), 'saved_hash', false);
    var act = this.getAttribute('rel');
    event.preventDefault();

    if (act == 'adv') {
      $('#advsearch_init_trigger').click();
      hide($$('div.menu_collateral'));
    } else if (act == 'idea') {
      window.location.hash =
        '#plot/' +
        wmgui.get_random_term(['pie', 'lit', 'graph']) +
        '/search/' +
        wmgui.get_interesting()['text'];
    } else if (act == 'sod') {
      var now = new Date(),
        pick = now.getDate() % wmgui.s_examples.length,
        start = new Date(now.getFullYear(), 0, 0),
        diff =
          now -
          start +
          (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000,
        nday = Math.floor(diff / (1000 * 60 * 60 * 24)),
        sod = wmgui.s_examples[pick] + nday;
      window.location.hash = '#entry/S' + sod;
    } else if (act == 'my') {
      var locals = JSON.parse(
        window.localStorage.getItem(wmgui.store_user_key) || '{}',
      );
      if (locals.ipbased) {
        window.location.hash = '#inquiry/orgs=' + locals.name;
      } else if (locals.name) {
        var names = locals.name.split(' ');
        window.location.hash =
          '#inquiry/authors=' + encodeURIComponent(names[names.length - 1]);
      }
    }
    return false;
  });

  on($('#hintsbox_msg'), 'div.wmbutton', 'click', function () {
    // copy to clipbox functionality
    var range = document.createRange();
    range.selectNode($('#hintsbox_msg > pre'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    wmgui.notify('Copied');
  });

  on($('#tooltip'), 'span', 'click', function () {
    var act = this.getAttribute('rel'),
      forced = this.classList.contains('forced');
    document.getElementById('tooltip').style.display = 'none';
    if (act && wmgui.tooltips[act]) show_tooltip(wmgui.tooltips[act], forced);
  });

  on($('#sim_col'), 'li > a', 'click', function () {
    $$('#sim_col > ul > li').forEach(function (li) {
      li.classList.remove('selected');
    });
    this.parentNode.classList.add('selected');
    wmgui.passive_sim_col = false;
    return true;
  });

  $$('div.close_user_dialogue').forEach(function (cross) {
    cross.addEventListener('click', function () {
      $('#userbox').click();
    });
  });

  $$('div.close_advs_dialogue').forEach(function (cross) {
    cross.addEventListener('click', function () {
      hide($$('#advsbox, #overlay, #aetmap'));
    });
  });

  const close_inquiry = $('#close_inquiry_dialogue');
  if (close_inquiry)
    close_inquiry.addEventListener('click', function () {
      hide($('#inquirybox'));
    });

  $('#close_ss_dialogue').addEventListener('click', function () {
    var x_sort = $('#ss_x > ul > li.ss_x').getAttribute('rel').split('_')[1],
      y_sort = $('#ss_y > ul > li.ss_y').getAttribute('rel').split('_')[1],
      x_op = $('#sops_x > ul > li.sops_x').textContent,
      y_op = $('#sops_y > ul > li.sops_y').textContent,
      x_op = x_op == 'none' ? false : x_op,
      y_op = y_op == 'none' ? false : y_op;

    if (isVisible($('#ss_z'))) {
      var z_sort = $('#ss_z > ul > li.ss_z').getAttribute('rel').split('_')[1],
        z_op = $('#sops_z > ul > li.sops_z').textContent,
        z_op = z_op == 'none' ? false : z_op;

      $$('#ctxpanel_cube > ul > li.embodied').forEach(function (li) {
        li.classList.remove('embodied');
      });
      $('#viscube_' + x_sort).classList.add('embodied');
      $$('#ctxpanel_cube > ul > li.ss_y').forEach(function (li) {
        li.classList.remove('ss_y');
      });
      $('#viscube_' + y_sort).classList.add('ss_y');
      $$('#ctxpanel_cube > ul > li.ss_z').forEach(function (li) {
        li.classList.remove('ss_z');
      });
      $('#viscube_' + z_sort).classList.add('ss_z');

      remove($$('span.sops'));
      if (x_op)
        append_html(
          $('#viscube_' + x_sort),
          '<span class="sops" rel="x">' + x_op + '</span>',
        );
      if (y_op)
        append_html(
          $('#viscube_' + y_sort),
          '<span class="sops" rel="y">' + y_op + '</span>',
        );
      if (z_op)
        append_html(
          $('#viscube_' + z_sort),
          '<span class="sops" rel="z">' + z_op + '</span>',
        );

      if (
        document
          .getElementById('visavis_iframe')
          .contentWindow.location.hash.indexOf('fixel=1') !== -1
      )
        document
          .getElementById('visavis_iframe')
          .contentWindow.matrix_order(x_sort, y_sort, x_op, y_op);
      else
        document
          .getElementById('visavis_iframe')
          .contentWindow.cube_order(x_sort, y_sort, z_sort, x_op, y_op, z_op);
    } else {
      if ((x_op && x_sort == 'count') || (y_op && y_sort == 'count'))
        return wmgui.notify('Sorry, data counts are not supported');

      $$('#ctxpanel_matrix > ul > li.embodied').forEach(function (li) {
        li.classList.remove('embodied');
      });
      $('#vismatrix_' + x_sort).classList.add('embodied');
      $$('#ctxpanel_matrix > ul > li.ss_y').forEach(function (li) {
        li.classList.remove('ss_y');
      });
      $('#vismatrix_' + y_sort).classList.add('ss_y');

      remove($$('span.sops'));
      if (x_op)
        append_html(
          $('#vismatrix_' + x_sort),
          '<span class="sops" rel="x">' + x_op + '</span>',
        );
      if (y_op)
        append_html(
          $('#vismatrix_' + y_sort),
          '<span class="sops" rel="y">' + y_op + '</span>',
        );

      document
        .getElementById('visavis_iframe')
        .contentWindow.matrix_order(x_sort, y_sort, x_op, y_op);
    }

    hide($$('#ss_custom_box, #overlay'));
    empty($$('div.ss_col > ul'));
  });

  $('#close_dc_dialogue').addEventListener('click', function () {
    hide($$('#discovery_custom_box, #overlay'));
    empty($$('#discovery_enabled, #discovery_disabled'));
    document.getElementById('visavis_iframe').contentWindow.discovery_rerun();
    $('#select_cmp_trigger').value = 'X';
  });

  // not handled by ermac?
  const close_formal = $('#close_formal_dialogue');
  if (close_formal)
    close_formal.addEventListener('click', function () {
      window.location.hash = '#start';
    });

  // not handled by ermac?
  $$(
    '#close_ph_dialogue, div.close_hy_dialogue, div.close_product_dialogue',
  ).forEach(function (cross) {
    cross.addEventListener('click', function () {
      if (document.referrer.indexOf(window.location.host) == -1)
        window.location.hash = '#start'; // FIXME: empty referrer
      else {
        var prev = window.location.href;
        window.history.go(-1);
        setTimeout(function () {
          if (window.location.href == prev) window.location.hash = '#start';
        }, 500);
      }
    });
  });

  /** $('#overlay').click(function(){
        $('div.modal:visible').each(function(){
            $(this).find('div.cross').trigger('click');
        });
    }); **/

  $$('div._close_ctx').forEach(function (cross) {
    cross.addEventListener('click', function () {
      try {
        wmgui.quick_ajax.abort();
      } catch (e) {}
      $$('.busy_entry').forEach(function (el) {
        el.classList.remove('busy_entry');
      });
      hide($$('#ctx_col, #sim_col'));
      wmgui.passive_sim_col = true;
      close_vibox();
      a11y_context_closed();
    });
  });

  on($('#hy_box'), 'span', 'click', function () {
    var hyid = this.getAttribute('class');
    $$('span.' + hyid.split(' ')[0]).forEach(function (el) {
      el.parentNode.querySelectorAll('ul').forEach(function (ul) {
        toggle_display(ul, 'block');
      });
      el.textContent == 'expand'
        ? (el.textContent = 'collapse')
        : (el.textContent = 'expand');
    });
  });

  on($('#hy_box'), 'a.dynprop', 'click', function (event) {
    // FIXME cannot process with the optimade NLP parser
    //if (wmgui.view_mode == 1)
    //    return true;

    var value = this.getAttribute('data-val');
    window.location.hash = wmgui.aug_search_cmd('props', value);
    event.preventDefault();
    return false;
  });

  // numeric search
  on($('#hy_box'), 'strong.numeric', 'click', function () {
    var prop = this.getAttribute('rel'),
      num_data = wmgui.numerics[prop],
      prop_id = num_data[0],
      units = num_data[1],
      min = num_data[2],
      max = num_data[3],
      step = num_data[4];
    var nblocks = $$('div.slider_numerics').length;
    if (nblocks >= 2)
      wmgui.notify(
        'Too little phases have all these properties reported &mdash; expect no results',
      );
    if (nblocks >= 8) return;
    create_floating_slider(prop, prop_id, units, min, max, step);
  });

  $$('strong.numeric').forEach(function (el) {
    el.addEventListener('click', function () {
      var prop = this.getAttribute('rel'),
        num_data = wmgui.numerics[prop],
        prop_id = num_data[0],
        units = num_data[1],
        min = num_data[2],
        max = num_data[3],
        step = num_data[4];
      create_floating_slider(prop, prop_id, units, min, max, step);
    });
  });

  $$('#hy_options > li').forEach(function (li) {
    li.addEventListener('click', function () {
      var desttab = this.getAttribute('rev');
      if (desttab == 'hy_vis') {
        window.open(wmgui.static_host + '/labs/ontology');
        return;
      }
      this.classList.add('working');
      $$('#hy_options > li').forEach(function (other) {
        if (other !== this) other.classList.remove('working');
      }, this);
      hide($$('div.hy_tabs'));
      show($('#' + desttab));
    });
  });

  $$('#dtypes > ul > li').forEach(function (li) {
    li.addEventListener('click', function () {
      var facet = this.getAttribute('data-facet'),
        term = this.getAttribute('data-term');

      if (facet == 'classes') {
        if (wmgui.search.classes)
          // FIXME?
          wmgui.search.classes = wmgui.search.classes
            .replace('peer-reviewed', '')
            .replace('peer-review', '')
            .replace('machine-learning', '')
            .replace('machine learning', '')
            .replace('ab initio calculations', '')
            .split(',')
            .map(function (x) {
              return x.trim();
            })
            .filter(function (x) {
              return x;
            })
            .join(', ');
        //wmgui.inquiries.forEach(function(item){
        //    if (wmgui.search[item]) delete wmgui.search[item];
        //});
      }
      window.location.hash = wmgui.aug_search_cmd(facet, term);
    });
  });

  $$('#dtypes_phid > ul > li').forEach(function (li) {
    li.addEventListener('click', function () {
      // NB jQuery .data() converted numeric attribute strings to numbers,
      // and the server expects {"rankfilter": 5}, not "5"
      var rankfilter = this.getAttribute('data-rankfilter'),
        active = this.classList.contains('active'),
        legend = this.textContent;
      if (rankfilter !== null && String(+rankfilter) === rankfilter)
        rankfilter = +rankfilter;
      request_search(
        { phid: wmgui.search.phid, rankfilter: active ? null : rankfilter },
        legend + ' of phase ' + wmgui.search.phid,
        true,
      );
      $$('#dtypes_phid > ul > li').forEach(function (other) {
        other.classList.remove('active');
      });
      active ? this.classList.remove('active') : this.classList.add('active');
    });
  });

  window.addEventListener(
    'scroll',
    wmgui.debounce(function () {
      if (wmgui.view_mode == 2) {
        if (wmgui.unfinished_page) {
          if (offset($('#footer')).top - scroll_top() - window_height() < 50) {
            // footer pos - scrolling - window height

            wmgui.unfinished_page = false;
            var cur_search = { offset: wmgui.quick_page_size };
            Object.assign(cur_search, wmgui.search);

            // NB no abort of the other requests!
            wmgui.show_preloader();
            const request = ajax({
              type: 'GET',
              url: wmgui.search_endpoint,
              data: {
                q: JSON.stringify(cur_search),
                strict: wmgui.ctx_strict_phases,
                //subphases: wmgui.ctx_subphases,
                sid: wmgui.sid,
              },
            });
            wmgui.active_ajax = request;

            request
              .then(function (fetch_data) {
                wmgui.hide_preloader();
                if (fetch_data.error) return wmgui.notify(fetch_data.error);
                hide($$('div.context_msg'));
                show_hints();
                if (!fetch_data.out.length) return;
                if (wmgui.thumbed_display) {
                  $$('#databrowser tr td').forEach(function (td) {
                    append_html(td, build_thumbs(fetch_data.out));
                  });
                } else {
                  append_html(
                    $('#databrowser tbody'),
                    build_cells(fetch_data.out),
                  );
                  update_databrowser_sort();
                }
              })
              .catch(function (error) {
                wmgui.hide_preloader();
                if (!(error && error.aborted))
                  wmgui.notify(
                    'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
                  );
              });
          }
        }
        var iframe = $('#iframe');
        if (iframe && !wmgui.is_inview(iframe)) close_vibox();
      } else if (wmgui.ptable.activated) {
        var scroll_pos = window.scrollY;
        //console.log(scroll_pos);

        if (scroll_pos > 40) {
          document
            .getElementById('ptable_dtypes_box')
            .classList.remove('resulted');
          document.getElementById('legend').style.display = 'none';

          wmgui.ptable.vis_fixed && scroll_pos > 550
            ? document.getElementById('ptable_vis').classList.add('fixed')
            : document.getElementById('ptable_vis').classList.remove('fixed');
        } else {
          document
            .getElementById('ptable_dtypes_box')
            .classList.add('resulted');
          document.getElementById('legend').style.display = 'block';
          document.getElementById('ptable_vis').classList.remove('fixed');
        }
      }
    }, 300),
  );

  $('#userbox').addEventListener('click', function () {
    var that = this;
    if (window.location.hash == data(that, 'saved_hash'))
      data(that, 'saved_hash', false);

    if (data(that, 'saved_hash')) {
      window.location.replace(data(that, 'saved_hash'));
      data(that, 'saved_hash', false);
    } else {
      if (window.location.hash.indexOf('modal') !== -1) {
        window.location.replace('#start');
      } else {
        data(that, 'saved_hash', window.location.hash);

        if (wmgui.sid) window.location.replace('#modal/menu');
        else window.location.replace('#modal/login');
      }
    }
  });

  $$('span.href[rel]').forEach(function (el) {
    el.addEventListener('click', function () {
      window.location.replace(this.getAttribute('rel'));
    });
  });

  $$('div.spinoff_pane').forEach(function (pane) {
    on(pane, 'span.extd', 'click', function () {
      const legend = this.parentNode.querySelector('span.legend');
      if (legend) toggle_display(legend, 'block');
      this.textContent == 'Show more info...'
        ? (this.textContent = 'Hide more info...')
        : (this.textContent = 'Show more info...');
    });
  });

  on($('#interpret'), 'li', 'click', function () {
    var link = this.getAttribute('rel');
    if (!!link) {
      // search only ... arity
      window.location.hash = link;
      return;
    }

    var csscls = this.getAttribute('class') || '';

    if (csscls.indexOf('numeric') !== -1) {
      window.location.hash = '#hierarchy';
    } else if (
      csscls.indexOf('authors') !== -1 ||
      csscls.indexOf('years') !== -1 ||
      csscls.indexOf('codens') !== -1 ||
      csscls.indexOf('doi') !== -1 ||
      csscls.indexOf('geos') !== -1 ||
      csscls.indexOf('orgs') !== -1
    ) {
      $$('#advstab_options li').forEach(function (li) {
        li.classList.remove('working');
      });
      $$('#advstab_options li[rev=advstab_bib]').forEach(function (li) {
        li.classList.add('working');
      });
      hide($$('div.advstab'));
      show($('#advstab_bib'));
      show_advsbox();
    } else if (
      csscls.indexOf('formulae') !== -1 ||
      csscls.indexOf('props') !== -1 ||
      csscls.indexOf('elements') !== -1 ||
      csscls.indexOf('classes') !== -1
    ) {
      $$('#advstab_options li').forEach(function (li) {
        li.classList.remove('working');
      });
      $$('#advstab_options li[rev=advstab_main]').forEach(function (li) {
        li.classList.add('working');
      });
      hide($$('div.advstab'));
      show($('#advstab_main'));
      show_advsbox();
    } else {
      $$('#advstab_options li').forEach(function (li) {
        li.classList.remove('working');
      });
      $$('#advstab_options li[rev=advstab_cry]').forEach(function (li) {
        li.classList.add('working');
      });
      hide($$('div.advstab'));
      show($('#advstab_cry'));
      show_advsbox();
      if (wmgui.search.aetypes) show_aetmap(wmgui.search.aetypes);
    }
  });

  $$('#tab_links > li').forEach(function (li) {
    li.addEventListener('click', function () {
      try {
        wmgui.active_ajax.abort();
      } catch (e) {}
      try {
        wmgui.quick_ajax.abort();
      } catch (e) {}

      var desttab = this.getAttribute('rev');

      this.classList.add('working');
      $$('#tab_links > li').forEach(function (other) {
        if (other !== this) other.classList.remove('working');
      }, this);
      hide($$('div.menu_tabs'));
      show($('#' + desttab));

      if (desttab == 'usr_tab_api_key') {
        set_html($('#hintsbox_msg'), wmgui.api_msg);

        wmgui.show_preloader();
        const request = ajax({
          type: 'POST',
          url: wmgui.api_key_endpoint,
          data: { sid: wmgui.sid },
        });
        wmgui.active_ajax = request;

        request
          .then(function (data) {
            wmgui.hide_preloader();
            if (data.error) return wmgui.notify(data.error);
            set_html($('#usr_api_key'), data.msg);
            if (data.revokable) show($('#revoke_usr_api_key_holder'));
            else if (data.creatable) show($('#create_usr_api_key_holder'));
            else
              return wmgui.notify(
                'Your session ended: please, <span class="href relogin">log in again</span>',
              );
          })
          .catch(function (error) {
            wmgui.hide_preloader();
            if (!(error && error.aborted))
              wmgui.notify(
                'Your session ended: please, <span class="href relogin">log in again</span>',
              );
            set_html($('#usr_api_key'), 'authentication error');
          });
      } else if (desttab == 'usr_tab_perms') {
        set_html($('#hintsbox_msg'), wmgui.get_random_term(wmgui.welcome_msgs));

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
              return wmgui.notify(
                'Your session ended: please, <span class="href relogin">log in again</span>',
              );
            set_html($('#perms_view'), describe_perms(data));
          })
          .catch(function (error) {
            wmgui.hide_preloader();
            if (!(error && error.aborted))
              wmgui.notify(
                'Your session ended: please, <span class="href relogin">log in again</span>',
              );
            set_html($('#perms_view'), 'authentication error');
          });
      } else if (desttab == 'usr_tab_ctrl') {
        // redirect to an external app
        window.location.href = '/ctrl/?' + Math.floor(Math.random() * 1000);
      } else if (desttab == 'usr_tab_absolidix') {
        // redirect to an external app
        window.location.href = wmgui.mydata_addr;
      } else if (desttab == 'usr_tab_account') {
        set_html($('#hintsbox_msg'), wmgui.get_random_term(wmgui.welcome_msgs));
      }
    });
  });

  $$('#advstab_options > li').forEach(function (li) {
    li.addEventListener('click', function () {
      var desttab = this.getAttribute('rev');

      this.classList.add('working');
      $$('#advstab_options > li').forEach(function (other) {
        if (other !== this) other.classList.remove('working');
      }, this);

      hide($$('div.advstab'));
      show($('#' + desttab));
    });
  });

  $$('a.link_adjuster').forEach(function (a) {
    a.addEventListener('click', function (event) {
      // hash-hack FIXME?
      if (window.location.hash == '#polyhedra') {
        window.location.hash = '#polyhedra/';
        event.preventDefault();
        return false;
      } else if (window.location.hash == '#polyhedra/') {
        window.location.hash = '#polyhedra';
        event.preventDefault();
        return false;
      } else return true;
    });
  });

  $('#create_usr_api_key').addEventListener('click', function () {
    hide(this.parentNode);
    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.api_key_endpoint,
      data: { sid: wmgui.sid, create: true },
    });
    wmgui.active_ajax = request;

    request
      .then(function (data) {
        wmgui.hide_preloader();
        if (data.error) return wmgui.notify(data.error);
        set_html($('#usr_api_key'), data.msg);
        show($('#revoke_usr_api_key_holder'));
      })
      .catch(function (error) {
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify(
            'Your session ended: please, <span class="href relogin">log in again</span>',
          );
      });
  });

  $('#revoke_usr_api_key').addEventListener('click', function () {
    hide(this.parentNode);
    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.api_key_endpoint,
      data: { sid: wmgui.sid, revoke: true },
    });
    wmgui.active_ajax = request;

    request
      .then(function (data) {
        wmgui.hide_preloader();
        if (data.error) return wmgui.notify(data.error);
        set_html($('#usr_api_key'), 'Successfully revoked');
        show($('#create_usr_api_key_holder'));
      })
      .catch(function (error) {
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify(
            'Your session ended: please, <span class="href relogin">log in again</span>',
          );
      });
  });

  $('#login_trigger').addEventListener('click', function () {
    if (data(this, 'busy')) return;
    data(this, 'busy', true);
    this.textContent = 'In process...';

    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.login_endpoint,
      data: {
        login: $('#login_email').value.trim(),
        pass: $('#login_password').value,
        ed: wmgui.edition,
      },
    });
    wmgui.active_ajax = request;

    request
      .then(function (answer) {
        data($('#login_trigger'), 'busy', false);
        $('#login_trigger').textContent = 'Login';
        wmgui.hide_preloader();

        if (answer.error) return wmgui.notify(answer.error);
        if (!answer.sid || !answer.name || !answer.acclogin)
          return wmgui.notify(
            'Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>',
          );
        user_login(
          answer.sid,
          answer.name,
          answer.acclogin,
          answer.admin,
          answer.oauths,
        );
        $('#userbox').click();
      })
      .catch(function (error) {
        data($('#login_trigger'), 'busy', false);
        $('#login_trigger').textContent = 'Login';
        wmgui.hide_preloader();
        wmgui.notify('Login unsuccessful');
      });
  });

  $('#factor_trigger').addEventListener('click', function () {
    if (data(this, 'busy')) return;
    data(this, 'busy', true);
    this.textContent = 'Sending...';

    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.factor_endpoint,
      data: { login: $('#factor_by_email').value.trim() },
    });
    wmgui.active_ajax = request;

    request
      .then(function (answer) {
        data($('#factor_trigger'), 'busy', false);
        $('#factor_trigger').textContent = 'Send code';
        wmgui.hide_preloader();

        if (answer.error) return wmgui.notify(answer.error);
        wmgui.notify('Please, check your inbox (and spam)');

        // handle factor log in step two...
        document.getElementById('factor_trigger').style.display = 'none';
        document.getElementById('factor_form_step_one').style.display = 'none';
        document.getElementById('factor_form_step_two').style.display = 'block';
        document.getElementById('factor_form_resp_0').focus();
      })
      .catch(function (error) {
        data($('#factor_trigger'), 'busy', false);
        $('#factor_trigger').textContent = 'Send code';
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify('Sorry, a network error occured. Please, try again');
      });
  });

  $('#restore_trigger').addEventListener('click', function () {
    if (data(this, 'busy')) return;
    data(this, 'busy', true);
    this.textContent = 'Sending...';

    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.restore_endpoint,
      data: { login: $('#restore_by_email').value.trim(), ed: wmgui.edition },
    });
    wmgui.active_ajax = request;

    request
      .then(function (answer) {
        data($('#restore_trigger'), 'busy', false);
        $('#restore_trigger').textContent = 'Send link';
        wmgui.hide_preloader();

        if (answer.error) return wmgui.notify(answer.error);
        wmgui.notify('Please, check your inbox (and spam)');
        $('#userbox').click();
      })
      .catch(function (error) {
        data($('#restore_trigger'), 'busy', false);
        $('#restore_trigger').textContent = 'Send link';
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify('Sorry, a network error occured. Please, try again');
      });
  });

  $('#accpass_trigger').addEventListener('click', function () {
    if (this.classList.contains('disabled')) return false;

    toggle_display($('#account_pass_change'));
  });

  $('#password_trigger').addEventListener('click', function () {
    var p1 = $('#new_password_1').value,
      p2 = $('#new_password_2').value;
    if (!p1 || !p2)
      return wmgui.notify('Please, type your new password in both fields');
    if (p1 !== p2) return wmgui.notify('Passwords do not match (typo?)');

    if (data(this, 'busy')) return;
    data(this, 'busy', true);
    this.textContent = 'Changing...';

    try {
      wmgui.active_ajax.abort();
    } catch (e) {}

    wmgui.show_preloader();
    const request = ajax({
      type: 'POST',
      url: wmgui.password_endpoint,
      data: { new_password: p2, sid: wmgui.sid, ed: wmgui.edition },
    });
    wmgui.active_ajax = request;

    request
      .then(function (answer) {
        data($('#password_trigger'), 'busy', false);
        $('#password_trigger').textContent = 'Change';
        wmgui.hide_preloader();

        if (answer.error) return wmgui.notify(answer.error);
        user_login(
          answer.sid,
          answer.name,
          answer.acclogin,
          answer.admin,
          answer.oauths,
        );
        window.location.replace('#start');
        hide($('#account_pass_change'));
      })
      .catch(function (error) {
        data($('#password_trigger'), 'busy', false);
        $('#password_trigger').textContent = 'Change';
        wmgui.hide_preloader();
        if (!(error && error.aborted))
          wmgui.notify(
            'Your session ended: please, <span class="href relogin">log in again</span>',
          );
      });
  });

  $('#logout_trigger').addEventListener('click', function () {
    if (this.classList.contains('disabled')) return false;

    ajax({
      type: 'POST',
      url: wmgui.logout_endpoint,
      data: { sid: wmgui.sid },
    })
      .then(function () {})
      .catch(function () {});
    user_logout();
    $('#userbox').click();
  });

  on($('#notifybox'), 'span.relogin', 'click', function () {
    force_relogin();
  });

  var resps = document.getElementsByClassName('factor_form_resp');
  for (var i = 0; i < resps.length; i++) {
    resps[i].addEventListener('keyup', function (evt) {
      // back, left arrow
      if (evt.keyCode == 8 || evt.keyCode == 37) {
        var prev = this.previousElementSibling;
        if (prev) {
          prev.focus();
          prev.select();
        }
      } else if (evt.keyCode > 47 && evt.keyCode < 58) {
        submit_factor_form_resp();

        var next = this.nextElementSibling;
        if (next) {
          next.focus();
          next.select();
        }
      }
    });

    resps[i].addEventListener('paste', function (evt) {
      var pasted = (evt.clipboardData || window.clipboardData).getData('text');
      if (!pasted || !pasted.length) return false;

      for (var i = 0; i < 6; i++) {
        document.getElementById('factor_form_resp_' + i).value =
          pasted.charAt(i);
      }
      submit_factor_form_resp();
    });
  }

  $('#search_holder').addEventListener('keydown', function (e) {
    var key = window.event ? e.keyCode : e.which;
    if (key == 13) $('#search_trigger').click();
  });

  // switch sliders: first row abf
  $('#control_a').addEventListener('click', function () {
    // entries
    ///re_view_request(0);
    var orepr = {};
    for (var key in wmgui.search) {
      if (['search_type', 'phid'].indexOf(key) !== -1) continue;
      orepr[key] = wmgui.search[key];
    }

    wmgui.search_type = 0;
    wmgui.search.search_type = wmgui.search_type;

    var urlstr = inquiry_param(orepr);
    if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
    else urlstr += '=';

    window.location.hash = '#inquiry_entries/' + urlstr;
  });
  $('#control_b').addEventListener('click', function () {
    // phases
    ///re_view_request(1);
    var orepr = {};
    for (var key in wmgui.search) {
      if (['search_type', 'phid'].indexOf(key) !== -1) continue;
      orepr[key] = wmgui.search[key];
    }

    wmgui.search_type = 1;
    wmgui.search.search_type = wmgui.search_type;

    var urlstr = inquiry_param(orepr);
    if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
    else urlstr += '=';

    window.location.hash = '#inquiry_phases/' + urlstr;
  });
  $('#control_f').addEventListener('click', function () {
    // articles
    ///re_view_request(2);
    var orepr = {};
    for (var key in wmgui.search) {
      if (['search_type', 'phid'].indexOf(key) !== -1) continue;
      orepr[key] = wmgui.search[key];
    }

    wmgui.search_type = 2;
    wmgui.search.search_type = wmgui.search_type;

    var urlstr = inquiry_param(orepr);
    if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
    else urlstr += '=';

    window.location.hash = '#inquiry_articles/' + urlstr;
  });

  // switch sliders: second row cde
  $('#control_c').addEventListener('click', function () {
    // table
    wmgui.visavis_terminating = true;
    wmgui.thumbed_display = false;
    if (wmgui.visavis_working) {
      var orepr = {};
      for (var key in wmgui.search) {
        if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
        orepr[key] = wmgui.search[key];
      }
      var urlstr = inquiry_param(orepr);
      if (window.location.hash == '#inquiry/' + urlstr) {
        // hash-hack FIXME?
        if (urlstr.slice(-1) == '=')
          urlstr = urlstr.substr(0, urlstr.length - 1);
        else urlstr += '=';
      }
      window.location.hash = '#inquiry/' + urlstr;
    } else re_view_request(wmgui.search_type);
    wmgui.chosen_table_browser = true;
  });
  $('#control_d').addEventListener('click', function () {
    // previews
    wmgui.visavis_terminating = true;
    wmgui.thumbed_display = true;
    if (wmgui.visavis_working) {
      var orepr = {};
      for (var key in wmgui.search) {
        if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
        orepr[key] = wmgui.search[key];
      }
      var urlstr = inquiry_param(orepr);
      if (window.location.hash == '#inquiry/' + urlstr) {
        // hash-hack FIXME?
        if (urlstr.slice(-1) == '=')
          urlstr = urlstr.substr(0, urlstr.length - 1);
        else urlstr += '=';
      }
      window.location.hash = '#inquiry/' + urlstr;
    } else re_view_request(wmgui.search_type);
    wmgui.chosen_table_browser = true;
  });
  $('#control_e').addEventListener('click', function () {
    // plotting
    var orepr = {};
    for (var key in wmgui.search) {
      if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
      orepr[key] = wmgui.search[key];
    }
    while (true) {
      var plot_type = wmgui.get_random_term(['matrix', 'cube']); // the most interesting visualization types
      if (plot_type != wmgui.visavis_curtype) break;
    }
    window.location.hash = '#plot/' + plot_type + '/inquiry/' + inquiry_param(orepr);
  });

  $('#ctx_strict_phases_trigger').addEventListener('change', function (e) {
    //$('#ctx_subphases_trigger').prop('checked', false);

    if (!wmgui.search.elements) {
      wmgui.cancel_event(e);
      return false;
    }

    var arity_kwd = wmutils.arity_keys[wmgui.search.elements.split('-').length],
      kwd_exists = false;

    if (wmgui.search.classes) {
      var arity_keys = wmutils.arity_keys.slice(1);
      for (var num = 0; num < arity_keys.length; num++) {
        if (num == 6) break;

        var value = arity_keys[num];
        if (wmgui.search.classes.indexOf(value) !== -1) {
          kwd_exists = true;
          break;
        }
      }

      if (!kwd_exists) {
        wmgui.search.classes += ', ' + arity_kwd;
        wmgui.multiselects['main'].write({ classes: arity_kwd });
      }
    } else {
      wmgui.search.classes = arity_kwd;
      wmgui.multiselects['main'].write({ classes: arity_kwd });
    }

    wmgui.ctx_strict_phases = $('#ctx_strict_phases_trigger').checked
      ? ''
      : '1';
    re_view_request(wmgui.search_type);
  });
  /*$('#ctx_subphases_trigger').change(function(){
        //$('#ctx_strict_phases_trigger').prop('checked', false);
        wmgui.ctx_subphases = wmgui.search.elements && $('#ctx_subphases_trigger').is(':checked') ? '1' : '';
        re_view_request(wmgui.search_type);
    });*/

  // visavis ctx
  $$('#ctxpanel_matrix > ul > li').forEach(function (li) {
    li.addEventListener('click', function () {
      if (
        this.classList.contains('embodied') ||
        this.classList.contains('ss_y')
      )
        return;
      var type = this.id.split('_')[1];
      $$('#ctxpanel_matrix > ul > li.embodied').forEach(function (el) {
        el.classList.remove('embodied');
      });
      $$('#ctxpanel_matrix > ul > li.ss_y').forEach(function (el) {
        el.classList.remove('ss_y');
      });
      this.classList.add('embodied');
      remove($$('span.sops'));

      document
        .getElementById('visavis_iframe')
        .contentWindow.matrix_order(type);
    });
  });
  $$('#ctxpanel_cube > ul > li').forEach(function (li) {
    li.addEventListener('click', function () {
      if (
        this.classList.contains('embodied') ||
        this.classList.contains('ss_y') ||
        this.classList.contains('ss_z')
      )
        return;
      var type = this.id.split('_')[1];
      $$('#ctxpanel_cube > ul > li.embodied').forEach(function (el) {
        el.classList.remove('embodied');
      });
      $$('#ctxpanel_cube > ul > li.ss_y').forEach(function (el) {
        el.classList.remove('ss_y');
      });
      $$('#ctxpanel_cube > ul > li.ss_z').forEach(function (el) {
        el.classList.remove('ss_z');
      });
      this.classList.add('embodied');
      remove($$('span.sops'));

      if (
        document
          .getElementById('visavis_iframe')
          .contentWindow.location.hash.indexOf('fixel=1') !== -1
      )
        document
          .getElementById('visavis_iframe')
          .contentWindow.matrix_order(type);
      else
        document
          .getElementById('visavis_iframe')
          .contentWindow.cube_order(type, type, type);
    });
  });
  $$('#ctxpanel_graph > ul > li').forEach(function (li) {
    li.addEventListener('click', function () {
      if (this.classList.contains('embodied')) return;
      var type = this.id.split('_')[1];
      $$('#ctxpanel_graph > ul > li.embodied').forEach(function (el) {
        el.classList.remove('embodied');
      });
      this.classList.add('embodied');

      document
        .getElementById('visavis_iframe')
        .contentWindow.graph_rebuild(type);
    });
  });
  $('#select_cmp_trigger').addEventListener('change', function () {
    var value = this.value,
      title = this.options[this.selectedIndex].text;

    wmgui.dc_ctrl_flag = true;

    if (value == 'X') return;
    else if (value == 'Y') {
      document
        .getElementById('visavis_iframe')
        .contentWindow.cmp_discard(wmgui.visavis_curtype);
      return;
    }

    if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) == -1)
      return;

    var url = wmgui.vis_endpoint + '/' + wmgui.visavis_curtype + '?q=' + value;
    document
      .getElementById('visavis_iframe')
      .contentWindow.cmp_download(url, wmgui.visavis_curtype);
  });
  $$('li.discovery_custom').forEach(function (li) {
    li.addEventListener('click', function () {
      if (
        !document.getElementById('visavis_iframe') ||
        !document.getElementById('visavis_iframe').contentWindow
      )
        return false;

      var list =
          document.getElementById('visavis_iframe').contentWindow.visavis
            .elementals_on,
        html_list_on = '',
        html_list_off = '';

      for (var prop in wmgui.elemental_names) {
        if (list.indexOf(prop) !== -1)
          html_list_on +=
            '<div class="rearrange" rel="' +
            prop +
            '">' +
            wmgui.elemental_names[prop] +
            ' (&minus;)</div>';
        else
          html_list_off +=
            '<div class="rearrange" rel="' +
            prop +
            '">' +
            wmgui.elemental_names[prop] +
            ' (+)</div>';
      }
      if (html_list_off) set_html($('#discovery_disabled'), html_list_off);

      set_html($('#discovery_enabled'), html_list_on);
      show($$('#discovery_custom_box, #overlay'));
    });
  });
  on($('#discovery_custom_box'), 'div.rearrange', 'click', function () {
    var prop = this.getAttribute('rel'),
      idx = document
        .getElementById('visavis_iframe')
        .contentWindow.visavis.elementals_on.indexOf(prop);
    if (this.parentNode.id == 'discovery_enabled') {
      if ($$('#discovery_enabled div.rearrange').length == 1) return false;
      if (idx !== -1)
        document
          .getElementById('visavis_iframe')
          .contentWindow.visavis.elementals_on.splice(idx, 1);
      append_html(
        $('#discovery_disabled'),
        '<div class="rearrange" rel="' +
          prop +
          '">' +
          wmgui.elemental_names[prop] +
          ' (+)</div>',
      );
      hide($('#dc_' + prop));
    } else {
      if (idx == -1)
        document
          .getElementById('visavis_iframe')
          .contentWindow.visavis.elementals_on.push(prop);
      append_html(
        $('#discovery_enabled'),
        '<div class="rearrange" rel="' +
          prop +
          '">' +
          wmgui.elemental_names[prop] +
          ' (&minus;)</div>',
      );
      show($('#dc_' + prop));
    }
    this.remove();
  });
  $$('#ss_gear_matrix, #ss_gear_cube').forEach(function (gear) {
    gear.addEventListener('click', function () {
      var domain = this.id.substr(8); // ss_gear_
      if (domain == 'matrix') {
        hide($$('#ss_z, #sops_z'));
        $$('#ss_x, #ss_y, #sops_x, #sops_y').forEach(function (el) {
          el.style.width = '50%';
        });
      } else {
        $$('#ss_x, #ss_y, #ss_z, #sops_x, #sops_y, #sops_z').forEach(
          function (el) {
            el.style.width = '33%';
          },
        );
        show($$('#ss_z, #sops_z'));
      }

      // ss_ logic
      var common_type = $(
          '#ctxpanel_' + domain + ' > ul > li.embodied',
        ).id.split('_')[1], // NB embodied, not ss_x
        y_id = $('#ctxpanel_' + domain + ' > ul > li.ss_y'),
        z_id = $('#ctxpanel_' + domain + ' > ul > li.ss_z'),
        x_type = common_type,
        y_type = y_id ? y_id.id.split('_')[1] : common_type,
        z_type = z_id ? z_id.id.split('_')[1] : common_type,
        x_orders_html = '',
        y_orders_html = '',
        z_orders_html = '';

      $$('#ctxpanel_' + domain + ' > ul > li').forEach(function (li) {
        var type = li.id.split('_')[1],
          text_nodes = Array.prototype.slice
            .call(li.childNodes)
            .filter(function (node) {
              return node.nodeType !== 1;
            }),
          label = (
            text_nodes.length ? text_nodes[0].data : li.textContent
          ).substr(3), // filter text only, then cut "by "
          cls_html = type == x_type ? ' class="ss_x"' : '';
        x_orders_html +=
          '<li rev="ss_x" rel="x_' +
          type +
          '"' +
          cls_html +
          '>' +
          label +
          '</li>';
        cls_html = type == y_type ? ' class="ss_y"' : '';
        y_orders_html +=
          '<li rev="ss_y" rel="y_' +
          type +
          '"' +
          cls_html +
          '>' +
          label +
          '</li>';
        if (domain == 'matrix') return;
        cls_html = type == z_type ? ' class="ss_z"' : '';
        z_orders_html +=
          '<li rev="ss_z" rel="z_' +
          type +
          '"' +
          cls_html +
          '>' +
          label +
          '</li>';
      });

      set_html($('#ss_x > ul'), x_orders_html);
      set_html($('#ss_y > ul'), y_orders_html);
      if (domain == 'cube') set_html($('#ss_z > ul'), z_orders_html);

      // sops_ logic
      $$('li.sops_x').forEach(function (el) {
        el.classList.remove('sops_x');
      });
      $$('li.sops_y').forEach(function (el) {
        el.classList.remove('sops_y');
      });
      $$('li.sops_z').forEach(function (el) {
        el.classList.remove('sops_z');
      });

      var sops_types = ['x', 'y', 'z'];
      $$('span.sops').forEach(function (span) {
        var op = span.textContent,
          type = span.getAttribute('rel');
        $$('#sops_' + type + ' > ul > li').forEach(function (li) {
          if (li.textContent.indexOf(op) !== -1)
            li.classList.add('sops_' + type);
        });
        sops_types = sops_types.filter(function (x) {
          return x !== type;
        });
      });
      sops_types.forEach(function (item) {
        $$('#sops_' + item + ' > ul > li').forEach(function (li) {
          if (li.textContent.indexOf('none') !== -1)
            li.classList.add('sops_' + item);
        });
      });

      show($$('#ss_custom_box, #overlay'));
    });
  });
  $$('div.ss_col').forEach(function (col) {
    on(col, 'li', 'click', function () {
      var rowid = this.getAttribute('rev'),
        rel_dat = this.getAttribute('rel').split('_'),
        axis = rel_dat[0],
        clsname = axis == 'x' ? 'ss_x' : axis == 'y' ? 'ss_y' : 'ss_z';
      $$('#' + rowid + ' > ul > li.' + clsname).forEach(function (li) {
        li.classList.remove(clsname);
      });
      this.classList.add(clsname);
    });
  });
  $$('div.sops_col').forEach(function (col) {
    on(col, 'li', 'click', function () {
      var rowid = this.closest('.sops_col').id,
        axis = rowid.split('_')[1],
        clsname = axis == 'x' ? 'sops_x' : axis == 'y' ? 'sops_y' : 'sops_z';
      $$('#' + rowid + ' > ul > li.' + clsname).forEach(function (li) {
        li.classList.remove(clsname);
      });
      this.classList.add(clsname);
    });
  });

  const tips_trigger = $('#tips_trigger');
  if (tips_trigger)
    tips_trigger.addEventListener('click', function () {
      wmgui.tooltip_counter = 0;
      show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]);
      return false;
    });

  // numeric search
  on($('#numericbox'), 'div.slider_close', 'click', function () {
    if ($$('div.slider_numerics').length == 1) {
      destroy_numericbox();
      delete wmgui.search.numeric;
      const main_input = $('#search_field-selectized');
      if (main_input) main_input.value = '';
      wmgui.multiselects['main'].clear();
      wmgui.multiselects['main'].write(wmgui.search);
      return false;
    }
    const slider = this.parentNode.querySelector('div.slider_numerics');
    if (slider && slider.noUiSlider) slider.noUiSlider.destroy();
    const li = this.closest('li');
    if (li)
      fade_out(li, 250, function () {
        li.remove();
      });
  });

  $('#numericbox_do_trigger').addEventListener('click', function () {
    var sliders_numerics = document.getElementsByClassName('slider_numerics'),
      numeric = [];

    for (var i = 0; i < sliders_numerics.length; i++) {
      var sdata = sliders_numerics[i].noUiSlider.get(),
        srange = sliders_numerics[i].noUiSlider.options.range,
        srange = [srange.min, srange.max];
      //if (sdata[0] == srange[0] && sdata[1] == srange[1]) continue;
      //console.log(sdata);

      var prop = sliders_numerics[i].getAttribute('rel');
      numeric.push([prop, '>', sdata[0]]);
      numeric.push([prop, '<', sdata[1]]);
    }

    if (numeric.length) wmgui.search.numeric = numeric;

    if (isVisible($('#advsbox'))) $('#advsearch_do_trigger').click();
    else $('#search_trigger').click();
  });

  $('#numericbox_drop_trigger').addEventListener('click', function () {
    var sliders_numerics = document.getElementsByClassName('slider_numerics');

    //console.log(sliders_numerics);

    for (var i = 0; i < sliders_numerics.length; i++) {
      var srange = sliders_numerics[i].noUiSlider.options.range;
      sliders_numerics[i].noUiSlider.set([srange.min, srange.max]);
    }
  });

  $('#close_numericbox').addEventListener('click', function () {
    destroy_numericbox();
    delete wmgui.search.numeric;
    const main_input = $('#search_field-selectized');
    if (main_input) main_input.value = '';
    wmgui.multiselects['main'].clear();
    wmgui.multiselects['main'].write(wmgui.search);
  });

  // mobile version switching
  /*$('#mobilebox span').click(function(){
        window.location.href = '/m/' + window.location.hash;
    });
    $('#mobilebox a').click(function(){
        $('#mobilebox').remove();
        return false;
    });*/

  // keys press
  document.addEventListener('keydown', function (e) {
    var key = window.event ? e.keyCode : e.which;
    if (key == 13) {
      // ENTER: input must trigger submit button via two parent divs!
      var focused = document.activeElement;
      //console.log(focused);

      if (
        focused &&
        focused.classList &&
        focused.classList.contains('submitter')
      ) {
        const target = focused.parentElement.parentElement.querySelector(
          'div.def_submittable',
        );
        if (target) target.click();
      } else if (
        focused &&
        focused.classList &&
        (focused.classList.contains('advs_input') ||
          (focused.id || '').startswith('advs_fct_'))
      ) {
        $('#advsearch_do_trigger').click();
      }
    } else if (key == 27) {
      // ESC
      // NB like $('div.cross:visible').trigger('click'): ALL visible crosses
      // (collected first, as one click may hide the others)
      $$('div.cross')
        .filter(isVisible)
        .forEach(function (cross) {
          cross.click();
        });
    }
  });

  window.addEventListener('hashchange', url_redraw_react);

  // execute a command in all the active GUI windows (except the current) e.g. setting a new state
  const storage_runnables = {
    tab_user_login: tab_user_login,
    user_logout: user_logout,
  };
  window.addEventListener('storage', function (ev) {
    if (ev.key != wmgui.store_comm_exec_key) return;

    var runnable_name = ev.newValue;
    if (runnable_name && storage_runnables[runnable_name])
      storage_runnables[runnable_name]();
  });

  /*$(window).resize(function(){
        //document.title = document.body.clientWidth + ' px';
        if (document.body.clientWidth < 1000) $('#mobilebox').show();
        else                                  $('#mobilebox').hide();
    });*/

  document
    .querySelector('#ptable_previews')
    .addEventListener('click', function (event) {
      if (event.target.classList.contains('subphases_trigger')) {
        var state = parseInt(event.target.getAttribute('data-state')),
          req = Object.assign({}, wmgui.ptable.query),
          param_str;

        if (state === 1) {
          param_str = 'strict=1';
        } else {
          param_str = 'subphases=1';
          delete req.classes;
        }
        ajax_download(
          wmgui.search_endpoint + '?q=' + JSON.stringify(req) + '&' + param_str,
          render_left,
          true,
        );
        wmgui.ptable.subphases_set(state);
      }
    });

  // theme switcher
  document.getElementById('darkmode_trigger').onclick = function () {
    wmgui.darkmode.toggle();
    document.getElementById('darkmode_trigger').innerHTML =
      wmgui.darkmode.isActivated() ? 'enabled' : 'disabled';
    document
      .getElementById('comms')
      .contentWindow.postMessage(
        JSON.stringify({ darkmode: wmgui.darkmode.isActivated() ? 1 : 2 }),
        '*',
      );
  };

  // cross-site comms
  window.addEventListener('message', function (message) {
    //if (message.origin === 'https://trusted.com') {
    var received = {};
    try {
      received = JSON.parse(message.data);
    } catch (ignore) {}
    var darkmode = received.darkmode;
    if (darkmode !== undefined) {
      darkmode = darkmode === 1;
      if (darkmode !== wmgui.darkmode.isActivated()) wmgui.darkmode.toggle();
      document.getElementById('darkmode_trigger').innerHTML =
        wmgui.darkmode.isActivated() ? 'enabled' : 'disabled';
    }
    //}
  });
  // EOF register_events
}
