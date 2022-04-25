
"use strict";

var wmgui = window.wmgui || {};

wmgui.notify = function (msg) {
    var delay = 0;
    if (wmgui.notify_counter) {
        clearInterval(wmgui.notify_counter);
        wmgui.notify_counter = null;
        delay = 1500;
    }
    setTimeout(function () {
        $('#notifybox').html(wmgui.clean(msg)).show();
        wmgui.notify_counter = setTimeout(function () { $('#notifybox').hide(); }, 5000);
    }, delay);
};

// external API function
wmgui.aug_search_cmd = function (new_fct, new_val) {

    // Take care of mutually exclusive facets
    var checks = [['elements', 'formulae'], ['formulae', 'elements'], ['lattices', 'sgs'], ['sgs', 'lattices'], ['protos', 'sgs'], ['sgs', 'protos'], ['lattices', 'protos'], ['protos', 'lattices']];
    for (var i = 0; i < checks.length; i++) {
        if (wmgui.search[checks[i][0]] && new_fct == checks[i][1]) { delete wmgui.search[checks[i][0]]; break; }
    }

    var inquiry_mode = false;

    $.each(wmgui.inquiries, function (n, fct) {
        if (wmgui.search[fct] || fct == new_fct) {
            inquiry_mode = true;
            return false;
        }
    });

    if (inquiry_mode) {

        var new_search_obj = {};

        $.each(wmgui.facets, function (n, fct) {
            if (wmgui.search[fct] && fct == new_fct) {
                if (wmgui.multi_facets.indexOf(fct) !== -1)
                    new_search_obj[fct] = wmgui.search[fct] + ',' + new_val;
                else
                    new_search_obj[fct] = new_val;

            } else if (wmgui.search[fct]) {
                new_search_obj[fct] = wmgui.search[fct];

            } else if (fct == new_fct) {
                new_search_obj[fct] = new_val;
            }
        });
        return '#inquiry/' + $.param(new_search_obj);

    } else {

        var link_base = '';

        $.each(wmgui.facets, function (n, fct) {
            if (wmgui.search[fct] && fct == new_fct) {
                if (fct == 'classes')
                    link_base += wmgui.search[fct] + ' ' + new_val + ' ';
                else
                    link_base += new_val + ' ';

            } else if (wmgui.search[fct]) {
                link_base += wmgui.search[fct] + ' ';

            } else if (fct == new_fct) {
                link_base += new_val + ' ';
            }
        });
        return '#search/' + link_base.substr(0, link_base.length - 1);
    }
};

// reading the selectize at the main search input (landing)
wmgui._selectize_read_main = function () {
    var result = {};

    $('#search_holder div.selectize-input.items').children().each(function () {
        if (this.tagName !== 'DIV')
            return;

        var facet = this.getAttribute('data-facet');

        if (wmgui.other_facets.indexOf(facet) !== -1 && wmgui.search[facet])
            result[facet] = wmgui.search[facet];

        else if (facet == 'numeric') {
            if (wmgui.search[facet]) {
                result[facet] = '';
                wmgui.search[facet].forEach(function (item) {
                    result[facet] += serialize_numeric.apply(this, item); // unpack
                });
                if (result[facet].length) result[facet] = result[facet].substr(0, result[facet].length - 1);
            } // NB else just skip!
        }

        else if (result[facet] && facet == 'elements')
            result[facet] += '-' + this.getAttribute('data-term');

        else if (result[facet] && wmgui.multi_facets.indexOf(facet) !== -1)
            result[facet] += ', ' + this.getAttribute('data-term');

        else if (facet == 'formulae')
            result[facet] = this.getAttribute('data-term').replaceAll('<sub>', '').replaceAll('</sub>', '');

        else
            result[facet] = this.getAttribute('data-term');
    });

    return result;
};

// reading the selectize at the *wmgui.multi_facets* categories
wmgui._selectize_read_facet = function (fct) {
    var result = {},
        selector = 'div.advs_' + fct;

    $(selector + ' div.selectize-input.items').children().each(function () {
        if (this.tagName !== 'DIV')
            return;

        var facet = this.getAttribute('data-facet');

        if (result[facet])
            result[facet] += ', ' + this.getAttribute('data-term');
        else
            result[facet] = this.getAttribute('data-term');
        return;
    });

    return result;
};


wmgui._selectize_write = function ($this, name, search_obj) {

    wmgui.selectize_emit = false;

    var given_search = {};
    $.extend(given_search, search_obj);

    if (name == 'main') {
        name = ['formulae', 'props', 'elements', 'classes', 'lattices', 'aetypes'];

        for (var i = 0; i < wmgui.other_facets.length; i++) {
            if (given_search[wmgui.other_facets[i]]) {
                $this.display(wmgui.other_facets[i], wmgui.facet_names[wmgui.other_facets[i]].toLowerCase()); // stub display
            }
        }

        // numerics
        if (given_search.numeric) $this.display('numeric', 'range search');

    } else name = [name];

    name.forEach(function (facet) {
        // facets supported for multiselect autocomplete
        if (!given_search[facet])
            return;

        else if (facet == 'elements' && given_search[facet].indexOf('-') > 0) {
            given_search[facet].split('-').forEach(function (part) {
                $this.display(facet, part);
            });
        } else if (wmgui.multi_facets.indexOf(facet) !== -1 && given_search[facet].indexOf(',') > 0) {
            given_search[facet].split(',').forEach(function (part) {
                $this.display(facet, part);
            });
        } else if (facet == 'formulae') {
            given_search[facet] = wmgui.to_formula(given_search[facet]);
            $this.display(facet, given_search[facet]);

        } else $this.display(facet, given_search[facet]);
    });

    $this.clearOptions();
    wmgui.selectize_emit = true;
};

wmgui._selectize_display = function ($this, facet, term) {
    var random_id = Math.floor((Math.random() * 1000));
    $this.addOption({ facet: facet, label: term, id: random_id });
    $this.addItem(random_id);
};

function show_interpretation(search) {
    // FIXME only allow fixed props
    $('#interpret').html(
        wmgui.clean(wmgui.get_interpretation(search, wmgui.facet_names, wmgui.numerics))
    );
}

function re_view_request(search_type) {
    var pseudo_input = [];
    $.each(wmgui.search, function (k, v) {
        if (k == 'search_type') return true;
        pseudo_input.push(v);
    });
    if (!pseudo_input.length) return;

    wmgui.search_type = search_type;
    wmgui.search.search_type = search_type;
    request_search(wmgui.search, pseudo_input.join(" "), true);
}

