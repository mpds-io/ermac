import wmgui from './wmgui-object.js';

function assign_edition(){

    function run_edition(edition_key){
        edition_key = parseInt(edition_key);
        if (!wmgui.editions[edition_key])
            edition_key = 0;
        wmgui.edition = edition_key;
        if (wmgui.editions[edition_key].css) wmgui.loadCSS(wmgui.editions[edition_key].css);
        if (wmgui.editions[edition_key].actions) wmgui.editions[edition_key].actions();
    }

    $.each(wmgui.editions, function(key, value){
        if (wmgui.gui_host == value['prod_url'] || wmgui.gui_host == value['dev_url']){
            run_edition(key);
            return false;
        }
    });

    if (!wmgui.edition) run_edition(0);

    wmgui.mpds_native = !!document.getElementById("mpds_native");
}

export { assign_edition };