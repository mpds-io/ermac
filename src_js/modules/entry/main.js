import '../../third_party/jquery.shim.js';
import '../../third_party/jquery.tablesorter.shim.js';
import '../../third_party/wNumb.shim.js';
import '../../third_party/nouislider.shim.js';
import '../../third_party/selectize.shim.js';
import '../../third_party/autocomplete.shim.js';
import '../../third_party/darkmode.shim.js';
import '../../third_party/optimade.shim.js';

import { init } from '../state/config.js';
import '../state/polyfills.js';
import { assign_edition } from '../state/edition.js';
import wmgui from '../state/wmgui-object.js';

import { $ } from '../../third_party/jquery.shim.js';

import { register_html } from '../ui/markup.js';
import { switch_view_mode, switch_control_mode, arrange_menu_collateral, rotate_interesting, show_examples, stop_visavis, close_vibox } from '../ui/view-mode.js';
import { create_floating_slider, destroy_numericbox, get_sliders_ranges, serialize_numeric } from '../search/numeric.js';
import { request_search, request_refinement, show_interpretation, rebuild_history_box } from '../search/request.js';
import { build_cells, build_thumbs, open_context, open_sim_col, show_dunit_info, show_hints, launch_db_iframed } from '../search/display.js';
import { show_advsbox, show_aetmap, render_all_polyhedra } from '../search/facets.js';
import { init_user_login, user_login, tab_user_login, user_logout, force_relogin, communicate_windows, show_modal, describe_perms } from '../search/auth.js';
import { start_visavis, manage_visavis, rebuild_visavis, get_visavis_url, update_dc } from '../search/visavis.js';
import { url_redraw_react } from '../router/dispatcher.js';
import { register_events } from '../events/register.js';

window.switch_view_mode = switch_view_mode;
window.switch_control_mode = switch_control_mode;
window.arrange_menu_collateral = arrange_menu_collateral;
window.rotate_interesting = rotate_interesting;
window.show_examples = show_examples;
window.stop_visavis = stop_visavis;
window.close_vibox = close_vibox;
window.create_floating_slider = create_floating_slider;
window.destroy_numericbox = destroy_numericbox;
window.get_sliders_ranges = get_sliders_ranges;
window.serialize_numeric = serialize_numeric;
window.request_search = request_search;
window.request_refinement = request_refinement;
window.rebuild_history_box = rebuild_history_box;
window.show_interpretation = show_interpretation;
window.build_cells = build_cells;
window.build_thumbs = build_thumbs;
window.open_context = open_context;
window.open_sim_col = open_sim_col;
window.show_dunit_info = show_dunit_info;
window.show_hints = show_hints;
window.launch_db_iframed = launch_db_iframed;
window.aug_search_cmd = aug_search_cmd;
window.show_advsbox = show_advsbox;
window.show_aetmap = show_aetmap;
window.render_all_polyhedra = render_all_polyhedra;
window.init_user_login = init_user_login;
window.user_login = user_login;
window.tab_user_login = tab_user_login;
window.user_logout = user_logout;
window.force_relogin = force_relogin;
window.communicate_windows = communicate_windows;
window.show_modal = show_modal;
window.describe_perms = describe_perms;
window.start_visavis = start_visavis;
window.manage_visavis = manage_visavis;
window.rebuild_visavis = rebuild_visavis;
window.get_visavis_url = get_visavis_url;
window.update_dc = update_dc;
window.url_redraw_react = url_redraw_react;

wmgui._selectize_read_main = function(){ /* placeholder - set at runtime */ };
wmgui._selectize_read_facet = function(){ /* placeholder - set at runtime */ };
wmgui._selectize_write = function(){ /* placeholder - set at runtime */ };
wmgui._selectize_display = function(){ /* placeholder - set at runtime */ };

init();
assign_edition();
register_html();

function register_html_post_init(){
    var $notifybox = $('#notifybox, #preloader');
    if ($notifybox.length) $notifybox.hide();
}
register_html_post_init();

