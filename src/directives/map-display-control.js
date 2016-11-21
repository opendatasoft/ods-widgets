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
            '           <div class="odswidget-map-display-control__group-title" ng-bind="group.title || group.layers[0].context.dataset.metas.title"></div>' +
            '           <div class="odswidget-map-display-control__group-description" ng-if="getGroupDescription(group)" ng-bind="getGroupDescription(group)"></p>' +
            '       </li>' +
            '   </ul>' +
            '</div>',
            scope: {
                mapConfig: '=',
                singleLayer: '='
            },
            controller: ['$scope', function ($scope) {
                var stripTags = function (text) {
                    // FIXME: Implement
                    return text;
                };
                $scope.getGroupDescription = function(group) {
                    return group.description || stripTags(group.layers[0].context.dataset.metas.description);
                };
                $scope.toggleGroup = function(group) {
                    console.log('singler layer', $scope.singleLayer);
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