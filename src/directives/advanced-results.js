(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAdvResults', ['ODSAPIv2', 'APIParamsV1ToV2', function (ODSAPIv2, APIParamsV1ToV2) {
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var dataCall = ODSAPIv2.uniqueCall(ODSAPIv2.datasets.records);

                var runQuery = function(variableName, context, select, where, orderBy, rows) {
                    var params = APIParamsV1ToV2(context.parameters);
                    params = angular.extend(params, {
                        select: select,
                        where: where,
                        order_by: orderBy,
                        rows: rows || undefined
                    });
                    dataCall(context, params)
                        .then(function(response) {
                            var result = response.data;
                            $scope[variableName] = result.records.map(function(entry) { return entry.record.fields; });
                        }, function(response) {
                            var error = response.data;
                            console.error('odsAdvResults: API error\n\n', error.message);
                        })
                };

                this.queryCallback = function(values) {
                    if (!values) {
                        values = {};
                    }

                    var variableName = $attrs.odsAdvResults;
                    var contextName = $attrs.odsAdvResultsContext;
                    var querySelect = $attrs.odsAdvResultsSelect;
                    var queryWhere = $attrs.odsAdvResultsWhere;
                    var queryOrderBy = values.orderBy || $attrs.odsAdvResultsOrderBy;
                    var queryRows = $attrs.odsAdvResultsRows;

                    var context = $scope[contextName];

                    context.wait()
                        .then(function() {
                            runQuery(variableName, context, querySelect, queryWhere, queryOrderBy, queryRows)
                        });
                };

                $scope.$watch(function() {
                    return [
                        $attrs,
                        $scope[$attrs.odsAdvResultsContext].parameters
                    ]
                }, this.queryCallback, true);
            }]
        };
    }]);
}());
