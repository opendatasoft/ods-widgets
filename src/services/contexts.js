(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var schemaCache = {};
    var loadingSchemas = {};

    mod.factory('ContextHelper', ['ODSAPI', '$q', 'QueryParameters', function (ODSAPI, $q, QueryParameters) {
        return {
            getDatasetContext: function(contextName, domainId, datasetId, contextParameters, source, apikey, schema) {
                var deferred = $q.defer();
                var context = {
                    'wait': function() {
                        return deferred.promise;
                    },
                    'getDownloadURL': function(format, parameters) {
                        format = format || 'csv';
                        var url = this.domainUrl + '/explore/dataset/' + this.dataset.datasetid + '/download/?format=' + format;
                        url += this.getQueryStringURL(parameters);
                        return url;
                    },
                    'getQueryStringURL': function(parameters) {
                        parameters = parameters || {};
                        return '&' + ODS.URLUtils.getAPIQueryString(angular.extend({}, this.parameters, parameters));
                    },
                    'toggleRefine': function(facetName, path, replace) {
                        ODS.Context.toggleRefine(this, facetName, path, replace);
                    },
                    'getActiveFilters':  function (excludes) {
                        excludes = excludes || [];
                        if (this.parameters) {
                            var filters = Object.keys(this.parameters);
                            var that = this;
                            return filters.filter(function (filter) {
                                var allowedQueryParameters = QueryParameters;

                                // For parameters that have a user defined suffix (i.e: "q.someSuffix")
                                var queryPattern = /q\.[^\s]*/;

                                return (filter == 'q' && that.parameters.q && that.parameters.q.length > 0) ||
                                       (allowedQueryParameters.indexOf(filter) > -1) ||
                                       filter == 'geofilter.polygon' ||
                                       filter == 'geofilter.distance' ||
                                       filter.indexOf('refine.') === 0 ||
                                       filter.match(queryPattern);
                            }).filter(function(filter) {
                                return excludes.indexOf(filter) === -1;
                            });
                        } else {
                            return [];
                        }
                    },
                    'name': contextName,
                    'type': 'dataset',
                    'domain': domainId,
                    'domainUrl': ODSAPI.getDomainURL(domainId),
                    'apikey': apikey,
                    'dataset': null,
                    'parameters': contextParameters,
                    'source': (contextParameters && contextParameters.source) || source || null,
                    'error': false
                };

                if (schema) {
                    context.dataset = new ODS.Dataset(schema);
                    deferred.resolve(context.dataset);
                } else {
                    var sourceParameter = (contextParameters && contextParameters.source) || source || "";
                    var cacheKey = (context.domain || "") + '.' + sourceParameter + '.' + datasetId + '.' + (apikey || "");
                    if (angular.isDefined(schemaCache[cacheKey])) {
                        // The schema is already available
                        context.dataset = new ODS.Dataset(schemaCache[cacheKey]);
                        deferred.resolve(context.dataset);
                    } else if (angular.isDefined(loadingSchemas[cacheKey])) {
                        // Someone is fetching the schema already, let's use their request
                        loadingSchemas[cacheKey].then(function(response) {
                            context.dataset = new ODS.Dataset(response.data);
                            deferred.resolve(context.dataset);
                        });
                    } else {
                        // We need to fetch it entirely
                        loadingSchemas[cacheKey] =
                            ODSAPI.datasets.get(context, datasetId, {
                                extrametas: true,
                                interopmetas: true,
                                source: sourceParameter
                            });
                        loadingSchemas[cacheKey].success(function (data) {
                            schemaCache[cacheKey] = data;
                            context.dataset = new ODS.Dataset(data);
                            deferred.resolve(context.dataset);
                        }).error(function (data) {
                            context.error = true;
                            deferred.reject("Failed to fetch " + contextName + " context.");
                        });
                    }
                }
                return context;
            }
        };
    }]);
}());
