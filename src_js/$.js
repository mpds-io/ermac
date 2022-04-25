(function () {
    $l = window.$l = function (object) {
        if (typeof object === 'function') {
            var functionsToInvokes = functionsToInvokes || [];
            functionsToInvokes.push(object);
            document.addEventListener('DOMContentLoaded', function () {
                for (var i = 0; i < functionsToInvokes.length; i++) {
                    functionsToInvokes[i]();
                }
            });
            return;
        }

        if (object instanceof HTMLElement) {
            return new DOMNodeCollection([object]); // DOMNodeCollection
        }

        var selector = object; // a string that represents a selector

        var HTMLElements = document.querySelectorAll(selector); // grab all HTMLElements on the page
        HTMLElements = nodeCollectionToArray(HTMLElements); // convert from a NodeList to an Array
        return new DOMNodeCollection(HTMLElements); // pass into constructor and return a DOMNodeCollection object;
    };

    $l.ajax = function (options) { // options is an object
        var defaultFn = function () { };

        var masterOptions = {
            success: defaultFn,
            error: defaultFn,
            url: '',
            method: 'GET',
            data: null,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
        };

        $l.extend(masterOptions, options);

        var success = masterOptions.success;
        var error = masterOptions.error;
        var url = masterOptions.url;
        var method = masterOptions.method;
        var data = masterOptions.data;
        var contentType = masterOptions.contentType;

        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', success);
        oReq.addEventListener('error', error);
        oReq.open(method, url);
        if (data === null) {
            oReq.send();
        } else {
            oReq.send(data);
        }

    };

    // helper function for use within $l.ajax()
    $l.extend = function () {
        if (arguments.length === 0) {
            return new Error('No arguments passed');
        }
        var master = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            var object = arguments[i];
            for (prop in object) {
                master[prop] = object[prop];
            }
        }
    };

    function nodeCollectionToArray(nodeCollection) {
        var convertedArr = [];

        for (var i = 0; i < nodeCollection.length; i++) {
            var node = nodeCollection[i];
            convertedArr.push(node);
        }
        return convertedArr;
    }

    DOMNodeCollection = window.DOMNodeCollection = function (HTMLElements) {
        this.HTMLElements = nodeCollectionToArray(HTMLElements);
    };

    DOMNodeCollection.prototype.addClass = function (className) {
        for (var i = 0; i < this.HTMLElements.length; i++) {
            this.HTMLElements[i].classList.add(className);
        }
    };

    DOMNodeCollection.prototype.append = function (object) {
        // object is a DOMNodeCollection, HTMLElement, or string
        if (object instanceof DOMNodeCollection) {
            if (object.HTMLElements.length > 1) {
                try {
                    throw new Error('DOMNodeCollection is greater than one');
                } catch (e) {
                    console.log(e.message);
                    return;
                }
            }
        }

        if (object instanceof HTMLElement) {
            this.HTMLElements.forEach(function (HTMLElement, idx, array) {
                HTMLElement.appendChild(object);
            });
            return;
        }

        this.HTMLElements.forEach(function (HTMLElement, idx, array) {
            HTMLElement.innerHTML = object;
        });
    };

    DOMNodeCollection.prototype.attr = function (attrName, value) {
        var HTMLElement = this.HTMLElements[0];
        if (value === undefined) {
            // gets the value of a given attribute for the first node within the DOMNodeCollection
            return HTMLElement.getAttribute(attrName);
        } else {
            // sets the value of a given attribute for the first node within the DOMNodeCollection
            return HTMLElement.setAttribute(attrName, value);
        }
    };

    // returns DOMNodeCollection of all children of all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.children = function () {
        var children = [];
        for (var i = 0; i < this.HTMLElements.length; i++) {
            children.push(this.HTMLElements[i].children);
        }
        return new DOMNodeCollection(children);
    };

    // returns a DOMNodeCollection of all nodes that match the selector
    DOMNodeCollection.prototype.find = function (selector) {
        var foundElements = [];
        for (var i = 0; i < this.HTMLElements.length; i++) {
            var HTMLElement = this.HTMLElements[i];
            var HTMLElements = HTMLElement.querySelectorAll(selector);

            // move HTMLElements from NodeList to an array.
            for (var j = 0; j < HTMLElements.length; j++) {
                foundElements.push(HTMLElements[i]);
            }
        }

        return new DOMNodeCollection(foundElements);
    };

    // clears all HTML from all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.empty = function () {
        this.HTMLElements.forEach(function (HTMLElement, idx, array) {
            HTMLElement.innerHTML = '';
        });
    };

    // replaces the HTML property of all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.html = function (str) {
        if (str === undefined) {
            return this.HTMLElements[0].innerHTML;
        }

        this.HTMLElements.forEach(function (HTMLElement, idx, array) {
            HTMLElement.innerHTML = str;
        });
    };

    // removes the eventListener from all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.off = function (eventType, callback) {
        for (var i = 0; i < this.HTMLElements.length; i++) {
            this.HTMLElements[i].removeEventListener(eventType, callback);
        }
    };

    // adds an eventListener to all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.on = function (eventType, callback) {
        for (var i = 0; i < this.HTMLElements.length; i++) {
            this.HTMLElements[i].addEventListener(eventType, callback);
        }
    };

    // returns collection of all parents of all nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.parent = function () {
        var parents = [];
        for (var i = 0; i < this.HTMLElements.length; i++) {
            var HTMLElement = this.HTMLElements[i];
            parents.push(HTMLElement.parentElement);
        }

        return new DOMNodeCollection(parents);
    };

    // removes all nodes within the DOMNodeCollection from the DOM
    DOMNodeCollection.prototype.remove = function () {
        for (var i = 0; i < this.HTMLElements.length; i++) {
            var HTMLElement = this.HTMLElements[i];
            HTMLElement.parentNode.removeChild(HTMLElement);
        }
    };

    // removes a class from all of the nodes within the DOMNodeCollection
    DOMNodeCollection.prototype.removeClass = function (className) {
        for (var i = 0; i < this.HTMLElements.length; i++) {
            this.HTMLElements[i].classList.remove(className);
        }
    };
})();