/**
 * Ermac entry point.
 */

import { assign_edition } from './search.js';
import { register_html } from './markup.js';
import { satisfy_requirements } from './startup.js';
import { register_events } from './events.js';
import wmgui from '../core/settings.js';
import { install_a11y, open_dialog, release_dialog } from '../core/a11y.js';

// now, run everything

assign_edition();

register_html();

satisfy_requirements();

register_events();

// keyboard and assistive-technology support, see src_js/core/a11y.js
install_a11y();
// NB public API (window.wmgui): the host page's own dialogs, e.g. #productbox on mpds.io
wmgui.open_dialog = open_dialog;
wmgui.release_dialog = release_dialog;

// use MPDS API, please
console.log(
  '%cWeb-scraping or automated usage apart of the public MPDS API is in violation of our ToS (https://mpds.io/formal/terms) and results in banned account.',
  'color:red;font-size:16px;',
);
