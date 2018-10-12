(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapLegend', [ function () {
        return {
            restrict: 'E',
            require: '^odsMap',
            template: '' + '' +
            '<div class="odswidget odswidget-map-legend" ' +
            '     ng-class="{\'odswidget-map-legend--extended\': ( selectedLayer.config.display === \'categories\' && extended), \'odswidget-map-legend--not-toggleable\' : !isToggleable(selectedLayer)}" ' +
            '     ng-if="layers.length > 0" ' +
            '     ng-click="isToggleable(selectedLayer) && !clickBlocked && toggle()">' +
            '   <div class="odswidget-map-legend__header">' +
            '       <div ng-if="selectedLayer.config.captionPictoIcon" class="odswidget-map-legend__picto">' +
            '           <ods-map-picto name="{{ selectedLayer.config.captionPictoIcon }}"'+
            '                          color="{{ selectedLayer.config.captionPictoColor }}">' +
            '           </ods-map-picto>' +
            '       </div> ' +
            '       <div class="odswidget-map-legend__title"' +
            '           title="{{ getLayerTitle(selectedLayer) }}"' +
            '           ng-bind="shortTextSummaryFilter(getLayerTitle(selectedLayer), 50)">'+
            '       </div>' +
            '       <i ng-show="isToggleable(selectedLayer) && !extended" class="odswidget-map-legend__title-toggle odsui-top" ods-tooltip="Click to unfold" translate="ods-tooltip"></i>' +
            '       <i ng-show="isToggleable(selectedLayer) && extended" class="odswidget-map-legend__title-toggle odsui-bottom" ods-tooltip="Click to fold" translate="ods-tooltip"></i>' +
            '       <div ng-show="selectedLayer.properties.legendLabel" ng-bind="selectedLayer.properties.legendLabel" class="odswidget-map-legend__label">' +
            '       </div>' +
            '   </div>' +
            '   <div ng-switch="selectedLayer.config.display">' +
            '       <div ng-switch-when="categories" class="odswidget-map-legend__categories-container" ng-class="{\'odswidget-map-legend__categories-container--extended\' : extended}">' +
            '           <div ng-if="selectedLayer.config.color.type !== \'field\'">' +
            '               <div ng-if="isToggleable(selectedLayer) && !extended" class="odswidget-map-legend__categories--condensed">' +
            '                   <div ng-repeat="(value, color) in getCategories(selectedLayer, maxCategories) track by $index" class="odswidget-map-legend__categories__item">' +
            '                       <div class="odswidget-map-legend__categories__item-color">' +
            '                           <div ng-style="{\'background-color\' :color}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__categories__item-value" ng-bind="value"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__categories__item">' +
            '                       <div class="odswidget-map-legend__categories__item-value--others" translate translate-n="getCategoriesCount(selectedLayer) - maxCategories" translate-plural="{{ $count }} more items...">{{ $count }} more item...</div>'+
            '                   </div>' +
            '               </div>' +
            '               <div ng-if="!isToggleable(selectedLayer) || extended" class="odswidget-map-legend__categories--extended">' +
            '                   <div ng-repeat="(value, color) in getCategories(selectedLayer) track by $index" class="odswidget-map-legend__categories__item">' +
            '                       <div class="odswidget-map-legend__categories__item-color">' +
            '                           <div ng-style="{\'background-color\' :color}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__categories__item-value" ng-bind="value"></div>' +
            '                   </div>' +
            '                   <div ng-show="selectedLayer.config.color.otherCategories" class="odswidget-map-legend__categories__item">' +
            '                       <div class="odswidget-map-legend__categories__item-color">' +
            '                           <div ng-style="{\'background-color\' :selectedLayer.config.color.otherCategories}" class="odswidget-map-legend__categories__color-block"></div>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__categories__item-value--others">Others</div>' +
            '                   </div>' +
            '               </div>' +
            '           </div>' +
            '           <div ng-if="selectedLayer.config.color.type === \'field\'">' +
            '               <div class="odswidget-map-legend__no-legend-placeholder" translate>No legend available</div>' +
            '           </div>' +
            '       </div>' +
            '       <div ng-switch-when="choropleth" class="odswidget-map-legend__choropleth-container">' +
            '           <div ng-if="!isToggleable(selectedLayer) || extended">' +
            '               <div ng-repeat="bound in selectedLayer.properties.bounds" class="odswidget-map-legend__choropleth__item">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{\'background-color\' : bound.color }" class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range">' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ bound.lowerBound|number:selectedLayer.properties.floatLength }}' +
            '                           <i aria-hidden="true" class="fa fa-long-arrow-right odswidget-map-legend__choropleth__item-range__bound-arrow"></i>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ bound.upperBound|number:selectedLayer.properties.floatLength }}' +
            '                       </div>' +
            '                   </div>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item" ng-show="selectedLayer.properties.undefinedColor">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{\'background-color\' : selectedLayer.properties.undefinedColor }" ' +
            '                            class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range odswidget-map-legend__choropleth__item-range--center" ' +
            '                        translate>Undefined {{ selectedLayer.properties.legendLabel }}</div>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{\'background-color\' : selectedLayer.properties.outOfBoundsColor }" ' +
            '                            class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range odswidget-map-legend__choropleth__item-range--center" ' +
            '                        translate>Out of bounds {{ selectedLayer.properties.legendLabel }}</div>' +
            '               </div>' +
            '           </div>' +
            '           <div ng-if="isToggleable(selectedLayer) && !extended">' +
            '               <div class="odswidget-map-legend__choropleth__item">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{\'background-color\' : selectedLayer.properties.bounds[0].color }" class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range">' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[0].lowerBound|number:selectedLayer.properties.floatLength }}' +
            '                           <i aria-hidden="true" class="fa fa-long-arrow-right odswidget-map-legend__choropleth__item-range__bound-arrow"></i>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[0].upperBound|number:selectedLayer.properties.floatLength }}' +
            '                       </div>' +
            '                   </div>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item" ng-if="selectedLayer.properties.bounds.length > 3">' +
            '                   <p class="odswidget-map-legend__choropleth__item-value--remaining" translate translate-n="selectedLayer.properties.bounds.length - 2" translate-plural="{{ $count }} more items...">' +
            '                   {{ $count }} more item...' +
            '                   </p>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item" ng-if="selectedLayer.properties.bounds.length === 3">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{ \'background-color\': selectedLayer.properties.bounds[1].color}" class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range">' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[1].lowerBound|number:selectedLayer.properties.floatLength }}' +
            '                           <i aria-hidden="true" class="fa fa-long-arrow-right odswidget-map-legend__choropleth__item-range__bound-arrow"></i>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[1].upperBound|number:selectedLayer.properties.floatLength }}' +
            '                       </div>' +
            '                   </div>' +
            '               </div>' +
            '               <div class="odswidget-map-legend__choropleth__item">' +
            '                   <div class="odswidget-map-legend__choropleth__item-color">' +
            '                       <div ng-style="{ \'background-color\': selectedLayer.properties.bounds[selectedLayer.properties.bounds.length - 1].color }" class="odswidget-map-legend__choropleth__color-block"></div>' +
            '                   </div>' +
            '                   <div class="odswidget-map-legend__choropleth__item-range">' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[selectedLayer.properties.bounds.length - 1].lowerBound|number:selectedLayer.properties.floatLength }}' +
            '                           <i aria-hidden="true" class="fa fa-long-arrow-right odswidget-map-legend__choropleth__item-range__bound-arrow"></i>' +
            '                       </div>' +
            '                       <div class="odswidget-map-legend__choropleth__item-range__bound">' +
            '                           {{ selectedLayer.properties.bounds[selectedLayer.properties.bounds.length - 1].upperBound|number:selectedLayer.properties.floatLength }}' +
            '                       </div>' +
            '                   </div>' +
            '               </div>' +
            '           </div>' +
            '       </div>' +
            '       <div ng-switch-when="heatmap" class="odswidget-map-legend__simple-container">' +
            '           <div><span translate ng-bind="layer.func"></div> '+
            '           <div ng-style="{ \'background\': selectedLayer.properties.gradient}" class="odswidget-map-legend__simple__color-block"></div>' +
            '           <div class="odswidget-map-legend__simple__color-block-subtext">' +
            '               <div class="odswidget-map-legend__simple__color-block-subtext-left" translate>Low</div>' +
            '               <div class="odswidget-map-legend__simple__color-block-subtext-right" translate>High</div>' +
            '           </div>' +
            '       </div>'+
            '       <div ng-switch-default class="odswidget-map-legend__default-container">' +
            '           <div ng-style="{ \'background-color\': selectedLayer.config.color}" class="odswidget-map-legend__default__color-block"></div>' +
            '           <div translate>Item</div>' +
            '       </div>' +
            '   </div>' +
            '   <div ng-if="layers.length > 1" class="odswidget-map-legend__pagination">' +
            '       <button title="Previous" translate="title" class="odswidget-map-legend__pagination-button" ' +
            '               ng-show="selectedIndex > 0" ng-click="previous()" ng-mouseenter="preventToggle()" ng-mouseleave="allowToggle()">' +
            '           <i class="odsui-left" aria-hidden="true"></i>' +
            '       </button>' +
            '       {{selectedIndex+1}}/{{layers.length}}' +
            '       <button title="Next" translate="title" class="odswidget-map-legend__pagination-button" ' +
            '               ng-show="selectedIndex < layers.length - 1" ng-click="next()" ng-mouseenter="preventToggle()" ng-mouseleave="allowToggle()">' +
            '           <i class="odsui-right"aria-hidden="true"></i>' +
            '       </button>' +
            '   </div>' +
            '</div>',
            scope: {
                mapConfig: '='
            },
            link: function (scope, element, attrs, odsMapCtrl) {
                scope.resizeMapDisplayControl = odsMapCtrl.resizeMapDisplayControl;
            },
            controller: ['$scope', 'MapHelper', 'shortTextSummaryFilter', 'MapLayerHelper', function ($scope, MapHelper, shortTextSummaryFilter, MapLayerHelper) {
                $scope.extended = false;
                $scope.selectedLayer = null;
                $scope.selectedIndex = 0;
                $scope.maxCategories = 4;

                $scope.isToggleable = function(layer){
                    if (layer.config.display === 'choropleth' && Object.keys(layer.config.color.ranges).length > 3 ){
                        return true;
                    } else if (layer.config.display === 'categories' &&  $scope.getCategoriesCount(layer) > $scope.maxCategories && layer.config.color.type !== 'field' ) {
                        return true;
                    } else {
                        return false;
                    }
                };

                $scope.shortTextSummaryFilter = shortTextSummaryFilter;

                $scope.getLayerTitle = function(layer){
                    return layer.config.captionTitle || layer.config.title || layer.config.context.dataset.metas.title;
                };

                $scope.toggle = function() {
                    if ($scope.getCategoriesCount($scope.selectedLayer) <= $scope.maxCategories && $scope.extended) {
                        $scope.extended = false;
                    } else {
                        $scope.extended = !$scope.extended;
                    }
                    $scope.resizeMapDisplayControl();
                };

                $scope.select = function(index) {
                    $scope.selectedLayer = $scope.layers[index];
                    if (!$scope.isToggleable($scope.selectedLayer)){
                        $scope.extended = false;
                    }
                };

                $scope.previous = function() {
                    $scope.selectedIndex -= 1;
                    $scope.select($scope.selectedIndex);
                    $scope.resizeMapDisplayControl();
                };

                $scope.next = function() {
                    $scope.selectedIndex += 1;
                    $scope.select($scope.selectedIndex);
                    $scope.resizeMapDisplayControl();
                };

                $scope.preventToggle = function(){
                  $scope.clickBlocked = true;
                };

                $scope.allowToggle = function(){
                  $scope.clickBlocked = false;
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
                    var subset = {};
                    var i;

                    var categoryNames = Object.keys(layer.config.color.categories).sort(ODS.ArrayUtils.sortNumbers);

                    if (!limit){
                        limit = categoryNames.length;
                    }

                    for (i=0; i<Math.min(limit, categoryNames.length); i++) {
                        var key = categoryNames[i];
                        subset[key] = layer.config.color.categories[key];
                    }
                    return subset;
                };

                var refreshLayers = function() {
                    var layers = [];

                    $scope.mapConfig.groups.forEach(function(group) {
                        if (!group.displayed) {
                            return;
                        }
                        group.layers.forEach(function(layer) {

                            if (layer.caption && layer.context.dataset !== null) {
                                var properties = {};
                                layers.push({
                                    config: layer,
                                    properties: properties
                                });
                                properties.legendLabel = MapHelper.getLayerLegendLabel(layer);
                                if (layer.display === 'choropleth') {
                                    var minBound = layer.color.minValue;

                                    // FIXME: A lot of code duplication with mapbuilder-color-choropleth

                                    var rangesUpperBounds = Object.keys(layer.color.ranges).sort(function (a, b) {
                                        return parseFloat(a) - parseFloat(b);
                                    });

                                    var bounds = [];

                                    properties.floatLength = Object.keys(layer.color.ranges).reduce(function(sofar, current) {
                                        if (current.toString().indexOf('.') === -1) {
                                            return sofar;
                                        } else {
                                            return Math.max(sofar, current.toString().length - current.toString().indexOf('.') - 1);
                                        }
                                    }, 0);
                                    rangesUpperBounds.forEach(function (upperBound, index) {
                                        var color = layer.color.ranges[upperBound];

                                        if (index === 0) {
                                            bounds.push({
                                                color: color,
                                                lowerBound: minBound,
                                                upperBound: upperBound
                                            });
                                        } else {
                                            bounds.push({
                                                color: color,
                                                lowerBound: ODS.CalculationUtils.incrementByOneUnit(rangesUpperBounds[index - 1]),
                                                upperBound: upperBound
                                            });
                                        }
                                    });

                                    properties.bounds = bounds;

                                    var splitComplementaryColors = MapLayerHelper.getSplitComplementaryColors(layer.color.ranges[rangesUpperBounds[rangesUpperBounds.length -1]]);
                                    properties.outOfBoundsColor = layer.color.outOfBoundsColor || splitComplementaryColors[0];
                                    if (!layer.func && !layer.expr) {
                                        // not for aggregation choropleth
                                        properties.undefinedColor = layer.color.undefinedColor || splitComplementaryColors[1];
                                    }

                                    if ($scope.resizeMapDisplayControl) {
                                        $scope.resizeMapDisplayControl();
                                    }
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
