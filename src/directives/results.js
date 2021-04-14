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
         * @param {number} [odsResultsMax=10] Maximum number of results to show. The value can be changed dynamically using a variable.
         * @description
         * This widget exposes the results of a search as an array in a variable available in the scope.
         * It can be used with the AngularJS ngRepeat directive to build a list of results simply.
         * It also adds to the context variable a `nhits` property containing the total number of records matching the query regardless of the odsResultsMax value.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree"
         *                               tree-dataset="les-arbres-remarquables-de-paris"
         *                               tree-domain="https://documentation-resources.opendatasoft.com/"
         *                               tree-parameters="{'sort': '-objectid'}">
         *              <table class="table table-bordered table-condensed table-striped">
         *                  <thead>
         *                      <tr>
         *                          <th>Tree name</th>
         *                          <th>Addrese</th>
         *                      </tr>
         *                  </thead>
         *                  <tbody>
         *                      <tr ng-repeat="item in items"
         *                          ods-results="items"
         *                          ods-results-context="tree"
         *                          ods-results-max="10">
         *                          <td>{{ item.fields.libellefrancais }}</td>
         *                          <td>{{ item.fields.adresse }}</td>
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
         *          <ods-dataset-context context="tree"
         *                               tree-dataset="les-arbres-remarquables-de-paris"
         *                                   tree-domain="https://documentation-resources.opendatasoft.com/">
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

                var loadResults = function () {
                    var context = $scope.$eval($attrs.odsResultsContext);
                    var options = angular.extend({}, context.parameters, {'rows': $attrs.odsResultsMax});
                    var variable = $attrs.odsResults || 'results';
                    $scope.loading = true;
                    if (context.type === 'catalog') {
                        angular.extend(options, {
                            extrametas: 'true',
                            interopmetas: 'true'
                        });
                        catalog_search(context, options).then(function(response) {
                            var data = response.data;
                            $scope[variable] = data.datasets;
                            context.nhits = data.nhits;
                            $scope.loading = false;
                        }, function() {
                            $scope.loading = false;
                        });
                    } else if (context.type === 'dataset' && context.dataset) {
                        dataset_search(context, options).then(function(response) {
                            var data = response.data;
                            $scope[variable] = data.records;
                            context.nhits = data.nhits;
                            $scope.loading = false;
                        }, function() {
                            $scope.loading = false;
                        });
                    }
                };

                var firstLoad = false;
                $scope.$watch(
                    function() {
                        // We're only interested in context parameters and max results
                        var ctx = $scope.$eval($attrs.odsResultsContext);
                        var params = ctx.type === 'catalog' || ctx.dataset ? ctx.parameters : null;
                        return [params, $attrs.odsResultsMax];
                    },
                    function(nv, ov) {
                        // In the case of a catalog context, everything is there when the watch first initializes so
                        // ov and nv will be the same in that case.
                        if (nv !== ov || (nv[0] && !firstLoad)) {
                            loadResults();
                            firstLoad = true;
                        }
                }, true);
            }]
        };
    }]);

}());
