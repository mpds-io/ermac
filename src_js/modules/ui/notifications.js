import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { wmutils } from '../ui/dom-utils.js';

function notify(msg){
    var delay = 0;
    if (wmgui.notify_counter){
        clearInterval(wmgui.notify_counter);
        wmgui.notify_counter = null;
        delay = 1500;
    }
    setTimeout(function(){
        $('#notifybox').html(wmgui.clean(msg)).show();
        wmgui.notify_counter = setTimeout(function(){ $('#notifybox').hide() }, 4000);
    }, delay);
}
wmgui.notify = notify;

function show_tooltip(info, forced){
    if (info.view_mode != wmgui.view_mode || (wmgui.visavis_working && !forced) || $('div.modal').is(':visible'))
        return;
    var ref = $('#' + info.el).position(),
        tooltip_el = document.getElementById('tooltip');
    tooltip_el.style.left = (ref.left + info.oleft) + 'px';
    tooltip_el.style.top = (ref.top + info.otop) + 'px';
    tooltip_el.firstChild.innerHTML = info.text;
    document.getElementById('tooltip').style.display = 'block';
}

export { notify, show_tooltip };