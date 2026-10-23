import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { switch_view_mode, show_examples } from '../ui/view-mode.js';
import { request_search, show_interpretation } from '../search/request.js';
import { manage_visavis, start_visavis, get_visavis_url } from '../search/visavis.js';
import { show_tooltip } from '../ui/notifications.js';
import { show_modal, describe_perms, user_login, force_relogin } from '../search/auth.js';
import { arrange_menu_collateral } from '../ui/view-mode.js';
import { render_all_polyhedra } from '../search/facets.js';

function url_redraw_react(){
    var anchors = window.location.hash.substr(1).split('/');

    if (!anchors.length) return;
    $('#overlay, #aetmap, #dtypes_phid, div.modal, div.menu_collateral').hide();
    $('#dtypes_phid > ul > li').removeClass('active');

    try { wmgui.active_ajax.abort() } catch(e){}
    try { wmgui.quick_ajax.abort() } catch(e){}

    if (window['url__' + anchors[0]]) window['url__' + anchors[0]](anchors.slice(1).join('/'));
    else notify('Sorry, unknown route requested');
}
window.url_redraw_react = url_redraw_react;

function url__start(arg){
    switch_view_mode(1);
    if (wmgui.tooltip_counter < 2) setTimeout(function(){ show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]) }, 4000);
}
window.url__start = url__start;

function url__search(arg, no_sync){
    var query = decodeURIComponent(arg),
        parsed = wmutils.guess(query);

    if (parsed.numeric) wmgui.search_type = 1;

    show_interpretation(parsed);
    delete parsed.ignored;

    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    wmgui.multiselects['main'].write(parsed);

    wmgui.search = parsed;
    parsed.search_type = wmgui.search_type;

    if (!no_sync) request_search(parsed, query, wmgui.search_type);
}
window.url__search = url__search;

function url__inquiry(arg, no_sync){
    var inquiry = arg.split("&").map( function(n){ return n = n.split("="), this[n[0]] = n[1], this }.bind({}) )[0];

    wmgui.facets.forEach(function(item){
        if (inquiry[item]) inquiry[item] = decodeURIComponent(inquiry[item].replaceAll('+', ' '));
    });

    if (inquiry.numeric){
        inquiry.numeric = decodeURIComponent(inquiry.numeric).split(';').map(function(item){ return item.split(',') });
        inquiry.numeric = inquiry.numeric.filter(function(item){ return item.length == 3 });
        wmgui.search_type = 1;
    }

    show_interpretation(inquiry);
    delete inquiry.ignored;

    var caption_items = [];
    $.each(inquiry, function(k, v){ caption_items.push(v) });

    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    wmgui.multiselects['main'].write(inquiry);

    wmgui.search = inquiry;
    inquiry.search_type = wmgui.search_type;

    if (!no_sync) request_search(inquiry, caption_items.join(" ").replaceAll(",", " "), wmgui.search_type);
}
window.url__inquiry = url__inquiry;

function url__inquiry_entries(arg){
    wmgui.search_type = 0;
    return url__inquiry(arg);
}
window.url__inquiry_entries = url__inquiry_entries;

function url__inquiry_phases(arg){
    wmgui.search_type = 1;
    return url__inquiry(arg);
}
window.url__inquiry_phases = url__inquiry_phases;

function url__inquiry_articles(arg){
    wmgui.search_type = 2;
    return url__inquiry(arg);
}
window.url__inquiry_articles = url__inquiry_articles;

function url__plot(arg){
    var q = arg.split('/'),
        plot_type = q[0],
        search_verb = q[1],
        query = q[2];

    if (!plot_type || !search_verb || !query)
        return notify('Sorry, unknown route: ' + arg);

    if (search_verb == 'search')
        url__search(query, true);
    else if (search_verb == 'inquiry')
        url__inquiry(query, true);
    else
        return notify('Sorry, unknown route: ' + arg);

    wmgui.visavis_curtype = plot_type;

    switch_view_mode(2);

    setTimeout(function(){
        start_visavis(plot_type);
    }, 0);

    if (wmgui.tooltip_counter < 2 && (plot_type == 'matrix' || plot_type == 'cube')){
        setTimeout(function(){ show_tooltip(wmgui.tooltips['ss_axes'], true) }, 3000);
    }
}
window.url__plot = url__plot;