function satisfy_requirements(){
    $('#notifybox, #preloader').hide();
    $('#absolidize > span.disabled > span.href').attr('rel', wmgui.mydata_addr);
    wmgui.ptable.els_data = read_ptable_html();
    init_user_login();

    var history_html = '';
    $.each(JSON.parse(window.localStorage.getItem(wmgui.store_history_key) || '[]'), function(n, past){
        wmgui.tooltip_counter++;
        if (n > 5) return false;
        var title = [], inquiry = false;
        for (var prop in past){ title.push(past[prop]) }
        title = title.join(" ");
        $.each(wmgui.inquiries, function(m, item){ if (past[item]){ inquiry = true; return false; } });
        if (inquiry) history_html += '<li><a href="#inquiry/' + $.param(past) + '">' + title + '</a></li>';
        else history_html += '<li><a href="#search/' + encodeURIComponent(title) + '">' + title + '</a></li>';
    });
    $('#history ul').append(history_html);

    $.each(JSON.parse(window.localStorage.getItem(wmgui.store_bids_key) || '[]'), function(n, item){ wmgui.bid_history.push(parseInt(item)); });
    $.each(JSON.parse(window.localStorage.getItem(wmgui.store_mydata_key) || '[]'), function(n, item){ wmgui.mydata_history.push(item); });

    window.localStorage.setItem(wmgui.store_comm_exec_key, 'tab_user_login');

    $.getJSON(wmgui.wmdata_endpoint, function(answer){
        var i = 0, len = answer.props_ref.length;
        for (i; i < len; i++){
            if (!answer.props_ref[i]) answer.props_ref[i] = answer.props[i];
        }

        $.each(['props', 'lattices', 'sgs', 'protos', 'codens', 'geos', 'orgs'], function(idx, fct){
            wmgui.create_autocomplete({
                custom_type: fct,
                selector: 'advs_fct_' + fct, minChars: 1, cache: 1,
                source: function(term, fct_type, suggest){
                    var fct_src = fct_type, fct_chk = fct_type, anypos = false;
                    if (fct_type !== 'lattices'){ anypos = true; if (fct_type == 'props') fct_src = 'props_ref'; else if (fct_type == 'codens'){ fct_src = 'jfull'; fct_chk = 'jfull'; } }
                    var suggestions = [], cnt = 0, checks = [], i = 0, len2 = answer[fct_chk].length;
                    term = term.toLowerCase();
                    for (i; i < len2; i++){
                        if (answer[fct_chk][i].toLowerCase().startswith(term)){
                            suggestions.push(answer[fct_src][i]);
                            if (anypos) checks.push(answer[fct_src][i]);
                            cnt++;
                            if (cnt > 12) break;
                        }
                    }
                    if (anypos && suggestions.length < 6){
                        for (i = 0; i < len2; i++){
                            if (answer[fct_chk][i].toLowerCase().indexOf(term) != -1 && checks.indexOf(answer[fct_src][i]) == -1){
                                suggestions.push(answer[fct_src][i]);
                                cnt++;
                                if (cnt > 12) break;
                            }
                        }
                    }
                    suggest(suggestions);
                },
                renderItem: function (item, search){ return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item + '</div>'; }
            });
        });

        $.each(wmgui.multi_facets, function(idx, fct){
            wmgui.multiselects[fct] = $('#advs_fct_' + fct).selectize({
                plugins: ['remove_button', 'preserve_on_blur'],
                valueField: 'id', labelField: 'label', searchField: 'label',
                create: false, highlight: false, maxItems: 5, closeAfterSelect: true, diacritics: false, options: [],
                onChange: function(value){
                    if (fct == 'aetypes'){
                        var term = (wmgui.multiselects['aetypes'].read()['aetypes'] || "").split(', ').pop();
                        show_aetmap(term);
                        if ($('#aet_limit').is(':checked')) $('#aet_limit').trigger('click');
                    }
                },
                onItemRemove: function(value){ var input = this; setTimeout(function(){ input.close(); }, 750); },
                load: function(term, callback){
                    this.clearOptions();
                    if (!term.length) return callback();
                    var suggestions = [], cnt = 0, checks = [], i = 0, len2 = answer[fct].length;
                    term = term.toLowerCase();
                    for (i; i < len2; i++){
                        if (answer[fct][i].toLowerCase().startswith(term)){
                            suggestions.push({'facet': fct, 'label': answer[fct][i], 'id': fct + i});
                            checks.push(answer[fct][i]);
                            cnt++;
                            if (cnt > 12) break;
                        }
                    }
                    if (suggestions.length < 6){
                        for (i = 0; i < len2; i++){
                            if (answer[fct][i].toLowerCase().indexOf(term) != -1 && checks.indexOf(answer[fct][i]) == -1){
                                suggestions.push({'facet': fct, 'label': answer[fct][i], 'id': fct + i});
                                cnt++;
                                if (cnt > 12) break;
                            }
                        }
                    }
                    callback(suggestions);
                },
                score: function(){ return function(){ return 1 } },
                render: {
                    option: function(item, escape){ return '<div class="fct_' + item.facet + '">' + item.label + '</div>'; },
                    item: function(item, escape){ return '<div class="fct_' + item.facet + '" data-facet="' + item.facet + '" data-term="' + item.label + '">' + item.label + '</div>'; }
                }
            })[0].selectize;
            wmgui.multiselects[fct].read = function(){ return wmgui._selectize_read_facet(fct); };
            wmgui.multiselects[fct].write = function(search_obj){ wmgui._selectize_write(wmgui.multiselects[fct], fct, search_obj); };
            wmgui.multiselects[fct].display = function(facet, term){ wmgui._selectize_display(wmgui.multiselects[fct], facet, term); };
        });

        wmgui.journal_converter.j2c = function(x){ var fi = answer.jfull.indexOf(x); if (fi == -1){ wmgui.notify("Sorry, unknown journal: " + x); return x; } return answer.codens[fi]; };
        wmgui.journal_converter.c2j = function(x){ var fi = answer.codens.indexOf(x); if (fi == -1){ wmgui.notify("Sorry, unknown CODEN: " + x); return x; } return answer.jfull[fi]; };

        var html_scalars = '', html_complex = '', html_arrays = '', counter = 0;
        $.each(answer.hy_scalars, function(term, content){
            term = parseInt(term); term = answer.props_ref[term] ? answer.props_ref[term] : answer.props[term]; counter += 1;
            html_scalars += '<li><a class="dynprop" data-val="' + term + '" href="#inquiry/props=' + term.replace(/ /g, '+') + '">' + term + '</a> (<span class="hy' + counter + '">expand</span>)<ul style="display:none;">';
            $.each(content, function(sub_term, sub_content){
                sub_term = parseInt(sub_term); sub_term = answer.props_ref[sub_term] ? answer.props_ref[sub_term] : answer.props[sub_term];
                html_scalars += '<li><a class="dynprop" data-val="' + sub_term + '" href="#inquiry/props=' + sub_term.replace(/ /g, '+') + '">' + sub_term + '</a><ul style="display:none;">';
                $.each(sub_content, function(n, item){
                    item = parseInt(item); var prop = answer.props_ref[item] ? answer.props_ref[item] : answer.props[item], specs = answer.numerics[item];
                    html_scalars += '<li><a class="dynprop" data-val="' + prop + '" href="#inquiry/props=' + prop.replace(/ /g, '+') + '">' + prop + '</a>';
                    if (specs) html_scalars += '<strong class="numeric" title="Numeric search" rel="' + prop + '">' + (specs[0] || '') + ' &nbsp;[' + specs[1] + ' &mdash; ' + specs[2] + ']&nbsp;&#x1F50D;</strong>';
                    html_scalars += '</li>';
                });
                html_scalars += '</ul></li>';
            });
            html_scalars += '</ul></li>';
        });
        $('#hy_scalars > ul').append(html_scalars);

        $.each(wmgui.hy_complex, function(n, item){
            html_complex += '<li><a class="dynprop" data-val="' + item + '" href="#search/' + item + '">' + item + '</a></li>';
        });
        $('#hy_complex > ul').append(html_complex);

        $.each(answer.hy_textual, function(term, content){
            term = parseInt(term); term = answer.props_ref[term] ? answer.props_ref[term] : answer.props[term]; counter += 1;
            html_arrays += '<li><a class="dynprop" data-val="' + term + '" href="#inquiry/props=' + term.replace(/ /g, '+') + '">' + term + '</a> (<span class="hy' + counter + '">expand</span>)<ul style="display:none;">';
            $.each(content, function(sub_term, sub_content){
                sub_term = parseInt(sub_term); sub_term = answer.props_ref[sub_term] ? answer.props_ref[sub_term] : answer.props[sub_term];
                html_arrays += '<li><a class="dynprop" data-val="' + sub_term + '" href="#inquiry/props=' + sub_term.replace(/ /g, '+') + '">' + sub_term + '</a><ul style="display:none;">';
                $.each(sub_content, function(n, item){
                    item = parseInt(item); item = answer.props_ref[item] ? answer.props_ref[item] : answer.props[item];
                    html_arrays += '<li><a class="dynprop" data-val="' + item + '" href="#inquiry/props=' + item.replace(/ /g, '+') + '">' + item + '</a></li>';
                });
                html_arrays += '</ul></li>';
            });
            html_arrays += '</ul></li>';
        });
        $('#hy_arrays > ul').append(html_arrays);

        wmgui.create_autocomplete({
            selector: 'hy_suggest', minChars: 1, cache: 1,
            source: function(term, fct_type, suggest){
                var fct_src = 'props_ref', term = term.toLowerCase(), suggestions = [], cnt = 0, checks = [], i = 0, len2 = answer[fct_type].length;
                for (i; i < len2; i++){
                    if (answer[fct_type][i].startswith(term)){ suggestions.push(answer[fct_src][i]); checks.push(answer[fct_src][i]); cnt++; if (cnt > 18) break; }
                }
                if (suggestions.length < 12){
                    for (i = 0; i < len2; i++){
                        if (answer[fct_type][i].indexOf(term) != -1 && checks.indexOf(answer[fct_src][i]) == -1){ suggestions.push(answer[fct_src][i]); cnt++; if (cnt > 18) break; }
                    }
                }
                suggest(suggestions);
            },
            renderItem: function (item, search){ return '<div class="autocomplete-suggestion" style="' + (wmgui.numerics[item] ? 'color:#c00' : '') + '" data-val="' + item + '">' + item + '</div>'; },
            onSelect: function (e, term, item){
                var numerics = wmgui.numerics[term];
                if ($('#numericbox').is(':visible') && numerics) create_floating_slider(term, numerics[0], numerics[1], numerics[2], numerics[3], numerics[4]);
                else window.location.hash = wmgui.aug_search_cmd("props", term);
                $('#hy_suggest').val('');
            }
        });

        rotate_interesting();
        setInterval(rotate_interesting, 2000);

        window.location.hash ? url_redraw_react() : window.location.replace('#start');
    });

    wmgui.multiselects['main'] = $('#search_field').selectize({
        plugins: ['remove_button', 'preserve_on_blur'],
        valueField: 'id', labelField: 'label', searchField: 'label',
        create: false, highlight: false, maxItems: 10, closeAfterSelect: true, diacritics: false, options: [],
        onInitialize: function(){ $('#search_field-selectized').focus(); },
        onItemAdd: function(){
            if (wmgui.selectize_emit){
                var check = wmgui.multiselects['main'].read();
                select_ptable_series(check.elements);
            }
        },
        onItemRemove: function(){
            var check = wmgui.multiselects['main'].read(), input = this;
            if (!check.numeric){ destroy_numericbox(); delete wmgui.search.numeric; if (wmgui.selectize_emit) select_ptable_series(check.elements); }
            setTimeout(function(){ input.close(); }, 750);
        },
        load: function(query, callback){
            this.clearOptions();
            if (!query.length) return callback();
            $.ajax({
                url: wmgui.auto_endpoint + '?q=' + encodeURIComponent(query),
                type: 'GET',
                error: callback,
                success: function(res){ if (!res.length) return; callback(res); }
            });
        },
        score: function(){ return function(){ return 1 } },
        render: {
            option: function(item, escape){ return '<div class="fct_' + item.facet + '">' + item.label + '</div>'; },
            item: function(item, escape){ return '<div class="fct_' + item.facet + '" data-facet="' + item.facet + '" data-term="' + item.label + '">' + item.label + '</div>'; }
        }
    })[0].selectize;

    wmgui.multiselects['main'].read = function(){ return wmgui._selectize_read_main(); };
    wmgui.multiselects['main'].write = function(search_obj){ wmgui._selectize_write(wmgui.multiselects['main'], 'main', search_obj); };
    wmgui.multiselects['main'].display = function(facet, term){ wmgui._selectize_display(wmgui.multiselects['main'], facet, term); };

    wmgui.darkmode = new Darkmode({saveInCookies: false});
    document.getElementById('darkmode_trigger').innerHTML = wmgui.darkmode.isActivated() ? 'enabled' : 'disabled';
}
window.satisfy_requirements = satisfy_requirements;

