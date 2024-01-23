"use strict";

var wmgui = window.wmgui || {};

wmgui.view_mode = 1; // 1 = intro screen, 2 = results screen
wmgui.search_type = 0; // 0 = entries, 1 = phases, or 2 = articles
wmgui.thumbed_display = false;
wmgui.ctx_strict_phases = ''; // empty string or anything (bool)
//wmgui.ctx_subphases = ''; // empty string or anything (bool)
wmgui.ntab_tolerance = 100;
wmgui.chosen_table_browser = false;
wmgui.fuzzyout = false;
wmgui.passive_sim_col = true;
wmgui.active_ajax = null;
wmgui.quick_ajax = null;
wmgui.facets = ['formulae', 'props', 'elements', 'classes', 'lattices', 'sgs', 'protos', 'authors', 'years', 'codens', 'doi', 'aeatoms', 'aetypes', 'geos', 'orgs'];
wmgui.inquiries = [                                                     'sgs', 'protos', 'authors', 'years', 'codens', 'doi', 'aeatoms', 'aetypes', 'geos', 'orgs'];
wmgui.other_facets = wmgui.inquiries.filter(function(item){ return item !== 'aetypes' }); // NOT main search field or NLP-handled
wmgui.simple_facets = ['formulae', 'props', 'elements', 'lattices', 'sgs', 'protos', 'years', 'codens', 'doi', 'aeatoms', 'geos', 'orgs'];
wmgui.multi_facets = ['classes', 'authors', 'aetypes'];
wmgui.facet_names = {
    props: 'Physical properties',
    elements: 'Chemical elements',
    classes: 'Materials classes',
    lattices: 'Crystal systems',
    formulae: 'Chemical formulae',
    protos: 'Prototypes',
    sgs: 'Space groups',
    numeric: 'Numerical search', // NB not a real facet!
    authors: 'Authors',
    years: 'Years',
    codens: 'Journal codes',
    doi: 'DOI',
    aeatoms: 'Polyhedron atoms',
    aetypes: 'Polyhedral types',
    geos: 'Geography',
    orgs: 'Organization'
};
wmgui.search = {};
wmgui.multiselects = {}; // selectize instances, for *wmgui.multi_facets* and *main*
wmgui.selectize_emit = true;
wmgui.unfinished_page = false;
wmgui.quick_page_size = 150;
wmgui.fetch_page_size = 850;
wmgui.notify_counter = null;
wmgui.cliff_counter = null;
wmgui.sid = null;
wmgui.oauths = null;
wmgui.prod = true; // (window.location.host.indexOf('localhost') == -1);

wmgui.cliffhangers = [
    "binary compounds with negative thermal expansion",
    "band gap of hexagonal ZnO",
    "ternary oxides of indium",
    "microhardness < 0.05",
    "temperature for metal-nonmetal transition < 10",
    "thermoelectric figure of merit > 0.5",
    "electronic properties for semiconductor carbides",
    "c/a > 3, a/b > 3, density < 4",
    "noble gases superconductivity",
    "W-Mo ternary phase diagram",
    "density < 3 and temperature for congruent melting > 2000",
    "tetragonal SrTiO&#x2083; phonons",
    "radioactive elements conductivity",
    "O&#x2083;Al&#x2082; elastic properties",
    //"refractive index > 5", // FIXME
    "sidorenkite crystal cell",
    "birefringence < 0.005 and static permittivity > 7.5",
    "phase diagrams from ab initio literature",
    "adiabatic bulk modulus > 250 and isothermal bulk modulus > 250",
    "magnetic properties of binary compounds",
    "radioactive binary compounds",
    "binary frank-kasper type"
];
wmgui.welcome_msgs = [
    "The distinct phases is the central concept at the MPDS. Thanks to that, the crystal structures are linked to the phase diagrams and physical properties. Any distinct phase is uniquely determined by the chemical formula, space group, and Pearson symbol <i>e.g.</i> <a href='/#phase/CuAl2/140/tI12'>CuAl2 140 tI12</a>.",
    "Our data back up such products as Springer Materials&trade;, ICDD PDF-4&trade;, ASM Alloy Phase Diagrams&trade;, Pearson's Crystal Data, MedeA Materials Design&trade;, and AtomWork Advanced.",
    "Each peer-reviewed crystal structure, phase diagram, or physical property at the MPDS originates from a particular publication.",
    "There are two search modes, simple and advanced. The simple presents one \"smart\" input field, the advanced offers many various search fields.",
    "The MPDS includes the data extracted from the rare USSR and Japanese journals from 60-es, 70-es, and 80-es. These journals were never online.",
    "A unique feature of the MPDS is the support of the <a href='/#polyhedra'>polyhedral type searches</a>, taking into account the atomic environments."
];
// NB used also in Ermac detection
wmgui.api_msg = 'Try <i>e.g.</i> the following command in a terminal. As finished, do not forget to revoke your API key. See the <a href="https://developer.mpds.io">manual</a> and the <a href="/#formal/api">license</a> for open data listing.<pre style="overflow-x:scroll;margin:1em 0;">curl -H Key:YOUR_API_KEY \'https://api.mpds.io/v0/download/facet?q=&bsol;{"elements":"Ag-K"&bsol;}\'</pre><div class="wmbutton" style="background:#999;border-color:#999;width:150px;margin:0 auto;font-size:0.9em;">Copy to clipboard</div>';