function url__entry(arg){
    wmgui.search_type = 0;
    wmgui.visavis_terminating = true;
    request_search({'entry': arg}, 'entry ' + arg, true);
    wmgui.search = {};
    wmgui.passive_sim_col = true;
    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    show_interpretation();
}
window.url__entry = url__entry;

function url__phase_id(arg){
    wmgui.search_type = 0;
    if (!wmgui.ptable.visible){
        $('#search_field-selectized').val('');
        wmgui.multiselects['main'].clear();
    }
    show_interpretation();
    var phid = parseInt(arg);
    wmgui.search = {'phid': phid};
    wmgui.search.search_type = wmgui.search_type;
    request_search({'phid': phid}, 'phase ' + phid, true);
}
window.url__phase_id = url__phase_id;

function url__phase(arg){
    var phase_data = arg.split('/'),
        formula = phase_data[0],
        spg = phase_data[1],
        pearson = phase_data[2];

    if (formula && spg && pearson){
        wmgui.active_ajax = $.ajax({
            type: 'GET',
            url: wmgui.phph_endpoint,
            data: {phase: [formula, spg, pearson].join('/')},
            beforeSend: wmgui.show_preloader
        }).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return notify(data.error);
            window.location.replace('#phase_id/' + data.phid);
        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort')
                notify('Sorry, a network error occured. Please, try again');
        });
    } else return notify('Sorry, wrong phase given');
}
window.url__phase = url__phase;

function url__article(arg){
    wmgui.search_type = 0;
    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    show_interpretation();
    var bentry = parseInt(arg);
    wmgui.search = {'bid': bentry};
    wmgui.search.search_type = wmgui.search_type;
    request_search({'bid': bentry}, 'B' + bentry, true);
}
window.url__article = url__article;

function url__hierarchy(){
    $('body').removeClass('noscroll');
    $('#overlay').show();
    window.scrollTo(0, 0);
    $('#hy_box').show();
}
window.url__hierarchy = url__hierarchy;

function url__modal(arg){
    if (arg == "login"){
        if (wmgui.sid) return window.location.replace('#modal/menu');
        if (wmgui.edition == 1){
            return window.location.replace('oauth/asm.html');
        }
        show_modal(arg);
    } else if (arg == "restore" || arg == "factor"){
        if (wmgui.sid) return window.location.replace('#modal/menu');
        show_modal(arg);
    } else if (arg == "menu"){
        if (!wmgui.sid) return window.location.replace('#modal/login');
        $("#new_password_1, #new_password_2").val('');
        arrange_menu_collateral();
        $('#menubox, div.menu_collateral').show();
    } else return notify("Sorry, unknown modal window");

    $('#overlay').show();
}
window.url__modal = url__modal;

function url__access(arg){
    $.ajax({
        type: 'POST',
        url: wmgui.access_endpoint,
        data: {a: arg, ed: wmgui.edition}
    }).done(function(data){
        if (data.error){
            window.location.replace('#start');
            return notify(data.error);
        }
        if (!data.sid || !data.name || !data.acclogin){
            window.location.replace('#start');
            return notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        }
        user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
        window.location.replace('#start');
    }).fail(function(xhr, textStatus, errorThrown){
        window.location.replace('#start');
        return notify('Sorry, a network error occured. Please, try again');
    });
}
window.url__access = url__access;

