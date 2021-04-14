(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDomainStatistics', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDomainStatistics
         * @scope
         * @restrict AE
         * @param {DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * The odsDomainStatistics widget enumerates statistic values for a given catalog and injects them as variables in the context.
         * 
         * The following AngularJS variables are available:
         *
         *  * `CONTEXTNAME.stats.dataset`: the number of datasets
         *  * `CONTEXTNAME.stats.keyword`: the number of keywords
         *  * `CONTEXTNAME.stats.publisher`: the number of publishers
         *  * `CONTEXTNAME.stats.theme`: the number of themes
         *
         * # First syntax: when declaring a catalog context, directly inject these values
         * <pre>
         * <ods-catalog-context context="catalog" catalog-domain="dataset" ods-domain-statistics>
         *     {{ catalog.stats.dataset }} datasets
         * </ods-catalog-context>
         * </pre>
         *
         * # Second syntax : inject them using a dedicated tag
         *  <pre>
         *  <ods-domain-statistics context="catalog">
         *      {{ catalog.stats.dataset }} datasets
         *  </ods-domain-statistics>
         *  </pre>
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="examples"
         *                               examples-domain="https://documentation-resources.opendatasoft.com/"
         *                               ods-domain-statistics>
         *              <p>Our portal has {{examples.stats.dataset}} datasets, described by {{examples.stats.theme}} themes
         *              and {{examples.stats.keyword}} keywords.</p>
         *              <p>{{examples.stats.publisher}} publishers have contributed.</p>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'AE',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var setStatParameter = function(context, facetName, value) {
                    if (value.name === facetName) {
                        context.stats[facetName] = value.facets.length;
                        return true;
                    }
                    return false;
                };
                var init = $scope.$watch($attrs.context, function(nv) {
                    nv.stats = {
                        'dataset': 0,
                        'keyword': 0,
                        'publisher': 0,
                        'theme': 0
                    };
                    ODSAPI.datasets.search(nv, {'facet': ['keyword', 'publisher', 'theme'], 'rows': 0}).then(function (response) {
                        var data = response.data;
                        nv.stats.dataset = data.nhits;
                        if (data.facet_groups) {
                            for (var i = 0; i < data.facet_groups.length; i++) {
                                if (setStatParameter(nv, 'keyword', data.facet_groups[i])) continue;
                                if (setStatParameter(nv, 'publisher', data.facet_groups[i])) continue;
                                if (setStatParameter(nv, 'theme', data.facet_groups[i])) continue;
                            }
                        }
                    });
                    init();
                }, true);
            }]
        };
    }]);

}());
