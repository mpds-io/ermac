
// spin-off from https://github.com/Pixabay/JavaScript-autoComplete

wmgui.create_autocomplete = (function(){
    function autoComplete(options){
        if (!document.querySelector) return;

        // helpers
        function hasClass(el, className){ return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className); }

        function addEvent(el, type, handler){
            if (el.attachEvent) el.attachEvent('on' + type, handler);
            else el.addEventListener(type, handler);
        }
        function removeEvent(el, type, handler){
            // if (el.removeEventListener) not working in IE11
            if (el.detachEvent) el.detachEvent('on' + type, handler);
            else el.removeEventListener(type, handler);
        }
        function live(elClass, event, cb, context){
            addEvent(context || document, event, function(e){
                var found, el = e.target || e.srcElement;
                while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
                if (found) cb.call(el, e);
            });
        }

        var o = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            cache: 1,
            menuClass: '',
            renderItem: function (item, search){},
            onSelect: function(e, term, item){},
            arrow_pressed: false,
            custom_type: false
        };
        for (var k in options){ if (options.hasOwnProperty(k)) o[k] = options[k]; }

        // init
        var that = document.getElementById(o.selector),
            fct_type = that.getAttribute("rel");

        // create suggestions container "sc"
        that.sc = document.createElement('div');
        that.sc.className = 'autocomplete-suggestions ' + o.menuClass;

        that.autocompleteAttr = that.getAttribute('autocomplete');
        that.setAttribute('autocomplete', 'off');
        that.cache = {};
        that.last_val = '';

        that.updateSC = function(resize, next){
            var rect = that.getBoundingClientRect();
            that.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + o.offsetLeft) + 'px';
            that.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + o.offsetTop) + 'px';
            that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth
            if (!resize){
                that.sc.style.display = 'block';
                if (!that.sc.maxHeight){ that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
                if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight;
                if (that.sc.suggestionHeight)
                    if (!next) that.sc.scrollTop = 0;
                    else {
                        var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
                        if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
                            that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
                        else if (selTop < 0)
                            that.sc.scrollTop = selTop + scrTop;
                    }
            }
        }
        addEvent(window, 'resize', that.updateSC);
        document.body.appendChild(that.sc);

        live('autocomplete-suggestion', 'mouseleave', function(e){
            var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
            if (sel) setTimeout(function(){ sel.className = sel.className.replace('selected', '') }, 20);
        }, that.sc);

        live('autocomplete-suggestion', 'mouseover', function(e){
            var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
            if (sel) sel.className = sel.className.replace('selected', '');
            this.className += ' selected';

            // account aetypes aetmap
            if (o.custom_type == 'aetypes' && show_aetmap) show_aetmap(this.innerText);
        }, that.sc);

        live('autocomplete-suggestion', 'mousedown', function(e){
            if (hasClass(this, 'autocomplete-suggestion')){ // else outside click
                var v = this.getAttribute('data-val');
                that.value = v;
                o.onSelect(e, v, this);
                that.sc.style.display = 'none';
            }
        }, that.sc);

        that.blurHandler = function(){
            try { var over_sb = document.querySelector('.autocomplete-suggestions:hover'); } catch(e){ var over_sb = 0; }
            if (!over_sb){
                that.last_val = that.value;
                that.sc.style.display = 'none';
                setTimeout(function(){ that.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
            } else if (that !== document.activeElement) setTimeout(function(){ that.focus() }, 20);
        };
        addEvent(that, 'blur', that.blurHandler);

        var suggest = function(data){
            o.arrow_pressed = false;
            var val = that.value;
            that.cache[val] = data;
            if (data.length && val.length >= o.minChars){
                var s = '';
                for (var i = 0; i < data.length; i++) s += o.renderItem(data[i], val);
                that.sc.innerHTML = s;
                that.updateSC(0);
            }
            else
                that.sc.style.display = 'none';
        }

        that.keydownHandler = function(e){
            var key = window.event ? e.keyCode : e.which;
            // down (40), up (38)
            if ((key == 40 || key == 38) && that.sc.innerHTML){
                o.arrow_pressed = true;
                var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (!sel){
                    next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
                    next.className += ' selected';
                    that.value = next.getAttribute('data-val');
                } else {
                    next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                    if (next){
                        sel.className = sel.className.replace('selected', '');
                        next.className += ' selected';
                        that.value = next.getAttribute('data-val');
                    }
                    else {
                        sel.className = sel.className.replace('selected', '');
                        that.value = that.last_val;
                        next = 0;
                    }
                }
                that.updateSC(0, next);
                return false;
            }
            // esc
            else if (key == 27){ that.value = that.last_val; that.sc.style.display = 'none'; }
            // enter
            else if (key == 13 || key == 9){
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel && that.sc.style.display != 'none' && o.arrow_pressed){
                    o.onSelect(e, sel.getAttribute('data-val'), sel);
                    that.sc.style.display = 'none';
                    //setTimeout(function(){ that.sc.style.display = 'none'; }, 20);
                }
            }
        };
        addEvent(that, 'keydown', that.keydownHandler);

        that.keyupHandler = function(e){
            var key = window.event ? e.keyCode : e.which;
            if (!key || (key < 35 || key > 40) && key != 13 && key != 27){
                var val = that.value;
                if (val.length >= o.minChars){
                    if (val != that.last_val){
                        that.last_val = val;
                        clearTimeout(that.timer);
                        if (o.cache){
                            if (val in that.cache){ suggest(that.cache[val]); return; }
                            // no requests if previous suggestions were empty
                            for (var i=1; i<val.length-o.minChars; i++){
                                var part = val.slice(0, val.length-i);
                                if (part in that.cache && !that.cache[part].length){ suggest([]); return; }
                            }
                        }
                        that.timer = setTimeout(function(){ o.source(val, fct_type, suggest) }, o.delay);
                    }
                } else {
                    that.last_val = val;
                    that.sc.style.display = 'none';
                }
            }
        };
        addEvent(that, 'keyup', that.keyupHandler);

        that.focusHandler = function(e){
            that.last_val = '\n';
            that.keyupHandler(e);
        };
        if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
    }
    return autoComplete;
})();