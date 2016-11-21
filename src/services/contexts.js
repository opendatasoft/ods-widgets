(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('ContextHelper', ['ODSAPI', '$q', function (ODSAPI, $q) {
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
                    'getActiveFilters':  function () {
                        if (this.parameters) {
                            var filters = Object.keys(this.parameters);
                            var that = this;
                            return filters.filter(function (filter) {
                                return (filter == 'q' && that.parameters.q && that.parameters.q.length > 0)
                                    || filter == 'geofilter.polygon'
                                    || filter == 'geofilter.distance'
                                    || filter.indexOf('refine.') === 0
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
                    'source': (contextParameters && contextParameters.source) || source || null
                };

                if (schema) {
                    context.dataset = new ODS.Dataset(schema);
                    deferred.resolve(context.dataset);
                } else {
                    ODSAPI.datasets.get(context, datasetId, {
                        extrametas: true,
                        interopmetas: true,
                        source: (contextParameters && contextParameters.source) || source || ""
                    }).
                        success(function (data) {
                            context.dataset = new ODS.Dataset(data);
                            deferred.resolve(context.dataset);
                        }).error(function (data) {
                            deferred.reject("Failed to fetch " + contextName + " context.");
                        });
                }
                return context;
            }
        };
    }]);
}());