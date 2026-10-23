import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import { notify } from '../ui/notifications.js';
import { switch_view_mode, switch_control_mode, show_examples, close_vibox, stop_visavis } from '../ui/view-mode.js';
import { create_floating_slider, destroy_numericbox, get_sliders_ranges } from './numeric.js';

wmgui.aug_search_cmd = function(new_fct, new_val){
    var checks = [['elements', 'formulae'], ['formulae', 'elements'], ['lattices', 'sgs'], ['sgs', 'lattices'], ['protos', 'sgs'], ['sgs', 'protos'], ['lattices', 'protos'], ['protos', 'lattices']];
    for (var i = 0; i < checks.length; i++){
        if (wmgui.search[checks[i][0]] && new_fct == checks[i][1]){ delete wmgui.search[checks[i][0]]; break; }
    }

    var orepr = {};

    $.each(wmgui.facets, function(n, fct){
        if (wmgui.search[fct] && fct == new_fct){
            if (wmgui.multi_facets.indexOf(fct) !== -1)
                orepr[fct] = wmgui.search[fct] + ',' + new_val;
            else
                orepr[fct] = new_val;
        } else if (wmgui.search[fct]){
            orepr[fct] = wmgui.search[fct];
        } else if (fct == new_fct){
            orepr[fct] = new_val;
        }
    });
    return '#inquiry/' + $.param(orepr);
}
window.aug_search_cmd = wmgui.aug_search_cmd;

wmgui._selectize_read_main = function(){
    var result = {};

    $('#search_holder div.selectize-input.items').children().each(function(){
        if (this.tagName !== 'DIV')
            return;

        var facet = this.getAttribute('data-facet');

        if (wmgui.other_facets.indexOf(facet) !== -1 && wmgui.search[facet])
            result[facet] = wmgui.search[facet];

        else if (facet == 'numeric'){
            if (wmgui.search[facet]){
                result[facet] = '';
                wmgui.search[facet].forEach(function(item){
                    result[facet] += serialize_numeric.apply(this, item);
                });
                if (result[facet].length) result[facet] = result[facet].substr(0, result[facet].length - 1);
            }
        }

        else if (result[facet] && facet == 'elements')
            result[facet] += '-' + this.getAttribute('data-term');

        else if (result[facet] && wmgui.multi_facets.indexOf(facet) !== -1)
            result[facet] += ', ' + this.getAttribute('data-term');

        else if (facet == 'formulae')
            result[facet] = this.getAttribute('data-term').replaceAll('<sub>', '').replaceAll('</sub>', '');

        else
            result[facet] = this.getAttribute('data-term');
    });

    return result;
}
window._selectize_read_main = wmgui._selectize_read_main;

wmgui._selectize_read_facet = function(fct){
    var result = {},
        selector = 'div.advs_' + fct;

    $(selector + ' div.selectize-input.items').children().each(function(){
        if (this.tagName !== 'DIV')
            return;

        var facet = this.getAttribute('data-facet');

        if (result[facet])
            result[facet] += ', ' + this.getAttribute('data-term');
        else
            result[facet] = this.getAttribute('data-term');
        return;
    });

    return result;
}
window._selectize_read_facet = wmgui._selectize_read_facet;

wmgui._selectize_write = function($this, name, search_obj){

    wmgui.selectize_emit = false;

    var given_search = {};
    $.extend(given_search, search_obj);

    if (name == 'main'){
        name = ['formulae', 'props', 'elements', 'classes', 'lattices', 'aetypes'];

        for (var i = 0; i < wmgui.other_facets.length; i++){
            if (given_search[wmgui.other_facets[i]]){
                $this.display(wmgui.other_facets[i], wmgui.facet_names[wmgui.other_facets[i]].toLowerCase());
            }
        }

        if (given_search.numeric) $this.display('numeric', 'range search');

    } else name = [name];

    name.forEach(function(facet){
        if (!given_search[facet])
            return;

        else if (facet == 'elements' && given_search[facet].indexOf('-') > 0){
            given_search[facet].split('-').forEach(function(part){
                $this.display(facet, part);
            });
        } else if (wmgui.multi_facets.indexOf(facet) !== -1 && given_search[facet].indexOf(',') > 0){
            given_search[facet].split(',').forEach(function(part){
                $this.display(facet, part);
            });
        } else if (facet == 'formulae'){
            given_search[facet] = wmgui.to_formula(given_search[facet]);
            $this.display(facet, given_search[facet]);

        } else $this.display(facet, given_search[facet]);
    });

    $this.clearOptions();
    wmgui.selectize_emit = true;
}
window._selectize_write = wmgui._selectize_write;

