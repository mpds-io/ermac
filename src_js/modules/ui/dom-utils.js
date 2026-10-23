import wmgui from '../state/wmgui-object.js';
import { $ } from '../../third_party/jquery.shim.js';
import OptimadeNLP from '../../third_party/optimade.shim.js';

var wmutils = OptimadeNLP();
window.wmutils = wmutils;

$.ajaxSetup({
    xhrFields: {withCredentials: true}
});

wmgui.clean = function(str){
    var html = $((str || '').bold());
    html.find('script').remove();
    return html.html();
}

wmgui.cancel_event = function(evt){
    evt = evt || window.event;
    if (evt.cancelBubble) evt.cancelBubble = true;
    else {
        if (evt.stopPropagation) evt.stopPropagation();
        if (evt.preventDefault) evt.preventDefault();
    }
}

wmgui.debounce = function(func, wait, immediate){
    var timeout;
    return function(){
        var context = this, args = arguments;
        var later = function(){
            timeout = null;
            if (!immediate) func.apply(context, args);
        }
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    }
}

wmgui.is_inview = function(element){
    var pageTop = $(window).scrollTop(),
        pageBottom = pageTop + $(window).height(),
        elementTop = $(element).offset().top,
        elementBottom = elementTop + $(element).height();
    return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
}

wmgui.show_preloader = function(){ $('#preloader').show(); }
wmgui.hide_preloader = function(){ $('#preloader').hide(); }

wmgui.loadCSS = function(href, before, media, attributes){
    var ss = document.createElement("link");
    var ref;
    if(before){ ref = before; }
    else {
        var refs = ( document.body || document.getElementsByTagName("head")[0] ).childNodes;
        ref = refs[refs.length - 1];
    }
    var sheets = document.styleSheets;
    if(attributes){
        for(var attributeName in attributes){
            if(attributes.hasOwnProperty(attributeName)){
                ss.setAttribute(attributeName, attributes[attributeName]);
            }
        }
    }
    ss.rel = "stylesheet";
    ss.href = href;
    ss.media = "only x";
    function ready(cb){
        if(document.body){ return cb(); }
        setTimeout(function(){ ready(cb); });
    }
    ready(function(){
        ref.parentNode.insertBefore(ss, (before ? ref : ref.nextSibling));
    });
    var onloadcssdefined = function(cb){
        var resolvedHref = ss.href;
        var i = sheets.length;
        while(i--){
            if(sheets[i].href === resolvedHref){ return cb(); }
        }
        setTimeout(function(){ onloadcssdefined(cb); });
    };
    function loadCB(){
        if(ss.addEventListener){ ss.removeEventListener("load", loadCB); }
        ss.media = media || "all";
    }
    if(ss.addEventListener){ ss.addEventListener("load", loadCB); }
    ss.onloadcssdefined = onloadcssdefined;
    onloadcssdefined(loadCB);
    return ss;
}

wmgui.most_frequent_els = ['O', 'Si', 'Al', 'Fe', 'Ca', 'Na', 'Mg', 'K', 'Ti', 'H', 'Cl', 'S', 'Br', 'C'];
wmgui.probable_els = wmutils.periodic_elements_cased.slice(0, 55);
wmgui.probable_els.splice(53, 1);
wmgui.probable_els.splice(42, 1);
wmgui.probable_els.splice(35, 1);
wmgui.probable_els.splice(17, 1);
wmgui.probable_els.splice(9, 1);
wmgui.probable_els.splice(1, 1);

