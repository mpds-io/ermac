"use strict";

if (!OptimadeNLP){
    throw new Error("Failed to load OptimadeNLP (due to maintenance works?)");
}

var wmutils = OptimadeNLP();

var wmgui = window.wmgui || {};

/**
 * Extending base types with the utilities
 */

Array.prototype.extend = function(other_array){
    other_array.forEach(function(v){ this.push(v) }, this);
}

String.prototype.startswith = function(prefix){
    return this.indexOf(prefix) === 0;
}

Number.prototype.count_decimals = function(){
    if (isFinite(this) && Math.floor(this) === this) return 0; // is integer
    var repr = this.toString();
    if (repr.indexOf(".") == -1) return 0;
    return repr.split(".")[1].length || 0;
}

/**
 * Auxiliary methods relevant for DOM (based on jQuery)
 */

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
        var context = this,
            args = arguments;
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
    // Arguments:
    // `href` [REQUIRED] is the URL for your CSS file.
    // `before` [OPTIONAL] is the element the script should use as a reference for injecting our stylesheet <link> before
    // By default, loadCSS attempts to inject the link after the last stylesheet or script in the DOM. However, you might desire a more specific location in your document.
    // `media` [OPTIONAL] is the media type or query of the stylesheet. By default it will be 'all'
    // `attributes` [OPTIONAL] is the Object of attribute name/attribute value pairs to set on the stylesheet's DOM Element.
    var ss = document.createElement( "link" );
    var ref;

    if( before ){
        ref = before;
    }
    else {
        var refs = ( document.body || document.getElementsByTagName( "head" )[ 0 ] ).childNodes;
        ref = refs[ refs.length - 1];
    }

    var sheets = document.styleSheets;
    // Set any of the provided attributes to the stylesheet DOM Element.
    if( attributes ){
        for( var attributeName in attributes ){
            if( attributes.hasOwnProperty( attributeName ) ){
                ss.setAttribute( attributeName, attributes[attributeName] );
            }
        }
    }
    ss.rel = "stylesheet";
    ss.href = href;
    // temporarily set media to something inapplicable to ensure it'll fetch without blocking render
    ss.media = "only x";

    // wait until body is defined before injecting link. This ensures a non-blocking load in IE11.
    function ready( cb ){
        if( document.body ){
            return cb();
        }
        setTimeout(function(){
            ready( cb );
        });
    }
    // Inject link
        // Note: the ternary preserves the existing behavior of "before" argument, but we could choose to change the argument to "after" in a later release and standardize on ref.nextSibling for all refs
        // Note: `insertBefore` is used instead of `appendChild`, for safety re: http://www.paulirish.com/2011/surefire-dom-element-insertion/
    ready( function(){
        ref.parentNode.insertBefore( ss, ( before ? ref : ref.nextSibling ) );
    });

    // A method (exposed on return object for external use) that mimics onload by polling document.styleSheets until it includes the new sheet.
    var onloadcssdefined = function( cb ){
        var resolvedHref = ss.href;
        var i = sheets.length;
        while( i-- ){
            if( sheets[ i ].href === resolvedHref ){
                return cb();
            }
        }
        setTimeout(function() {
            onloadcssdefined( cb );
        });
    };

    function loadCB(){
        if( ss.addEventListener ){
            ss.removeEventListener( "load", loadCB );
        }
        ss.media = media || "all";
    }

    // once loaded, set link's media back to `all` so that the stylesheet applies once it loads
    if( ss.addEventListener ){
        ss.addEventListener( "load", loadCB);
    }
    ss.onloadcssdefined = onloadcssdefined;
    onloadcssdefined( loadCB );
    return ss;
}

/**
 * Domain subject definitions
 */

wmgui.periodic_elements_xed = ["x"].concat(wmutils.periodic_elements);

wmgui.most_frequent_els = ['O', 'Si', 'Al', 'Fe', 'Ca', 'Na', 'Mg', 'K', 'Ti',    'H', 'Cl', 'S', 'Br', 'C'];

