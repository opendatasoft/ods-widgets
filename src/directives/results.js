(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsResults', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsResults
         * @scope
         * @restrict A
         * @param {string} [odsResults=results] Variable name to use
         * @param {CatalogContext|DatasetContext} odsResultsContext {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} [odsResultsMax=10] Maximum number of results to show
         * @description
         * This widget exposes the results of a search (as an array) in a variable available in the scope. It can be
         * used with AngularJS's ngRepeat to simply build a list of results.
         * It also adds to the context variable a "nhits" property containing the total number of records matching the
         * query regardless of the odsResultsMax value.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com" tree-parameters="{'sort': '-objectid'}">
         *              <table class="table table-bordered table-condensed table-striped">
         *                  <thead>
         *                      <tr>
         *                          <th>Tree name</th>
         *                          <th>Place</th>
         *                      </tr>
         *                  </thead>
         *                  <tbody>
         *                      <tr ng-repeat="item in items" ods-results="items" ods-results-context="tree" ods-results-max="10">
         *                          <td>{{ item.fields.nom_commun }}</td>
         *                          <td>{{ item.fields.nom_ev }}</td>
         *                      </tr>
         *                  </tbody>
         *              </table>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com" tree-parameters="{'sort': '-objectid'}">
         *              <p ods-results="items" ods-results-context="tree" ods-results-max="10">
         *                  Total number of trees : {{ tree.nhits }}
         *              </p>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            scope: true,
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var dataset_search = ODSAPI.uniqueCall(ODSAPI.records.search),
                    catalog_search = ODSAPI.uniqueCall(ODSAPI.datasets.search);

                var loadResults = function (context) {
                    var options = angular.extend({}, context.parameters, {'rows': $attrs.odsResultsMax});
                    var variable = $attrs.odsResults || 'results';
                    $scope.loading = true;
                    if (context.type === 'catalog') {
                        angular.extend(options, {
                            extrametas: 'true',
                            interopmetas: 'true'
                        });
                        catalog_search(context, options).success(function(data) {
                            $scope[variable] = data.datasets;
                            context.nhits = data.nhits;
                            $scope.loading = false;
                        }).error(function() {
                            $scope.loading = false;
                        });
                    } else if (context.type === 'dataset' && context.dataset) {
                        dataset_search(context, options).success(function(data) {
                            $scope[variable] = data.records;
                            context.nhits = data.nhits;
                            $scope.loading = false;
                        }).error(function() {
                            $scope.loading = false;
                        });
                    }
                };
                var firstLoad = true;
                $scope.$watch($attrs.odsResultsContext, function(nv, ov) {
                    if (!!(nv.type === 'catalog' || (nv.type === 'dataset' && nv.dataset)) &&
                        (!angular.equals(nv.parameters, ov.parameters) || firstLoad)) {
                        firstLoad = false;
                        loadResults(nv);
                    }
                }, true);
            }]
        };
    }]);

}());
