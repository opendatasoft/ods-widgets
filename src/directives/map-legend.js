(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapLegend', [function () {
        return {
            restrict: 'E',
            template: '' + '' +
            '<div class="odswidget odswidget-map-legend" ng-class="{\'odswidget-map-legend--extended\': extended}" ng-if="layers.length > 0">' +
            '   <div class="odswidget-map-legend__title" ng-class="{\'odswidget-map-legend__title--toggleable\': getCategoriesCount(selectedLayer) > 6}" ng-click="toggle()">' +
            '       {{selectedLayer.captionTitle || selectedLayer.context.dataset.metas.title}}' +
            '       <i ng-show="getCategoriesCount(selectedLayer) > 6 && !extended" class="odswidget-map-legend__title-toggle odsui-top"></i>' +
            '       <i ng-show="getCategoriesCount(selectedLayer) > 6 && extended" class="odswidget-map-legend__title-toggle odsui-bottom"></i>' +
            '   </div>' +
            '   <div ng-switch="selectedLayer.display">' +
            '       <div ng-switch-when="categories" class="odswidget-map-legend__categories-container">' +
            '           <div ng-if="getCategoriesCount(selectedLayer) > 6 && !extended" class="odswidget-map-legend__categories--condensed">' +
            '              <div ng-repeat="(value, color) in getCategories(selectedLayer, 6)" class="odswidget-map-legend__categories--condensed__item">' +
            '                  <div style="background-color: {{color}}" class="odswidget-map-legend__categories__color-block"></div>' +
            '              </div>' +
            '           </div>' +
            '           <div ng-if="getCategoriesCount(selectedLayer) <= 6 || extended" class="odswidget-map-legend__categories--extended">' +
            '               <div ng-repeat="(value, color) in getCategories(selectedLayer)" class="odswidget-map-legend__categories--extended__item">' +
            '                   <div class="odswidget-map-legend__categories--extended__item-color">' +
            '                       <div style="background-color: {{color}}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__categories--extended__item-value" ng-bind="value"></div>' +
            '               </div>' +
            '               <div ng-show="selectedLayer.color.otherCategories" class="odswidget-map-legend__categories--extended__item">' +
            '                   <div class="odswidget-map-legend__categories--extended__item-color">' +
            '                       <div style="background-color: {{selectedLayer.color.otherCategories}}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__categories--extended__item-value--others">Others</div>' +
            '               </div>' +
            '           </div>' +
            '       </div>' +
            '       <div ng-switch-default class="odswidget-map-legend__simple-container">' +
            '           <div style="background-color: {{selectedLayer.color}}" class="odswidget-map-legend__simple__color-block"></div>' +
            '       </div>' +
            '   </div>' +
            '   <div ng-if="layers.length > 1" class="odswidget-map-legend__pagination">' +
            '       <button class="odswidget-map-legend__pagination-button" ng-show="selectedIndex > 0" ng-click="previous()">' +
            '           <i class="odsui-left"></i>' +
            '       </button>' +
            '       {{selectedIndex+1}}/{{layers.length}}' +
            '       <button class="odswidget-map-legend__pagination-button" ng-show="selectedIndex < layers.length - 1" ng-click="next()">' +
            '           <i class="odsui-right"></i>' +
            '       </button>' +
            '   </div>' +
            '</div>',
            scope: {
                mapConfig: '='
            },
            controller: ['$scope', function ($scope) {
                $scope.extended = false;
                $scope.selectedLayer = null;
                $scope.selectedIndex = 0;

                $scope.toggle = function() {
                    if ($scope.getCategoriesCount($scope.selectedLayer) <= 6) {
                        $scope.extended = false;
                        return;
                    }
                    $scope.extended = !$scope.extended;
                };
                $scope.select = function(index) {
                    $scope.selectedLayer = $scope.layers[index];
                    if ($scope.getCategoriesCount($scope.selectedLayer) <= 6 && $scope.extended) {
                        $scope.toggle();
                    }
                };
                $scope.previous = function() {
                    $scope.selectedIndex -= 1;
                    $scope.select($scope.selectedIndex);
                };
                $scope.next = function() {
                    $scope.selectedIndex += 1;
                    $scope.select($scope.selectedIndex);
                };

                $scope.getCategoriesCount = function(layer) {
                    if (angular.isUndefined(layer.color.categories)) {
                        return 1;
                    }
                    var count = Object.keys(layer.color.categories).length;
                    if (layer.otherCategories) {
                        count += 1;
                    }
                    return count;
                };

                $scope.getCategories = function(layer, limit) {
                    if (limit) {
                        var subset = {};
                        var i;

                        for (i=0; i<Math.min(limit, Object.keys(layer.color.categories).length); i++) {
                            var key = Object.keys(layer.color.categories)[i];
                            subset[key] = layer.color.categories[key];
                        }
                        return subset;
                    } else {
                        return layer.color.categories;
                    }
                };

                var refreshLayers = function() {
                    var layers = [];

                    $scope.mapConfig.groups.forEach(function(group) {
                        group.layers.forEach(function(layer) {
                            if (layer.caption && (angular.isString(layer.color) || layer.color.type !== 'field')) {
                                layers.push(layer);
                            }
                        });
                    });

                    $scope.layers = layers;

                    if ($scope.layers.length === 0) {
                        $scope.selectedIndex = 0;
                        $scope.selectedLayer = null;
                    } else if ($scope.layers.indexOf($scope.selectedLayer) === -1) {
                        $scope.selectedIndex = 0;
                        $scope.select(0);
                    }

                    if ($scope.selectedLayer === null && layers.length > 0) {
                        $scope.selectedIndex = 0;
                        $scope.select(0);
                    }
                };

                refreshLayers();
            }]
        };
    }]);

}());