async function request_search(search, caption, without_history) {
    if (manage_visavis(rebuild_history_box, search, caption)) return;

    try {
        wmgui.show_preloader();

        const url = `${wmgui.srch_endpoint}?q=${JSON.stringify(search)}&sid=${wmgui.sid}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // 'Content-Type': 'application/json'
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });
        const data = await response.json();

        wmgui.hide_preloader();

        if (data.error)
            return wmgui.notify(data.error);

        caption = caption.replaceAll('%2F', '/');

        if (!data.out.length)
            return wmgui.notify('No results for <b>' + caption + '</b>');

        wmgui.fuzzyout = false;
        if (data.fuzzy_notice) {
            wmgui.fuzzyout = true;
            wmgui.notify(data.fuzzy_notice);
        }

        var res_str = (data.estimated_count == 1) ? ' result' : ' results',
            notice = (data.estimated_count > 150) ? 'At least ' : '';
        document.title = notice + data.estimated_count + res_str; // + ' (' + wmgui.estimate + ')';
        //console.log('Obtained: '+data.estimated_count+', expected: '+wmgui.estimate);
        switch_view_mode(2);

        if (!wmgui.chosen_table_browser) // TODO add smarter check?
            wmgui.thumbed_display = (data.out.length > wmgui.ntab_tolerance);

        if (wmgui.thumbed_display) {
            var $db = $('#databrowser');
            $db.removeClass().addClass('thumbed').empty().append('<tr><td>' + build_thumbs(data.out) + '</td></tr>');
            $('#results').slideDown(250);

        } else {
            var $db = $('#databrowser');
            $db.removeClass().addClass('tabled').empty().append(build_cells(data.out, '<tbody>', '</tbody>'));
            $('#results').slideDown(250);

            if (wmgui.search_type == 2) {
                $db.addClass('tablesorter').tablesorter({
                    sortMultiSortKey: 'ctrlKey', headers: {
                        0: { sorter: 'doi' },
                        6: { sorter: 'digit' }
                    }, selectorHeaders: '#dataheader_articles > thead > tr > th', selectorHeaderParent: 'dataheader_articles'
                });
                $('#header_articles').show();

            } else if (wmgui.search_type == 1) {
                $db.addClass('tablesorter').tablesorter({
                    sortMultiSortKey: 'ctrlKey', headers: {
                        0: { sorter: 'chemical' },
                        1: { sorter: 'digit' },
                        2: { sorter: 'digit' },
                        3: { sorter: 'digit' },
                        4: { sorter: false }
                    }, selectorHeaders: '#dataheader_phases > thead > tr > th', selectorHeaderParent: 'dataheader_phases'
                });
                $('#header_phases').show();

            } else {
                $db.addClass('tablesorter').tablesorter({
                    sortMultiSortKey: 'ctrlKey', headers: {
                        0: { sorter: 'chemical' },
                        1: { sorter: false },
                        5: { sorter: 'doi' }
                    }, selectorHeaders: '#dataheader_entries > thead > tr > th', selectorHeaderParent: 'dataheader_entries'
                });
                $('#header_entries').show();
            }
        }

        // count & show ctx
        wmgui.unfinished_page = false;
        if (wmgui.search_type || search.phid) {
            if (data.estimated_count >= (wmgui.quick_page_size * 3)) $('#toomuch span').html('other').parent().show();
            show_hints(search.entry || search.interlinkage);

        } else {
            if (data.estimated_count > wmgui.quick_page_size + wmgui.fetch_page_size) {
                $('#toomuch span').html('nearly ' + (data.estimated_count - wmgui.quick_page_size)).parent().show();
                show_hints(search.entry);

            } else if (data.estimated_count > wmgui.quick_page_size) {
                $('#loadscroll').show();
                wmgui.unfinished_page = true;

            } else show_hints(search.entry);
        }

        // switchers
        if (wmgui.visavis_terminating) stop_visavis();

        if (wmgui.search_type || search.phid || search.entry || search.interlinkage || search.doi || search.numeric) {

            if (search.phid || search.entry) {
                switch_control_mode(9, 11, 'a', 'c');
                $('#ind_title').html(search.phid ? 'Phase ' + search.phid : 'Entry ' + search.entry);
                $('#ind_link').attr('href', 'https://mpds.io/' + (search.phid ? 'phase_id' : 'entry') + '/' + (search.phid || search.entry));
                $('#ind_link').html('www.mpds.io/' + (search.phid ? 'phase_id' : 'entry') + '/' + (search.phid || search.entry));
                $('#refine_col, #ctx_col').hide();
                $('#ind_col').show();

            } else if (search.interlinkage) {
                switch_control_mode(9, 11, 'a', 'c');
                display_examples('#examples', true, true);

            } else if (search.numeric) {
                switch_control_mode(1, 12, 'b', false);
                //console.log(search.numeric);
                destroy_numericbox();
                $.each(get_sliders_ranges(search.numeric, wmgui.numerics), function (n, item) { create_floating_slider.apply(this, item); }); // unpack
                display_examples('#examples', true, true);

            } else {
                switch_control_mode(1, 10, false, false);
                display_examples('#examples', true, true);
            }

            if (search.entry && (search.entry.substr(0, 1) == 'S' || search.entry.substr(0, 1) == 'C') && search.entry.indexOf('-') == -1) {
                var that = $('#e__' + search.entry);
                if (that.length && that.attr('data-rank') != 0) { // NB "!=", not "!=="
                    that.removeClass('busy_entry');
                    open_context(that, true);
                }
            }

        } else {
            wmgui.fuzzyout ? switch_control_mode(1, 11, 'a', false) : switch_control_mode(0, 10, false, false);
            request_refinement(search, (data.estimated_count > wmgui.quick_page_size));
        }

        //console.log(search);
        if (!search.numeric) {
            destroy_numericbox();
            delete wmgui.search.numeric;
        }
        if (search.props && wmgui.numerics[search.props]) { // making a hint
            var prop_id = data[0],
                units = data[1],
                min = data[2],
                max = data[3],
                step = data[4];
            create_floating_slider(search.props, prop_id, units, min, max, step);
        }
        if (!without_history) rebuild_history_box(search, caption);
    } catch (e) {
        console.log(e);
        wmgui.hide_preloader();
        if (e.text != 'abort') wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
    } finally {
        wmgui.hide_preloader();
    }
}

function rebuild_history_box(search, caption) {
    var orepr = {};
    wmgui.facets.forEach(function (item) {
        if (search[item]) orepr[item] = search[item];
    });

    var inquiry = false;
    $.each(wmgui.inquiries, function (m, i) { if (orepr[i]) { inquiry = true; return false; } });

    var title = [];
    for (var prop in orepr) { title.push(orepr[prop].toLowerCase()); }
    title.sort();
    var fingerprint = title.join(" "),
        search_log = JSON.parse(window.localStorage.getItem(wmgui.storage_history_key) || '[]'),
        chk_searches = [];
    if (search_log.length > 8) search_log = search_log.slice(0, 7);
    $.each(search_log, function (n, item) {
        var title = [];
        for (var p in item) { title.push(item[p].toLowerCase()); }
        title.sort();
        chk_searches.push(title.join(" "));
    });
    if (chk_searches.indexOf(fingerprint) == -1) {
        var item;
        if (inquiry) item = '<a href="#inquiry/' + $.param(orepr) + '">' + caption + '</a>';
        else item = '<a href="#search/' + escape(caption) + '">' + caption + '</a>';

        $('#history ul').prepend('<li>' + wmgui.clean(item) + '</li>');
        search_log.unshift(orepr);
        window.localStorage.setItem(wmgui.storage_history_key, JSON.stringify(search_log));
        if ($('#history ul li').length > 8) $('#history ul li:last').remove();
    }
    wmgui.tooltip_counter++;
    if (wmgui.tooltip_counter == 1) {
        setTimeout(function () { show_tooltip(wmgui.tooltips['interpretation']); }, 3000);
    }
}

function rebuild_visavis() {
    var extr = window.location.hash.indexOf('search/');
    if (extr == -1) {
        var extr = window.location.hash.indexOf('inquiry/');
        if (extr == -1) return;
    }

    var query = window.location.hash.substr(extr);

    $('a.pltcol_links').each(function () {
        var that = $(this),
            plot_type = that.attr('rev');
        that.attr('href', wmgui.gui_host + window.location.pathname + '#plot/' + plot_type + '/' + query);
    });

    $('#visavis_col > ul > li').removeClass('embodied');
    $('#pltchoice_' + wmgui.visavis_curtype).addClass('embodied');

    // ctx reset
    if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) > -1)
        update_dc();

    if (wmgui.visavis_curtype == 'matrix') {
        $('#ctxpanel_matrix > ul > li.embodied').removeClass('embodied');
        var y_id = $('#ctxpanel_matrix > ul > li.ss_y');
        if (y_id.length) y_id.removeClass('ss_y');
        $('#vismatrix_nump').addClass('embodied'); // set the default sort order (also in Visavis: TODO)
        $('span.sops').remove();

    } else if (wmgui.visavis_curtype == 'cube') {
        $('#ctxpanel_cube > ul > li.embodied').removeClass('embodied');
        var y_id = $('#ctxpanel_cube > ul > li.ss_y'),
            z_id = $('#ctxpanel_cube > ul > li.ss_z');
        if (y_id.length) y_id.removeClass('ss_y');
        if (z_id.length) z_id.removeClass('ss_z');
        $('#viscube_nump').addClass('embodied');
        $('span.sops').remove();

    } else if (wmgui.visavis_curtype == 'graph') {
        $('#ctxpanel_graph > ul > li.embodied').removeClass('embodied');
        $('#visgraph_props').addClass('embodied');
    }

    try {
        document.getElementById('visavis_iframe').contentWindow.fixel_manage(wmgui.visavis_curtype == 'cube' && wmgui.search.elements);
    } catch (e) {
        console.error('No iframe access');
    }
}

function rotate_interesting() {
    $('#legend').html('<i>e.g.</i> <a href="#">' + wmgui.get_interesting()['text'].replace(/\d/g, "&#x208$&;") + '</a>');
}

function display_examples(box, more_examples, fix_rfn_header) {
    if (wmgui.cliff_counter === null) wmgui.cliff_counter = Math.floor(Math.random() * wmgui.cliffhangers.length);
    var html = '';
    for (var i = 0; i < (more_examples ? 12 : 3); i++) {
        wmgui.cliff_counter += 1;
        if (wmgui.cliff_counter > wmgui.cliffhangers.length - 1) wmgui.cliff_counter = 0;
        html += '<li><a href="#search/' + wmutils.termify_formulae(wmgui.cliffhangers[wmgui.cliff_counter]) + '">' + wmgui.cliffhangers[wmgui.cliff_counter].charAt(0).toUpperCase() + wmgui.cliffhangers[wmgui.cliff_counter].slice(1) + '</a></li>';
    }
    $(box + ' > ul').empty().append(html);
    $(box).show();

    if (fix_rfn_header) {
        $('#refine_col > div.col_title, #refine_col > ul').hide();
        $('#refine_col').show();
    }
}

function arrange_menu_collateral() {
    $('#hintsbox_msg, #tagcloudbox').empty();

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
        links_html += '<a' + target + ' href="' + wmgui.collateral_links[i][0] + '"' + (cls ? ' class="' + cls + '"' : '') + (rel ? ' rel=' + rel : '') + '>' + wmgui.collateral_links[i][2] + '</a>' + lbr;
    };
    $('#tagcloudbox').append(links_html);

    $('#hintsbox_msg').append(wmgui.get_random_term(wmgui.welcome_msgs));
}

function switch_view_mode(mode) {
    wmgui.view_mode = mode;
    $('div.autocomplete-suggestions').hide();
    $('#results, #header_entries, #header_phases, #header_articles').hide();
    $('div.context_msg').hide();
    close_vibox();

    if (mode == 1) {
        stop_visavis();
        document.title = 'Materials Platform for Data Science';
        $('body').addClass('noscroll');
        $('#search_box').removeClass('fluid').css('background', 'none').css("width", "590px");

        $('div.side_cols').hide();

        $('#landing_box, #intro_stats, #subnav, #legend').show();

        $('#search_holder').removeClass('prolonged').focus();
        $('#search_area').removeClass('prolonged');
        $('#ermac_logo').removeClass('cornered');

        if (wmgui.ptable.enabled) {
            $('#hierarchy_trigger').hide();
            $('#ptable_trigger').show();

            if (wmgui.ptable.visible) {
                wmgui.ptable.show();
                $('#ermac_logo').addClass('shifted');

            } else {
                wmgui.ptable.hide();
            }
        }

    } else if (mode == 2) {
        $('#landing_box, #intro_stats, #subnav, #legend').hide();
        $('#ctx_col').hide();
        if (wmgui.passive_sim_col) $('#sim_col').hide();

        $('body').removeClass('noscroll');
        $('#search_box').css('background', '#fff').css("width", "100%").addClass('fluid');

        $('#right_col').show();
        $('#search_holder, #search_area').addClass('prolonged');
        $('#ermac_logo').removeClass('shifted').addClass('cornered');

        if (wmgui.ptable.enabled) {
            $('#hierarchy_trigger').show();
            $('#ptable_trigger').hide();
            wmgui.ptable.hide();
        }
    }
}

function switch_control_mode(mode, next_mode, active_abf, active_cde) { // NB (0, 10) is the most common 6-button layout
    if (mode == 0) { // cde, second
        $('#control_c, #control_d, #control_e').css('width', '33.3%').show();

    } else if (mode == 1) { // cde, second
        $('#control_e').hide();
        $('#control_c, #control_d').css('width', '50%').show();

    } else if (mode == 9) { // cde, second
        $('#control_e, #control_d').hide();
        $('#control_c').css('width', '100%').show();

    } else if (mode == 10) { // abf, first
        $('#control_a, #control_b, #control_f').css('width', '33.3%').show();

    } else if (mode == 11) { // abf, first
        $('#control_b, #control_f').hide();
        $('#control_a').css('width', '100%').show();

    } else if (mode == 12) { // abf, first
        $('#control_a, #control_f').hide();
        $('#control_b').css('width', '100%').show();
    }
    if (!next_mode) return;

    if (!active_abf) active_abf = ({ 0: 'a', 1: 'b', 2: 'f' })[wmgui.search_type];
    if (!active_cde) active_cde = wmgui.thumbed_display ? 'd' : 'c';

    $('div.controlswitch > div').removeClass();
    $('#control_' + active_abf + ', #control_' + active_cde).addClass('active');

    switch_control_mode(next_mode);
}

function build_cells(json, header, footer) {
    var cls_map = { 7: ' ml_data', 8: ' ab_data', 9: ' ab_data', 10: ' ab_data', 11: ' ab_data' }, // NB space
        result_html = '';
    if (header) result_html += header;

    if (wmgui.search_type == 2) {
        if (json[0].length != 6) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        $.each(json, function (k, row) {
            row[0] = parseInt(row[0]);
            if (row[0] == 999999) row[4] = wmgui.mockyear; // special *ref_id*, only handled in GUI
            result_html += '<tr id="e__B' + row[0] + '" class="tcell" data-type="B"><td class=c55>[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[0]) > -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[0] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[0] + '" target="_blank" rel="noopener noreferrer">' + row[0] + '</a>]</td><td class=a1>' + row[1] + '</td><td class=a2 title="' + row[2] + '">' + row[2] + '</td><td class=a5>' + row[5] + '</td><td class=cj>' + row[3] + '</td><td class=c4>' + row[4] + '</td></tr>';
        });
    } else if (wmgui.search_type == 1) {
        if (json[0].length != 5) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        $.each(json, function (k, row) {
            result_html += '<tr id="e__Z' + row[0] + '" class="tcell" data-type="Z"><td class=p1>' + row[1] + '</td><td class=p2>' + row[2] + '</td><td class=p3>' + row[3] + '</td><td class=p4>' + row[4] + '</td><td class=p5><a class=launch_ph href="#phase_id/' + row[0] + '">Show entries</a></td></tr>';
        });
    } else {
        if (json[0].length != 8) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        $.each(json, function (k, row) {
            row[7] = parseInt(row[7]);
            var dtype = row[0].substr(0, 1),
                preview = (row[3] == 4 || row[3] == 5 || row[3] == 6 || row[3] == 9 || row[3] == 10) ? '<span class=launch_v>Show</span>' : ' ',
                biblio_html = (row[7] == 999999) ? '<td class=cj>&mdash;</td><td class=c4>' + wmgui.mockyear + '</td><td class=c5>&mdash;</td>' :
                    '<td class=cj>' + row[5] + '</td><td class=c4>' + row[6] + '</td><td class=c5>[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[7]) > -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[7] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[7] + '" target="_blank" rel="noopener noreferrer">' + row[7] + '</a>]</td>'; // special *ref_id*, only handled in GUI

            result_html += '<tr id="e__' + row[0] + '" class="tcell' + (cls_map[row[3]] || '') + (row[4] ? ' opened' : '') + '" data-type="' + dtype + '" data-rank="' + row[3] + '" title="Click for more info"><td class=c1>' + row[1] + '</td><td class=cp>' + preview + '</td><td class=c2>' + row[2] + '</td>' + biblio_html + '</tr>';
        });
    }
    if (footer) result_html += footer;
    return result_html;
}

function build_thumbs(json) {
    var cls_map = { 6: ' pd_full', 7: ' ml_data', 8: ' ab_data', 9: ' ab_data', 10: ' ab_data', 11: ' ab_data' }, // NB space
        result_html = '';

    if (wmgui.search_type == 2) {
        if (json[0].length != 6) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function (a, b) {
            return a[4] > b[4] ? 1 : a[4] < b[4] ? -1 : 0; // pubyear
        });
        var title_html = '',
            full_display = !!wmgui.sid;
        $.each(json, function (k, row) {
            row[0] = parseInt(row[0]);
            if (row[0] == 999999) row[4] = wmgui.mockyear; // special *ref_id*, only handled in GUI
            if (full_display) title_html = (row[1].length > 60 ? row[1].substr(0, 60) + '&hellip;' : row[1]) + ', <span>' + (row[2].length > 80 ? row[2].substr(0, 80) + '&hellip;' : row[2]) + '</span>';
            else title_html = '<br /><br />&#x1f4d6;'; // book icon
            result_html += '<div class="gallery_item" id="e__B' + row[0] + '" data-type="B"><div class="gallery_img"><div class="articled">' + title_html + '</div></div><div class="gallery_label"><i>' + row[5] + '</i><br />[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[0]) > -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[0] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[0] + '" target="_blank" rel="noopener noreferrer">' + row[3] + '&rsquo;' + row[4].toString().substr(2, 2) + '</a>]</div></div>';
        });
    } else if (wmgui.search_type == 1) {
        if (json[0].length != 5) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function (a, b) {
            return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
        });
        $.each(json, function (k, row) {
            result_html += '<div class="gallery_item" id="e__Z' + row[0] + '" data-type="Z"><div class="gallery_img"><div class="phased">' + row[1] + '<br /><br />space group ' + row[2] + '</div></div><div class="gallery_label"><a class=launch_ph href="#phase_id/' + row[0] + '">Show ' + row[3] + (row[3] == 1 ? ' entry' : ' entries') + '</a><br />Publications: ' + row[4] + '</div></div>';
        });
    } else {
        if (json[0].length != 8) { wmgui.notify('Rendering error, please try to <a href=javascript:location.reload()>reload</a>'); return ''; }

        json.sort(function (a, b) {
            var dtype_a = a[0].substr(0, 1),
                dtype_b = b[0].substr(0, 1);
            if (dtype_a == 'S') {
                if (dtype_b == 'S') return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
                return -1;
            }
            if (dtype_a == 'C') {
                if (dtype_b == 'C') return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
                if (dtype_b == 'S') return 1;
                if (dtype_b == 'P') return -1;
            }
            if (dtype_a == 'P') {
                if (dtype_b == 'P') return a[2].toUpperCase() > b[2].toUpperCase() ? 1 : a[2].toUpperCase() < b[2].toUpperCase() ? -1 : 0;
                return 1;
            }
        });
        $.each(json, function (k, row) {
            row[7] = parseInt(row[7]);
            var dtype = row[0].substr(0, 1),
                content,
                biblio_html = (row[7] == 999999) ? '<br />&mdash;' :
                    '<br />[<a class="resolve_ref' + ((wmgui.bid_history.indexOf(row[7]) > -1) ? ' visited' : '') + '" href="' + wmgui.refs_endpoint + '?ref_id=' + row[7] + '&sid=' + wmgui.sid + '&ed=' + wmgui.edition + '" rel="' + row[7] + '" target="_blank" rel="noopener noreferrer">' + row[5] + '&rsquo;' + row[6].toString().substr(2, 2) + '</a>]'; // special *ref_id*, only handled in GUI

            if (dtype == 'P')
                content = '<div>' + row[2] + '</div>';
            else if (dtype == 'S')
                content = '<img alt="' + row[0] + '" src="' + wmgui.static_host + '/rd_thumbs/' + row[0].split('-')[0] + '.png" />';
            else {
                row[2] = row[2].split(';')[0];
                row[2] = row[2].split(' ')[row[2].split(' ').length - 1]; // FIXME!
                content = '<img alt="' + row[0] + '" src="' + wmgui.static_host + '/pd_thumbs/' + row[0].split('-')[0] + '.png" /><p>' + row[2] + '</p>';
            }
            result_html += '<div class="gallery_item' + (cls_map[row[3]] || '') + (row[4] ? ' opened' : '') + '" id="e__' + row[0] + '" data-type="' + dtype + '" data-rank="' + row[3] + '" title="Click for more info"><div class="gallery_img">' + content + '</div><div class="gallery_label">' + row[1] + biblio_html + '</div></div>';
        });
    }
    return result_html;
}

async function request_refinement(query_obj, is_heavy) {
    $('#examples, #ind_col').hide();
    $('#refine_col > ul').empty().parent().show();
    $('#refine_col > div.col_title').show();

    var given_search = { is_heavy: is_heavy };
    $.extend(given_search, query_obj);

    try {
        $('#rfn_preloader').show();

        const url = `${wmgui.srch_endpoint}?q=${JSON.stringify(given_search)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // 'Content-Type': 'application/json'
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });
        const data = await response.json();

        $('#rfn_preloader').hide();

        if (data.error) return wmgui.notify(data.error);

        var was_facet = null,
            refine_html = '',
            classes_chk = [],
            num_terms = 0;
        delete given_search['is_heavy'];

        if (given_search.classes) { // no whitespace in multiple classes
            classes_chk = given_search.classes.split(',').map(function (i) { return i.trim(); });
            given_search.classes = classes_chk.join(',');
        }

        var inquiry = false;
        $.each(wmgui.inquiries, function (n, i) { if (given_search[i]) { inquiry = true; return false; } });

        $.each(data.payload, function (i, found_obj) {
            if (query_obj.formulae && found_obj.facet == 'elements') return true; // NB no sense to show elements in this context

            var link_base = '',
                //count_text = ' ('+found_obj.count+')',
                nested_skip = false,
                orepr = {};

            $.each(given_search, function (key, val) {
                if (['search_type', 'phid', 'numeric'].indexOf(key) > -1)
                    return true;
                else if (found_obj.facet == 'elements' && (key == 'elements' || key == 'formulae'))
                    return true;
                else if (found_obj.facet == 'props' && key == 'props')
                    return true;

                link_base += val + ' ';

                if (orepr[key]) orepr[key] += ', ' + val;
                else orepr[key] = val;
            });
            //if (found_obj.facet == 'elements') count_text = '';
            if (query_obj.classes && found_obj.facet == 'classes') {
                $.each(classes_chk, function (n, cls) {
                    if (cls == found_obj.value) { nested_skip = true; return false; }
                });
            }
            if (nested_skip) return true;

            if (found_obj.facet != was_facet) {
                if (was_facet && is_heavy) refine_html += '<li class="fct_' + was_facet + ' extd_refine"><a class="extd_refine" rel="' + was_facet + '" href="#">Show more&nbsp;</a></li>';
                refine_html += '<li class="new_rfn_facet fct_' + found_obj.facet + '">' + wmgui.facet_names[found_obj.facet] + '</li>';
                was_facet = found_obj.facet;
            }
            if (found_obj.facet == 'props') {
                found_obj.value = found_obj.value.replace(/\(|\)/g, "").replace(/\/[\w\-]*/g, ""); // FIXME
            }

            if (orepr[found_obj.facet]) orepr[found_obj.facet] += ', ' + found_obj.value;
            else orepr[found_obj.facet] = found_obj.value;

            if (orepr['elements']) orepr['elements'] = orepr['elements'].replaceAll(', ', '-');

            if (inquiry) refine_html += '<li class="fct_' + found_obj.facet + '"><a href="#inquiry/' + $.param(orepr) + '">' + found_obj.value + '</a></li>';
            else refine_html += '<li class="fct_' + found_obj.facet + '"><a href="#search/' + link_base + found_obj.value + '">' + found_obj.value + '</a></li>';
            num_terms++;
        });

        if (is_heavy) refine_html += '<li class="fct_' + was_facet + ' extd_refine"><a class="extd_refine" rel="' + was_facet + '" href="#">Show more&nbsp;</a></li>';

        if (num_terms == 0) display_examples('#examples', true, true);
        else {
            $('#refine_col > ul').show().append(wmgui.clean(refine_html));
            if (num_terms <= 10) display_examples('#examples', false, false);
        }
    } catch (e) {
        $('#rfn_preloader').hide();
        if (e.text != 'abort') {
            if (e.status == 429)
                wmgui.notify('Request rate limiting policy: please retry in a few seconds');
            else
                wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        }
    }

    //console.log(given_search);
    // wmgui.active_ajax = $.ajax({
    //      type: 'GET', 
    //      url: wmgui.rfn_endpoint, 
    //      data: { q: JSON.stringify(given_search) }, 
    //      beforeSend: function () { $('#rfn_preloader').show(); } })
    //      .always(function () { $('#rfn_preloader').hide() })
    //      .done(function (data) {

    // }).fail(function (xhr, textStatus, errorThrown) {

    // });
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
 */