// just less probable than the *most_frequent_els*
wmgui.probable_els = wmutils.periodic_elements_cased.slice(0, 55);
wmgui.probable_els.splice(53, 1); // Xe
wmgui.probable_els.splice(42, 1); // Tc
wmgui.probable_els.splice(35, 1); // Kr
wmgui.probable_els.splice(17, 1); // Ar
wmgui.probable_els.splice(9, 1); // Ne
wmgui.probable_els.splice(1, 1); // He

wmgui.classes_groups = ['transitional','chalcogen','rare earth','lanthanoid','metalloid','alkaline','halogen','pnictogen','alkali','actinoid']; // NB noble gas

wmgui.classes_families = ['metal','intermetallic','oxide','conductor','nonmetal','antiferromagnet','ferromagnet','semiconductor','intermediate valence','superconductor','close-packed','perovskite','high-tc superconductor','silicide','diamagnetic','cuprate','ferrimagnet','sulfide','spin glass','rocksalt','ferroelectric','frank-kasper','selenide','adamantane','paramagnet','friauf-laves','boride','semimetal','pauli paramagnet','fluoride','telluride','hydrate','carbide','ionic conductor','chloride','spinel','intercalation','fluorite','hard magnet','arsenide','ferroelastic','orthophosphate','phosphide','nitride','piezoelectric','antiferroelectric','hydroxide','silicate','organic','hydride','iodide','bromide','charge-density wave state','spin-density wave state','ruddlesden-popper','sulfate','superionic conductor','pyrochlore','orthosilicate','borocarbide','molybdate','borate','garnet','cyanide','thermoelectric','helimagnet','vanadate','zeolite','birefringent','deuteride','orthoborate','van vleck paramagnet','mictomagnet','carbonate','phosphate','chevrel','gamma-brass','polaron conductor','nasicon','luminescent','tungstate','arsenate','nitrate','radioactive']; // NB pyrite-marcasite, pyroelectric, clathrate, heavy fermion etc.

wmgui.most_frequent_classes = ['metal','oxide','conductor','nonmetal','antiferromagnet','semiconductor','perovskite','sulfide','paramagnet','ab initio literature','hydrate','chloride','spinel','fluorite','orthophosphate','silicate', 'machine learning', 'ab initio calculations'];

wmgui.most_frequent_props = ['magnetism', 'crystal structure', 'electronic properties', 'mechanical properties', 'thermodynamics', 'phase transitions', 'optical properties', 'superconductivity', 'enthalpy of formation', 'heat capacity', 'thermal expansion', 'Seebeck coefficient']; // TODO cell parameters

wmgui.most_frequent_lats = ['cubic', 'tetragonal', 'orthorhombic', 'monoclinic'];

