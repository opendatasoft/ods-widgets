(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDatasetContext', ['ODSAPI', '$q', '$interpolate', '$interval', 'URLSynchronizer', 'ContextHelper', function(ODSAPI, $q, $interpolate, $interval, URLSynchronizer, ContextHelper) {
        /**
         *
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsDatasetContext
         *  @scope
         *  @restrict AE
         *  @param {string} context <i>(mandatory)</i> Name, or list of names separated by commas, of context(s) to declare. Context names must be in lowercase, can only contain alphanumerical characters, and cannot begin with a number, "data", or "x".
         *  @param {string} dataset <i>(mandatory)</i> Identifier of the dataset(s) on which the context is based.
         *  @param {string} [domain=ODSWidgetsConfig.defaultDomain] Domain where the dataset(s) can be found. Since the domain value is used to construct a URL to an API root, it can be:
         *
         *  - an alphanumeric string (e.g., *mydomain*): it will assume that it is an Opendatasoft domain (e.g., *mydomain.opendatasoft.com*)
         *  - a hostname (e.g., *data.mydomain.com*)
         *  - a relative path (e.g., _/monitoring_): it will be relative to the hostname of the current page
         *  - a hostname and a path (e.g., *data.mydomain.com/monitoring*)
         *
         * By default, if the domain parameter is not set, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.defaultDomain} is used.
         *
         *  @param {string} [apikey=none] API key to use in every API call for the context (see {@link https://help.opendatasoft.com/platform/en/managing_account/02_generating_api_key/generating_api_key.html#id1 Generating an API key}).
         *  @param {string} [sort=none] Sorts expression to apply by default to all widgets plugged to the declared context. The expression should be written using one of the following syntaxes:
         *
         *  - `field` for an ascending order,
         *  - `-field` for a descending order.
         *
         *  @param {object} [parameters=none] Object holding parameters to apply to the context when it is created. Any parameter from the API can be used here (such as `q` or `refine.FIELD`).
         *  @param {number} [refreshDelay=none] Number of milliseconds to wait before the context is automatically refreshed. If this parameter is not set, the context will not automatically refresh. The minimum delay is 10000ms.
         *  @param {string} [parametersFromContext=none] Name of another declared context to replicate the parameters and queries from. Any modification on the parameters of this context or the original one will be applied to both.
         *  @param {boolean} [urlSync=none] Enables the synchronization of the parameters to the page's parameters (query string). When sharing the page with parameters in the URL, the context will use them; and if the context parameters change, the URL parameters will change.
         * 
         * Note: if this parameter is enabled, `parameters` and `parametersFromContext` won't have any effect. There can only be a single context with URL synchronization enabled. Else the behavior will be unpredictable.
         *
         *  @description
         *
         *  The odsDatasetContext widget represents a dataset from a chosen domain and a set of parameters used to query its data. One or more widgets can use odsDatasetContext: it allows them to share information (i.e., the query parameters).
         *
         *  For example, a widget that displays a filter ({@link ods-widgets.directive:odsFacets odsFacets}) can be plugged into the same context as a table view widget ({@link ods-widgets.directive:odsTable odsTable}) so that the user can filter the data displayed in the table.
         *
         *  odsDatasetContext creates a new child scope, within which its declared contexts are available for any other widget used inside that odsDatasetContext element. odsDatasetContext widgets can also be nested inside each other.
         *
         *  A single odsDatasetContext can declare one or several contexts, which are initialized when declared through the **context** parameter. Each context is configured using parameters prefixed by the context name (`contextname-setting`, e.g., mycontext-domain).
         *
         *  <b>Properties of odsDatasetContext used as variable</b>
         *
         *  Once created, the context is accessible as a variable named after it. The context contains properties that can be accessed directly:
         *
         *  * `domainUrl`: full URL of the domain of the context that can be used to create links
         *  * `parameters`: parameters object of the context
         *  * `dataset`: dataset object for the context
         *  * `getDownloadURL(format[, dict options])`: method that returns a URL to download the data, including currently active filters (e.g. refinements, queries etc.). By default the URL will allow downloading a CSV export, but another format can be passed, such as "geojson" or "json". Two optional parameters are also available: `{'use_labels_for_header': '<true/false>', 'fields': '<list of comma separated field name>'}`
         *  * `getQueryStringURL([dict options])`: method that builds the URL suffix (`?key1=value1&key2=value2&...`) based on context parameters (active filters, refinement, sort, query, etc.). The optional dictionary parameter allows building the URL with additional key/value parameters.
         *
         *  @example
         *
         *  <example module="ods-widgets">
         *      <file name="visualizations_based_on_dataset_context.html">
         *          <ods-dataset-context context="trees,events"
         *                               trees-dataset="les-arbres-remarquables-de-paris"
         *                               trees-domain="https://documentation-resources.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract"
         *                               events-domain="https://documentation-resources.opendatasoft.com/">
         *               <!-- Shows a list of the trees -->
         *               <ods-table context="trees"></ods-table>
         *               <!-- Shows a map of events -->
         *               <ods-map context="events"></ods-map>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         *
         *  <example module="ods-widgets">
         *      <file name="dataset_context_with_parameters.html">
         *          <ods-dataset-context context="demographics"
         *                               demographics-dataset="us-cities-demographics"
         *                               demographics-domain="https://documentation-resources.opendatasoft.com/"
         *                               demographics-parameters="{'q': 'Santa', 'refine.state': 'California'}">
         *                <!-- Demographics for all cities in California that have 'Santa' in their name -->
         *                <ods-table context="demographics"></ods-table>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        var exposeContext = function(domain, datasetID, scope, contextName, apikey, parameters, parametersFromContext, source, urlSync, schema, refreshDelay) {
            var contextParams;

            if (!angular.equals(parameters, {})) {
                contextParams = parameters;
                if (urlSync) {
                    console.warn('Context ' + contextName + ' : There are specific parameters defined, but URL sync is enabled, so the parameters will be ignored.');
                }
            } else if (parametersFromContext) {
                var unwatch = scope.$watch(parametersFromContext, function(nv, ov) {
                    if (nv) {
                        if (source) {
                            nv.parameters.source = source;
                        }
                        scope[contextName].parameters = nv.parameters;
                        unwatch();
                    }
                });
                contextParams = null;
            } else {
                if (angular.equals(parameters, {})) {
                    // Typically someone passing a handmade object from an outerscope, to change it or watch it.
                    // Note that this is different from the first clause above, because it needs to pass AFTER
                    // parameters-from-context.
                    contextParams = parameters;
                } else {
                    contextParams = {};
                }
            }

            if (source && contextParams) {
                contextParams.source = source;
            }

            scope[contextName] = ContextHelper.getDatasetContext(contextName, domain, datasetID, contextParams, source, apikey, schema);

            if (refreshDelay) {
                $interval(function() {
                    scope[contextName]['parameters']['_refreshTimestamp'] = new Date().getTime();
                }, refreshDelay);
            }

            if (urlSync) {
                // Param
                /* FIXME V4
                    Currently, addSynchronizedObject supports a blacklist of parameters it doesn't want to watch.
                    This implies that the context has to know the list of things it doesn't want from the other components.

                    We probably instead want a whitelist, because each component knows what is relevant to it.
                 */
                URLSynchronizer.addSynchronizedObject(scope, contextName + '.parameters', ['basemap', 'location']);
            }
        };

        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var contextNames = $attrs.context.split(',');
                var datasetID, domain, apikey, sort, source, schema, refreshDelay;

                for (var i=0; i<contextNames.length; i++) {
                    // Note: we interpolate ourselves because we need the attributes value at the time of the controller's
                    // initialization, which is before the standard interpolation occurs.
                    var contextName = contextNames[i].trim();

                    // We need a dataset ID or a schema
                    if (!$attrs[contextName+'Dataset'] && !$attrs[contextName+'DatasetSchema']) {
                        console.error('Context ' + contextName + ' : Missing dataset parameter');
                    }

                    if ($attrs[contextName+'Dataset']) {
                        datasetID = $interpolate($attrs[contextName + 'Dataset'])($scope);
                    } else {
                        datasetID = '';
                    }

                    // Do we have a domain ID?
                    if ($attrs[contextName+'Domain']) {
                        domain = $interpolate($attrs[contextName + 'Domain'])($scope);
                    } else {
                        domain = '';
                    }

                    if ($attrs[contextName + 'Apikey']) {
                        apikey = $interpolate($attrs[contextName + 'Apikey'])($scope);
                    } else {
                        apikey = '';
                    }

                    if ($attrs[contextName+'Sort']) {
                        sort = $interpolate($attrs[contextName + 'Sort'])($scope);
                    } else {
                        sort = '';
                    }

                    if ($attrs[contextName+'Source']) {
                        source = $interpolate($attrs[contextName + 'Source'])($scope);
                    } else {
                        source = '';
                    }

                    if ($attrs[contextName+'DatasetSchema']) {
                        schema = angular.fromJson($attrs[contextName + 'DatasetSchema'].replace(/\\{/g, '{').replace(/\\}/g, '}'));
                    } else {
                        schema = undefined;
                    }

                    if (angular.isDefined($attrs[contextName+'RefreshDelay'])) {
                        refreshDelay = parseInt($interpolate($attrs[contextName + 'RefreshDelay'])($scope), 10);
                        if (!isFinite(refreshDelay)) {
                            console.warn(contextName + '-refresh-delay: Is not a valid integer. Fallbacking to 10000ms.');
                            refreshDelay = 10000;
                        } else if (refreshDelay < 10000) {
                            console.warn(contextName + '-refresh-delay: Is too small (10000ms minimum). Fallbacking to 10000ms.');
                            refreshDelay = 10000;
                        }
                    }

                    var parameters = $scope.$eval($attrs[contextName+'Parameters']) || {};
                    var parametersFromContext = $attrs[contextName+'ParametersFromContext'];

                    if (sort) {
                        parameters.sort = sort;
                    }

                    var urlSync = $scope.$eval($attrs[contextName+'Urlsync']);

                    exposeContext(domain, datasetID, $scope, contextName, apikey, parameters, parametersFromContext, source, urlSync, schema, refreshDelay);
                }
            }]
        };
    }]);

}());
