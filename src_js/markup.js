"use strict";

var wmgui = window.wmgui || {};

function register_html(){
    $('body').append(`
<div id="notifybox">Web-browser is either busy or not supported: try to <a href="javascript:location.reload()" rel="nofollow">restart</a></div>

<div id="preloader"><div></div></div>

<div id="overlay"></div>

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

<!-- SEARCH -->
<div id="search_box">
    <div id="ermac_logo"><a href="#start"></a></div>

    <div id="search_area">
        <div id="search_holder">
            <select id="search_field" autocomplete="off" autofocus></select>
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
                <th class="p3">Entries</th>
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
                <th class="c4">Year</th>
                <th class="a6"></th>
            </tr></thead>
        </table>
    </div>
</div>

<!-- DATAGRID -->
<div id="main">
    <div id="results"><table id="databrowser"></table></div>

    <div id="loadscroll" class="context_msg">Getting the rest of data...</div>
    <div id="toomuch" class="context_msg">There are <span></span> results not shown &mdash; please, refine the search &mdash; or use the API.</div>
    <div id="plthint" class="context_msg">
        <span>Try to visualize these entire results as:</span>
        <div id="plt_pie"><a class="plthint_links" title="Plot pie charts (overview)" rel="nofollow" href="/" rev="pie"></a></div>
        <div id="plt_lit"><a class="plthint_links" title="Plot bar charts (literature)" rel="nofollow" href="/" rev="lit"></a></div>
        <div id="plt_discovery"><a class="plthint_links" title="Search for patterns (PCA)" rel="nofollow" href="/" rev="discovery"></a></div>
        <div id="plt_graph"><a class="plthint_links" title="Plot semantic graph" rel="nofollow" href="/" rev="graph"></a></div>
        <div id="plt_matrix"><a class="plthint_links" title="Plot binaries matrix" rel="nofollow" href="/" rev="matrix"></a></div>
        <div id="plt_cube"><a class="plthint_links" title="Plot ternaries cube" rel="nofollow" href="/" rev="cube"></a></div>
    </div>

    <div id="apihint" class="context_msg">Get full machine-readable data using API: curl -H Key:<a href="#modal/menu">YOUR_API_KEY</a> 'https://api.mpds.io/v0/download/facet?q=<span></span>&amp;fmt=json'</div>

    <!-- div id="fdwidget" class="context_msg"></div -->
</div>

<!-- PERIODIC TABLE -->
<div id="ptable_holder">
<div id="ptable_area">
<ul>
    <!-- Period 1 -->
    <li data-pos="1" class="type_1 cat_2">H<span>Hydrogen</span></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li data-pos="2" class="type_2 cat_2">He<span>Helium</span></li>

    <!-- Period 2 -->
    <li data-pos="3" class="type_3 cat_0">Li<span>Lithium</span></li>
    <li data-pos="4" class="type_4 cat_0">Be<span>Beryllium</span></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li data-pos="5" class="type_5 cat_0">B<span>Boron</span></li>
    <li data-pos="6" class="type_5 cat_0">C<span>Carbon</span></li>
    <li data-pos="7" class="type_5 cat_2">N<span>Nitrogen</span></li>
    <li data-pos="8" class="type_5 cat_2">O<span>Oxygen</span></li>
    <li data-pos="9" class="type_5 cat_2">F<span>Fluorine</span></li>
    <li data-pos="10" class="type_2 cat_2">Ne<span>Neon</span></li>

    <!-- Period 3 -->
    <li data-pos="11" class="type_3 cat_0">Na<span>Sodium</span></li>
    <li data-pos="12" class="type_4 cat_0">Mg<span>Magnesium</span></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li data-pos="13" class="type_7 cat_0">Al<span>Aluminium</span></li>
    <li data-pos="14" class="type_5 cat_0">Si<span>Silicon</span></li>
    <li data-pos="15" class="type_5 cat_0">P<span>Phosphorus</span></li>
    <li data-pos="16" class="type_5 cat_0">S<span>Sulfur</span></li>
    <li data-pos="17" class="type_5 cat_2">Cl<span>Chlorine</span></li>
    <li data-pos="18" class="type_2 cat_2">Ar<span>Argon</span></li>

    <!-- Period 4 -->
    <li data-pos="19" class="type_3 cat_0">K<span>Potassium</span></li>
    <li data-pos="20" class="type_4 cat_0">Ca<span>Calcium</span></li>
    <li data-pos="21" class="type_6 cat_0">Sc<span>Scandium</span></li>
    <li data-pos="22" class="type_6 cat_0">Ti<span>Titanium</span></li>
    <li data-pos="23" class="type_6 cat_0">V<span>Vanadium</span></li>
    <li data-pos="24" class="type_6 cat_0">Cr<span>Chromium</span></li>
    <li data-pos="25" class="type_6 cat_0">Mn<span>Manganese</span></li>
    <li data-pos="26" class="type_6 cat_0">Fe<span>Iron</span></li>
    <li data-pos="27" class="type_6 cat_0">Co<span>Cobalt</span></li>
    <li data-pos="28" class="type_6 cat_0">Ni<span>Nickel</span></li>
    <li data-pos="29" class="type_6 cat_0">Cu<span>Copper</span></li>
    <li data-pos="30" class="type_6 cat_0">Zn<span>Zinc</span></li>
    <li data-pos="31" class="type_7 cat_0">Ga<span>Gallium</span></li>
    <li data-pos="32" class="type_7 cat_0">Ge<span>Germanium</span></li>
    <li data-pos="33" class="type_5 cat_0">As<span>Arsenic</span></li>
    <li data-pos="34" class="type_5 cat_0">Se<span>Selenium</span></li>
    <li data-pos="35" class="type_5 cat_1">Br<span>Bromine</span></li>
    <li data-pos="36" class="type_2 cat_2">Kr<span>Krypton</span></li>

    <!-- Period 5 -->
    <li data-pos="37" class="type_3 cat_0">Rb<span>Rubidium</span></li>
    <li data-pos="38" class="type_4 cat_0">Sr<span>Strontium</span></li>
    <li data-pos="39" class="type_6 cat_0">Y<span>Yttrium</span></li>
    <li data-pos="40" class="type_6 cat_0">Zr<span>Zirconium</span></li>
    <li data-pos="41" class="type_6 cat_0">Nb<span>Niobium</span></li>
    <li data-pos="42" class="type_6 cat_0">Mo<span>Molybdenum</span></li>
    <li data-pos="43" class="type_6 cat_0">Tc<span>Technetium</span></li>
    <li data-pos="44" class="type_6 cat_0">Ru<span>Ruthenium</span></li>
    <li data-pos="45" class="type_6 cat_0">Rh<span>Rhodium</span></li>
    <li data-pos="46" class="type_6 cat_0">Pd<span>Palladium</span></li>
    <li data-pos="47" class="type_6 cat_0">Ag<span>Silver</span></li>
    <li data-pos="48" class="type_6 cat_0">Cd<span>Cadmium</span></li>
    <li data-pos="49" class="type_7 cat_0">In<span>Indium</span></li>
    <li data-pos="50" class="type_7 cat_0">Sn<span>Tin</span></li>
    <li data-pos="51" class="type_7 cat_0">Sb<span>Antimony</span></li>
    <li data-pos="52" class="type_5 cat_0">Te<span>Tellurium</span></li>
    <li data-pos="53" class="type_5 cat_0">I<span>Iodine</span></li>
    <li data-pos="54" class="type_2 cat_2">Xe<span>Xenon</span></li>

    <!-- Period 6 -->
    <li data-pos="55" class="type_3 cat_0">Cs<span>Caesium</span></li>
    <li data-pos="56" class="type_4 cat_0">Ba<span>Barium</span></li>
    <li data-pos="71" class="type_6 cat_0">Lu<span>Lutetium</span></li>
    <li data-pos="72" class="type_6 cat_0">Hf<span>Hafnium</span></li>
    <li data-pos="73" class="type_6 cat_0">Ta<span>Tantalum</span></li>
    <li data-pos="74" class="type_6 cat_0">W<span>Tungsten</span></li>
    <li data-pos="75" class="type_6 cat_0">Re<span>Rhenium</span></li>
    <li data-pos="76" class="type_6 cat_0">Os<span>Osmium</span></li>
    <li data-pos="77" class="type_6 cat_0">Ir<span>Iridium</span></li>
    <li data-pos="78" class="type_6 cat_0">Pt<span>Platinum</span></li>
    <li data-pos="79" class="type_6 cat_0">Au<span>Gold</span></li>
    <li data-pos="80" class="type_6 cat_1">Hg<span>Mercury</span></li>
    <li data-pos="81" class="type_7 cat_0">Tl<span>Thallium</span></li>
    <li data-pos="82" class="type_7 cat_0">Pb<span>Lead</span></li>
    <li data-pos="83" class="type_7 cat_0">Bi<span>Bismuth</span></li>
    <li data-pos="84" class="type_7 cat_0">Po<span>Polonium</span></li>
    <li data-pos="85" class="type_5 cat_0">At<span>Astatine</span></li>
    <li data-pos="86" class="type_2 cat_2">Rn<span>Radon</span></li>

    <!-- Period 7 -->
    <li data-pos="87" class="type_3 cat_0">Fr<span>Francium</span></li>
    <li data-pos="88" class="type_4 cat_0">Ra<span>Radium</span></li>
    <li data-pos="103" class="type_6 cat_0">Lr<span>Lawrencium</span></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>
    <li class="empty"></li>

    <!-- Lanthanides -->
    <li class="empty"></li>
    <li class="empty"></li>
    <li data-pos="57" class="type_1 cat_0">La<span>Lanthanum</span></li>
    <li data-pos="58" class="type_1 cat_0">Ce<span>Cerium</span></li>
    <li data-pos="59" class="type_1 cat_0">Pr<span>Praseodymium</span></li>
    <li data-pos="60" class="type_1 cat_0">Nd<span>Neodynium</span></li>
    <li data-pos="61" class="type_1 cat_0">Pm<span>Promethium</span></li>
    <li data-pos="62" class="type_1 cat_0">Sm<span>Samarium</span></li>
    <li data-pos="63" class="type_1 cat_0">Eu<span>Europium</span></li>
    <li data-pos="64" class="type_1 cat_0">Gd<span>Gadolinium</span></li>
    <li data-pos="65" class="type_1 cat_0">Tb<span>Terbium</span></li>
    <li data-pos="66" class="type_1 cat_0">Dy<span>Dysprosium</span></li>
    <li data-pos="67" class="type_1 cat_0">Ho<span>Holmium</span></li>
    <li data-pos="68" class="type_1 cat_0">Er<span>Erbium</span></li>
    <li data-pos="69" class="type_1 cat_0">Tm<span>Thulium</span></li>
    <li data-pos="70" class="type_1 cat_0">Yb<span>Ytterbium</span></li>
    <li class="empty"></li>
    <li class="empty"></li>

    <!-- Actinides -->
    <li class="empty"></li>
    <li class="empty"></li>
    <li data-pos="89" class="type_1 cat_0">Ac<span>Actinium</span></li>
    <li data-pos="90" class="type_1 cat_0">Th<span>Thorium</span></li>
    <li data-pos="91" class="type_1 cat_0">Pa<span>Protactinium</span></li>
    <li data-pos="92" class="type_1 cat_0">U<span>Uranium</span></li>
    <li data-pos="93" class="type_1 cat_0">Np<span>Neptunium</span></li>
    <li data-pos="94" class="type_1 cat_0">Pu<span>Plutonium</span></li>
    <li data-pos="95" class="type_1 cat_0">Am<span>Americium</span></li>
    <li data-pos="96" class="type_1 cat_0">Cm<span>Curium</span></li>
    <li data-pos="97" class="type_1 cat_0">Bk<span>Berkelium</span></li>
    <li data-pos="98" class="type_1 cat_0">Cf<span>Californium</span></li>
    <li data-pos="99" class="type_1 cat_0">Es<span>Einsteinium</span></li>
    <li data-pos="100" class="type_1 cat_0">Fm<span>Fermium</span></li>
    <li data-pos="101" class="type_1 cat_0">Md<span>Mendelevium</span></li>
    <li data-pos="102" class="type_1 cat_0">No<span>Nobelium</span></li>
    <li class="empty"></li>
    <li class="empty"></li>
</ul>
</div>

<!-- PERIODIC TABLE OUTPUT -->
<div id="ptable_results">
    <div id="ptable_previews"></div>
    <div id="ptable_vis"></div>
</div>
</div>

<!-- PERIODIC TABLE DATATYPES CONTROL -->
<div id="ptable_dtypes_box">
    <span>Show periodic table as: </span>
    <div>
        <input type="radio" name="ptable_dtypes" id="ptable_dtypes_1" value="1" checked /><label for="ptable_dtypes_1"> phase diagrams</label><br />
        <input type="radio" name="ptable_dtypes" id="ptable_dtypes_2" value="2" /><label for="ptable_dtypes_2"> crystal structure counts</label><br />
        <input type="radio" name="ptable_dtypes" id="ptable_dtypes_3" value="3" /><label for="ptable_dtypes_3"> physical property counts</label><br />
        <input type="radio" name="ptable_dtypes" id="ptable_dtypes_0" value="0" /><label for="ptable_dtypes_0"> empty table</label>
    </div>
</div>

<!-- LEFT MAIN COLUMN -->
<div id="refine_col" class="side_cols">
    <div class="col_title">Filters</div>
    <div id="rfn_preloader"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>
    <ul></ul>

    <div id="phases_ctx">
        <div class="col_title">Distinct phases</div>
        <br />
        <div style="text-align:center;"><input type="checkbox" id="ctx_strict_phases_trigger" checked />&nbsp;<label for="ctx_strict_phases_trigger">include phases commonly reported together</label></div>
        <!-- br />
        &nbsp;<input type="checkbox" id="ctx_subphases_trigger" />&nbsp;<label for="ctx_subphases_trigger">constituent phases</label -->
        <span>See the <a target="_blank" href="https://github.com/mpds-io/mpds-distinct-phases">public dumps</a> of the distinct phases appeared at least once in the literature.</span>
    </div>

    <div id="examples" class="examples">
        <div class="col_title">Examples</div>
        <ul></ul>
    </div>
</div>

<!-- LEFT CONTEXT COLUMN -->
<div id="ctx_col" class="side_cols">
    <div class="col_title">Entry <span id="entryno"></span> <div class="cross _close_ctx" style="margin:12px 2px 0 0;"></div></div>

    <div id="ml_data" class="spinoff_pane">
        <p>In-house machine-learning predictions</p><span class="extd href">Show more info...</span><span class="legend" style="display:none">These data are open and freely available under the CC BY 4.0 license. Cite as: Blokhin, Villars. MPDS: Materials Platform for Data Science, <i>mpds.io</i>, in preparation.<br />See the <a target="_blank" href="/materials-design">materials design</a> app and the <a target="_blank" href="/ml">properties prediction</a> app online.<br /><br /></span>
    </div>
    <div id="ab_data" class="spinoff_pane">
        <p>In-house <i>ab initio</i> calculations</p><span class="extd href">Show more info...</span><span class="legend" style="display:none">These data are open and freely available under the CC BY 4.0 license. Cite as: Sobolev, Civalleri, Maschio, Erba, Dovesi, Villars, Blokhin. MPDS: Materials Platform for Data Science, <i>mpds.io</i>, in preparation.<br />See the <a target="_blank" href="https://mpds.io/labs/dtypes-cmp">data types comparison</a>.<br /><br /></span>
    </div>
    <div id="ab_promise" class="spinoff_pane">
        <p>In-house <i>ab initio</i> calculations</p><span class="extd href">Show more info...</span><span class="legend" style="display:none">This calculation is in progress. Upon completion it will be freely available under the CC BY 4.0 license. Support our work purchasing <a target="_blank" href="https://mpds.io/products" style="text-decoration:none;color:#000;border-bottom:1px solid #000;">our products</a>.<br /><br /></span>
    </div>
    <div id="pd3d_data" class="spinoff_pane">
        <p>Automatically combined phase diagrams</p><span class="extd href">Show more info...</span><span class="legend" style="display:none">The 3d <a href="#search/phase%20diagram%20prism">prisms</a> and <a href="#search/phase%20diagram%20tetrahedron">tetrahedra</a> were automatically combined and rendered by the platform from the suitable <a href="#search/binary%20phase%20diagram">binary</a> and (or) <a href="#search/ternary%20phase%20diagram">ternary</a> phase diagrams.<br /><br /></span>
    </div>
    <div id="deactivated_data" class="spinoff_pane">
        <p>This entry was deactivated due to the quality issues detected.</p>
    </div>

    <ul>
        <li id="visualize" class="wmbutton">Visualize</li>
        <!-- li id="xrpdize" class="wmbutton">Show XRPD</li -->
        <!-- li id="absolidize" class="wmbutton"><span class="active">Simulate</span><span class="disabled">Added to <span class="href">my data</span>.</span></li -->
        <li id="download_pdf" class="d_icon"><a rel="pdf" href="#" target="_blank" title="Get HTML / PDF document" rel="nofollow"></a></li>
        <li id="download_json" class="d_icon"><a rel="json" href="#" target="_blank" title="Get machine-readable JSON file" rel="nofollow"></a></li>
        <li id="download_png" class="d_icon"><a rel="png" href="#" target="_blank" title="Get PNG raster image" rel="nofollow"></a></li>
        <li id="download_cif" class="d_icon"><a rel="cif" href="#" target="_blank" title="Get CIF structure" rel="nofollow"></a></li>
        <li id="download_inp" class="d_icon"><a rel="inp" href="#" target="_blank" title="Get VASP ab initio simulation input" rel="nofollow"></a></li>
        <li id="download_cdr" class="d_icon"><a rel="cdr" href="#" target="_blank" title="Get CorelDRAW vector image" rel="nofollow"></a></li>
        <li id="download_bib" class="d_icon"><a rel="bib" href="#" target="_blank" title="Get original citation" rel="nofollow"></a></li>
        <li id="download_raw" class="d_icon"><a rel="raw" href="#" target="_blank" title="Get raw calculation data" rel="nofollow"></a></li>
    </ul>

    <br /><br />
</div>

<!-- LEFT INDIVIDUAL ID COLUMN -->
<div id="ind_col" class="side_cols">
    <div class="col_title" id="ind_title"></div>
    <span></span>
    <p>Permanent link:<br /><a id="ind_link"></a></p>
    <div id="phase_info"></div>
</div>

<!-- LEFT PLOTTING COLUMN -->
<div id="visavis_col" class="side_cols">
    <div class="col_title">Plot type</div>
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
        <div class="col_title">Comparison</div>
        <select id="select_cmp_trigger"></select>
    </div>

    <div id="ctxpanel_plots">
        <div id="ctxpanel_matrix" class="ctxpanel">
            <div class="col_title">Sorting <div id="ss_gear_matrix" class="gear"></div></div>
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
            <div class="col_title">Sorting <div id="ss_gear_cube" class="gear"></div></div>
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
            <div class="col_title">Node type</div>
            <ul>
                <li id="visgraph_props">physical properties</li>
                <li id="visgraph_aetypes">polyhedral types</li>
                <li id="visgraph_lattices">crystal systems</li>
                <li id="visgraph_articles">publications</li>
                <li id="visgraph_geos">countries</li>
            </ul>
        </div>

        <div id="ctxpanel_discovery" class="ctxpanel">
            <div class="col_title">Active axes</div>
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
    <div class="col_title">View</div>

    <div class="controlswitch">
        <div id="control_a">entries</div><div id="control_b">phases</div><div id="control_f">articles</div>
    </div>

    <div class="controlswitch">
        <div id="control_c">table</div><div id="control_d">previews</div><div id="control_e">plots</div>
    </div>

    <ul id="interpret"></ul>

    <div id="dtypes">
        <div class="col_title">Data types</div>
        <ul>
            <li class="fct_props dtypes_props" data-facet="props" data-term="crystal structure">crystal structures</li>
            <li class="fct_props dtypes_props" data-facet="props" data-term="phase diagram">phase diagrams</li>
            <li class="fct_props dtypes_props" data-facet="props" data-term="physical properties">physical properties</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="peer-reviewed" style="margin-top:15px;">peer-reviewed experimental</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="machine-learning">machine learning</li>
            <li class="fct_classes dtypes_classes" data-facet="classes" data-term="ab initio calculations">ab initio modeling</li>
        </ul>
    </div>

    <div id="dtypes_phid" style="display:none;">
        <div class="col_title">This phase</div>
        <ul>
            <li class="fct_props dtypes_props" data-rankfilter="5">crystal structures</li>
            <li class="fct_props dtypes_props" data-rankfilter="3">phase diagrams</li>
            <li class="fct_props dtypes_props" data-rankfilter="0,1,2,4,7,8,9,10">physical properties</li>
            <li class="fct_classes dtypes_classes" data-rankfilter="0,1,2,3,4,5" style="margin-top:15px;">peer-reviewed experimental</li>
            <li class="fct_classes dtypes_classes" data-rankfilter="7">machine learning</li>
            <li class="fct_classes dtypes_classes" data-rankfilter="8,9,10">ab initio modeling</li>
        </ul>
    </div>

    <div id="history">
        <div class="col_title">Last searches</div>
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

    <a id="sim_trigger" href="#" class="wmbutton sim_col_ctx" rel="nofollow">Show more</a>

    <div id="pd_legend" class="sim_col_ctx">
        <div class="col_title">Color legend</div>
        <ul>
            <li><span style="background:#9cf;">liquid or gas</span></li>
            <li><span style="background:#d1cde6;">1-phase</span></li>
            <li><span style="background:#ddd;">2-phase</span></li>
            <li><span style="background:#fc6;">3-phase</span></li>
            <li><span style="background:#FCD3C2;">4-phase</span></li>
            <li><span style="background:#CCE7D4;">5-phase</span></li>
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
            <div class="advs_legend" data-multiselects="classes"><i>e.g.</i> <a href="#" tabindex="-1">hydride, nonmetal</a> or <a href="#" tabindex="-1">olivine, ternary</a></div>
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
    <div class="notice">or email <span class="href" rel="#modal/factor">an access code</span><br />or log in with <a href="oauth/github.html" rel="nofollow noopener noreferrer">GitHub</a> or <a href="oauth/orcid.html" rel="nofollow noopener noreferrer">ORCID</a> or <a href="oauth/linkedin.html" rel="nofollow noopener noreferrer">LinkedIn</a></div>
</div>

<!-- FACTOR MODAL -->
<div id="factorbox" class="modal user_dialogue">
    <div class="cross close_user_dialogue"></div>
    <br />

    <div id="factor_form_step_one" style="display:block;">
    <div><label for="factor_by_email">Email:</label></div>
    <input type="email" id="factor_by_email" class="submitter" maxlength="100" autocomplete="off" />
    </div>

    <div id="factor_form_step_two" style="display:none;">
        <input class="factor_form_resp" id="factor_form_resp_0" type="number" maxlength="1" />
        <input class="factor_form_resp" id="factor_form_resp_1" type="number" maxlength="1" />
        <input class="factor_form_resp" id="factor_form_resp_2" type="number" maxlength="1" />
        <input class="factor_form_resp" id="factor_form_resp_3" type="number" maxlength="1" />
        <input class="factor_form_resp" id="factor_form_resp_4" type="number" maxlength="1" />
        <input class="factor_form_resp" id="factor_form_resp_5" type="number" maxlength="1" />
    </div>

    <div style="width:150px;margin:25px auto;">
        <div id="factor_trigger" class="wmbutton def_submittable">Send code</div>
    </div>
    <div class="notice">or log in with <span class="href" rel="#modal/login">password</span><br />or with <a href="oauth/github.html" rel="nofollow noopener noreferrer">GitHub</a> or <a href="oauth/orcid.html" rel="nofollow noopener noreferrer">ORCID</a> or <a href="oauth/linkedin.html" rel="nofollow noopener noreferrer">LinkedIn</a></div>
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
    <div class="notice">or log in with <span class="href" rel="#modal/login">password</span><br />or with <a href="oauth/github.html" rel="nofollow noopener noreferrer">GitHub</a> or <a href="oauth/orcid.html" rel="nofollow noopener noreferrer">ORCID</a> or <a href="oauth/linkedin.html" rel="nofollow noopener noreferrer">LinkedIn</a></div>
</div>

<!-- USER MENU MODAL -->
<div id="menubox" class="modal user_dialogue">
    <ul id="tab_links">
        <li rev="usr_tab_account" class="working">account</li>
        <li rev="usr_tab_perms">data access</li>
        <li rev="usr_tab_api_key" class="only_regular">API key</li>
        <!-- li rev="usr_tab_clmns">entries table</li -->
        <!-- li rev="usr_tab_absolidix" class="only_regular only_mpds">my data</li -->
        <li rev="usr_tab_ctrl" style="display:none;" class="admin">management</li>
    </ul>

    <div id="usr_tab_account" class="menu_tabs">
        <div class="cross close_user_dialogue" style="margin-top:25px;"></div>
        <div style="clear:both;"></div>
        <div class="divider"></div>

        <div id="account_holder_name"></div>
        <div id="account_holder_acclogin">Login: <span></span></div>
        <div id="account_holder_accpass">Password: <span id="accpass_trigger"></span></div>

        <div id="account_pass_change" style="display:none;">
            <div id="account_pass_hint">MPDS password is optional.<br />If none, other ways to log in can be used.</div>

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
            <div id="logout_trigger" class="wmbutton">Logout</div>
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

    <!-- div id="usr_tab_clmns" class="menu_tabs" style="display:none;">
        <div class="cross close_user_dialogue" style="margin-top:25px;"></div>
        <div style="clear:both;"></div>
        <div class="divider"></div>

        <div class="clmns"><input type="checkbox" id="clmns_entry" />&nbsp;<label for="clmns_entry">ID</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_formula" />&nbsp;<label for="clmns_formula">Formula</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_anon" />&nbsp;<label for="clmns_anon">Anonymous formula</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_proto" />&nbsp;<label for="clmns_proto">Prototype</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_phase" />&nbsp;<label for="clmns_phase">Distinct phase</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_prop" />&nbsp;<label for="clmns_prop">Property</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_value" />&nbsp;<label for="clmns_value">Value</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_t" />&nbsp;<label for="clmns_t">Temperature</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_spg" />&nbsp;<label for="clmns_spg">Space group</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_cond" />&nbsp;<label for="clmns_cond">Conditions</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_rank" />&nbsp;<label for="clmns_rank">Entry rank</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_coden" />&nbsp;<label for="clmns_coden">J. code</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_year" />&nbsp;<label for="clmns_year">Year</label></div>
        <div class="clmns"><input type="checkbox" id="clmns_bid" />&nbsp;<label for="clmns_bid">Ref.</label></div>
    </div -->

    <div id="usr_tab_absolidix" class="menu_tabs" style="display:none;">
        <br /><br /><br /><br />Redirecting...<br /><br /><br /><br />
    </div>

    <div id="usr_tab_ctrl" class="menu_tabs" style="display:none;">
        <br /><br /><br /><br />Redirecting...<br /><br /><br /><br />
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
<div id="visavis"><iframe id="visavis_iframe" frameborder=0 scrolling="no" width="100%" height="100%"></iframe></div>

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

<div id="footer">Editor-in-Chief: R. Caputo. Section editors: K. Cenzual, I. Savysyuk, R. Caputo. <a href="https://github.com/mpds-io">Open-source</a> development by <a href="https://tilde.pro" target="_blank">Tilde MI</a>. Dark mode is <span id="darkmode_trigger" style="border-bottom:1px solid #555;cursor:pointer;"></span>.</div>

<!-- CROSS-SITE COMMS -->
<iframe id="comms" src="https://app.absolidix.com/comms.html" style="width:0;height:0;border:none;position:absolute;"></iframe>
<!-- iframe id="comms" src="http://localhost:5000/comms.html" style="width:0;height:0;border:none;position:absolute;"></iframe -->
`);
}