wmgui.most_frequent_formulae = ['Ag2S','Ag2Se','Ag2Te','Ag3Sn','AgBr','AgCe','AgCl','AgCu4Yb','AgGaS2','AgGaSe2','AgI','AgYbGe','Al2O3','Al4C3','AlAs','AlF3','AlN','AlP','AlSb','Al[PO4]','As2S3','As2Se3','As2Te3','AsS','AuSn','AuTe2','B13C2','Ba2Cu2YFeO7','Ba2Cu3DyO7','Ba2Cu3ErO7','Ba2Cu3EuO7','Ba2Cu3GdO7','Ba2Cu3HoO7','Ba2Cu3LaO7','Ba2Cu3NdO7','Ba2Cu3PrO7','Ba2Cu3SmO7','Ba2Cu3TmO7','Ba2Cu3YO6','Ba2Cu3YO7','Ba2Cu3YbO7','Ba2Cu4YO8','Ba2CuTl2O6','Ba2MoFeO6','Ba4Ga8Ge15','Ba4Ga8Sn15','BaBiO3','BaCl2','BaF2','BaFe12O19','BaFe2As2','BaIrO3','BaLaMn2O6','BaMnF4','BaO','BaPbO3','BaRuO3','BaTiO3','BaVS3','BaYCo4O7','BaZrO3','Be13U','BeO','Bi2O3','Bi2S3','Bi2Se3','Bi2Te3','C60','Ca2ReFeO6','Ca2RuO4','Ca3Co2O6','Ca3Co4O9','CaAl2','CaAlSi','CaCu3Ti4O12','CaF2','CaFe2As2','CaIrO3','CaMnO3','CaO','CaRuO3','CaS','CaSi2','CaTiO3','Ca[CO3]','Ca[WO4]','Cd2Nb2O7','Cd3As2','CdAs2','CdCr2S4','CdCr2Se4','CdF2','CdI2','CdO','CdS','CdSb','CdSe','CdTe','Ce2Fe17','Ce3Al11','Ce3Sn','CeAl2','CeAl3','CeB6','CeBi','CeCo2','CeCo5','CeCoGe3','CeCoIn5','CeFe2','CeFe4Sb12','CeIn3','CeIrSi3','CeMn2Si2','CeNi','CeNi2Ge2','CeNi2Si2','CeNi2Sn2','CeNiGe2','CeNiSn','CeO2','CeP','CePd2Al3','CePd2Si2','CePd3','CePdSn','CePt2Si2','CePt3Si','CePtSn','CeRh2Si2','CeRh3B2','CeRhAs','CeRhGe','CeRhIn5','CeRhSb','CeRhSn','CeRu2','CeRu2Ge2','CeRu2Si2','CeRuRhSi2','CeSb','CeSi2','Co2Al9','Co2B','Co2Si','Co3O4','Co3[VO4]2','CoAl','CoGa','CoO','CoPt','CoS2','CoSb3','CoSi','CoSi2','Cr23C6','Cr2FeS4','Cr2O3','Cr2S3','Cr3C2','Cr3Si','Cr7Al45','Cr7C3','CrAs','CrB2','CrN','CrO2','CrSi2','CrTe','Cs2ZnI4','CsBr','CsC8','CsCl','CsI','Cu2Ce','Cu2CeSi2','Cu2GdSi2','Cu2Nd','Cu2O','Cu2S','Cu2Se','Cu2Te','Cu2UGe2','Cu2USi2','Cu2Y','Cu2Y2O5','Cu2YbSi2','Cu2ZnSnS4','Cu33Al17','Cu3As','Cu3Au','Cu3Sb','Cu3Sn','Cu41Sn11','Cu4CeAl','Cu4YbIn','Cu5U','Cu5Zn8','Cu6Ce','Cu9Al4','CuAl','CuAl2','CuAu','CuBr','CuCl','CuCr2Se4','CuCrO2','CuFe2O4','CuFeO2','CuGaS2','CuGaSe2','CuGd2O4','CuGeO3','CuI','CuInS2','CuInSe2','CuInTe2','CuIr2S4','CuLa2O4','CuNd2O4','CuO','CuPr2O4','CuS','CuTi2','CuV2S4','CuZn','Dy2Fe14B','Dy2Fe17','DyAl2','DyCo2','DyFe2','DyFe4Al8','DyMn2','DyMn2O5','DyMo2Fe10','DyTiFe11','Dy[VO4]','Er2Fe14B','Er2Fe17','Er2Fe17C3','Er5Si4','ErAl2','ErCo2','ErFe2','ErFeO3','ErMn2O5','ErNi2B2C','ErRh4B4','ErTiFe11','Eu2O3','Eu4Ga8Ge15','EuB6','EuFe2As2','EuFe4Sb12','EuMo6S8','EuO','EuS','EuSe','EuTe','Fe2As','Fe2B','Fe2CoO4','Fe2NiO4','Fe2O3','Fe2P','Fe3Al','Fe3C','Fe3Ga','Fe3O4','Fe3P','Fe3Si','Fe4Al13','Fe4N','Fe5Si3','FeAl','FeAs','FeB','FeBiO3','FeCl2','FeCo','FeCo2Si','FeGaO3','FeGe','FeGe2','FeNi3','FeO','FeP','FePt3','FeRh','FeS','FeS2','FeSb2','FeSe','FeSi','FeSi2','Ga2O3','GaAs','GaN','GaP','GaS','GaSb','GaSe','GaTe','Ga[PO4]','Gd2Fe14B','Gd2Fe17','Gd2O3','Gd2[MoO4]3','Gd3Co','Gd5Ge4','GdAl2','GdB6','GdCo2','GdCo5','GdFe2','GdFe3[BO3]4','GdMn2','GdMn2Ge2','GdMnO3','GdN','GdNi2','GdSi2','GdTiFe11','GeO2','GeS','GeSe','GeSe2','GeTe','H2','H2Cs[PO4]','H2K[PO4]','H2O','H2Rb[PO4]','H3Na[SeO3]2','HK[CO3]','HfB2','HfC','HfO2','HgCr2S4','HgCr2Se4','HgI2','HgS','HgSe','HgTe','Ho2Fe14B','HoAl2','HoCo2','HoFe2','HoMn2O5','HoMnO3','HoNi2','HoNi2B2C','In2O3','In2S3','In2Se3','InAs','InBi','InN','InP','InSb','InSe','InTe','K2[SeO4]','K3Mo10O30','K3Na[SeO4]2','K3[C60]','KBr','KC24','KC8','KCl','KLi[SO4]','KMnF3','KNbO3','KOs2O6','KTaO3','KTi[PO4]O','K[CN]','La2NiO4','La2O3','La3Ga5SiO14','La3S4','LaAl2','LaAlO3','LaB6','LaCoO3','LaCrO3','LaF3','LaFe11Si2','LaFe4Sb12','LaFeAsO','LaFeO3','LaGaO3','LaH3','LaMn2Ge2','LaMnO3','LaNi5','LaNiO3','LaTiO3','LaVO3','Li2Pd3B','Li2S','Li3N','LiAl','LiBr','LiCl','LiCoO2','LiF','LiFe[PO4]','LiH','LiMn2O4','LiNbO3','LiNiO2','LiTaO3','LiTi2O4','LiV2O5','LiVO2','LiYF4','Lu2Fe17','Lu5Ir4Si10','LuNi2B2C','Mg17Al12','Mg24Y5','Mg28Al45','Mg2Si','Mg2Sn','Mg2TiO4','Mg2[SiO4]','MgAl2O4','MgB2','MgCu2','MgF2','MgFe2O4','MgFeAlO4','MgFe[SiO4]','MgO','MgSiO3','MgZn2','Mn11Al15','Mn3C','Mn3O4','Mn5Si3','MnAl6','MnAs','MnBi','MnF2','MnFe2O4','MnNi2Ga','MnNi2In','MnNi2Sb','MnNi2Sn','MnNiSb','MnO','MnO2','MnP','MnS','MnSi','MnTe','Mo2S3','Mo3Al8','Mo4O11','Mo6PbS8','Mo7Ni7','MoB2','MoO3','MoS2','MoSi2','NaBr','NaCl','NaF','NaI','NaNbO3','Na[NO2]','Na[NO3]','Nb2Al','Nb3FeSe6','Nb3Ge','Nb3Si','Nb3Sn','Nb5Si3','Nb7Ni6','NbAl3','NbB2','NbC','NbCr2','NbFe2','NbH','NbN','NbNi3','NbO2','NbSe2','NbSe3','NbSi2','Nd2Co14B','Nd2Fe13CoB','Nd2Fe14B','Nd2Fe17','Nd2O3','Nd6Fe11Al3','NdAl2','NdB6','NdCo2','NdCo5','NdFeAsO','NdFeO3','NdMn2Ge2','NdMnFeGe2','NdMnO3','NdMo2Fe10','NdNiO3','NdTiFe11','NdTiO3','NdV2Fe10','Ni2Al3','Ni2B','Ni2Si','Ni31Si12','Ni3Al','Ni3B','Ni3Si','Ni3[VO4]2','Ni4B3','NiAl','NiAl3','NiO','NiS','NiS2','NiSb','NiSi','NiSi2','NpPd5Al2','O2','PbF2','PbI2','PbO','PbO2','PbS','PbSe','PbTe','Pb[WO4]','Pd2Si','PdAl','PdH','Pr2Fe14B','Pr2O3','PrAl2','PrB6','PrCo5','PrFe2Ge2','PrFe4P12','PrFeAsO','PrMn2Ge2','PrMnO3','PrNi2Si2','PrNi5','PrOs4Sb12','Rb2ZnBr4','Rb2ZnCl4','Rb3[C60]','RbBr','RbCl','RbF','RbI','RbLi[SO4]','Rb[C60]','ReO3','RuAl2','Sb2S3','Sb2Se3','Sb2Te3','SbSI','Sc2[WO4]3','ScAl3','Si3N4','SiC','SiO2','Sm2Co17','Sm2Fe17','Sm2Fe17N3','Sm2O3','SmB6','SmCo5','SmFeAsO','SmMn2Ge2','SmS','SmTiFe11','SnO2','SnS','SnS2','SnSe','SnSe2','SnTe','Sr14Cu24O41','Sr2CuBi2O6','Sr2LaMn2O7','Sr2MoFeO6','Sr2RuO4','SrAl4','SrCoO3','SrCuLaO4','SrF2','SrFe12O19','SrFe2As2','SrFeO3','SrLaMnO4','SrLaNiO4','SrMnO3','SrNb2Bi2O9','SrO','SrRuO3','SrTa2Bi2O9','SrTiO3','SrZrO3','TaC','TaS2','TaS3','TaSe2','Tb3Fe5O12','TbFe2','TbMn2','TbMn2O5','TbMnO3','TbNi2Si2','TbRh2Si2','TbTiFe11','TeO2','ThO2','Ti2Ni','Ti2O3','Ti3Al','Ti3Bi4O12','Ti5Si3','TiAl','TiAl2','TiAl3','TiB2','TiC','TiCo','TiCo2Al','TiCo2Sn','TiCoSb','TiCr2','TiFe','TiFe2','TiFeO3','TiH2','TiN','TiNi','TiNi3','TiO','TiO2','TiPbO3','TiS2','TiSe2','TiSi2','TiVO3','Tl2S','Tl5Se3','Tl5Te3','TlBr','TlCl','TlGaSe2','TlI','TlInS2','TlS','TlSe','TlTe','Tm2Fe14B','TmSe','TmTe','U2C3','U2Ni2Sn','U2Pt2In','U6Fe','UAl2','UAs','UC2','UCo2Ge2','UCoAl','UFe10Si2','UFe2','UFe4Al8','UGe2','UMn2','UNi2Al3','UNiAl','UNiGa','UNiSn','UO2','UPd2Al3','UPd3','UPdSn','UPt3','UPtGe','URu2Si2','USb','UTe','V2MnO4','V2O3','V2O5','V3Ga','V3Ge','V3O5','V3Si','V4O7','V5Al8','V5O9','V6O11','V6O13','V7O13','VAl3','VFe2Al','VO2','VSe2','W2C','WBi2O6','WMnO4','WO3','WSi2','Y2Co17','Y2Fe14B','Y2Fe17','Y2O3','Y3Al5O12','Y3Fe5O12','YAl2','YAl3','YB6','YCo2','YCo3','YCo4B','YCo5','YFe2','YFe4Al8','YH3','YMn2','YMnO3','YMo2Fe10','YNi2B2C','YTiFe11','YTiO3','YV2Fe10','YVO3','Yb2O3','Yb4As3','YbAl3','YbFe4Sb12','YbMnO3','YbRh2Si2','Zn10Fe3','Zn2Zr','Zn3As2','Zn3P2','ZnCr2O4','ZnCr2Se4','ZnF2','ZnFe2O4','ZnGeP2','ZnO','ZnS','ZnSe','ZnSiP2','ZnTe','Zr2Ni','ZrAl2','ZrAl3','ZrB2','ZrC','ZrCo2','ZrCr2','ZrFe2','ZrMn2','ZrMo2','ZrN','ZrNiSn','ZrO2','ZrPbO3','ZrV2','Zr[WO4]2','[NH4]2ZnCl4'];

