(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAdvResults', ['ODSAPIv2', function (ODSAPIv2) {
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var runQuery = function(variableName, context, select, where, orderBy, rows) {
                    ODSAPIv2
                        .uniqueCall(ODSAPIv2.datasets.records)(context, {
                            select: select,
                            where: where,
                            order_by: orderBy,
                            rows: rows || undefined
                        })
                        .success(function(result) {
                            $scope[variableName] = result.records.map(function(entry) { return entry.record.fields; });
                        })
                        .error(function(error) {
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
