
"use strict";

wmgui.ptable = {};
wmgui.ptable.draw = function(){};
wmgui.ptable.update_selectize = false;
wmgui.ptable.active_ajax = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
wmgui.ptable.query = null;
wmgui.ptable.els_data = [];
wmgui.ptable.pdsvg_path = wmgui.static_host + '/pds_svgs';
wmgui.ptable.first_el = null;
wmgui.ptable.second_el = null;
wmgui.ptable.visible = false; // needed to debounce
wmgui.ptable.activated = false; // should it "jump" on top by input

wmgui.ptable.elements = ['X'].concat(wmutils.periodic_elements_cased);

wmgui.ptable.arity = {1: 'unary', 2: 'binary', 3: 'ternary'};

wmgui.ptable.pd3d_renderer = wmgui.static_host + '/labs/prisms/?';

wmgui.ptable.show = function(){
    if (wmgui.ptable.visible)
        return;
    document.getElementById('ptable_holder').style.display = 'block';
    wmgui.ptable.visible = true;
};

wmgui.ptable.hide = function(){
    if (!wmgui.ptable.visible)
        return;
    document.getElementById('ptable_holder').style.display = 'none';
    wmgui.ptable.visible = false;
};

wmgui.ptable.activate = function(){
    wmgui.ptable.activated = true;
    document.getElementById('ermac_logo').classList.add('resulted');
    document.getElementById('ptable_holder').classList.add('resulted');
    wmgui.mpdsgui.ptable_activate();
};

wmgui.ptable.deactivate = function(){
    wmgui.ptable.activated = false;
    document.getElementById('ermac_logo').classList.remove('resulted');
    document.getElementById('ptable_holder').classList.remove('resulted');
    wmgui.mpdsgui.ptable_deactivate();
};

wmgui.ptable.decide = function(){
    var scroll_pos = window.scrollY;
    //console.log(scroll_pos);

    if (scroll_pos > 60) // forward to intro_stats screen
        wmgui.ptable.hide();

    else // back to ptable screen
        wmgui.ptable.show();
}

function removeAllCls(cls){
    const collection = document.getElementsByClassName(cls);
    while (collection.length)
        collection[0].classList.remove(cls);
}

function clear_results_area(){
    try { wmgui.ptable.active_ajax.abort() } catch(e){}
    document.getElementById('ptable_previews').innerHTML = '';
    document.getElementById('ptable_vis').innerHTML = '';
    wmgui.ptable.deactivate();
}

function refresh_table(elA, elB, elC){

    if (wmgui.view_mode !== 1) return;

    //console.log('Refreshing table with ' + [elA, elB, elC]);

    const els = [elA, elB, elC].filter(function(item){ return !!item }),
        query_ph = els.length ? {search_type: 1, classes: wmgui.ptable.arity[els.length], elements: els.join('-')} : false;

    if (wmgui.ptable.update_selectize){
        wmgui.ptable.update_selectize = false;

        wmgui.multiselects['main'].clear();
        wmgui.multiselects['main'].write({'elements': els.join('-')});
    }

    if (query_ph){
        wmgui.ptable.query = query_ph;

        if (els.length == 1){
            document.getElementById('ptable_vis').innerHTML = '';

        } else if (els.length == 2) {
            const query_pds = {search_type: 0, classes: wmgui.ptable.arity[els.length], elements: els.join('-'), props: 'phase diagram'};
            ajax_download(null, wmgui.search_endpoint + '?q=' + JSON.stringify(query_pds), render_right);

        } else {
            document.getElementById('ptable_vis').innerHTML = '<iframe frameborder=0 scrolling="no" width="100%" height="' + (window.innerHeight - 300) + '" src="' + wmgui.ptable.pd3d_renderer + els.join('-') + '"></iframe>';
        }
        ajax_download(wmgui.ptable.active_ajax, wmgui.search_endpoint + '?q=' + JSON.stringify(query_ph) + '&strict=1', render_left);

        wmgui.ptable.activate();

    } else clear_results_area();
}