function open_context(el, launch_ext) {
    close_vibox();
    if (el.hasClass('busy_entry')) {
        el.removeClass('busy_entry');
        $('#ctx_col, #sim_col').hide();
        try { wmgui.quick_ajax.abort(); } catch (e) { }

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
        $('#visualize, div.spinoff_pane, li.d_icon').hide();

        open_sim_col(entry, entype, rank);

        if (rank == 0) {
            $('#download_bib').show();

        } else if (rank == 1) {
            $('#download_bib, #download_pdf').show();

        } else if (rank == 2) {
            $('#download_bib, #download_pdf, #download_json').show();

        } else if (rank == 3) {
            $('#download_bib, #download_png, #download_cdr').show();

        } else if (rank == 4) {
            $('#visualize').attr('data-rank', rank);
            $('#download_bib, #download_json, #visualize').show();

        } else if (rank == 5) {
            $('#visualize').attr('data-rank', rank);
            $('#download_bib, #download_pdf, #visualize, #download_cif, #download_inp, #download_json').show();

        } else if (rank == 6) {
            $('#visualize').attr('data-rank', rank);
            $('#download_bib, #download_pdf, #visualize, #download_png, #download_cdr, #download_json').show();

        } else if (rank == 7) {
            $('#ml_data, #download_pdf, #download_json').show();

        } else if (rank == 8) {
            $('#ab_data, #download_pdf, #download_json, #download_raw').show();

        } else if (rank == 9) {
            $('#visualize').attr('data-rank', rank);
            $('#ab_data, #download_pdf, #download_json, #visualize, #download_png, #download_raw').show();

        } else if (rank == 10) {
            $('#visualize').attr('data-rank', rank);
            $('#ab_data, #download_pdf, #download_json, #visualize, #download_raw').show();

        } else if (rank == 11) {
            $('#ab_promise, #download_json').show();
        }
        $('#ctx_col > ul > li.d_icon > a').each(function () {
            var fmt = $(this).attr('rel'),
                link_add = (entype == 'S') ? '&export=1' : '',
                link_sid = (fmt == 'raw') ? 'null' : wmgui.sid,
                link_url = wmgui.dd_addr_tpl + '/' + entype.toLowerCase() + '?q=' + entry + '&fmt=' + fmt + '&sid=' + link_sid + link_add + '&ed=' + wmgui.edition;

            $(this).attr('href', link_url);
        });
        if (launch_ext) launch_iframed_app(rank);
    }
}

