"use strict";

var wmgui = window.wmgui || {};

wmgui.ptable = {};
wmgui.ptable.update_selectize = false;
wmgui.ptable.active_ajax = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
wmgui.ptable.query = null;
wmgui.ptable.els_data = [];
wmgui.ptable.pdsvg_path = wmgui.static_host + '/pds_svgs';
wmgui.ptable.crsvg_path = wmgui.static_host + '/crs_svgs';
wmgui.ptable.ppsvg_path = wmgui.static_host + '/pps_svgs';
wmgui.ptable.first_el = null;
wmgui.ptable.second_el = null;
wmgui.ptable.visible = false; // needed to debounce
wmgui.ptable.activated = false; // should it "jump" on top by input
wmgui.ptable.dtypes = 1; // 0, 1, 2, or 3, see #ptable_dtypes
wmgui.ptable.subphases_button = '';
wmgui.ptable.vis_fixed = false;
wmgui.ptable.elements = ['X'].concat(wmutils.periodic_elements_cased);

// patch display keyword unary to elementary
wmgui.ptable.arity_keys = wmutils.arity_keys.slice();
wmgui.ptable.arity_keys[1] = 'elementary';

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
    if (window.scrollY <= 40) document.getElementById('ptable_dtypes_box').classList.add('resulted');
    wmgui.mpdsgui.ptable_activate();
};

wmgui.ptable.deactivate = function(){
    wmgui.ptable.activated = false;
    document.getElementById('ermac_logo').classList.remove('resulted');
    document.getElementById('ptable_holder').classList.remove('resulted');
    document.getElementById('ptable_dtypes_box').classList.remove('resulted');
    wmgui.mpdsgui.ptable_deactivate();
};

wmgui.ptable.decide = function(){
    const scroll_pos = window.scrollY;
    //console.log(scroll_pos);

    if (scroll_pos > 60) // forward to intro_stats screen
        wmgui.ptable.hide();

    else // back to ptable screen
        wmgui.ptable.show();
}

wmgui.ptable.subphases_set = function(state){
    if (!state){
        wmgui.ptable.subphases_button = '';

    } else if (state === 1){
        wmgui.ptable.subphases_button = '<div class="wmbutton subphases_trigger" data-state="2">Load binary and ternary phases <span>&uarr;</span></div>';

    } else {
        wmgui.ptable.subphases_button = '<div class="wmbutton subphases_trigger" data-state="1">Load ternary phases only <span>&uarr;</span></div>';
    }
}

