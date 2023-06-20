"use strict";

var ie_passing_check = (function(){
    var version = (function(){
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
    })();

    if (!version) return true;

    if (version < 12) return false;

    return true;
}());

if (!ie_passing_check){
    alert("Please, upgrade your browser");
    throw new Error("Unsupported user agent");
}
