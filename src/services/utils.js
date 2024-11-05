(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var loading = {};
    var loaded = [];
    mod.provider('ModuleLazyLoader', function() {
        // We always load from https://, because if we don't put a scheme in the URL, local testing (from filesystem)
        // will look at file:// URLs and won't work.
        var lazyloading = {
            'highcharts': {
                'css': [],
                'js': [
                    ["https://code.highcharts.com/11.1.0/highcharts.js"],
                    ["https://code.highcharts.com/11.1.0/modules/no-data-to-display.js"],
                    ["https://code.highcharts.com/11.1.0/highcharts-more.js"],
                    ["https://code.highcharts.com/11.1.0/modules/treemap.js"],
                    ["https://code.highcharts.com/11.1.0/modules/funnel.js"]
                ]
            },
            'leaflet': {
                'css': [
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css",
                    "libs/ods-map-fullscreen/ods-map-fullscreen.css",
                    "https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.css",
                    "libs/leaflet-control-geocoder/Control.Geocoder.css",
                    "libs/ods-vectormarker/vectormarker.css",
                    "libs/ods-clustermarker/clustermarker.css",
                    "libs/leaflet-label/leaflet.label.css",
                    "libs/leaflet-draw/leaflet.draw.css"
                ],
                'js': [
                    [
                        "L@https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"
                    ],
                    [
                        "L.Control.ODSMapFullscreen@libs/ods-map-fullscreen/ods-map-fullscreen.js",
                        "L.Control.Locate@https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.js",
                        "L.Label@libs/leaflet-label/leaflet.label.js",
                        "L.ODSMap@libs/ods-map/ods-map.js",
                        "L.ODSTileLayer@libs/ods-map/ods-tilelayer.js",
                        "L.Control.Geocoder@libs/leaflet-control-geocoder/Control.Geocoder.js",
                        "L.VectorMarker@libs/ods-vectormarker/vectormarker.js",
                        "L.ClusterMarker@libs/ods-clustermarker/clustermarker.js",
                        "L.Draw@libs/leaflet-draw/leaflet.draw.js",
                        "L.HeatLayer@libs/leaflet-heat/leaflet-heat.js"
                    ]
                ]
            },
            'rome': {
                'css': ['libs/rome/rome.css'],
                'js': ['libs/rome/rome.standalone.js']
            },
            'fullcalendar': {
                'css': ['libs/fullcalendar/fullcalendar.min.css'],
                'js': [
                    'libs/fullcalendar/fullcalendar.min.js'
                ],
                'language_specific': {
                    'ar': {
                        'js': ['libs/fullcalendar/locale/ar.js']
                    },
                    'ca': {
                        'js': ['libs/fullcalendar/locale/ca.js']
                    },
                    'de': {
                        'js': ['libs/fullcalendar/locale/de.js']
                    },
                    'es': {
                        'js': ['libs/fullcalendar/locale/es.js']
                    },
                    'eu': {
                        'js': ['libs/fullcalendar/locale/eu.js']
                    },
                    'fr': {
                        'js': ['libs/fullcalendar/locale/fr.js']
                    },
                    'it': {
                        'js': ['libs/fullcalendar/locale/it.js']
                    },
                    'nl': {
                        'js': ['libs/fullcalendar/locale/nl.js']
                    },
                    'pt': {
                        'js': ['libs/fullcalendar/locale/pt.js']
                    }
                }
            },
            'qtip': {
                'css': ['libs/qtip/jquery.qtip.min.css'],
                'js': ['libs/qtip/jquery.qtip.min.js']
            },
            'simple-statistics': {
                'css': [],
                'js': [
                    'ss@https://cdnjs.cloudflare.com/ajax/libs/simple-statistics/1.0.1/simple_statistics.js'
                ]
            },
            'ion.rangeSlider': {
                'js': ['https://cdnjs.cloudflare.com/ajax/libs/ion-rangeslider/2.3.0/js/ion.rangeSlider.min.js'],
                'css': ['https://cdnjs.cloudflare.com/ajax/libs/ion-rangeslider/2.3.0/css/ion.rangeSlider.min.css']
            },
            'd3.scale': {
                'js': ['https://d3js.org/d3-array.v2.min.js',
                    'https://d3js.org/d3-color.v1.min.js',
                    'https://d3js.org/d3-interpolate.v1.min.js',
                    'https://d3js.org/d3-scale.v3.min.js']
            }
        };

        this.getConfig = function() {
            return lazyloading;
        };

        var objectIsDefined = function(scope, name) {
            var nameParts = name.split('.');
            if (scope.hasOwnProperty(nameParts[0]) && angular.isDefined(scope[nameParts[0]])) {
                if (nameParts.length === 1) {
                    return true;
                } else {
                    var newScope = scope[nameParts[0]];
                    nameParts.shift();
                    return objectIsDefined(newScope, nameParts.join('.'));
                }
            } else {
                return false;
            }
        };

        var isAlreadyAvailable = function(objectName) {
            return objectIsDefined(window, objectName);
        };

        this.$get = ['$q', 'ODSWidgetsConfig', function($q, ODSWidgetsConfig) {
            var lazyload = function(type, url) {
                if (angular.isUndefined(loading[url])) {
                    var deferred = $q.defer();

                    // If it is a relative URL, make it relative to ODSWidgetsConfig.basePath
                    var realURL =  url.substring(0, 1) === '/' ||
                    url.substring(0, 7) === 'http://' ||
                    url.substring(0, 8) === 'https://' ? url : ODSWidgetsConfig.basePath + url;
                    LazyLoad[type](realURL, function() {
                        deferred.resolve();
                        loaded.push(url);
                    });
                    loading[url] = deferred;
                }
                return loading[url];
            };

            var loadSequence = function(type, module, deferred, i) {
                var promises = [],
                    step;

                if (angular.isUndefined(i)) {
                    i = 0;
                }

                if (i >= module.length) {
                    deferred.resolve();
                } else {
                    step = module[i];
                    if (!angular.isArray(step)) {
                        step = [step];
                    }

                    for (var k = 0; k < step.length; k++) {
                        // The following extracts URLs from resource strings if the related service is not already loaded
                        // resource strings are of the form:
                        // * <service name>@<url>
                        // * <url>
                        // The URL may contain an "@" itself. E.g. https://cdn.jsdelivr.net/npm/package@version/file
                        var parts = step[k].split('@');
                        var url;
                        if (parts.length > 1 && !(parts[0].startsWith('http://') || parts[0].startsWith('https://'))) {
                            // There is an object name whose existence we can check
                            if (isAlreadyAvailable(parts[0])) {
                                continue;
                            }
                            url = parts.splice(1).join('@');
                        } else {
                            url = step[k];
                        }

                        if (loaded.indexOf(url) === -1) {
                            promises.push(lazyload(type, url).promise);
                        } else {
                            promises.push($q.resolve());
                        }
                    }
                    $q.all(promises).then(function() {
                        loadSequence(type, module, deferred, i + 1);
                    });
                }

                return deferred.promise;
            };
            return function() {
                var promises = [];
                for (var i=0; i < arguments.length; i++) {
                    var module = lazyloading[arguments[i]];
                    // enrich module with language specific settings
                    if (module.language_specific && module.language_specific[ODSWidgetsConfig.language]) {
                        angular.forEach(module.language_specific[ODSWidgetsConfig.language], function (sources, type) {
                            if (module[type]) {
                                module[type] = module[type].concat(sources);
                            } else {
                                module[type] = sources;
                            }
                        });
                    }

                    if (module.css) {
                        promises.push(loadSequence('css', module.css, $q.defer()));
                    }
                    if (module.js) {
                        promises.push(loadSequence('js', module.js, $q.defer()));
                    }
                }
                return $q.all(promises);
            };
        }];
    });

    mod.factory("DebugLogger", ['$window', function($window) {
        /*
         * This Debug logger provides four types of loggin methods: log, error, trace and label.
         * They have nice flashy colors so you can easily distinguish them from the old regular `console.log` method.
         */

        function main(key, args) {
            var messages = Array.from(args);

            if (['log', 'error', 'trace', 'label'].indexOf(key) === -1 || !messages || messages.length === 0) {
                console.log('⚠️ You must call method %cDebugLogger.log%c or %cDebugLogger.error%c, with at least one argument.', 'background-color: #007bff; color: #ffffff; padding: 1px 5px 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;', '', 'background-color: #dc3545; color: #ffffff; padding: 1px 5px 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;', '');
            } else {
                var levels = {
                    log: ['DEBUG LOG', 'background-color: #007bff; color: #ffffff; padding: 1px 0 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;'],
                    error: ['DEBUG ERROR', 'background-color: #dc3545; color: #ffffff; padding: 1px 0 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;'],
                    trace: ['DEBUG TRACE', 'background-color: #000000; color: #ffffff; padding: 1px 0 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;'],
                    label: ['DEBUG ' + messages[0], 'background-color: #000000; color: #ffffff; padding: 1px 0 0 5px; border-radius: 3px; font-weight: bold; font-size: 10px;'],
                };

                messages.unshift('%c' + levels[key][0] + ' ', levels[key][1]);

                if (key === 'log') {
                    console.log.apply(console, messages);
                } else if (key === 'error') {
                    console.error.apply(console, messages);
                }  else if (key === 'trace') {
                    console.trace.apply(console, messages);
                } else if (key === 'label') {
                    if (messages.length > 2) {
                        messages.splice(2, 1);
                    }
                    console.log.apply(console, messages);
                }
            }
        };

        if ($window.location.hash == '#debug'
            || $window.location.hash.indexOf('debug=') >= 0
            || jQuery(document.body).hasClass('showDebug')) {
            return {
                log: function() {
                    main('log', arguments);
                },
                error: function() {
                    main('error', arguments);
                },
                trace: function() {
                    main('trace', arguments);
                },
                label: function() {
                    main('label', arguments);
                }
            }
        }

        return { log: function() {}, error: function() {}, trace: function() {}, label: function() {} };
    }]);

    mod.factory("odsNotificationService", function() {
        var callbacks = {'high': [], 'normal': []};
        return {
            registerForNotifications: function(callback, priority) {
                if (priority === 'high') {
                    callbacks['high'].push(callback);
                } else {
                    callbacks['normal'].push(callback);
                }
            },
            unregisterForNotifications: function (callback) {
                var index;

                // high priority callbacks
                index = callbacks['high'].indexOf(callback);
                if (index > -1) {
                    callbacks['high'].splice(index, 1);
                }

                // normal priority callbacks
                index = callbacks['normal'].indexOf(callback);
                if (index > -1) {
                    callbacks['normal'].splice(index, 1);
                }
            },
            sendNotification: function(notification) {
                if (angular.isString(notification)) {
                    notification = {
                        title: 'Error',
                        type: 'error',
                        message: notification
                    };
                }
                angular.forEach(['high', 'normal'], function (priority) {
                    angular.forEach(callbacks[priority], function(callback) {
                        callback(notification);
                    });
                });
            },
            markNotificationAsHandled: function(notification) {
                if (notification) {
                    notification.handled = true;
                }
            }
        };
    });

    mod.provider('SVGInliner', function() {
        /*
        var element = SVGInliner(url);
         */
        var inlineImages = {};

        // This is the SVG used when the URLs raises a 404
        var FALLBACK = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
            '<svg id="dot-icon" width="19px" height="19px" viewBox="0 0 19 19" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns">' +
            '    <path d="M13,9.50004202 C13,11.4330618 11.4329777,13.000084 9.49995798,13.000084 C7.56693813,13.000084 5.99991595,11.4330618 5.99991595,9.50004202 C5.99991595,7.56702218 7.56693813,6 9.49995798,6 C11.4329777,6 13,7.56702218 13,9.50004202 L13,9.50004202 Z" id="path8568" fill="#000000"></path>' +
            '    <rect style="opacity: 0" x="0" y="0" width="19" height="19"></rect>' +
            '</svg>';


        var colorSVGElements = function(node, color) {
            node.css('fill', color);
            node.find('path, polygon, circle, rect, text, ellipse').css('fill', color); // Needed for our legacy SVGs of various quality...
        };

        var loadImageInline = function(element, svg, color, colorByAttributeMapping) {
            // `svg` can be an element, or HTML code as a string
            if (typeof svg === "string") {
                svg = angular.element(svg);
            }
            if (color) {
                colorSVGElements(svg, color);
            }

            if (colorByAttributeMapping) {
                angular.forEach(colorByAttributeMapping, function(elementColor, elementFillId) {
                    colorSVGElements(svg.find('[data-fill-id="'+elementFillId.replace(/"/g, "\\\"")+'"]'), elementColor);
                });
            }
            element.append(svg);
        };

        this.$get = ['$http', '$q', function($http, $q) {
            var retrieve = function(url, color, colorByAttributeMapping, getPromise) {
                var deferred;
                if (getPromise) {
                    deferred = $q.defer();
                }
                var element = angular.element('<div class="ods-svginliner__svg-container"></div>');
                if (!url) {
                    loadImageInline(element, FALLBACK, color, colorByAttributeMapping);
                    if (getPromise) { deferred.resolve(element); }
                } else if (url.indexOf('.svg') === -1) {
                    // Normal image
                    element.append(angular.element('<img src="' + encodeURI(decodeURI(url)) + '"/>'));
                    if (getPromise) { deferred.resolve(element); }
                } else {
                    // SVG
                    if (inlineImages[url]) {
                        if (inlineImages[url].code) {
                            loadImageInline(element, inlineImages[url].code, color, colorByAttributeMapping);
                            if (getPromise) { deferred.resolve(element); }
                        } else {
                            inlineImages[url].promise.then(function (response) {
                                var data = response.data;
                                loadImageInline(element, data, color, colorByAttributeMapping);
                                if (getPromise) { deferred.resolve(element); }
                            }, function() {
                                loadImageInline(element, FALLBACK, color, colorByAttributeMapping);
                                if (getPromise) { deferred.resolve(element); }
                            });
                        }

                    } else {
                        var promise = $http.get(url);
                        inlineImages[url] = {promise: promise};
                        promise.then(function (response) {
                            var data = response.data;
                            inlineImages[url].code = data;
                            loadImageInline(element, data, color, colorByAttributeMapping);
                            if (getPromise) { deferred.resolve(element); }
                        }, function(response) {
                            var status = response.status;
                            // Ignore it silently
                            console.log('WARNING: Unable to fetch SVG image', url, 'HTTP status:', status);
                            inlineImages[url].code = FALLBACK;
                            loadImageInline(element, FALLBACK, color, colorByAttributeMapping);
                            if (getPromise) { deferred.resolve(element); }
                        });
                    }
                }
                if (getPromise) {
                    return deferred.promise;
                } else {
                    return element;
                }
            };

            var copyLocalElement = function(localId, color, colorByAttributeMapping) {
                var element = angular.element('<div class="ods-svginliner__svg-container"></div>');

                var originalSvg = document.getElementById(localId);
                if (!originalSvg) {
                    console.error('odsPicto: Element with ID "'+localId+'" doesn\'t exist.');
                    return null;
                }
                if (originalSvg.tagName.toLowerCase() !== 'svg') {
                    console.error('odsPicto: Element with ID "'+localId+'" is not a svg element.');
                    return null;
                }
                var newSvg = originalSvg.cloneNode(true);

                // Remove the ID before duplication
                newSvg.removeAttribute('id');

                // Make it visible
                newSvg.style.removeProperty('display');

                loadImageInline(element, angular.element(newSvg), color, colorByAttributeMapping);

                return element;
            };

            return {
                getElement: function(url, color, colorByAttributeMapping) {
                    return retrieve(url, color, colorByAttributeMapping);
                },
                getPromise: function(url, color, colorByAttributeMapping) {
                    return retrieve(url, color, colorByAttributeMapping, true);
                },
                getLocalElement: function(elementId, color, colorByAttributeMapping) {
                    return copyLocalElement(elementId, color, colorByAttributeMapping);
                }
            };

        }];
    });

    mod.service('PictoHelper', function() {
        var FONTAWESOME_3_TO_4 = {
            'ban-circle': 'ban',
            'bar-chart': 'bar-chart-o',
            'beaker': 'flask',
            'bell': 'bell-o',
            'bell-alt': 'bell',
            'bitbucket-sign': 'bitbucket-square',
            'bookmark-empty': 'bookmark-o',
            'building': 'building-o (4.0.2)',
            'calendar-empty': 'calendar-o',
            'check-empty': 'square-o',
            'check-minus': 'minus-square-o',
            'check-sign': 'check-square',
            'check': 'check-square-o',
            'chevron-sign-down': 'chevron-down',
            'chevron-sign-left': 'chevron-left',
            'chevron-sign-right': 'chevron-right',
            'chevron-sign-up': 'chevron-up',
            'circle-arrow-down': 'arrow-circle-down',
            'circle-arrow-left': 'arrow-circle-left',
            'circle-arrow-right': 'arrow-circle-right',
            'circle-arrow-up': 'arrow-circle-up',
            'circle-blank': 'circle-o',
            'cny': 'rub',
            'collapse-alt': 'minus-square-o',
            'collapse-top': 'caret-square-o-up',
            'collapse': 'caret-square-o-down',
            'comment-alt': 'comment-o',
            'comments-alt': 'comments-o',
            'copy': 'files-o',
            'cut': 'scissors',
            'dashboard': 'tachometer',
            'double-angle-down': 'angle-double-down',
            'double-angle-left': 'angle-double-left',
            'double-angle-right': 'angle-double-right',
            'double-angle-up': 'angle-double-up',
            'download': 'arrow-circle-o-down',
            'download-alt': 'download',
            'edit-sign': 'pencil-square',
            'edit': 'pencil-square-o',
            'ellipsis-horizontal': 'ellipsis-h (4.0.2)',
            'ellipsis-vertical': 'ellipsis-v (4.0.2)',
            'envelope-alt': 'envelope-o',
            'euro': 'eur',
            'exclamation-sign': 'exclamation-circle',
            'expand-alt': 'plus-square-o (4.0.2)',
            'expand': 'caret-square-o-right',
            'external-link-sign': 'external-link-square',
            'eye-close': 'eye-slash',
            'eye-open': 'eye',
            'facebook-sign': 'facebook-square',
            'facetime-video': 'video-camera',
            'file-alt': 'file-o',
            'file-text-alt': 'file-text-o',
            'flag-alt': 'flag-o',
            'folder-close-alt': 'folder-o',
            'folder-close': 'folder',
            'folder-open-alt': 'folder-open-o',
            'food': 'cutlery',
            'frown': 'frown-o',
            'fullscreen': 'arrows-alt (4.0.2)',
            'github-sign': 'github-square',
            'google-plus-sign': 'google-plus-square',
            'group': 'users (4.0.2)',
            'h-sign': 'h-square',
            'hand-down': 'hand-o-down',
            'hand-left': 'hand-o-left',
            'hand-right': 'hand-o-right',
            'hand-up': 'hand-o-up',
            'hdd': 'hdd-o (4.0.1)',
            'heart-empty': 'heart-o',
            'hospital': 'hospital-o (4.0.2)',
            'indent-left': 'outdent',
            'indent-right': 'indent',
            'info-sign': 'info-circle',
            'keyboard': 'keyboard-o',
            'legal': 'gavel',
            'lemon': 'lemon-o',
            'lightbulb': 'lightbulb-o',
            'linkedin-sign': 'linkedin-square',
            'meh': 'meh-o',
            'microphone-off': 'microphone-slash',
            'minus-sign-alt': 'minus-square',
            'minus-sign': 'minus-circle',
            'mobile-phone': 'mobile',
            'moon': 'moon-o',
            'move': 'arrows (4.0.2)',
            'off': 'power-off',
            'ok-circle': 'check-circle-o',
            'ok-sign': 'check-circle',
            'ok': 'check',
            'paper-clip': 'paperclip',
            'paste': 'clipboard',
            'phone-sign': 'phone-square',
            'picture': 'picture-o',
            'pinterest-sign': 'pinterest-square',
            'play-circle': 'play-circle-o',
            'play-sign': 'play-circle',
            'plus-sign-alt': 'plus-square',
            'plus-sign': 'plus-circle',
            'pushpin': 'thumb-tack',
            'question-sign': 'question-circle',
            'remove-circle': 'times-circle-o',
            'remove-sign': 'times-circle',
            'remove': 'times',
            'reorder': 'bars (4.0.2)',
            'resize-full': 'expand (4.0.2)',
            'resize-horizontal': 'arrows-h (4.0.2)',
            'resize-small': 'compress (4.0.2)',
            'resize-vertical': 'arrows-v (4.0.2)',
            'rss-sign': 'rss-square',
            'save': 'floppy-o',
            'screenshot': 'crosshairs',
            'share-alt': 'share',
            'share-sign': 'share-square',
            'share': 'share-square-o',
            'sign-blank': 'square',
            'signin': 'sign-in',
            'signout': 'sign-out',
            'smile': 'smile-o',
            'sort-by-alphabet-alt': 'sort-alpha-desc',
            'sort-by-alphabet': 'sort-alpha-asc',
            'sort-by-attributes-alt': 'sort-amount-desc',
            'sort-by-attributes': 'sort-amount-asc',
            'sort-by-order-alt': 'sort-numeric-desc',
            'sort-by-order': 'sort-numeric-asc',
            'sort-down': 'sort-desc',
            'sort-up': 'sort-asc',
            'stackexchange': 'stack-overflow',
            'star-empty': 'star-o',
            'star-half-empty': 'star-half-o',
            'sun': 'sun-o',
            'thumbs-down-alt': 'thumbs-o-down',
            'thumbs-up-alt': 'thumbs-o-up',
            'time': 'clock-o',
            'trash': 'trash-o',
            'tumblr-sign': 'tumblr-square',
            'twitter-sign': 'twitter-square',
            'unlink': 'chain-broken',
            'upload': 'arrow-circle-o-up',
            'upload-alt': 'upload',
            'warning-sign': 'exclamation-triangle',
            'xing-sign': 'xing-square',
            'youtube-sign': 'youtube-square',
            'zoom-in': 'search-plus',
            'zoom-out': 'search-minus'
        };

        return {
            mapPictoToURL: function(picto, context) {
                if (!picto) {
                    return null;
                }

                // Prevent some path injection to avoid
                // the use of unsafe resources like assets and attachments by going upward
                if (picto.search(/[^\w-]+/) > -1) {
                    return null;
                }

                var url = context && context.domainUrl || '';
                if (picto.startsWith('icon-')) {
                    // Old icon set (v1), from fontawesome 3.2.1
                    var pictoName = picto.replace('icon-', '');
                    if (FONTAWESOME_3_TO_4[pictoName]) {
                        pictoName = FONTAWESOME_3_TO_4[pictoName];
                    }
                    url += '/static/pictos/img/set-v1/fa/' + pictoName + '.svg';
                } else if (picto.startsWith('pdpicto-') || picto.startsWith('odspicto-')) {
                    // Legacy - old picto set V1
                    picto = picto.replace('pdpicto-', 'pdpicto/').replace('odspicto-', 'odspicto/');
                    url += '/static/pictos/img/set-v1/' + picto + '.svg';
                } else if  (picto.startsWith('ods-')) {
                    picto = picto.replace('ods-', '');
                    url += '/static/pictos/img/set-v3/pictos/' + picto + '.svg' ;
                }else {
                    // Old picto set V2
                    url += '/static/pictos/img/set-v2/' + picto + '.svg';
                }
                return url;
            }
        };
    });

    mod.factory('URLSynchronizer', ['$location', '$document', '$rootScope', '$timeout', function($location, $document, $rootScope, $timeout) {
        /*
        This service handles the synchronization of the querystring in the browser's URL, and specific JavaScript objects.

        The point of this service is to handle the frequent need to store in the URL the content of an object, typically
        API parameters. This gives the ability to copy the URL at any point, and open it in another browser with the same state.
        The service can be used to watch a given object in a given scope, and reproduce its content in the URL, and vice versa.

        The service uses $location.search to ensure we do things in an "Angularic" way, and gives us theoric ability to switch
        to HTML5 when we want.

        You can register any number of JSONObject, but only one regular object that will gather all the non-JSON parameters.
         */
        var suspended = false;
        var syncers = [];
        // We assume that if there is less than 300ms between two changes (or the service init), the second one use
        // $location.replace instead of $location.search
        var lastSearchUpdated = new Date();

        // Waiting for the day the prefixes are gone
        $document.bind('webkitfullscreenchange mozfullscreenchange ofullscreenchange msfullscreenchange khtmlfullscreenchange', function() {
            var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
            if (fullscreenElement) {
                // Stop replicating
                suspended = true;
            } else {
                suspended = false;

                // Apply at once
                for (var i=0; i<syncers.length; i++) {
                    syncers[i]();
                }
            }
        });
        var ignoreList = [];

        // The following is used to calculate time between the initial page rendering and the first $location.search
        // change. There is usually much more than 300ms between the factory init and the first $location.search
        // call even if everything is done synchronously. This wait for the first angular digest to end (which is not
        // the end of the initial rendering sadly), then wait for one more JS cycle, then mark the app as init.
        $rootScope.$evalAsync(function () {
            $timeout(function () {
                lastSearchUpdated = new Date();
            });
        });

        function setLocationSearch(search, paramValue, skipHistory) {
            if (skipHistory) {
                // Assume that if `skipHistory` is supplied, the developer knows what he is doing (used for maps)
                $location.replace();
                angular.isString(search) ? $location.search(search, paramValue) : $location.search(search);
                return ;
            }
            // If there is less than 300ms between two location changes, use replace
            if (new Date().getTime() - lastSearchUpdated.getTime() < 300) {
                $location.replace();
            }
            angular.isString(search) ? $location.search(search, paramValue) : $location.search(search);
            lastSearchUpdated = new Date();
        }

        return {
            addSynchronizedValue: function(scope, objName, urlName, skipHistory) {
                ignoreList.push(objName);
                if (urlName) {
                    ignoreList.push(urlName);
                }
                var urlValue = $location.search()[urlName || objName];
                scope.$eval(objName + '=newObj', {newObj: urlValue});

                var sync = function() {
                    // Watching the object to sync the changes to URL
                    var val = scope.$eval(objName);
                    setLocationSearch(urlName || objName, val, skipHistory);
                };
                var unwatchObject = scope.$watch(objName, function(nv, ov) {
                    if (!suspended) {
                        sync();
                    }
                }, true);

                syncers.push(sync);

                var unwatchLocation = scope.$watch(function() { return $location.search()[urlName || objName]; }, function(nv, ov) {
                    // Watching URL param to sync to object
                    if (nv){
                        scope.$eval(objName + '=newObj', {newObj: nv});
                    }
                }, true);

                return function unwatch() {
                    unwatchObject();
                    unwatchLocation();
                };
            },
            addJSONSynchronizedObject: function(scope, objName, urlName) {
                // Upon first call, the URLparams  erases the current object
                ignoreList.push(urlName || objName);
                var urlValue = $location.search()[urlName || objName];
                if(urlValue){
                    // does it starts with a {  ?
                    if(urlValue[0] === '{' ){
                        // old format ?
                        scope.$eval(objName + '=newObj', {newObj: JSON.parse(urlValue)});
                    } else {
                        // new format
                        scope.$eval(objName + '=newObj', {newObj: JSON.parse(b64_to_utf8(urlValue))});
                    }
                }

                var last_serialization;
                var sync = function() {
                    // Watching the object to sync the changes to URL
                    var val = scope.$eval(objName);
                    if (typeof val === "undefined") {
                        val = "";
                    }
                    last_serialization = utf8_to_b64(angular.toJson(val));
                    setLocationSearch(urlName || objName, last_serialization);
                };

                syncers.push(sync);
                var unwatch = scope.$watch(function() { return [scope.$eval(objName), $location.search()[urlName || objName]]; }, function(nv, ov) {
                    if (typeof nv[0] === "undefined") {
                        nv[0] = "";
                    }
                    if (last_serialization !== utf8_to_b64(angular.toJson(nv[0])) && !suspended) {
                        // sync to url if object has changed since last sync
                        sync();
                    } else if (last_serialization !== nv[1] && nv[1]) {
                        // else if something changed in the url, push it to the object
                        scope.$eval(function(scope) {
                            scope[objName] = JSON.parse(b64_to_utf8(nv[1]));
                        });
                    }
                }, true);

                return unwatch;
            },
            addSynchronizedObject: function(scope, objName, localObjectIgnoreList) {
                // Add an object as a synchronized object, meaning its content will be synchronized with the querystring.
                localObjectIgnoreList = localObjectIgnoreList || [];

                var syncFromURL = function() {
                    // Watching URL params to sync to object
                    var nv = angular.copy($location.search());
                    angular.forEach(nv, function(value, key){
                        // preserve ignored values
                        if(ignoreList.indexOf(key) >= 0){
                            delete nv[key];
                        }
                    });
                    if (localObjectIgnoreList.length > 0) {
                        var oldVal = scope.$eval(objName);
                        angular.forEach(localObjectIgnoreList, function(name) {
                            // We need to keep this parameter
                            if (angular.isDefined(oldVal[name])) {
                                nv[name] = oldVal[name];
                            }
                        });
                    }
                    scope.$eval(objName + '=newVal', {newVal: nv});
                };

                var syncToURL = function() {
                    var val = angular.copy(scope.$eval(objName));
                    angular.forEach(localObjectIgnoreList, function(name) {
                        // Don't send in the URL this parameters
                        if (angular.isDefined(val[name])) {
                            delete val[name];
                        }
                    });
                    angular.forEach($location.search(), function(value, key){
                        // Preserve ignored values that already exist in the URL:
                        // - from ignoreList, which is the list of values handled by other URLSync's
                        // - from localObjectIgnoreList, which is the list of object properties that we want to ignore
                        //   (both ways)
                        if(ignoreList.indexOf(key) >= 0 || localObjectIgnoreList.indexOf(key) >= 0){
                            val[key] = value;
                        }
                    });
                    setLocationSearch(val);
                };

                // Upon first call, the URLparams  erases the current object
                syncFromURL();

                var unwatchObject = scope.$watch(objName, function(nv, ov) {
                    if (!suspended) {
                        // Watching the object to sync the changes to URL
                        syncToURL();
                    }
                }, true);

                syncers.push(syncToURL);

                var unwatchLocation = scope.$watch(function () {
                    return $location.search();
                }, syncFromURL, true);

                return function unwatch() {
                    unwatchObject();
                    unwatchLocation();
                };
            }
        };
    }]);
}());
