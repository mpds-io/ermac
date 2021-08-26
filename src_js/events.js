/**
 * MPDS.IO desktop GUI
 * Author: Evgeny Blokhin /
 * Tilde Materials Informatics
 * eb@tilde.pro
 * Version: 0.6.7
 */
"use strict";

var wmgui = window.wmgui || {};

function register_events(){

    $('#search_trigger').click(function(){

        var query = wmgui.multiselects['main'].read(),
            val = $('#search_field-selectized').val(),
            numeric = '',
            sliders_numerics = document.getElementsByClassName('slider_numerics');

        if (val){
            if (val.endswith(" ") || val.endswith(",")) val = val.substr(0, val.length-1);
            var parsed = WMCORE.parse_string(val);

            for (var key in parsed){
                if (key == 'ignored')
                    continue;
                else if (query[key] && key == 'elements')
                    query[key] += '-' + parsed[key];
                else if (query[key] && key == 'classes')
                    query[key] += ', ' + parsed[key];
                else
                    query[key] = parsed[key];
            }
        }

        // numeric search
        for (var i = 0; i < sliders_numerics.length; i++){
            var sdata = sliders_numerics[i].noUiSlider.get(),
                srange = sliders_numerics[i].noUiSlider.options.range,
                srange = [srange.min, srange.max];
            //if (sdata[0] == srange[0] && sdata[1] == srange[1]) continue;
            //console.log(sdata);

            var prop = sliders_numerics[i].getAttribute('rel');
            numeric += serialize_numeric(prop, '>', sdata[0]) + serialize_numeric(prop, '<', sdata[1]);
        }
        if (numeric.length){
            query.numeric = numeric.substr(0, numeric.length - 1);
            delete query.props;
        }
        // FIXME what if query.numeric pre-exists?

        if ($.isEmptyObject(query)){
            wmgui.notify('Unrecognized input');
            return false;
        }

        var urlstr = $.param(query);
        if (window.location.hash == '#inquiry/' + urlstr){
            // hash-hack FIXME?
            if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length-1);
            else                         urlstr += '=';
        }
        window.location.hash = '#inquiry/' + urlstr;
        return false;
    });

    $('#advsearch_do_trigger').click(function(){
        var curval = '',
            rest_input = '',
            numeric = '',
            sliders_numerics = document.getElementsByClassName('slider_numerics'),
            query = {};

        $.each(wmgui.simple_facets, function(n, item){
            curval = $('#advs_fct_' + item).val();
            if (curval){
                if (item == "formulae") curval = WMCORE.termify_formulae(curval);
                else if (item == "elements") curval = curval.replaceAll(',', '').replaceAll(' ', '-');
                else if (item == "doi") curval = curval.replace('http:\/\/dx\.doi\.org\/', '').replace('http:\/\/doi\.org\/', '').trim();
                else if (item == "codens") curval = wmgui.journal_converter.j2c(curval);
                query[item] = curval;
            }
        });

        $.each(wmgui.multi_facets, function(n, item){
            curval = wmgui.multiselects[item].read();
            if (curval[item]){
                curval = curval[item];
                if (item == "authors") curval = curval.replace(/'/g, '').replaceAll('\\.', ' ').replaceAll('\\b\\w{1}\\b', '').trim();
                query[item] = curval;
            }
            rest_input = $('#advs_fct_' + item + '-selectized').val();
            if (rest_input){
                if (query[item])
                    query[item] += ', ' + rest_input;
                else
                    query[item] = rest_input;
            }
        });

        // numeric search
        for (var i = 0; i < sliders_numerics.length; i++){
            var sdata = sliders_numerics[i].noUiSlider.get(),
                srange = sliders_numerics[i].noUiSlider.options.range,
                srange = [srange.min, srange.max];
            //if (sdata[0] == srange[0] && sdata[1] == srange[1]) continue;

            var prop = sliders_numerics[i].getAttribute('rel');
            numeric += serialize_numeric(prop, '>', sdata[0]) + serialize_numeric(prop, '<', sdata[1]);
        }
        if (numeric.length) query.numeric = numeric.substr(0, numeric.length - 1);

        if ($.isEmptyObject(query)) return wmgui.notify('Search is empty');

        var urlstr = $.param(query);
        if (window.location.hash == '#inquiry/' + urlstr){
            // hash-hack FIXME?
            if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
            else                         urlstr += '=';
        }
        window.location.hash = '#inquiry/' + urlstr;
    });

    $('#advsearch_drop_trigger').click(function(){

        $('input.advs_input').val('');

        $.each(wmgui.multi_facets, function(n, item){
            $('#advs_fct_' + item + '-selectized').val('');
            wmgui.multiselects[item].clear();
        });

        $('#aetmap').hide();
        $('#aet_limit').prop('checked', false);

        destroy_numericbox();
        // TODO delete wmgui.search?
    });

    $('#advsearch_init_trigger').click(function(){
        $('#advstab_options li').removeClass('working');
        $('#advstab_options li[rev=advstab_bib]').addClass('working');
        $('#advstab_bib').show();
        $('#advstab_main, #advstab_cry').hide();
        show_advsbox();
        return false;
    });

    $('#search_box').on('click', '#legend a', function(){
        var legend = $(this).text();
        window.location.hash = '#search/' + escape(legend);
        return false;
    });

    $('div.advs_legend > a').click(function(){
        var that = $(this),
            legend = that.text(),
            multiselects = that.parent().data('multiselects');

        if (multiselects){
            $('#advs_fct_' + multiselects + '-selectized').val('');
            wmgui.multiselects[multiselects].clear();
            var obj = {};
            obj[multiselects] = legend;
            wmgui.multiselects[multiselects].write(obj);
            //wmgui.multiselects[multiselects].write({[multiselects]: legend});
        } else {
            that.parent().parent().children('input').val(legend).focus();
        }
        //if (legend.indexOf('-vertex') !== -1) show_aetmap(legend);

        return false;
    });

    $('#databrowser').on('mousedown', 'a.resolve_ref', function(e){
        var that = $(this),
            bid = that.attr('rel');
        $('a.resolve_ref[rel=' + bid + ']').addClass('visited'); // :visited
        wmgui.bid_history.push(parseInt(bid));
        window.localStorage.setItem('bid_history', JSON.stringify(wmgui.bid_history));
        return true;
    });

    $('#databrowser').on('click', 'tr.tcell, div.gallery_item', function(){
        open_context($(this), false);
    });

    $('#databrowser').on('click', 'span.launch_v', function(e){
        wmgui.cancel_event(e);
        var parent_row = $(this).parent().parent();
        parent_row.removeClass('busy_entry');
        open_context(parent_row, true);
    });

    $('#databrowser').on('click', 'a.launch_ph', function(e){
        wmgui.cancel_event(e);
        var phid_link = $(this).attr('href');
        if (window.location.hash == phid_link){
            // hash-hack FIXME?
            phid_link += '.';
        }
        window.location.hash = phid_link;
        return false;
    });

    $('#all_polyhedra_content').on('click', 'div.gallery_item', function(){
        $('#advstab_options li').removeClass('working');
        $('#advstab_options li[rev=advstab_cry]').addClass('working');
        $('div.advstab').hide();
        $('#advstab_cry').show();
        $('div.modal').hide();
        $('#advsbox, #overlay').show();

        var term = $(this).attr('rel'),
            selected_aetypes = (wmgui.multiselects['aetypes'].read()['aetypes'] || "").split(', ');
        if (selected_aetypes.indexOf(term) == -1)
            wmgui.multiselects['aetypes'].write({'aetypes': term});
        show_aetmap(term);
    });

    $('#aet_limit').click(function(e){
        var selected_classes = (wmgui.multiselects['classes'].read()['classes'] || "").split(', ');

        if (this.checked){
            var selected_aetypes = (wmgui.multiselects['aetypes'].read()['aetypes'] || "").split(', ').filter(function(x){ return x }),
                limit_kwd = wmgui.poly_limits[selected_aetypes.length];

            if (!limit_kwd){
                wmgui.cancel_event(e);
                wmgui.notify('Sorry, only up to 3 supported');
                return false;
            }
            if (selected_classes.indexOf(limit_kwd) == -1){
                wmgui.multiselects['classes'].write({'classes': limit_kwd});
            }

        } else {
            var poly_limits = Object.values(wmgui.poly_limits);
            wmgui.multiselects['classes'].clear();
            wmgui.multiselects['classes'].write({'classes': selected_classes.filter(function(x){ return poly_limits.indexOf(x) == -1 }).join(', ')});
        }
        return true;
    });

    $('#visualize').click(function(){
        if (!close_vibox()) launch_iframed_app(this.getAttribute('data-rank'));
    });

    $('#refine_col').on('click', 'a.extd_refine', function(){
        var facet = $(this).attr('rel');
        if ($('#refine_col > ul > li.extd_rfns.fct_' + facet).length){
            $('#refine_col > ul > li:not(.fct_' + facet + ')').addClass('hidden_rfns').slideUp();
            $('#refine_col > ul > li.extd_rfns.fct_' + facet).show();
            $('a.extd_refine[rel=' + facet + ']').parent().hide();
            return false;
        }
        var given_search = {extd_refine: facet};
        $.extend(given_search, wmgui.search);
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({type: 'GET', url: wmgui.rfn_endpoint, data: {q: JSON.stringify(given_search)}}).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            var html = '';
            delete given_search['numeric'];
            delete given_search['extd_refine'];
            //if (given_search.classes) given_search.classes = given_search.classes.split(',').join(' ');

            var inquiry = false;
            $.each(wmgui.inquiries, function(n, i){ if (given_search[i]){ inquiry = true; return false; } });

            $.each(data.payload, function(i, found){
                // FIXME: duplicating
                var link_base = '',
                    orepr = {};
                    //count_text = ' ('+found[1]+')';

                $.each(given_search, function(key, val){
                    if (key == 'search_type')
                        return true;
                    else if (facet == 'elements' && (key == 'elements' || key == 'formulae'))
                        return true;
                    else if (facet == 'props' && key == 'props')
                        return true;

                    link_base += val + ' ';

                    if (orepr[key]) orepr[key] += ', ' + val;
                    else            orepr[key] = val;
                });

                //if (facet == 'elements') count_text = '';
                if (facet == 'props'){
                    found[0] = found[0].replace(/\(|\)/g, "").replace(/\/[\w\-]*/g, ""); // FIXME
                }

                if (orepr[facet]) orepr[facet] += ', ' + found[0];
                else              orepr[facet] = found[0];

                if (orepr['elements']) orepr['elements'] = orepr['elements'].replaceAll(', ', '-');

                if (inquiry) html += '<li class="extd_rfns fct_' + facet + '"><a href="#inquiry/' + $.param(orepr) + '">' + found[0] + '</a></li>';
                else         html += '<li class="extd_rfns fct_' + facet + '"><a href="#search/' + link_base + found[0] + '">' + found[0] + '</a></li>';
            });

            html += '<li class="extd_rfns fct_' + facet + ' collapse_refine"><a class="collapse_refine" rel="' + facet + '" href="#">Show less</a></li>';
            $('#refine_col > ul > li:not(.fct_' + facet + ')').addClass('hidden_rfns').slideUp();
            $('a.extd_refine[rel=' + facet + ']').parent().hide().after(wmgui.clean(html));

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        });
        return false;
    });

    $('#refine_col').on('click', 'a.collapse_refine', function(){
        var facet = $(this).attr('rel');
        $('a.extd_refine[rel=' + facet + ']').parent().show();
        $('#refine_col > ul > li.hidden_rfns').removeClass('hidden_rfns').slideDown(250);
        $('#refine_col > ul > li.extd_rfns').hide();
        return false;
    });

    $('#fdwidget').on('click', 'span', function(){
        var what = $(this).attr('id');
        if (what == 'fdwidget_yes'){
            $('#fdwidget').html('We appreciate your feedback!');
        } else {
            $('#fdwidget').html(wmgui.contact_html);
            $('#fdwidget_msg').focus();
        }
    });

    $('#fdwidget').on('click', 'div.wmbutton', function(){
        if ($(this).data('busy')) return;
        $(this).data('busy', true);
        $.ajax({type: 'POST', url: wmgui.fd_endpoint, data: {fdwidget_msg: $('#fdwidget_msg').val(), fdwidget_msgtype: $('#fdwidget_msgtype').val(), fdwidget_url: window.location.href}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
            $('#fdwidget_trigger').data('busy', false);
            if (data.error) return wmgui.notify(data.error);
            $('#fdwidget').html('We appreciate your feedback!');

        }).fail(function(xhr, textStatus, errorThrown){
            wmgui.notify("Sorry, cannot process your input");
        });
    });

    $('#tagcloudbox').on('click', 'a.collateral', function(){
        $('#userbox').data('saved_hash', false)
        var act = $(this).attr('rel');
        if (act == 'adv'){
            $('#advsearch_init_trigger').trigger('click');
            $('div.menu_collateral').hide();

        } else if (act == 'idea'){
            window.location.hash = '#plot/' + WMCORE.get_random_term(['pie', 'lit', 'graph']) + '/search/' + WMCORE.get_interesting()['text'];

        } else if (act == 'sod'){
            var now = new Date(),
                pick = now.getDate() % wmgui.sbucks.length,
                start = new Date(now.getFullYear(), 0, 0),
                diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000),
                nday = Math.floor(diff / (1000 * 60 * 60 * 24)),
                sod = wmgui.sbucks[pick] + nday;
            window.location.hash = '#entry/S' + sod;

        } else if (act == 'my'){
            var locals = JSON.parse(window.localStorage.getItem('wm') || '{}');
            if (locals.name){
                var names = locals.name.split(' ');
                window.location.hash = '#inquiry/authors=' + escape(names[names.length - 1]);
            }
        }
        return false;
    });

    $('#hintsbox_msg').on('click', 'div.wmbutton', function(){
        // copy to clipbox functionality
        var range = document.createRange();
        range.selectNode($('#hintsbox_msg > pre').get(0));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        wmgui.notify('Copied');
    });

    $('#tooltip').on('click', 'span', function(){
        var that = $(this),
            act = that.attr('rel'),
            forced = that.hasClass('forced');
        document.getElementById('tooltip').style.display = 'none';
        if (act && wmgui.tooltips[act]) show_tooltip(wmgui.tooltips[act], forced);
    });

    $('#sim_col').on('click', 'li > a', function(){
        $('#sim_col > ul > li').removeClass('selected');
        $(this).parent().addClass('selected');
        wmgui.passive_sim_col = false;
        return true;
    });

    $('div.close_user_dialogue').click(function(){
        $('#userbox').trigger('click');
    });

    $('div.close_advs_dialogue').click(function(){
        $('#advsbox, #overlay, #aetmap').hide();
    });

    $('#close_inquiry_dialogue').click(function(){
        $('#inquirybox').hide();
    });

    $('#close_ss_dialogue').click(function(){
        var x_sort = $('#ss_x > ul > li.ss_x').attr('rel').split('_')[1],
            y_sort = $('#ss_y > ul > li.ss_y').attr('rel').split('_')[1],
            x_op = $('#sops_x > ul > li.sops_x').text(),
            y_op = $('#sops_y > ul > li.sops_y').text(),
            x_op = (x_op == 'none') ? false : x_op,
            y_op = (y_op == 'none') ? false : y_op;

        if ($('#ss_z').is(':visible')){
            var z_sort = $('#ss_z > ul > li.ss_z').attr('rel').split('_')[1],
                z_op = $('#sops_z > ul > li.sops_z').text(),
                z_op = (z_op == 'none') ? false : z_op;

            $('#ctxpanel_cube > ul > li.embodied').removeClass('embodied');
            $('#viscube_' + x_sort).addClass('embodied');
            $('#ctxpanel_cube > ul > li.ss_y').removeClass('ss_y');
            $('#viscube_' + y_sort).addClass('ss_y');
            $('#ctxpanel_cube > ul > li.ss_z').removeClass('ss_z');
            $('#viscube_' + z_sort).addClass('ss_z');

            $('span.sops').remove();
            if (x_op) $('<span class="sops" rel="x">' + x_op + '</span>').appendTo('#viscube_' + x_sort);
            if (y_op) $('<span class="sops" rel="y">' + y_op + '</span>').appendTo('#viscube_' + y_sort);
            if (z_op) $('<span class="sops" rel="z">' + z_op + '</span>').appendTo('#viscube_' + z_sort);

            if (document.getElementById('visavis_iframe').contentWindow.location.hash.indexOf('fixel=1') !== -1)
                document.getElementById('visavis_iframe').contentWindow.matrix_order(x_sort, y_sort, x_op, y_op);
            else
                document.getElementById('visavis_iframe').contentWindow.cube_order(x_sort, y_sort, z_sort, x_op, y_op, z_op);

        } else {
            if ((x_op && x_sort == 'count') || (y_op && y_sort == 'count')) return wmgui.notify('Sorry, data counts are not supported');

            $('#ctxpanel_matrix > ul > li.embodied').removeClass('embodied');
            $('#vismatrix_' + x_sort).addClass('embodied');
            $('#ctxpanel_matrix > ul > li.ss_y').removeClass('ss_y');
            $('#vismatrix_' + y_sort).addClass('ss_y');

            $('span.sops').remove();
            if (x_op) $('<span class="sops" rel="x">' + x_op + '</span>').appendTo('#vismatrix_' + x_sort);
            if (y_op) $('<span class="sops" rel="y">' + y_op + '</span>').appendTo('#vismatrix_' + y_sort);

            document.getElementById('visavis_iframe').contentWindow.matrix_order(x_sort, y_sort, x_op, y_op);
        }
        $('#ss_custom_box, #overlay').hide();
        $('div.ss_col > ul').empty();
    });

    $('#close_dc_dialogue').click(function(){
        $('#discovery_custom_box, #overlay').hide();
        $('#discovery_enabled, #discovery_disabled').empty();
        document.getElementById('visavis_iframe').contentWindow.discovery_rerun();
        $('#select_cmp_trigger').val('X');
    });

    // not handled by ermac?
    $('#close_formal_dialogue').click(function(){
        window.location.hash = '#start';
    });

    // not handled by ermac?
    $('#close_ph_dialogue, div.close_hy_dialogue, div.close_product_dialogue').click(function(){
        if (document.referrer.indexOf(window.location.host) == -1) window.location.hash = '#start'; // FIXME: empty referrer
        else {
            var prev = window.location.href;
            window.history.go(-1);
            setTimeout(function(){ if (window.location.href == prev) window.location.hash = '#start' }, 500);
        }
    });

    /** $('#overlay').click(function(){
        $('div.modal:visible').each(function(){
            $(this).find('div.cross').trigger('click');
        });
    }); **/

    $('div._close_ctx').click(function(){
        try { wmgui.quick_ajax.abort() } catch(e){}
        $('.busy_entry').removeClass('busy_entry');
        $('#ctx_col, #sim_col').hide();
        wmgui.passive_sim_col = true;
        close_vibox();
    });

    $('#hy_box').on('click', 'span', function(){
        var hyid = $(this).attr('class');
        $('span.' + hyid).each(function(){
            var that = $(this);
            that.parent().find('ul').toggle();
            that.text() == 'expand' ? that.text('collapse') : that.text('expand');
        });
    });

    $('#hy_box').on('click', 'a.dynprop', function(){
        if (wmgui.view_mode == 1) return true;
        var value = $(this).attr('data-val');
        window.location.hash = wmgui.aug_search_cmd("props", value);
        return false;
    });

    // numeric search
    $('#hy_box').on('click', 'strong.numeric', function(){
        var prop = $(this).attr('rel'),
            data = wmgui.numerics[prop],
            prop_id = data[0],
            units = data[1],
            min = data[2],
            max = data[3],
            step = data[4];
        var nblocks = $('div.slider_numerics').length;
        if (nblocks >= 2) wmgui.notify('Too little phases have all these properties reported &mdash; expect no results');
        if (nblocks >= 8)
            return;
        create_floating_slider(prop, prop_id, units, min, max, step);
    });

    $('strong.numeric').click(function(){
        var prop = $(this).attr('rel'),
            data = wmgui.numerics[prop],
            prop_id = data[0],
            units = data[1],
            min = data[2],
            max = data[3],
            step = data[4];
        create_floating_slider(prop, prop_id, units, min, max, step);
    });

    $('#hy_options > li').click(function(){
        var that = $(this),
            desttab = that.attr('rev');
        if (desttab == 'hy_vis'){
            window.open(wmgui.static_host + '/labs/ontology');
            return;
        }
        that.addClass('working').siblings().removeClass('working');
        $('div.hy_tabs').hide();
        $('#' + desttab).show();
    });

    $('#dtypes > ul > li').click(function(){
        var that = $(this),
            facet = that.data('facet'),
            term = that.data('term');

        if (facet == 'classes'){
            if (wmgui.search.classes) // FIXME?
                wmgui.search.classes = wmgui.search.classes.replace('peer-reviewed', '').replace('peer-review', '').replace('machine-learning', '').replace('machine learning', '').replace('ab initio calculations', '').split(',').map(function(x){ return x.trim() }).filter(function(x){ return x }).join(', ');
            //wmgui.inquiries.forEach(function(item){
            //    if (wmgui.search[item]) delete wmgui.search[item];
            //});
        }
        window.location.hash = wmgui.aug_search_cmd(facet, term);
    });

    $(window).scroll(wmgui.debounce(function(){
        if (wmgui.view_mode == 2 && wmgui.unfinished_page){
            if ($('#footer').offset().top - $(window).scrollTop() - $(window).height() < 50){ // footer pos - scrolling - window height
                if (!wmgui.unfinished_page) return;
                wmgui.unfinished_page = false;
                var cur_search = {offset: wmgui.quick_page_size};
                $.extend(cur_search, wmgui.search);

                // NB no abort of the other requests!
                wmgui.active_ajax = $.ajax({type: 'GET', url: wmgui.srch_endpoint, data: {q: JSON.stringify(cur_search), sid: wmgui.sid}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
                    if (data.error) return wmgui.notify(data.error);
                    $('div.context_msg').hide();
                    show_hints();
                    if (!data.out.length)
                        return;
                    if (wmgui.thumbed_display){
                        $('#databrowser tr td').append(build_thumbs(data.out));
                    } else {
                        $('#databrowser tbody').append(build_cells(data.out));
                        $('#databrowser').trigger('update');
                    }
                }).fail(function(xhr, textStatus, errorThrown){
                    if (textStatus != 'abort') wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
                });
            }
        }
        var iframe = $('#iframe');
        if (iframe.length && !wmgui.is_inview(iframe)) close_vibox();
    }, 300));

    $('#userbox').click(function(){
        var that = $(this);
        if (window.location.hash == that.data('saved_hash'))
            that.data('saved_hash', false);

        if (that.data('saved_hash')){
            window.location.replace(that.data('saved_hash'));
            that.data('saved_hash', false);

        } else {
            if (window.location.hash.indexOf('modal') !== -1){
                window.location.replace('#start');
            } else {
                that.data('saved_hash', window.location.hash);

                if (wmgui.sid) window.location.replace('#modal/menu');
                else window.location.replace('#modal/login');
            }
        }
    });

    $('span.href[rel]').click(function(){
        window.location.replace($(this).attr('rel'));
    });

    $('#interpret').on('click', 'li', function(){
        var that = $(this),
            link = that.attr('rel');
        if (!!link){ // search only ... arity
            window.location.hash = link;
            return;
        }

        var csscls = that.attr('class');

        if (csscls.indexOf('numeric') > -1){
            window.location.hash = '#hierarchy';

        } else if (csscls.indexOf('authors') > -1 || csscls.indexOf('years') > -1 || csscls.indexOf('codens') > -1 || csscls.indexOf('doi') > -1 || csscls.indexOf('geos') > -1 || csscls.indexOf('orgs') > -1){
            $('#advstab_options li').removeClass('working');
            $('#advstab_options li[rev=advstab_bib]').addClass('working');
            $('div.advstab').hide();
            $('#advstab_bib').show();
            show_advsbox();

        } else if (csscls.indexOf('formulae') > -1 || csscls.indexOf('props') > -1 || csscls.indexOf('elements') > -1 || csscls.indexOf('classes') > -1) {
            $('#advstab_options li').removeClass('working');
            $('#advstab_options li[rev=advstab_main]').addClass('working');
            $('div.advstab').hide();
            $('#advstab_main').show();
            show_advsbox();

        } else {
            $('#advstab_options li').removeClass('working');
            $('#advstab_options li[rev=advstab_cry]').addClass('working');
            $('div.advstab').hide();
            $('#advstab_cry').show();
            show_advsbox();
            if (wmgui.search.aetypes) show_aetmap(wmgui.search.aetypes);
        }
    });

    $('#tab_links > li').click(function(){
        try { wmgui.active_ajax.abort() } catch(e){}
        try { wmgui.quick_ajax.abort() } catch(e){}

        var that = $(this),
            desttab = that.attr('rev');
        that.addClass('working').siblings().removeClass('working');
        $('div.menu_tabs').hide();
        $('#' + desttab).show();

        if (desttab == 'usr_tab_api_key'){
            $('#hintsbox_msg').html(wmgui.api_msg);
            wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
                if (data.error) return wmgui.notify(data.error);
                $('#usr_api_key').html(data.msg);
                if (data.revokable)      $('#revoke_usr_api_key_holder').show();
                else if (data.creatable) $('#create_usr_api_key_holder').show();
                else return wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');

            }).fail(function(xhr, textStatus, errorThrown){
                if (textStatus != 'abort') wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
            });

        } else if (desttab == 'usr_tab_perms'){
            $('#hintsbox_msg').html(WMCORE.get_random_term(wmgui.welcome_msgs));
            wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.perms_endpoint, data: {sid: wmgui.sid}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
                if (data.error) return wmgui.notify(data.error);
                if (!data.hasOwnProperty('gui') || !data.hasOwnProperty('api')) return wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
                $('#perms_view').html(describe_perms(data));

            }).fail(function(xhr, textStatus, errorThrown){
                if (textStatus != 'abort') wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
            });

        } else if (desttab == 'usr_tab_ctrl'){
            window.location.href = wmgui.static_host + (wmgui.edition === 0 ? '/ctrl' : '/labs/custom-datasets') + '?' + Math.floor(Math.random() * 1000);

        } else if (desttab == 'usr_tab_account'){
            $('#hintsbox_msg').html(WMCORE.get_random_term(wmgui.welcome_msgs));
        }
    });

    $('#advstab_options > li').click(function(){
        var that = $(this),
            desttab = that.attr('rev');

        that.addClass('working').siblings().removeClass('working');

        $('div.advstab').hide();
        $('#' + desttab).show();
    });

    $('a.link_adjuster').click(function(){
        // hash-hack FIXME?
        if (window.location.hash == '#polyhedra'){ window.location.hash = '#polyhedra/'; return false; }
        else if (window.location.hash == '#polyhedra/'){ window.location.hash = '#polyhedra'; return false; }
        else return true;
    });

    $('#create_usr_api_key').click(function(){
        $(this).parent().hide();
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid, create: true}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            $('#usr_api_key').html(data.msg);
            $('#revoke_usr_api_key_holder').show();

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
        });
    });
    $('#revoke_usr_api_key').click(function(){
        $(this).parent().hide();
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid, revoke: true}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            $('#usr_api_key').html('Successfully revoked');
            $('#create_usr_api_key_holder').show();

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
        });
    });

    $('#login_trigger').click(function(){
        if ($(this).data('busy')) return;
        $(this).data('busy', true);
        $(this).text('In process...');

        try { wmgui.active_ajax.abort() } catch(e){}

        wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.login_endpoint, data: {login: $('#login_email').val().trim(), pass: $('#login_password').val()}, beforeSend: wmgui.show_preloader}).always(function(){
            $('#login_trigger').data('busy', false);
            $('#login_trigger').text('Login');
            wmgui.hide_preloader();

        }).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            if (!data.sid || !data.name || !data.acclogin) return wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
            user_login(data.sid, data.name, data.acclogin, data.admin);
            $('#userbox').trigger('click');

        }).fail(function(xhr, textStatus, errorThrown){
            wmgui.notify("Login unsuccessful");
        });
    });

    $('#restore_trigger').click(function(){
        if ($(this).data('busy')) return;
        $(this).data('busy', true);
        $(this).text('Sending...');

        try { wmgui.active_ajax.abort() } catch(e){}

        wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.restore_endpoint, data: {login: $('#restore_by_email').val().trim(), ed: wmgui.edition}, beforeSend: wmgui.show_preloader}).always(function(){
            $('#restore_trigger').data('busy', false);
            $('#restore_trigger').text('Send link');
            wmgui.hide_preloader();

        }).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            wmgui.notify('Please, check your inbox (and spam)');
            $('#userbox').trigger('click');

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('A network error occured. Please, try again');
        });
    });

    $('#account_holder_accpass > span').click(function(){
        $('#account_pass_change').toggle();
    });

    $('#password_trigger').click(function(){
        var p1 = $("#new_password_1").val(),
            p2 = $("#new_password_2").val();
        if (!p1 || !p2) return wmgui.notify("Please, type your new password in both fields");
        if (p1 !== p2) return wmgui.notify("Passwords do not match (typo?)");

        if ($(this).data('busy')) return;
        $(this).data('busy', true);
        $(this).text('Changing...');

        try { wmgui.active_ajax.abort() } catch(e){}

        wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.password_endpoint, data: {new_password: p2, sid: wmgui.sid}, beforeSend: wmgui.show_preloader}).always(function(){
            $('#password_trigger').data('busy', false);
            $('#password_trigger').text('Change');
            wmgui.hide_preloader();

        }).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            user_login(data.sid, data.name, data.acclogin, data.admin);
            window.location.replace('#start');
            $('#account_pass_change').hide();

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('Login error: please, <span class="href relogin">re-login</span>');
        });
    });

    $('#logout_trigger').click(function(){
        $.ajax({type: 'POST', url: wmgui.logout_endpoint, data: {sid: wmgui.sid}}).done(function(data){}).fail(function(xhr, textStatus, errorThrown){});
        user_logout();
        $('#userbox').trigger('click');
    });
    $('#notifybox').on('click', 'span.relogin', force_relogin);

    $('#search_holder').keydown(function(e){
        var key = window.event ? e.keyCode : e.which;
        if (key == 13) $('#search_trigger').trigger('click');
    });

    // switch sliders: first row abf
    $('#control_a').click(function(){ // entries
        re_view_request(0);
    });
    $('#control_b').click(function(){ // phases
        re_view_request(1);
    });
    $('#control_f').click(function(){ // articles
        re_view_request(2);
    });

    // switch sliders: second row cde
    $('#control_c').click(function(){ // table
        wmgui.visavis_terminating = true;
        wmgui.thumbed_display = false;
        if (wmgui.visavis_working){
            var orepr = {};
            for (var key in wmgui.search){
                if (['search_type', 'phid', 'numeric'].indexOf(key) > -1) continue;
                orepr[key] = wmgui.search[key];
            }
            var urlstr = $.param(orepr);
            if (window.location.hash == '#inquiry/' + urlstr){
                // hash-hack FIXME?
                if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length-1);
                else                         urlstr += '=';
            }
            window.location.hash = '#inquiry/' + urlstr;

        } else re_view_request(wmgui.search_type);
        wmgui.chosen_table_browser = true;
    });
    $('#control_d').click(function(){ // previews
        wmgui.visavis_terminating = true;
        wmgui.thumbed_display = true;
        if (wmgui.visavis_working){
            var orepr = {};
            for (var key in wmgui.search){
                if (['search_type', 'phid', 'numeric'].indexOf(key) > -1) continue;
                orepr[key] = wmgui.search[key];
            }
            var urlstr = $.param(orepr);
            if (window.location.hash == '#inquiry/' + urlstr){
                // hash-hack FIXME?
                if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length-1);
                else                         urlstr += '=';
            }
            window.location.hash = '#inquiry/' + urlstr;

        } else re_view_request(wmgui.search_type);
        wmgui.chosen_table_browser = true;
    });
    $('#control_e').click(function(){ // plotting
        var orepr = {};
        for (var key in wmgui.search){
            if (['search_type', 'phid', 'numeric'].indexOf(key) > -1) continue;
            orepr[key] = wmgui.search[key];
        }
        while (true){
            var plot_type = WMCORE.get_random_term(['matrix', 'cube']); // the most interesting visualization types
            if (plot_type != wmgui.visavis_curtype) break;
        }
        window.location.hash = '#plot/' + plot_type + '/inquiry/' + $.param(orepr);
    });

    // visavis ctx
    $('#ctxpanel_matrix > ul > li').click(function(){
        var that = $(this);
        if (that.hasClass('embodied') || that.hasClass('ss_y')) return;
        var type = that.attr('id').split('_')[1],
            y_id = $('#ctxpanel_matrix > ul > li.ss_y');
        $('#ctxpanel_matrix > ul > li.embodied').removeClass('embodied');
        if (y_id.length) y_id.removeClass('ss_y');
        that.addClass('embodied');
        $('span.sops').remove();

        document.getElementById('visavis_iframe').contentWindow.matrix_order(type);
    });
    $('#ctxpanel_cube > ul > li').click(function(){
        var that = $(this);
        if (that.hasClass('embodied') || that.hasClass('ss_y') || that.hasClass('ss_z')) return;
        var type = that.attr('id').split('_')[1],
            y_id = $('#ctxpanel_cube > ul > li.ss_y'),
            z_id = $('#ctxpanel_cube > ul > li.ss_z');
        $('#ctxpanel_cube > ul > li.embodied').removeClass('embodied');
        if (y_id.length) y_id.removeClass('ss_y');
        if (z_id.length) z_id.removeClass('ss_z');
        that.addClass('embodied');
        $('span.sops').remove();

        if (document.getElementById('visavis_iframe').contentWindow.location.hash.indexOf('fixel=1') !== -1)
            document.getElementById('visavis_iframe').contentWindow.matrix_order(type);
        else
            document.getElementById('visavis_iframe').contentWindow.cube_order(type, type, type);
    });
    $('#ctxpanel_graph > ul > li').click(function(){
        var that = $(this);
        if (that.hasClass('embodied')) return;
        var type = that.attr('id').split('_')[1];
        $('#ctxpanel_graph > ul > li.embodied').removeClass('embodied');
        that.addClass('embodied');

        document.getElementById('visavis_iframe').contentWindow.graph_rebuild(type);
    });
    $('#select_cmp_trigger').change(function(){
        var value = $(this).val(),
            selected = $('#select_cmp_trigger option:selected'),
            title = selected.text();

        wmgui.dc_ctrl_flag = true;

        if (value == 'X')
            return;

        if (value == 'Y'){
            document.getElementById('visavis_iframe').contentWindow.cmp_discard(wmgui.visavis_curtype);
            return;
        }

        if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) == -1)
            return;

        var url = wmgui.vis_endpoint + '/' + wmgui.visavis_curtype + '?q=' + value;
        document.getElementById('visavis_iframe').contentWindow.cmp_download(url, wmgui.visavis_curtype);
    });
    $('li.discovery_custom').click(function(){
        if (!document.getElementById('visavis_iframe') || !document.getElementById('visavis_iframe').contentWindow)
            return false;

        var list = document.getElementById('visavis_iframe').contentWindow.visavis.elementals_on,
            html_list_on = '',
            html_list_off = '';

        for (var prop in wmgui.elemental_names){
            if (list.indexOf(prop) !== -1)
                html_list_on += '<div class="rearrange" rel="' + prop + '">' + wmgui.elemental_names[prop] + ' (&minus;)</div>';
            else
                html_list_off += '<div class="rearrange" rel="' + prop + '">' + wmgui.elemental_names[prop] + ' (+)</div>';
        }
        if (html_list_off) $('#discovery_disabled').html(html_list_off);

        $('#discovery_enabled').html(html_list_on);
        $('#discovery_custom_box, #overlay').show();
    });
    $('#discovery_custom_box').on('click', 'div.rearrange', function(){
        var that = $(this),
            prop = that.attr('rel'),
            idx = document.getElementById('visavis_iframe').contentWindow.visavis.elementals_on.indexOf(prop);
        if (that.parent().attr('id') == 'discovery_enabled'){
            if ($('#discovery_enabled div.rearrange').length == 1)
                return false;
            if (idx !== -1) document.getElementById('visavis_iframe').contentWindow.visavis.elementals_on.splice(idx, 1);
            $('#discovery_disabled').append('<div class="rearrange" rel="' + prop + '">' + wmgui.elemental_names[prop] + ' (+)</div>');
            $('#dc_' + prop).hide();
        } else {
            if (idx == -1) document.getElementById('visavis_iframe').contentWindow.visavis.elementals_on.push(prop);
            $('#discovery_enabled').append('<div class="rearrange" rel="' + prop + '">' + wmgui.elemental_names[prop] + ' (&minus;)</div>');
            $('#dc_' + prop).show();
        }
        that.remove();
    });
    $('#ss_gear_matrix, #ss_gear_cube').click(function(){
        var domain = $(this).attr('id').substr(8); // ss_gear_
        if (domain == 'matrix'){
            $('#ss_z, #sops_z').hide();
            $('#ss_x, #ss_y, #sops_x, #sops_y').css('width', '50%');
        } else {
            $('#ss_x, #ss_y, #ss_z, #sops_x, #sops_y, #sops_z').css('width', '33%');
            $('#ss_z, #sops_z').show();
        }

        // ss_ logic
        var common_type = $('#ctxpanel_' + domain + ' > ul > li.embodied').attr('id').split('_')[1], // NB embodied, not ss_x
            y_id = $('#ctxpanel_' + domain + ' > ul > li.ss_y'),
            z_id = $('#ctxpanel_' + domain + ' > ul > li.ss_z'),
            x_type = common_type,
            y_type = y_id.length ? y_id.attr('id').split('_')[1] : common_type,
            z_type = z_id.length ? z_id.attr('id').split('_')[1] : common_type,
            x_orders_html = '', y_orders_html = '', z_orders_html = '';

        $('#ctxpanel_' + domain + ' > ul > li').each(function(){
            var that = $(this),
                type = that.attr('id').split('_')[1],
                label = that.contents().filter(function(){ return this.nodeType !== 1 })[0].data.substr(3), // filter text only, then cut "by "
                cls_html = (type == x_type) ? ' class="ss_x"' : '';
            x_orders_html += '<li rev="ss_x" rel="x_' + type + '"' + cls_html + '>' + label + '</li>';
            cls_html = (type == y_type) ? ' class="ss_y"' : '';
            y_orders_html += '<li rev="ss_y" rel="y_' + type + '"' + cls_html + '>' + label + '</li>';
            if (domain == 'matrix')
                return true;
            cls_html = (type == z_type) ? ' class="ss_z"' : '';
            z_orders_html += '<li rev="ss_z" rel="z_' + type + '"' + cls_html + '>' + label + '</li>';
        });

        $('#ss_x > ul').html(x_orders_html);
        $('#ss_y > ul').html(y_orders_html);
        if (domain == 'cube') $('#ss_z > ul').html(z_orders_html);

        // sops_ logic
        $('li.sops_x').removeClass('sops_x');
        $('li.sops_y').removeClass('sops_y');
        $('li.sops_z').removeClass('sops_z');

        var sops_types = ['x', 'y', 'z'];
        $('span.sops').each(function(){
            var that = $(this),
                op = that.text(),
                type = that.attr('rel');
            $('#sops_' + type + ' > ul > li:contains("' + op + '")').addClass('sops_' + type);
            sops_types = sops_types.filter(function(x){ return x !== type });
        });
        sops_types.forEach(function(item){
            $('#sops_' + item + ' > ul > li:contains("none")').addClass('sops_' + item);
        });

        $('#ss_custom_box, #overlay').show();
    });
    $('div.ss_col').on('click', 'li', function(){
        var that = $(this),
            rowid = that.attr('rev'),
            rel_dat = that.attr('rel').split('_'),
            axis = rel_dat[0],
            clsname = (axis == 'x') ? 'ss_x' : ((axis == 'y') ? 'ss_y' : 'ss_z');
        $('#' + rowid + ' > ul > li.' + clsname).removeClass(clsname);
        that.addClass(clsname);
    });
    $('div.sops_col').on('click', 'li', function(){
        var that = $(this),
            rowid = that.parent().parent().attr('id'),
            axis = rowid.split('_')[1],
            clsname = (axis == 'x') ? 'sops_x' : ((axis == 'y') ? 'sops_y' : 'sops_z');
        $('#' + rowid + ' > ul > li.' + clsname).removeClass(clsname);
        that.addClass(clsname);
    });

    $('#tips_trigger').click(function(){
        wmgui.tooltip_var = 0;
        show_tooltip(wmgui.tooltips['advsearch']);
        return false;
    });

     // numeric search
    $('#numericbox').on('click', 'div.slider_close', function(){
        if ($('div.slider_numerics').length == 1){
            destroy_numericbox();
            delete wmgui.search.numeric;
            return false;
        }
        var that = $(this);
        that.siblings('div.slider').children('div.slider_numerics')[0].noUiSlider.destroy();
        that.parent('li').fadeOut(250, function(){ $(this).remove() });
    });

    $('#numericbox_do_trigger').click(function(){
        if ($('#advsbox').is(':visible'))
            $('#advsearch_do_trigger').trigger('click');
        else
            $('#search_trigger').trigger('click');
    });

    $('#numericbox_drop_trigger').click(function(){
        var sliders_numerics = document.getElementsByClassName('slider_numerics');
        //console.log(sliders_numerics);
        for (var i = 0; i < sliders_numerics.length; i++){
            var srange = sliders_numerics[i].noUiSlider.options.range;
            sliders_numerics[i].noUiSlider.set([srange.min, srange.max]);
        }
    });

    $('#close_numericbox').click(function(){
        destroy_numericbox();
        delete wmgui.search.numeric;
    });

    // mobile version switching
    /*$('#mobilebox span').click(function(){
        window.location.href = '/m/' + window.location.hash;
    });
    $('#mobilebox a').click(function(){
        $('#mobilebox').remove();
        return false;
    });*/

    // Keys press
    $(document).keydown(function(e){
        var key = window.event ? e.keyCode : e.which;
        if (key == 13){ // ENTER: input must trigger submit button via two parent divs!
            var focused = $(':focus');
            //console.log(focused);

            if (focused.hasClass('submitter')){
                focused.parent().parent().find('div.def_submittable').trigger('click');

            } else if (focused.hasClass('advs_input') || (focused.attr('id') || "").startswith('advs_fct_')){
                $('#advsearch_do_trigger').trigger('click');
            }
        } else if (key == 27){ // ESC
            var target = $('div.cross:visible');
            if (target.length) target.trigger('click');
        }
    });

    $(window).bind('hashchange', url_redraw_react);

    $(window).bind('storage', function(ev){
        // This is to execute the command in all the active GUI windows (except the current) e.g. setting a new state
        if (ev.originalEvent.key != 'wm_reload')
            return;
        var runnable_name = ev.originalEvent.newValue;
        if (runnable_name && window[runnable_name]) window[runnable_name]();
    });

    /*$(window).resize(function(){
        //document.title = document.body.clientWidth + ' px';
        if (document.body.clientWidth < 1000) $('#mobilebox').show();
        else                                  $('#mobilebox').hide();
    });*/
}
