(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', 'odsErrorService', function($http, ODSWidgetsConfig, odsErrorService) {
        /**
         * This service exposes OpenDataSoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context ? context.domainUrl : '';
            url += path;
            params = params || {};
            params.timezone = jstz.determine().name();
            if (context && context.apikey) {
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
            } else {
                options.headers = {};
            }
            options.headers['ODS-Widgets-Version'] = ODSWidgetsConfig.ODSWidgetsVersion;
            if (!context.domainUrl || Modernizr.cors) {
                return $http.
                    get(url, options).
                    error(function(data) {
                        if (data) {
                            odsErrorService.sendErrorNotification(data);
                        }
                    });
            } else {
                // Fallback for non-CORS browsers (IE8, IE9)
                // In that case we won't have proper errors from the API
                url += url.indexOf('?') > -1 ? '&' : '?';
                url += 'callback=JSON_CALLBACK';
                return $http.jsonp(url, options);
            }

        };
        return {
            'getDomainURL': function(domain) {
                var root = null;
                if (angular.isUndefined(domain) || domain === null || domain === '') {
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
                // FIXME: Why don't we implicitely use the parameters from the context, instead of requiring the widgets
                // to explicitely send them together with the other parameters?
                'analyze': function(context, parameters, timeout) {
//                    return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'search': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/search/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'download': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/download/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geo': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geocluster/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geopreview': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geopreview/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'boundingbox': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/boundingbox/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geopolygon': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geopolygon/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                }
            },
            'reuses': function(context, parameters) {
                return request(context, '/explore/reuses/', parameters);
            }
        };
    }]);

}());