function open_sim_col(entry, entype, rank) {
    $('#sim_col > ul, #sim_legend').empty();
    $('.sim_col_ctx').hide();
    $('#sim_col').show();

    var cur_obj = { q: entry },
        allpurpose = ([0, 1, 4, 9].indexOf(rank) > -1);
    if (allpurpose) cur_obj.allpurpose = true;

    try { wmgui.quick_ajax.abort(); } catch (e) { }
    wmgui.quick_ajax = $.ajax({
        type: 'GET',
        url: wmgui.sim_endpoint,
        data: cur_obj,
        beforeSend: function () { $('#sim_preloader').show(); }
    }).always(function () { $('#sim_preloader').hide(); })
        .done(function (data) {
            if (data.error) return wmgui.notify(data.error);
            var counter = 0,
                sim_html = '';

            if (allpurpose) {
                $.each(data.out.sim, function (k, row) {
                    if (counter == 7) return false;
                    if (row[4]) sim_html += '<li><a href="#inquiry/' + $.param({ 'elements': row[1], 'years': row[2], 'codens': row[3], 'classes': (row[4] == 1) ? '' : row[4] }) + '">' + row[0] + '</a></li>';
                    else sim_html += '<li><a href="#inquiry/' + $.param({ 'formulae': row[1], 'years': row[2], 'codens': row[3] }) + '">' + row[0] + '</a></li>';
                    counter++;
                });

            } else if (entype == 'C' || entype == 'S') {
                if (rank > 3) {
                    $.each(data.out.sim, function (k, row) {
                        if (counter == 8) return false;
                        sim_html += '<li><a href="#phase_id/' + row[1] + '">' + row[0] + '</a></li>';
                        counter++;
                    });
                    if (entype == 'C') $('#pd_legend').show();
                }
            } else {
                var prop;
                if (wmgui.thumbed_display) prop = $('div.busy_entry > div.gallery_img > div').text().split(';')[0];
                else prop = $('tr.busy_entry > td.c2').text().split(';')[0];

                $.each(data.out.sim, function (k, row) {
                    if (counter == 8) return false;
                    sim_html += '<li><a href="#search/' + prop + ' ' + row[1] + '">' + row[0] + '</a></li>';
                    counter++;
                });
            }

            if (counter) {
                if (allpurpose) $('#sim_legend').removeClass('apparent').text('Also studied by these authors:');
                else if (entype == 'C') $('#sim_legend').removeClass('apparent').text('Phases at the diagram:');
                else if (entype == 'S') $('#sim_legend').removeClass('apparent').text('The same prototype structures:');
                else $('#sim_legend').removeClass('apparent').text('Similar ' + prop + ':'); // NB prop

                if (counter > 7) {
                    //var link = (entype == 'C') ? '#entry/' + $('#entryno').text() : '#interlinkage/' + entry;
                    $('#sim_trigger').attr('href', '#interlinkage/' + entry).show();
                }
                $('#sim_col > ul').html(sim_html);

            } else {
                if (allpurpose)
                    $('#sim_legend').addClass('apparent').text('No cross-links found');

                else if (entype == 'C' && rank == 3)
                    $('#sim_legend').addClass('apparent').html('<br /><a href="#entry/' + entry.split('-')[0] + '"><img alt="C-entry" src="' + wmgui.static_host + '/pd_thumbs/' + entry.split('-')[0] + '.png" /><br /><span>Full phase diagram</span></a>');

                else if (entype == 'C' && rank == 5)
                    $('#sim_legend').addClass('apparent').text('No links to other phases found');

                else if (entype == 'S')
                    $('#sim_legend').addClass('apparent').text('No other structures for this prototype found');

                else
                    $('#sim_legend').addClass('apparent').text('No similar values found');
            }

            if (data.out.own.length && !wmgui.search.phid)
                $('#own_phase').html('<a href="#phase_id/' + data.out.own[0][1] + '"><img alt="Phase" src="' + wmgui.static_host + '/rd_thumbs/' + data.out.own[0][0] + '.png" /><br /><span>Linked ' + (entype == 'S' ? 'distinct phase' : 'crystalline structure') + '</span></a>').show();

        }).fail(function (xhr, textStatus, errorThrown) {
            if (textStatus != 'abort') {
                if (xhr.status == 429)
                    wmgui.notify('Request rate limiting policy: please retry in a few seconds');
                else
                    wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
            }
        });
}

