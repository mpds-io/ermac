import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';

function init_user_login(){
    var locals = JSON.parse(window.localStorage.getItem(wmgui.store_user_key) || '{}');
    if (locals.sid === wmgui.sid) return;

    if (!locals.ipbased && locals.sid && locals.name && locals.acclogin){
        user_login(locals.sid, locals.name, locals.acclogin, locals.admin, locals.oauths, false);
    } else {
        $.ajax({
            type: 'POST',
            url: wmgui.ip_endpoint
        }).done(function(data){
            if (data.sid && data.name && data.acclogin)
                user_login(data.sid, data.name, data.acclogin, data.admin, data.oauths, true);
        });
    }
}
window.init_user_login = init_user_login;
wmgui.init_user_login = init_user_login;

function user_login(sid, name, acclogin, admin, oauths, ipbased){
    var corner_name = (name.length > 40) ? name.substr(0, 37) + '&hellip;' : name;
    $('#auth_user').html(corner_name);
    $('#account_holder_name').html('Hello ' + name + ' &#x1f44d;');
    $('#account_holder_acclogin > span').html(ipbased ? 'location-based' : '<a href="mailto:' + acclogin + '">' + acclogin + '</a>');

    wmgui.sid = sid;
    wmgui.oauths = oauths;

    $('div.logged_out').hide();
    $('div.logged_in').show();
    $('#account_pass_change').hide();

    window.localStorage.setItem(wmgui.store_user_key, JSON.stringify({
        sid: sid, name: name, acclogin: acclogin, admin: admin, ipbased: ipbased
    }));

    (admin && (wmgui.edition == 0 || wmgui.edition == 1)) ? $('li.admin').show() : $('li.admin').hide();

    if (ipbased){
        $('.only_regular').hide();
        $('#logout_trigger').addClass('disabled');
        $('#accpass_trigger').text('disabled').addClass('disabled');
    } else {
        $('.only_regular').show();
        $('#logout_trigger').removeClass('disabled');
        $('#accpass_trigger').text('change').removeClass('disabled');
    }

    try { document.getElementById('visavis_iframe').contentWindow.location.reload(); } catch (e){ console.error('No iframe access'); }
    communicate_windows('tab_user_login');

    notify('Logged in as ' + name);

    var redir = window.localStorage.getItem(wmgui.store_redir_key);
    if (redir){
        window.localStorage.removeItem(wmgui.store_redir_key);
        return window.location.replace(redir);
    }
}
window.user_login = user_login;
wmgui.user_login = user_login;

function tab_user_login(){
    var locals = JSON.parse(window.localStorage.getItem(wmgui.store_user_key) || '{}');
    if (locals.sid === wmgui.sid) return;
    window.location.reload();
}
window.tab_user_login = tab_user_login;

function user_logout(silent){
    if (!wmgui.sid) return;
    wmgui.sid = null;
    wmgui.oauths = null;
    $('li.admin').hide();
    $('div.logged_in').hide();
    $('div.logged_out').show();
    window.localStorage.removeItem(wmgui.store_user_key);
    try { document.getElementById('visavis_iframe').contentWindow.location.reload(); } catch (e){ console.error('No iframe access'); }
    communicate_windows('user_logout');
    if (!silent) notify('You are logged out');
}
window.user_logout = user_logout;
wmgui.user_logout = user_logout;

function force_relogin(show_msg){
    $.ajax({
        type: 'POST',
        url: wmgui.logout_endpoint,
        data: {sid: wmgui.sid}
    }).done(function(data){}).fail(function(xhr, textStatus, errorThrown){});
    user_logout(true);
    window.location.replace('#modal/login');
    if (show_msg) notify(show_msg);
}
window.force_relogin = force_relogin;
wmgui.force_relogin = force_relogin;

function communicate_windows(runnable_name){
    window.localStorage.setItem(wmgui.store_comm_exec_key, runnable_name);
    setTimeout(function(){ window.localStorage.removeItem(wmgui.store_comm_exec_key) }, 0);
}
window.communicate_windows = communicate_windows;

function show_modal(which){
    if (which == 'login'){
        if ($("#factor_by_email").val()) $("#login_email").val($("#factor_by_email").val());
        else $("#login_email").val('');
        $("#login_password").val('');
        $('#loginbox').show();
        $("#login_email").focus();
        var u_email = window.localStorage.getItem(wmgui.store_oauth_email_key) || false;
        if (u_email){ $("#login_email").val(u_email); window.localStorage.removeItem(wmgui.store_oauth_email_key); }
    } else if (which == 'factor'){
        if ($("#login_email").val()) $("#factor_by_email").val($("#login_email").val());
        else $("#factor_by_email").val('');
        $('#factorbox').show();
        $("#factor_by_email").focus();
    } else if (which == 'restore'){
        if ($("#login_email").val()) $("#restore_by_email").val($("#login_email").val());
        else $("#restore_by_email").val('');
        $('#restorebox').show();
        $("#restore_by_email").focus();
    }
}
window.show_modal = show_modal;

function describe_perms(perms){
    var out_gui = '<h3>Web-browser access = GUI</h3><ul>', out_api = '<h3>Programmatic access = API</h3><ul>';
    if (perms.gui){
        if (perms.gui.root) out_gui += '<li>complete access</li>';
        else {
            if (!$.isArray(perms.gui)) perms.gui = [perms.gui];
            $.each(perms.gui, function(m, ruleset){
                if (m > 3){ out_gui += '<li>and ' + (perms.gui.length - 4) + ' more...</li>'; return false; }
                $.each(wmgui.facets, function(n, item){
                    if (ruleset[item]){ try { out_gui += '<li class="perms_view fct_' + item + '"><strong>' + wmgui.facet_names[item] + '</strong>: ' + ruleset[item].map(function(x){return x.replace(', ', ' &amp; ')}).join(', ') + '</li>'; } catch(e){ return false } }
                });
                if (ruleset.refs == 'ALL') out_gui += '<li>full access to reference details</li>';
                else if (ruleset.refs == 'MENTIONED') out_gui += '<li>access to corresponding references</li>';
                else out_gui += '<li>no access to reference details</li>';
                out_gui += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
            });
        }
    } else out_gui += '<li>only open data</li>';
    if (perms.api){
        if (perms.api.root) out_api += '<li>complete access</li>';
        else if (perms.api.disabled) out_api += '<li>disabled &mdash; please check on the other device</li>';
        else {
            if (!$.isArray(perms.api)) perms.api = [perms.api];
            $.each(perms.api, function(m, ruleset){
                if (m > 3){ out_api += '<li>and ' + (perms.api.length - 4) + ' more...</li>'; return false; }
                $.each(wmgui.facets, function(n, item){
                    if (ruleset[item]){ try { out_api += '<li class="perms_view fct_' + item + '"><strong>' + wmgui.facet_names[item] + '</strong>: ' + ruleset[item].map(function(x){ return x.replace(', ', ' &amp; ') }).join(', ') + '</li>'; } catch(e){ return false } }
                });
                out_api += '<li style="font-size:0.8em;line-height:0.8em;"><br /></li>';
            });
        }
    } else out_api += '<li>only open data</li>';
    return out_gui + '</ul><div class="divider"></div>' + out_api + '</ul>';
}
window.describe_perms = describe_perms;

export { init_user_login, user_login, tab_user_login, user_logout, force_relogin, communicate_windows, show_modal, describe_perms };