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
         *  @param {string} context A name (or list of names separated by commas) of contexts to declare. The contexts are further
         *  configured using specific attributes, as described below.
         *  @description
         *  A "dataset context" represents a dataset, and a set of parameters used to query its data. A context can be used
         *  by one or more directives, so that they can share information (generally the query parameters). For example, a directive
         *  that displays a time filter can be "plugged" on the same context as a table view directive, so that the user
         *  can filter the data displayed in the table.
         *
         *  The `odsDatasetContext` creates a new child scope, and exposes its contexts into it. In other words, the contexts
         *  will be available to any directive that is inside the `odsDatasetContext` element. You can nest `odsDatasetContext` directives inside each others.
         *
         *  A single `odsDatasetContext` can declare one or more context at once. To initialize contexts, you declare
         *  them in the **context** attribute. Then, you can configure them further using attributes prefixed by the context
         *  name (**CONTEXTNAME-SETTING**, e.g. mycontext-domain). The available settings are:
         *
         *  * **`domain`** - {@type string} - (optional) Indicate the "domain" (used to construct an URL to an API root) where to find the dataset.
         * Domain value can be:
         *
         *      * a simple alphanum string (e.g. *mydomain*): it will assume it is an OpenDataSoft domain (so in this example *mydomain.opendatasoft.com*)
         *
         *      * a hostname (e.g. *data.mydomain.com*)
         *
         *      * an absolute path (e.g. _/monitoring_), it will be absolute to the hostname of the current page
         *
         *      * a hostname and a path (e.g. *data.mydomain.com/monitoring*)
         *
         *      * nothing: in that case, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.defaultDomain} is used
         *
         *  * **`dataset`** - {@type string} Identifier of the dataset
         *
         *  * **`apikey`** {@type string} (optional) API Key to use in every API call for this context
         *
         *  * **`sort`** {@type string} (optional) Sort expression to apply initially (*field* or *-field*)
         *
         *  * **`parameters`** {@type Object} (optional) An object holding parameters to apply to the context when it is created. Any parameter from the API can be used here (such as `q`, `refine.FIELD` ...)
         *
         *  * **`refresh-delay`** {@type Number} (optional) The number of milliseconds to wait before refreshing the context. If this parameter is omitted, the context does not automatically refresh. Minimum delay is 10000ms.
         *
         *  * **`parametersFromContext`** {@type string} (optional) The name of a context to replicate the parameters from. Any change of the parameters
         *  in this context or the original context will be applied to both.
         *
         *  * **`urlsync`** {@type Boolean} Enable synchronization of the parameters to the page's parameters (query string). If you share the page with parameters in the URL, the context will
         *  use them; and if the context parameters change, the URL parameters will change as well. If enabled, **`parameters`** and **`parametersFromContext`** won't have any effect.
         *  Note that there can only be a single context with URL synchronization enabled, else the behavior will be unpredictable.
         *
         *  Once created, the context is exposed and accessible as a variable named after it. The context contains properties that you can access directly:
         *
         *  * domainUrl: a full URL the the domain of the context, that can be used to create links
         *
         *  * parameters: the parameters object of the context
         *
         *  * dataset: the dataset object for this context
         *
         *  * getDownloadURL(format[, dict options]): a method that returns an URL to download the data, including currently active filters (refinements, queries...). By default
         *  the URL will allow to download a CSV export, but you can pass another format such as "geojson" or "json".
         *  Two optional parameters : `{'use_labels_for_header': '<true/false>', 'fields': '<list of comma separated field name>'}`
         *
         *  * getQueryStringURL([dict options]): a method that build the URL suffix (`?key1=value1&key2=value2&...`) based on context parameters (active filters, refinement, sort, query...).
         *  The optional dictionary parameter allow to build the URL with additional key/value parameters.
         *
         *  **Note:** Due to naming conventions in various places (HTML attributes, AngularJS...), context names
         *  have to be lowercase, can only contain alphanumerical characters, and can't begin with a number, "data", or "x".
         *
         *  @example
         *  <pre>
         *  <ods-dataset-context context="trees" trees-dataset="trees-in-paris">
         *      <!-- Retrieved from a local API (no domain for the context)-->
         *      A dataset from {{trees.domainUrl}}.
         *  </ods-dataset-context>
         *  </pre>
         *
         *  <pre>
         *  <ods-dataset-context context="trees,clocks"
         *                       trees-dataset="arbresalignementparis2010"
         *                       trees-domain="http://opendata.paris.fr"
         *                       clocks-dataset="horloges_exterieures_et_interieures"
         *                       clocks-domain="public">
         *      <!-- Shows a list of the trees -->
         *      <ods-table context="trees"></ods-table>
         *      <!-- Shows a map of clocks -->
         *      <ods-map context="clocks"></ods-map>
         *  </ods-dataset-context>
         *  </pre>
         *
         *  <pre>
         *  <ods-dataset-context context="stations"
         *                       stations-dataset="jcdecaux_bike_data"
         *                       stations-domain="public.opendatasoft.com"
         *                       stations-parameters="{'q': 'place', 'refine.contract_name': 'Paris'}">
         *      <!-- All bike stations in Paris that have 'place' in their name or address -->
         *      <ods-map context="trees"></ods-map>
         *  </ods-dataset-context>
         *  </pre>
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
