
"use strict";

var wmgui = window.wmgui || {};

function satisfy_requirements(){

    $('#notifybox, #preloader').hide();
    //document.title = document.body.clientWidth + ' px';

    local_user_login();

    // building history box
    var history_html = '';
    $.each(JSON.parse(window.localStorage.getItem('wm_search_log_v4') || '[]'), function(n, past){
        wmgui.tooltip_var++;
        if (n > 7) return false;
        var title = [];
        for (var prop in past){ title.push(past[prop]) }
        title = title.join(" ");
        var inquiry = false;
        $.each(wmgui.inquiries, function(m, i){ if (past[i]){   inquiry = true; return false;   } });

        if (inquiry) history_html += '<li><a href="#inquiry/' + $.param(past) + '">' + title + '</a></li>';
        else         history_html += '<li><a href="#search/' + escape(title) + '">' + title + '</a></li>';
    });
    $('#history ul').append(history_html);

    $.each(JSON.parse(window.localStorage.getItem('bid_history') || '[]'), function(n, i){
        wmgui.bid_history.push(parseInt(i));
    });

    // set client-side data features
    $.getJSON(wmgui.client_data_addr, function(answer){

        WMCORE = WMCORE(answer.classes, answer.props, answer.props_ref);

        var i = 0, len = answer.props_ref.length;
        for (i; i < len; i++){
            if (!answer.props_ref[i]) answer.props_ref[i] = answer.props[i];
        }

        answer.classes.extend(answer.classes_ite);

        // local search algo
        // #1
        $.each(['props', 'lattices', 'sgs', 'protos', 'codens', 'geos', 'orgs'], function(idx, fct){
            wmgui.create_autocomplete({
                custom_type: fct,
                selector: 'advs_fct_' + fct, minChars: 1, cache: 1,
                source: function(term, fct_type, suggest){
                    // other names are used, define them first here
                    var fct_src = fct_type,
                        fct_chk = fct_type,
                        anypos = false;

                    if (fct_type !== 'lattices'){
                        anypos = true;
                        if (fct_type == 'props') fct_src = 'props_ref';
                        else if (fct_type == 'codens'){
                            fct_src = 'jfull';
                            fct_chk = 'jfull';
                        }
                    }

                    var suggestions = [],
                        cnt = 0,
                        checks = [],
                        i = 0,
                        len = answer[fct_chk].length;

                    term = term.toLowerCase();
                    for (i; i < len; i++){
                        if (answer[fct_chk][i].toLowerCase().startswith(term)){
                            suggestions.push(answer[fct_src][i]);
                            if (anypos) checks.push(answer[fct_src][i]);
                            cnt++;
                            if (cnt > 12) break;
                        }
                    }
                    if (anypos && suggestions.length < 6){
                        for (i = 0; i < len; i++){
                            if (answer[fct_chk][i].toLowerCase().indexOf(term) != -1 && checks.indexOf(answer[fct_src][i]) == -1){
                                suggestions.push(answer[fct_src][i]);
                                cnt++;
                                if (cnt > 12) break;
                            }
                        }
                    }
                    suggest(suggestions);
                },
                renderItem: function (item, search){
                    return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item + '</div>';
                }
            });
        });

        // local search algo
        // #2
        $.each(wmgui.multi_facets, function(idx, fct){
            wmgui.multiselects[fct] = $('#advs_fct_' + fct).selectize({
                plugins: ['remove_button', 'preserve_on_blur'],
                valueField: 'id',
                labelField: 'label',
                searchField: 'label',
                create: false,
                highlight: false,
                maxItems: 5,
                closeAfterSelect: true,
                diacritics: false,
                options: [],
                onChange: function(value){
                    if (fct == 'aetypes'){
                        var term = (wmgui.multiselects['aetypes'].read()['aetypes'] || "").split(', ').pop();
                        show_aetmap(term);
                        if ($('#aet_limit').is(':checked')) $('#aet_limit').trigger('click');
                    }
                },
                onItemRemove: function(value){
                    var input = this;
                    setTimeout(function(){
                        input.close();
                    }, 750);
                },
                load: function(term, callback){
                    this.clearOptions();
                    if (!term.length) return callback();

                    var suggestions = [],
                        cnt = 0,
                        checks = [],
                        i = 0,
                        len = answer[fct].length;

                    term = term.toLowerCase();
                    for (i; i < len; i++){
                        if (answer[fct][i].toLowerCase().startswith(term)){
                            suggestions.push({'facet': fct, 'label': answer[fct][i], 'id': fct + i});
                            checks.push(answer[fct][i]);
                            cnt++;
                            if (cnt > 12) break;
                        }
                    }
                    if (suggestions.length < 6){
                        for (i = 0; i < len; i++){
                            if (answer[fct][i].toLowerCase().indexOf(term) != -1 && checks.indexOf(answer[fct][i]) == -1){
                                suggestions.push({'facet': fct, 'label': answer[fct][i], 'id': fct + i});
                                cnt++;
                                if (cnt > 12) break;
                            }
                        }
                    }
                    callback(suggestions);
                },
                score: function(){ return function(){ return 1 } }, // no client scoring
                render: {
                    option: function(item, escape){
                        return '<div class="fct_' + item.facet + '">' + item.label + '</div>';
                    },
                    item: function(item, escape){
                        return '<div class="fct_' + item.facet + '" data-facet="' + item.facet + '" data-term="' + item.label + '">' + item.label + '</div>';
                    }
                }
            })[0].selectize;

            wmgui.multiselects[fct].read = function(){
                return wmgui._selectize_read(fct);
            }
            wmgui.multiselects[fct].write = function(search_obj){
                wmgui._selectize_write(wmgui.multiselects[fct], fct, search_obj);
            }
            wmgui.multiselects[fct].display = function(facet, term){
                wmgui._selectize_display(wmgui.multiselects[fct], facet, term);
            }
        });

        wmgui.journal_converter.j2c = function(x){
            var fi = answer.jfull.indexOf(x);
            if (fi == -1){
                wmgui.notify("Unknown journal: " + x);
                return x;
            }
            return answer.codens[fi];
        }
        wmgui.journal_converter.c2j = function(x){
            var fi = answer.codens.indexOf(x);
            if (fi == -1){
                wmgui.notify("Unknown CODEN: " + x);
                return x;
            }
            return answer.jfull[fi];
        }

        var html_scalars = '',
            html_complex = '',
            html_textual = '',
            counter = 0;

        $.each(answer.hy_scalars, function(term, content){
            term = parseInt(term);
            //console.log(term);
            term = answer.props_ref[term] ? answer.props_ref[term] : answer.props[term];
            //console.log(term);
            counter += 1;
            html_scalars += '<li><a class="dynprop" data-val="' + term + '" href="#inquiry/props=' + term.replace(/ /g, '+') + '">' + term + '</a> (<span class="hy' + counter + '">expand</span>)<ul style="display:none;">';
            $.each(content, function(sub_term, sub_content){
                sub_term = parseInt(sub_term);
                //console.log(sub_term);
                sub_term = answer.props_ref[sub_term] ? answer.props_ref[sub_term] : answer.props[sub_term];
                //console.log('----' + sub_term);
                html_scalars += '<li><a class="dynprop" data-val="' + sub_term + '" href="#inquiry/props=' + sub_term.replace(/ /g, '+') + '">' + sub_term + '</a><ul style="display:none;">';
                $.each(sub_content, function(n, item){
                    item = parseInt(item);
                    var prop = answer.props_ref[item] ? answer.props_ref[item] : answer.props[item],
                        specs = answer.numerics[item]; // NB object vs. array
                    //console.log('---------' + item + ' ' + prop);
                    html_scalars += '<li><a class="dynprop" data-val="' + prop + '" href="#inquiry/props=' + prop.replace(/ /g, '+') + '">' + prop + '</a>';
                    if (specs){
                        html_scalars += '<strong class="numeric" title="Numeric search" rel="' + prop + '">' + (specs[0] || '') + ' &nbsp;[' + specs[1] + ' &mdash; ' + specs[2] + ']&nbsp;&#x1F50D;</strong>';
                        wmgui.numerics[prop] = [item, specs[0], specs[1], specs[2], specs[3]]; // prop_name: [client_prop_id, units, min, max, ?step, ?origname]
                    }
                    html_scalars += '</li>';
                });
                html_scalars += '</ul></li>';
            });
            html_scalars += '</ul></li>';
        });
        $('#hy_scalars > ul').append(html_scalars);

        $.each(wmgui.hy_complex, function(n, item){
            html_complex += '<li><a class="dynprop" data-val="' + item + '" href="#search/' + item + '">' + item + '</a></li>';
        });
        $('#hy_complex > ul').append(html_complex);

        $.each(answer.hy_textual, function(term, content){
            term = parseInt(term);
            term = answer.props_ref[term] ? answer.props_ref[term] : answer.props[term];
            counter += 1;
            html_textual += '<li><a class="dynprop" data-val="' + term + '" href="#inquiry/props=' + term.replace(/ /g, '+') + '">' + term + '</a> (<span class="hy' + counter + '">expand</span>)<ul style="display:none;">';
            $.each(content, function(sub_term, sub_content){
                sub_term = parseInt(sub_term);
                sub_term = answer.props_ref[sub_term] ? answer.props_ref[sub_term] : answer.props[sub_term];
                html_textual += '<li><a class="dynprop" data-val="' + sub_term + '" href="#inquiry/props=' + sub_term.replace(/ /g, '+') + '">' + sub_term + '</a><ul style="display:none;">';
                $.each(sub_content, function(n, item){
                    item = parseInt(item);
                    item = answer.props_ref[item] ? answer.props_ref[item] : answer.props[item];
                    html_textual += '<li><a class="dynprop" data-val="' + item + '" href="#inquiry/props=' + item.replace(/ /g, '+') + '">' + item + '</a></li>';
                });
                html_textual += '</ul></li>';
            });
            html_textual += '</ul></li>';
        });
        $('#hy_textual > ul').append(html_textual);

        wmgui.create_autocomplete({
            selector: 'hy_suggest', minChars: 1, cache: 1,
            source: function(term, fct_type, suggest){
                var fct_src = 'props_ref',
                    term = term.toLowerCase(),
                    suggestions = [],
                    cnt = 0,
                    checks = [],
                    i = 0,
                    len = answer[fct_type].length;
                for (i; i < len; i++){
                    if (answer[fct_type][i].startswith(term)){
                        suggestions.push(answer[fct_src][i]);
                        checks.push(answer[fct_src][i]);
                        cnt++;
                        if (cnt > 18) break;
                    }
                }
                if (suggestions.length < 6){
                    for (i = 0; i < len; i++){
                        if (answer[fct_type][i].indexOf(term) != -1 && checks.indexOf(answer[fct_src][i]) == -1){
                            suggestions.push(answer[fct_src][i]);
                            cnt++;
                            if (cnt > 18) break;
                        }
                    }
                }
                suggest(suggestions);
            },
            renderItem: function (item, search){
                return '<div class="autocomplete-suggestion" style="' + (wmgui.numerics[item] ? 'color:#c00' : '') + '" data-val="' + item + '">' + item + '</div>';
            },
            onSelect: function (e, term, item){
                var numerics = wmgui.numerics[term];

                if ($('#numericbox').is(':visible') && numerics)
                    create_floating_slider(term, numerics[0], numerics[1], numerics[2], numerics[3], numerics[4]);
                else
                    window.location.hash = wmgui.aug_search_cmd("props", term);

                $('#hy_suggest').val('');
            }
        });

        rotate_interesting();
        setInterval(rotate_interesting, 2000);

        window.location.hash ? url_redraw_react() : window.location.replace('#start');
    });

    // set server-side data features
    wmgui.multiselects['main'] = $('#search_field').selectize({
        plugins: ['remove_button', 'preserve_on_blur'],
        valueField: 'id',
        labelField: 'label',
        searchField: 'label',
        create: false,
        highlight: false,
        maxItems: 10,
        closeAfterSelect: true,
        diacritics: false,
        options: [],
        onInitialize: function(){
            $('#search_field-selectized').focus();
        },
        onItemRemove: function(value){
            var check = wmgui.multiselects['main'].read(),
                input = this;
            if (!check.numeric) destroy_numericbox();
            setTimeout(function(){
                input.close();
            }, 750);
        },
        load: function(query, callback){
            this.clearOptions();
            if (!query.length) return callback();
            $.ajax({
                url: wmgui.auto_endpoint + '?q=' + encodeURIComponent(query),
                type: 'GET',
                error: callback,
                success: function(res){
                    if (!res.length){
                        return;
                    }
                    callback(res);
                }
            });
        },
        score: function(){ return function(){ return 1 } }, // no client scoring
        render: {
            option: function(item, escape){
                return '<div class="fct_' + item.facet + '">' + item.label + '</div>';
            },
            item: function(item, escape){
                return '<div class="fct_' + item.facet + '" data-facet="' + item.facet + '" data-term="' + item.label + '">' + item.label + '</div>';
            }
        }
    })[0].selectize;

    wmgui.multiselects['main'].read = function(){
        return wmgui._selectize_read('main');
    }
    wmgui.multiselects['main'].write = function(search_obj){
        wmgui._selectize_write(wmgui.multiselects['main'], 'main', search_obj);
    }
    wmgui.multiselects['main'].display = function(facet, term){
        wmgui._selectize_display(wmgui.multiselects['main'], facet, term);
    }

    //create_floating_slider('density', 42, 'Mg/m<sup>3</sup>', 10, 900, 10);
    // EOF satisfy_requirements
}