console.log("%cWeb-scraping or automated usage apart of the public MPDS API is in violation of our ToS (https://mpds.io/formal/terms) and results in banned account.", "color:red;font-size:16px;");

function re_view_request(search_type){
    var caption_items = [];
    $.each(wmgui.search, function(k, v){ if (k == 'search_type') return true; caption_items.push(v); });
    if (!caption_items.length) return;
    wmgui.search_type = search_type;
    wmgui.search.search_type = search_type;
    request_search(wmgui.search, caption_items.join(" ").replaceAll(",", " "), true);
    $('#dtypes_phid > ul > li').removeClass('active');
}
window.re_view_request = re_view_request;

function reset_factor_form(){
    document.getElementById('factor_trigger').style.display = 'block';
    document.getElementById('factor_form_step_one').style.display = 'block';
    document.getElementById('factor_form_step_two').style.display = 'none';
    var resps = document.getElementsByClassName('factor_form_resp');
    for (var i = 0; i < resps.length; i++) resps[i].value = "";
}
window.reset_factor_form = reset_factor_form;

function submit_factor_form_resp(){
    var result = "", resps = document.getElementsByClassName('factor_form_resp');
    for (var i = 0; i < resps.length; i++) result += resps[i].value;
    if (result.length !== 6 || !Number.isInteger(parseInt(result))) return false;
    $.ajax({
        type: 'POST', url: wmgui.factor_v_endpoint, data: {a: result, ed: wmgui.edition}
    }).done(function(data){
        if (data.error) return wmgui.notify(data.error);
        if (!data.sid || !data.name || !data.acclogin){ window.location.replace('#start'); return wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>'); }
        user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
        reset_factor_form();
        $('#userbox').trigger('click');
    }).fail(function(xhr, textStatus, errorThrown){});
}
window.submit_factor_form_resp = submit_factor_form_resp;

register_events();