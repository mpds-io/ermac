/**
 * Ermac numeric range sliders, based on the vendored vanilla noUiSlider.
 */

/* global noUiSlider, wNumb */

import wmgui from '../core/settings.js';
import { $, $$, show, hide, isVisible } from '../core/dom.js';
import { param } from '../core/ajax.js';

export function create_floating_slider(
  prop_name,
  prop_id,
  units,
  p_min,
  p_max,
  p_step,
  p_start,
  p_end,
) {
  // FIXME compatibilize with *wmgui.numerics*

  if (document.getElementById('slider_' + prop_id)) {
    console.log('Attempted to create an existing slider id' + prop_id);
    return;
  }

  var html = '<li>';
  html += '<div class="slider_title">';
  html +=
    (wmgui.numerics[prop_name][5] || prop_name) +
    (units ? ',&nbsp;<em>' + units + '</em>' : '');
  html += '</div>';
  html += '<div class="cross slider_close"></div>';
  html += '<div class="slider">'; // #numericbox > ul > li > div.slider
  html +=
    '<img src="' +
    wmgui.pdist_endpoint +
    '?pdist=' +
    encodeURIComponent(prop_name);
  html +=
    '&q=' +
    encodeURIComponent(JSON.stringify(wmgui.search)) +
    '" width="530" height="25" />';
  html +=
    '<div id="slider_' +
    prop_id +
    '" class="slider_numerics" rel="' +
    prop_name +
    '"></div></div>';
  html += '</li>';

  show($('#numericbox'));
  $('#numericbox > ul').insertAdjacentHTML('afterbegin', html);

  var decimals = p_step
    ? Math.abs(Math.log10(p_step))
    : Math.max(p_min.count_decimals(), p_max.count_decimals());
  //console.log('decimals = ', decimals);

  noUiSlider.create(document.getElementById('slider_' + prop_id), {
    start: [p_start || p_min, p_end || p_max],
    step: p_step || (p_max - p_min) / 250,
    tooltips: [wNumb({ decimals: decimals }), wNumb({ decimals: decimals })],
    connect: true,
    behaviour: 'drag',
    range: { min: p_min, max: p_max },
    format: {
      to: function (value) {
        return value;
      },
      from: function (value) {
        return Number(value);
      },
    },
  });
  // NB noUiSlider 14 handles are focusable and keyboard-operable (arrows),
  // but unnamed; version 14 has no handleAttributes option
  document
    .querySelectorAll('#slider_' + prop_id + ' .noUi-handle')
    .forEach(function (handle, index) {
      handle.setAttribute('aria-label', prop_name + (index ? ', upper bound' : ', lower bound'));
    });
}

export function destroy_numericbox() {
  const numericbox = $('#numericbox');
  if (isVisible(numericbox)) {
    $$('#numericbox > ul > li').forEach(function (li) {
      const slider = li.querySelector('div.slider_numerics');
      if (slider && slider.noUiSlider) slider.noUiSlider.destroy();
      li.remove();
    });
    hide(numericbox);
  }
}

export function get_sliders_ranges(url_num_obj, num_database) {
  // given by:
  // (1.) wmutils.guess, or
  // (2.) from re-inventing serialization for numeric nested arrays, or
  // (3.) by the user
  var props = {},
    output = [];

  for (var i = 0; i < url_num_obj.length; i++) {
    if (url_num_obj[i][1] !== '>' && url_num_obj[i][1] !== '<') continue;

    var prop = url_num_obj[i][1] == '>' ? 'start' : 'end';

    if (!props[url_num_obj[i][0]]) props[url_num_obj[i][0]] = {};

    props[url_num_obj[i][0]][prop] = parseFloat(url_num_obj[i][2]); // TODO? consequent series like > 100, > 200, etc.
  }
  //console.log(props);
  for (var key in props) {
    if (!num_database[key]) {
      console.log('Unsupported key: ' + key);
      continue;
    }

    if (!props[key]['start'])
      props[key]['start'] = num_database[key][2]; // min
    else if (!props[key]['end']) props[key]['end'] = num_database[key][3]; // max

    if (props[key]['end'] < props[key]['start'])
      throw new Error('The end of range is lower than the start of range!');
    output.push([
      key,
      num_database[key][0],
      num_database[key][1],
      num_database[key][2],
      num_database[key][3],
      num_database[key][4],
      props[key]['start'],
      props[key]['end'],
    ]);
  }
  output.sort(function (a, b) {
    return a[1] > b[1] ? 1 : -1; // prop_id
  });
  return output;
}

export function serialize_numeric(prop, sign, value) {
  // re-inventing serialization for numeric nested arrays
  return prop + ',' + sign + ',' + value + ';';
}

/**
 * #inquiry hash serialization: param(), except that a numeric search kept as
 * the nested [prop, sign, value] arrays (as given by wmutils.guess() or kept
 * in wmgui.search) is written in the router's own "prop,sign,value;..." form,
 * like the sliders path does via serialize_numeric().
 * NB intentional fix: the old GUI passed the arrays to $.param() as is, which
 * produced numeric[0][]=... keys the router cannot read ("Unrecognized
 * input"; parity scenario search_numeric_text, approved via xfail).
 */
export function inquiry_param(query) {
  if (!query || !Array.isArray(query.numeric)) return param(query);
  var copy = {};
  for (var key in query) copy[key] = query[key]; // NB keeps the key order
  copy.numeric = query.numeric
    .map(function (item) {
      return serialize_numeric.apply(this, item); // unpack
    })
    .join('');
  if (copy.numeric.slice(-1) == ';') copy.numeric = copy.numeric.slice(0, -1);
  return param(copy);
}
