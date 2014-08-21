(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacetEnumerator', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFacetEnumerator
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} facetName Name of the facet to enumerate
         * @description
         * This widget enumerates the values ("categories") of a facet and repeats the template (the content of the directive element) for each of them. For each facet category, the following AngularJS variables are available:
         *
         *  * item.name : the label of the category
         *  * item.path : the path to use to refine on this category
         *  * item.state : "displayed" or "refined"
         *  * item.count : the number of records in this category
         *
         * @example
         *  <pre>
         *  <ods-facet-enumerator context="bla" facet-name="theme">
         *      <div style="display: inline-block; width: 64px; height: 64px;">
         *          {{ item.name }} ({{ item.count }}
         *      </div>
         *  </ods-facet-enumerator>
         *  </pre>
         */

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                context: '=',
                facetName: '@'
            },
            template: '<div class="odswidget odswidget-facet-enumerator">' +
                '<div class="no-data" ng-hide="items" translate>No data available yet</div>' +
                '<div ng-repeat="item in items" inject class="item"></div>' +
                '</div>',
            controller: function($scope) {
                var init = $scope.$watch('context', function(nv) {
                    var query;
                    if (nv.type === 'catalog') {
                        query = ODSAPI.datasets.facets(nv, $scope.facetName);
                    } else if (nv.type === 'dataset' && nv.dataset) {
                        query = ODSAPI.records.search($scope.context, {'rows': 0, 'facet': $scope.facetName});
                    } else {
                        return;
                    }
                    query.success(function(data) {
                        if (data.facet_groups) {
                            $scope.items = data.facet_groups[0].facets;
                        } else {
                            $scope.items = [];
                        }
                    });
                    init();
                }, true);
            }
        };
    }]);

}());
