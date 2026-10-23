import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { show_tooltip } from '../ui/notifications.js';

function show_interpretation(search){
    $('#interpret').html(
        wmgui.clean(wmgui.get_interpretation(search, wmgui.facet_names, wmgui.numerics))
    );
}
window.show_interpretation = show_interpretation;

function rebuild_history_box(search, caption){
    var orepr = {};
    wmgui.facets.forEach(function(item){
        if (search[item]) orepr[item] = search[item];
    });

    var inquiry = false;
    $.each(wmgui.inquiries, function(m, i){ if (orepr[i]){ inquiry = true; return false; } });

    var title = [];
    for (var prop in orepr){ title.push(orepr[prop].toLowerCase()) }
    title.sort();
    var fingerprint = title.join(" "),
        search_log = JSON.parse(window.localStorage.getItem(wmgui.store_history_key) || '[]'),
        chk_searches = [];
    if (search_log.length > 8) search_log = search_log.slice(0, 7);
    $.each(search_log, function(n, item){
        var title = [];
        for (var p in item){ title.push(item[p].toLowerCase()) }
        title.sort();
        chk_searches.push(title.join(" "));
    });
    if (chk_searches.indexOf(fingerprint) == -1){
        var item;
        if (inquiry) item = '<a href="#inquiry/' + $.param(orepr) + '">' + caption + '</a>';
        else         item = '<a href="#search/' + encodeURIComponent(caption) + '">' + caption + '</a>';

        $('#history ul').prepend('<li>' + wmgui.clean(item) + '</li>');
        search_log.unshift(orepr);
        window.localStorage.setItem(wmgui.store_history_key, JSON.stringify(search_log));
        if ($('#history ul li').length > 8) $('#history ul li:last').remove();
    }
    wmgui.tooltip_counter++;
    if (wmgui.tooltip_counter == 1){
        setTimeout(function(){ show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]) }, 4000);
    }
}
window.rebuild_history_box = rebuild_history_box;
wmgui.rebuild_history_box = rebuild_history_box;

