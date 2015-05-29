(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacetResults', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFacetResults
         * @scope
         * @restrict A
         * @param {string} [odsFacetResults=results] Variable name to use
         * @param {CatalogContext|DatasetContext} odsFacetResultsContext {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} odsFacetResultsFacetName Name of the facet to enumerate
         * @description
         * This widget fetches the results of enumerating the values ("categories") of a facet, and exposes it in a variable available in the scope. It can be used with AngularJS's ngRepeat to simply build a list
         * of results.
         *
         * The variable is an array of objects, each containing the following properties:
         *
         *  * `name` : the label of the category
         *  * `path` : the path to use to refine on this category
         *  * `state` : "displayed" or "refined"
         *  * `count` : the number of records in this category
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="catalog" catalog-domain="public.opendatasoft.com">
         *              <label>Select a facet:</label>
         *              <select ng-model="userchoice">
         *                  <option ng-repeat="item in items" ods-facet-results="items" ods-facet-results-context="catalog" ods-facet-results-facet-name="publisher" value="{{item.name}}">{{item.name}}</option>
         *              </select>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            scope: true,
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                $scope.$watch($attrs.odsFacetResultsContext, function(nv) {
                    var query;
                    var facetName = $attrs.odsFacetResultsFacetName;
                    var options = angular.extend({}, nv.parameters, {'rows': 0, 'facet': facetName});
                    var variable = $attrs.odsFacetResults || 'results';
                    if (nv.type === 'dataset' && nv.dataset) {
                        query = ODSAPI.records.search(nv, options);
                    } else if (nv.type === 'catalog') {
                        query = ODSAPI.datasets.search(nv, options);
                    } else {
                        return;
                    }
                    query.success(function(data){
                        if (data.facet_groups) {
                            var facetGroup = data.facet_groups.filter(function(g) {return g.name === facetName; });
                            if (facetGroup.length === 0) {
                                // Only a refine but no real value for the facet we want
                                $scope[variable] = [];

                            }
                             $scope[variable] = facetGroup[0].facets;

                        } else {
                            $scope[variable] = [];
                        }
                    });

                }, true);
            }]
        };
    }]);

}());
