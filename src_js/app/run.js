/**
 * Ermac entry point.
 */

import { assign_edition } from './search.js';
import { register_html } from './markup.js';
import { satisfy_requirements } from './startup.js';
import { register_events } from './events.js';

// now, run everything

assign_edition();

register_html();

satisfy_requirements();

register_events();

// use MPDS API, please
console.log(
  '%cWeb-scraping or automated usage apart of the public MPDS API is in violation of our ToS (https://mpds.io/formal/terms) and results in banned account.',
  'color:red;font-size:16px;',
);
