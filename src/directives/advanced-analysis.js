(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAdvAnalysis', ['ODSAPIv2', 'APIParamsV1ToV2', function (ODSAPIv2, APIParamsV1ToV2) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAdvAnalysis
         * @scope
         * @restrict A
         * @param {string} odsAdvAnalysis This name can be used as the `data` attribute of the display widgets that support it (`odsAdvTable`, `odsVegaLiteChart`).
         * @param {string} odsAdvAnalysisContext Insert here the name of the context to use.
         * @param {string} [odsAdvAnalysisSelect] Type here the query to make. More use cases are available below. The documentation about the ODSQL select clause is available here. This clause will contain the values (i.e., the y-axis in case of a chart).
         * @param {string} [odsAdvAnalysisWhere] This parameter allows to filter rows with a combination of expressions. The documentation about the ODSQL `where` clause is available [here](https://help.opendatasoft.com/apis/ods-search-v2/#where-clause).
         * @param {string} [odsAdvAnalysisGroupBy] This parameter helps regroup the calculation according to specific criteria. The `group-by` in this clause can become either y-axis or series in a chart. The documentation about the ODSQL `GROUP BY` clause is available [here](https://help.opendatasoft.com/apis/ods-search-v2/#group-by-clause).
         * @param {string} [odsAdvAnalysisOrderBy] This parameter is used to sort the results of an aggregation using the `ASC` and `DESC` keywords (e.g., `myField ASC` or ). The documentation about the ODSQL `ORDER BY` clause is available [here](https://help.opendatasoft.com/apis/ods-search-v2/#order-by-clause).
         * @param {string} [odsAdvAnalysisLimit] Limits the number of items to return.
         *
         * @description
         * The odsAdvAnalysis widget exposes the results of an aggregation function over a context. It uses the
         * ODS Search APIv2 and its [ODSQL language](https://help.opendatasoft.com/apis/ods-search-v2/#odsql), which offers greater flexibility than the v1.
         * 
         * The parameters for this widgets are dynamic, which implies two benefits:
         * - First, changes in context parameters will refresh the results of the widget.
         * - Second, AngularJS variables are accepted as attributes.
         *
         * The results can then be displayed in three different ways:
         * - To create charts, `odsAdvAnalysis` is designed to be working specifically with `odsVegaLite` (examples are provided below).
         * - A table view is also available using `odsAdvTable` (examples are provided below).
         * - As the widget is creating an AngularJS variable, it can be displayed through a simple `{{myData.results[X]}}`. This usage is not documented here, as it regards HTML code and widgets already documented in [the introduction](https://help.opendatasoft.com/widgets/#/introduction/).
         *
         * <h2>Examples of requests to make</h2>
         *
         * How to compute a weighted average:
         * 
         * In this example, the widget will return the average height of the trees according to the population size of each species in Paris districts.
         * <pre>
         *     <ods-dataset-context
         *         context="ctx"
         *         ctx-domain="https://documentation-resources.opendatasoft.com/"
         *         ctx-dataset="les-arbres-remarquables-de-paris">
         *         <div ods-adv-analysis="myData"
         *             ods-adv-analysis-context="ctx"
         *             ods-adv-analysis-select="(sum(hauteur_en_m)/count(espece)) as y_axis"
         *             ods-adv-analysis-where="arrondissement LIKE 'paris'"
         *             ods-adv-analysis-group-by="espece as x_axis">
         *             {{myData}}
         *         </div>
         *     </ods-dataset-context>
         * </pre>
         *
         * How to create multiple time series:
         *
         * In this example, the widget returns the average gold price by month in 2018 and 2019. The `group-by` year allows to compare each year with the others.
         * <pre>
         *     <ods-dataset-context
         *         context="ctx"
         *         ctx-domain="https://documentation-resources.opendatasoft.com/"
         *         ctx-dataset="gold-prices">
         *         <div ods-adv-analysis="myData"
         *             ods-adv-analysis-context="ctx"
         *             ods-adv-analysis-select="avg(prices) as y_axis"
         *             ods-adv-analysis-where="date > date'2017'"
         *             ods-adv-analysis-group-by="month(date) as x_axis, year(date) as series">
         *             {{myData}}
         *         </div>
         *     </ods-dataset-context>
         * </pre>
         *
         * <h2>How to use odsAdvancedAnalysis with odsVegaLite</h2>
         *
         * The output of <b>odsAdvancedAnalysis</b> is named in `ods-adv-analysis`. This name is then to be used as an attribute in the parameter `values-adva` of <b>odsVegaLite</b>.
         * But to display the right values, it needs the field names contained in this AngularJS variable.
         * The field names are given when the API request is made through <b>odsAdvancedAnalysis</b>.
         * The easiest way to match the requirements is to set a specific name to each field in the `ods-adv-analysis-select` and `ods-adv-analysis-group-by` parameters.
         * These names will then be used in the <b>odsVegaLite</b> configuration file.
         *
         * <b>✅ Here is an example of what would work:</b>
         *
         * - <b>Step 1:</b> in <b>odsAdvancedAnalysis</b>, the name `height` is given to the `select` attribute, and the `group-by` attribute name is set to `tree_species` instead of `espece`.
         * - <b>Step 2:</b> in <b>odsVegaLite</b>, `tree_species` becomes the chart's x-axis, and `height` becomes the y-axis.
         * <pre>
         *     <ods-dataset-context
         *         context="ctx"
         *         ctx-domain="https://documentation-resources.opendatasoft.com/"
         *         ctx-dataset="les-arbres-remarquables-de-paris">
         *         <div ods-adv-analysis="myData"
         *             ods-adv-analysis-context="ctx"
         *             ods-adv-analysis-select="(sum(hauteur_en_m)/count(objectid)) as height"
         *             ods-adv-analysis-where="arrondissement LIKE 'paris'"
         *             ods-adv-analysis-group-by="espece as tree_species">
         *             <ods-vega-lite-chart spec='{
         *                 "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                 "data": {"name": "adva"},
         *                 "mark": "bar",
         *                 "encoding": {
         *                     "x": {"field": "tree_species", "type": "nominal", "title":"arrondissements", "labelLimit":50, "sort":{"op": "sum", "field":"y", "order":"descending"}},
         *                     "y": {"field": "height", "type": "quantitative", "title": "hauteur moyenne"},
         *                 },
         *             }'
         *             values-adva="myData">
         *             </ods-vega-lite-chart>
         *         </div>
         *     </ods-dataset-context>
         * </pre>
         *
         * Although optional, this is a crucial configuration to make. If the field names are different, the outcome will be a blank chart.
         *
         * <b>❌ Here is an example of what would NOT work:</b>
         *
         * In <b>odsVegaLite</b>, the x-axis is set with `espece`, which is also the name in <b>odsAdvancedAnalysis</b> and will therefore work. But the y-axis takes the field called `height` (which is what the widget is computing).
         * But since no name was specifically given in the select attribute, <b>odsAdvancedAnalysis</b> named the results differently (in this case : `(sum(hauteur_en_m)/count(objectid)`).
         * In conclusion, <b>odsVegaLite</b> won't recognize `height` and won't display any results.
         * The solution here is to change `ods-adv-analysis-select="(sum(hauteur_en_m)/count(objectid))"` for `ods-adv-analysis-select="(sum(hauteur_en_m)/count(objectid)) as height"`
         * <pre>
         *     <ods-dataset-context
         *         context="ctx"
         *         ctx-domain="https://documentation-resources.opendatasoft.com/"
         *         ctx-dataset="les-arbres-remarquables-de-paris">
         *         <div ods-adv-analysis="myData"
         *             ods-adv-analysis-context="ctx"
         *             ods-adv-analysis-select="(sum(hauteur_en_m)/count(objectid))"
         *             ods-adv-analysis-where="arrondissement LIKE 'paris'"
         *             ods-adv-analysis-group-by="espece">
         *             <ods-vega-lite-chart spec='{
         *                 "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                 "data": {"name": "adva"},
         *                 "mark": "bar",
         *                 "encoding": {
         *                     "x": {"field": "espece", "type": "nominal", "title":"arrondissements", "labelLimit":50, "sort":{"op": "sum", "field":"y", "order":"descending"}},
         *                     "y": {"field": "height", "type": "quantitative", "title": "hauteur moyenne"},
         *                 },
         *             }'
         *             values-adva="myData">
         *             </ods-vega-lite-chart>
         *         </div>
         *     </ods-dataset-context>
         * </pre>
         *
         * <h2>How to use odsAdvancedAnalysis with odsAdvTable</h2>
         *
         * <b>odsAdvancedTable</b> was designed to accept the JSON created by <b>odsAdvancedAnalysis</b>.
         * Its purpose is to offer a table view that matches the widget and to provide an accessible way of displaying data as an alternative to charts.
         *
         * For more information, see {@link ods-widgets.directive:odsAdvTable the documentation for odsAdvTable}.
         * <pre>
         *     <ods-dataset-context
         *         context="ctx"
         *         ctx-domain="https://documentation-resources.opendatasoft.com/"
         *         ctx-dataset="les-arbres-remarquables-de-paris">
         *         <div ods-adv-analysis="myData"
         *             ods-adv-analysis-context="ctx"
         *             ods-adv-analysis-select="count(objectid) as quantite_arbres, AVG(circonference_en_cm) as circonference_moyenne"
         *             ods-adv-analysis-group-by="arrondissement">
         *             <ods-adv-table
         *                 data="myData"
         *                 sticky-header="true"
         *                 sticky-first-column="true"
         *                 columns-order="['arrondissement', 'quantite_arbres', 'circonference_moyenne']"
         *                 totals="['quantite_arbres']"
         *                 sort="arrondissement ASC">
         *             </ods-adv-table>
         *         </div>
         *     </ods-dataset-context>
         * </pre>
         *
         */
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var runQuery = function(variableName, context, select, where, limit, groupBy, orderBy) {
                    var params = APIParamsV1ToV2(context.parameters);
                    params = angular.extend(params, {
                        select: select,
                        where: where,
                        limit: limit,
                        group_by: groupBy,
                        order_by: orderBy
                    });
                    ODSAPIv2
                        .uniqueCall(ODSAPIv2.datasets.aggregates)(context, params)
                        .then(function(response) {
                            var result = response.data;
                            $scope[variableName] = result.aggregations;
                        }, function(response) {
                            var error = response.data;
                            console.error('odsAdvAnalysis: API error\n\n', error.message);
                        })
                };

                var initQuery = function() {
                    var variableName = $attrs.odsAdvAnalysis;
                    var contextName = $attrs.odsAdvAnalysisContext;
                    var querySelect = $attrs.odsAdvAnalysisSelect;
                    var queryWhere = $attrs.odsAdvAnalysisWhere;
                    var queryLimit = $attrs.odsAdvAnalysisLimit;
                    var queryGroupBy = $attrs.odsAdvAnalysisGroupBy;
                    var queryOrderBy = $attrs.odsAdvAnalysisOrderBy;

                    var context = $scope[contextName];

                    context.wait()
                        .then(function() {
                            runQuery(variableName, context, querySelect, queryWhere, queryLimit, queryGroupBy, queryOrderBy)
                        });
                };

                $scope.$watch(function() {
                    return [
                        $attrs,
                        $scope[$attrs.odsAdvAnalysisContext].parameters
                    ]
                }, initQuery, true);
            }]
        };
    }]);
}());