wmgui.classes_groups = ['transitional','chalcogen','rare earth','lanthanoid','metalloid','alkaline','halogen','pnictogen','alkali','actinoid'];
wmgui.classes_families = ['metal','intermetallic','oxide','conductor','nonmetal','antiferromagnet','ferromagnet','semiconductor','intermediate valence','superconductor','close-packed','perovskite','scheelite','high-tc superconductor','silicide','diamagnetic','cuprate','ferrimagnet','sulfide','spin glass','rocksalt','ferroelectric','frank-kasper','selenide','adamantane','paramagnet','friauf-laves','boride','semimetal','pauli paramagnet','fluoride','telluride','hydrate','carbide','ionic conductor','chloride','spinel','intercalation','fluorite','hard magnet','arsenide','ferroelastic','orthophosphate','phosphide','nitride','piezoelectric','antiferroelectric','hydroxide','silicate','organic','hydride','iodide','bromide','charge-density wave state','spin-density wave state','ruddlesden-popper','sulfate','superionic conductor','pyrochlore','orthosilicate','borocarbide','molybdate','borate','garnet','cyanide','thermoelectric','helimagnet','vanadate','zeolite','birefringent','deuteride','orthoborate','van vleck paramagnet','mictomagnet','carbonate','phosphate','chevrel','gamma-brass','polaron conductor','nasicon','luminescent','tungstate','arsenate','nitrate','radioactive'];
wmgui.most_frequent_classes = ['metal','oxide','conductor','nonmetal','antiferromagnet','semiconductor','perovskite','scheelite','sulfide','paramagnet','ab initio literature','hydrate','chloride','spinel','fluorite','orthophosphate','silicate','machine learning','ab initio calculations'];
wmgui.most_frequent_props = ['magnetism', 'crystal structure', 'electronic properties', 'mechanical properties', 'thermodynamics', 'phase transitions', 'optical properties', 'superconductivity', 'enthalpy of formation', 'heat capacity', 'thermal expansion', 'Seebeck coefficient'];
wmgui.most_frequent_lats = ['cubic', 'tetragonal', 'orthorhombic', 'monoclinic'];
wmgui.most_frequent_formulae = ['Ag2S','Ag2Se','Ag2Te','Ag3Sn','AgBr','AgCe','AgCl','AgCu4Yb','AgGaS2','AgGaSe2','AgI','AgYbGe','Al2O3','Al4C3','AlAs','AlF3','AlN','AlP','AlSb','Al[PO4]','As2S3','As2Se3','As2Te3','AsS','AuSn','AuTe2','B13C2','Ba2Cu3ErO7','Ba2Cu3GdO7','Ba2Cu3HoO7','Ba2Cu3LaO7','Ba2Cu3NdO7','Ba2Cu3PrO7','Ba2Cu3SmO7','Ba2Cu3TmO7','Ba2Cu3YO6','Ba2Cu3YO7','Ba2Cu3YbO7','Ba2Cu4YO8','Ba2CuTl2O6','Ba2MoFeO6','Ba4Ga8Ge15','Ba4Ga8Sn15','BaBiO3','BaCl2','BaF2','BaFe12O19','BaFe2As2','BaIrO3','BaLaMn2O6','BaMnF4','BaO','BaPbO3','BaRuO3','BaTiO3','BaVS3','BaYCo4O7','BaZrO3','Be13U','BeO','Bi2O3','Bi2S3','Bi2Se3','Bi2Te3','C60','Ca2ReFeO6','Ca2RuO4','Ca3Co2O6','Ca3Co4O9','CaAl2','CaAlSi','CaCu3Ti4O12','CaF2','CaFe2As2','CaIrO3','CaMnO3','CaO','CaRuO3','CaS','CaSi2','CaTiO3','Ca[CO3]','Ca[WO4]','Cd2Nb2O7','Cd3As2','CdAs2','CdCr2S4','CdCr2Se4','CdF2','CdI2','CdO','CdS','CdSb','CdSe','CdTe','Ce2Fe17','Ce3Al11','Ce3Sn','CeAl2','CeAl3','CeB6','CeBi','CeCo2','CeCo5','CeCoGe3','CeCoIn5','CeFe2','CeFe4Sb12','CeIn3','CeIrSi3','CeMn2Si2','CeNi','CeNi2Ge2','CeNi2Si2','CeNi2Sn2','CeNiGe2','CeNiSn','CeO2','CeP','CePd2Al3','CePd2Si2','CePd3','CePdSn','CePt2Si2','CePt3Si','CePtSn','CeRh2Si2','CeRh3B2','CeRhAs','CeRhGe','CeRhIn5','CeRhSb','CeRhSn','CeRu2','CeRu2Ge2','CeRu2Si2','CeRuRhSi2','CeSb','CeSi2','Co2Al9','Co2B','Co2Si','Co3O4','Co3[VO4]2','CoAl','CoGa','CoO','CoPt','CoS2','CoSb3','CoSi','CoSi2','Cr23C6','Cr2FeS4','Cr2O3','Cr2S3','Cr3C2','Cr3Si','Cr7Al45','Cr7C3','CrAs','CrB2','CrN','CrO2','CrSi2','CrTe','Cs2ZnI4','CsBr','CsC8','CsI','Cu2Ce','Cu2CeSi2','Cu2GdSi2','Cu2Nd','Cu2O','Cu2S','Cu2Se','Cu2Te','Cu2UGe2','Cu2USi2','Cu2Y','Cu2Y2O5','Cu2YbSi2','Cu2ZnSnS4','Cu33Al17','Cu3As','Cu3Au','Cu3Sb','Cu3Sn','Cu41Sn11','Cu4CeAl','Cu4YbIn','Cu5U','Cu5Zn8','Cu6Ce','Cu9Al4','CuAl','CuAl2','CuAu','CuBr','CuCl','CuCr2Se4','CuCrO2','CuFe2O4','CuFeO2','CuGaS2','CuGaSe2','CuGd2O4','CuGeO3','CuI','CuInS2','CuInSe2','CuInTe2','CuIr2S4','CuLa2O'];
wmgui.most_frequent_anonymous = ['AB','AB2','ABC3','ABC','ABC2','ABCD3','AB3','AB2C4','AB2C2','ABC4','ABC2D6','ABCD','ABCD2','AB2C3','AB2C6','AB2C5','AB2C3D7','A3B4','A3B5','ABC2D4','ABCD5','ABCD6','A2B3C4','ABC3D7','A2B3C5','AB2C10','A2B2C5','AB2C2D6','AB2C3D8','AB2C8','ABC2D3','A2B5','AB2C3D6','AB4C8','ABC6','AB2C2D8','AB6C6','AB3C7','A4B5'];

