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
         * This widget enumerates statistic values for a given catalog. The following AngularJS variables are available:
         *
         *  * stats.dataset : the number of datasets
         *  * stats.keyword : the number of keywords
         *  * stats.publisher : the number of publishers
         *  * stats.theme : the number of themes
         *
         * @example
         * # Example 1 : when declaring a catalog context
         * <pre>
         * <ods-catalog-context context="catalog" catalog-domain="dataset" ods-domain-statistics>
         *     {{ catalog.stats.dataset }} datasets
         * </ods-catalog-context>
         * </pre>
         *
         * # Example 2 : with the corresponding tag
         *  <pre>
         *  <ods-domain-statistics context="catalog">
         *      {{ catalog.stats.dataset }} datasets
         *  </ods-domain-statistics>
         *  </pre>
         */

        return {
            restrict: 'AE',
            scope: true,
            controller: function($scope, $attrs) {
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
                    ODSAPI.datasets.search(nv, {'facet': ['keyword', 'publisher', 'theme']}).success(function (data) {
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
            }
        };
    }]);

}());
