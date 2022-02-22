/**
 * MPDS platform desktop GUI URLs
 * Author: Evgeny Blokhin /
 * Tilde Materials Informatics
 * eb@tilde.pro
 * Version: 0.6.9
 */
"use strict";

var wmgui = window.wmgui || {};

function url_redraw_react(){
    var anchors = window.location.hash.substr(1).split('/');

    if (!anchors.length) return;
    $('#overlay, #aetmap, div.modal, div.menu_collateral').hide();
    try { wmgui.active_ajax.abort() } catch(e){}
    try { wmgui.quick_ajax.abort() } catch(e){}

    if (window['url__' + anchors[0]]) window['url__' + anchors[0]](anchors.slice(1).join('/'));
    else wmgui.notify('Unknown route: ' + window.location.hash);
}

/**
The main landing route /#start
*/
function url__start(arg){
    switch_view_mode(1);
    if (wmgui.tooltip_status < 2) setTimeout(function(){ show_tooltip(wmgui.tooltips[wmgui.tooltip_landing]) }, 5000);
}

/**
The free-form NLP-based search /#search/arg
(given by external lib)
*/
function url__search(arg, no_retrieve){
    var query = unescape(arg),
        parsed = WMCORE.parse_string(query);
    //console.log(parsed);

    if (parsed.numeric) wmgui.search_type = 1;

    show_interpretation(parsed);
    delete parsed.ignored;

    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    wmgui.multiselects['main'].write(parsed);

    wmgui.search = parsed;
    parsed.search_type = wmgui.search_type;

    if (!no_retrieve) request_search(parsed, query, wmgui.search_type);
}

/**
The parameters-based search /#inquiry/arg
*/
function url__inquiry(arg, no_retrieve){
    var inquiry = arg.split("&").map( function(n){ return n = n.split("="), this[n[0]] = n[1], this }.bind({}) )[0];

    wmgui.facets.forEach(function(item){
        if (inquiry[item]) inquiry[item] = unescape(inquiry[item].replaceAll('\\+', ' ')); // TODO XSS-protection
    });

    // re-inventing serialization for numeric nested arrays
    if (inquiry.numeric){
        inquiry.numeric = unescape(inquiry.numeric).split(';').map(function(item){ return item.split(',') });
        inquiry.numeric = inquiry.numeric.filter(function(item){ return item.length == 3 });
        wmgui.search_type = 1; // force phases search type
    }
    //console.log(inquiry);

    show_interpretation(inquiry);
    delete inquiry.ignored;

    var pseudo_input = [];
    $.each(inquiry, function(k, v){ pseudo_input.push(v) });

    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    wmgui.multiselects['main'].write(inquiry);

    wmgui.search = inquiry;
    inquiry.search_type = wmgui.search_type;

    if (!no_retrieve) request_search(inquiry, pseudo_input.join(" ").replaceAll(",", " "), wmgui.search_type);
}

/**
The plotting subsystem (Vis-a-vis) /#plot/arg
*/
function url__plot(arg){
    var q = arg.split('/'),
        plot_type = q[0],
        search_verb = q[1],
        query = q[2];

    if (!plot_type || !search_verb || !query)
        return wmgui.notify('Unknown route: ' + arg);

    if (search_verb == 'search')
        url__search(query, true);

    else if (search_verb == 'inquiry')
        url__inquiry(query, true);

    else
        return wmgui.notify('Unknown route: ' + arg);

    wmgui.visavis_curtype = plot_type;

    //if (wmgui.view_mode == 1)
    switch_view_mode(2);

    if (wmgui.visavis_ready)
        start_visavis(plot_type);

    else
        wmgui.visavis_starting = true;

    if (wmgui.tooltip_status < 2 && (plot_type == 'matrix' || plot_type == 'cube')){
        setTimeout(function(){ show_tooltip(wmgui.tooltips['ss_axes'], true) }, 4000);
    }
}

/**
The individual entry display /#entry/ID
*/
function url__entry(arg){
    wmgui.search_type = 0;
    wmgui.visavis_terminating = true;
    request_search({'entry': arg}, 'entry ' + arg, true);
    wmgui.search = {}; // mockup to reset previous properties
    wmgui.passive_sim_col = true;
    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    show_interpretation();
}

/**
The individual phase display /#phase_id/integer
*/
function url__phase_id(arg){
    wmgui.search_type = 0;
    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    show_interpretation();
    var phid = parseInt(arg);
    wmgui.search = {'phid': phid};
    wmgui.search.search_type = wmgui.search_type;
    request_search({'phid': phid}, 'phase_id #' + phid, true);
}

/**
The individual phase display /#phase/ID
*/
function url__phase(arg){
    var phase_data = arg.split('/'),
        formula = phase_data[0],
        spg = phase_data[1],
        pearson = phase_data[2];

    if (formula && spg && pearson){
        wmgui.active_ajax = $.ajax({type: 'GET', url: wmgui.phph_endpoint, data: {phase: [formula, spg, pearson].join('/')}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
            if (data.error) return wmgui.notify(data.error);
            window.location.replace('#phase_id/' + data.phid);

        }).fail(function(xhr, textStatus, errorThrown){
            if (textStatus != 'abort') wmgui.notify('A network error occured. Please, try again');
        });

    } else return wmgui.notify('Wrong phase given!');
}

