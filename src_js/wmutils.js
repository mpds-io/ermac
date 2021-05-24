/**
 * MPDS platform shared utils
 * Author: Evgeny Blokhin /
 * Tilde Materials Informatics
 * eb@tilde.pro
 * Version: 0.6.7
 */
"use strict";

function z(str){
    var html = $(str.bold());
    html.find('script').remove();
    return html.html();
}

function cancel_event(evt){
    evt = evt || window.event;
    if (evt.cancelBubble) evt.cancelBubble = true;
    else {
        if (evt.stopPropagation) evt.stopPropagation();
        if (evt.preventDefault) evt.preventDefault();
    }
}

function debounce(func, wait, immediate){
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

function is_inview(element){
    var pageTop = $(window).scrollTop(),
        pageBottom = pageTop + $(window).height(),
        elementTop = $(element).offset().top,
        elementBottom = elementTop + $(element).height();
    return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
}

Number.prototype.count_decimals = function(){
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0;
}

function show_preloader(){ $('#preloader').show(); }

function hide_preloader(){ $('#preloader').hide(); }

function detect_IE(){
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0){
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0){
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0){
        return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    return false;
}

var ie_passing_check = (function(){
    var version = detect_IE();
    if (!version) return true;
    if (version < 11) return false;
    return true;
}());

if (!ie_passing_check){
    alert("Please, upgrade your browser");
    throw new Error("Unsupported user agent");
}

function loadCSS(href, before, media, attributes){
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