function ajax_download(api, url, callback){
    wmgui.show_preloader();
    const xmlhttp = api ? api : (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));
    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4){
            wmgui.hide_preloader();
            if (xmlhttp.status == 200) callback(xmlhttp.responseText);
            else {
                console.error("Error: HTTP " + xmlhttp.status + " status received during data retrieval from the server");
            }
        }
    }
    xmlhttp.open("GET", url);
    xmlhttp.send(1);
}

function render_left(data){
    data = JSON.parse(data);
    if (data.error)
        return wmgui.notify(data.error);

    const header = '<h4>Known phases of ' + wmgui.ptable.query.elements + (wmgui.ptable.query.elements.indexOf('-') == -1 ? '' : ' system') + '</h4>';

    document.getElementById('ptable_previews').innerHTML = header + (data.out.length ? build_thumbs_ph(data.out) : '<img src="' + wmgui.static_host + '/question.svg" width=200 />');
}

function render_right(data){
    data = JSON.parse(data);
    if (data.error)
        return wmgui.notify(data.error);

    if (data.fuzzy_notice || !data.out.length)
        document.getElementById('ptable_vis').innerHTML = '';
    else
        document.getElementById('ptable_vis').innerHTML = '<h4>Known phase diagrams of ' + wmgui.ptable.query.elements + ' system</h4>' + build_thumbs_pd(data.out);
}

function read_ptable_html(){
    let unaries_data = [];
    document.querySelectorAll('#ptable_area > ul > li').forEach(function(item){

        if (!item.hasAttribute('data-pos'))
            return;

        let elem_data = {html: item.innerHTML, pos: item.getAttribute('data-pos'), classes: []};

        item.classList.forEach(function(cls){
            elem_data.classes.push(cls);
        });

        unaries_data.push(elem_data);
    });
    return unaries_data;
}

function render_unaries(){

    if (!wmgui.ptable.first_el)
        return;

    wmgui.ptable.els_data.forEach(function(elem_data){
        const that = document.querySelector('#ptable_area > ul > li[data-pos="' + elem_data.pos + '"]');
        that.style.backgroundImage = 'none';
        //that.innerHTML = elem_data.html;
        that.className = '';
        that.classList.add(...elem_data.classes);
    });

    wmgui.ptable.first_el = null;
}

function render_binaries(elA, elB){

    //console.log('RENDERING BINARIES FOR: ' + [elA, elB]);

    document.querySelectorAll('#ptable_area > ul > li').forEach(function(item){
        if (!item.hasAttribute('data-pos'))
            return;

        const current_el = wmgui.ptable.elements[item.getAttribute('data-pos')];
        if (current_el != elB && current_el != elA){
            item.style.backgroundImage = "url('" + wmgui.ptable.pdsvg_path + "/pds_bin/" + elA + "-" + current_el + ".svg')";
            item.className = 'active_a';
        }
    });
}

function render_ternaries(elA, elB){
    document.querySelectorAll('#ptable_area > ul > li').forEach(function(item){
        if (!item.hasAttribute('data-pos'))
            return;

        const current_el = wmgui.ptable.elements[item.getAttribute('data-pos')];
        if (current_el != elB && current_el != elA){
            let triple = [elA, elB, current_el];
            triple.sort();
            item.style.backgroundImage = "url('" + wmgui.ptable.pdsvg_path + "/pds_ter/" + triple.join("-") + ".svg')";
            item.classList.add('active_b');
        }
    });
}

function build_thumbs_ph(json){ // FIXME duplicates another function *build_thumbs*
    let result_html = '';

    json.sort(function(a, b){
        return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
    });

    json.forEach(function(row){
        result_html += '<div class="gallery_item">';
        result_html += '  <div class="gallery_img" rel="#phase_id/' + row[0] + '" style="background-image:url(https://mpds.io/phid_thumbs/' + row[0] + '.png);"><span><p>' + row[1] + '<br />space group ' + row[2] + '</p></span></div>';
        result_html += '  <div class="gallery_label"><a class=launch_ph href="#phase_id/' + row[0] + '">Show ' + row[3] + (row[3] == 1 ? ' entry' : ' entries') + '</a><br />Publications: ' + row[4] + '</div>';
        result_html += '</div>';
    });
    return result_html;
}

