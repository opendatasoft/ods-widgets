(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAdvAnalysis', ['ODSAPIv2', 'APIParamsV1ToV2', function (ODSAPIv2, APIParamsV1ToV2) {
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var runQuery = function(variableName, context, select, where, groupBy, orderBy) {
                    var params = APIParamsV1ToV2(context.parameters);
                    params = angular.extend(params, {
                        select: select,
                        where: where,
                        group_by: groupBy,
                        order_by: orderBy
                    });
                    ODSAPIv2
                        .uniqueCall(ODSAPIv2.datasets.aggregates)(context, params)
                        .success(function(result) {
                            $scope[variableName] = result.aggregations;
                        })
                        .error(function(error) {
                            console.error('odsAdvAnalysis: API error\n\n', error.message);
                        })
                };

                this.queryCallback = function(values) {
                    if (!values) {
                        values = {};
                    }

                    var variableName = $attrs.odsAdvAnalysis;
                    var contextName = $attrs.odsAdvAnalysisContext;
                    var querySelect = $attrs.odsAdvAnalysisSelect;
                    var queryWhere = $attrs.odsAdvAnalysisWhere;
                    var queryGroupBy = $attrs.odsAdvAnalysisGroupBy;
                    var queryOrderBy = values.orderBy || $attrs.odsAdvAnalysisOrderBy;

                    var context = $scope[contextName];

                    context.wait()
                        .then(function() {
                            runQuery(variableName, context, querySelect, queryWhere, queryGroupBy, queryOrderBy)
                        });
                };

                $scope.$watch(function() {
                    return [
                        $attrs,
                        $scope[$attrs.odsAdvAnalysisContext].parameters
                    ]
                }, this.queryCallback, true);
            }]
        };
    }]);
}());
