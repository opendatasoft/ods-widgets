(function() {
    'use strict';

    var mod = angular.module('ods-widgets', ['infinite-scroll', 'ngSanitize', 'translate', 'translate.directives', 'translate.filters']);
    /**
     *  CONFIGURATION
     *
     *   var app = angular.module('myapp').config(function(ODSWidgetsConfigProvider) {
     *       ODSWidgetsConfig.setConfig({
     *           defaultDomain: '/myapi'
     *       });
     *   });
     * */
    mod.provider('ODSWidgetsConfig', function() {
        /**
         * @ngdoc object
         * @name ods-widgets.ODSWidgetsConfigProvider
         * @description
         * Use `ODSWidgetsConfigProvider` to set configuration values used by various directives.
         * The available settings are:
         *
         * - **`defaultDomain`** - {@type string} - Value used as `domain` parameter for {@link ods-widgets.directive:odsCatalogContext Catalog Contexts}
         * and {@link ods-widgets.directive:odsDatasetContext Dataset Contexts} when none is specified. Defaults is '' (empty string), which means a local API (root is /).
         * - **`basemaps`** - {@type Array} A list of `basemap` objects.
         * - **`chartColors`** - {@type Array} A list of colors to use for charts. In each chart widget, the first chart will use the first color, the second chart
         * will use the second color, and so on until the end of the list is reached, and we start from the beginning of the list again. If not set, default colors will be used,
         * depending on the widgets themselves.
         * - **`disqusShortname`** - {@type string} - Shortname used by default for all {@link ods-widgets.directive:odsDisqus} widgets.
         * - **`themes`** - {@type Object} - Configuration of themes and their colors and/or picto
         */
        /**
         * @ngdoc service
         * @name ods-widgets.ODSWidgetsConfig
         * @description
         * A service containing all the configuration values available. Available configuration values are described
         * in the {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfigProvider} documentation.
         */
        this.defaultConfig = {
            defaultDomain: '', // Defaults to local API
            language: null,
            disqusShortname: null,
            customAPIHeaders: null,
            basemaps: [
                {
                    "provider": "mapquest",
                    "label": "MapQuest"
                }
            ],
            mapGeobox: false,
            chartColors: null,
            mapPrependAttribution: null,
            basePath: '/static/ods-widgets/',
            themes: {}
        };

        this.customConfig = {};

        this.setConfig = function(customConfig) {
            /**
             * @ngdoc method
             * @name ods-widgets.ODSWidgetsConfigProvider#setConfig
             * @methodOf ods-widgets.ODSWidgetsConfigProvider
             *
             * @description Sets configuration values by overriding existing values with the values from a new configuration
             * object. Existing values that are not present in the new object are left untouched.
             *
             * @param {Object=} customConfig An object containing the configuration values to override.
             */
            angular.extend(this.customConfig, customConfig);
        };

        this.$get = function() {
            return angular.extend({}, this.defaultConfig, this.customConfig);
        };
    });

    /** SERVICES */

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', function($http, ODSWidgetsConfig) {
        /**
         * This service exposes OpenDataSoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context.domainUrl;
            url += path;
            params = params || {};
            if (context.apikey) {
                params.apikey = context.apikey;
            }
            var options = {
                params: params
            };
            if (timeout) {
                options.timeout = timeout;
            }
            if (ODSWidgetsConfig.customAPIHeaders) {
                options.headers = ODSWidgetsConfig.customAPIHeaders;
            }
            return $http.get(url, options);
        };
        return {
            'getDomainURL': function(domain) {
                var root = null;
                if (angular.isUndefined(domain) || domain === null) {
                    root = ODSWidgetsConfig.defaultDomain;
                } else {
                    if (domain.substr(0, 1) !== '/' && domain.indexOf('.') === -1) {
                        root = domain+'.opendatasoft.com';
                    } else {
                        root = domain;
                    }
                    if (root.substr(0, 1) !== '/' && root.indexOf('http://') === -1 && root.indexOf('https://') === -1) {
                        root = 'https://' + root;
                    }
                }

                if (root.substr(-1) === '/') {
                    // Remove trailing slash
                    root = root.substr(0, root.length-1);
                }

                return root;
            },
            'datasets': {
                'get': function(context, datasetID, parameters) {
                    return request(context, '/api/datasets/1.0/'+datasetID+'/', parameters);
                },
                'search': function(context, parameters) {
                    var queryParameters = angular.extend({}, context.parameters, parameters);
                    return request(context, '/api/datasets/1.0/search/', queryParameters);
                },
                'facets': function(context, facetName) {
                    return this.search(context, {'rows': 0, 'facet': facetName});
                }
            },
            'records': {
                'analyze': function(context, parameters) {
//                    return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'search': function(context, parameters) {
                    return request(context, '/api/records/1.0/search/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'download': function(context, parameters) {
                    return request(context, '/api/records/1.0/download/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'geo': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geocluster/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geopreview': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geopreview/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'boundingbox': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/boundingbox/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                }
            },
            'reuses': function(context, parameters) {
                return request(context, '/explore/reuses/', parameters);
            }
        };
    }]);

    mod.provider('ModuleLazyLoader', function() {
        // TODO: Don't load if the global object is already available
        var lazyloading = {
            'highcharts': {
                'css': [],
                'js': [
                    ["//code.highcharts.com/3.0.7/highcharts.js"],
                    ["//code.highcharts.com/3.0.7/highcharts-more.js"]
                ]
            },
            'leaflet': {
                'css': [
                    "//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css",
                    "//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/leaflet.fullscreen.css",
                    "//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.css",
                    "/static/ods-geobox/geobox.css",
                    "/static/ods-vectormarker/vectormarker.css",
                    "/static/ods-clustermarker/clustermarker.css"
                ],
                'js': [
                    ["L@//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"],
                    [
                        "L.Control.FullScreen@//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/Leaflet.fullscreen.min.js",
                        "L.Control.Locate@//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.js",
                        "L.ODSMap@/static/ods-map/ods-map.js",
                        "L.ODSTileLayer@/static/ods-map/ods-tilelayer.js",
                        "L.Control.GeoBox@/static/ods-geobox/geobox.js",
                        "L.VectorMarker@/static/ods-vectormarker/vectormarker.js",
                        "L.ClusterMarker@/static/ods-clustermarker/clustermarker.js"
                    ]
                ]
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

        this.$get = ['$q', function($q) {
            var loading = {};
            var loaded = [];

            var lazyload = function(type, url) {
                if (angular.isDefined(loading[url])) {
                    return loading[url];
                } else {
                    var deferred = $q.defer();
                    LazyLoad[type](url, function() {
    //                    console.log('Loaded:', url);
                        loaded.push(url);
                        deferred.resolve();
                    });
                    loading[url] = deferred;
                    return deferred;
                }
            };

            return function(name) {
                var module = lazyloading[name];
                var promises = [];

                for (var i=0; i<module.css.length; i++) {
                    if (loaded.indexOf(module.css[i]) === -1) {
                        promises.push(lazyload('css', module.css[i]).promise);
                    }
                }

                var jsDeferred = $q.defer();
                var deferredSteps = null;
                for (var j=0; j<module.js.length; j++) {
                    // Each item is a step in a sequence
                    var step = module.js[j];
                    if (!angular.isArray(step)) {
                        step = [step];
                    }

                    var stepPromises = [];
                    for (var k=0; k<step.length; k++) {
                        var parts = step[k].split('@');
                        var url;
                        if (parts.length > 1) {
                            // There is an object name whose existence we can check
                            if (isAlreadyAvailable(parts[0])) {
//                                console.log('Object ' + parts[0] + ' is already available.');
                                continue;
                            }
                            url = parts[1];
                        } else {
                            url = parts[0];
                        }
                        if (loaded.indexOf(url) === -1) {
                            stepPromises.push(lazyload('js', url).promise);
                        }
                    }
                    if (!deferredSteps) {
                        deferredSteps = $q.all(stepPromises);
                    } else {
                        deferredSteps = deferredSteps.then(function() {
                            return $q.all(stepPromises);
                        });
                    }
                }
                deferredSteps.then(function() { jsDeferred.resolve(); });
                promises.push(jsDeferred.promise);
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
}());