function build_thumbs_pd(json){ // FIXME duplicates another function *build_thumbs*
    let result_html = '';

    json.sort(function(a, b){
        return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
    });

    json.forEach(function(row){
        if (row[3] == 0) // filter unprocs
            return;
        row[2] = row[2].split(';')[0];
        row[2] = row[2].split(' ')[row[2].split(' ').length - 1];
        const content = '<img alt="' + row[0] + '" src="https://mpds.io/pd_thumbs/' + row[0].split('-')[0] + '.png" /><p>' + row[2] + '</p>';

        result_html += '<div class="gallery_item' + (row[4] ? ' opened' : '') + '">';
        result_html += '  <div class="gallery_img" rel="#entry/' + row[0] + '">' + content + '</div>';
        result_html += '  <div class="gallery_label"><a class=launch_ph href="#entry/' + row[0] + '">' + row[0] + '</a>' + '<br />[' + row[5] + '&rsquo;' + row[6].toString().substr(2, 2) + ']' + '</div>';
        result_html += '</div>';
    });
    return result_html;
}

function select_ptable_el(selected_el, dom_el){
    //console.log('Selected element is ' + selected_el);

    if (!dom_el){
        var dom_el = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(selected_el) + '"]');
        if (!dom_el) return wmgui.notify('Wrong element: ' + selected_el);
    }

    if (dom_el.classList.contains('selected_a')){
        // first element removal
        dom_el.classList.remove('selected_a');
        render_unaries();
        refresh_table();

    } else if (dom_el.classList.contains('selected_b')){
        // second element removal
        dom_el.classList.remove('selected_b');
        render_binaries(wmgui.ptable.first_el, selected_el);
        wmgui.ptable.second_el = null;
        refresh_table(wmgui.ptable.first_el);

    } else if (dom_el.classList.contains('selected_c')){
        // third element removal
        dom_el.classList.remove('selected_c');
        refresh_table(wmgui.ptable.first_el, wmgui.ptable.second_el);

    } else if (dom_el.classList.contains('active_b')){
        // third element selection
        removeAllCls('selected_c');
        dom_el.classList.add('selected_c');
        refresh_table(wmgui.ptable.first_el, wmgui.ptable.second_el, selected_el);

    } else if (dom_el.classList.contains('active_a')){
        // second element selection
        removeAllCls('selected_b');
        dom_el.classList.add('selected_b');
        render_ternaries(wmgui.ptable.first_el, selected_el);
        wmgui.ptable.second_el = selected_el;
        refresh_table(wmgui.ptable.first_el, selected_el);

    } else {
        // first element selection
        dom_el.classList.add('selected_a');
        wmgui.ptable.first_el = selected_el;
        render_binaries(wmgui.ptable.first_el, selected_el);
        refresh_table(selected_el);
    }
}

function select_ptable_series(els){
    //console.log('Received for TABLE DRAW: ' + els);
    if (!els){
        render_unaries();
        clear_results_area();
        return;
    }

    els = els.split('-');
    if (els.length > 3)
        els = els.slice(0, 3);

    wmgui.ptable.first_el = els[0];
    wmgui.ptable.second_el = els[1] || null;

    const domelA = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[0]) + '"]');
    if (domelA){
        removeAllCls('selected_a');
        domelA.classList.add('selected_a');
    }

    if (els.length == 1){
        render_binaries(els[0], els[0]);

    } else if (els.length == 2){
        const domelB = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[1]) + '"]');
        if (domelB){
            removeAllCls('selected_b');
            domelB.classList.add('selected_b');
        }
        render_ternaries(els[0], els[1]);

    } else {
        const domelB = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[1]) + '"]'),
            domelC = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[2]) + '"]');
        if (domelB){
            removeAllCls('selected_b');
            domelB.classList.add('selected_b');
        }
        if (domelC){
            removeAllCls('selected_c');
            domelC.classList.add('selected_c');
        }
        render_ternaries(els[0], els[1]);
    }
    refresh_table(...els);
}
