/**
 * Equivalent to jQuery's ready() function.
 *
 * @see https://gomakethings.com/a-native-javascript-equivalent-of-jquerys-ready-method/
 * @param {function} fn - The callback function.
 * @return {void}
 */
LemonReady = function (fn) {
    if ('function' !== typeof fn) { // Sanity check
        return;
    }
    if (document.readyState === 'complete') {
        return fn();
    }
    document.addEventListener('DOMContentLoaded', fn, false);
};

/**
 * Find an element.
 *
 * @param {string|Object} selector - The css selector of the element.
 *                                   If object then it can either be document or an element.
 * @param {Object} parent - The parent element, or undefined for document.
 * @return {Object} - returns the Lemon object to allow chaining methods.
 */
class Lemon {
    constructor(selector, parent) {
        parent = parent || document;
        if ('object' === typeof selector) {
            this.el = (selector[0] && selector[0] instanceof Element) ? selector : [selector];
        } else if ('string' === typeof selector) {
            this.el = parent.querySelectorAll(selector);
        }

        // Convert ElementList to Array.
        this.el = [].slice.call(this.el);
        return this;
    }
    /**
     * Equivalent to jQuery's ready() function.
     *
     * @see https://gomakethings.com/a-native-javascript-equivalent-of-jquerys-ready-method/
     * @param {function} fn - The callback function.
     * @return {void}
     */
    ready(fn) {
        if ('function' !== typeof fn) {
            return;
        }
        if (document.readyState === 'complete') {
            return fn();
        }
        document.addEventListener('DOMContentLoaded', fn, false);
    }
    /**
     * Run a callback against located elements.
     *
     * @param {function} callback - The callback we want to run on each element.
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    each(callback) {
        var self = this;
        for (var i = 0; i < this.el.length; i++) {
            callback(self.el[i]);
        }
        return this;
    }
    /**
     * Find a selector inside elements.
     *
     * @param {string} selector - The css selector of the element.
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    find(selector) {
        let found = [];
        this.each(function (el) {
            let elFound = el.querySelectorAll(selector);
            if (elFound) {
                found = found.concat(elFound);
            }
        });
        return new Lemon(found);
    }
    /**
     * Add a class to elements.
     *
     * @param {string} className - The class-name we want to add to element(s).
     * @return {Object} - Returns the Lemon object to allow chaining methods.
     */
    addClass(className) {
        this.each(function (el) {
            el.classList.add(className);
        });
        return this;
    }
    /**
     * Remove a class from elements.
     *
     * @param {string} className - The class-name we want to add to element(s).
     * @return {Object} - Returns the Lemon object to allow chaining methods.
     */
    removeClass(className) {
        this.each(function (el) {
            el.classList.remove(className);
        });
        return this;
    }
    /**
     * Convert a string to camelCase.
     *
     * @param {string} string The string we want to convert.
     * @return {string} - Returns the string formatted in camelCase.
     */
    camelCase(string) {
        return string.replace(/-([a-z])/g, function (_all, letter) {
            return letter.toUpperCase();
        });
    }
    /**
     * Get the styles for a property, or change the value if one is defined.
     *
     * @param {string} property - The CSS property we're referencing.
     * @param {string|undefined} value - The value we want to assign, or undefined if we want to get the value.
     * @return {Object|string} - returns the Lemon object to allow chaining methods, OR the value if 2nd arg is undefined.
     */
    css(property, value) {
        if ('undefined' === typeof value) {
            return getComputedStyle(this.el[0])[property];
        }
        this.each(function (el) {
            el.style[Lemon.camelCase(property)] = value;
        });
        return 'undefined' === typeof value ? '' : this;
    }
    /**
     * Figure out if the element has a class or not.
     *
     * @param {string} className - The class-name we're looking for.
     * @return {boolean} - Whether the element has the class we need or not.
     */
    hasClass(className) {
        var found = false;
        this.each(function (el) {
            if (el.classList.contains(className)) {
                found = true;
            }
        });
        return found;
    }
    /**
     * Hide the element(s).
     *
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    hide() {
        this.each(function (el) {
            el.style.display = 'none';
        });
        return this;
    }
    /**
     * Show the element(s)
     *
     * @param {string} display - The css-display mode. Defaults to "block".
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    show(display) {
        display = display || 'block';
        this.each(function (el) {
            el.style.display = display;
        });
        return this;
    }
    /**
     * Get the direct parents of elements.
     *
     * @return {Object} - Returns the Lemon object to allow chaining methods.
     */
    parent(selector) {
        let found = [];
        this.each(function (el) {
            found = found.concat(el.parentNode);
        });
        return new Lemon(found);
    }
    /**
     * Get the parents based on a selector.
     *
     * @param {string} selector - The CSS selector.
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    parents(selector) {
        let found = [], self = this;
        this.each(function (el) {
            let elFound = self.parents(selector, el);
            if (elFound) {
                found = found.concat(elFound);
            }
        });
        return new Lemon(found);
    }
    // EVENTS -----------------------------------------------------
    /**
     * Handle events.
     *
     * @param {Function} method - for example addEventListener.
     * @param {string} events - The JS event we want to add a listener for.
     * @param {Function} listener - The function to add to the listener.
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    eventsHandler(method, events, listener) {
        var self = this;
        events.split(' ').forEach(function (event) {
            self.each(function (el) {
                method.call(el, event, listener, false);
            });
        });
        return this;
    }
    /**
     * Similar to jQuery.off().
     *
     * @param {string} event - The JS event we want to add a listener for.
     * @param {Function} listener - The function to add to the listener.
     * @return {void}
     */
    off(event, listener) {
        this.eventsHandler(removeEventListener, event, listener);
    }
    /**
     * Similar to jQuery.on().
     *
     * @param {string} event - The JS event we want to add a listener for.
     * @param {Function} listener - The function to add to the listener.
     * @return {Object} - returns the Lemon object to allow chaining methods.
     */
    on(event, listener) {
        this.eventsHandler(addEventListener, event, listener);
        return this;
    }

    static log() {
        return console.log(this);
    }
    static each(items, callback) {
        return items.length
            ? items.forEach(callback)
            : Object.entries(items).forEach(callback);
    }
}

function lemon(selector, parent) {
    return new Lemon(selector, parent);
}

// lemon.log = function () {
//     console.log(this);
// };
