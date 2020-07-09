(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAggregation', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAggregation
         * @scope
         * @restrict A
         * @param {string} [odsAggregation=aggregation] <i>(mandatory)</i> Name of the variable that holds the result of the aggregation. For multiple aggregations, variable names must be separated with commas.
         * @param {DatasetContext} odsAggregationContext <i>(mandatory)</i> {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use.
         * @param {DatasetContext} odsAggregation[Variablename]Context Context specific to the <code>[Variablename]</code> aggregation. `[Variablename]` must be replaced with the name of the variable, declared through the **odsAggregation** parameter.
         * @param {string} [odsAggregationFunction=COUNT] <i>(mandatory)</i> Aggregation function to apply:
         *
         * - AVG: average
         * - COUNT
         * - MIN: minimum
         * - MAX: maximum
         * - STDDEV: standard deviation
         * - SUM
         *
         * @param {string} [odsAggregation[Variablename]Function=COUNT] Function specific to the <code>[Variablename]</code> aggregation. `[Variablename]` must be replaced with the name of the variable, declared through the **odsAggregation** parameter.
         * @param {string} [odsAggregationExpression=none] <i>(optional only if function is COUNT)</i> Expression to apply the function on, e.g. the name of a field.
         * @param {string} [odsAggregation[Variablename]Expression=none] Expression specific to the <code>[Variablename]</code> aggregation. `[Variablename]` must be replaced with the name of the variable, declared through the **odsAggregation** parameter.
         *
         * @description
         * The odsAggregation widget creates a variable that contains the result of an aggregation function based on a context.
         *
         * Aggregations are functions that enable to group records and compute statistical values for numeric fields. For instance, aggregations can determine, based on several records, what is the smallest or biggest value among them, compute the average value or count the number of values for a chosen field.
         *
         * odsAggregation supports multiple declarations of aggregations.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="simple_aggregation.html">
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
         *      </file>
         *  </example>
         *
         *  <example module="ods-widgets">
         *      <file name="multiple_aggregations.html">
         *  <ods-dataset-context context="commute,demographics"
         *                       commute-dataset="commute-time-us-counties"
         *                       commute-domain="https://widgets-examples.opendatasoft.com/"
         *                       demographics-dataset="us-cities-demographics"
         *                       demographics-domain="https://widgets-examples.opendatasoft.com/">
         *      <div ods-aggregation="people, time"
         *           ods-aggregation-people-context="demographics"
         *           ods-aggregation-people-function="SUM"
         *           ods-aggregation-people-expression="count"
         *           ods-aggregation-time-context="commute"
         *           ods-aggregation-time-function="AVG"
         *           ods-aggregation-time-expression="mean_commuting_time">
         *          For {{ people }} people in the US, the average commute time in 2015 was {{ time|number:0 }} minutes.
         *      </div>
         *  </ods-dataset-context>
         *      </file>
         *  </example>
         *
         *  <example module="ods-widgets">
         *      <file name="multiple_aggregations_same_context.html">
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
         *          There are {{ total }} remarkable trees in Paris, with girth ranging from {{ mingirth }} to {{ maxgirth }} cm.
         *      </div>
         *  </ods-dataset-context>
         *      </file>
         *  </example>
         *
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
