import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { switch_view_mode, switch_control_mode, show_examples } from '../ui/view-mode.js';
import { request_search, request_refinement, show_interpretation } from './request.js';
import { create_floating_slider, destroy_numericbox, get_sliders_ranges } from './numeric.js';

function build_cells(json, header, footer){
    var cls_map = {7: 'ml_data', 8: 'ab_data', 9: 'ab_data', 10: 'ab_data', 11: 'ab_data', 13: 'deactivated'},
        result_html = '';

    if (header) result_html += header;

    if (wmgui.search_type == 2){
        if (json[0].length != 6){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        var act_link = '';

        $.each(json, function(k, row){

            act_link = '<a class="launch_id" href="#article/' + row[0] + '">Show</a>';

            row[0] = parseInt(row[0]);
            if (row[0] == 999999){
                row[4] = wmgui.mockyear;
                act_link = '&nbsp;';
            }
            result_html += '<tr id="e__B' + row[0] + '" class="tcell" data-type="B"><td class=c55>[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[0]) !== -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[0] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[0] + '" target="_blank" rel="noopener noreferrer">' + row[0] + '</a>]</td><td class=a1>' + row[1] + '</td><td class=a2 title="' + row[2] + '">' + row[2] + '</td><td class=a5>' + row[5] + '</td><td class=c4>' + row[4] + '</td><td class=a6>' + act_link + '</td></tr>';
        });
    } else if (wmgui.search_type == 1){
        if (json[0].length != 5){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        $.each(json, function(k, row){
            result_html += '<tr id="e__Z' + row[0] + '" class="tcell" data-type="Z"><td class=p1>' + row[1] + '</td><td class=p2>' + row[2] + '</td><td class=p3>' + row[3] + '</td><td class=p4>' + row[4] + '</td><td class=p5><a class="launch_id" href="#phase_id/' + row[0] + '">Show entries</a></td></tr>';
        });
    } else {
        if (json[0].length != 8){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        $.each(json, function(k, row){
            row[7] = parseInt(row[7]);
            var dtype = row[0].substr(0, 1),
                preview = (row[3] == 4 || row[3] == 5 || row[3] == 6 || row[3] == 9 || row[3] == 10 || row[3] == 12) ? '<span class=launch_v>Show</span>' : ' ',
                biblio_html = (row[7] == 999999) ? '<td class=cj>&mdash;</td><td class=c4>' + wmgui.mockyear + '</td><td class=c5>&mdash;</td>' :
                '<td class=cj>' + row[5] + '</td><td class=c4>' + row[6] + '</td><td class=c5>[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[7]) !== -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[7] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[7] + '" target="_blank" rel="noopener noreferrer">' + row[7] + '</a>]</td>';

            result_html += '<tr id="e__' + row[0] + '" class="tcell ' + (cls_map[row[3]] || '') + (row[4] ? ' opened' : '') + '" data-type="' + dtype + '" data-rank="' + row[3] + '" title="Click for more info"><td class=c1>' + row[1] + '</td><td class=cp>' + preview + '</td><td class=c2>' + row[2] + '</td>' + biblio_html + '</tr>';
        });
    }
    if (footer) result_html += footer;
    return result_html;
}
window.build_cells = build_cells;
wmgui.build_cells = build_cells;

function build_thumbs(json){
    var cls_map = {6: 'pd_full', 7: 'ml_data', 8: 'ab_data', 9: 'ab_data', 10: 'ab_data', 11: 'ab_data', 13: 'deactivated'},
        result_html = '';

    if (wmgui.search_type == 2){
        if (json[0].length != 6){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function(a, b){
            return a[4] > b[4] ? 1 : a[4] < b[4] ? -1 : 0;
        });

        var title_html = '',
            full_display = !!wmgui.sid,
            act_link = '';

        $.each(json, function(k, row){

            act_link = '<a class="launch_id" href="#article/' + row[0] + '">Show entries</a>';

            row[0] = parseInt(row[0]);
            if (row[0] == 999999){
                row[4] = wmgui.mockyear;
                act_link = 'Too many to show...';
            }
            if (full_display) title_html = (row[1].length > 60 ? row[1].substr(0, 60) + '&hellip;' : row[1]) + ', <span>' + (row[2].length > 80 ? row[2].substr(0, 80) + '&hellip;' : row[2]) + '</span>';
            else title_html = '<b>&#x1f4d6;</b>';

            result_html += '<div class="gallery_item" id="e__B' + row[0] + '" data-type="B"><div class="gallery_img"><div class="articled">' + title_html + '</div></div><div class="gallery_label">' + act_link + '<br />[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[0]) !== -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[0] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[0] + '" target="_blank" rel="noopener noreferrer">' + row[3] + '&rsquo;' + row[4].toString().substr(2, 2) + '</a>]</div></div>';
        });
    } else if (wmgui.search_type == 1){
        if (json[0].length != 5){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function(a, b){
            return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
        });
        $.each(json, function(k, row){
            result_html += '<div class="gallery_item" id="e__Z' + row[0] + '" data-type="Z"><div class="gallery_img" rel="' + row[0] + '"><div class="phased">' + row[1] + '<br /><br />space group ' + row[2] + '</div></div><div class="gallery_label"><a class="launch_id" href="#phase_id/' + row[0] + '">Show ' + row[3] + (row[3] == 1 ? ' entry' : ' entries') + '</a><br />Publications: ' + row[4] + '</div></div>';
        });
    } else {
        if (json[0].length != 8){ notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function(a, b){
            var dtype_a = a[0].substr(0, 1),
                dtype_b = b[0].substr(0, 1);

            if (dtype_a == 'S'){
                if (dtype_b == 'S') return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
                return -1;
            }
            if (dtype_a == 'C'){
                if (dtype_b == 'C') return a[7] > b[7] ? 1 : a[7] < b[7] ? -1 : 0;
                if (dtype_b == 'S') return 1;
                if (dtype_b == 'P') return -1;
            }
            if (dtype_a == 'P'){
                if (dtype_b == 'P') return a[2].toUpperCase() > b[2].toUpperCase() ? 1 : a[2].toUpperCase() < b[2].toUpperCase() ? -1 : 0;
                return 1;
            }
        });
        $.each(json, function(k, row){
            row[7] = parseInt(row[7]);
            var dtype = row[0].substr(0, 1),
                content,
                biblio_html = (row[7] == 999999) ? '<br />&mdash;' :
                '<br />[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[7]) !== -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[7] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[7] + '" target="_blank" rel="noopener noreferrer">' + row[5] + '&rsquo;' + row[6].toString().substr(2, 2) + '</a>]';

            if (dtype == 'P')
                content = '<div>' + row[2] + '</div>';
            else if (dtype == 'S')
                content = '<img loading="lazy" alt="' + row[0] + '" src="' + wmgui.static_host + '/rd_thumbs/' + row[0].split('-')[0] + '.png" />';
            else {
                row[2] = row[2].split(';')[0];
                row[2] = row[2].split(' ')[row[2].split(' ').length - 1];
                var url_dest = (row[3] == 12) ? (row[2].split('-').length == 3 ? '/prism' : '/tetrahedron') : '/pd_thumbs/' + row[0].split('-')[0];
                content = '<img loading="lazy" alt="' + row[0] + '" src="' + wmgui.static_host + url_dest + '.png" /><p>' + row[2] + '</p>';
            }
            result_html += '<div class="gallery_item ' + (cls_map[row[3]] || '') + (row[4] ? ' opened' : '') + '" id="e__' + row[0] + '" data-type="' + dtype + '" data-rank="' + row[3] + '" title="Click for more info"><div class="gallery_img">' + content + '</div><div class="gallery_label">' + row[1] + biblio_html + '</div></div>';
        });
    }
    return result_html;
}
window.build_thumbs = build_thumbs;
wmgui.build_thumbs = build_thumbs;

function open_context(el, launch_ext){
    close_vibox();
    if (el.hasClass('busy_entry')){
        el.removeClass('busy_entry');
        $('#ctx_col, #sim_col').hide();
        try { wmgui.quick_ajax.abort() } catch(e){}

    } else {
        var entry = el.attr('id').substr(3),
            rank = parseInt(el.attr('data-rank')),
            entype = entry.substr(0, 1),
            orig_id = entry.split('-')[0];

        $('.busy_entry').removeClass('busy_entry');
        el.addClass('busy_entry');

        if (entype == 'Z' || entype == 'B') return;

        $('#entryno').html('<a href="#entry/' + orig_id + '">' + orig_id + '</a>');

        $('#ctx_col').show();
        $('#visualize').attr('data-rank', rank);
        $('#xrpdize').attr('data-rank', 99);
        $('#visualize, #xrpdize, div.spinoff_pane, li.d_icon').hide();

        open_sim_col(entry, entype, rank);

        if (rank == 0){
            $('#download_bib').show();

        } else if (rank == 1){
            $('#download_bib, #download_pdf').show();
            $.ajax({
                type: 'GET',
                url: wmgui.path_pp_ping + entry,
            }).done(function(data){
                $('#visualize, #download_png, #download_json').show();
            }).fail(function(xhr, textStatus, errorThrown){});

        } else if (rank == 2){
            $('#download_bib, #download_pdf, #download_json').show();

        } else if (rank == 3){
            $('#download_bib, #download_png, #download_cdr').show();

        } else if (rank == 4){
            $('#download_bib, #download_json, #visualize').show();

        } else if (rank == 5){
            $('#download_bib, #download_pdf, #visualize, #xrpdize, #absolidize, #download_cif, #download_inp, #download_json').show();

        } else if (rank == 6){
            $('#download_bib, #download_pdf, #visualize, #download_png, #download_cdr, #download_json').show();

        } else if (rank == 7){
            $('#ml_data, #download_pdf, #download_json').show();

        } else if (rank == 8){
            $('#ab_data, #download_pdf, #download_json, #download_raw').show();

        } else if (rank == 9){
            $('#ab_data, #download_pdf, #download_json, #visualize, #download_png, #download_raw').show();

        } else if (rank == 10){
            $('#ab_data, #download_pdf, #download_json, #visualize, #download_raw').show();

        } else if (rank == 11){
            $('#ab_promise, #download_json').show();

        } else if (rank == 12){
            $('#pd3d_data, #visualize').show();

        } else if (rank == 13){
            $('#deactivated_data, #download_bib').show();
        }
        $('#ctx_col > ul > li.d_icon > a').each(function(){
            var fmt = $(this).attr('rel'),
                link_add = (entype == 'S') ? '&export=1' : '',
                link_sid = (fmt == 'raw') ? 'null' : wmgui.sid,
                link_url = wmgui.dd_addr_tpl + '/' + entype.toLowerCase() + '?q=' + entry + '&fmt=' + fmt + '&sid=' + link_sid + link_add + '&ed=' + wmgui.edition;

            $(this).attr('href', link_url);
        });

        if (launch_ext) launch_db_iframed(rank);
    }
}
window.open_context = open_context;
wmgui.open_context = open_context;

function open_sim_col(entry, entype, rank){
    $('#sim_col > ul, #sim_legend').empty();
    $('.sim_col_ctx').hide();
    $('#sim_col').show();

    var cur_obj = {q: entry},
        allpurpose = ([0, 1, 4, 9].indexOf(rank) !== -1);
    if (allpurpose) cur_obj.allpurpose = true;

    try { wmgui.quick_ajax.abort() } catch(e){}

    wmgui.quick_ajax = $.ajax({
        type: 'GET',
        url: wmgui.sim_endpoint,
        data: cur_obj,
        beforeSend: function(){ $('#sim_preloader').show() }

    }).always(function(){ $('#sim_preloader').hide() }).done(function(data){
        if (data.error) return notify(data.error);
        var counter = 0,
            sim_html = '';

        if (allpurpose){
            $.each(data.out.sim, function(k, row){
                if (counter == 7) return false;
                if (row[4]) sim_html += '<li><a href="#inquiry/' + $.param({'elements': row[1], 'years': row[2], 'codens': row[3], 'classes': (row[4] == 1) ? '' : row[4]}) + '">' + row[0] + '</a></li>';
                else        sim_html += '<li><a href="#inquiry/' + $.param({'formulae': row[1], 'years': row[2], 'codens': row[3]}) + '">' + row[0] + '</a></li>';
                counter++;
            });

        } else if (entype == 'C' || entype == 'S'){
            if (rank > 3){
                $.each(data.out.sim, function(k, row){
                    if (counter == 8) return false;
                    sim_html += '<li><a href="#phase_id/' + row[1] + '">' + row[0] + '</a></li>';
                    counter++;
                });
                if (entype == 'C') $('#pd_legend').show();
                else if (counter == 1) counter = 0;
            }
        } else {
            var prop = wmgui.thumbed_display ? $('div.busy_entry > div.gallery_img > div').text().split(';')[0] : $('tr.busy_entry > td.c2').text().split(';')[0];

            $.each(data.out.sim, function(k, row){
                if (counter == 8) return false;
                sim_html += '<li><a href="#search/' + prop + ' ' + row[1] + '">' + row[0] + '</a></li>';
                counter++;
            });
        }

        if (counter){
            if (allpurpose)         $('#sim_legend').removeClass('apparent').text('Also studied by these authors:');
            else if (entype == 'C') $('#sim_legend').removeClass('apparent').text('Phases at the diagram:');
            else if (entype == 'S') $('#sim_legend').removeClass('apparent').text('The same prototype structures:');
            else                    $('#sim_legend').removeClass('apparent').text('Similar ' + prop + ':');

            if (counter > 7){
                $('#sim_trigger').attr('href', '#interlinkage/' + entry).show();
            }
            $('#sim_col > ul').html(sim_html);

        } else {
            if (allpurpose)
                $('#sim_legend').addClass('apparent').text('No cross-links found');

            else if (entype == 'C' && rank == 3){
                var els,
                    html_3d = '';

                if (wmgui.thumbed_display){
                    els = $('div.busy_entry > div.gallery_img > p').text().split('-');
                } else {
                    els = $('tr.busy_entry > td.c2').text().replace('; ', '').split(' ');
                    els = els[els.length - 1].split('-');
                }
                if (els.length == 3 || els.length == 4)
                    html_3d = '<br /><br /><a href="#inquiry/classes=' + (els.length == 3 ? 'prism' : 'tetrahedron') + '&props=phase%20diagram&elements=' + els.join('-') + '"><img alt="3d" src="' + wmgui.static_host + '/' + (els.length == 3 ? 'prism' : 'tetrahedron') + '.png" /><br /><span>3d phase diagram</span></a>';

                $('#sim_legend').addClass('apparent').html('<br /><a href="#entry/' + entry.split('-')[0] + '"><img alt="C-entry" src="' + wmgui.static_host + '/pd_thumbs/' + entry.split('-')[0] + '.png" /><br /><span>Full phase diagram</span></a>' + html_3d);

            } else if (entype == 'C' && rank == 5)
                $('#sim_legend').addClass('apparent').text('No links to other phases found.');

            else if (entype == 'C' && rank == 12)
                $('#sim_legend').addClass('apparent').text('Hover the binary or ternary diagrams for more data.');

            else if (entype == 'S')
                $('#sim_legend').addClass('apparent').text('No other structures for this prototype found.');

            else
                $('#sim_legend').addClass('apparent').text('No similar values found.');
        }

        if (data.out.own.length && !wmgui.search.phid)
            $('#own_phase').html('<a href="#phase_id/' + data.out.own[0][1] + '"><img alt="Phase" src="' + wmgui.static_host + '/rd_thumbs/' + data.out.own[0][0] + '.png" /><br /><span>Linked ' + (entype == 'S' ? 'distinct phase' : 'crystalline structure') + '</span></a>').show();

    }).fail(function(xhr, textStatus, errorThrown){
        if (textStatus != 'abort')
            notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
    });
}
window.open_sim_col = open_sim_col;
wmgui.open_sim_col = open_sim_col;

function show_dunit_info(phid, bid, entry){
    if (phid){
        $('#ind_title').html('Phase ' + phid);
        $('#ind_link').attr('href', 'https://mpds.io/phase_id/' + phid).html('www.mpds.io/phase_id/' + phid);
    } else if (bid){
        $('#ind_title').html('Publication B' + bid);
        $('#ind_link').attr('href', 'https://mpds.io/article/' + bid).html('www.mpds.io/article/' + bid);
    } else if (entry){
        $('#ind_title').html('Entry ' + entry);
        $('#ind_link').attr('href', 'https://mpds.io/entry/' + entry).html('www.mpds.io/entry/' + entry);
    }
    $('#refine_col, #ctx_col').hide();
    $('#phase_info, #ind_col > span').empty();
    if (phid){
        $('#ind_col > span').html('<img src="' + wmgui.static_host + '/phid_thumbs/' + phid + '.png" />');
        wmgui.active_ajax = $.ajax({
            type: 'GET', url: wmgui.phase_endpoint, data: {phid: phid}
        }).done(function(data){
            if (data.error) return notify(data.error);
            var html = '<h4>' + data.out.formula_html.split(' ')[0] + ' ' + (data.out.spg || '?') + ' ' + (data.out.pearson || '&mdash;') + '</h4>';
            if (data.out.mpid) html += '<h4 style="background:#ddd;margin-top:-7px;">Materials Project <a target="_blank" href="https://materialsproject.org/materials/mp-' + data.out.mpid + '">mp-' + data.out.mpid + '</a></h4>';
            html += '<p>';
            if (data.out.articles_count) html += 'This phase was reported in ' + data.out.articles_count + ' article' + (data.out.articles_count > 1 ? 's' : '') + '.';
            if (data.out.sim_count > 1) html += ' There are <a href="#interlinkage/' + phid + '">' + data.out.sim_count + ' structurally similar phases</a> from other articles.';
            html += '</p>';
            $('#phase_info').html(html);
            $('#dtypes_phid').show();
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Sorry, a network error occured. Please, try again');
        });
    } else if (bid){
        $('#ind_col > span').html('<strong>&#x1f4d6;</strong>');
        $('#phase_info').html('<h4>Ref. ' + bid + '</h4><p>Please make sure you are<br /><a href="#modal/menu">logged in</a> to see all the details.</p>');
        wmgui.active_ajax = $.ajax({
            type: 'GET', url: wmgui.refs_endpoint + '?noredir=1&fmt=bib&ref_id=' + bid + '&sid=' + wmgui.sid
        }).done(function(data){
            var citation = wmgui.parse_bib(data), citation_html = '', main_author = '', links_html = '';
            if (citation[0].length){
                citation[0].split(',').forEach(function(item, index){
                    var author_name = item.trim().split('.')[0]; author_name = author_name.substr(0, author_name.length - 2).replace("'", "");
                    if (index === 0) main_author = author_name;
                    links_html += '<a href="#inquiry/authors=' + author_name + '" style="color:#777;border-bottom-color:#777;">' + author_name + '</a> or ';
                });
                links_html = links_html.substr(0, links_html.length - 4);
                if (citation[0].indexOf(',') !== -1) main_author += ' et al.';
                citation_html += ' <a href="' + wmgui.refs_endpoint + '?fmt=bib&ref_id=' + bid + '&sid=' + wmgui.sid + '">' + main_author + ', ' + citation[1] + '. ' + citation[2] + ' <i>(' + citation[3] + ')</i></a>';
            }
            if (bid == 999999) $('#phase_info').html('<h4>In-house data</h4><p>These data were generated automatically on the MPDS platform based on the original peer-reviewed Pauling File data. Please cite as ' + citation_html + '.</p>');
            else {
                var n_entries = wmgui.thumbed_display ? $('div.gallery_item').length : $('tr.tcell').length;
                if (n_entries == 1000) n_entries = 'more than ' + n_entries;
                $('#phase_info').html('<h4>Ref. ' + bid + '</h4><p>We have ' + (n_entries == 1 ? 'one entry' : n_entries + ' entries') + ' from this reference' + citation_html + '.</p>' + (links_html.length ? '<p>Retrieve all data co-authored by ' + links_html + '.</p>' : ''));
            }
        }).fail(function(xhr, textStatus, errorThrown){});
    } else {
        $('#ind_col > span').html('<strong>&#x1f52c;</strong>');
    }
    $('#ind_col').show();
    $('#dtypes').hide();
}
window.show_dunit_info = show_dunit_info;
wmgui.show_dunit_info = show_dunit_info;

function show_hints(disabled, res_count){
    if (disabled || wmgui.search.numeric || wmgui.search.doi || wmgui.search.phid || wmgui.search.bid || wmgui.fuzzyout || wmgui.search_type == 2)
        return;
    var cur_obj = {}; $.extend(cur_obj, wmgui.search);
    delete cur_obj.ignored; delete cur_obj.search_type;
    var hint = JSON.stringify(cur_obj).replaceAll(' ', '+').replace('\{', '\\{').replace('\}', '\\}');
    $('#apihint span').html(hint).parent().show();
    if (wmgui.search_type === 0 && (res_count > 3 || res_count === undefined)){
        $('a.plthint_links').each(function(){
            var that = $(this), plot_type = that.attr('rev');
            that.attr('href', wmgui.gui_host + window.location.pathname + '#plot/' + plot_type + '/' + window.location.hash.substr(1));
        });
        $('#plthint').show();
    }
}
window.show_hints = show_hints;
wmgui.show_hints = show_hints;

function launch_db_iframed(rank){
    var that = $('.busy_entry');
    if (!that.length) return;

    var entry = that.attr('id').substr(3),
        entype = entry.substr(0, 1),
        iframe_src,
        iframe_height;

    if (entype == 'S'){
        if (rank == 99){
            iframe_src = wmgui.engines_addrs['visavis'] + wmgui.path_s_xrpd + entry, iframe_height = 550;
        } else
            iframe_src = wmgui.engines_addrs['cifplayer'] + wmgui.path_s_entry + entry, iframe_height = 650;

    } else if (entype == 'P'){
        if (rank == 1){
            iframe_src = wmgui.engines_addrs['visavis'] + wmgui.path_pp_plot + entry, iframe_height = 550;
            notify('P-curves are in beta-testing');
        } else if (rank == 4)
            iframe_src = wmgui.engines_addrs['visavis'] + wmgui.path_sd_plot + entry, iframe_height = 550;
        else if (rank == 9)
            iframe_src = wmgui.v_pd_user_addr + wmgui.api_host + '/download/p?fmt=png&q=' + entry, iframe_height = 600;
        else if (rank == 10)
            iframe_src = wmgui.v_ab_vis_addr + entry, iframe_height = 600;
        else return;

    } else {
        if (rank == 12){
            var triple = wmgui.thumbed_display ? $('div.busy_entry > div.gallery_img > p').text() : $('tr.busy_entry > td.c1').text().split(' ')[0];
            iframe_src = wmgui.v_pd_3d_addr + triple, iframe_height = 550;
        } else if (rank == 6)
            iframe_src = (wmgui.sid ? wmgui.v_pd_user_addr + wmgui.api_host + '/download/c?fmt=png&q=' : wmgui.engines_addrs['visavis'] + wmgui.path_c_entry) + entry, iframe_height = 600;
        else return;

        if (wmgui.entries_messages[entry])
            notify(wmgui.entries_messages[entry]);
    }

    if (wmgui.sid) iframe_src += '&sid=' + wmgui.sid;

    var iframe_html = '<iframe frameborder=0 scrolling="no" width="100%" height="' + iframe_height + '" src="' + iframe_src + '"></iframe>';
    if (wmgui.thumbed_display) iframe_html = '<div id="iframe" style="display:block;width:100%;border:1px solid #ddd;margin:10px 0;">' + iframe_html + '</div>';
    else                       iframe_html = '<tr id="iframe"><td colspan="20" style="width:100%;padding:0;border-right:1px solid #eee;border-left:1px solid #eee;">' + iframe_html + '</td></tr>';

    that.after(iframe_html);
    $(window).scrollTop(that.position().top - 95);
}
window.launch_db_iframed = launch_db_iframed;
wmgui.launch_db_iframed = launch_db_iframed;

export { build_cells, build_thumbs, open_context, open_sim_col, show_dunit_info, show_hints, launch_db_iframed };