function request_search(search, caption, without_history){
    if (manage_visavis(rebuild_history_box, search, caption)) return;

    try { wmgui.active_ajax.abort() } catch(e){}
    try { wmgui.quick_ajax.abort() } catch(e){}

    wmgui.active_ajax = $.ajax({
        type: 'GET',
        url: wmgui.search_endpoint,
        data: {
            q: JSON.stringify(search),
            strict: wmgui.ctx_strict_phases,
            sid: wmgui.sid
        },
        beforeSend: wmgui.show_preloader

    }).always(wmgui.hide_preloader).done(function(data){
        if (data.error)
            return notify(data.error);

        caption = caption.replaceAll('%2F', '/');

        if (!data.out.length)
            return notify('No hits for ' + caption);

        wmgui.fuzzyout = false;
        if (data.fuzzy_notice){
            wmgui.fuzzyout = true;
            notify(data.fuzzy_notice);
        }

        var res_str = (data.estimated_count == 1) ? ' result' : ' results',
            notice = (data.estimated_count > 150) ? 'At least ' : '';
        document.title = notice + data.estimated_count + res_str;
        switch_view_mode(2);

        if (!wmgui.chosen_table_browser)
            wmgui.thumbed_display = (data.out.length > wmgui.ntab_tolerance);

        if (wmgui.thumbed_display){
            var $db = $('#databrowser');
            $db.removeClass().addClass('thumbed').empty().append('<tr><td>' + build_thumbs(data.out) + '</td></tr>');
            $('#results').slideDown(250);

        } else {
            var $db = $('#databrowser');
            $db.removeClass().addClass('tabled').empty().append(build_cells(data.out, '<tbody>', '</tbody>'));
            $('#results').slideDown(250);

            if (wmgui.search_type == 2){
                $db.addClass('tablesorter').tablesorter({ sortMultiSortKey: 'ctrlKey', headers: {
                    0: {sorter: 'doi'},
                    5: {sorter: false}
                }, selectorHeaders: '#dataheader_articles > thead > tr > th', selectorHeaderParent: 'dataheader_articles' });
                $('#header_articles').show();

            } else if (wmgui.search_type == 1){
                $db.addClass('tablesorter').tablesorter({ sortMultiSortKey: 'ctrlKey', headers: {
                    0: {sorter: 'chemical'},
                    1: {sorter: 'digit'},
                    2: {sorter: 'digit'},
                    3: {sorter: 'digit'},
                    4: {sorter: false}
                }, selectorHeaders: '#dataheader_phases > thead > tr > th', selectorHeaderParent: 'dataheader_phases' });
                $('#header_phases').show();

            } else {
                $db.addClass('tablesorter').tablesorter({ sortMultiSortKey: 'ctrlKey', headers: {
                    0: {sorter: 'chemical'},
                    1: {sorter: false},
                    5: {sorter: 'doi'}
                }, selectorHeaders: '#dataheader_entries > thead > tr > th', selectorHeaderParent: 'dataheader_entries' });
                $('#header_entries').show();
            }
        }

        wmgui.unfinished_page = false;
        if (wmgui.search_type || search.phid){
            if (data.estimated_count >= wmgui.quick_page_size * 3) $('#toomuch span').html('other').parent().show();
            show_hints(search.entry || search.interlinkage);

        } else {
            if (data.estimated_count > wmgui.quick_page_size + wmgui.fetch_page_size){
                $('#toomuch span').html('nearly ' + (data.estimated_count - wmgui.quick_page_size)).parent().show();
                show_hints(search.entry, data.estimated_count);

            } else if (data.estimated_count > wmgui.quick_page_size){
                $('#loadscroll').show();
                wmgui.unfinished_page = true;

            } else show_hints(search.entry, data.estimated_count);
        }

        if (wmgui.visavis_terminating) stop_visavis();

        if (wmgui.search_type || search.phid || search.bid || search.entry || search.interlinkage || search.doi || search.numeric){

            if (search.phid || search.bid || search.entry){
                switch_control_mode(9, 11, 'a', 'c');
                show_dunit_info(search.phid, search.bid, search.entry);

            } else if (search.interlinkage){
                switch_control_mode(9, 11, 'a', 'c');
                show_examples('#examples', true, true);
                $('#dtypes').hide();

            } else if (search.numeric){
                switch_control_mode(1, 12, 'b', false);
                destroy_numericbox();
                $.each(get_sliders_ranges(search.numeric, wmgui.numerics), function(n, item){ create_floating_slider.apply(this, item) });
                show_examples('#examples', true, true);

            } else {
                switch_control_mode(1, 10, false, false);
                show_examples('#examples', true, true);
            }

            if (search.entry){
                var that = $('#e__' + search.entry);
                if (search.entry.indexOf('-') == -1 && !that.length) that = $('#e__' + search.entry + '-1');
                if (that.length && that.attr('data-rank') != 0){
                    that.removeClass('busy_entry');
                    open_context(that, true);
                }
            }

        } else {
            wmgui.fuzzyout ? switch_control_mode(1, 11, 'a', false) : switch_control_mode(0, 10, false, false);
            request_refinement(search, (data.estimated_count > wmgui.quick_page_size));
        }

        if (!search.numeric){
            destroy_numericbox();
            delete wmgui.search.numeric;
        }
        if (search.props && wmgui.numerics[search.props]){
            var data2 = wmgui.numerics[search.props],
                prop_id = data2[0],
                units = data2[1],
                min = data2[2],
                max = data2[3],
                step = data2[4];
            create_floating_slider(search.props, prop_id, units, min, max, step);
        }
        if (!without_history) rebuild_history_box(search, caption);
        wmgui.search.elements && wmgui.search_type == 1 ? $('#phases_ctx').show() : $('#phases_ctx').hide();

    }).fail(function(xhr, textStatus, errorThrown){
        if (textStatus != 'abort')
            notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
    });
}
window.request_search = request_search;
wmgui.request_search = request_search;

