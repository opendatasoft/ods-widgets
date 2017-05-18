(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapLegend', [ function () {
        return {
            restrict: 'E',
            template: '' + '' +
            '<div class="odswidget odswidget-map-legend" ng-class="{\'odswidget-map-legend--extended\': extended}" ng-if="layers.length > 0">' +
            '   <div class="odswidget-map-legend__header">' +
            '       <div class="odswidget-map-legend__title" ng-class="{\'odswidget-map-legend__title--toggleable\': getCategoriesCount(selectedLayer) > 6}" ng-click="toggle()">' +
            '           {{ selectedLayer.config.captionTitle || selectedLayer.config.title || selectedLayer.config.context.dataset.metas.title}}' +
            '           <i ng-show="getCategoriesCount(selectedLayer) > 6 && !extended" class="odswidget-map-legend__title-toggle odsui-top"></i>' +
            '           <i ng-show="getCategoriesCount(selectedLayer) > 6 && extended" class="odswidget-map-legend__title-toggle odsui-bottom"></i>' +
            '       </div>' +
            '       <div ng-show="selectedLayer.properties.legendLabel" ng-bind="selectedLayer.properties.legendLabel" class="odswidget-map-legend__label">' +
            '       </div>' +
            '   </div>' +
            '   <div ng-switch="selectedLayer.config.display">' +
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
            '               <div ng-show="selectedLayer.config.color.otherCategories" class="odswidget-map-legend__categories--extended__item">' +
            '                   <div class="odswidget-map-legend__categories--extended__item-color">' +
            '                       <div style="background-color: {{selectedLayer.config.color.otherCategories}}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__categories--extended__item-value--others">Others</div>' +
            '               </div>' +
            '           </div>' +
            '       </div>' +
            '       <div ng-switch-when="choropleth" class="odswidget-map-legend__choropleth-container">' +
            '           <div ng-repeat="bound in selectedLayer.properties.bounds" class="odswidget-map-legend__choropleth__item">' +
            '               <div class="odswidget-map-legend__choropleth__item-color">' +
            '                   <div style="background-color: {{ bound.color }}" class="odswidget-map-legend__choropleth__color-block"></div>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item-range">' +
            '                   <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                       {{ bound.lowerBound|number:selectedLayer.properties.floatLength }}' +
            '                       <i aria-hidden="true" class="fa fa-long-arrow-right odswidget-map-legend__choropleth__item-range__bound-arrow"></i>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                       {{ bound.upperBound|number:selectedLayer.properties.floatLength }}' +
            '                   </div>' +
            '               </div>' +
            '           </div>' +
            '       </div>' +
            '       <div ng-switch-when="heatmap" class="odswidget-map-legend__simple-container">' +
            '           <div><span translate ng-bind="layer.func"></div> '+
            '           <div style="background: {{selectedLayer.properties.gradient}}" class="odswidget-map-legend__simple__color-block"></div>' +
            '           <div class="odswidget-map-legend__simple__color-block-subtext">' +
            '               <div class="odswidget-map-legend__simple__color-block-subtext-left" translate>Low</div>' +
            '               <div class="odswidget-map-legend__simple__color-block-subtext-right" translate>High</div>' +
            '           </div>' +
            '       </div>'+
            '       <div ng-switch-default class="odswidget-map-legend__simple-container">' +
            '           <div style="background-color: {{selectedLayer.config.color}}" class="odswidget-map-legend__simple__color-block"></div>' +
            '       </div>' +
            '   </div>' +
            '   <div ng-if="layers.length > 1" class="odswidget-map-legend__pagination">' +
            '       <button title="Previous" translate="title" class="odswidget-map-legend__pagination-button" ng-show="selectedIndex > 0" ng-click="previous()">' +
            '           <i class="odsui-left" aria-hidden="true"></i>' +
            '       </button>' +
            '       {{selectedIndex+1}}/{{layers.length}}' +
            '       <button title="Next" translate="title" class="odswidget-map-legend__pagination-button" ng-show="selectedIndex < layers.length - 1" ng-click="next()">' +
            '           <i class="odsui-right"aria-hidden="true"></i>' +
            '       </button>' +
            '   </div>' +
            '</div>',
            scope: {
                mapConfig: '='
            },
            controller: ['$scope', 'MapHelper', function ($scope, MapHelper) {
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
                    if (angular.isUndefined(layer.config.color.categories)) {
                        return 1;
                    }
                    var count = Object.keys(layer.config.color.categories).length;

                    if (layer.config.otherCategories) {

                        count += 1;
                    }
                    return count;
                };

                $scope.getCategories = function(layer, limit) {
                    if (limit) {
                        var subset = {};
                        var i;

                        var categoryNames = Object.keys(layer.config.color.categories).sort(ODS.ArrayUtils.sortNumbers);

                        for (i=0; i<Math.min(limit, categoryNames.length); i++) {

                            var key = categoryNames[i];
                            subset[key] = layer.config.color.categories[key];
                        }
                        return subset;
                    } else {
                        return layer.config.color.categories;
                    }
                };

                // In a legend, we want all bounds to have the same float length with a maximal number of 3 decimals numbers.

                // Find the maximum float length in an array of bounds.
                // We do this by calculating the length of the 2nd part of a float number splited at comma position.

                var getBoundsFloatValue = function(bounds) {
                    var boundFloatLength,
                        floatLength = 0;

                    angular.forEach(bounds, function(bound){
                        angular.forEach(bound, function(value, key){
                            if (key !== 'color' && Math.floor(value) !== value) {
                                boundFloatLength = value.toString().split(".")[1].length;
                                if (boundFloatLength > floatLength) {
                                    floatLength = boundFloatLength;
                                }
                            }
                        });
                    });

                    if (floatLength > 3) {
                        floatLength = 3;
                    }
                    return floatLength;
                };


                // Format upper bounds and lower bounds according to the float length if needed

                var formatBounds = function (minBound, bounds, floatLength) {
                    var isUpperBound = true;
                    if (floatLength !== 0) {
                        angular.forEach(bounds, function (bound) {
                            bound.lowerBound = formatBound(bounds, minBound, bound.lowerBound, floatLength);
                            bound.upperBound = formatBound(bounds, minBound, bound.upperBound, floatLength, isUpperBound);
                        });
                        return bounds;
                    } else {
                        return bounds;
                    }
                };

                var formatBound = function(bounds, minBound, bound, floatLength, isUpperBound) {
                    bound = bound.toString();
                    var commaPosition;
                    if (bound === minBound) {
                        return bound;
                    } else if (isUpperBound && Math.floor(bound) != bound) {
                        // Format upper bound
                        return setBoundLength(bound, floatLength);
                    } else if (floatLength !== 0 && Math.floor(bound) != bound && !isUpperBound) {
                        // Format lower bounds to be equal to upper bound minus 1 even in float value (i.e. 3.14 -> 3.13)
                        // Find comma position in bound
                        commaPosition = bound.length - bound.split('.')[1].length;
                        // Format bound to the float length calculated before
                        bound = setBoundLength(bound, floatLength);
                        // Remove comma in bound, transform it in number and remove 1 (i.e. '3.14' -> '314' -> 314 -> 313 -> '313' )
                        bound = (Number((bound.replace('.', ''))) + 1).toString();
                        // Recalculate comma position in case it has changed (i.e. 99,99 > 100,00)
                        commaPosition = bound.length - (bound.length - commaPosition) - 1;
                        // Reposition comma and return lower bound
                        bound = [bound.slice(0, commaPosition), ".", bound.slice(commaPosition)].join('');
                        return bound;
                    } else {
                        return bound;
                    }
                };

                //
                var setBoundLength = function(bound, floatLength) {
                    var commaPosition = bound.length - bound.split('.')[1].length;
                    // Add 0 if bound float length is not equal to float length, else remove exceeding numbers in float
                    if (bound.split('.')[1].length < floatLength) {
                        bound += ('0'.repeat(floatLength - bound.split('.')[1].length));
                    } else {
                        bound = bound.slice(0, (commaPosition + floatLength));
                    }
                    return bound;
                };



                var refreshLayers = function() {
                    var layers = [];

                    $scope.mapConfig.groups.forEach(function(group) {
                        if (!group.displayed) {
                            return;
                        }
                        group.layers.forEach(function(layer) {

                            if (layer.caption && (angular.isString(layer.color) || (layer.color.type !== 'field' ))) {
                                var properties = {};
                                layers.push({
                                    config: layer,
                                    properties: properties
                                });
                                properties.legendLabel = MapHelper.getLayerLegendLabel(layer);
                                if (layer.display === 'choropleth') {
                                    var minBound;
                                    MapHelper.getDatasetFieldBoundMin(layer.context, layer.color.field).then(function (bound) {

                                        minBound = bound;

                                        // FIXME: A lot of code duplication with mapbuilder-color-choropleth
                                        var rangesUpperBounds = Object.keys(layer.color.ranges).map(MapHelper.boundAsNumber).sort(ODS.ArrayUtils.sortNumbers);
                                        var bounds = [];
                                        rangesUpperBounds.forEach(function (upperBound, index) {
                                            var searchingColor = true;
                                            upperBound = MapHelper.boundAsNumber(upperBound);
                                            angular.forEach(layer.color.ranges, function (color, bound) {
                                                if (upperBound == bound && searchingColor) {
                                                    if (index === 0) {
                                                        bounds.push({
                                                            color: color,
                                                            lowerBound: minBound,
                                                            upperBound: upperBound
                                                        });
                                                    } else {
                                                        bounds.push({
                                                            color: color,
                                                            lowerBound: rangesUpperBounds[index - 1],
                                                            upperBound: upperBound
                                                        });
                                                    }
                                                    searchingColor = false;
                                                }
                                            });
                                        });

                                        properties.floatLength = getBoundsFloatValue(bounds);

                                        bounds = formatBounds(minBound, bounds, properties.floatLength);

                                        properties.bounds = bounds;

                                    });
                                } else if (layer.display === 'heatmap') {

                                    var orderedSteps = Object.keys(layer.color.steps).map(parseFloat).sort(ODS.ArrayUtils.sortNumbers);

                                    var colors = orderedSteps.map(function (s) {
                                        return layer.color.steps[s];
                                    });

                                    var rule = "linear-gradient(to right, " + colors.join(',') + ")";

                                    properties.gradient = rule;
                                }
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

                $scope.$watchCollection(function() {
                    return $scope.mapConfig.groups.map(function(g) { return g.displayed; });
                }, function(nv, ov) {
                    if (angular.isDefined(nv) && angular.isDefined(ov) && !angular.equals(nv, ov)) {
                        var previouslySelectedLayerId = null;
                        if ($scope.selectedLayer) {
                            previouslySelectedLayerId = $scope.selectedLayer.config._runtimeId;
                        }
                        refreshLayers();
                        if ($scope.layers.length) {
                            var index = 0;
                            if (previouslySelectedLayerId) {
                                $scope.layers.forEach(function (layer) {
                                    if (layer.config._runtimeId === previouslySelectedLayerId) {
                                        $scope.selectedIndex = index;
                                        $scope.select($scope.selectedIndex);
                                    }
                                    index++;
                                });
                            }
                        }
                    }
                });
            }]
        };
    }]);

}());