function close_vibox() {
    var iframe = $('#iframe');
    if (iframe.length) {
        if (wmgui.thumbed_display) $('#iframe').slideUp(function () { $('#iframe').remove(); });
        else $('#iframe').remove();
        $('#vibox').hide();
        return true;
    }
    return false;
}

function launch_iframed_app(rank) {
    var that = $('.busy_entry');
    if (!that.length) return;

    var entry = that.attr('id').substr(3),
        entype = entry.substr(0, 1),
        iframe_src,
        iframe_height;

    if (entype == 'S')
        iframe_src = wmgui.v_player_addr + entry, iframe_height = 650;

    else if (entype == 'P') {
        if (rank == 10)
            iframe_src = wmgui.v_ab_vis_addr + entry, iframe_height = 600;
        else
            iframe_src = wmgui.v_sd_addr + entry, iframe_height = 550;

    } else {
        iframe_src = (wmgui.sid ? wmgui.v_pd_addr : wmgui.v_pd_addr_anon) + entry, iframe_height = 600;

        if (entry.startswith('C3') || entry.startswith('C4'))
            wmgui.notify('This entry is now in preparation');
        else if (wmgui.entries_messages[entry])
            wmgui.notify(wmgui.entries_messages[entry]);
    }

    if (wmgui.sid) iframe_src += '&sid=' + wmgui.sid;

    var iframe_html = '<iframe frameborder=0 scrolling="no" width="100%" height="' + iframe_height + '" src="' + iframe_src + '"></iframe>';
    if (wmgui.thumbed_display) iframe_html = '<div id="iframe" style="display:block;width:100%;border:1px solid #ddd;margin:10px 0;">' + iframe_html + '</div>';
    else iframe_html = '<tr id="iframe"><td colspan="20" style="width:100%;padding:0;border-right:1px solid #eee;border-left:1px solid #eee;">' + iframe_html + '</td></tr>';

    that.after(iframe_html);
    $(window).scrollTop(that.position().top - 95);
}