wmgui.most_frequent_anonymous = ['AB','AB2','ABC3','ABC','ABC2','ABCD3','AB3','AB2C4','AB2C2','ABC4','ABC2D6','ABCD4','A2B3','ABC2D4','ABCD','ABCD2','AB2C3','AB2C6','AB2C5','AB2C3D7','A3B4','A3B5','ABC2D2','A2B2C7','AB3C5','ABC2D5','ABC2D7','AB5','AB3C6','AB3C4','ABC5','ABC2D8','AB3C3','AB4','AB6','AB2C2D7','AB4C12','A2B17','AB3C4D12','ABCD5','ABCD6','A2B3C4','ABC3D7','A2B3C5','AB2C10','A2B2C5','AB2C2D6','AB2C3D8','AB2C8','ABC2D3','A2B5','AB2C3D6','AB4C8','ABC6','AB2C2D8','AB6C6','AB3C7','A4B5'];

// FIXME? this concerns MPDS S-numerics:
//if (props_fgrs) props_fgrs.extend(['c--a', 'a--b', 'b--c', 'volume', 'density', 'alat', 'blat', 'clat']);
//if (props_ref) props_ref.extend(  ['c--a', 'a--b', 'b--c', 'volume', 'density', 'alat', 'blat', 'clat']);

