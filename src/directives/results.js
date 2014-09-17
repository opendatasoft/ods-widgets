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
         * @param {number} [odsResultsMax=all] Maximum number of results to show
         * @description
         * This widget exposes the results of a search (as an array) in a variable available in the scope. It can be used with AngularJS's ngRepeat to simply build a list
         * of results.
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
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            scope: true,
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: function($scope, $attrs) {
                var init = $scope.$watch($attrs['odsResultsContext'], function(nv) {
                    var options = angular.extend({}, nv.parameters, {'rows': $attrs['odsResultsMax']});
                    var variable = $attrs['odsResults'] || 'results';
                    if (nv.type === 'catalog') {
                        ODSAPI.datasets.search(nv, options).success(function(data) {
                            $scope[variable] = data.datasets;
                        });
                    } else if (nv.type === 'dataset' && nv.dataset) {
                        ODSAPI.records.search(nv, options).success(function(data) {
                            $scope[variable] = data.records;
                        });
                    } else {
                        return;
                    }
                    init();
                }, true);
            }
        };
    }]);

}());