function url__ratify(arg){
    $.ajax({
        type: 'POST',
        url: wmgui.ratify_endpoint,
        data: {a: arg, ed: wmgui.edition}
    }).done(function(data){
        if (data.error){
            window.location.replace('#start');
            return notify(data.error);
        }
        if (!data.sid || !data.name || !data.acclogin){
            window.location.replace('#start');
            return notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        }
        user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
        window.location.replace('#modal/menu');
    }).fail(function(xhr, textStatus, errorThrown){
        window.location.replace('#start');
        return notify('Sorry, a network error occured. Please, try again');
    });
}
window.url__ratify = url__ratify;

function url__interlinkage(arg){
    wmgui.search_type = 1;
    request_search({interlinkage: arg}, 'linked phases for ' + arg, true);
    wmgui.search = {numeric: true};
    show_interpretation();
}
window.url__interlinkage = url__interlinkage;

function url__polyhedra(arg){
    $('body').removeClass('noscroll');
    $('#overlay').show();
    window.scrollTo(0, 0);
    render_all_polyhedra();
    $('#all_polyhedra_box').show();
}
window.url__polyhedra = url__polyhedra;

function url__junction(arg){
    if (!wmgui.sid)
        return window.location.replace('#products');

    var locals = JSON.parse(window.localStorage.getItem(wmgui.store_user_key) || '{}');

    wmgui.active_ajax = $.ajax({
        type: 'POST',
        url: locals.ipbased ? wmgui.ip_perms_endpoint : wmgui.perms_endpoint,
        data: {sid: wmgui.sid},
        beforeSend: wmgui.show_preloader
    }).always(wmgui.hide_preloader).done(function(data){
        if (data.error) return notify(data.error);
        if (!data.hasOwnProperty('gui') || !data.hasOwnProperty('api'))
            return force_relogin('Please, re-login');

        window.location.replace('#modal/menu');
        $('#tab_links > li').removeClass('working');
        $('#tab_links > li[rev=usr_tab_perms]').addClass('working');
        $('div.menu_tabs').hide();
        $('#usr_tab_perms').show();
        $('#perms_view').html(describe_perms(data));
        setTimeout(function(){ notify('Please, check your data access.'); }, 1500);
    }).fail(function(xhr, textStatus, errorThrown){
        if (textStatus != 'abort')
            return force_relogin('Please, re-login');
    });
}
window.url__junction = url__junction;

function url__products(arg){
    if (!wmgui.mpds_native) window.location.href = wmgui.static_host + '/#products';
    if (wmgui.edition === 1){
        window.location.href = 'https://www.asminternational.org/asm-materials-platform-for-data-science-api';
    } else {
        $('#overlay').show();
        window.scrollTo(0, 0);
        $('#productbox').show();
    }
}
window.url__products = url__products;

function url__formal(arg){
    if (!wmgui.mpds_native) window.location.href = wmgui.static_host + '/#formal/' + arg;

    var header = '',
        addr = '';

    if (arg == 'terms') header = 'Website Terms &amp; Conditions', addr = '/terms.json';
    else if (arg == 'api') header = 'MPDS API Terms &amp; Conditions', addr = '/api.json';
    else if (arg == 'usfed') header = 'Procurement Details', addr = '/usfed.json';
    else if (arg == 'refunds') header = 'Refund Policy', addr = '/refunds.json';
    else if (arg == 'privacy') header = 'Privacy Policy', addr = '/privacy.json';
    else return notify('Sorry, unknown document requested');

    wmgui.show_preloader();
    $('#formalbox_navi > ul > li').removeClass('working');
    $('a[href="#formal/' + arg + '"]').parent().addClass('working');

    $.getJSON(addr, function(answer){
        var html = '<h2>' + header + '</h2>';
        $.each(answer, function(n, value){
            html += '<strong>&sect;' + (n + 1) + '. ' + value.header + '</strong><p>' + value.content + '</p>';
        });
        $('#formalbox_content').html(html);
        $('#formalbox, #overlay').show();
        window.scrollTo(0, 0);
        wmgui.hide_preloader();
    });
}
window.url__formal = url__formal;

export { url_redraw_react };