(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.provider('ODSCurrentDomain', [function() {
        /**
         * @ngdoc object
         * @name ods-widgets.ODSCurrentDomainProvider
         * @description
         * Use `ODSCurrentDomainProvider` to set configuration values for the current domain.
         * The available settings are:
         *
         * - **`domainId`** - {@type string} - Value used as `domain` parameter for {@link ods-widgets.directive:odsCatalogContext Catalog Contexts}
         * and {@link ods-widgets.directive:odsDatasetContext Dataset Contexts} when none is specified. Defaults is '' (empty string), which means a local API (root is /).
         *
         * @example
         * <pre>
         *   var app = angular.module('ods-widgets').config(function(ODSCurrentDomainProvider) {
         *       ODSCurrentDomainProvider.setDomain('public');
         *   });
         * </pre>
         */
        /**
         * @ngdoc service
         * @name ods-widgets.ODSCurrentDomain
         * @description
         * A service containing the current domain informations. Available informations are described
         * in the {@link ods-widgets.ODSCurrentDomainProvider ODSCurrentDomainProvider} documentation.
         */

        var currentDomain = {};

        currentDomain.domainId = "";
        
        this.setDomain = function(domainId) {
            currentDomain.domainId = domainId;
        };

        this.$get = function() {
            return currentDomain;
        };
    }]);
}());