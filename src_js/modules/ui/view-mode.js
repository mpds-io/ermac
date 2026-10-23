import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';

function switch_view_mode(mode){
    wmgui.view_mode = mode;
    $('div.autocomplete-suggestions').hide();
    $('#results, #header_entries, #header_phases, #header_articles').hide();
    $('div.context_msg').hide();
    close_vibox();
    if (mode == 1){
        stop_visavis();
        document.title = 'Materials Platform for Data Science';
        $('body').addClass('noscroll');
        $('#search_box').removeClass('fluid');
        $('div.side_cols').hide();
        $('#legend').show();
        $('#search_holder').removeClass('prolonged').focus();
        $('#search_area').removeClass('prolonged');
        $('#ermac_logo').removeClass('cornered');
        wmgui.ptable.decide();
        if (wmgui.ptable.activated) document.getElementById('ptable_dtypes_box').classList.add('resulted');
    } else if (mode == 2){
        $('#legend').hide();
        $('#ctx_col').hide();
        if (wmgui.passive_sim_col) $('#sim_col').hide();
        $('body').removeClass('noscroll');
        $('#search_box').addClass('fluid');
        $('#right_col').show();
        $('#dtypes').show();
        $('#search_holder, #search_area').addClass('prolonged');
        $('#ermac_logo').addClass('cornered');
        wmgui.ptable.hide();
        document.getElementById('ptable_dtypes_box').classList.remove('resulted');
    }
    wmgui.mpdsgui.view(mode);
}
window.switch_view_mode = switch_view_mode;

function switch_control_mode(mode, next_mode, active_abf, active_cde){
    if (mode == 0){ $('#control_c, #control_d, #control_e').css('width', '33.3%').show();
    } else if (mode == 1){ $('#control_e').hide(); $('#control_c, #control_d').css('width', '50%').show();
    } else if (mode == 9){ $('#control_e, #control_d').hide(); $('#control_c').css('width', '100%').show();
    } else if (mode == 10){ $('#control_a, #control_b, #control_f').css('width', '33.3%').show();
    } else if (mode == 11){ $('#control_b, #control_f').hide(); $('#control_a').css('width', '100%').show();
    } else if (mode == 12){ $('#control_a, #control_f').hide(); $('#control_b').css('width', '100%').show(); }
    if (!next_mode) return;
    if (!active_abf) active_abf = ({0: 'a', 1: 'b', 2: 'f'})[wmgui.search_type];
    if (!active_cde) active_cde = wmgui.thumbed_display ? 'd' : 'c';
    $('div.controlswitch > div').removeClass();
    $('#control_' + active_abf + ', #control_' + active_cde).addClass('active');
    switch_control_mode(next_mode);
}
window.switch_control_mode = switch_control_mode;

function arrange_menu_collateral(){
    $('#hintsbox_msg, #tagcloudbox').empty();
    var links_html = '';
    for (var i = 0; i < wmgui.collateral_links.length; i++){
        var rel = wmgui.collateral_links[i][1], cls = wmgui.collateral_links[i][1] ? 'collateral' : false, target = '', lbr = '';
        if (i % 2){ cls = cls ? cls + ' violet' : 'violet'; lbr = '<br />'; }
        if (wmgui.collateral_links[i][3]) target = ' target="_blank"';
        links_html += '<a' + target + ' href="' + wmgui.collateral_links[i][0] + '"' + (cls ? ' class="' + cls + '"' : '') + (rel ? ' rel=' + rel : '') + '>' + wmgui.collateral_links[i][2] + '</a>' + lbr;
    };
    $('#tagcloudbox').append(links_html);
    $('#hintsbox_msg').append(wmgui.get_random_term(wmgui.welcome_msgs));
}
window.arrange_menu_collateral = arrange_menu_collateral;

function rotate_interesting(){
    $('#legend').html('<i>e.g.</i> <a href="#">' + wmgui.get_interesting()['text'].replace(/\d/g, "&#x208$&;") + '</a>');
}
window.rotate_interesting = rotate_interesting;

function show_examples(box, more_examples, fix_rfn_header){
    if (wmgui.cliff_counter === null) wmgui.cliff_counter = Math.floor(Math.random() * wmgui.cliffhangers.length);
    var html = '';
    for (var i = 0; i < (more_examples ? 7 : 3); i++){
        wmgui.cliff_counter += 1;
        if (wmgui.cliff_counter > wmgui.cliffhangers.length-1) wmgui.cliff_counter = 0;
        html += '<li><a href="#search/' + wmutils.termify_formulae(wmgui.cliffhangers[wmgui.cliff_counter]) + '">' + wmgui.cliffhangers[wmgui.cliff_counter].charAt(0).toUpperCase() + wmgui.cliffhangers[wmgui.cliff_counter].slice(1) + '</a></li>';
        var legend = wmgui.get_interesting()['text'];
        html += '<li><a href="#search/' + encodeURIComponent(legend) + '">' + legend.charAt(0).toUpperCase() + legend.slice(1).replace(/\d/g, "&#x208$&;") + '</a></li>';
    }
    $(box + ' > ul').empty().append(html);
    $(box).show();
    if (fix_rfn_header){ $('#refine_col > div.col_title, #refine_col > ul').hide(); $('#refine_col').show(); }
}
window.show_examples = show_examples;

var stop_visavis, close_vibox;
stop_visavis = function(){ $('#visavis, #visavis_col').hide(); wmgui.visavis_working = false; wmgui.visavis_terminating = false; };
window.stop_visavis = stop_visavis;
close_vibox = function(){
    var iframe = $('#iframe');
    if (iframe.length){
        if (wmgui.thumbed_display) $('#iframe').slideUp(function(){ $('#iframe').remove() });
        else $('#iframe').remove();
        $('#vibox').hide();
        return true;
    }
    return false;
};
window.close_vibox = close_vibox;

export { switch_view_mode, switch_control_mode, arrange_menu_collateral, rotate_interesting, show_examples, stop_visavis, close_vibox };