wmgui.get_random_term = function(sequence){
    return sequence[Math.floor(Math.random() * sequence.length)];
}

wmgui.get_realistic = function(facet, cur_nlen){
    var term;
    if (facet == 'elements'){
        var i = 0, els = [], prob_arity = [2, 3], cur_nlen = cur_nlen || wmgui.get_random_term(prob_arity);
        while (i < cur_nlen){
            var el;
            if (i < 2) el = wmgui.get_random_term(wmgui.probable_els);
            else el = wmgui.get_random_term(wmgui.most_frequent_els);
            if (els.indexOf(el) > -1) continue;
            els.push(el); i++;
        }
        term = els.join('-');
    } else if (facet == 'formulae') term = wmgui.get_random_term(wmgui.most_frequent_formulae);
    else if (facet == 'anonymous') term = wmgui.get_random_term(wmgui.most_frequent_anonymous);
    else if (facet == 'props') term = wmgui.get_random_term(wmgui.most_frequent_props);
    else if (facet == 'classes') term = wmgui.get_random_term(wmgui.classes_families);
    else if (facet == 'lattices') term = wmgui.get_random_term(wmgui.most_frequent_lats);
    else return wmgui.get_realistic(['elements', 'formulae', 'props', 'classes', 'lattices'][Math.floor(Math.random() * 5)]);
    return term;
}

wmgui.get_interesting = function(scene){
    var scenarios = [1, 2, 3, 4, 5, 6, 7, 8], scene = scene || wmgui.get_random_term(scenarios), result = {'text': '', 'terms': [], 'facets': []};
    if (scene == 1){ result['facets'].extend(['classes', 'elements']); result['terms'].extend([wmgui.get_random_term(wmgui.most_frequent_classes), wmgui.get_realistic('elements', 2)]); result['text'] += result['terms'][0] + ' ' + result['terms'][1];
    } else if (scene == 2){ result['facets'].extend(['classes', 'classes']); result['terms'].extend([wmgui.get_random_term(wmgui.classes_groups), wmgui.get_realistic('classes')]); result['text'] += result['terms'][0] + ' group, ' + result['terms'][1];
    } else if (scene == 3){ result['facets'].extend(['formulae', 'lattices']); result['terms'].extend([wmgui.get_realistic('formulae'), wmgui.get_realistic('lattices')]); result['text'] += result['terms'][0] + ' ' + result['terms'][1] + ' crystal';
    } else if (scene == 4){ result['facets'].extend(['props', 'classes']); result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('classes')]); result['text'] += result['terms'][0] + ' for ' + result['terms'][1]; if (!result['text'].endsWith('d') && !result['text'].endsWith('s')) result['text'] += 's';
    } else if (scene == 5){ result['facets'].extend(['classes', 'lattices']); result['terms'].extend([wmgui.get_realistic('classes'), wmgui.get_realistic('lattices')]); result['text'] += result['terms'][0] + ', ' + result['terms'][1] + ' crystal';
    } else if (scene == 6){ result['facets'].extend(['elements', 'lattices']); result['terms'].extend([wmgui.get_realistic('elements'), wmgui.get_realistic('lattices')]); result['text'] += result['terms'][0] + ', ' + result['terms'][1] + ' crystal';
    } else if (scene == 7){ result['facets'].extend(['props', 'formulae']); result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('anonymous')]); result['text'] += result['terms'][0] + ' ' + result['terms'][1];
    } else { result['facets'].extend(['props', 'formulae']); result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('formulae')]); result['text'] += result['terms'][0] + ' of ' + result['terms'][1]; }
    return result;
}