/**
 * Methods
 */

wmgui.get_random_term = function(sequence){
    return sequence[ Math.floor(Math.random() * sequence.length) ];
}

/**
 * Generate random sequences
 */

wmgui.get_realistic = function(facet, cur_arity){

    var term;

    if (facet == 'elements'){
        var i = 0,
            els = [],
            prob_arity = [2, 3], // 4 is improbable
            cur_arity = cur_arity || wmgui.get_random_term(prob_arity);

        while (i < cur_arity){
            var el;
            if (i < 2)
                el = wmgui.get_random_term(wmgui.probable_els);
            else
                el = wmgui.get_random_term(wmgui.most_frequent_els);
            if (els.indexOf(el) > -1) continue;
            els.push(el);
            i++;
        }
        term = els.join('-');

    } else if (facet == 'formulae'){
        term = wmgui.get_random_term(wmgui.most_frequent_formulae);

    } else if (facet == 'anonymous'){
        term = wmgui.get_random_term(wmgui.most_frequent_anonymous);

    } else if (facet == 'props'){
        term = wmgui.get_random_term(wmgui.most_frequent_props);

    } else if (facet == 'classes'){
        term = wmgui.get_random_term(wmgui.classes_families);

    } else if (facet == 'lattices'){
        term = wmgui.get_random_term(wmgui.most_frequent_lats);

    } else return wmgui.get_realistic(['elements', 'formulae', 'props', 'classes', 'lattices'][ Math.floor(Math.random() * 5) ]);

    return term;
}

