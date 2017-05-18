(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapDisplayControl', [function () {
        return {
            restrict: 'E',
            template: '' + '' +
            '<div class="odswidget odswidget-map-display-control">' +
            '   <ul class="odswidget-map-display-control__groups">' +
            '       <li ng-repeat="group in mapConfig.groups" ' +
            '           ng-click="toggleGroup(group)" ' +
            '           ng-class="{\'odswidget-map-display-control__group\': true, \'odswidget-map-display-control__group--disabled\': !group.displayed}">' +
            '           <div class="odswidget-map-display-control__group-title" ng-bind="group.title || group.layers[0].title || group.layers[0].context.dataset.metas.title"></div>' +
            '           <div class="odswidget-map-display-control__group-description" ng-if="getGroupDescription(group)" ng-bind="getGroupDescription(group)"></p>' +
            '       </li>' +
            '   </ul>' +
            '</div>',
            scope: {
                mapConfig: '=',
                singleLayer: '='
            },
            controller: ['$scope', 'shortSummaryFilter', function ($scope, shortSummaryFilter) {
                $scope.getGroupDescription = function(group) {
                    return group.description || shortSummaryFilter(group.layers[0].description, 200) || shortSummaryFilter(group.layers[0].context.dataset.metas.description, 200);
                };
                $scope.toggleGroup = function(group) {
                    if (!$scope.singleLayer) {
                        group.displayed = !group.displayed;
                    } else {
                        $scope.mapConfig.groups.forEach(function(group) {group.displayed = false; });
                        group.displayed = true;
                    }
                };

                // FIXME: What if we want to have an empty description? Maybe default to empty instead of dataset description?
            }]
        };
    }]);

}());