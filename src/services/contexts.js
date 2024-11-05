(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var schemaCache = {};
    var loadingSchemas = {};

    mod.factory('ContextHelper', ['ODSAPI', '$q', 'QueryParameters', 'APIParamsV1ToV2',function (ODSAPI, $q, QueryParameters, APIParamsV1ToV2) {
        return {
            getDatasetContext: function(contextName, domainId, datasetId, contextParameters, source, apikey, schema) {
                var deferred = $q.defer();
                var context = {
                    'wait': function() {
                        return deferred.promise;
                    },
                    'getDownloadURL': function(format, parameters) {
                        if (!this.dataset || !this.dataset.datasetid) {
                            return;
                        }
                        format = format || 'csv';
                        var url = this.domainUrl + '/explore/dataset/' + this.dataset.datasetid + '/download/?format=' + format;
                        url += this.getQueryStringURL(parameters);
                        return url;
                    },
                    'getV2DownloadURL': function(format, parameters) {
                        if (!this.dataset || !this.dataset.datasetid) {
                            return;
                        }
                        format = format || 'csv';
                        var url = this.domainUrl + '/api/explore/v2.1/catalog/datasets/' + this.dataset.datasetid + '/exports/' + format + '?';
                        url += this.getV2QueryStringURL(parameters);
                        return url;
                    },
                    'getQueryStringURL': function(parameters) {
                        parameters = parameters || {};
                        return '&' + ODS.URLUtils.getAPIQueryString(angular.extend({}, this.parameters, parameters));
                    },
                    'getV2QueryStringURL': function(v1parameters) {
                        var fields = this.dataset && this.dataset.fields;
                        v1parameters = v1parameters || {};
                        var query = '';
                        if (v1parameters.fields){
                            var select_clause = [];
                            angular.forEach(v1parameters.fields.split(","), function(field) {
                                var referenceField = fields.find(function(referenceField) { return referenceField.name === field; });
                                if (referenceField) {
                                    select_clause.push('`'+referenceField.name+'` as `'+referenceField.label+'`');
                                }
                            });
                            query = "select=" + select_clause.join(",");
                        }
                        var allParameters = angular.extend({}, this.parameters, v1parameters);
                        query = query + "&use_labels=true&" + ODS.URLUtils.getAPIQueryString(APIParamsV1ToV2(allParameters, fields));
                        return query;
                    },
                    'toggleRefine': function(facetName, path, replace) {
                        ODS.Context.toggleRefine(this, facetName, path, replace);
                    },
                    getFacetValues: function(fieldName) {
                        var deferred = $q.defer();
                        var apiParams = angular.extend({}, this.parameters, {'rows': 0, 'facet': fieldName});
                        ODSAPI.records.search(this, apiParams).then(function(response) {
                            /* All the values returned by the APIs should be displayed in the palette, except in a situation where:
                                - the facet is disjunctive
                                - there is a refinement on that facet
                               In that situation, the API will return the other "possible" values that are not included in the result set.
                               If that happens, only the values with the state "refined" should be kept. */
                            var data = response.data;
                            var isFacetDisjunctive = data.parameters.disjunctive && data.parameters.disjunctive[fieldName];
                            var isFacetRefined = data.parameters.refine && angular.isDefined(data.parameters.refine[fieldName]);
                            var values = data.facet_groups.filter(function(facetGroup) { return facetGroup.name === fieldName; })[0]
                                                .facets
                                                .filter(function (category) {
                                                    return !isFacetDisjunctive || !isFacetRefined || category.state === "refined";
                                                })
                                                .map(function (category) {
                                                    return category.name;
                                                });
                            deferred.resolve(values);
                        });
                        return deferred.promise;
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
                                assetmetas: true,
                                source: sourceParameter
                            });
                        loadingSchemas[cacheKey].then(function (response) {
                            var data = response.data;
                            schemaCache[cacheKey] = data;
                            context.dataset = new ODS.Dataset(data);
                            deferred.resolve(context.dataset);
                        }, function () {
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
