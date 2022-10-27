(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('ODSAPIv2', ['$http', 'ODSWidgetsConfig', 'odsNotificationService', 'odsHttpErrorMessages', '$q', function($http, ODSWidgetsConfig, odsNotificationService, odsHttpErrorMessages, $q) {
        /**
         * This service exposes Opendatasoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context ? context.domainUrl : '';
            url += path;

            if (context && context.dataset && context.dataset.metas && context.dataset.metas.timezone) {
                params.timezone = context.dataset.metas.timezone;
            } else if (!params.timezone) {
                params.timezone = jstz.determine().name();
            }

            if (context && context.apikey) {
                params.apikey = context.apikey;
            }

            if (ODSWidgetsConfig.language) {
                params.lang = ODSWidgetsConfig.language;
            }

            var options = {
                params: params,
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

        var getCatalogRoot = function(context) {
            var source = context.parameters.source;

            if (['monitoring', 'shared'].indexOf(source) >= 0) {
                // Supported alternative roots
                return source;
            }

            // Default root
            return 'catalog';
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
            datasets: {
                records: function(context, parameters, timeout) {
                    return request(context, '/api/v2/' + getCatalogRoot(context) + '/datasets/' + context.dataset.datasetid + '/records', parameters, timeout);
                },
                aggregates: function(context, parameters, timeout) {
                    return request(context, '/api/v2/' + getCatalogRoot(context) + '/datasets/' + context.dataset.datasetid + '/aggregates', parameters, timeout);
                }
            }
        };
    }]);

}());
