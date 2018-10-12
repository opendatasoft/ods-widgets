(function() {
    'use strict';

    // add indexOf to old browsers
    if (!Array.prototype.indexOf) {
      Array.prototype.indexOf = function(elt /*, from*/)
      {
        var len = this.length >>> 0;

        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
          from += len;
        }

        for (; from < len; from++)
        {
          if (from in this &&
              this[from] === elt)
            return from;
        }
        return -1;
      };
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    if (!Array.prototype.filter)
    {
      Array.prototype.filter = function(fun /*, thisArg */)
      {
        if (this === void 0 || this === null)
          throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun != "function")
          throw new TypeError();

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++)
        {
          if (i in t)
          {
            var val = t[i];

            // NOTE: Technically this should Object.defineProperty at
            //       the next index, as push can be affected by
            //       properties on Object.prototype and Array.prototype.
            //       But that method's new, and collisions should be
            //       rare, so use the more-compatible alternative.
            if (fun.call(thisArg, val, i, t))
              res.push(val);
          }
        }

        return res;
      };
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    // Production steps of ECMA-262, Edition 5, 15.4.4.19
    // Reference: http://es5.github.io/#x15.4.4.19
    if (!Array.prototype.map) {

      Array.prototype.map = function(callback, thisArg) {

        var T, A, k;

        if (this === null) {
          throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this|
        //    value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal
        //    method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
          throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (arguments.length > 1) {
          T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len)
        //    where Array is the standard built-in constructor with that name and
        //    len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while (k < len) {

          var kValue, mappedValue;

          // a. Let Pk be ToString(k).
          //   This is implicit for LHS operands of the in operator
          // b. Let kPresent be the result of calling the HasProperty internal
          //    method of O with argument Pk.
          //   This step can be combined with c
          // c. If kPresent is true, then
          if (k in O) {

            // i. Let kValue be the result of calling the Get internal
            //    method of O with argument Pk.
            kValue = O[k];

            // ii. Let mappedValue be the result of calling the Call internal
            //     method of callback with T as the this value and argument
            //     list containing kValue, k, and O.
            mappedValue = callback.call(T, kValue, k, O);

            // iii. Call the DefineOwnProperty internal method of A with arguments
            // Pk, Property Descriptor
            // { Value: mappedValue,
            //   Writable: true,
            //   Enumerable: true,
            //   Configurable: true },
            // and false.

            // In browsers that support Object.defineProperty, use the following:
            // Object.defineProperty(A, k, {
            //   value: mappedValue,
            //   writable: true,
            //   enumerable: true,
            //   configurable: true
            // });

            // For best browser support, use the following:
            A[k] = mappedValue;
          }
          // d. Increase k by 1.
          k++;
        }

        // 9. return A
        return A;
      };
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
    if (!String.prototype.trim) {
      String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
      };
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
    if (!Object.keys) {
        Object.keys = (function () {
            var hasOwnProperty = Object.prototype.hasOwnProperty,
                hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
                dontEnums = [
                    'toString',
                    'toLocaleString',
                    'valueOf',
                    'hasOwnProperty',
                    'isPrototypeOf',
                    'propertyIsEnumerable',
                    'constructor'
                ],
                dontEnumsLength = dontEnums.length;

            return function (obj) {
                if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                    throw new TypeError('Object.keys called on non-object');
                }

                var result = [], prop, i;

                for (prop in obj) {
                    if (hasOwnProperty.call(obj, prop)) {
                        result.push(prop);
                    }
                }

                if (hasDontEnumBug) {
                    for (i = 0; i < dontEnumsLength; i++) {
                        if (hasOwnProperty.call(obj, dontEnums[i])) {
                            result.push(dontEnums[i]);
                        }
                    }
                }
                return result;
            };
        }());
    }

    // slightly adapted from
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
    // removed Object.defineProperty reference as it is not IE8 compatible
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.lastIndexOf(searchString, position) === position;
      };
    }

    // slightly adapted from
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
    // removed Object.defineProperty reference as it is not IE8 compatible
    if (!String.prototype.endsWith) {
      String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length) {
          position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
      };
    }

    // IE8 doesn't define hasOwnProperty on the window object
    if (!window.hasOwnProperty) {
        /*jshint -W001 */
        window.hasOwnProperty = function(name) {
            return Object.prototype.hasOwnProperty.call(window, name);
        };
        /*jshint +W001 */
    }

    // not really a polyfill but still a useful function to visually select the content of an html element
    window.selectText = function (element) {
        var doc = document,
            range,
            selection;
        if (doc.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            selection = window.getSelection();
            range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    window.isObjectEmpty = function(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    };

    window.utf8_to_b64 = function(str) {
        // we escape the unicode string before encoding it in base64 becase btoa does not support unicode characters
        return window.btoa(jsesc(str, {
            'json': true
        }));
    };

    window.b64_to_utf8 = function(str) {
        return window.atob(str);
    };

    window.format_string = function() {
        // The string containing the format items (e.g. "{0}")
        // will and always has to be the first argument.
        var regEx, str = arguments[0];
        if (arguments[1] !== null && typeof arguments[1] === 'object') {
            var args = arguments[1];
            // start with the second argument (i = 1)
            for (var property in args) {
                if (args.hasOwnProperty(property)) {
                    // "gm" = RegEx options for Global search (more than one instance)
                    // and for Multiline search
                    regEx = new RegExp("\\{" + property + "\\}", "gm");
                    str = str.replace(regEx, args[property]);
                }
            }
        } else {
            // start with the second argument (i = 1)
            for (var i = 1; i < arguments.length; i++) {
                // "gm" = RegEx options for Global search (more than one instance)
                // and for Multiline search
                regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
                str = str.replace(regEx, arguments[i]);
            }
        }

        return str;
    };

    window.isNullOrUndefined = function(value){
        return typeof(value) === "undefined" || value === null ;
    };

    if (typeof Object.assign !== 'function') {
      Object.assign = function(target, varArgs) { // .length of function is 2
        if (isNullOrUndefined(target)) { // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];

          if (!isNullOrUndefined(nextSource)) { // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      };
    }

    /**
     * Escape chars so to that a given string can be used within a regex safely
     * https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
     */
    RegExp.escape = function (s) {
        if (s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }
        return s;
    };

    /**
     * CustomEvent support in IE9+
     * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
     * */
    if (!(typeof window.CustomEvent === "function")) {
        var CustomEvent = function (event, params) {
            params = params || {bubbles: false, cancelable: false, detail: undefined};
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    }
}());
