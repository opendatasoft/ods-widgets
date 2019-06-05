(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAggregation', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAggregation
         * @scope
         * @restrict A
         * @param {string} [odsAggregation=aggregation] Variable name to use. For multiple aggregations, separate variable names with commas.
         * @param {DatasetContext} odsAggregationContext {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {DatasetContext} odsAggregationXxxContext Specific context for the aggregation <code>Xxx</code>.<br>Replace <code>Xxx</code> with one of the declared variable names.
         * @param {string} [odsAggregationFunction=COUNT] Aggregation function to apply (AVG, COUNT, MIN, MAX, STDDEV, SUM)
         * @param {string} [odsAggregationXxxFunction=COUNT] Specific function for the aggregation <code>Xxx</code>.<br>Replace <code>Xxx</code> with one of the declared variable names.
         * @param {string} [odsAggregationExpression=none] Expression to apply the function on, typically the name of a field. Optional only when the function is "COUNT".
         * @param {string} [odsAggregationXxxExpression=none] Specific expression for the aggregation <code>Xxx</code>.<br>Replace <code>Xxx</code> with one of the declared variable names.
         *
         * @description
         * This widget exposes the results of an aggregation function over a context. Can be used for example to expose the average temperature of a weather dataset.
         * The result is exposed into a new variable that you can use in other widgets or directly in your HTML.
         * If aggregation returns no result, the result value will be null.
         * This widget supports multiple declaration of aggregations.
         *
         * Single aggregation example:
         *
         * <pre>
         *  <ods-dataset-context context="tree"
         *                       tree-dataset="les-arbres-remarquables-de-paris"
         *                       tree-domain="https://widgets-examples.opendatasoft.com/">
         *      <div ods-aggregation="height"
         *           ods-aggregation-context="tree"
         *           ods-aggregation-expression="hauteur"
         *           ods-aggregation-function="AVG">
         *          Average height is {{ height | number }} meters.
         *      </div>
         *  </ods-dataset-context>
         * </pre>
         *
         * Multiple aggregations example:
         *
         * <pre>
         *  <ods-dataset-context context="commute,demographics"
         *                       commute-dataset="commute-time-us-counties"
         *                       commute-domain="https://widgets-examples.opendatasoft.com/"
         *                       demographics-dataset="us-cities-demographics"
         *                       demographics-domain="https://widgets-examples.opendatasoft.com/"
         *  >
         *      <div ods-aggregation="population, time"
         *           ods-aggregation-population-context="demographics"
         *           ods-aggregation-population-function="SUM"
         *           ods-aggregation-time-context="commute"
         *           ods-aggregation-time-function="AVG"
         *           ods-aggregation-time-expression="mean_commuting_time"
         *      >
         *          The average commute time in the US in 2015 was {{ time|number:2 }} minutes for a population of {{ population }} people.
         *      </div>
         *  </ods-dataset-context>
         * </pre>
         *
         * Multiple aggregations using the same context example:
         *
         * <pre>
         *  <ods-dataset-context context="tree"
         *                       tree-dataset="les-arbres-remarquables-de-paris"
         *                       tree-domain="https://widgets-examples.opendatasoft.com/">
         *      <div ods-aggregation="total, mingirth, maxgirth"
         *           ods-aggregation-context="tree"
         *           ods-aggregation-total-function="COUNT"
         *           ods-aggregation-maxgirth-expression="circonference"
         *           ods-aggregation-maxgirth-function="MAX"
         *           ods-aggregation-mingirth-expression="circonference"
         *           ods-aggregation-mingirth-function="MIN">
         *          There are {{ total }} remarkable trees in paris, with girth ranging from {{ mingirth }} to {{ maxgirth }} cm.
         *      </ div>
         *  </ods-dataset-context>
         * </pre>
         */
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                var aggregationNames = ODS.ArrayUtils.fromCSVString($attrs.odsAggregation || 'aggregation');

                var getAttr = function (attributeName, aggregationName) {
                    var specificAttr = $attrs['odsAggregation' + ODS.StringUtils.capitalize(aggregationName) + ODS.StringUtils.capitalize(attributeName)];
                    var genericAttr = $attrs['odsAggregation' + ODS.StringUtils.capitalize(attributeName)];
                    return specificAttr || genericAttr;
                };

                var getContext = function (aggregationName) {
                    return $scope.$eval(getAttr('context', aggregationName));
                };

                var getFunc = function (aggregationName) {
                    return getAttr('function', aggregationName) || 'COUNT';
                };

                var getExpr = function (aggregationName) {
                    return getAttr('expression', aggregationName);
                };

                angular.forEach(aggregationNames, function (aggregationName) {
                    var context = getContext(aggregationName);
                    context.wait().then(function() {
                        var analyze = ODSAPI.uniqueCall(ODSAPI.records.analyze);
                        $scope.$watch(context.name + '.parameters', function (nv) {
                            var options = angular.extend({}, nv, {
                                'y.serie1.expr': getExpr(aggregationName),
                                'y.serie1.func': getFunc(aggregationName)
                            });
                            analyze(context, options).success(function(data) {
                                if (data.length) {
                                    $scope[aggregationName] = data[0].serie1;
                                } else {
                                    $scope[aggregationName] = null;
                                }
                            });
                        }, true);
                    });
                });
            }]
        };
    }]);
}());