wmgui.bid_history = [];
wmgui.mydata_history = [];
wmgui.journal_converter = {j2c: function(){}, c2j: function(){}};
wmgui.hy_complex = ['crystalline structure', 'phase diagram', 'cell parameters - temperature diagram', 'cell parameters - pressure diagram', 'electron energy band structure', 'electron density of states', 'vibrational spectra']; // NB check exact match in "props" p2i FIXME 'electron density of states - ab initio calculations'

wmgui.visavis_curtype = 'pie'; // pie, graph, discovery, matrix, cube, qproj, lit, TODO heuristic plot type detection
wmgui.visavis_ready = false;
wmgui.visavis_working = false;
wmgui.visavis_terminating = false;
wmgui.visavis_starting = false;

wmgui.numerics = {
    // first 8 are *pseudo_numerics*, client_prop_id > 5000
    'volume': [5001, '&#8491;<sup>3</sup>', 3, 10000, 1],
    'density':[5002, 'Mg/m<sup>3</sup>', 0.1, 30, 0.1],
    'a--b':   [5003, false, 0.1, 10, false, '<i>a/b</i>'],
    'b--c':   [5004, false, 0.1, 10, false, '<i>b/c</i>'],
    'c--a':   [5005, false, 0.1, 10, false, '<i>c/a</i>'],
    'alat':   [5006, '&#8491;', 1.5, 20, 0.1, '<i>a<sub>lat</sub></i>'],
    'blat':   [5007, '&#8491;', 1.5, 20, 0.1, '<i>b<sub>lat</sub></i>'],
    'clat':   [5008, '&#8491;', 1.5, 20, 0.1, '<i>c<sub>lat</sub></i>']
}; // client data *numerics*: prop_name: [client_prop_id, units, min, max, ?step, ?origname]

// NB all URLs follow below
wmgui.gui_host = window.location.protocol + '//' + window.location.host;
wmgui.api_host =          wmgui.prod ? 'https://api.mpds.io/v0' : 'http://localhost:7070';
wmgui.static_host =       'https://mpds.io';

// below are the main MPDS API endpoints
wmgui.login_endpoint =    wmgui.api_host + '/users/login';
wmgui.logout_endpoint =   wmgui.api_host + '/users/logout';
wmgui.factor_endpoint =   wmgui.api_host + '/users/factor';
wmgui.factor_v_endpoint = wmgui.api_host + '/users/factor_v';
wmgui.restore_endpoint =  wmgui.api_host + '/users/lost_password';
wmgui.password_endpoint = wmgui.api_host + '/users/new_password';
wmgui.access_endpoint =   wmgui.api_host + '/users/access';
wmgui.ip_endpoint =       wmgui.api_host + '/users/ip';
wmgui.ratify_endpoint =   wmgui.api_host + '/users/ratify';
wmgui.api_key_endpoint =  wmgui.api_host + '/users/api_key';
wmgui.perms_endpoint =    wmgui.api_host + '/users/perms';
wmgui.ip_perms_endpoint = wmgui.api_host + '/users/ip_perms';
wmgui.funnel_endpoint =   wmgui.api_host + '/users/funnel';
//wmgui.fd_endpoint =       wmgui.api_host + '/users/feedback';
wmgui.search_endpoint =   wmgui.api_host + '/search/facet';
wmgui.rfn_endpoint =      wmgui.api_host + '/search/refinement';
wmgui.sim_endpoint =      wmgui.api_host + '/search/interlinkage';
wmgui.phase_endpoint =    wmgui.api_host + '/search/phase';
wmgui.phph_endpoint =     wmgui.api_host + '/search/phase_phid';
wmgui.auto_endpoint =     wmgui.api_host + '/search/selectize';
wmgui.refs_endpoint =     wmgui.api_host + '/download/bib';
wmgui.vis_endpoint =      wmgui.api_host + '/visavis';
wmgui.pdist_endpoint =    wmgui.api_host + '/visavis/pdistribs';
wmgui.mydata_endpoint =   wmgui.api_host + '/extension/mydata';