function request_refinement(query_obj, is_heavy){
    $('#examples, #ind_col').hide();
    $('#ind_col > span').empty();
    $('#refine_col > ul').empty().parent().show();
    $('#refine_col > div.col_title').show();

    var given_search = {is_heavy: is_heavy};
    $.extend(given_search, query_obj);
    try { wmgui.active_ajax.abort() } catch(e){}

    wmgui.active_ajax = $.ajax({
        type: 'GET',
        url: wmgui.rfn_endpoint,
        data: {q: JSON.stringify(given_search)},
        beforeSend: function(){ $('#rfn_preloader').show() }

    }).always(function(){ $('#rfn_preloader').hide() }).done(function(data){
        if (data.error) return notify(data.error);

        var was_facet = null,
            refine_html = '',
            classes_chk = [],
            num_terms = 0;
        delete given_search['is_heavy'];

        if (given_search.classes){
            classes_chk = given_search.classes.split(',').map(function(i){ return i.trim() });
            given_search.classes = classes_chk.join(',');
        }

        var inquiry = false;
        $.each(wmgui.inquiries, function(n, i){ if (given_search[i]){ inquiry = true; return false; } });

        $.each(data.payload, function(i, found_obj){
            if (query_obj.formulae && found_obj.facet == 'elements') return true;

            var link_base = '',
                nested_skip = false,
                orepr = {};

            $.each(given_search, function(key, val){
                if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1)
                    return true;
                else if (found_obj.facet == 'elements' && (key == 'elements' || key == 'formulae'))
                    return true;
                else if (found_obj.facet == 'props' && key == 'props')
                    return true;

                link_base += val + ' ';

                if (orepr[key]) orepr[key] += ', ' + val;
                else            orepr[key] = val;
            });
            if (query_obj.classes && found_obj.facet == 'classes'){
                $.each(classes_chk, function(n, cls){
                    if (cls == found_obj.value){ nested_skip = true; return false; }
                });
            }
            if (nested_skip) return true;

            if (found_obj.facet != was_facet){
                if (was_facet && is_heavy) refine_html += '<li class="fct_' + was_facet + ' extd_refine"><a class="extd_refine" rel="' + was_facet + '" href="#">Show more&nbsp;</a></li>';
                refine_html += '<li class="new_rfn_facet fct_' + found_obj.facet + '">' + wmgui.facet_names[found_obj.facet] + '</li>';
                was_facet = found_obj.facet;
            }
            if (found_obj.facet == 'props'){
                found_obj.value = found_obj.value.replace(/\(|\)/g, "").replace(/\/[\w\-]*/g, "");
            }

            if (orepr[found_obj.facet]) orepr[found_obj.facet] += ', ' + found_obj.value;
            else                        orepr[found_obj.facet] = found_obj.value;

            if (orepr['elements']) orepr['elements'] = orepr['elements'].replaceAll(', ', '-');

            if (inquiry) refine_html += '<li class="fct_' + found_obj.facet + '"><a href="#inquiry/' + $.param(orepr) + '">' + found_obj.value + '</a></li>';
            else         refine_html += '<li class="fct_' + found_obj.facet + '"><a href="#search/' + link_base + found_obj.value + '">' + found_obj.value + '</a></li>';
            num_terms++;
        });

        if (is_heavy) refine_html += '<li class="fct_' + was_facet + ' extd_refine"><a class="extd_refine" rel="' + was_facet + '" href="#">Show more&nbsp;</a></li>';

        if (num_terms == 0) show_examples('#examples', true, true);
        else {
            $('#refine_col > ul').show().append(wmgui.clean(refine_html));
            if (num_terms <= 10) show_examples('#examples', false, false);
        }

    }).fail(function(xhr, textStatus, errorThrown){
        if (textStatus != 'abort')
            notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
    });
}
window.request_refinement = request_refinement;
wmgui.request_refinement = request_refinement;

export { show_interpretation, rebuild_history_box, request_search, request_refinement };