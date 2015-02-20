(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAggregation', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAggregation
         * @scope
         * @restrict A
         * @param {string} [odsAggregation=aggregation] Variable name to use
         * @param {CatalogContext|DatasetContext} odsAggregationContext {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} [odsAggregationFunction=COUNT] Aggregation function to apply (AVG, COUNT, MIN, MAX, STDDEV, SUM)
         * @param {string} [odsAggregationExpression=none] Expression to apply the function on, typically the name of a field. Optional only when the function is "COUNT".
         * @description
         * This widget exposes the results of an aggregation function over a context. Can be used for example to expose the average temperature of a weather dataset.
         * The result is exposed into a new variable that you can use in other widgets or directly in your HTML.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com" tree-parameters="{'sort': '-objectid'}">
         *              <div class="row-fluid">
         *                  <div class="span4">
         *                      <ods-facets context="tree"></ods-facets>
         *                  </div>
         *                  <div class="span8" ods-aggregation="height" ods-aggregation-context="tree" ods-aggregation-expression="hauteur" ods-aggregation-function="AVG">
         *                      Average height is {{ height }} meters.
         *                  </div>
         *              </div>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                var context = $scope.$eval($attrs.odsAggregationContext);
                var func = $attrs.odsAggregationFunction || 'COUNT';
                var expr = $attrs.odsAggregationExpression;
                var variableName = $attrs.odsAggregation || 'aggregation';
                context.wait().then(function() {
                    $scope.$watch(context.name+'.parameters', function(nv, ov) {
                        var options = angular.extend({}, nv, {
                            'y.serie1.expr': expr,
                            'y.serie1.func': func
                        });
                        ODSAPI.records.analyze(context, options).success(function(data) {
                            $scope[variableName] = data[0].serie1;
                        });
                    }, true);
                });
            }]
        };
    }]);
}());