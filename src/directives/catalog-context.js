(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCatalogContext', ['ODSAPI', 'URLSynchronizer', function(ODSAPI, URLSynchronizer) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCatalogContext
         * @scope
         * @restrict AE
         *  @param {string} context A name (or list of names separated by commas) of contexts to declare. The contexts are further
         *  configured using specific attributes, as described below.
         *  @description
         *  A "catalog context" represents the entire catalog (list) of datasets from a given domain, and a set of parameters used to query this catalog. A context can be used
         *  by one or more directives, so that they can share information (generally the query parameters). For example, a directive
         *  that displays a time filter can be "plugged" on the same context as a results list, to filter the displayed results.
         *
         *  The `odsCatalogContext` creates a new child scope, and exposes its contexts into it. In other words, the contexts
         *  will be available to any directive that is inside the `odsCatalogContext` element. You can nest `odsCatalogContext` directives inside each others.
         *
         *  A single `odsCatalogContext` can declare one or more context at once. To initialize contexts, you declare
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
         *  * **`apikey`** {@type string} (optional) API Key to use in every API call for this context
         *
         *  * **`parameters`** {@type Object} (optional) An object holding parameters to apply to the context when it is created.
         *
         *  * **`urlsync`** {@type Boolean} Enable synchronization of the parameters to the page's parameters (query string). If you share the page with parameters in the URL, the context will
         *  use them; and if the context parameters change, the URL parameters will change as well. If enabled, **`parameters`** won't have any effect. Note that there can only be a single context
         *  with URL synchronization enabled, else the behavior will be unpredictable.
         *
         *  Once created, the context is exposed and accessible as a variable named after it. The context contains properties that you can access directly:
         *
         *  * domainUrl: a full URL the the domain of the context, that can be used to create links
         *
         *  * parameters: the parameters object of the context
         *
         *  **Note:** Due to naming conventions in various places (HTML attributes, AngularJS...), context names
         *  have to be lowercase, can only contain alphanumerical characters, and can't begin with "data" or "x".
         *
         *  @example
         *  <pre>
         *  <ods-catalog-context context="public">
         *      <ods-result-enumerator context="public">
         *          <p>{{item.datasetid}}</p>
         *      </ods-result-enumerator>
         *  </ods-catalog-context>
         *  </pre>
         */

        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            link: function(scope, element, attrs) {
                var contextNames = attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // Do we have a domain ID?
                    var domain = attrs[contextName+'Domain'];

                    var parameters = scope.$eval(attrs[contextName+'Parameters']) || {};
                    if (attrs[contextName+'Source']) {
                        parameters.source = attrs[contextName+'Source'];
                    }

                    scope[contextName] = {
                        'name': contextName,
                        'type': 'catalog',
                        'domain': domain,
                        'domainUrl': ODSAPI.getDomainURL(domain),
                        'apikey': attrs[contextName+'Apikey'],
                        'parameters': parameters,
                        'toggleRefine': function(facetName, path, replace) {
                            ODS.Context.toggleRefine(this, facetName, path, replace);
                        }
                    };

                    if (scope.$eval(attrs[contextName+'Urlsync'])) {
                        if (!angular.equals(parameters, {})) {
                            console.log('WARNING : Context ' + contextName + ' : There are specific parameters defined, but URL sync is enabled, so the parameters will be ignored.');
                        }
                        URLSynchronizer.addSynchronizedObject(scope, contextName + '.parameters');
                    }
                }
            }
        };
    }]);
}());