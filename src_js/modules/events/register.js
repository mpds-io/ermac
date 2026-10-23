import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { switch_view_mode, show_examples } from '../ui/view-mode.js';
import { destroy_numericbox, create_floating_slider } from '../search/numeric.js';
import { request_search, request_refinement, show_interpretation } from '../search/request.js';
import { show_advsbox, show_aetmap } from '../search/facets.js';
import { url_redraw_react } from '../router/dispatcher.js';
import { open_context } from '../search/display.js';

function register_events(){

    document.querySelector('#ptable_area > ul').addEventListener('click', function(event){
        var that = event.target;
        if (!that.hasAttribute('data-pos')) return;
        wmgui.ptable.update_selectize = true;
        var selected_el = wmgui.ptable.elements[that.getAttribute('data-pos')];
        select_ptable_el(selected_el, that);
    });

    var radios = document.querySelectorAll('input[name="ptable_dtypes"]');
    for (var i = 0; i < radios.length; i++){
        radios[i].addEventListener('change', function(){
            if (!this.checked) return;
            wmgui.ptable.dtypes = this.value;
            var check = wmgui.multiselects['main'].read();
            select_ptable_series(check.elements);
        });
    }

    $('#search_trigger').click(function(){
        var query = wmgui.multiselects['main'].read(),
            val = $('#search_field-selectized').val();

        if (val){
            if (val.endsWith(" ") || val.endsWith(",")) val = val.substr(0, val.length - 1);
            var parsed = wmutils.guess(val);
            for (var key in parsed){
                if (key == 'ignored') continue;
                else if (query[key] && key == 'elements') query[key] += '-' + parsed[key];
                else if (query[key] && key == 'classes') query[key] += ', ' + parsed[key];
                else query[key] = parsed[key];
            }
        }

        if (wmgui.search.numeric && !query.numeric){
            query.numeric = '';
            wmgui.search.numeric.forEach(function(item){
                query.numeric += serialize_numeric.apply(this, item);
            });
            delete query.props;
        }

        if ($.isEmptyObject(query)){ notify('Sorry, unrecognized input'); return false; }

        wmgui.ctx_strict_phases = '';
        $('#ctx_strict_phases_trigger').prop('checked', true);

        var urlstr = $.param(query);
        if (window.location.hash == '#inquiry/' + urlstr){
            if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
            else urlstr += '=';
        }
        window.location.hash = '#inquiry/' + urlstr;
        return false;
    });

    $('#advsearch_do_trigger').click(function(){
        var curval = '', rest_input = '', query = {};
        $.each(wmgui.simple_facets, function(n, item){
            curval = $('#advs_fct_' + item).val();
            if (curval){
                if (item == "formulae") curval = wmutils.termify_formulae(curval);
                else if (item == "elements") curval = curval.replaceAll(',', '').replaceAll(' ', '-');
                else if (item == "doi") curval = curval.replace(/http:\/\/dx\.doi\.org\//, '').replace(/http:\/\/doi\.org\//, '').trim();
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
                if (query[item]) query[item] += ', ' + rest_input;
                else query[item] = rest_input;
            }
        });

        if (wmgui.search.numeric){
            query.numeric = '';
            wmgui.search.numeric.forEach(function(item){ query.numeric += serialize_numeric.apply(this, item); });
            delete query.props;
        }
        if ($.isEmptyObject(query)) return notify('Sorry, search is empty');

        wmgui.ctx_strict_phases = '';
        $('#ctx_strict_phases_trigger').prop('checked', true);

        var urlstr = $.param(query);
        if (window.location.hash == '#inquiry/' + urlstr){
            if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1);
            else urlstr += '=';
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
        delete wmgui.search.numeric;
    });

    $('#advsearch_init_trigger').click(function(){
        $('#advstab_options li').removeClass('working');
        $('#advstab_options li[rev=advstab_cry]').addClass('working');
        $('#advstab_cry').show();
        $('#advstab_main, #advstab_bib').hide();
        show_advsbox();
        return false;
    });

    $('#search_box').on('click', '#legend a', function(){
        var legend = $(this).text();
        window.location.hash = '#search/' + encodeURIComponent(legend);
        return false;
    });

    $('div.advs_legend > a').click(function(){
        var that = $(this), legend = that.text(), multiselects = that.parent().data('multiselects');
        if (multiselects){
            $('#advs_fct_' + multiselects + '-selectized').val('');
            wmgui.multiselects[multiselects].clear();
            var obj = {}; obj[multiselects] = legend;
            wmgui.multiselects[multiselects].write(obj);
        } else {
            that.parent().parent().children('input').val(legend).focus();
        }
        return false;
    });

    $('#databrowser, #ptable_results').on('click', 'div.gallery_img', function(){
        var that = $(this);
        if (that.attr('rel')){
            if (wmgui.view_mode === 1 && wmgui.ptable.dtypes > 1){
                var phid = that.attr('rel');
                wmgui.ptable.dtypes == 2 ?
                document.querySelector('#ptable_vis > iframe').contentWindow.location.hash = '#' + wmgui.phase_endpoint + '?phid=' + phid + '&struct=1' :
                document.querySelector('#ptable_vis > iframe').contentWindow.location.replace(get_visavis_url({phid: phid}, 'graph', window.innerHeight - 50));
                $('div.gallery_item.active').removeClass('active');
                that.parent().addClass('active');
            } else {
                var path = that.attr('data-path') || "phase_id";
                window.location.hash = '#' + path + '/' + that.attr('rel');
            }
        }
    });

    $('#databrowser').on('mousedown', 'a.resolve_ref', function(e){
        var that = $(this), bid = that.attr('rel');
        $('a.resolve_ref[rel=' + bid + ']').addClass('visited');
        wmgui.bid_history.push(parseInt(bid));
        window.localStorage.setItem(wmgui.store_bids_key, JSON.stringify(wmgui.bid_history));
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

    $('#databrowser').on('click', 'a.launch_id', function(e){
        wmgui.cancel_event(e);
        var phid_link = $(this).attr('href');
        if (window.location.hash == phid_link) phid_link += '.';
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
        if (selected_aetypes.indexOf(term) == -1) wmgui.multiselects['aetypes'].write({'aetypes': term});
        show_aetmap(term);
    });

    $('#aet_limit').click(function(e){
        var selected_classes = (wmgui.multiselects['classes'].read()['classes'] || "").split(', ');
        if (this.checked){
            var selected_aetypes = (wmgui.multiselects['aetypes'].read()['aetypes'] || "").split(', ').filter(function(x){ return x }),
                limit_kwd = wmgui.poly_limits[selected_aetypes.length];
            if (!limit_kwd){ wmgui.cancel_event(e); notify('Sorry, only up to 3 supported'); return false; }
            if (selected_classes.indexOf(limit_kwd) == -1) wmgui.multiselects['classes'].write({'classes': limit_kwd});
        } else {
            var poly_limits = Object.values(wmgui.poly_limits);
            wmgui.multiselects['classes'].clear();
            wmgui.multiselects['classes'].write({'classes': selected_classes.filter(function(x){ return poly_limits.indexOf(x) == -1 }).join(', ')});
        }
        return true;
    });

    $('#visualize, #xrpdize').click(function(){
        close_vibox();
        launch_db_iframed(this.getAttribute('data-rank'));
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

        wmgui.active_ajax = $.ajax({
            type: 'GET', url: wmgui.rfn_endpoint, data: {q: JSON.stringify(given_search)}
        }).done(function(data){
            if (data.error) return notify(data.error);
            var html = '';
            delete given_search['numeric']; delete given_search['extd_refine'];
            var inquiry = false;
            $.each(wmgui.inquiries, function(n, i){ if (given_search[i]){ inquiry = true; return false; } });
            $.each(data.payload, function(i, found){
                var link_base = '', orepr = {};
                $.each(given_search, function(key, val){
                    if (key == 'search_type') return true;
                    else if (facet == 'elements' && (key == 'elements' || key == 'formulae')) return true;
                    else if (facet == 'props' && key == 'props') return true;
                    link_base += val + ' ';
                    if (orepr[key]) orepr[key] += ', ' + val;
                    else orepr[key] = val;
                });
                if (facet == 'props') found[0] = found[0].replace(/\(|\)/g, "").replace(/\/[\w\-]*/g, "");
                if (orepr[facet]) orepr[facet] += ', ' + found[0];
                else orepr[facet] = found[0];
                if (orepr['elements']) orepr['elements'] = orepr['elements'].replaceAll(', ', '-');
                if (inquiry) html += '<li class="extd_rfns fct_' + facet + '"><a href="#inquiry/' + $.param(orepr) + '">' + found[0] + '</a></li>';
                else html += '<li class="extd_rfns fct_' + facet + '"><a href="#search/' + link_base + found[0] + '">' + found[0] + '</a></li>';
            });
            html += '<li class="extd_rfns fct_' + facet + ' collapse_refine"><a class="collapse_refine" rel="' + facet + '" href="#">Show less&nbsp;</a></li>';
            $('#refine_col > ul > li:not(.fct_' + facet + ')').addClass('hidden_rfns').slideUp();
            $('a.extd_refine[rel=' + facet + ']').parent().hide().after(wmgui.clean(html));
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
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

    $('#tagcloudbox').on('click', 'a.collateral', function(){
        var act = $(this).attr('rel');
        if (act == 'adv'){
            $('#advsearch_init_trigger').trigger('click');
            $('div.menu_collateral').hide();
        } else if (act == 'idea'){
            window.location.hash = '#plot/' + wmgui.get_random_term(['pie', 'lit', 'graph']) + '/search/' + wmgui.get_interesting()['text'];
        } else if (act == 'sod'){
            var now = new Date(), pick = now.getDate() % wmgui.s_examples.length, start = new Date(now.getFullYear(), 0, 0), diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000), nday = Math.floor(diff / (1000 * 60 * 60 * 24)), sod = wmgui.s_examples[pick] + nday;
            window.location.hash = '#entry/S' + sod;
        } else if (act == 'my'){
            var locals = JSON.parse(window.localStorage.getItem(wmgui.store_user_key) || '{}');
            if (locals.ipbased) window.location.hash = '#inquiry/orgs=' + locals.name;
            else if (locals.name){ var names = locals.name.split(' '); window.location.hash = '#inquiry/authors=' + encodeURIComponent(names[names.length - 1]); }
        }
        return false;
    });

    $('#hintsbox_msg').on('click', 'div.wmbutton', function(){
        var range = document.createRange();
        range.selectNode($('#hintsbox_msg > pre').get(0));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        notify('Copied');
    });

    $('#tooltip').on('click', 'span', function(){
        var that = $(this), act = that.attr('rel'), forced = that.hasClass('forced');
        document.getElementById('tooltip').style.display = 'none';
        if (act && wmgui.tooltips[act]) show_tooltip(wmgui.tooltips[act], forced);
    });

    $('#sim_col').on('click', 'li > a', function(){
        $('#sim_col > ul > li').removeClass('selected');
        $(this).parent().addClass('selected');
        wmgui.passive_sim_col = false;
        return true;
    });

    $('div.close_user_dialogue').click(function(){ $('#userbox').trigger('click'); });
    $('div.close_advs_dialogue').click(function(){ $('#advsbox, #overlay, #aetmap').hide(); });
    $('#close_inquiry_dialogue').click(function(){ $('#inquirybox').hide(); });

    $('div._close_ctx').click(function(){
        try { wmgui.quick_ajax.abort() } catch(e){}
        $('.busy_entry').removeClass('busy_entry');
        $('#ctx_col, #sim_col').hide();
        wmgui.passive_sim_col = true;
        close_vibox();
    });

    $('#hy_box').on('click', 'span', function(){
        var hyid = $(this).attr('class');
        $('span.' + hyid).each(function(){ var that = $(this); that.parent().find('ul').toggle(); that.text() == 'expand' ? that.text('collapse') : that.text('expand'); });
    });

    $('#hy_box').on('click', 'a.dynprop', function(){
        var value = $(this).attr('data-val');
        window.location.hash = wmgui.aug_search_cmd("props", value);
        return false;
    });

    $('#hy_box').on('click', 'strong.numeric', function(){
        var prop = $(this).attr('rel'), data = wmgui.numerics[prop], prop_id = data[0], units = data[1], min = data[2], max = data[3], step = data[4];
        var nblocks = $('div.slider_numerics').length;
        if (nblocks >= 2) notify('Too little phases have all these properties reported &mdash; expect no results');
        if (nblocks >= 8) return;
        create_floating_slider(prop, prop_id, units, min, max, step);
    });

    $('strong.numeric').click(function(){
        var prop = $(this).attr('rel'), data = wmgui.numerics[prop], prop_id = data[0], units = data[1], min = data[2], max = data[3], step = data[4];
        create_floating_slider(prop, prop_id, units, min, max, step);
    });

    $('#hy_options > li').click(function(){
        var that = $(this), desttab = that.attr('rev');
        if (desttab == 'hy_vis'){ window.open(wmgui.static_host + '/labs/ontology'); return; }
        that.addClass('working').siblings().removeClass('working');
        $('div.hy_tabs').hide();
        $('#' + desttab).show();
    });

    $('#dtypes > ul > li').click(function(){
        var that = $(this), facet = that.data('facet'), term = that.data('term');
        if (facet == 'classes'){
            if (wmgui.search.classes) wmgui.search.classes = wmgui.search.classes.replace('peer-reviewed', '').replace('peer-review', '').replace('machine-learning', '').replace('machine learning', '').replace('ab initio calculations', '').split(',').map(function(x){ return x.trim() }).filter(function(x){ return x }).join(', ');
        }
        window.location.hash = wmgui.aug_search_cmd(facet, term);
    });

    $('#dtypes_phid > ul > li').click(function(){
        var that = $(this), rankfilter = that.data('rankfilter'), active = that.hasClass('active'), legend = that.text();
        request_search({'phid': wmgui.search.phid, 'rankfilter': active ? null : rankfilter}, legend + ' of phase ' + wmgui.search.phid, true);
        $('#dtypes_phid > ul > li').removeClass('active');
        active ? this.classList.remove('active') : this.classList.add('active');
    });

    $(window).scroll(wmgui.debounce(function(){
        if (wmgui.view_mode == 2){
            if (wmgui.unfinished_page){
                if ($('#footer').offset().top - $(window).scrollTop() - $(window).height() < 50){
                    wmgui.unfinished_page = false;
                    var cur_search = {offset: wmgui.quick_page_size};
                    $.extend(cur_search, wmgui.search);
                    wmgui.active_ajax = $.ajax({
                        type: 'GET', url: wmgui.search_endpoint,
                        data: { q: JSON.stringify(cur_search), strict: wmgui.ctx_strict_phases, sid: wmgui.sid },
                        beforeSend: wmgui.show_preloader
                    }).always(wmgui.hide_preloader).done(function(data){
                        if (data.error) return notify(data.error);
                        $('div.context_msg').hide();
                        show_hints();
                        if (!data.out.length) return;
                        if (wmgui.thumbed_display) $('#databrowser tr td').append(build_thumbs(data.out));
                        else { $('#databrowser tbody').append(build_cells(data.out)); $('#databrowser').trigger('update'); }
                    }).fail(function(xhr, textStatus, errorThrown){
                        if (textStatus != 'abort') notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
                    });
                }
            }
            var iframe = $('#iframe');
            if (iframe.length && !wmgui.is_inview(iframe)) close_vibox();
        } else if (wmgui.ptable.activated){
            var scroll_pos = window.scrollY;
            if (scroll_pos > 40){
                document.getElementById('ptable_dtypes_box').classList.remove('resulted');
                document.getElementById('legend').style.display = 'none';
                (wmgui.ptable.vis_fixed && scroll_pos > 550) ? document.getElementById('ptable_vis').classList.add('fixed') : document.getElementById('ptable_vis').classList.remove('fixed');
            } else {
                document.getElementById('ptable_dtypes_box').classList.add('resulted');
                document.getElementById('legend').style.display = 'block';
                document.getElementById('ptable_vis').classList.remove('fixed');
            }
        }
    }, 300));

    $('#userbox').click(function(){
        var that = $(this);
        if (window.location.hash == that.data('saved_hash')) that.data('saved_hash', false);
        if (that.data('saved_hash')){
            window.location.replace(that.data('saved_hash'));
            that.data('saved_hash', false);
        } else {
            if (window.location.hash.indexOf('modal') !== -1) window.location.replace('#start');
            else {
                that.data('saved_hash', window.location.hash);
                if (wmgui.sid) window.location.replace('#modal/menu');
                else window.location.replace('#modal/login');
            }
        }
    });

    $('span.href[rel]').click(function(){ window.location.replace($(this).attr('rel')); });

    $('div.spinoff_pane').on('click', 'span.extd', function(){
        var that = $(this);
        that.siblings('span.legend').toggle();
        that.text() == 'Show more info...' ? that.text('Hide more info...') : that.text('Show more info...');
    });

    $('#interpret').on('click', 'li', function(){
        var that = $(this), link = that.attr('rel');
        if (!!link){ window.location.hash = link; return; }
        var csscls = that.attr('class');
        if (csscls.indexOf('numeric') !== -1) window.location.hash = '#hierarchy';
        else if (csscls.indexOf('authors') !== -1 || csscls.indexOf('years') !== -1 || csscls.indexOf('codens') !== -1 || csscls.indexOf('doi') !== -1 || csscls.indexOf('geos') !== -1 || csscls.indexOf('orgs') !== -1){
            $('#advstab_options li').removeClass('working'); $('#advstab_options li[rev=advstab_bib]').addClass('working'); $('div.advstab').hide(); $('#advstab_bib').show(); show_advsbox();
        } else if (csscls.indexOf('formulae') !== -1 || csscls.indexOf('props') !== -1 || csscls.indexOf('elements') !== -1 || csscls.indexOf('classes') !== -1){
            $('#advstab_options li').removeClass('working'); $('#advstab_options li[rev=advstab_main]').addClass('working'); $('div.advstab').hide(); $('#advstab_main').show(); show_advsbox();
        } else {
            $('#advstab_options li').removeClass('working'); $('#advstab_options li[rev=advstab_cry]').addClass('working'); $('div.advstab').hide(); $('#advstab_cry').show(); show_advsbox();
            if (wmgui.search.aetypes) show_aetmap(wmgui.search.aetypes);
        }
    });

    $('#tab_links > li').click(function(){
        try { wmgui.active_ajax.abort() } catch(e){}
        try { wmgui.quick_ajax.abort() } catch(e){}
        var that = $(this), desttab = that.attr('rev');
        that.addClass('working').siblings().removeClass('working');
        $('div.menu_tabs').hide(); $('#' + desttab).show();
        if (desttab == 'usr_tab_api_key'){
            $('#hintsbox_msg').html(wmgui.api_msg);
            wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid}, beforeSend: wmgui.show_preloader
            }).always(wmgui.hide_preloader).done(function(data){
                if (data.error) return notify(data.error);
                $('#usr_api_key').html(data.msg);
                if (data.revokable) $('#revoke_usr_api_key_holder').show();
                else if (data.creatable) $('#create_usr_api_key_holder').show();
                else return notify('Your session ended: please, <span class="href relogin">log in again</span>');
            }).fail(function(xhr, textStatus, errorThrown){
                if (textStatus != 'abort') notify('Your session ended: please, <span class="href relogin">log in again</span>');
                $('#usr_api_key').html('authentication error');
            });
        } else if (desttab == 'usr_tab_perms'){
            $('#hintsbox_msg').html(wmgui.get_random_term(wmgui.welcome_msgs));
            var locals = JSON.parse(window.localStorage.getItem(wmgui.store_user_key) || '{}');
            wmgui.active_ajax = $.ajax({ type: 'POST', url: locals.ipbased ? wmgui.ip_perms_endpoint : wmgui.perms_endpoint, data: {sid: wmgui.sid}, beforeSend: wmgui.show_preloader
            }).always(wmgui.hide_preloader).done(function(data){
                if (data.error) return notify(data.error);
                if (!data.hasOwnProperty('gui') || !data.hasOwnProperty('api')) return notify('Your session ended: please, <span class="href relogin">log in again</span>');
                $('#perms_view').html(describe_perms(data));
            }).fail(function(xhr, textStatus, errorThrown){
                if (textStatus != 'abort') notify('Your session ended: please, <span class="href relogin">log in again</span>');
                $('#perms_view').html('authentication error');
            });
        } else if (desttab == 'usr_tab_ctrl') window.location.href = '/ctrl/?' + Math.floor(Math.random() * 1000);
        else if (desttab == 'usr_tab_absolidix') window.location.href = wmgui.mydata_addr;
        else if (desttab == 'usr_tab_account') $('#hintsbox_msg').html(wmgui.get_random_term(wmgui.welcome_msgs));
    });

    $('#advstab_options > li').click(function(){
        var that = $(this), desttab = that.attr('rev');
        that.addClass('working').siblings().removeClass('working');
        $('div.advstab').hide(); $('#' + desttab).show();
    });

    $('a.link_adjuster').click(function(){
        if (window.location.hash == '#polyhedra'){ window.location.hash = '#polyhedra/'; return false; }
        else if (window.location.hash == '#polyhedra/'){ window.location.hash = '#polyhedra'; return false; }
        else return true;
    });

    $('#create_usr_api_key').click(function(){
        $(this).parent().hide();
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid, create: true}, beforeSend: wmgui.show_preloader
        }).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return notify(data.error);
            $('#usr_api_key').html(data.msg); $('#revoke_usr_api_key_holder').show();
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Your session ended: please, <span class="href relogin">log in again</span>');
        });
    });
    $('#revoke_usr_api_key').click(function(){
        $(this).parent().hide();
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.api_key_endpoint, data: {sid: wmgui.sid, revoke: true}, beforeSend: wmgui.show_preloader
        }).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return notify(data.error);
            $('#usr_api_key').html('Successfully revoked'); $('#create_usr_api_key_holder').show();
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Your session ended: please, <span class="href relogin">log in again</span>');
        });
    });

    $('#login_trigger').click(function(){
        if ($(this).data('busy')) return; $(this).data('busy', true); $(this).text('In process...');
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.login_endpoint, data: {login: $('#login_email').val().trim(), pass: $('#login_password').val(), ed: wmgui.edition}, beforeSend: wmgui.show_preloader
        }).always(function(){ $('#login_trigger').data('busy', false); $('#login_trigger').text('Login'); wmgui.hide_preloader();
        }).done(function(data){
            if (data.error) return notify(data.error);
            if (!data.sid || !data.name || !data.acclogin) return notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
            user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
            $('#userbox').trigger('click');
        }).fail(function(xhr, textStatus, errorThrown){ notify("Login unsuccessful"); });
    });

    $('#factor_trigger').click(function(){
        if ($(this).data('busy')) return; $(this).data('busy', true); $(this).text('Sending...');
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.factor_endpoint, data: {login: $('#factor_by_email').val().trim()}, beforeSend: wmgui.show_preloader
        }).always(function(){ $('#factor_trigger').data('busy', false); $('#factor_trigger').text('Send code'); wmgui.hide_preloader();
        }).done(function(data){
            if (data.error) return notify(data.error);
            notify('Please, check your inbox (and spam)');
            document.getElementById('factor_trigger').style.display = 'none';
            document.getElementById('factor_form_step_one').style.display = 'none';
            document.getElementById('factor_form_step_two').style.display = 'block';
            document.getElementById('factor_form_resp_0').focus();
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Sorry, a network error occured. Please, try again');
        });
    });

    $('#restore_trigger').click(function(){
        if ($(this).data('busy')) return; $(this).data('busy', true); $(this).text('Sending...');
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.restore_endpoint, data: {login: $('#restore_by_email').val().trim(), ed: wmgui.edition}, beforeSend: wmgui.show_preloader
        }).always(function(){ $('#restore_trigger').data('busy', false); $('#restore_trigger').text('Send link'); wmgui.hide_preloader();
        }).done(function(data){
            if (data.error) return notify(data.error);
            notify('Please, check your inbox (and spam)'); $('#userbox').trigger('click');
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Sorry, a network error occured. Please, try again');
        });
    });

    $('#accpass_trigger').click(function(){ if ($(this).hasClass('disabled')) return false; $('#account_pass_change').toggle(); });

    $('#password_trigger').click(function(){
        var p1 = $("#new_password_1").val(), p2 = $("#new_password_2").val();
        if (!p1 || !p2) return notify("Please, type your new password in both fields");
        if (p1 !== p2) return notify("Passwords do not match (typo?)");
        if ($(this).data('busy')) return; $(this).data('busy', true); $(this).text('Changing...');
        try { wmgui.active_ajax.abort() } catch(e){}
        wmgui.active_ajax = $.ajax({ type: 'POST', url: wmgui.password_endpoint, data: {new_password: p2, sid: wmgui.sid, ed: wmgui.edition}, beforeSend: wmgui.show_preloader
        }).always(function(){ $('#password_trigger').data('busy', false); $('#password_trigger').text('Change'); wmgui.hide_preloader();
        }).done(function(data){
            if (data.error) return notify(data.error);
            user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
            window.location.replace('#start'); $('#account_pass_change').hide();
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') notify('Your session ended: please, <span class="href relogin">log in again</span>');
        });
    });

    $('#logout_trigger').click(function(){
        if ($(this).hasClass('disabled')) return false;
        $.ajax({ type: 'POST', url: wmgui.logout_endpoint, data: {sid: wmgui.sid}
        }).done(function(data){}).fail(function(xhr, textStatus, errorThrown){});
        user_logout(); $('#userbox').trigger('click');
    });

    $('#notifybox').on('click', 'span.relogin', force_relogin);

    var resps = document.getElementsByClassName('factor_form_resp');
    for (var i = 0; i < resps.length; i++){
        resps[i].addEventListener('keyup', function(evt){
            if (evt.keyCode == 8 || evt.keyCode == 37){ var prev = this.previousElementSibling; if (prev){ prev.focus(); prev.select(); }
            } else if (evt.keyCode > 47 && evt.keyCode < 58){
                submit_factor_form_resp();
                var next = this.nextElementSibling; if (next){ next.focus(); next.select(); }
            }
        });
        resps[i].addEventListener('paste', function(evt){
            var pasted = (evt.clipboardData || window.clipboardData).getData("text");
            if (!pasted || !pasted.length) return false;
            for (var i = 0; i < 6; i++) document.getElementById('factor_form_resp_' + i).value = pasted.charAt(i);
            submit_factor_form_resp();
        });
    }

    $('#search_holder').keydown(function(e){
        var key = window.event ? e.keyCode : e.which;
        if (key == 13) $('#search_trigger').trigger('click');
    });

    // View mode switchers
    $('#control_a').click(function(){
        var orepr = {};
        for (var key in wmgui.search){ if (['search_type', 'phid'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
        wmgui.search_type = 0; wmgui.search.search_type = wmgui.search_type;
        var urlstr = $.param(orepr);
        if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1); else urlstr += '=';
        window.location.hash = '#inquiry_entries/' + urlstr;
    });
    $('#control_b').click(function(){
        var orepr = {};
        for (var key in wmgui.search){ if (['search_type', 'phid'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
        wmgui.search_type = 1; wmgui.search.search_type = wmgui.search_type;
        var urlstr = $.param(orepr);
        if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1); else urlstr += '=';
        window.location.hash = '#inquiry_phases/' + urlstr;
    });
    $('#control_f').click(function(){
        var orepr = {};
        for (var key in wmgui.search){ if (['search_type', 'phid'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
        wmgui.search_type = 2; wmgui.search.search_type = wmgui.search_type;
        var urlstr = $.param(orepr);
        if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1); else urlstr += '=';
        window.location.hash = '#inquiry_articles/' + urlstr;
    });

    $('#control_c').click(function(){
        wmgui.visavis_terminating = true; wmgui.thumbed_display = false;
        if (wmgui.visavis_working){
            var orepr = {};
            for (var key in wmgui.search){ if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
            var urlstr = $.param(orepr);
            if (window.location.hash == '#inquiry/' + urlstr){ if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1); else urlstr += '='; }
            window.location.hash = '#inquiry/' + urlstr;
        } else re_view_request(wmgui.search_type);
        wmgui.chosen_table_browser = true;
    });
    $('#control_d').click(function(){
        wmgui.visavis_terminating = true; wmgui.thumbed_display = true;
        if (wmgui.visavis_working){
            var orepr = {};
            for (var key in wmgui.search){ if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
            var urlstr = $.param(orepr);
            if (window.location.hash == '#inquiry/' + urlstr){ if (urlstr.slice(-1) == '=') urlstr = urlstr.substr(0, urlstr.length - 1); else urlstr += '='; }
            window.location.hash = '#inquiry/' + urlstr;
        } else re_view_request(wmgui.search_type);
        wmgui.chosen_table_browser = true;
    });
    $('#control_e').click(function(){
        var orepr = {};
        for (var key in wmgui.search){ if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue; orepr[key] = wmgui.search[key]; }
        while (true){ var plot_type = wmgui.get_random_term(['matrix', 'cube']); if (plot_type != wmgui.visavis_curtype) break; }
        window.location.hash = '#plot/' + plot_type + '/inquiry/' + $.param(orepr);
    });

    $('#ctx_strict_phases_trigger').change(function(e){
        if (!wmgui.search.elements){ wmgui.cancel_event(e); return false; }
        var arity_kwd = wmutils.arity_keys[wmgui.search.elements.split('-').length], kwd_exists = false;
        if (wmgui.search.classes){
            $.each(wmutils.arity_keys.slice(1), function(num, value){
                if (num == 6) return false;
                if (wmgui.search.classes.indexOf(value) !== -1){ kwd_exists = true; return false; }
            });
            if (!kwd_exists){ wmgui.search.classes += ', ' + arity_kwd; wmgui.multiselects['main'].write({'classes': arity_kwd}); }
        } else { wmgui.search.classes = arity_kwd; wmgui.multiselects['main'].write({'classes': arity_kwd}); }
        wmgui.ctx_strict_phases = $('#ctx_strict_phases_trigger').is(':checked') ? '' : '1';
        re_view_request(wmgui.search_type);
    });

    $('#numericbox').on('click', 'div.slider_close', function(){
        if ($('div.slider_numerics').length == 1){ destroy_numericbox(); delete wmgui.search.numeric; $('#search_field-selectized').val(''); wmgui.multiselects['main'].clear(); wmgui.multiselects['main'].write(wmgui.search); return false; }
        var that = $(this);
        that.siblings('div.slider').children('div.slider_numerics')[0].noUiSlider.destroy();
        that.parent('li').fadeOut(250, function(){ $(this).remove() });
    });

    $('#numericbox_do_trigger').click(function(){
        var sliders_numerics = document.getElementsByClassName('slider_numerics'), numeric = [];
        for (var i = 0; i < sliders_numerics.length; i++){
            var sdata = sliders_numerics[i].noUiSlider.get(), srange = sliders_numerics[i].noUiSlider.options.range, srange = [srange.min, srange.max];
            var prop = sliders_numerics[i].getAttribute('rel');
            numeric.push([prop, '>', sdata[0]]);
            numeric.push([prop, '<', sdata[1]]);
        }
        if (numeric.length) wmgui.search.numeric = numeric;
        if ($('#advsbox').is(':visible')) $('#advsearch_do_trigger').trigger('click');
        else $('#search_trigger').trigger('click');
    });

    $('#numericbox_drop_trigger').click(function(){
        var sliders_numerics = document.getElementsByClassName('slider_numerics');
        for (var i = 0; i < sliders_numerics.length; i++){
            var srange = sliders_numerics[i].noUiSlider.options.range;
            sliders_numerics[i].noUiSlider.set([srange.min, srange.max]);
        }
    });

    $('#close_numericbox').click(function(){
        destroy_numericbox(); delete wmgui.search.numeric;
        $('#search_field-selectized').val(''); wmgui.multiselects['main'].clear(); wmgui.multiselects['main'].write(wmgui.search);
    });

    $('#tips_trigger').click(function(){
        wmgui.tooltip_counter = 0;
        show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]);
        return false;
    });

    $(window).bind('hashchange', url_redraw_react);

    $(window).bind('storage', function(ev){
        if (ev.originalEvent.key != wmgui.store_comm_exec_key) return;
        var runnable_name = ev.originalEvent.newValue;
        if (runnable_name && window[runnable_name]) window[runnable_name]();
    });

    document.querySelector('#ptable_previews').addEventListener('click', function(event){
        if (event.target.classList.contains('subphases_trigger')){
            var state = parseInt(event.target.getAttribute('data-state')),
                req = Object.assign({}, wmgui.ptable.query), param;
            if (state === 1) param = 'strict=1';
            else { param = 'subphases=1'; delete req.classes; }
            ajax_download(wmgui.ptable.active_ajax, wmgui.search_endpoint + '?q=' + JSON.stringify(req) + '&' + param, render_left);
            wmgui.ptable.subphases_set(state);
        }
    });

    document.getElementById('darkmode_trigger').onclick = function(){
        wmgui.darkmode.toggle();
        document.getElementById('darkmode_trigger').innerHTML = wmgui.darkmode.isActivated() ? 'enabled' : 'disabled';
        document.getElementById('comms').contentWindow.postMessage(JSON.stringify({darkmode: wmgui.darkmode.isActivated() ? 1 : 2}), '*');
    }

    window.addEventListener('message', function(message){
        var received = {};
        try { received = JSON.parse(message.data); } catch (ignore){}
        var darkmode = received.darkmode;
        if (darkmode !== undefined){
            darkmode = (darkmode === 1);
            if (darkmode !== wmgui.darkmode.isActivated()) wmgui.darkmode.toggle();
            document.getElementById('darkmode_trigger').innerHTML = wmgui.darkmode.isActivated() ? 'enabled' : 'disabled';
        }
    });
}
window.register_events = register_events;

export { register_events };