function start_visavis(plot_type) {

    destroy_numericbox();
    delete wmgui.search.numeric;
    if (plot_type) wmgui.visavis_curtype = plot_type;

    $('div.ctxpanel').hide();
    var toshow = $('#ctxpanel_' + wmgui.visavis_curtype);
    if (toshow.length) toshow.show();
    if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) > -1) $('#cmppanel_plots').show();

    if (wmgui.visavis_working)
        return manage_visavis();

    rebuild_visavis();

    // visavis_col preparation
    $('#visavis_col').show();
    $('#visavis').show();

    switch_control_mode(0, 11, 'a', 'e');
    $('body').addClass('noscroll');

    wmgui.search_type = 0;
    wmgui.visavis_working = true;
    wmgui.visavis_starting = false;

    var cur_obj = { total_count: 1 };
    $.extend(cur_obj, wmgui.search);

    try {
        document.getElementById('visavis_iframe').contentWindow.location.replace(get_visavis_url(cur_obj));
    } catch (e) {
        console.error('No iframe access');
    }
}

function manage_visavis(callback_fn, param_a, param_b) {
    if (wmgui.visavis_terminating || !wmgui.visavis_working) {
        return false;
    }

    if (wmgui.search.numeric) { // not supported for plotting yet!
        wmgui.visavis_terminating = true;
        return false;
    }

    try { wmgui.active_ajax.abort(); } catch (e) { }
    try { wmgui.quick_ajax.abort(); } catch (e) { }

    rebuild_visavis();

    var cur_obj = { total_count: 1 };
    $.extend(cur_obj, wmgui.search);

    try {
        document.getElementById('visavis_iframe').contentWindow.location.replace(get_visavis_url(cur_obj));
    } catch (e) {
        console.error('No iframe access');
    }

    if (callback_fn) callback_fn(param_a, param_b);
    return true;
}

