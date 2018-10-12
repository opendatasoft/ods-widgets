(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', 'odsNotificationService', 'odsHttpErrorMessages', '$q', function($http, ODSWidgetsConfig, odsNotificationService, odsHttpErrorMessages, $q) {
        /**
         * This service exposes OpenDataSoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context ? context.domainUrl : '';
            url += path;
            params = ODS.URLUtils.cleanupAPIParams(params) || {};

            params.timezone = jstz.determine().name();
            if (context && context.apikey) {
                params.apikey = context.apikey;
            }
            if (context && context.source) {
                params.source = context.source;
            }
            var options = {
                params: params,
                paramSerializer: function(params) {
                    return ODS.URLUtils.getAPIQueryString(params);
                }
            };
            if (timeout) {
                options.timeout = timeout;
            }

            if (!url.startsWith('http://')) {
                if (ODSWidgetsConfig.customAPIHeaders) {
                    options.headers = ODSWidgetsConfig.customAPIHeaders;
                } else {
                    options.headers = {};
                }
                options.headers['ODS-Widgets-Version'] = ODSWidgetsConfig.ODSWidgetsVersion;
            }
            if (!context.domainUrl || Modernizr.cors) {
                return $http.
                    get(url, options).
                    error(function(data, status) {
                        if (data) {
                            odsNotificationService.sendNotification(data);
                        } else if (status >= 400) {
                            odsNotificationService.sendNotification(odsHttpErrorMessages.getForStatus(status));
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
            'uniqueCall': function(func) {
                /*
                   generate an API call that automatically cancels the previous one to avoid
                   race conditions in the result return (first call result arriving after the second one).
                 */
                var canceller;
                return function() {
                    var args = Array.prototype.slice.call(arguments);
                    var http_promise;
                    if (canceller) {
                        canceller.resolve();
                        canceller = undefined;
                    }

                    canceller = $q.defer();

                    http_promise = func.apply(null, args.concat(canceller.promise));

                    http_promise.finally(function() {
                        canceller = undefined;
                    });

                    return http_promise;
                };
            },
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
                'get': function(context, datasetID, parameters, timeout) {
                    return request(context, '/api/datasets/1.0/'+datasetID+'/', parameters, timeout);
                },
                'search': function(context, parameters, timeout) {
                    var queryParameters = angular.extend({}, context.parameters, parameters);
                    return request(context, '/api/datasets/1.0/search/', queryParameters, timeout);
                },
                'facets': function(context, facetName, timeout) {
                    var queryParameters = angular.extend({}, context.parameters, {'rows': 0, 'facet': facetName});
                    return request(context, '/api/datasets/1.0/search/', queryParameters, timeout);
                }
            },
            'records': {
                // FIXME: Why don't we implicitely use the parameters from the context, instead of requiring the widgets
                // to explicitely send them together with the other parameters?
                'analyze': function(context, parameters, timeout) {
//                    return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout)
                        .success(function(data, status, headers, config) {
                            if (headers()['ods-analyze-truncated']) {
                                odsNotificationService.sendNotification(translate("An analysis request hit the maximum number of results limit. Returned data is incomplete and not trustworthy."));
                            }
                        });
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
            'reuses': function(context, parameters, timeout) {
                return request(context, '/api/reuses/', parameters, timeout);
            }
        };
    }]);

}());
