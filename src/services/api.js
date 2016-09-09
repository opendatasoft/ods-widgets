(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    function encodeUriQuery(val, pctEncodeSpaces) {
      return encodeURIComponent(val).
                 replace(/%40/gi, '@').
                 replace(/%3A/gi, ':').
                 replace(/%24/g, '$').
                 replace(/%2C/gi, ',').
                 replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    }

    function serializeValue(v) {
      if (angular.isObject(v)) {
        return angular.isDate(v) ? v.toISOString() : angular.toJson(v);
      }
      return v;
    }

    mod.service('ODSParamSerializer', function() {
        return function ngParamSerializer(params) {
          if (!params) return '';
          var parts = [];
            angular.forEach(params, function(value, key) {
            if (value === null || angular.isUndefined(value)) return;
            if (angular.isArray(value)) {
              angular.forEach(value, function(v, k) {
                parts.push(encodeUriQuery(key)  + '=' + encodeUriQuery(serializeValue(v)));
              });
            } else {
              parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(value)));
            }
          });

          return parts.join('&');
        };
    });

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', 'odsNotificationService', 'ODSParamSerializer', function($http, ODSWidgetsConfig, odsNotificationService, ODSParamSerializer) {
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
            var options = {
                params: params,
                paramSerializer: ODSParamSerializer
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
                    error(function(data) {
                        if (data) {
                            odsNotificationService.sendNotification(data);
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
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout)
                        .success(function(data, status, headers, config) {
                            if (headers()['ods-analyze-truncated']) {
                                odsNotificationService.sendNotification("An analysis request hit the maximum number of results limit. Returned data is incomplete and not trustworthy.");
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
            'reuses': function(context, parameters) {
                return request(context, '/api/reuses/', parameters);
            }
        };
    }]);

}());
