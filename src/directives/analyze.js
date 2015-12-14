/**
 * Created by manu on 20/10/15.
 */
(function() {
    'use strict';

    var mod = angular.module('ods-widgets');
    mod.directive("odsAnalyze", function (URLSynchronizer, $location, DebugLogger) {
        return {
            restrict: 'E',
            template: ''
            + '<div class="records-analyze">'
            + '    <div ng-if="fakeMultiChartContext.datasets" no-controls="noControls" advanced-chart-controls chart-context="chartContext" context="fakeMultiChartContext" urlsynchronize></div>'
            + '    <div ng-if="fakeMultiChartContext.datasets" ods-highcharts-chart colors="colors" context="fakeMultiChartContext" parameters="chartContext.dataChart"></div>'
            + '</div>',
            scope: {
                context: '=',
                autoResize: '@',
                noControls: '=?'
            },
            replace: true,
            controller: ["$scope", function ($scope) {
                $scope.noControls = !!$scope.noControls;
                $scope.fakeMultiChartContext = {datasets: false};
                $scope.chartContext = {};
                $scope.context.wait().then(function () {
                    $scope.fakeMultiChartContext.datasets = {};
                    $scope.fakeMultiChartContext.datasets[$scope.context.dataset.datasetid] = $scope.context;
                });
            }]
        };
    });
}());