(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    function getGroupNames(groupBy) {
        // Compute the exact names of groups that will appear in the results
        var groups = groupBy.split(',');

        return groups.map(function(group) {
            var name = group;
            if (group.toLowerCase().includes(' as ')) {
                name = group.replace(' AS ', ' as ').split(' as ')[1];
            }
            return name.trim();
        });
    }

    mod.directive('odsAdvAnalysis', ['ODSAPIv2', 'APIParamsV1ToV2', function (ODSAPIv2, APIParamsV1ToV2) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAdvAnalysis
         * @scope
         * @restrict A
         * @param {string} odsAdvAnalysis This name can be used as the `data` attribute of the display widgets that support it (e.g. `odsAdvTable`).
         * @param {string} odsAdvAnalysisContext Insert here the name of the context to use.
         * @param {string} [odsAdvAnalysisSelect] Type here the query to make. More use cases are available below. The documentation about the ODSQL select clause is available here. This clause will contain the values (i.e., the y-axis in case of a chart).
         * @param {string} [odsAdvAnalysisWhere] This parameter allows to filter rows with a combination of expressions. The documentation about the ODSQL `where` clause is available [here](https://help.opendatasoft.com/apis/ods-explore-v2/#section/Opendatasoft-Query-Language-%28ODSQL%29/Where-clause).
         * @param {string} [odsAdvAnalysisGroupBy] This parameter helps regroup the calculation according to specific criteria. The `group-by` in this clause can become either y-axis or series in a chart. The documentation about the ODSQL `GROUP BY` clause is available [here](https://help.opendatasoft.com/apis/ods-explore-v2/#section/Opendatasoft-Query-Language-%28ODSQL%29/Group-by-clause).
         * @param {string} [odsAdvAnalysisOrderBy] This parameter is used to sort the results of an aggregation using the `ASC` and `DESC` keywords (e.g., `myField ASC` or ). The documentation about the ODSQL `ORDER BY` clause is available [here](https://help.opendatasoft.com/apis/ods-explore-v2/#section/Opendatasoft-Query-Language-%28ODSQL%29/Order-by-clause).
         * @param {string} [odsAdvAnalysisLimit] Limits the number of items to return.
         *
         * @description
         * The odsAdvAnalysis widget exposes the results of an aggregation function over a context.
         * It uses the ODS Explore API V2.1 and its [ODSQL language](https://help.opendatasoft.com/apis/ods-explore-v2/#section/Opendatasoft-Query-Language-%28ODSQL%29), which offers greater flexibility than the v1.
         *
         * The parameters for this widgets are dynamic, which implies two benefits:
         * - First, changes in context parameters will refresh the results of the widget.
         * - Second, AngularJS variables are accepted as attributes.
         *
         * The results can then be displayed in three different ways:
         * - To create specific visualizations, using custom-made HTML and CSS
         * - A table view is also available using `odsAdvTable` (examples are provided below).
         * - As the widget is creating an AngularJS variable, it can be displayed through a simple `{{myData.results[X]}}`. This usage is not documented here, as it regards HTML code and widgets already documented in [the introduction](https://help.opendatasoft.com/widgets/#/introduction/).
         *
         * For retro-compatibility purposes, similarly to API V2.0, if the `groupBy` is done on a field that contains null values, they will be removed. If you are
         * using the `limit` parameter, this may cause the widget to return one less category as expected, because the null group was included. You can
         * prevent this by using `where` to exclude null values from this field, using `IS NOT NULL` (e.g. `my_field IS NOT NULL`).
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
         *             ods-adv-analysis-select="avg(price) as y_axis"
         *             ods-adv-analysis-where="date > date'2017'"
         *             ods-adv-analysis-group-by="month(date) as x_axis, year(date) as series">
         *             {{myData}}
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
                var dataCall = ODSAPIv2.uniqueCall(ODSAPIv2.datasets.records);

                var runQuery = function(variableName, context, select, where, limit, groupBy, orderBy) {
                    var params = APIParamsV1ToV2(context.parameters, context.dataset.fields);
                    var combinedWhere;
                    if (where && params.where) {
                        // Two clauses coming from both the context and the parameters, we combine them
                        combinedWhere = '(' + where +') AND (' + params.where + ')';
                    } else {
                        // Keep the one that is used
                        combinedWhere = where || params.where;
                    }
                    var groups;
                    if (!groupBy) {
                        // Retro-compatibility: in the V2.0 version of the widget, we used aggregates endpoint, which
                        // returned only one entry if there was no group_by.
                        limit = limit || 1;
                    } else {
                        groups = getGroupNames(groupBy);
                    }
                    params = angular.extend(params, {
                        select: select,
                        where: combinedWhere,
                        limit: limit,
                        group_by: groupBy,
                        order_by: orderBy
                    });
                    dataCall(context, params)
                        .then(function(response) {
                            var results = response.data.results;
                            // Retro-compatibility: Remove empty groups to keep the behavior from API V2.0
                            if (groups) {
                                results = results.filter(function(result) {
                                    return !groups.find(function(group) { return result[group] === null; });
                                });
                            }
                            $scope[variableName] = results;
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
