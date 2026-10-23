import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { close_vibox } from '../ui/view-mode.js';

function start_visavis(plot_type){
    destroy_numericbox();
    delete wmgui.search.numeric;
    if (plot_type) wmgui.visavis_curtype = plot_type;

    $('div.ctxpanel').hide();
    var toshow = $('#ctxpanel_' + wmgui.visavis_curtype);
    if (toshow.length) toshow.show();
    if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) !== -1) $('#cmppanel_plots').show();

    if (wmgui.visavis_working)
        return manage_visavis();

    rebuild_visavis();

    $('#visavis_col').show();
    $('#visavis').show();

    switch_control_mode(0, 11, 'a', 'e');
    $('body').addClass('noscroll');

    wmgui.search_type = 0;
    wmgui.visavis_working = true;

    var cur_obj = {total_count: 1};
    $.extend(cur_obj, wmgui.search);

    try {
        document.getElementById('visavis_iframe').contentWindow.location.replace(get_visavis_url(cur_obj));
    } catch (e){
        console.error('No iframe access');
    }
}
window.start_visavis = start_visavis;
wmgui.start_visavis = start_visavis;

function manage_visavis(callback_fn, param_a, param_b){
    if (wmgui.visavis_terminating || !wmgui.visavis_working){
        return false;
    }

    if (wmgui.search.numeric){
        wmgui.visavis_terminating = true;
        return false;
    }

    try { wmgui.active_ajax.abort() } catch(e){}
    try { wmgui.quick_ajax.abort() } catch(e){}

    rebuild_visavis();

    var cur_obj = {total_count: 1};
    $.extend(cur_obj, wmgui.search);

    try {
        document.getElementById('visavis_iframe').contentWindow.location.replace(get_visavis_url(cur_obj));
    } catch (e){
        console.error('No iframe access');
    }

    if (callback_fn) callback_fn(param_a, param_b);
    return true;
}
window.manage_visavis = manage_visavis;
wmgui.manage_visavis = manage_visavis;

function rebuild_visavis(){
    var extr = window.location.hash.indexOf('search/');
    if (extr == -1){
        var extr = window.location.hash.indexOf('inquiry/');
        if (extr == -1) return;
    }

    var query = window.location.hash.substr(extr);

    $('a.pltcol_links').each(function(){
        var that = $(this),
            plot_type = that.attr('rev');
        that.attr('href', wmgui.gui_host + window.location.pathname + '#plot/' + plot_type + '/' + query);
    });

    $('#visavis_col > ul > li').removeClass('embodied');
    $('#pltchoice_' + wmgui.visavis_curtype).addClass('embodied');

    if (['matrix', 'cube', 'discovery'].indexOf(wmgui.visavis_curtype) !== -1)
        update_dc();

    if (wmgui.visavis_curtype == 'matrix'){
        $('#ctxpanel_matrix > ul > li.embodied').removeClass('embodied');
        var y_id = $('#ctxpanel_matrix > ul > li.ss_y');
        if (y_id.length) y_id.removeClass('ss_y');
        $('#vismatrix_nump').addClass('embodied');
        $('span.sops').remove();

    } else if (wmgui.visavis_curtype == 'cube'){
        $('#ctxpanel_cube > ul > li.embodied').removeClass('embodied');
        var y_id = $('#ctxpanel_cube > ul > li.ss_y'),
            z_id = $('#ctxpanel_cube > ul > li.ss_z');
        if (y_id.length) y_id.removeClass('ss_y');
        if (z_id.length) z_id.removeClass('ss_z');
        $('#viscube_nump').addClass('embodied');
        $('span.sops').remove();

    } else if (wmgui.visavis_curtype == 'graph'){
        $('#ctxpanel_graph > ul > li.embodied').removeClass('embodied');
        $('#visgraph_props').addClass('embodied');
    }

    try {
        document.getElementById('visavis_iframe').contentWindow.fixel_manage(wmgui.visavis_curtype == 'cube' && wmgui.search.elements);
    } catch (e){
        console.error('No iframe access');
    }
}
window.rebuild_visavis = rebuild_visavis;
wmgui.rebuild_visavis = rebuild_visavis;

function get_visavis_url(request, type, height){
    if (wmgui.visavis_curtype == 'pie' && !type)
        return wmgui.engines_addrs['visavis'] + '#' + wmgui.rfn_endpoint + '?q=' + encodeURIComponent(JSON.stringify(request));

    var height_str = height ? ('&visavis_height=' + height) : '';

    return wmgui.engines_addrs['visavis'] + '#' + wmgui.vis_endpoint + '/' + (type || wmgui.visavis_curtype) + '?q=' + encodeURIComponent(JSON.stringify(request)) + height_str;
}
window.get_visavis_url = get_visavis_url;
wmgui.get_visavis_url = get_visavis_url;

function update_dc(){
    var title = [],
        orepr = {};
    for (var key in wmgui.search){
        if (['search_type', 'phid', 'numeric'].indexOf(key) !== -1) continue;
        orepr[key] = wmgui.search[key];
        title.push(wmgui.search[key])
    }
    title = title.join(" ");

    var count = 0,
        cur_str = JSON.stringify(orepr),
        cmp_html = '<option value="X" selected>To last searches...</option>';

    $.each(JSON.parse(window.localStorage.getItem(wmgui.store_history_key) || '[]'), function(n, past){
        if (count > 6) return false;

        var title = [],
            past_str = JSON.stringify(past);
        if (cur_str == past_str) return true;

        for (var prop in past){ title.push(past[prop]) }
        title = title.join(" ");
        cmp_html += '<option value="' + encodeURIComponent(past_str) + '">' + title + '</option>';
        count++;
    });
    cmp_html += '<option value="Y">No comparison</option>';
    $('#select_cmp_trigger').empty().append(cmp_html);
}
window.update_dc = update_dc;
wmgui.update_dc = update_dc;

export { start_visavis, manage_visavis, rebuild_visavis, get_visavis_url, update_dc };