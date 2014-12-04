/*! http://mths.be/jsesc v0.5.0 by @mathias */
;(function(root) {

    /*--------------------------------------------------------------------------*/

    var object = {};
    var hasOwnProperty = object.hasOwnProperty;
    var forOwn = function(object, callback) {
        var key;
        for (key in object) {
            if (hasOwnProperty.call(object, key)) {
                callback(key, object[key]);
            }
        }
    };

    var extend = function(destination, source) {
        if (!source) {
            return destination;
        }
        forOwn(source, function(key, value) {
            destination[key] = value;
        });
        return destination;
    };

    var regexSingleEscape = /["'\\\b\f\n\r\t]/;

    var regexWhitelist = /[ !#-&\(-\[\]-~]/;

    var jsesc = function(argument, options) {
        // Handle options
        var defaults = {
            'es6': false,
            'json': false
        };
        var json = options && options.json;
        options = extend(defaults, options);
        var result;

        var string = argument;
        // Loop over each code unit in the string and escape it
        var index = -1;
        var length = string.length;
        var first;
        var second;
        var codePoint;
        result = '';
        while (++index < length) {
            var character = string.charAt(index);
            if (options.es6) {
                first = string.charCodeAt(index);
                if ( // check if it’s the start of a surrogate pair
                    first >= 0xD800 && first <= 0xDBFF && // high surrogate
                    length > index + 1 // there is a next code unit
                ) {
                    second = string.charCodeAt(index + 1);
                    if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
                        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                        codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                        result += '\\u{' + codePoint.toString(16).toUpperCase() + '}';
                        index++;
                        continue;
                    }
                }
            }
            if (regexWhitelist.test(character)) {
                // It’s a printable ASCII character that is not `"`, `'` or `\`,
                // so don’t escape it.
                result += character;
                continue;
            }
            if (character == '"') {
                result += character;
                continue;
            }
            if (character == '\'') {
                result += character;
                continue;
            }
            if (regexSingleEscape.test(character)) {
                // no need for a `hasOwnProperty` check here
                result += character;
                continue;
            }
            var charCode = character.charCodeAt(0);
            var hexadecimal = charCode.toString(16).toUpperCase();
            var longhand = hexadecimal.length > 2 || json;
            var escaped = '\\' + (longhand ? 'u' : 'x') +
                ('0000' + hexadecimal).slice(longhand ? -4 : -2);
            result += escaped;
            continue;
        }
        return result;
    };

    jsesc.version = '0.5.0';

    root.jsesc = jsesc;

}(this));
