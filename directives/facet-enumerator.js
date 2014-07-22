(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacetEnumerator', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFacetEnumerator
         * @scope
         * @restrict E
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} facetName Name of the facet to enumerate
         * @description
         * This widget enumerates the values ("categories") of a facet and repeats the template (the content of the directive element) for each of them. For each facet category, the following AngularJS variables are available:
         *
         *  * item.name : the label of the category
         *  * item.path : the path to use to refine on this category
         *  * item.state : "displayed" or "refined"
         *  * item.count : the number of records in this category
         *
         * # Example
         *  <pre>
         *  <ods-facet-enumerator context="bla" facet="themes">
         *      <div style="display: inline-block; width: 64px; height: 64px;">
         *          {{ facet.name }} ({{ facet.count }}
         *      </div>
         *  </ods-facet-enumerator>
         *  </pre>
         */
        /**
        <ods-facet-enumerator context="bla" facet="themes">
            <div style="display: inline-block; width: 64px; height: 64px;">
                {{ facet.name }} ({{ facet.count }}
            </div>
        </ods-facet-enumerator>
         */

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                context: '=',
                facetName: '@'
            },
            template: '<div class="odswidget-facet-enumerator">' +
                '<div ng-repeat="item in items" ng-transclude class="item"></div>' +
                '</div>',
            controller: function($scope) {
                var init = $scope.$watch('context', function(nv) {
                    if (nv.type === 'catalog') {
                        ODSAPI.datasets.facets(nv, $scope.facetName).success(function(data) {
                            if (data.facet_groups) {
                                $scope.items = data.facet_groups[0].facets;
                            } else {
                                $scope.items = [];
                            }
                        });
                    }
                    init();
                });
            }
        };
    }]);

}());