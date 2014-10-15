(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDatasetContext', ['ODSAPI', function(ODSAPI) {
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
         *  * **`parametersFromContext`** {@type string} (optional) The name of a context to replicate the parameters from. Any change of the parameters
         *  in this context or the original context will be applied to both.
         *
         *  Once created, the context is exposed and accessible as a variable named after it. The context contains properties that you can access directly:
         *
         *  * domainUrl: a full URL the the domain of the context, that can be used to create links
         *
         *  * parameters: the parameters object of the context
         *
         *  * dataset: the dataset object for this context
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
        var exposeContext = function(domain, datasetID, scope, contextName, apikey, parameters, parametersFromContext) {
            var contextParams;
            if (!angular.equals(parameters, {})) {
                contextParams = parameters;
            } else if (parametersFromContext) {
                var unwatch = scope.$watch(parametersFromContext, function(nv, ov) {
                    if (nv) {
                        scope[contextName].parameters = nv.parameters;
                        unwatch();
                    }
                });
                contextParams = null;
            } else {
                contextParams = {};
            }
            scope[contextName] = {
                'name': contextName,
                'type': 'dataset',
                'domain': domain,
                'domainUrl': ODSAPI.getDomainURL(domain),
                'apikey': apikey,
                'dataset': null,
                'parameters': contextParams
            };
            ODSAPI.datasets.get(scope[contextName], datasetID, {extrametas: true, interopmetas: true}).
                success(function(data) {
                    scope[contextName].dataset = new ODS.Dataset(data);
                });
        };

        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            link: function(scope, element, attrs) {
                var contextNames = attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // We need a dataset ID
                    var datasetID = attrs[contextName+'Dataset'];

                    // Do we have a domain ID?
                    var domain = attrs[contextName+'Domain'];

                    if (!datasetID) {
                        console.log('ERROR : Context ' + contextName + ' : Missing dataset parameter');
                    }

                    var apikey = attrs[contextName+'Apikey'];
                    var sort = attrs[contextName+'Sort'];
                    var parameters = scope.$eval(attrs[contextName+'Parameters']) || {};
                    var parametersFromContext = attrs[contextName+'ParametersFromContext'];

                    if (sort) {
                        parameters.sort = sort;
                    }

                    exposeContext(domain, datasetID, scope, contextName, apikey, parameters, parametersFromContext);
                }
            }
        };
    }]);

}());