/**
The display of menu with all the physical props
*/
function url__hierarchy(){
    $('body').removeClass('noscroll');
    $('#overlay').show();
    window.scrollTo(0, 0);
    $('#hy_box').show();
}

/**
The different types of modal windows
*/
function url__modal(arg){
    if (arg == "login"){
        if (wmgui.sid) return window.location.replace('#modal/menu');

        // edition-based OAuth login
        if (wmgui.edition == 1){
            return window.location.href = '/oauth/asm.html';
        } else if (wmgui.edition == 15 || wmgui.edition == 16){
            return window.location.href = '/oauth/matcloud.html';
        }

        if ($("#restore_by_email").val()) $("#login_email").val($("#restore_by_email").val());
        else $("#login_email").val('');
        $("#login_password").val('');
        $('#loginbox').show();
        $("#login_email").focus();

        // for OAuth linking redirect only
        var u_email = window.localStorage.getItem('wm_u_email') || false;
        if (u_email){
            $("#login_email").val(u_email);
            window.localStorage.removeItem('wm_u_email');
        }

    } else if (arg == "restore"){
        if (wmgui.sid) return window.location.replace('#modal/menu');
        if ($("#login_email").val()) $("#restore_by_email").val($("#login_email").val());
        else $("#restore_by_email").val('');
        $('#restorebox').show();
        $("#restore_by_email").focus();

    } else if (arg == "menu"){
        if (!wmgui.sid) return window.location.replace('#modal/login');
        $("#new_password_1, #new_password_2").val('');
        arrange_menu_collateral();
        $('#menubox, div.menu_collateral').show();

    } else return wmgui.notify("Unknown modal dialogue!");
    $('#overlay').show();
}

/**
Retrieving the access via email by the secret link
*/
function url__access(arg){
    $.ajax({type: 'POST', url: wmgui.access_endpoint, data: {a: arg, ed: wmgui.edition}}).done(function(data){
        if (data.error){
            window.location.replace('#start');
            return wmgui.notify(data.error);
        }
        if (!data.sid || !data.name || !data.acclogin){
            window.location.replace('#start');
            return wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        }
        user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
        window.location.replace('#start');

    }).fail(function(xhr, textStatus, errorThrown){
        window.location.replace('#start');
        return wmgui.notify('A network error occured. Please, try again');
    });
}

/**
Confirming the access via email by the secret link
*/
function url__ratify(arg){
    $.ajax({type: 'POST', url: wmgui.ratify_endpoint, data: {a: arg, ed: wmgui.edition}}).done(function(data){
        if (data.error){
            window.location.replace('#start');
            return wmgui.notify(data.error);
        }
        if (!data.sid || !data.name || !data.acclogin){
            window.location.replace('#start');
            return wmgui.notify('Connection to server is lost, please try to <a href=javascript:location.reload()>reload</a>');
        }
        user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths);
        window.location.replace('#modal/menu');

    }).fail(function(xhr, textStatus, errorThrown){
        window.location.replace('#start');
        return wmgui.notify('A network error occured. Please, try again');
    });
}

/**
A special display of the related entries
*/
function url__interlinkage(arg){
    wmgui.search_type = 1;
    request_search({'interlinkage': arg}, 'linked phases for ' + arg, true);
    wmgui.search = {'numeric': true}; // mockup FIXME?
    $('#search_field-selectized').val('');
    wmgui.multiselects['main'].clear();
    show_interpretation();
}

/**
All polyhedra menu
*/
function url__polyhedra(arg){
    $('body').removeClass('noscroll');
    $('#overlay').show();
    window.scrollTo(0, 0);
    render_all_polyhedra();
    $('#all_polyhedra_box').show();
}

/**
Access denied route: trying to identify the reason
*/
function url__junction(arg){
    if (!wmgui.sid)
        return window.location.replace('#products');

    wmgui.active_ajax = $.ajax({type: 'POST', url: wmgui.perms_endpoint, data: {sid: wmgui.sid}, beforeSend: wmgui.show_preloader}).always(wmgui.hide_preloader).done(function(data){
        if (data.error)
            return wmgui.notify(data.error);
        if (!data.hasOwnProperty('gui') || !data.hasOwnProperty('api'))
            return force_relogin('Please, re-login');

        window.location.replace('#modal/menu');
        $('#tab_links > li').removeClass('working');
        $('#tab_links > li[rev=usr_tab_perms]').addClass('working');
        $('div.menu_tabs').hide();
        $('#usr_tab_perms').show();
        $('#perms_view').html(describe_perms(data));
        wmgui.notify('Sorry, you have no access to these data');

    }).fail(function(xhr, textStatus, errorThrown){
        if (textStatus != 'abort')
            return force_relogin('Please, re-login');
    });
}