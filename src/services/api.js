(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', 'odsNotificationService', 'odsHttpErrorMessages', '$q', function($http, ODSWidgetsConfig, odsNotificationService, odsHttpErrorMessages, $q) {
        /**
         * This service exposes Opendatasoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context ? context.domainUrl : '';
            url += path;
            params = ODS.URLUtils.cleanupAPIParams(params) || {};

            if (context && context.type === 'catalog') {
                params = ODS.URLUtils.computeCatalogFilterParams(params);
            }

            if (context && context.dataset && context.dataset.metas && context.dataset.metas.timezone) {
                params.timezone = context.dataset.metas.timezone;
            } else if (!params.timezone) {
                params.timezone = jstz.determine().name();
            }
            if (context && context.apikey) {
                params.apikey = context.apikey;
            }
            if (context && context.source) {
                params.source = context.source;
            }
            if (ODSWidgetsConfig.language) {
                params.lang = ODSWidgetsConfig.language;
            }
            if (params.dataset) {
                params.dataset = sourcedDatasetId(context, params.dataset);
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

            return $http
                .get(url, options)
                .catch(function(response) {
                    var data = response.data;
                    var status = response.status;
                    if (data) {
                        odsNotificationService.sendNotification(data);
                    } else if (status >= 400) {
                        odsNotificationService.sendNotification(odsHttpErrorMessages.getForStatus(status));
                    }
                    return $q.reject(response);
                });
        };

        var sourcedDatasetId = function(context, datasetId) {
            if (!context.domainUrl &&
                !context.domain &&
                !context.source &&
                datasetId.indexOf('@') === -1 &&
                ODSWidgetsConfig.defaultSourceDomain
            ) {
                return datasetId + '@' + ODSWidgetsConfig.defaultSourceDomain
            }
            return datasetId;
        }

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

                // Check if root is valid and safe url
                if (root && !(/^(http:\/\/|https:\/\/|\/)/.test(root))) {
                    console.error('Invalid domain context url provided');
                    root = ODSWidgetsConfig.defaultDomain;
                }

                if (ODSWidgetsConfig.secureContextDomain) {
                    // Only allow cases that ensure the data comes from a sanitized source, which is
                    // a real dataset schema. For that, we need to make sure the `domain` is the root
                    // of an ODS platform.
                    // This prevents attacks that would fetch the schema for example from a dataset attachment,
                    // which can be anything because it is not sanitized, and therefore could contain custom
                    // tooltips with offensive code etc.
                    // This is done after all the URL building code to make sure we catch all cases

                    // We want to make sure the source is the root of a legitimate ODS platform.
                    if (!root) {
                        // Local domain
                    } else {
                        var url;
                        try {
                            url = new URL(root);
                        }
                        catch(e) {
                            console.error('Invalid context domain URL ('+root+')');
                            root = '';
                        }
                        if (url) {
                            if (url.pathname && url.pathname !== '/') {
                                // We don't allow anything else than the root
                                root = '';
                                console.error('Invalid context domain URL: paths are not allowed (' + url.pathname + ')');
                            }
                            if (!url.host.endsWith('.opendatasoft.com') && url.host !== window.location.host) {
                                // We don't allow external URLs that are not ODS URLs, except if it's the current host
                                // in the browser
                                root = '';
                                console.error('Invalid context domain URL: forbidden host (' + url.host + '), only the current host or an opendatasoft.com URL is allowed');
                            }
                        }
                    }
                }

                return root;
            },
            'datasets': {
                'get': function(context, datasetID, parameters, timeout) {
                    return request(context, '/api/datasets/1.0/'+ sourcedDatasetId(context, datasetID) +'/', parameters, timeout);
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
                    // return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout)
                        .then(function(response) {
                            var headers = response.headers;
                            if (headers()['ods-analyze-truncated']) {
                                odsNotificationService.sendNotification(translate("An analysis request hit the maximum number of results limit. Returned data is incomplete and not trustworthy."));
                            }
                            return response;
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
            },
            'georeference': {
                'uid': function(uid, parameters, timeout) {
                    return request(null, '/api/georeference/v1/uid/'+uid+'/', parameters || {}, timeout);
                }
            }
        };
    }]);

}());