/**
 * Generate random sequences
 */

wmgui.get_interesting = function(scene){

    var scenarios = [1, 2, 3, 4, 5, 6, 7, 8],
        scene = scene || wmgui.get_random_term(scenarios),
        result = {'text': '', 'terms': [], 'facets': []};

    if (scene == 1){ // classes-elements, 4% fails
        result['facets'].extend(['classes', 'elements']);
        result['terms'].extend([wmgui.get_random_term(wmgui.most_frequent_classes), wmgui.get_realistic('elements', 2)]);
        result['text'] += result['terms'][0] + ' ' + result['terms'][1];

    } else if (scene == 2){ // classes-classes, 4.5% fails
        result['facets'].extend(['classes', 'classes']);
        result['terms'].extend([wmgui.get_random_term(wmgui.classes_groups), wmgui.get_realistic('classes')]);
        result['text'] += result['terms'][0] + ' group, ' + result['terms'][1];

    } else if (scene == 3){ // formulae-lattices, 1% fails
        result['facets'].extend(['formulae', 'lattices']);
        result['terms'].extend([wmgui.get_realistic('formulae'), wmgui.get_realistic('lattices')]);
        result['text'] += result['terms'][0] + ' ' + result['terms'][1] + ' crystal';

    } else if (scene == 4){ // props-classes, always correct
        result['facets'].extend(['props', 'classes']);
        result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('classes')]);
        result['text'] += result['terms'][0] + ' for ' + result['terms'][1];
        if (!result['text'].endsWith('d') && !result['text'].endsWith('s'))
            result['text'] += 's';

    } else if (scene == 5){ // classes-lattices, 3% fails
        result['facets'].extend(['classes', 'lattices']);
        result['terms'].extend([wmgui.get_realistic('classes'), wmgui.get_realistic('lattices')]);
        result['text'] += result['terms'][0] + ', ' + result['terms'][1] + ' crystal';

    } else if (scene == 6){ // elements-lattices, 3% fails
        result['facets'].extend(['elements', 'lattices']);
        result['terms'].extend([wmgui.get_realistic('elements'), wmgui.get_realistic('lattices')]);
        result['text'] += result['terms'][0] + ', ' + result['terms'][1] + ' crystal';

    } else if (scene == 7){ // props and anonymous formulae
        result['facets'].extend(['props', 'formulae']);
        result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('anonymous')]);
        result['text'] += result['terms'][0] + ' ' + result['terms'][1];

    } else { // props-formulae, 4% fails
        result['facets'].extend(['props', 'formulae']);
        result['terms'].extend([wmgui.get_realistic('props'), wmgui.get_realistic('formulae')]);
        result['text'] += result['terms'][0] + ' of ' + result['terms'][1];
    }
    return result;
}

