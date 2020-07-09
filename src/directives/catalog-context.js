(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCatalogContext', ['ODSAPI', 'URLSynchronizer', '$interpolate', function(ODSAPI, URLSynchronizer, $interpolate) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCatalogContext
         * @scope
         * @restrict AE
         *  @param {string} context <i>(mandatory)</i> Name, or list of names separated by commas, of context(s) to declare. Context names must be in lowercase, can only contain alphanumerical characters, and cannot begin with a number, "data", or "x".
         *  @param {string} [domain=ODSWidgetsConfig.defaultDomain] Domain where the dataset(s) can be found. Since the domain value is used to construct an URL to an API root, it can be:
         *
         *  - an alphanum string (e.g. *mydomain*): it will assume that it is an Opendatasoft domain (e.g. *mydomain.opendatasoft.com*)
         *  - a hostname (e.g. *data.mydomain.com*)
         *  - a relative path (e.g. _/monitoring_): it will be relative to the hostname of the current page
         *  - a hostname and a path (e.g. *data.mydomain.com/monitoring*)
         *
         * By default, if the domain parameter is not set, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.defaultDomain} is used.
         *
         *  @param {string} [apikey=none] API key to use in every API call for the context (see {@link https://help.opendatasoft.com/platform/en/managing_account/02_generating_api_key/generating_api_key.html#id1 Generating an API key}).
         *  @param {object} [parameters=none] Object holding parameters to apply to the context when it is created.
         *  @param {boolean} [urlSync=none] Enables synchronization of the parameters to the page's parameters (query string). When sharing the page with parameters in the URL, the context will use them; and if the context parameters change, the URL parameters will change as well. Note that if this parameter is enabled, `parameters` and `parametersFromContext` won't have any effect. There can also only be a single context with URL synchronization enabled, else the behavior will be unpredictable.
         *
         *  @description
         *
         *  The odsCatalogContext widget represents the entire catalog of datasets of a chosen domain, and a set of parameters used to query this catalog. A catalog context can be used by one or more widgets: it allows them sharing information (i.e. the query parameters).
         *
         *  For instance, a widget that displays a time filter ({@link ods-widgets.directive:odsTimerange odsTimerange}) can be plugged on the same context as a results list ({@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}), so that the user can filter the displayed results.
         *
         *  odsCatalogContext creates a new child scope, within which its declared contexts are available for any other widget used inside that odsCatalogContext element. odsCatalogContext widgets can also be nested inside each others.
         *
         *  A single odsCatalogContext can declare one or several contexts, which are initialized when declared through the **context** parameter. Each context is configured using parameters prefixed by the context name (`contextname-setting`, e.g. mycontext-domain).
         *
         *  <b>Properties of odsCatalogContext used as variable</b>
         *
         *  Once created, the context is accessible as a variable named after it. The context contains properties that can be accessed directly:
         *
         *  * domainUrl: full URL of the domain of the context, that can be used to create links
         *  * parameters: parameters object of the context
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="simple_example.html">
         *          <ods-catalog-context context="examples"
         *                               examples-domain="https://widgets-examples.opendatasoft.com/">
         *              <ods-most-popular-datasets context="examples"></ods-most-popular-datasets>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         *
         *  <example module="ods-widgets">
         *      <file name="odsresultenumerator_with_catalog_context.html">
         *          <ods-catalog-context context="examples"
         *                               examples-domain="https://widgets-examples.opendatasoft.com/">
         *                 {{ examples }}
         *              <ods-result-enumerator context="examples">
         *                 {{item.datasetid}}
         *              </ods-result-enumerator>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var contextNames = $attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // Do we have a domain ID?
                    var domain = $attrs[contextName+'Domain'];
                    if (domain) {
                        domain = $interpolate(domain)($scope);
                    }

                    var parameters = $scope.$eval($attrs[contextName+'Parameters']) || {};
                    if ($attrs[contextName+'Source']) {
                        parameters.source = $interpolate($attrs[contextName+'Source'])($scope);
                    }

                    var apikey = $attrs[contextName+'Apikey'];
                    if (apikey) {
                       apikey = $interpolate(apikey)($scope);
                    }

                    $scope[contextName] = {
                        'name': contextName,
                        'type': 'catalog',
                        'domain': domain,
                        'domainUrl': ODSAPI.getDomainURL(domain),
                        'apikey': apikey,
                        'parameters': parameters,
                        'toggleRefine': function(facetName, path, replace) {
                            ODS.Context.toggleRefine(this, facetName, path, replace);
                        },
                        'getActiveFilters':  function (excludes) {
                            excludes = excludes || [];
                            if (this.parameters) {
                                var filters = Object.keys(this.parameters);
                                var that = this;
                                return filters.filter(function (filter) {
                                    // For parameters that have or "q.someSuffix"
                                    var queryPattern = /q\.[^\s]*/;
                                    return (filter == 'q' && that.parameters.q && that.parameters.q.length > 0) ||
                                            filter == 'q.timerange' ||
                                            filter == 'geofilter.polygon' ||
                                            filter == 'geofilter.distance' ||
                                            filter == 'geonav' ||
                                            filter == 'geonav-asc' ||
                                            filter.indexOf('refine.') === 0 ||
                                            filter.match(queryPattern) ||
                                            (filter == 'q.geographic_area' && that.parameters['q.geographic_area'] && that.parameters['q.geographic_area'].length > 0);
                                }).filter(function(filter) {
                                    return excludes.indexOf(filter) === -1;
                                });
                            } else {
                                return [];
                            }
                        },
                        'clearActiveFilters': function () {
                            var activeFilters = this.getActiveFilters();
                            for (var i = 0; i<activeFilters.length; i++) {
                                delete this.parameters[activeFilters[i]];
                            }
                        }
                    };

                    if ($scope.$eval($attrs[contextName+'Urlsync'])) {
                        if (!angular.equals(parameters, {})) {
                            console.log('WARNING : Context ' + contextName + ' : There are specific parameters defined, but URL sync is enabled, so the parameters will be ignored.');
                        }
                        URLSynchronizer.addSynchronizedObject($scope, contextName + '.parameters');
                    }
                }
            }]
        };
    }]);
}());