function stop_visavis() {
    $('#visavis, #visavis_col').hide();
    wmgui.visavis_working = false;
    wmgui.visavis_terminating = false;
}

function get_visavis_url(request) {
    if (wmgui.visavis_curtype == 'pie')
        return wmgui.static_host + '/visavis/#' + wmgui.rfn_endpoint + '?q=' + escape(JSON.stringify(request));

    return wmgui.static_host + '/visavis/#' + wmgui.vis_endpoint + '/' + wmgui.visavis_curtype + '?q=' + escape(JSON.stringify(request));
}

function describe_perms(perms) {
    var out_gui = '<h3>Web-browser access</h3><ul>',
        out_api = '<h3>Programmatic access = API</h3><ul>';

    if (perms.gui) {
        if (perms.gui.root) out_gui += '<li>Complete access</li>';
        else {
            if (!$.isArray(perms.gui)) perms.gui = [perms.gui];
            $.each(perms.gui, function (m, ruleset) {
                if (m > 3) {
                    out_gui += '<li>and ' + (perms.gui.length - 4) + ' more...</li>';
                    return false;
                }
                $.each(wmgui.facets, function (n, item) {
                    if (ruleset[item]) {
                        try {
                            out_gui += '<li class="perms_view fct_' + item + '"><strong>' + wmgui.facet_names[item] + '</strong>: ' + ruleset[item].map(function (x) { return x.replace(', ', ' &amp; '); }).join(', ') + '</li>';
                        } catch (e) { return false; }
                    }
                });
                if (ruleset.refs == 'ALL') out_gui += '<li>Full access to reference details</li>';
                else if (ruleset.refs == 'MENTIONED') out_gui += '<li>Access to corresponding references</li>';
                else out_gui += '<li>No access to reference details</li>';
                out_gui += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
            });
        }
    } else out_gui += '<li>Only open data</li>';

    if (perms.api) {
        if (perms.api.root) out_api += '<li>Complete access</li>';
        else {
            if (!$.isArray(perms.api)) perms.api = [perms.api];
            $.each(perms.api, function (m, ruleset) {
                if (m > 3) {
                    out_api += '<li>and ' + (perms.api.length - 4) + ' more...</li>';
                    return false;
                }
                $.each(wmgui.facets, function (n, item) {
                    if (ruleset[item]) {
                        try {
                            out_api += '<li class="perms_view fct_' + item + '"><strong>' + wmgui.facet_names[item] + '</strong>: ' + ruleset[item].map(function (x) { return x.replace(', ', ' &amp; '); }).join(', ') + '</li>';
                        } catch (e) { return false; }
                    }
                });
                out_api += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
            });
        }
    } else out_api += '<li>Only open data</li>';

    return out_gui + '</ul><div class="divider"></div>' + out_api + '</ul>';
}

function show_advsbox() {

    $('div.modal').hide();
    $('#advsbox, #overlay').show();

    // show typed terms
    if (!$.isEmptyObject(wmgui.search)) {

        $.each(wmgui.simple_facets, function (n, item) {
            if (wmgui.search[item]) {
                var value = wmgui.search[item];

                if (item == "codens") value = wmgui.journal_converter.c2j(value);
                else if (item == "doi") value = value.replaceAll('%2F', '/');

                $('#advs_fct_' + item).val(unescape(value.replace(/\+/g, "%20")));
            } else $('#advs_fct_' + item).val('');
        });

        $.each(wmgui.multi_facets, function (n, item) {

            $('#advs_fct_' + item + '-selectized').val('');
            wmgui.multiselects[item].clear();

            if (wmgui.search[item]) {
                var obj = {};
                obj[item] = wmgui.search[item];
                wmgui.multiselects[item].write(obj);
                //wmgui.multiselects[item].write({[item]: wmgui.search[item]});
                if (item == 'aetypes') show_aetmap(wmgui.search[item].split(',').pop().trim());
            }
        });
    }
    if (!show_advsbox.cached_aetmap) {
        show_advsbox.cached_aetmap = new Image();
        show_advsbox.cached_aetmap.src = wmgui.aetmap_addr;
    }
}