wmgui._selectize_display = function($this, facet, term){
    var random_id = Math.floor((Math.random() * 1000));
    $this.addOption({facet: facet, label: term, id: random_id});
    $this.addItem(random_id);
}
window._selectize_display = wmgui._selectize_display;

function show_advsbox(){
    $('div.modal').hide();
    $('#advsbox, #overlay').show();

    if (!$.isEmptyObject(wmgui.search)){
        $.each(wmgui.simple_facets, function(n, item){
            var curval = $('#advs_fct_' + item).val();
            if (curval){
                if (item == "formulae") curval = wmutils.termify_formulae(curval);
                else if (item == "elements") curval = curval.replaceAll(',', '').replaceAll(' ', '-');
                else if (item == "doi") curval = curval.replace(/http:\/\/dx\.doi\.org\//, '').replace(/http:\/\/doi\.org\//, '').trim();
                else if (item == "codens") curval = wmgui.journal_converter.c2j(curval);
                else if (item == "doi") curval = curval.replace('http://dx.doi.org/', '').replace('http://doi.org/', '').trim();
                $('#advs_fct_' + item).val(decodeURIComponent(curval.replace(/\+/g, "%20")));
            } else $('#advs_fct_' + item).val('');
        });
        $.each(wmgui.multi_facets, function(n, item){
            $('#advs_fct_' + item + '-selectized').val('');
            wmgui.multiselects[item].clear();
            if (wmgui.search[item]){
                var obj = {}; obj[item] = wmgui.search[item];
                wmgui.multiselects[item].write(obj);
                if (item == 'aetypes') show_aetmap(wmgui.search[item].split(',').pop());
            }
        });
    }
    if (!show_advsbox.cached_aetmap){ show_advsbox.cached_aetmap = new Image(); show_advsbox.cached_aetmap.src = wmgui.aetmap_addr; }
}
window.show_advsbox = show_advsbox;
wmgui.show_advsbox = show_advsbox;

function show_aetmap(term){
    var coords = wmgui.aets[term];
    if (coords)
        $('#aetmap').css('height', coords[1] + 'px').css('background', 'url(' + wmgui.aetmap_addr + ') 0 -' + coords[0] + 'px no-repeat').show();
    else
        $('#aetmap').hide();
}
window.show_aetmap = show_aetmap;

function render_all_polyhedra(){
    if (!$('#all_polyhedra_content').is(':empty')) return;
    var aetypes_html = '',
        defined_aetypes = Object.keys(wmgui.aets);
    defined_aetypes.sort(function(a, b){
        var partsa = a.split('-vertex')[0].split(' '), va = parseInt(partsa[partsa.length - 1]), partsb = b.split('-vertex')[0].split(' '), vb = parseInt(partsb[partsb.length - 1]);
        return va > vb ? 1 : va < vb ? -1 : (a.length > b.length ? 1 : a.length < b.length ? -1 : 0);
    });
    $.each(defined_aetypes, function(key, value){
        var coords = wmgui.aets[value];
        aetypes_html += '<div class="gallery_item" rel="' + value + '"><div style="width:125px;height:' + coords[1] + 'px;margin:10px auto;background:url(' + wmgui.aetmap_addr + ') 0 -' + coords[0] + 'px no-repeat;"></div><span>' + value + '</span></div>';
    });
    $('#all_polyhedra_content').html(aetypes_html);
}
window.render_all_polyhedra = render_all_polyhedra;

export { show_advsbox, show_aetmap, render_all_polyhedra };