function read_ptable_html(){
    let unaries_data = [{}]; // NB zero-th element (X)

    wmgui.ptable.elements.forEach(function(_, idx){
        if (idx == 0 || idx > 103) // X - Lr
            return;

        const item = document.querySelector('#ptable_area > ul > li[data-pos="' + idx + '"]');
        let elem_data = {pos: idx, classes: []}; // NB prop html:

        item.classList.forEach(function(cls){
            elem_data.classes.push(cls);
        });

        unaries_data.push(elem_data);
    });
    return unaries_data;
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

function refresh_ptable_results(elA, elB, elC){

    if (wmgui.view_mode !== 1) return;

    //console.log('Refreshing table with ' + [elA, elB, elC]);

    const els = [elA, elB, elC].filter(function(item){ return !!item }),
        query_ph = els.length ? {search_type: 1, classes: wmutils.arity_keys[els.length], elements: els.join('-')} : false;

    if (wmgui.ptable.update_selectize){
        wmgui.ptable.update_selectize = false;

        wmgui.multiselects['main'].clear();
        wmgui.multiselects['main'].write({'elements': els.join('-')});
    }

    wmgui.ptable.subphases_set();

    if (query_ph){
        wmgui.ptable.query = query_ph;
        wmgui.ptable.vis_fixed = false;

        let iframe_addr,
            iframe_height = 900;

        if (els.length == 1){

            if (wmgui.ptable.dtypes == 2){
                iframe_addr = wmgui.engines_addrs['cifplayer'];
                wmgui.ptable.vis_fixed = true;

            } else if (wmgui.ptable.dtypes == 3){
                iframe_addr = wmgui.engines_addrs['visavis'];
                wmgui.ptable.vis_fixed = true;

            } else
                document.getElementById('ptable_vis').innerHTML = '';

        } else if (els.length == 2) {
            iframe_height = 800;

            if (wmgui.ptable.dtypes == 1){
                const query_pds = {search_type: 0, classes: wmutils.arity_keys[els.length], elements: els.join('-'), props: 'phase diagram'};
                ajax_download(null, wmgui.search_endpoint + '?q=' + JSON.stringify(query_pds), render_right);

            } else if (wmgui.ptable.dtypes == 2){
                iframe_addr = wmgui.engines_addrs['cifplayer'];
                wmgui.ptable.vis_fixed = true;

            } else if (wmgui.ptable.dtypes == 3){
                iframe_addr = wmgui.engines_addrs['visavis'];
                wmgui.ptable.vis_fixed = true;

            } else
                document.getElementById('ptable_vis').innerHTML = '';

        } else {
            wmgui.ptable.subphases_set(1);
            iframe_height = window.innerHeight - 200;
            wmgui.ptable.vis_fixed = true;

            if (wmgui.ptable.dtypes == 1){
                iframe_addr = wmgui.v_pd_3d_addr + els.join('-');

            } else if (wmgui.ptable.dtypes == 2){
                iframe_addr = wmgui.engines_addrs['cifplayer'];

            } else if (wmgui.ptable.dtypes == 3){
                iframe_addr = wmgui.engines_addrs['visavis'];

            } else
                document.getElementById('ptable_vis').innerHTML = '';
        }
        ajax_download(wmgui.ptable.active_ajax, wmgui.search_endpoint + '?q=' + JSON.stringify(query_ph) + '&strict=1', render_left);

        if (iframe_addr)
            document.getElementById('ptable_vis').innerHTML = '<iframe frameborder=0 scrolling="no" width="100%" height="' + iframe_height + '" src="' + iframe_addr + '"></iframe>';

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
    xmlhttp.withCredentials = true;
    xmlhttp.send(1);
}

function render_left(data){
    data = JSON.parse(data);
    if (data.error)
        return wmgui.notify(data.error);

    const header = '<h4>Reported phases of ' + wmgui.ptable.arity_keys[wmutils.arity_keys.indexOf(wmgui.ptable.query.classes)] + ' ' + wmgui.ptable.query.elements + (wmgui.ptable.query.elements.indexOf('-') == -1 ? '' : ' system') + '</h4>';

    const parent = document.getElementById('ptable_previews');
    parent.className = "";
    parent.classList.add('ptable_dtype_' + wmgui.ptable.dtypes);
    parent.innerHTML = header + (data.out.length ? build_thumbs_ph(data.out) : '<p>No results</p>') + wmgui.ptable.subphases_button;

    if (data.out.length < 10) wmgui.ptable.vis_fixed = false; // prevent screen jumping

    if (wmgui.ptable.dtypes == 2){
        const els = document.querySelectorAll('#ptable_results div.gallery_img.renderable');
        if (els.length){
            const rnd_i = Math.floor(Math.random() * els.length);
            els[rnd_i].parentNode.classList.add('active');
            const phid = els[rnd_i].getAttribute('rel'),
                target = document.querySelector('#ptable_vis > iframe'),
                target_addr = '#' + wmgui.phase_endpoint + '?phid=' + phid + '&struct=1';

            if (target) target.contentWindow.location.hash = target_addr;
            else document.getElementById('ptable_vis').innerHTML = '<iframe frameborder=0 scrolling="no" width="100%" height="850" src="' + wmgui.engines_addrs['cifplayer'] + target_addr + '"></iframe>';

        } else document.getElementById('ptable_vis').innerHTML = '';

    } else if (wmgui.ptable.dtypes == 3){
        const els = document.querySelectorAll('#ptable_results div.gallery_img.renderable');
        if (els.length){
            const rnd_i = Math.floor(Math.random() * els.length);
            els[rnd_i].parentNode.classList.add('active');
            const phid = els[rnd_i].getAttribute('rel'),
                target = document.querySelector('#ptable_vis > iframe'),
                target_addr = get_visavis_url({phid: phid}, 'graph', window.innerHeight - 50);

            if (target) target.contentWindow.location.replace(target_addr);
            else document.getElementById('ptable_vis').innerHTML = '<iframe frameborder=0 scrolling="no" width="100%" height="850" src="' + target_addr + '"></iframe>';

        } else document.getElementById('ptable_vis').innerHTML = '';
    }
}

function render_right(data){
    data = JSON.parse(data);
    if (data.error)
        return wmgui.notify(data.error);

    if (data.fuzzy_notice || !data.out.length)
        document.getElementById('ptable_vis').innerHTML = '';
    else
        document.getElementById('ptable_vis').innerHTML = '<h4>Reported phase diagrams of ' + wmgui.ptable.query.elements + ' system</h4>' + build_thumbs_pd(data.out);
}

function render_unaries(){

    if (!wmgui.ptable.first_el)
        return;

    wmgui.ptable.els_data.forEach(function(elem_data){
        if (!elem_data.pos)
            return;

        const that = document.querySelector('#ptable_area > ul > li[data-pos="' + elem_data.pos + '"]');
        that.style.backgroundImage = "none";
        //that.innerHTML = elem_data.html;
        that.className = "";
        that.classList.add(...elem_data.classes);
    });

    wmgui.ptable.first_el = null;
}

function render_binaries(elA, elB){

    //console.log('RENDERING BINARIES FOR: ' + [elA, elB]);

    document.querySelectorAll('#ptable_area > ul > li').forEach(function(item){
        if (!item.hasAttribute('data-pos'))
            return;

        const current_el = wmgui.ptable.elements[parseInt(item.getAttribute('data-pos'))];

        if (wmgui.ptable.dtypes == 1){

            if (current_el != elA && current_el != elB){
                item.style.backgroundImage = "url('" + wmgui.ptable.pdsvg_path + "/bin/" + elA + "-" + current_el + ".svg')";
                item.className = "active_a";
            }
        } else if (wmgui.ptable.dtypes == 2){

            if (current_el != elA && current_el != elB){
                let pair = [elA, current_el];
                pair.sort();
                item.style.backgroundImage = "url('" + wmgui.ptable.crsvg_path + "/bin/" + pair.join("-") + ".svg')";
                item.className = "active_a";
            }
        } else if (wmgui.ptable.dtypes == 3){

            if (current_el != elA && current_el != elB){
                let pair = [elA, current_el];
                pair.sort();
                item.style.backgroundImage = "url('" + wmgui.ptable.ppsvg_path + "/bin/" + pair.join("-") + ".svg')";
                item.className = "active_a";
            }
        } else {
            if (current_el != elA && current_el != elB){
                item.style.backgroundImage = "none";
                item.className = "active_a";

            } else if (current_el == elA) {
                item.className = "selected_a";
                item.classList.add(...wmgui.ptable.els_data[parseInt(item.getAttribute('data-pos'))].classes);
            }
        }
    });
}

function render_ternaries(elA, elB){

    //console.log('RENDERING TERNARIES FOR: ' + [elA, elB]);

    document.querySelectorAll('#ptable_area > ul > li').forEach(function(item){
        if (!item.hasAttribute('data-pos'))
            return;

        const current_el = wmgui.ptable.elements[parseInt(item.getAttribute('data-pos'))];

        if (wmgui.ptable.dtypes == 1){

            if (current_el != elA && current_el != elB){
                let triple = [elA, elB, current_el];
                triple.sort();
                item.style.backgroundImage = "url('" + wmgui.ptable.pdsvg_path + "/ter/" + triple.join("-") + ".svg')";
                item.classList.add('active_b');
            }
        } else if (wmgui.ptable.dtypes == 2){

            if (current_el != elA && current_el != elB){
                let triple = [elA, elB, current_el];
                triple.sort();
                item.style.backgroundImage = "url('" + wmgui.ptable.crsvg_path + "/ter/" + triple.join("-") + ".svg')";
                item.classList.add('active_b');
            }
        } else if (wmgui.ptable.dtypes == 3){

            if (current_el != elA && current_el != elB){
                let triple = [elA, elB, current_el];
                triple.sort();
                item.style.backgroundImage = "url('" + wmgui.ptable.ppsvg_path + "/ter/" + triple.join("-") + ".svg')";
                item.classList.add('active_b');
            }
        } else {
            if (current_el != elA && current_el != elB){
                item.style.backgroundImage = "none";
                item.classList.add('active_b');

            } else if (current_el == elA) {
                item.className = "selected_a";
                item.classList.add(...wmgui.ptable.els_data[parseInt(item.getAttribute('data-pos'))].classes);

            } else if (current_el == elB) {
                item.className = "selected_b";
            }
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
        result_html += '  <div class="gallery_img' + (row[2] !== '&mdash;' ? ' renderable' : '') + '" rel="' + row[0] + '" style="background-image:url(https://mpds.io/phid_thumbs/' + row[0] + '.png);"><span><p>' + row[1] + '<br />space group ' + row[2] + '</p></span></div>';
        result_html += '  <div class="gallery_label"><a class="launch_id" href="#phase_id/' + row[0] + '">Show ' + row[3] + (row[3] == 1 ? ' entry' : ' entries') + '</a><br />Publications: ' + row[4] + '</div>';
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
        result_html += '  <div class="gallery_img" rel="' + row[0] + '" data-path="entry">' + content + '</div>';
        result_html += '  <div class="gallery_label"><a class="launch_id" href="#entry/' + row[0] + '">' + row[0] + '</a>' + '<br />[' + row[5] + '&rsquo;' + row[6].toString().substr(2, 2) + ']' + '</div>';
        result_html += '</div>';
    });
    return result_html;
}

function select_ptable_el(selected_el, dom_el){
    //console.log('Selected element is ' + selected_el);

    if (!dom_el){
        const dom_el = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(selected_el) + '"]');
        if (!dom_el) return wmgui.notify('Sorry, wrong element: ' + selected_el);
    }

    if (dom_el.classList.contains('selected_a')){
        // first element removal
        dom_el.classList.remove('selected_a');
        render_unaries();
        refresh_ptable_results();

    } else if (dom_el.classList.contains('selected_b')){
        // second element removal
        dom_el.classList.remove('selected_b');
        render_binaries(wmgui.ptable.first_el, selected_el);
        wmgui.ptable.second_el = null;
        refresh_ptable_results(wmgui.ptable.first_el);

    } else if (dom_el.classList.contains('selected_c')){
        // third element removal
        dom_el.classList.remove('selected_c');
        refresh_ptable_results(wmgui.ptable.first_el, wmgui.ptable.second_el);

    } else if (dom_el.classList.contains('active_b')){
        // third element selection
        removeAllCls('selected_c');
        dom_el.classList.add('selected_c');
        refresh_ptable_results(wmgui.ptable.first_el, wmgui.ptable.second_el, selected_el);

    } else if (dom_el.classList.contains('active_a')){
        // second element selection
        removeAllCls('selected_b');
        dom_el.classList.add('selected_b');
        render_ternaries(wmgui.ptable.first_el, selected_el);
        wmgui.ptable.second_el = selected_el;
        refresh_ptable_results(wmgui.ptable.first_el, selected_el);

    } else {
        // first element selection
        dom_el.classList.add('selected_a');
        wmgui.ptable.first_el = selected_el;
        render_binaries(wmgui.ptable.first_el, selected_el);
        refresh_ptable_results(selected_el);
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
            domelB.classList.add(...wmgui.ptable.els_data[parseInt(domelB.getAttribute('data-pos'))].classes);
            domelB.style.backgroundImage = "none";
        }
        render_ternaries(els[0], els[1]);

    } else {
        const domelB = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[1]) + '"]'),
            domelC = document.querySelector('#ptable_area > ul > li[data-pos="' + wmgui.ptable.elements.indexOf(els[2]) + '"]');

        if (domelB){
            removeAllCls('selected_b');
            domelB.classList.add('selected_b');
            domelB.classList.add(...wmgui.ptable.els_data[parseInt(domelB.getAttribute('data-pos'))].classes);
            domelB.style.backgroundImage = "none";
        }
        if (domelC){
            removeAllCls('selected_c');
            domelC.classList.add('selected_c');
        }
        render_ternaries(els[0], els[1]);
    }
    refresh_ptable_results(...els);
}