wmgui.dd_addr_tpl =       wmgui.api_host + '/download';
wmgui.mydata_addr =       wmgui.prod ? 'https://absolidix.com' : 'http://localhost:5000';

// below are resources used in the *iframe*
wmgui.v_player_addr_tpl = '/crystvis/player.html';
wmgui.v_player_addr =     wmgui.v_player_addr_tpl + '#' +              wmgui.api_host + '/download/s?fmt=cif&q=';
wmgui.v_pd_addr =         wmgui.static_host + '/pd_stub.html#' +       wmgui.api_host + '/download/c?fmt=png&q=';
wmgui.v_pd_addr_anon =    wmgui.static_host + '/visavis/?290623#' +    wmgui.api_host + '/download/c?fmt=json&q=';
wmgui.v_sd_addr =         wmgui.static_host + '/visavis/?290623#' +    wmgui.api_host + '/download/p?fmt=json&q=';
wmgui.v_xrpd_addr =       wmgui.static_host + '/visavis/?290623#' +    wmgui.api_host + '/download/s?fmt=xrpd&q=';
wmgui.v_vis_addr =        wmgui.static_host + '/visavis/?nobanner&290623';
wmgui.v_ab_vis_addr =     wmgui.static_host + '/labs/view-phonons/#' + wmgui.api_host + '/download/p?fmt=json&q=';
wmgui.v_pd_3d_addr =      wmgui.static_host + '/labs/pd3d/?';

// below are remote files commonly used
wmgui.client_data_addr =  wmgui.static_host + '/wmdata.json?220923';
wmgui.aetmap_addr =       wmgui.static_host + '/aets.jpg';

wmgui.edition = null; // NB the edition ID (e.g. 0, 1) is determined by a current domain, see *wmgui.editions*

