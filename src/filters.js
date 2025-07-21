(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.filter('nofollow', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:nofollow
         *
         * @function
         * @param {string} html A string of html code.
         * @return {string} The input html code with all link tags now including the attributes `target="_blank"` and
         * `rel="nofollow"`
         */
        return function(value) {
            if (angular.isString(value)) {
                return value.replace(/<a href="/g, '<a target="_blank" rel="nofollow" href="');
            } else {
                return value;
            }
        };
    });

    mod.filter('prettyText', ['$filter', function($filter) {
        /**
         * Prepares a text value to be displayed
         */
        var re = /[<>]+/;
        // I stole this part from angular-sanitize
        var NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;
        function encodeEntities(value) {
            return value.
            replace(/&/g, '&amp;').
            replace(NON_ALPHANUMERIC_REGEXP, function(value){
                return '&#' + value.charCodeAt(0) + ';';
            }).
            replace(/</g, '&lt;').
            replace(/>/g, '&gt;');
        }

        return function(value) {
            if (!value || !angular.isString(value)) {
                return value;
            }
            if (re.test(value)) {
                return encodeEntities(value);
            } else {
                try {
                    return $filter('linky')(value, '_blank');
                } catch (InvalidArgument) {
                    return encodeEntities(value);
                }

            }
        };
    }]);

    mod.filter('safenewlines', function () {
        // Used to convert "safe" newlines (from ngSanitize) to <br /> tags
        return function(text) {
            if (!text) {
                return text;
            }
            return text.replace(/\n/g, '<br/>').replace(/&#10;/g, '<br/>');
        };
    });

    mod.filter('imagify', ['$sce', function($sce) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:imageify
         *
         * @function
         * @param {string} url A url pointing to an image file (with a jpg, jpeg, png or gif extension)
         * @return {string} An `img` tag pointing to the image.
         */
        var re = /^(http(?:s?):\/\/[^;,]*(?:jpg|jpeg|png|gif)(?:\?[^,;]*)?)(?:$|;|,|&)/i;
        return function(value) {
            if (angular.isString(value)) {
                value = value.trim();
                var match = re.exec(value);
                if (match !== null) {
                    // It looks like an image
                    return $sce.trustAsHtml('<img class="odswidget odswidget-imagified" src="' + ODS.StringUtils.escapeHTML(match[1]) + '" />');
                }
            }
            return value;
        };
    }]);

    mod.filter('videoify', ['$sce', function($sce) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:videoify
         *
         * @function
         * @param {string} url A youtube, dailymotion or vimeo URL.
         * @return {string} An iframe tag including the relevant video player configured with the input url
         */
            // Youtube:
            // http(s)://youtu.be/Hh-0y8Qe0Sw
            // http(s)://(www.)youtube.com/watch?v=Hh-0y8Qe0Sw
        var re_youtube = /^https?:\/\/(?:(?:youtu.be\/)|(?:(?:www.)?youtube.com\/watch\?v=))([0-9a-z_-]+)$/i;

        // Dailymotion
        // http://www.dailymotion.com/video/x2pyhdb_roland-garros-2015-quand-le-stade-de-roland-garros-se-prepare-et-s-affaire_sport
        // http://dai.ly/x2pyhdb
        var re_dailymotion = /^https?:\/\/(?:(?:dai.ly)|(?:www.dailymotion.com))\/(?:video\/)?([0-9a-z]+)(?:[0-9a-z_-]*)$/i;

        // Vimeo
        // https://vimeo.com/127051771
        var re_vimeo = /^https?:\/\/vimeo.com\/([0-9]+)$/i;

        return function(url) {
            if (angular.isString(url)) {
                var match = re_youtube.exec(url.trim());
                if (match !== null) {
                    // The first match is the Youtube ID
                    // We can trust this code because the match can't contain offensive characters
                    return $sce.trustAsHtml('<iframe width="200" height="113" src="//www.youtube.com/embed/'+match[1]+'" frameborder="0" allowfullscreen></iframe>');
                }
                match = re_dailymotion.exec(url.trim());
                if (match !== null) {
                    // The first match is the Dailymotion ID
                    // We can trust this code because the match can't contain offensive characters
                    return $sce.trustAsHtml('<iframe frameborder="0" width="200" height="113" src="//www.dailymotion.com/embed/video/'+match[1]+'" allowfullscreen></iframe>');
                }
                match = re_vimeo.exec(url.trim());
                if (match !== null) {
                    // The first match is the Vimeo ID
                    // We can trust this code because the match can't contain offensive characters
                    return $sce.trustAsHtml('<iframe src="https://player.vimeo.com/video/'+match[1]+'" width="200" height="113" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>');
                }
            }
            return url;
        };
    }]);

    mod.filter('isDefined', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:isDefined
         *
         * @function
         * @param {string|number|Object|Boolean} value Any variable
         * @return {Boolean} true if the value is defined.
         */
        return function(value) {
            return angular.isDefined(value);
        };
    });

    mod.filter('keys', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:keys
         *
         * @function
         * @param {Object} object An object.
         * @return {string[]} The keys of the input object.
         */
        return function(value) {
            return Object.keys(value);
        };
    });

    mod.filter('numKeys', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:numKeys
         *
         * @function
         * @param {Object} object An object.
         * @return {string[]} The number of keys of the input object.
         */
        return function(value) {
            return Object.keys(value).length;
        };
    });

    mod.filter('values', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:values
         *
         * @function
         * @param {Object} object An object.
         * @return {Array} An array containing all of the object's values
         */
        return function(object) {
            var values = [];
            angular.forEach(object, function(value) {
                values.push(value);
            });
            return values;
        };
    });

    mod.filter('isEmpty', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:isEmpty
         *
         * @function
         * @param {Object} object An object.
         * @return {Boolean} Return true if the object is empty (has no key)
         */
        return function(value) {
            return Object.keys(value).length === 0;
        };
    });

    mod.filter('displayImageValue', ['$sce', function($sce) {
        return function(value, datasetid) {
            if (!value) {
                return value;
            }
            var url = '/explore/dataset/'+datasetid+'/files/'+value.id+'/300/';

            return $sce.trustAsHtml('<img class="odswidget odswidget-imagified" src="' + ODS.StringUtils.escapeHTML(url) + '" />');
        };
    }]);

    mod.filter('fieldsForVisualization', function() {
        var blacklist = {
            'table': [],
            'map': ['geo_point_2d', 'geo_shape'],
            'images': ['file'],
            'calendar': []
        };
        return function(fields, viz) {
            if (angular.isUndefined(fields)) { return fields; }
            if (angular.isUndefined(blacklist[viz])) {
                throw 'Unknown visualization type "' + viz + "'";
            }
            return fields.filter(function(field) { return blacklist[viz].indexOf(field.type) === -1; });
        };
    });

    mod.filter('fieldsForLanguageDisplay', function() {
        return function(fields, language, fieldsDisplayedInSpecificLanguagesMeta) {
            if (angular.isUndefined(fields) || !language || !(fieldsDisplayedInSpecificLanguagesMeta)) { return fields; }
            return fields.filter(function(field) {
                var fieldDisplayedInLangs = fieldsDisplayedInSpecificLanguagesMeta[field.name];
                if (!fieldDisplayedInLangs) {
                    return true;
                }
                return !fieldDisplayedInLangs.length || fieldDisplayedInLangs.indexOf(language) !== -1;
            });
        };
    });

    mod.filter('formatFieldValue', ['$filter', '$sce', function($filter, $sce) {
        var DATASETID_RE = /^\/(explore\/(embed\/)?dataset|publish)\/([\w_@-]+)\//;
        var getPrecision = function(field) {
            if (field.annotations) {
                var annos = field.annotations.filter(function(anno) { return anno.name === 'timeserie_precision'; });
                if (annos.length > 0) {
                    return annos[0].args[0];
                }
            }
            return null;
        };

        return function(record, field, context) {

            var value = record[field.name];
            if (value === null || value === undefined) {
                return '';
            }

            if (field.type === 'int' || field.type === 'double') {
                var unit = '',
                    decimals,
                    formattedValue;
                if (field.annotations) {
                    for (var a=0; a<field.annotations.length; a++) {
                        if (field.annotations[a].name === 'unit') {
                            unit = field.annotations[a].args[0];
                        }
                        if(field.type == 'double' && field.annotations[a].name === 'decimals') {
                            decimals = parseInt(field.annotations[a].args[0], 10);
                        }
                    }
                }

                if (angular.isDefined(decimals)) {
                    formattedValue = $filter('number')(value, decimals);
                } else {
                    formattedValue = $filter('number')(value);
                }
                if (unit) {
                    if (unit === '$' || unit === '£') {
                        formattedValue = unit + formattedValue;
                    } else {
                        formattedValue = formattedValue + ' ' + unit;
                    }
                }
                return  formattedValue;
            } else if (field.type === 'geo_point_2d') {
                return value[0] + ', ' + value[1];
            } else if (field.type === 'geo_shape') {
                return $filter('limitTo')(angular.toJson(value), 200);
            } else if (field.type === 'date') {
                var precision = getPrecision(field);
                if (precision === 'year') {
                    var partialDate = moment(value, 'YYYY');
                    return $filter('moment')(partialDate, 'YYYY');
                } else if (precision === 'month') {
                    // Parse the partial date properly
                    var partialDate = moment(value, 'YYYY-MM');
                    return $filter('capitalize')($filter('moment')(partialDate, 'MMMM YYYY'));
                }
                return $filter('moment')(value, 'LL');
            } else if (field.type === 'datetime') {
                if (value.length === 19) {
                    // Fix for legacy timestamps that don't have a timezone
                    value += 'Z';
                } else {
                    // Remove timezone specification
                    value = value.substring(0, 19)
                }

                return $filter('moment')(value, 'LLL');
            }  else if (field.type === 'file') { // it's 'file' type really
                if (angular.isObject(value)) {
                    var datasetID,
                        domainURL = '';

                    // get domainUrl, without trailing slash
                    if (context && context.domainUrl) {
                        domainURL = context.domainUrl.replace(/\/+$/, '');
                    }

                    // get datasetID
                    if (context && context.dataset){
                        datasetID = context.dataset.datasetid;
                    } else {
                        // infer datasetID from URL
                        var matches = DATASETID_RE.exec(decodeURIComponent(window.location.pathname));
                        if (matches) {
                            datasetID = matches[3];
                        }
                    }

                    // return link to file if available
                    if (datasetID) {
                        var url = domainURL + '/explore/dataset/' + datasetID + '/files/' + value.id + '/download/';
                        return $sce.trustAsHtml('<a target="_self" href="' + ODS.StringUtils.escapeHTML(url) + '">' + ODS.StringUtils.escapeHTML(value.filename || record.filename) + '</a>');
                    }

                    return value.filename || record.filename;
                } else {
                    return ''+value;
                }
            } else if (field.type === 'json_blob') {
                return JSON.stringify(value);
            } else {
                return $filter('limitTo')(''+value, 1000);
            }
        };
    }]);


    mod.filter('capitalize', [function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:capitalize
         *
         * @function
         * @param {string} text A string to capitalize
         * @return {string} The input string, capitalized (ie with its first character in capital letter)
         */
        return function(input) {
            if (angular.isString(input)) {
                return ODS.StringUtils.capitalize(input);
            } else {
                return input;
            }
        };
    }]);

    mod.filter('truncate', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:truncate
         *
         * @function
         * @param {string} text Original text to truncate.
         * @param {number} length Max length of the truncated text.
         * @return {string} The `length` first chars of the input `text`, or the full input `text` if it is shorter
         * than `length`.
         */
        return function(text, length) {
            if (!text || !angular.isString(text)) {
                return text;
            }
            if (!length) {
                length = 200;
            }
            return text.substring(0, length);
        };
    });

    mod.filter('fieldsFilter', function(){
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:fieldsFilter
         *
         * @function
         * @param {string[]} fieldNames A list of field names.
         * @param {Object[]} fields A list of fields as returned by the API.
         * @return {Object[]} A sublist of the `fields` input, containing only fields which are referenced in the
         * `fieldNames` attribute.
         */
        return function(fields, config){
            if (!fields) {
                return fields;
            }
            if(angular.isArray(config) && config.length) {
                var output = [];
                angular.forEach(config, function(fieldName){
                    var field = jQuery.grep(fields, function(field){ return field.name === fieldName; })[0];
                    if (angular.isDefined(field)) {
                        output.push(field);
                    }
                });
                return output;
            }
            return fields;
        };
    });

    mod.filter('moment', [function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:moment
         *
         * @function
         * @description Render a given date in a specified format.
         * @param {string|Date|Number|Array|Moment} date A date
         * @param {string} format See http://momentjs.com/docs/#/displaying/format/ for the full list of options
         * @return {string} The input date, formatted.
         */
        return function(isoDate, format) {
            if (isoDate)
                return moment(isoDate).format(format);
        };
    }]);

    mod.filter('momentadd', [function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:momentadd
         *
         * @function
         * @param {string|Date|Number|Array|Moment} date A date
         * @param {string} precision A unit describing the type of the `number` parameter. Can be any of `years`,
         * `quarters`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds` or `milliseconds`.
         * @param {number} number How many years, hours, minutes (depending on `precision`) should be added. Can be a
         * negative number.
         * @return {Moment} A date
         */
        return function(isoDate, precision, number) {
            if (isoDate) {
                return moment(isoDate).add(precision, parseInt(number, 10)).toISOString().replace('.000Z', 'Z');
            }
        };
    }]);

    mod.filter('timesince', [function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:timesince
         *
         * @function
         * @param {string|Date|Number|Array|Moment} date A date
         * @return {string} A fully localized string describing the time between the input date and now. For example:
         * "A few seconds ago"
         */
        return function(isoDate) {
            if (isoDate)
                return moment(isoDate).fromNow();
        };
    }]);

    mod.filter('momentdiff', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:momentdiff
         *
         * @description This filter returns the difference between two dates, in the given measurement. For example
         * you could use it to calculate how many days there are between two dates.
         * @function
         * @param {string|Date|Number|Array|Moment} date1 A date
         * @param {string|Date|Number|Array|Moment} date2 A date
         * @param {string|Date|Number|Array|Moment} [measurement=milliseconds] The measurement to use ("years",
         * "months", "weeks", "days", "hours", "minutes", and "seconds"). By default, milliseconds are used.
         * @return {string} The difference in measurement between the two dates.
         */
        return function(date1, date2, measurement) {
            return moment(date1).diff(date2, measurement);
        };
    });


    mod.filter('themeSlug', ['$filter', function($filter) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:themeSlug
         *
         * @function
         * @param {string} themeName A theme's full name
         * @return {string} The slugified (that is normalized, with dashes instead of spaces) version of themeName.
         */
        return function(value) {
            if (!value || angular.isArray(value) && value.length === 0) {
                return value;
            }
            if (angular.isArray(value)) {
                value = value[0];
            }
            return $filter('slugify')($filter('normalize')(value));
        };
    }]);

    mod.filter('slugify', function(){
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:slugify
         *
         * @function
         * @param {string} text Some text
         * @return {string} The slugified (that is normalized, with dashes instead of spaces) version of the input text.
         */
        return function(text){
            if (!text) {
                return text;
            }
            return ODS.StringUtils.slugify(text);
        };
    });

    mod.filter('normalize', [function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:normalize
         *
         * @function
         * @param {string} text Some text
         * @return {string} The text cleaned of all of its diacritical signs.
         */
        return function(input) {
            return ODS.StringUtils.normalize(input);
        };
    }]);

    mod.filter('shortTextSummary', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:shortTextSummary
         *
         * @function
         * @param {string} text Some text
         * @param {number} length The maximum length of the summary
         * @return {string} A short summary from the given text, usually the first paragraph. If longer than the
         * required length, an ellipsis will be made.
         */
        return function(text, length) {
            if (text.length > length) {
                return text.substring(0, length - 3) + '...';
            }
            return text;
        };
    });

    mod.filter('shortSummary', ['$sce', function($sce) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:shortSummary
         *
         * @function
         * @param {string} text Some HTML
         * @param {number} length The maximum length of the summary
         * @return {string} A short summary from the given text, usually the first paragraph. If longer than the
         * required length, an ellipsis will be made. This function should not be used with unsafe HTML.
         */
        return function(summary, length) {
            length = length || 400;
            if (!summary) {
                return '';
            }
            summary = summary.trim();
            // What we want is :
            // - If it starts with text, then this text (up to a potential \n)
            // - Else, try to find any <p> with text and takes the content
            // - Else, takes the text
            // Then takes up to x words
            var text = '';
            var body = angular.element('<div>'+$sce.getTrustedHtml(summary)+'</div>');
            if (body.children().length === 0) {
                // Regular text
                summary = '' + summary; // make sure it is a string
                if (summary.indexOf('\n') > -1) {
                    text = summary.substring(0, summary.indexOf('\n'));
                } else {
                    text = summary;
                }
            } else {
                var firstNode = body.contents()[0];
                if (firstNode.nodeType === 3) {
                    // Text node
                    text = firstNode.textContent;
                } else {
                    // It doesn't begin with text : is there any <p>?
                    if (body.find('p').length > 0) {
                        // In case we have a tag with eventually no text in the first <p>
                        // which it is with the current WYSIWYG if you set an img in the beginning.
                        // Then we get no short summary at all.
                        // So we compute all <p> nodes until we find something.
                        body.find('p').each(function () {
                            var localText = '';
                            if (angular.isDefined(this.textContent)) {
                                localText += this.textContent;
                            } else {
                                // Fallback for IE8, loses the \n's
                                localText += this.innerText;
                            }
                            if (localText !== '') {
                                text = localText;
                                return false;
                            }
                        });
                    } else {
                        // Well, we take what we can get
                        text = body.text();
                    }
                }
            }
            // Limit text length
            if (text.length > length) {
                text = text.substring(0, length-3) + '…';
            }
            return text;
        };
    }]);

    mod.filter('imageUrl', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:imageUrl
         *
         * @function
         * @param {Object} fieldValue A record field of type file
         * @param {DatasetContext|CatalogContext} context The context from which the record is extracted
         * @return {string} A url pointing to the file itself.
         */
        return function(fieldValue, context) {
            if (!fieldValue || angular.equals(fieldValue, {})) {
                return null;
            }
            if (!context) {
                console.log('ERROR : This filter requires a context as second parameter.');
            }
            if (!context.dataset) {
                return null;
            }
            if (!angular.isObject(fieldValue)) {
                console.log('ERROR : This field is not an file field.');
            }
            var url = context.domainUrl;
            url += '/api/datasets/1.0/'+context.dataset.datasetid+'/files/'+fieldValue.id+'/';
            return url;
        };
    });

    mod.filter('thumbnailUrl', ['imageUrlFilter', function(imageUrlFilter) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:thumbnailUrl
         *
         * @function
         * @param {Object} fieldValue A record field of type file
         * @param {DatasetContext|CatalogContext} context The context from which the record is extracted
         * @return {string} A url pointing to a thumbnail of the file.
         */
        return function(fieldValue, context) {
            var url = imageUrlFilter(fieldValue, context);
            if (url) {
                return url + '300/';
            } else {
                return null;
            }
        };
    }]);

    mod.filter('firstValue', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:firstValue
         *
         * @function
         * @param {Array} array An array of anything
         * @return {String|Number|Boolean|Array|Object} If the input value is an array, returns the first of its
         * values, otherwise return the value itself.
         */
        return function(value) {
            if (angular.isArray(value)) {
                return value.length > 0 ? value[0] : null;
            } else {
                return value;
            }
        };
    });

    mod.filter('split', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:split
         *
         * @function
         * @param {string} arrayAsString  A string representing an array of values
         * @param {string} [separator] The separator (default: `';'`)
         * @return {Array} An array containing all strings generated by the String.split method.
         */
        return function(list, separator) {
            if (!list) {
                return list;
            }
            if (!separator) {
                separator = ';';
            }
            var values = list.split(separator);
            return values;
        };
    });

    mod.filter('join', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:join
         *
         * @function
         * @param {string[]} values  A list of strings
         * @param {string} [separator] The separator (default: `', '`)
         * @return {string} All strings joined with the given separator.
         */
        return function(value, separator) {
            if (!value) {
                return value;
            }
            if (!separator) {
                separator = ', ';
            }
            if (angular.isArray(value)) {
                return value.join(separator);
            } else {
                return value;
            }
        };
    });

    mod.filter('stringify', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:stringify
         *
         * @function
         * @param {Object} jsonObject A JSON object
         * @return {string} The stringified version of the input object (generated through JSON.stringify)
         */
        return function(value) {
            if (angular.isObject(value)) {
                return JSON.stringify(value);
            } else {
                return value;
            }
        };
    });

    mod.filter('themeColor', ['ODSWidgetsConfig', function(ODSWidgetsConfig) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:themeColor
         *
         * @function
         * @param {string} theme A theme's slug (that is, its name normalized, see
         * {@link ods-widgets.filter:themeSlug themeSlug})
         * @return {string} The hexadecimal color code for this theme, as defined through
         * {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig}'s `theme` setting.
         */
        return function(theme) {
            if (!theme) {
                return '';
            }
            if (ODSWidgetsConfig.themes[theme]) {
                return ODSWidgetsConfig.themes[theme].color;
            } else {
                return '';
            }
        };
    }]);

    mod.filter('isBefore', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:isBefore
         *
         * @function
         * @param {string|Date|Number|Array|Moment} date1 A date
         * @param {string|Date|Number|Array|Moment} date2 Another date, which doesn't need to be in the same format as
         * date1.
         * @return {Boolean} Whether date1 is strictly before date2 or not, down to the millisecond.
         */
        return function(date1, date2) {
            return moment(date1).isBefore(date2);
        };
    });

    mod.filter('isAfter', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:isAfter
         *
         * @function
         * @param {string|Date|Number|Array|Moment} date1 A date
         * @param {string|Date|Number|Array|Moment} date2 Another date, which doesn't need to be in the same format as
         * date1.
         * @return {Boolean} Whether date1 is strictly after date2 or not, down to the millisecond.
         */
        return function(date1, date2) {
            return moment(date1).isAfter(date2);
        };
    });

    mod.filter('propagateAppendedURLParameters', ['ODSWidgetsConfig', function(ODSWidgetsConfig) {
        return function(url) {
            if (!url) {
                return url;
            }
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // Don't propagate to external links
                return url;
            }

            if (!ODSWidgetsConfig.appendedURLQuerystring) {
                return url;
            }

            if (url.indexOf('?') > -1) {
                url += '&';
            } else {
                url += '?';
            }
            url += ODSWidgetsConfig.appendedURLQuerystring;
            return url;
        };
    }]);

    mod.filter('toObject', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:toObject
         *
         * @function
         * @param {Array} array An array of objects.
         * @param {String} key The key for the transformation.
         * @return {Object} The array of objects converted into an object.
         * @description Transform an array of objects into an objet, using a key passed as a parameter.
         *
         * @example
         * <pre>
         * [
         *   { "name": "foo", "count": 201 },
         *   { "name": "bar", "count": 202 }
         * ]
         * </pre>
         *
         * <pre>mylist|toObject:'name'</pre>
         *
         * <pre>
         * {
         *   "foo": { "name": "foo", "count": 201 },
         *   "bar": { "name": "bar", "count": 202 }
         * }
         * </pre>
         *
         */
        return function(array, key) {
            if (!key) {
                console.log('ERROR : this filter requires a key as a second parameter.');
                return null;
            }

            if (typeof array === "undefined" || array === null) {
                return {};
            }

            if (!Array.isArray(array)) {
                console.log("A non array value has been given to the toObject filter", array);
                return {};
            }

            return array.reduce(function(newObject, item) {
                newObject[item[key]] = item;
                return newObject;
            }, {});
        };
    });


    mod.filter('min', function() {
        return function(n1, n2) {
            return Math.min(n1, n2);
        };
    });

    mod.filter('max', function() {
        return function(n1, n2) {
            return Math.max(n1, n2);
        };
    });

    mod.filter('filesize', ['translate', '$filter', function(translate, $filter) {
        var translate_unit = translate;
        return function(value) {
            var formatted = value,
                units = [
                    translate_unit('B'),
                    translate_unit('KB'),
                    translate_unit('MB'),
                    translate_unit('GB'),
                    translate_unit('TB')
                ],
                count = 0;

            while (formatted / 1024 > 1 && count < units.length) {
                formatted = formatted / 1024;
                count++;
            }

            return $filter('number')(formatted) + ' ' + units[count];
        };
    }]);

    mod.filter('math', function() {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:math
         *
         * @function
         * @param {string|Date|Number|Array} value A numerical value to process
         * @param {string} function A Math library function. Can be any of:
         * <b>abs</b> (absolute value),
         * <b>cbrt</b> (cube root),
         * <b>ceil</b> (smallest integer >= value),
         * <b>cos</b> (cosine),
         * <b>exp</b> (E**value),
         * <b>floor</b> (largest integer <= value),
         * <b>log` or `ln</b> (natural logarithm),
         * <b>log2</b> (base 2 logarithm),
         * <b>log10</b> (base 10 logarithm),
         * <b>pow</b> (power) ex: {{ val | math : 'pow' : 2 }} for val^2
         * <b>random</b> (pseudo-random number between 0 and 1 * value),
         * <b>round</b> (value rounded to the nearest integer),
         * <b>sign</b> (sign of value, pos. = 1, neg = -1, zero = 0),
         * <b>sin</b> (sine),
         * <b>sqrt</b> (positive square root),
         * <b>tan</b> (tangent),
         * <b>trunc</b> (integer part of value)
         * <br/> or static properties: <b>PI</b> or <b>E</b>.
         * @return {Number} The result
         */
        return function(val, func, opt) {
            /* whitelist of Math function, to avoid method injection and security problems */
            /* dummy implementation as some function don't work the same than others... */
            if (func === 'abs')
                return Math.abs(val);
            if (func === 'cbrt')
                return Math.cbrt(val);
            if (func === 'ceil')
                return Math.ceil(val);
            if (func === 'cos')
                return Math.cos(val);
            if (func === 'exp')
                return Math.exp(val);
            if (func === 'floor')
                return Math.floor(val);
            if (func === 'log' || func === 'ln')
                return Math.log(val);
            if (func === 'log2')
                return Math.log2(val);
            if (func === 'log10')
                return Math.log10(val);
            if (func === 'pow')
                return Math.pow(val, opt);
            if (func === 'random')
                return Math.random() * val;
            if (func === 'round')
                return Math.round(val);
            if (func === 'sign')
                return Math.sign(val);
            if (func === 'sin')
                return Math.sin(val);
            if (func === 'sqrt')
                return Math.sqrt(val);
            if (func === 'tan')
                return Math.tan(val);
            if (func === 'trunc')
                return Math.trunc(val);

            /* Properties / replace value */
            if (func === 'PI')
                return Math.PI;
            if (func === 'E')
                return Math.E;

            // else
            return val;
        }
    });

    mod.filter('fromjson', function () {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:fromjson
         *
         * @function
         * @param {string} A string value containing a stringified JSON object
         * @return {json} The resulting, parsed, Json object
         *
         *
         * @example
         * <pre>
         * value = '{\"key\":\"value\"}'
         * </pre>
         *
         * <pre>value|fromjson</pre>
         *
         * <pre>
         * {
         *   "key": "value"
         * }
         * </pre>
         */
        return function (val) {
            return angular.fromJson(val);
        };
    });

    mod.filter('uriEncode', ['$window', function($window) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:uriEncode
         *
         * @function
         * @description This filter can be used to prepare a string to be used when building a link.
         * It's important to understand that this filter encodes a string but ignores protocol prefix ('http://') and domain name.
         * This filter uses the 'encodeURI' JavaScript function under the hood.
         * @param {string} A string.
         * @return {string} A URL encoded value (but ignores protocol prefix ('http://') and domain name).
         *
         * @example
         * <pre>
         * value = 'https://website.com?x=шеллы'
         * </pre>
         *
         * <pre>
         * value|uriEncode
         * </pre>
         *
         * <pre>
         * https://website.com?x=%D1%88%D0%B5%D0%BB%D0%BB%D1%8B
         * </pre>
         */
        return function(input) {
            return angular.isString(input) ? $window.encodeURI(input) : input;
        };
    }]);

    mod.filter('uriComponentEncode', ['$window', function($window) {
        /**
         * @ngdoc filter
         * @name ods-widgets.filter:uriComponentEncode
         *
         * @function
         * @description This filter can be used to prepare a string to be used as a parameter when building a link.
         * It's important to understand that 'uriComponentEncode' filters the entire string, whereas 'uriEncode' (see {@link ods-widgets.filter:uriEncode reference page}) filter ignores
         * protocol prefix ('http://') and domain name.
         * This filter uses the 'encodeURIComponent' JavaScript function under the hood.
         * @param {string} A string.
         * @return {string} A URL encoded value (be aware that this filter will also encode protocol prefix ('http://') and domain name).
         *
         * @example
         * <pre>
         * value = 'cats&dogs'
         * </pre>
         *
         * <pre>
         * value|uriComponentEncode
         * </pre>
         *
         * <pre>
         * cats%26dogs
         * </pre>
         */
        return function(input) {
            return angular.isString(input) ? $window.encodeURIComponent(input) : input;
        };
    }]);
}());