/**
 * Convert formula to HTML
 */

wmgui.to_formula = function(input){
    return input.replace(/\d/g, "<sub>$&</sub>");
}

/**
 * Add HTML tags to a chemical formula as a string
 */

wmgui.formula_to_tags = function(string){

    var sub = false,
        html_formula = '';

    for (var i = 0, len = string.length; i < len; i++){
        if (wmutils.is_numeric(string[i]) || string[i] == '.'){
            if (!sub){
                html_formula += '<sub>';
                sub = true;
            }
        } else {
            if (sub){
                html_formula += '</sub>';
                sub = false;
            }
        }
        html_formula += string[i];
    }
    if (sub) html_formula += '</sub>';
    return html_formula;
}

/**
 * Get center and ligand information from a string
 */

wmgui.parse_ligand = function(string, start){

    var center = string.slice(0, start).toLowerCase();

    if (string.slice(start, start + 1).toLowerCase() == 'x' && string.slice(start, start + 2).toLowerCase() != 'xe'){
        if (string.slice(start).length == 1) return [center, 'X'];

        return [center, 'X' + string.slice(start + 1)];
    }

    if (string.length == start) return [center, 'X'];

    var remainder = string.slice(start);

    if (wmutils.is_numeric(remainder.slice(0, 1)) && start == 2)
        return wmgui.parse_ligand(string, 1);

    return [center, remainder.charAt(0).toUpperCase() + remainder.slice(1)];
}

/**
 * Get center and ligand information from a string
 */

wmgui._parse_aeatoms = function(string){

    var pos = string.indexOf('-');

    if (pos !== -1){
        var center = string.slice(0, pos),
            ligand = string.slice(pos + 1);

        if (center.length > 2) return false;

        return wmgui.parse_ligand(center + ligand, center.length);
    }

    var trials = [2, 1];

    for (var start = 0; start < 2; start++){
        if (string.length >= trials[start] && wmgui.periodic_elements_xed.indexOf(string.slice(0, trials[start]).toLowerCase()) !== -1){
            return wmgui.parse_ligand(string, trials[start]);
        }
    }
    return false;
}