function show_hints(disabled) {

    $('#fdwidget').html('Were you satisfied with the data quality? Did everything work as expected? <span id="fdwidget_yes">Yes</span><span id="fdwidget_no">No</span>').show();

    if (disabled || wmgui.search.numeric || wmgui.search.doi || wmgui.search.phid || wmgui.fuzzyout || wmgui.search_type == 2)
        return;

    var cur_obj = {};
    $.extend(cur_obj, wmgui.search);
    delete cur_obj.ignored;
    delete cur_obj.search_type;

    var hint = JSON.stringify(cur_obj).replaceAll(' ', '+').replace('\{', '\\{').replace('\}', '\\}');
    $('#apihint span').html(hint).parent().show();

    if (!wmgui.search.search_type) {
        $('a.plthint_links').each(function () {
            var that = $(this),
                plot_type = that.attr('rev');
            that.attr('href', wmgui.gui_host + window.location.pathname + '#plot/' + plot_type + '/' + window.location.hash.substr(1));
        });
        $('#plthint').show();
    }
}

function show_tooltip(info, forced) {
    if (info.view_mode != wmgui.view_mode || (wmgui.visavis_working && !forced) || $('div.modal').is('[style="display: block"]'))
        return;

    var tooltip_o = $('#' + info.el).position(),
        tooltip_el = document.getElementById('tooltip');

    tooltip_el.style.left = (tooltip_o.left + info.oleft) + 'px';
    tooltip_el.style.top = (tooltip_o.top + info.otop) + 'px';
    tooltip_el.firstChild.innerHTML = info.text;
    document.getElementById('tooltip').style.display = 'block';
}

function user_login(sid, name, acclogin, admin, oauths) {
    var corner_name = (name.length > 40) ? name.substr(0, 37) + '&hellip;' : name;
    $('#auth_user').html(corner_name);

    $('#account_holder_name').text('Hi ' + name + '!');
    $('#account_holder_acclogin > span').html('<a href="mailto:' + acclogin + '">' + acclogin + '</a>');

    wmgui.sid = sid;
    wmgui.oauths = oauths;

    $('div.logged_out').hide();
    $('div.logged_in').show();

    window.localStorage.setItem(wmgui.storage_user_key, JSON.stringify({ sid: sid, name: name, acclogin: acclogin, admin: admin }));
    admin ? $('li.admin').show() : $('li.admin').hide();

    try {
        document.getElementById('visavis_iframe').contentWindow.location.reload();
    } catch (e) {
        console.error('No iframe access');
    }
    communicate_windows('local_user_login');

    wmgui.notify('You are logged in');
}

function local_user_login() { // FIXME window.location.reload();
    //if (wmgui.sid)
    //    return;

    var locals = JSON.parse(window.localStorage.getItem(wmgui.storage_user_key) || '{}');
    if (locals.sid == wmgui.sid)
        return;

    if (locals.sid && locals.name && locals.acclogin) {
        user_login(locals.sid, locals.name, locals.acclogin, locals.admin, locals.oauths);
    }
}

function user_logout(silent) {
    if (!wmgui.sid)
        return;

    wmgui.sid = null;
    wmgui.oauths = null;
    $('li.admin').hide();
    $('div.logged_in').hide();
    $('div.logged_out').show();

    window.localStorage.removeItem(wmgui.storage_user_key);

    try {
        document.getElementById('visavis_iframe').contentWindow.location.reload();
    } catch (e) {
        console.error('No iframe access');
    }
    communicate_windows('user_logout');

    if (!silent) wmgui.notify('You are logged out');
}

function force_relogin(show_msg) {
    $.ajax({ type: 'POST', url: wmgui.logout_endpoint, data: { sid: wmgui.sid } }).done(function (data) { }).fail(function (xhr, textStatus, errorThrown) { });
    user_logout(true);
    window.location.replace('#modal/login');
    if (show_msg) wmgui.notify(show_msg);
}

function communicate_windows(runnable_name) {
    // NB the active window doesn't receive a storage event
    window.localStorage.setItem('wm_reload_tmp', runnable_name);
    window.localStorage.removeItem('wm_reload_tmp');
}

function update_dc() {
    var title = [],
        orepr = {};
    for (var key in wmgui.search) {
        if (['search_type', 'phid', 'numeric'].indexOf(key) > -1) continue;
        orepr[key] = wmgui.search[key];
        title.push(wmgui.search[key]);
    }
    title = title.join(" ");

    var count = 0,
        cur_str = JSON.stringify(orepr),
        cmp_html = '<option value="X" selected>Last search...</option>';

    $.each(JSON.parse(window.localStorage.getItem(wmgui.storage_history_key) || '[]'), function (n, past) {
        if (count > 5) return false;

        var title = [],
            past_str = JSON.stringify(past);
        if (cur_str == past_str) return true;

        for (var prop in past) { title.push(past[prop]); }
        title = title.join(" ");
        cmp_html += '<option value="' + escape(past_str) + '">' + title + '</option>';
        count++;
    });
    cmp_html += '<option value="Y">No comparison</option><option value="Z">Multiple comparison</option>';
    $('#select_cmp_trigger').empty().append(cmp_html);
}

function show_aetmap(term) {
    var coords = wmgui.aets[term];
    if (coords)
        $('#aetmap').css('height', coords[1] + 'px').css('background', 'url(' + wmgui.aetmap_addr + ') 0 -' + coords[0] + 'px no-repeat').show();
    else
        $('#aetmap').hide();
}

function render_all_polyhedra() {
    if (!$('#all_polyhedra_content').is(':empty')) return;
    var aetypes_html = '',
        defined_aetypes = Object.keys(wmgui.aets);
    defined_aetypes.sort(function (a, b) {
        var partsa = a.split('-vertex')[0].split(' '),
            va = parseInt(partsa[partsa.length - 1]),
            partsb = b.split('-vertex')[0].split(' '),
            vb = parseInt(partsb[partsb.length - 1]);
        return va > vb ? 1 : va < vb ? -1 : (a.length > b.length ? 1 : a.length < b.length ? -1 : 0);
    });
    $.each(defined_aetypes, function (key, value) {
        var coords = wmgui.aets[value];
        aetypes_html += '<div class="gallery_item" rel="' + value + '"><div style="width:125px;height:' + coords[1] + 'px;margin:10px auto;background:url(' + wmgui.aetmap_addr + ') 0 -' + coords[0] + 'px no-repeat;"></div><span>' + value + '</span></div>';
    });
    $('#all_polyhedra_content').html(aetypes_html);
}

function assign_edition() {
    function run_edition(edition_key) {
        edition_key = parseInt(edition_key);
        if (!wmgui.editions[edition_key])
            edition_key = 0;
        wmgui.edition = edition_key;
        if (wmgui.editions[edition_key].css) wmgui.loadCSS(wmgui.editions[edition_key].css);
        if (wmgui.editions[edition_key].actions) wmgui.editions[edition_key].actions();
    }

    $.each(wmgui.editions, function (key, value) {
        if (wmgui.gui_host == value['prod_url'] || wmgui.gui_host == value['dev_url']) {
            run_edition(key);
            return false;
        }
    });

    // for any unknown domain
    if (!wmgui.edition) run_edition(0);
}