wmgui.editions = {
    0: {
        'name': 'Materials Platform for Data Science',
        'prod_url': 'https://mpds.io',
        'dev_url': 'http://localhost:8070',
        'css': wmgui.static_host + '/editions/wm/style.css?220923',
        'actions': function(){
            $('#logo_l').text('MPDS');
            $('.only_asm').hide();
            $('.only_mpds').css('display', 'inline-block');
        }
    },
    1: {
        'name': 'ASM International Materials Platform',
        'prod_url': 'https://asm.mpds.io',
        'dev_url': 'http://localhost:8075',
        'css': wmgui.static_host + '/editions/asm/style.css?220923',
        'actions': function(){
            $('.only_mpds').hide();
            $('.only_asm').css('display', 'inline-block');
            // custom favicon
            var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = wmgui.static_host + '/editions/asm/asm.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    },
    6: {
        'name': 'ASM International Materials Platform',
        'prod_url': 'https://mpds.asminternational.org',
        'dev_url': 'http://localhost:8075',
        'css': wmgui.static_host + '/editions/asm/style.css?220923',
        'actions': function(){
            $('.only_mpds').hide();
            $('.only_asm').css('display', 'inline-block');
            // custom favicon
            var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = wmgui.static_host + '/editions/asm/asm.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    },
    10: {
        'name': 'Ermac on MPDS',
        'prod_url': 'https://ermac.mpds.io',
        'dev_url': 'http://localhost:5555',
        'actions': function(){
            $('.only_mpds').hide();
        }
    },
    11: {
        'name': 'Ermac on Tilde',
        'prod_url': 'https://ermac.tilde.pro',
        'dev_url': 'http://localhost:5556',
        'actions': function(){
            $('.only_mpds').hide();
        }
    },
    15: {
        'name': 'Ermac on Ab Solidix',
        'prod_url': 'https://ermac.absolidix.com',
        'dev_url': 'http://localhost:5560',
        'actions': function(){
            $('.only_mpds').hide();
        }
    },
    16: {
        'name': 'Ermac on MatCloud+',
        'prod_url': 'https://ermac.matcloudplus.com',
        'dev_url': 'http://localhost:5561',
        'actions': function(){
            $('.only_mpds').hide();
        }
    }
};
// NB all URLs are above

wmgui.elemental_names = {
    "num": "atomic number",
    "nump": "periodic number",
    "size": "atomic size",
    "rea": "atomic reactivity",
    "rpp": "pseudopotential radii",
    "rion": "ionic radii",
    "rcov": "covalent radii",
    "rmet": "metallic radii",
    "tmelt": "melting temperature",
    "eneg": "electronegativity"
};

wmgui.collateral_links = [ // [link_href, link_rel_attr, link_value, _blank]
    ['#', 'my', 'search my publications'],
    ['#', 'adv', 'start advanced search'],
    ['#polyhedra', false, 'search polyhedra'],
    ['#hierarchy', false, 'search physical properties'],
    [wmgui.static_host + '/labs/mpds-ml-labs/design.html', false, 'design new material', true],
    [wmgui.static_host + '/labs/mpds-ml-labs/props.html', false, 'predict properties for crystal', true],
    ['#', 'idea', 'get inspiration'],
    ['#', 'sod', 'show structure of the day'],
    ['oauth/asm.html', false, 'connect ASM profile', true],
    ['oauth/github.html', false, 'connect GitHub profile', true],
    ['oauth/orcid.html', false, 'connect ORCID profile', true],
    ['oauth/linkedin.html', false, 'connect LinkedIn profile', true]
];

wmgui.aets = {
'single atom 1-vertex': [0, 83],
'4-capped trigonal prism 10-vertex': [85, 102],
'bicapped square prism 10-vertex': [189, 123],
'bicapped square antiprism 10-vertex': [314, 125],
'triangle-pentagon faced polyhedron 10-vertex': [441, 125],
'distorted equatorial 4-capped trigonal prism 10-vertex': [568, 113],
'truncated hexagonal bipyramid 10-vertex': [683, 111],
'polar bicapped square prism 10-vertex': [796, 125],
'pentagonal prism 10-vertex': [923, 121],
'octagonal bipyramid 10-vertex': [1046, 122],
'5-capped trigonal prism 11-vertex': [1170, 119],
'pseudo Frank-Kasper 11-vertex': [1291, 125],
'monotruncated icosahedron 11-vertex': [1418, 102],
'tricapped cube same plane 11-vertex': [1522, 87],
'tricapped cube different plane 11-vertex': [1611, 123],
'icosahedron 12-vertex': [1736, 125],
'cuboctahedron 12-vertex': [1863, 117],
'bicapped pentagonal prism 12-vertex': [1982, 125],
'anticuboctahedron 12-vertex': [2109, 109],
'hexagonal prism 12-vertex': [2220, 90],
'triangle-hexagon faced polyhedron 12-vertex': [2312, 112],
'double-bicapped cube 12-vertex': [2426, 114],
'pseudo Frank-Kasper 13-vertex': [2542, 125],
'tricapped pentagonal prism 13-vertex': [2669, 114],
'monocapped cuboctahedron-a 13-vertex': [2785, 111],
'monocapped cuboctahedron-b 13-vertex': [2898, 120],
'14-vertex Frank-Kasper': [3020, 116],
'rhombic dodecahedron 14-vertex': [3138, 121],
'distorted rhombic dodecahedron 14-vertex': [3261, 123],
'bicapped hexagonal prism 14-vertex': [3386, 122],
'6-capped hexagonal bipyramid 14-vertex': [3510, 125],
'double-bicapped hexagonal prism 14-vertex': [3637, 111],
'15-vertex Frank-Kasper': [3750, 125],
'equatorial 5-capped pentagonal-prism 15-vertex': [3877, 97],
'polar equatorial tricapped pentagonal-prism 15-vertex': [3976, 125],
'monotruncated 16-vertex Frank-Kasper': [4103, 107],
'16-vertex Frank-Kasper': [4212, 125],
'defective 8-equatorial capped pentagonal prism 16-vertex': [4339, 92],
'octagonal prism 16-vertex': [4433, 119],
'7-capped pentagonal prism 17-vertex': [4554, 125],
'8-equatorial capped pentagonal prism 18-vertex': [4681, 125],
'pseudo Frank-Kasper 18-vertex': [4808, 125],
'6-capped hexagonal prism 18-vertex': [4935, 108],
'double-bicapped heptagonal prism 18-vertex': [5045, 110],
'distorted pseudo Frank-Kasper 19-vertex': [5157, 125],
'pseudo Frank-Kasper 19-vertex': [5284, 122],
'non-collinear atoms 2-vertex': [5408, 41],
'collinear atoms 2-vertex': [5451, 111],
'pseudo Frank-Kasper 20-vertex': [5564, 125],
'20-pentagonal faced polyhedron 20-vertex': [5691, 114],
'pseudo Frank-Kasper 21-vertex': [5807, 125],
'polar 8-equatorial capped hexagonal prism 22-vertex': [5934, 125],
'pseudo Frank-Kasper 23-vertex': [6061, 118],
'6-square 8-hexagonal faced polyhedron 24-vertex': [6181, 118],
'pseudo Frank-Kasper 24-vertex': [6301, 125],
'truncated cube dice 24-vertex': [6428, 118],
'triangle-square-hexagon faced polyhedron 24-vertex': [6548, 97],
'triangle-square faced polyhedron 24-vertex': [6647, 125],
'pseudo Frank-Kasper 26-vertex': [6774, 125],
'pseudo Frank-Kasper 28-vertex': [6901, 123],
'non-coplanar triangle 3-vertex': [7026, 75],
'coplanar triangle 3-vertex': [7103, 64],
'32-vertex': [7169, 122],
'tetrahedron central atom outside 4-vertex': [7293, 99],
'coplanar square 4-vertex': [7394, 68],
'non-coplanar square 4-vertex': [7464, 69],
'tetrahedron 4-vertex': [7535, 120],
'square pyramid central atom outside of base plane 5-vertex': [7657, 81],
'coplanar pentagon 5-vertex': [7740, 67],
'square pyramid 5-vertex': [7809, 125],
'trigonal bipyramid 5-vertex': [7936, 107],
'coplanar hexagon 6-vertex': [8045, 49],
'non-coplanar hexagon 6-vertex': [8096, 80],
'octahedron 6-vertex': [8178, 125],
'trigonal prism 6-vertex': [8305, 120],
'pentagonal pyramid 6-vertex': [8427, 116],
'distorted prism 6-vertex': [8545, 110],
'monocapped octahedron 7-vertex': [8657, 125],
'top-monocapped trigonal prism 7-vertex': [8784, 125],
'bicapped hexagon 7-vertex': [8911, 108],
'hexagonal pyramid 7-vertex': [9021, 96],
'monocapped trigonal prism 7-vertex': [9119, 125],
'pentagonal bipyramid 7-vertex': [9246, 122],
'square prism cube 8-vertex': [9370, 115],
'square antiprism 8-vertex': [9487, 103],
'hexagonal bipyramid 8-vertex': [9592, 125],
'distorted square anti-prism-a 8-vertex': [9719, 123],
'double anti-trigonal prism 8-vertex': [9844, 99],
'side-bicapped trigonal prism 8-vertex': [9945, 107],
'distorted square anti-prism-b 8-vertex': [10054, 125],
'tricapped trigonal prism 9-vertex': [10181, 119],
'monocapped square prism 9-vertex': [10302, 125],
'monocapped double anti-trigonal prism 9-vertex': [10429, 113],
'truncated hexagonal pyramid 9-vertex': [10544, 75],
'bicapped hexagonal pyramid 9-vertex': [10621, 116]
};

//wmgui.contact_html = '<textarea id="fdwidget_msg" placeholder="Please tell us why, anonymously"></textarea><select id="fdwidget_msgtype"><option value="No reason" selected>Please select reason...</option><option value="Data missing">Data missing</option><option value="Error in data">Error in data</option><option value="Other">Other</option></select><div id="fdwidget_trigger" class="wmbutton">Send</div>';

wmgui.s_examples = [251737, 261485, 301194, 458778, 525194, 533193, 1005414, 1030546, 1122968, 1215422, 1232477, 1321212, 1406036, 1613664, 1638591, 1640622, 1707997, 1711681, 1722027, 1819191, 1928624, 1933647, 1940797];
wmgui.mockyear = '2022'; // used for the in-house generated data, TODO switch to 2024

wmgui.store_history_key = 'wm_search_log_v5';
wmgui.store_user_key = 'wm';
wmgui.store_bids_key = 'bid_history'; // TODO rename to wm_bid_history
wmgui.store_mydata_key = 'absolidix_v1';
wmgui.store_oauth_email_key = 'wm_u_email';
wmgui.store_comm_exec_key = 'wm_reload_v1';
wmgui.store_redir_key = 'wm_redir_v1';

wmgui.tooltips = {
    //'advsearch': {el: 'advsearch_init_trigger', oleft: -90, otop: 60, view_mode: 1, text: 'Use the &#9776; button for the detailed search by 15+ categories.<br /><span rel="userbox">Next</span>'},
    //'hierarchy': {el: 'advsearch_init_trigger', oleft: -50, otop: 60, view_mode: 1, text: 'Use the <i>&mu;</i> button to select physical properties from the curated hierarchy.<br /><span rel="userbox">Next</span>'},
    'userbox': {el: 'userbox', oleft: -105, otop: 60, view_mode: 1, text: 'Enjoy full data access<br />with your account here.<br /><span rel="close_tooltip">OK</span>'},
    'interpretation': {el: 'right_col', oleft: -70, otop: 99, view_mode: 2, text: 'The entries are grouped in the phases.<br /><span rel="databrowser">Next</span>'},
    'databrowser': {el: 'databrowser', oleft: 0, otop: 200, view_mode: 2, text: 'Click the particular entry to get more info. Opened lock means open access.<br /><span rel="close_tooltip">OK</span>'},
    //'plots': {el: 'databrowser', oleft: 0, otop: 500, view_mode: 2, text: 'Use the graph chart buttons in the footer (at the very bottom of the page).<br /><span rel="close_tooltip">OK</span>'},
    'ss_axes': {el: 'ctxpanel_plots', oleft: 60, otop: 114, view_mode: 2, text: 'Click gear icon to sort axes differently.<br /><span rel="visavis" class="forced">Next</span>'},
    'visavis': {el: 'right_col', oleft: -150, otop: 500, view_mode: 2, text: 'Fine-tune visualizations with the commands here.<br /><span rel="close_tooltip">OK</span>'}
};
wmgui.tooltip_counter = 0;
wmgui.tooltip_landing = 'userbox';

wmgui.entries_messages = {'C900500': 'This system is stable (dashed metastable)', 'C904090': 'This system is metastable (dashed stable)', 'C904091': 'This system is metastable', 'C904092': 'This system is metastable (dashed stable)', 'C904124': 'This system is metastable (dashed stable)', 'C904221': 'This system is stable; allotropic transition of Fe is not shown', 'C904222': 'This system is stable', 'C904223': 'This system is stable', 'C904313': 'This system is stable', 'C904322': 'This system is stable', 'C904329': 'This system is stable', 'C904330': 'This system is metastable (dashed stable)', 'C904331': 'This system is metastable (dashed stable)', 'C904332': 'This system is stable', 'C904343': 'This system is stable', 'C904344': 'This system is stable', 'C904345': 'This system is stable (dashed metastable)', 'C904354': 'This system is metastable (dashed stable)', 'C904366': 'This system is metastable', 'C904376': 'This system is metastable (dashed stable)', 'C904437': 'This system is stable', 'C904478': 'This system is stable', 'C905006': 'This system is metastable', 'C905621': 'This system is metastable', 'C905635': 'This system is stable (dashed metastable)', 'C905636': 'This system is stable', 'C905637': 'This system is stable (dashed metastable)', 'C905638': 'This system is stable (dashed metastable)', 'C905985': 'This system is metastable (dashed stable)', 'C906635': 'This system is stable', 'C906931': 'This system is stable', 'C908341': 'This system is stable; p = 8.0 GPa', 'C908342': 'This system is metastable', 'C908343': 'This system is metastable', 'C979860': 'This system is stable', 'C979861': 'This system is stable', 'C979862': 'This system is stable', 'C979863': 'This system is metastable', 'C979864': 'This system is stable', 'C979865': 'This system is stable', 'C102059': 'This system is metastable', 'C103150': 'This system is stable', 'C104069': 'This system is metastable', 'C105034': 'This system is metastable', 'C105035': 'This system is metastable'};

wmgui.poly_limits = {1: 'isopolyhedral', 2: 'dipolyhedral', 3: 'tripolyhedral'};

// external integrations
// TODO account contentWindow iframe calls here

wmgui.mpdsgui = {};
wmgui.mpdsgui.view = function(){};
wmgui.mpdsgui.ptable_activate = function(){};
wmgui.mpdsgui.ptable_deactivate = function(){};