/**
 * Get center and ligand information from a string
 */

wmgui.parse_aeatoms = function(string){

    var parsed = wmgui._parse_aeatoms(string);

    if (!parsed) return ['?', '?'];
    return [parsed[0].charAt(0).toUpperCase() + parsed[0].slice(1), wmgui.formula_to_tags(parsed[1])];
}

/**
 * Display processing results in HTML (based on jQuery)
 */

wmgui.get_interpretation = function(search, facet_names, num_database){
    if (!search) search = {};

    var interpret_html = '',
        cur_arity = false;

    $.each(search, function(k, val){
        if (!facet_names[k] || !val) return true;

        else if (k == 'formulae') val = wmgui.to_formula(val);

        else if (k == 'doi' || k == 'sgs') val = unescape(val);

        else if (k == 'elements'){
            var els = val.split('-');
            cur_arity = els.length; // els.length < 5
            val = els.map(function(i){ return i.charAt(0).toUpperCase() + i.slice(1).toLowerCase() }).join(', ');

        } else if (k == 'classes'){
            val = val.split(',').map(function(x){ return x.trim() }).join(', ');

        } else if (k == 'authors'){
            val = val.split(',').map(function(surname){
                return surname.trim().split(' ').map(function(part){
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                }).join(' ');
            }).join(', ');

        } else if (k == 'aeatoms'){
            val = wmgui.parse_aeatoms(val);
            val = val[0] + '&nbsp;center and ' + val[1] + '&nbsp;ligands';

        } else if (k == 'aetypes'){
            val = val.split(',').map(function(x){
                var parts = x.trim().split('-vertex')[0].split(' '),
                    va = parseInt(parts[parts.length - 1]);
                return x.replace(/\d{1,2}\-vertex/, "CN&nbsp;=&nbsp;" + va);
            }).join(', ');

        } else if (k == 'numeric'){
            var out = '';
            val.forEach(function(member){
                var repr = member[0],
                    units = '';

                if (num_database[repr]){
                    var decimals = num_database[repr][4] ? Math.abs(Math.log10(num_database[repr][4])) : Math.max(num_database[repr][2].count_decimals(), num_database[repr][3].count_decimals());
                    member[2] = Number(member[2]).toFixed(decimals);

                    if (num_database[repr][1]) units = '&nbsp;' + num_database[repr][1]; // units

                    if (num_database[repr][5]) repr = num_database[repr][5]; // origname
                }
                out += repr + ' ' + member[1] + ' ' + member[2] + units + '<br />';
            });
            val = out;
        }

        interpret_html += '<li class="fct_' + k + '"><span>' + facet_names[k] + '</span><br />' + val + '</li>';
    });

    if (!search.formulae && !$.isEmptyObject(search)){

        var add_arity_helper = true,
            arity_helper_html = '';

        $.each(wmutils.arity_keys.slice(1), function(num, value){

            if (search.classes && search.classes.indexOf(value) !== -1){
                add_arity_helper = false;
                return false;
            }

            if (cur_arity && (cur_arity - 1) > num)
                return true;

            if (num > 3)
                return true;

            else if (num == 5)
                return false;

            var addr;
            if (window.location.hash.indexOf('inquiry') > -1){
                if (window.location.hash.indexOf('classes=') > -1)
                    addr = window.location.hash.replace('classes=', 'classes=' + value + ',');
                else
                    addr = window.location.hash.replace('inquiry/', 'inquiry/classes=' + value + '&');

            } else addr = window.location.hash + ' ' + value;

            arity_helper_html += '<li class="fct_classes" rel="' + addr + '" style="letter-spacing:0.5px;">Show only ' + value.substr(0, value.length - 1) + 'ies</li>';
        });
        if (add_arity_helper) interpret_html += arity_helper_html;
    }

    return interpret_html;
}
