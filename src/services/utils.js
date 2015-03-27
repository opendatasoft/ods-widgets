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
                    ["https://code.highcharts.com/3.0.10/highcharts.js"],
                    ["https://code.highcharts.com/3.0.10/modules/no-data-to-display.js"],
                    ["https://code.highcharts.com/3.0.10/highcharts-more.js"]
                ]
            },
            'leaflet': {
                'css': [
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css",
                    "https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/leaflet.fullscreen.css",
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
                        "L.Control.FullScreen@https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/Leaflet.fullscreen.min.js",
                        "L.Control.Locate@https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.js",
                        "L.Label@libs/leaflet-label/leaflet.label.js",
                        "L.ODSMap@libs/ods-map/ods-map.js",
                        "L.ODSTileLayer@libs/ods-map/ods-tilelayer.js",
                        "L.Control.Geocoder@libs/leaflet-control-geocoder/Control.Geocoder.js",
                        "L.VectorMarker@libs/ods-vectormarker/vectormarker.js",
                        "L.ClusterMarker@libs/ods-clustermarker/clustermarker.js",
                        //"L.UtfGrid@libs/leaflet-utfgrid/leaflet.utfgrid.js",
                        "L.Draw@libs/leaflet-draw/leaflet.draw.js",
                        //"L.BundleTileLayer@libs/ods-bundletilelayer/bundletilelayer.js",
                        "QuadTree@libs/leaflet-heatmap/QuadTree.js",
                        "h337@libs/leaflet-heatmap/heatmap.js",
                        "L.TileLayer.HeatMap@libs/leaflet-heatmap/heatmap-leaflet.js"
                    ]
                ]
            },
            'rome': {
                'css': ['libs/rome/rome.css'],
                'js': ['libs/rome/rome.standalone.js']
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
                    loading[url] = deferred;
                    // If it is a relative URL, make it relative to ODSWidgetsConfig.basePath
                    var realURL =  url.substring(0, 1) === '/'
                                || url.substring(0, 7) === 'http://'
                                || url.substring(0, 8) === 'https://' ? url : ODSWidgetsConfig.basePath + url;
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
                        var parts = step[k].split('@');
                        var url;
                        if (parts.length > 1) {
                            // There is an object name whose existence we can check
                            if (isAlreadyAvailable(parts[0])) {
                                continue;
                            }
                            url = parts[1];
                        } else {
                            url = parts[0];
                        }

                        if (loaded.indexOf(url) === -1) {
                            promises.push(lazyload(type, url).promise);
                        } else {
                            promises.push(loading[url].promise);
                        }
                    }
                    $q.all(promises).then(function() {
                        loadSequence(type, module, deferred, i + 1);
                    });
                }

                return deferred.promise;
            };
            return function(name) {
                var module = lazyloading[name];
                var promises = [];
                if (module.css) {
                    promises.push(loadSequence('css', module.css, $q.defer()));
                }
                if (module.js) {
                    promises.push(loadSequence('js', module.js, $q.defer()));
                }

                return $q.all(promises);
            };
        }];
    });

    mod.factory("DebugLogger", ['$window', function($window) {
        // TODO: Don't duplicate our own DebugLogger
        return {
            log: function() {
                if ($window.location.hash == '#debug' || $window.location.hash.indexOf('debug=') >= 0 || $(document.body).hasClass('showDebug')) {
                    console.log.apply(console, arguments);
                }
            }
        };
    }]);

    mod.factory("odsErrorService", function() {
        var notificationList = [];
        return {
            registerForErrorNotification: function(callback) {
                notificationList.push(callback);
            },
            sendErrorNotification: function(error) {
                if (angular.isString(error)) {
                    error = {
                        title: 'Error',
                        error: error
                    };
                }
                angular.forEach(notificationList, function(callback) {
                    callback(error);
                });
            },
            markErrorAsHandled: function(error) {
                error.handled = true;
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

        var loadImageInline = function(element, code, color) {
            var svg = angular.element(code);
            if (color) {
                svg.css('fill', color);
                svg.find('path, polygon, circle, rect, text').css('fill', color); // Needed for our legacy SVGs of various quality...
            }
            element.append(svg);
        };

        this.$get = ['$http', '$q', function($http, $q) {
            var retrieve = function(url, color, getPromise) {
                var deferred;
                if (getPromise) {
                    deferred = $q.defer();
                }
                var element = angular.element('<div></div>');
                if (!url) {
                    loadImageInline(element, FALLBACK, color);
                    if (getPromise) { deferred.resolve(element); }
                } else if (url.indexOf('.svg') === -1) {
                    // Normal image
                    element.append(angular.element('<img src="' + url + '"/>'));
                    if (getPromise) { deferred.resolve(element); }
                } else {
                    // SVG
                    if (inlineImages[url]) {
                        if (inlineImages[url].code) {
                            loadImageInline(element, inlineImages[url].code, color);
                            if (getPromise) { deferred.resolve(element); }
                        } else {
                            inlineImages[url].promise.success(function (data) {
                                loadImageInline(element, data, color);
                                if (getPromise) { deferred.resolve(element); }
                            }).error(function() {
                                loadImageInline(element, FALLBACK, color);
                                if (getPromise) { deferred.resolve(element); }
                            });
                        }

                    } else {
                        var promise = $http.get(url);
                        inlineImages[url] = {promise: promise};
                        promise.success(function (data) {
                            inlineImages[url].code = data;
                            loadImageInline(element, data, color);
                            if (getPromise) { deferred.resolve(element); }
                        }).error(function(data, status) {
                            // Ignore it silently
                            console.log('WARNING: Unable to fetch SVG image', url, 'HTTP status:', status);
                            inlineImages[url].code = FALLBACK;
                            loadImageInline(element, FALLBACK, color);
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

            return {
                getElement: function(url, color) {
                    return retrieve(url, color);
                },
                getPromise: function(url, color) {
                    return retrieve(url, color, true);
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
                var url = context && context.domainUrl || '';
                if (picto.startsWith('icon-')) {
                    // Old icon set (v1), from fontawesome 3.2.1
                    var pictoName = picto.replace('icon-', '');
                    if (FONTAWESOME_3_TO_4[pictoName]) {
                        pictoName = FONTAWESOME_3_TO_4[pictoName];
                    }
                    url += '/static/pictos/img/set-v1/fa/' + pictoName + '.svg';
                } else if (picto.startsWith('pdpicto-') || picto.startsWith('odspicto-')) {
                    // Legacy - old picto set
                    picto = picto.replace('pdpicto-', 'pdpicto/').replace('odspicto-', 'odspicto/');
                    url += '/static/pictos/img/set-v1/' + picto + '.svg';
                } else {
                    // New picto set
                    url += '/static/pictos/img/set-v2/' + picto + '.svg';
                }
                return url;
            }
        };
    });
}());