wmgui.to_formula = function(input){
    return input.replace(/\d/g, "<sub>$&</sub>");
}

wmgui.get_interpretation = function(search, facet_names, num_database){
    if (!search) search = {};
    var interpret_html = '', cur_nlen = 0;
    $.each(search, function(k, val){
        if (!facet_names[k] || !val) return true;
        else if (k == 'formulae') val = wmgui.to_formula(val);
        else if (k == 'doi' || k == 'sgs') val = decodeURIComponent(val);
        else if (k == 'elements'){
            var els = val.split('-'); cur_nlen = els.length;
            val = els.map(function(i){ return i.charAt(0).toUpperCase() + i.slice(1).toLowerCase() }).join(', ');
        } else if (k == 'classes'){
            val = val.split(',').map(function(x){ return x.trim() }).join(', ');
        } else if (k == 'authors'){
            val = val.split(',').map(function(surname){ return surname.trim().split(' ').map(function(part){ return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); }).join(' '); }).join(', ');
        } else if (k == 'aeatoms'){
            val = wmutils.parse_aeatoms(val); val = val[0] + '&nbsp;center and ' + val[1] + '&nbsp;as ligands';
        } else if (k == 'aetypes'){
            val = val.split(',').map(function(x){
                var parts = x.trim().split('-vertex')[0].split(' '), va = parseInt(parts[parts.length - 1]);
                return x.replace(/\d{1,2}\-vertex/, "CN&nbsp;=&nbsp;" + va);
            }).join(', ');
        } else if (k == 'numeric'){
            var out = '';
            val.forEach(function(member){
                var repr = member[0], units = '';
                if (num_database[repr]){
                    var decimals = num_database[repr][4] ? Math.abs(Math.log10(num_database[repr][4])) : Math.max(num_database[repr][2].count_decimals(), num_database[repr][3].count_decimals());
                    member[2] = Number(member[2]).toFixed(decimals);
                    if (num_database[repr][1]) units = '&nbsp;' + num_database[repr][1];
                    if (num_database[repr][5]) repr = num_database[repr][5];
                }
                out += repr + ' ' + member[1] + ' ' + member[2] + units + '<br />';
            });
            val = out;
        }
        interpret_html += '<li class="fct_' + k + '"><span>' + facet_names[k] + '</span><br />' + val + '</li>';
    });
    if (!search.formulae && !$.isEmptyObject(search)){
        var add_arity_helper = true, arity_helper_html = '';
        $.each(wmutils.arity_keys.slice(1), function(num, value){
            if (search.classes && search.classes.indexOf(value) !== -1){ add_arity_helper = false; return false; }
            if (cur_nlen - 1 > num) return true;
            if ((cur_nlen < 4 && num > 3) || num > 4) return false;
            if (window.location.hash.indexOf('inquiry') > -1){
                if (window.location.hash.indexOf('classes=') > -1) var addr = window.location.hash.replace('classes=', 'classes=' + value + ',');
                else var addr = window.location.hash.replace('inquiry/', 'inquiry/classes=' + value + '&');
            } else var addr = window.location.hash + ' ' + value;
            arity_helper_html += '<li class="fct_classes" rel="' + addr + '" style="letter-spacing:0.5px;">Show only ' + value.substr(0, value.length - 1) + 'ies</li>';
        });
        if (add_arity_helper) interpret_html += arity_helper_html;
    }
    return interpret_html;
}

wmgui.parse_bib = function(string){
    try {
        var title = string.split('title={')[1].split('},')[0].trim(), authors = string.split('author={')[1].split('},')[0].trim(), journal = string.split('journal={')[1].split('},')[0].trim(), pubyear = string.split('year={')[1].split('},')[0].trim();
    } catch (error){
        console.error('Misformatted BIB, terminating...');
        var title = '', authors = '', journal = '', pubyear = '';
    }
    return [authors, title, journal, pubyear];
}

export { wmgui, $, wmutils };
export { wmgui as clean, wmgui as cancel_event, wmgui as debounce, wmgui as is_inview, wmgui as show_preloader, wmgui as hide_preloader, wmgui as loadCSS, wmgui as to_formula, wmgui as get_interpretation, wmgui as parse_bib, wmgui as get_random_term, wmgui as get_realistic, wmgui as get_interesting };