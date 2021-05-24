
"use strict";

var wmgui = window.wmgui || {};

function create_floating_slider(prop_name, prop_id, units, p_min, p_max, p_step, p_start, p_end){ // FIXME compatibilize with *wmgui.numerics*

    if ($('#slider_' + prop_id).length){
        console.log('Attempted to create an existing slider id' + prop_id);
        return;
    }

    //console.log(prop_name, prop_id, units, p_min, p_max, p_step, p_start, p_end);

    var html = '<li>';
    html += '<div class="slider_title">' + (wmgui.numerics[prop_name][5] || prop_name) + (units ? (',&nbsp;<em>' + units + '</em>') : '') + '</div>';
    html += '<div class="cross slider_close"></div>';
    html += '<div class="slider">'; // #numericbox > ul > li > div.slider
    html += '<img src="' + wmgui.pdist_endpoint + '?pdist=' + encodeURIComponent(prop_name) + '&q=' + encodeURIComponent(JSON.stringify(wmgui.search)) + '" width="530" height="25" />';
    html += '<div id="slider_' + prop_id + '" class="slider_numerics" rel="' + prop_name + '"></div></div>';
    html += '</li>';

    $('#numericbox').show();
    $('#numericbox > ul').prepend(html);

    var decimals = p_step ? Math.abs(Math.log10(p_step)) : Math.max(p_min.count_decimals(), p_max.count_decimals());
    //console.log('decimals = ', decimals);

    noUiSlider.create(document.getElementById('slider_' + prop_id), {
        start: [p_start || p_min, p_end || p_max],
        step: p_step || ((p_max - p_min) / 250),
        tooltips: [wNumb({decimals: decimals}), wNumb({decimals: decimals})],
        connect: true,
        behaviour: 'drag',
        range: {'min': p_min, 'max': p_max},
        format: {
            to: function (value){ return value },
            from: function(value){ return Number(value) }
        }
    });
}

function destroy_numericbox(){
    if ($('#numericbox').is(':visible')){
        $('#numericbox > ul > li').each(function(){
            var that = $(this);
            that.find('div.slider_numerics')[0].noUiSlider.destroy();
            that.remove();
        });
        $('#numericbox').hide();
    }
}

function get_sliders_ranges(url_num_obj, num_database){ // given by (1.) WMCORE.parse_string or (2.) from inventing serialization for numeric nested arrays or (3.) by user
    var props = {},
        output = [];

    for (var i = 0; i < url_num_obj.length; i++){
        if (url_num_obj[i][1] !== '>' && url_num_obj[i][1] !== '<')
            continue;

        var prop = (url_num_obj[i][1] == '>' ? 'start' : 'end');

        if (!props[ url_num_obj[i][0] ]) props[url_num_obj[i][0]] = {};

        props[url_num_obj[i][0]][prop] = parseFloat(url_num_obj[i][2]); // TODO? consequent series like > 100, > 200, etc.
    }
    //console.log(props);
    for (var key in props){
        if (!num_database[key]){ console.log("Unsupported key: " + key); continue; }

        if (!props[key]['start']) props[key]['start'] = num_database[key][2]; // min
        else if (!props[key]['end']) props[key]['end'] = num_database[key][3]; // max

        if (props[key]['end'] < props[key]['start']) throw new Error("The end of range is lower than the start of range!");
        output.push([
            key,
            num_database[key][0],
            num_database[key][1],
            num_database[key][2],
            num_database[key][3],
            num_database[key][4],
            props[key]['start'],
            props[key]['end']
        ]);
    }
    output.sort(function(a, b){
        return a[1] > b[1] ? 1 : -1; // prop_id
    });
    return output;
}

function serialize_numeric(prop, sign, value){ // inventing serialization for numeric nested arrays
    return prop + ',' + sign + ',' + value + ';';
}