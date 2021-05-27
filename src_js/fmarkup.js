
"use strict";

var wmgui = window.wmgui || {};

function register_html(){
    $('body').append(`
<div id="notifybox">Web-browser is either busy or not supported: try to <a href="javascript:location.reload()" rel="nofollow">restart</a></div>

<div id="preloader"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>

<div id="overlay" class="sky"></div>

<div id="aetmap"><a style="float:left;" href="#polyhedra" class="link_adjuster"></a><div style="float:right;margin-top:25px;"><input type="checkbox" id="aet_limit" /><label for="aet_limit">&nbsp;No other types</label></div></div>

<!-- TOP-LEFT CORNER MENU -->
<div id="userbox">
    <div class="logged_out">
        <span class="symicon">&#x1f464;</span><span class="user_title">Guest</span>&nbsp;&mdash;&nbsp;<span class="href">log in</span>
    </div>
    <div class="logged_in">
        <span class="symicon">&#x1f464;</span><span class="user_title" id="auth_user"></span><span>(<span class="href">menu</span>)</span>
    </div>
</div>

<!-- LANDING AND DATAGRID -->
<div id="main">
    <div id="ermac_logo"><a href="#start"></a></div>
    <div id="search_box">
        <div id="search_area">
            <div id="search_holder">
                <select id="search_field" autocomplete="false" multiple autofocus></select>
            </div>
            <a href="#hierarchy" id="hierarchy_trigger" class="wmbutton" title="Show list of properties">&mu;<span><sub>x</sub><sup>&deg;</sup></span></a>
            <a href="#" id="advsearch_init_trigger" class="wmbutton" title="Show search options">&#9776;</a>
            <a href="#" id="search_trigger" class="wmbutton" title="Search">&#x23ce;</a>
        </div>

        <div id="legend"></div>

        <div id="header_entries">
            <table id="dataheader_entries">
                <thead><tr>
                    <th class="c1">Formula</th>
                    <th class="cp"></th>
                    <th class="c2">Property</th>
                    <th class="cj">J. code</th>
                    <th class="c4">Year</th>
                    <th class="c5">Ref.</th>
                </tr></thead>
            </table>
        </div>

        <div id="header_phases">
            <table id="dataheader_phases">
                <thead><tr>
                    <th class="p1">Phase</th>
                    <th class="p2">Space group num.</th>
                    <th class="p3">Exp. entries</th>
                    <th class="p4">Publications</th>
                    <th class="p5"></th>
                </tr></thead>
            </table>
        </div>

        <div id="header_articles">
            <table id="dataheader_articles">
                <thead><tr>
                    <th class="c55">Ref.</th>
                    <th class="a1">Authors</th>
                    <th class="a2">Title</th>
                    <th class="a5">J. name</th>
                    <th class="cj">J. code</th>
                    <th class="c4">Year</th>
                </tr></thead>
            </table>
        </div>
    </div>

    <div id="results"><table id="databrowser"></table></div>

    <div id="loadscroll" class="context_msg">Getting the rest of data...</div>
    <div id="toomuch" class="context_msg">There are <span></span> results not shown &mdash; please, refine the search.</div>
    <div id="plthint" class="context_msg">
        <div id="plt_pie"><a class="plthint_links" title="Plot pie charts (overview)" rel="nofollow" href="/" rev="pie"></a></div>
        <div id="plt_lit"><a class="plthint_links" title="Plot bar charts (literature)" rel="nofollow" href="/" rev="lit"></a></div>
        <div id="plt_discovery"><a class="plthint_links" title="Search for patterns (PCA)" rel="nofollow" href="/" rev="discovery"></a></div>
        <div id="plt_graph"><a class="plthint_links" title="Plot semantic graph" rel="nofollow" href="/" rev="graph"></a></div>
        <div id="plt_matrix"><a class="plthint_links" title="Plot binaries matrix" rel="nofollow" href="/" rev="matrix"></a></div>
        <div id="plt_cube"><a class="plthint_links" title="Plot ternaries cube" rel="nofollow" href="/" rev="cube"></a></div>
    </div>

    <div id="apihint" class="context_msg">Get machine-readable data in full using API: curl -H Key:<a href="#modal/menu">YOUR_API_KEY</a> 'https://api.mpds.io/v0/download/facet?q=<span></span>&amp;fmt=json'</div>

    <div id="fdwidget" class="context_msg"></div>
</div>

<!-- LEFT MAIN COLUMN -->
<div id="refine_col" class="side_cols">
    <div class="col_title">Narrow down search</div>
    <div id="rfn_preloader"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>
    <ul></ul>

    <div id="examples" class="examples">
        <div class="col_title">Try these examples</div>
        <ul></ul>
    </div>
</div>

<!-- LEFT CONTEXT COLUMN -->
<div id="ctx_col" class="side_cols">
    <div class="col_title">Get entry <span id="entryno"></span> <div class="cross _close_ctx" style="margin:12px 2px 0 0;"></div></div>

    <div id="ml_data" class="spinoff_pane">
        <p>In-house MPDS machine-learning predictions</p><span>These data are open and freely available under the CC BY 4.0 license.</span><span>Please cite as:<br />Blokhin, Villars. MPDS: Materials Platform for Data Science, <i>www.mpds.io</i>, in preparation.<br />See the <a target="_blank" href="/materials-design">materials design</a> app and the <a target="_blank" href="/ml">properties prediction</a> app online.</span>
    </div>
    <div id="ab_data" class="spinoff_pane">
        <p>In-house MPDS <i>ab initio</i> calculations</p><span>These data are open and freely available under the CC BY 4.0 license.</span><span>Please cite as:<br />Sobolev, Civalleri, Maschio, Erba, Dovesi, Villars, Blokhin. MPDS: Materials Platform for Data Science, <i>www.mpds.io</i>, in preparation.</span>
    </div>
    <div id="ab_promise" class="spinoff_pane">
        <p>In-house <i>ab initio</i> calculations</p><span>This calculation is in progress.</span><span>Upon completion it will be freely available under the CC BY 4.0 license. Please, support our work purchasing <a href="#products" style="text-decoration:none;color:#000;border-bottom:1px solid #000;">our products</a>.<br /><br /></span>
    </div>

    <ul>
        <li id="visualize" class="wmbutton">Visualize</li>
        <li id="download_pdf" class="d_icon"><a rel="pdf" href="#" target="_blank" title="Get HTML / PDF document" rel="nofollow"></a></li>
        <li id="download_json" class="d_icon"><a rel="json" href="#" target="_blank" title="Get machine-readable JSON file" rel="nofollow"></a></li>
        <li id="download_png" class="d_icon"><a rel="png" href="#" target="_blank" title="Get PNG raster image" rel="nofollow"></a></li>
        <li id="download_cif" class="d_icon"><a rel="cif" href="#" target="_blank" title="Get CIF structure" rel="nofollow"></a></li>
        <li id="download_inp" class="d_icon"><a rel="inp" href="#" target="_blank" title="Get VASP ab initio simulation input" rel="nofollow"></a></li>
        <li id="download_cdr" class="d_icon"><a rel="cdr" href="#" target="_blank" title="Get CorelDRAW vector image" rel="nofollow"></a></li>
        <li id="download_bib" class="d_icon"><a rel="bib" href="#" target="_blank" title="Get original citation" rel="nofollow"></a></li>
        <li id="download_raw" class="d_icon"><a rel="raw" href="#" target="_blank" title="Get raw calculation data" rel="nofollow"></a></li>
    </ul>
</div>

<!-- LEFT PLOTTING COLUMN -->
<div id="visavis_col" class="side_cols">
    <div class="col_title">Select plot type</div>
    <ul>
        <li id="pltchoice_pie"><a class="pltcol_links" href="/" rel="nofollow" rev="pie">overview</a></li>
        <li id="pltchoice_graph"><a class="pltcol_links" href="/" rel="nofollow" rev="graph">semantic graph</a></li>
        <li id="pltchoice_discovery"><a class="pltcol_links" href="/" rel="nofollow" rev="discovery">discovery of patterns</a></li>
        <li id="pltchoice_matrix"><a class="pltcol_links" href="/" rel="nofollow" rev="matrix">binary compounds</a></li>
        <li id="pltchoice_cube"><a class="pltcol_links" href="/" rel="nofollow" rev="cube">ternary compounds</a></li>
        <li id="pltchoice_qproj"><a class="pltcol_links" href="/" rel="nofollow" rev="qproj">quaternary compounds</a></li>
        <li id="pltchoice_lit"><a class="pltcol_links" href="/" rel="nofollow" rev="lit">source literature</a></li>
    </ul>

    <div id="cmppanel_plots" class="ctxpanel">
        <div class="col_title">Compare to</div>
        <select id="select_cmp_trigger"></select>
    </div>

    <div id="ctxpanel_plots">
        <div id="ctxpanel_matrix" class="ctxpanel">
            <div class="col_title">Sort points <div id="ss_gear_matrix" class="gear"></div></div>
            <ul>
                <li id="vismatrix_count">by occurence</li>
                <li id="vismatrix_num">by atomic number</li>
                <li id="vismatrix_nump">by periodic number</li>
                <li id="vismatrix_size">by atomic size</li>
                <li id="vismatrix_rea">by atomic reactivity</li>
                <li id="vismatrix_rpp">by pseudopotential radii</li>
                <li id="vismatrix_rion">by ionic radii</li>
                <li id="vismatrix_rcov">by covalent radii</li>
                <li id="vismatrix_rmet">by metallic radii</li>
                <li id="vismatrix_tmelt">by melting temperature</li>
                <li id="vismatrix_eneg">by electronegativity</li>
            </ul>
        </div>

        <div id="ctxpanel_cube" class="ctxpanel">
            <div class="col_title">Sort points <div id="ss_gear_cube" class="gear"></div></div>
            <ul>
                <li id="viscube_num">by atomic number</li>
                <li id="viscube_nump">by periodic number</li>
                <li id="viscube_size">by atomic size</li>
                <li id="viscube_rea">by atomic reactivity</li>
                <li id="viscube_rpp">by pseudopotential radii</li>
                <li id="viscube_rion">by ionic radii</li>
                <li id="viscube_rcov">by covalent radii</li>
                <li id="viscube_rmet">by metallic radii</li>
                <li id="viscube_tmelt">by melting temperature</li>
                <li id="viscube_eneg">by electronegativity</li>
            </ul>
        </div>

        <div id="ctxpanel_graph" class="ctxpanel">
            <div class="col_title">Display terms</div>
            <ul>
                <li id="visgraph_props">physical properties</li>
                <li id="visgraph_aetypes">polyhedral types</li>
                <li id="visgraph_lattices">crystal systems</li>
                <li id="visgraph_articles">publications</li>
                <li id="visgraph_geos">countries</li>
            </ul>
        </div>

        <div id="ctxpanel_discovery" class="ctxpanel">
            <div class="col_title">Change active axes</div>
            <ul>
                <li class="discovery_custom" id="dc_num">atomic number</li>
                <li class="discovery_custom" id="dc_nump" style="display:block;">periodic number</li>
                <li class="discovery_custom" id="dc_size">atomic size</li>
                <li class="discovery_custom" id="dc_rea">atomic reactivity</li>
                <li class="discovery_custom" id="dc_rpp">pseudopotential radii</li>
                <li class="discovery_custom" id="dc_rion">ionic radii</li>
                <li class="discovery_custom" id="dc_rcov">covalent radii</li>
                <li class="discovery_custom" id="dc_rmet">metallic radii</li>
                <li class="discovery_custom" id="dc_tmelt">melting temperature</li>
                <li class="discovery_custom" id="dc_eneg">electronegativity</li>
            </ul>
        </div>
    </div>
</div>

<!-- RIGHT MAIN COLUMN -->
<div id="right_col" class="side_cols">
    <div class="col_title">Edit search options</div>

    <div class="controlswitch">
        <div id="control_a">entries</div><div id="control_b">phases</div><div id="control_f">articles</div>
    </div>

    <div class="controlswitch">
        <div id="control_c">table</div><div id="control_d">previews</div><div id="control_e">plots</div>
    </div>

    <ul id="interpret"></ul>

    <div id="dtypes">
        <div class="col_title">Restrict data type</div>
        <ul>
            <li class="fct_props dtypes_props" data-facet="props" data-term="crystal structure">crystal structures</li>
            <li class="fct_props dtypes_props" data-facet="props" data-term="phase diagram">phase diagrams</li>
            <li class="fct_props dtypes_props" data-facet="props" data-term="physical properties">physical properties</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="peer-reviewed" style="margin-top:15px;">peer-reviewed experimental</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="machine-learning">machine-learning</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="ab initio calculations">ab initio modeling</li>
        </ul>
    </div>

    <div id="history">
        <div class="col_title">Browse last searches</div>
        <ul></ul>
    </div>
</div>

<!-- RIGHT CONTEXT COLUMN -->
<div id="sim_col" class="side_cols">
    <div class="col_title">See also <div class="cross _close_ctx" style="margin:12px 2px 0 0;"></div></div>
    <div id="sim_preloader"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>

    <div id="own_phase" class="sim_col_ctx"></div>

    <div id="sim_legend"></div>

    <ul></ul>

    <a id="sim_trigger" href="#" class="wmbutton sim_col_ctx" rel="nofollow">Show all</a>

    <div id="pd_legend" class="sim_col_ctx">
        <div class="col_title">See area colors</div>
        <ul>
            <li>liquid or gas <span style="color:#fff;background:#9cf;padding:2px;">blue or violet</span></li>
            <li>1-phase <span style="color:#fff;background:#d1cde6;padding:2px;">violet</span></li>
            <li>2-phase <span style="color:#fff;background:#ddd;padding:2px;">gray or white</span></li>
            <li>3-phase <span style="color:#fff;background:#fc6;padding:2px;">yellow</span></li>
            <li>4-phase <span style="color:#fff;background:#FCD3C2;padding:2px;">red</span></li>
            <li>5-phase <span style="color:#fff;background:#CCE7D4;padding:2px;">green</span></li>
        </ul>
    </div>
</div>

<!-- ADVANCED SEARCH MODAL -->
<div id="advsbox" class="modal user_dialogue">
    <ul id="advstab_options">
        <li rev="advstab_bib">bibliography</li>
        <li rev="advstab_cry">crystallography</li>
        <li rev="advstab_main">basics</li>
    </ul>

    <div id="advstab_main" class="advstab">
        <div class="cross close_advs_dialogue" style="margin-top:22px;"></div>
        <div style="clear:both;"></div>
        <div class="advs advs_formulae">
            <div class="advs_capt">Chemical formula</div>
            <input type="text" id="advs_fct_formulae" class="advs_input" maxlength="200" spellcheck="false" /><!-- no autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Ca3(PO4)2</a> or <a href="#" tabindex="-1">ABC3</a></div>
        </div>
        <div class="advs advs_elements">
            <div class="advs_capt">Chemical elements</div>
            <input type="text" id="advs_fct_elements" class="advs_input" maxlength="100" spellcheck="false" /><!-- no autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Co-Te-Pb</a></div>
        </div>
        <div class="advs advs_props">
            <div class="advs_capt">Physical property</div>
            <input type="text" id="advs_fct_props" class="advs_input" rel="props" maxlength="200" spellcheck="true" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">crystal structure</a> or <a href="#" tabindex="-1">EXAFS</a>, <span>see <a href="#hierarchy" style="color:#c00;border-bottom:1px solid #c00;">the hierarchy</a></span></div>
        </div>
        <div class="advs advs_classes" style="margin-bottom:3vmin;">
            <div class="advs_capt">Materials class</div>
            <select id="advs_fct_classes" autocomplete="false"></select><!-- multiselect autocomplete -->
            <div class="advs_legend" data-multiselects="classes"><i>e.g.</i> <a href="#" tabindex="-1">hydride, nonmetal</a> or <a href="#" tabindex="-1">machine learning</a></div>
        </div>
    </div>

    <div id="advstab_bib" class="advstab">
        <div class="cross close_advs_dialogue" style="margin-top:22px;"></div>
        <div style="clear:both;"></div>
        <div class="advs advs_authors">
            <div class="advs_capt">Publication author</div>
            <select id="advs_fct_authors" autocomplete="false"></select><!-- multiselect autocomplete -->
            <div class="advs_legend" data-multiselects="authors"><i>e.g.</i> <a href="#" tabindex="-1">Maier, Merkle</a></div>
        </div>
        <div class="advs advs_years">
            <div class="advs_capt">Publication years</div>
            <input type="text" id="advs_fct_years" class="advs_input" maxlength="20" spellcheck="false" /><!-- no autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">2000-2021</a> or <a href="#" tabindex="-1">1955</a></div>
        </div>
        <div class="advs advs_codens">
            <div class="advs_capt">Journal or book</div>
            <input type="text" id="advs_fct_codens" class="advs_input" rel="codens" maxlength="200" style="letter-spacing:-1px;" spellcheck="true" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Physical Review Letters</a></div>
        </div>
        <div class="advs advs_doi">
            <div class="advs_capt">Publication DOI</div>
            <input type="text" id="advs_fct_doi" class="advs_input u-url url" maxlength="200" style="letter-spacing:-1px;" spellcheck="false" /><!-- no autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">10.1103/physrevb.88.241407</a></div>
        </div>
        <div class="advs advs_geos">
            <div class="advs_capt">Geography</div>
            <input type="text" id="advs_fct_geos" class="advs_input geo" rel="geos" maxlength="150" spellcheck="true" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">USA</a> or <a href="#" tabindex="-1">Haikou, Hainan, China</a></div>
        </div>
        <div class="advs advs_orgs" style="margin-bottom:3vmin;">
            <div class="advs_capt">Organization</div>
            <input type="text" id="advs_fct_orgs" class="advs_input p-org org" rel="orgs" maxlength="200" spellcheck="true" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Thermo-Calc</a> or <a href="#" tabindex="-1">Boeing</a></div>
        </div>
    </div>

    <div id="advstab_cry" class="advstab">
        <div class="cross close_advs_dialogue" style="margin-top:22px;"></div>
        <div style="clear:both;"></div>
        <div class="advs advs_lattices">
            <div class="advs_capt">Crystal system</div>
            <input type="text" id="advs_fct_lattices" class="advs_input" rel="lattices" maxlength="20" spellcheck="true" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">cubic</a></div>
        </div>
        <div class="advs advs_sgs">
            <div class="advs_capt">Space group</div>
            <input type="text" id="advs_fct_sgs" class="advs_input" rel="sgs" maxlength="20" spellcheck="false" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Fm-3m</a> or <a href="#" tabindex="-1">225</a></div>
        </div>
        <div class="advs advs_protos">
            <div class="advs_capt">Prototype</div>
            <input type="text" id="advs_fct_protos" class="advs_input" rel="protos" maxlength="100" spellcheck="false" /><!-- simple autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">Ca2Nb2O7 cF88 227</a> or <a href="#" tabindex="-1">D51</a></div>
        </div>
        <div class="advs advs_aetypes">
            <div class="advs_capt">Polyhedral type</div>
            <select id="advs_fct_aetypes" autocomplete="false"></select><!-- multiselect autocomplete -->
            <div class="advs_legend" data-multiselects="aetypes"><i>e.g.</i> <a href="#" tabindex="-1">octahedron 6-vertex</a>, <span>see <a href="#polyhedra" class="link_adjuster" style="color:#c00;border-bottom:1px solid #c00;">all polyhedra</a></span></div>
        </div>
        <div class="advs advs_aeatoms">
            <div class="advs_capt">Polyhedron atoms</div>
            <input type="text" id="advs_fct_aeatoms" class="advs_input" maxlength="100" spellcheck="false" /><!-- no autocomplete -->
            <div class="advs_legend"><i>e.g.</i> <a href="#" tabindex="-1">U</a> or <a href="#" tabindex="-1">X-Se</a> or <a href="#" tabindex="-1">UO6</a> or <a href="#" tabindex="-1">UX7</a></div>
        </div>

        <div id="crtab">
            <div>Lattice <i>a</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="alat">&#8491;  &nbsp;[1.5 &mdash; 20]&nbsp;&#x1F50D;</strong></div>
            <div><i>a</i>/<i>b</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="a--b"> &nbsp;[0.1 &mdash; 10]&nbsp;&#x1F50D;</strong></div>
            <div>Lattice <i>b</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="blat">&#8491;  &nbsp;[1.5 &mdash; 20]&nbsp;&#x1F50D;</strong></div>
            <div><i>b</i>/<i>c</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="b--c"> &nbsp;[0.1 &mdash; 10]&nbsp;&#x1F50D;</strong></div>
            <div>Lattice <i>c</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="clat">&#8491;  &nbsp;[1.5 &mdash; 20]&nbsp;&#x1F50D;</strong></div>
            <div><i>c</i>/<i>a</i>, &nbsp;<strong class="numeric" title="Numeric search" rel="c--a"> &nbsp;[0.1 &mdash; 10]&nbsp;&#x1F50D;</strong></div>
            <div>Cell volume, &nbsp;<strong class="numeric" title="Numeric search" rel="volume">&#8491;<sup>3</sup>  &nbsp;[3 &mdash; 10<sup>4</sup>]&nbsp;&#x1F50D;</strong></div>
            <div>Density, &nbsp;<strong class="numeric" title="Numeric search" rel="density"> Mg/m<sup>3</sup>  &nbsp;[0.1 &mdash; 30]&nbsp;&#x1F50D;</strong></div>
        </div>

    </div>

    <div id="advstab_triggers">
        <div id="advsearch_do_trigger" class="wmbutton" title="Search">&#x23ce;</div>
        <div id="advsearch_drop_trigger" class="wmbutton" title="Clear all fields">&#x232b;</div>
    </div>
</div>

<!-- LOGIN MODAL -->
<div id="loginbox" class="modal user_dialogue">
    <div class="cross close_user_dialogue"></div>
    <br />

    <div><label for="login_email">Email:</label></div>
    <div><input type="email" id="login_email" class="submitter" maxlength="100" autocomplete="off" /></div>
    <div><label for="login_password">Password:</label></div>
    <div><input type="password" id="login_password" class="submitter" maxlength="100" autocomplete="off" /></div>

    <div style="width:150px;margin:25px auto;">
        <div id="login_trigger" class="wmbutton def_submittable">Log in</div>
    </div>
    <div class="notice">or email <span class="href" rel="#modal/restore">an access link</span><br />or log in via <a href="/github_oauth.html" rel="nofollow noopener noreferrer">GitHub</a> or <a href="/orcid_oauth.html" rel="nofollow noopener noreferrer">ORCID</a> or <a href="/linkedin_oauth.html" rel="nofollow noopener noreferrer">LinkedIn</a></div>
</div>

<!-- RESTORE MODAL -->
<div id="restorebox" class="modal user_dialogue">
    <div class="cross close_user_dialogue"></div>
    <br />

    <div><label for="restore_by_email">Email:</label></div>
    <div><input type="email" id="restore_by_email" class="submitter" maxlength="100" autocomplete="off" /></div>

    <div style="width:150px;margin:25px auto;">
        <div id="restore_trigger" class="wmbutton def_submittable">Send link</div>
    </div>
    <div class="notice">or log in with <span class="href" rel="#modal/login">password</span><br />or via <a href="/github_oauth.html" rel="nofollow noopener noreferrer">GitHub</a> or <a href="/orcid_oauth.html" rel="nofollow noopener noreferrer">ORCID</a> or <a href="/linkedin_oauth.html" rel="nofollow noopener noreferrer">LinkedIn</a></div>
</div>

<!-- USER MENU MODAL -->
<div id="menubox" class="modal user_dialogue">
    <ul id="tab_links">
        <li rev="usr_tab_account" class="working">account</li>
        <li rev="usr_tab_perms">data access</li>
        <li rev="usr_tab_api_key">API key</li>
        <li rev="usr_tab_ctrl" style="display:none;" class="admin">management</li>
    </ul>

    <div id="usr_tab_account" class="menu_tabs">
        <div class="cross close_user_dialogue" style="margin-top:25px;"></div>
        <div style="clear:both;"></div>
        <div class="divider"></div>

        <div id="account_holder_name"></div>
        <div id="account_holder_acclogin">Login: <span></span></div>
        <div id="account_holder_accpass">Password: <span>change</span></div>

        <div id="account_pass_change" style="display:none;">
            <div id="account_pass_hint">MPDS password is optional.<br />If not set, other ways to log in can be used.</div>

            <div><label for="new_password_1">New password:</label></div>
            <div><input type="password" id="new_password_1" class="submitter" maxlength="100" /></div>
            <div><label for="new_password_2">Again to make sure:</label></div>
            <div><input type="password" id="new_password_2" class="submitter" maxlength="100" /></div>

            <div style="width:150px;margin:25px auto 0;">
                <div id="password_trigger" class="wmbutton def_submittable">Change</div>
            </div>
        </div>

        <div class="divider"></div>

        <div style="width:150px;margin:30px auto 10px;">
            <div id="logout_trigger" class="wmbutton" style="background:#c00;border-color:#c00;">Logout</div>
        </div>
    </div>

    <div id="usr_tab_perms" class="menu_tabs" style="display:none;">
        <div class="cross close_user_dialogue" style="margin-top:25px;"></div>
        <div style="clear:both;"></div>
        <div class="divider"></div>

        <div id="perms_view"></div>
    </div>

    <div id="usr_tab_api_key" class="menu_tabs" style="display:none;">
        <div class="cross close_user_dialogue" style="margin-top:25px;"></div>
        <div style="clear:both;"></div>
        <div class="divider"></div>

        <h3>API key for the remote requests</h3>

        <div id="usr_api_key"></div>

        <div id="revoke_usr_api_key_holder" style="display:none;width:150px;margin:30px auto 10px;">
            <div id="revoke_usr_api_key" class="wmbutton" style="background:#c00;border-color:#c00;">Revoke</div>
        </div>
        <div id="create_usr_api_key_holder" style="display:none;width:150px;margin:30px auto 10px;">
            <div id="create_usr_api_key" class="wmbutton">Create</div>
        </div>
    </div>

    <div id="usr_tab_ctrl" class="menu_tabs" style="display:none;">
        <br /><br /><br /><br /><br />
    </div>
</div>

<!-- USER MENU COLLATERAL WINDOWS -->
<div id="hintsbox" class="menu_collateral">
    <div id="hintsbox_logo"></div>
    <div id="hintsbox_msg"></div>
</div>
<div id="tagcloudbox" class="menu_collateral"></div>

<!-- NEW PROPS HIERARCHY MODAL -->
<div id="hy_box" class="modal user_dialogue">
    <ul id="hy_options">
        <li rev="hy_scalars" class="working">scalars</li>
        <li rev="hy_complex">objects and arrays</li>
        <li rev="hy_textual">textual data</li>
        <li rev="hy_vis">visualization</li>
    </ul>

    <div id="hy_scalars" class="hy_tabs">
        <div class="cross close_hy_dialogue" style="margin-top:25px;"></div><div style="clear:both;"></div>
        <ul></ul>
    </div>
    <div id="hy_complex" class="hy_tabs" style="display:none;">
        <div class="cross close_hy_dialogue" style="margin-top:25px;"></div><div style="clear:both;"></div>
        <ul></ul>
    </div>
    <div id="hy_textual" class="hy_tabs" style="display:none;">
        <div class="cross close_hy_dialogue" style="margin-top:25px;"></div><div style="clear:both;"></div>
        <ul></ul>
    </div>

    <div id="hy_suggest_holder">
        <div class="divider"></div>
        <input type="text" id="hy_suggest" maxlength="200" placeholder="Or type property here..." rel="props" />
    </div>
</div>

<!-- PLOTS EMBED -->
<div id="visavis"><iframe id="visavis_iframe" frameborder=0 scrolling="no" width="100%" height="100%" src="/visavis/"></iframe></div>

<!-- DISCOVERY SETTINGS MODAL -->
<div id="discovery_custom_box" class="modal user_dialogue">
    <div id="close_dc_dialogue" class="cross"></div>
    <h3>Used properties</h3>
    <div id="discovery_enabled"></div>
    <div class="divider"></div>
    <h3>Unused properties</h3>
    <div id="discovery_disabled"></div>
    <div class="notice" id="discovery_custom_box_msg" style="width:60%;margin:45px auto 0;text-align:center;font-size:0.95em;line-height:2.5vh;background:#ffd;padding:15px;">Click labels to rearrange.</div>
</div>

<!-- ALL POLYHEDRA MODAL -->
<div id="all_polyhedra_box" class="modal user_dialogue">
    <div id="close_ph_dialogue" class="cross" style="margin:18px;"></div>
    <div style="width:100%;text-align:center;font-size:1.25em;line-height:4vh;letter-spacing:0.5px;padding:2.6em 0 0.5em;">The most common polyhedral types</div>
    <div class="divider"></div>
    <div id="all_polyhedra_content"></div>
</div>

<!-- SORTING SETTINGS MODAL -->
<div id="ss_custom_box" class="modal user_dialogue">
    <div id="close_ss_dialogue" class="cross"></div>
    <div style="clear:both;width:100%;"></div>
    <div id="ss_x" class="ss_col"><h3>First axis</h3><ul></ul></div>
    <div id="ss_y" class="ss_col"><h3>Second axis</h3><ul></ul></div>
    <div id="ss_z" class="ss_col"><h3>Third axis</h3><ul></ul></div>
    <h3>Joint sort operators</h3>
    <div id="sops_x" class="sops_col"><ul><li>none</li><li>sum</li><li>diff</li><li>product</li><li>ratio</li><li>max</li><li>min</li></ul></div>
    <div id="sops_y" class="sops_col"><ul><li>none</li><li>sum</li><li>diff</li><li>product</li><li>ratio</li><li>max</li><li>min</li></ul></div>
    <div id="sops_z" class="sops_col"><ul><li>none</li><li>sum</li><li>diff</li><li>product</li><li>ratio</li><li>max</li><li>min</li></ul></div>
</div>

<!-- HELP BOXES -->
<div id="tooltip" class="modal"><div></div></div>

<!-- NUMERIC SEARCH SMART BOX -->
<div id="numericbox">
    <div id="close_numericbox" class="cross" style="margin:12px 8px 8px 0;"></div>
    <ul></ul>
    <div id="numericbox_triggers" style="margin-top:10px;">
        <a href="#hierarchy" title="Add new property range" style="display:inline-block;width:20px;height:20px;font-size:35px;line-height:20px;color:#ccc;text-decoration:none;margin-left:150px;border:2px solid #ccc;border-radius:15px;">+</a>
        <div id="numericbox_do_trigger" class="wmbutton" title="Search" style="margin-left:325px;">&#x23ce;</div>
        <div id="numericbox_drop_trigger" class="wmbutton" title="Clear all fields">&#x232b;</div>
    </div>
</div>

<div id="footer">Editors: <span>Pierre Villars, Karin Cenzual, and Riccarda Caputo</span>. Developed by <a href="https://tilde.pro" target="_blank">Tilde MI</a>.</div>
`);
}