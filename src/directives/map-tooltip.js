(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapTooltip', ['$compile', '$templateCache', function($compile, $templateCache) {
        return {
            restrict: 'E',
            transclude: true,
            template: '' +
                '<div class="odswidget-map-tooltip">' +
                '   <ods-spinner class="odswidget-map-tooltip__spinner" ng-hide="records.length > 0"></ods-spinner>' +
                '   <div class="ng-leaflet-tooltip-cloak odswidget-map-tooltip__limited-results-warning" ng-show="records && records.length == RECORD_LIMIT" translate>(limited to the first {{RECORD_LIMIT}} records)</div>' +
                '   <div ng-repeat="record in records" ng-if="$index == selectedIndex" class="odswidget-map-tooltip__record">' +
                '       <div ng-if="!template" ng-include src="\'default-tooltip\'"></div>' +
                '       <div ng-if="template" ng-include src="\'custom-tooltip-\'+context.dataset.datasetid"></div>' +
                '   </div>' +
                '   <nav role="navigation" ng-show="records.length > 1" class="odswidget-map-tooltip__scroll-control ng-leaflet-tooltip-cloak">' +
                '       <button class="odswidget-map-tooltip__scroll-left" ng-click="moveIndex(-1)">' +
                '           <i class=" fa fa-chevron-left"  aria-hidden="true"></i>' +
                '       </button>' +
                '       <div class="odswidget-map-tooltip__scroll-amount" ng-bind="(selectedIndex+1)+\' / \'+records.length"></div>' +
                '       <button class="odswidget-map-tooltip__scroll-right" ng-click="moveIndex(1)">' +
                '          <i class="fa fa-chevron-right"></i>' +
                '       </button>' +
                '   </nav>' +
                '</div>',
            scope: {
                shape: '=',
                context: '=',
                recordid: '=',
                map: '=',
                template: '@',
                gridData: '=',
                geoDigest: '@',
                tooltipSort: '@' // field or -field
            },
            replace: true,
            link: function(scope, element, attrs) {
                scope.ctx = scope.context;
                var destroyPopup = function(e) {
                    if (e.popup._content === element[0]) {
                        if (scope.selectedShapeLayer) {
                            // Remove the outline on the selected shape
                            scope.map.removeLayer(scope.selectedShapeLayer);
                        }
                        scope.map.off('popupclose', destroyPopup);
                        scope.$destroy();
                    }
                };
                scope.map.on('popupclose', destroyPopup);
                scope.unCloak = function() {
                    jQuery('.ng-leaflet-tooltip-cloak', element).removeClass('ng-leaflet-tooltip-cloak');
                };
                if (attrs.template && attrs.template !== '') {
                    $templateCache.put('custom-tooltip-' + scope.context.dataset.datasetid, attrs.template);
                } else {
                    $templateCache.put('default-tooltip', '<div class="infoPaneLayout">' +
                        '<h2 class="odswidget-map-tooltip__header" ng-show="!!getTitle(record)">' +
                        '   <span ng-bind="getTitle(record) | shortSummary: 100"></span> ' +
                        '</h2>' +
                        '<dl class="odswidget-map-tooltip__record-values">' +
                        '    <dt ng-repeat-start="field in context.dataset.fields|fieldsForVisualization:\'map\'|fieldsFilter:context.dataset.extra_metas.visualization.map_tooltip_fields" ' +
                        '        ng-show="record.fields[field.name]|isDefined"' +
                        '        class="odswidget-map-tooltip__field-name">' +
                        '        {{ field.label }}' +
                        '    </dt>' +
                        '    <dd ng-repeat-end ' +
                        '        ng-switch="field.type" ' +
                        '        ng-show="record.fields[field.name]|isDefined"' +
                        '        class="odswidget-map-tooltip__field-value">' +
                        '        <span ng-switch-when="geo_point_2d">' +
                        '            <ods-geotooltip width="300" height="300" coords="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
                        '        </span>' +
                        '        <span ng-switch-when="geo_shape">' +
                        '            <ods-geotooltip width="300" height="300" geojson="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
                        '        </span>' +
                        '        <span ng-switch-when="file">' +
                        '            <div ng-if="!context.dataset.isFieldAnnotated(field, \'has_thumbnails\')" ng-bind-html="record.fields|formatFieldValue:field:context"></div>' +
                        '            <div ng-if="context.dataset.isFieldAnnotated(field, \'has_thumbnails\')" ng-bind-html="record.fields[field.name]|displayImageValue:context.dataset.datasetid" style="text-align: center;"></div>' +
                        '        </span>' +
                        '        <span ng-switch-default title="{{record.fields|formatFieldValue:field:context}}" ng-bind-html="record.fields|formatFieldValue:field|imagify|videoify|prettyText|nofollow"></span>' +
                        '    </dd>' +
                        '</dl>' +
                    '</div>');
                }

            },
            controller: ['$scope', '$filter', 'ODSAPI', 'ODSWidgetsConfig', function($scope, $filter, ODSAPI, ODSWidgetsConfig) {
                $scope.RECORD_LIMIT = 100;
                $scope.records = [];
                $scope.selectedIndex = 0;

                $scope.domain = {
                    current_language: ODSWidgetsConfig.language
                };

                var tooltipSort = $scope.tooltipSort;
                if (!tooltipSort && $scope.context.dataset.getExtraMeta('visualization', 'map_tooltip_sort_field')) {
                    tooltipSort = ($scope.context.dataset.getExtraMeta('visualization', 'map_tooltip_sort_direction') || '') + $scope.context.dataset.getExtraMeta('visualization', 'map_tooltip_sort_field');
                }

                $scope.moveIndex = function(amount) {
                    var newIndex = ($scope.selectedIndex + amount) % $scope.records.length;
                    if (newIndex < 0) {
                        newIndex = $scope.records.length + newIndex;
                    }
                    $scope.selectedIndex = newIndex;
                };

                var refresh = function() {
                    var options = {
                        format: 'json',
                        rows: $scope.RECORD_LIMIT
                    };
                    var shapeType = null;
                    if ($scope.shape) {
                        shapeType = $scope.shape.type;
                    }
                    if ($scope.recordid && shapeType !== 'Point') {
                        // When we click on a point, we rather want to match the location so that it fetches the other points
                        // stacked on the same place
                        options.q = "recordid:'"+$scope.recordid+"'";
                    } else if ($scope.geoDigest) {
                        options.geo_digest = $scope.geoDigest;
                    } else if ($scope.gridData) {
                        // From an UTFGrid tile
                        if ($scope.gridData['ods:geo_grid'] !== null) {
                            // Request geo_grid
                            options.geo_grid = $scope.gridData['ods:geo_grid'];
                        } else {
                            // Request geo_hash
                            options.geo_digest = $scope.gridData['ods:geo_digest'];
                        }
                    } else if ($scope.shape) {
                        ODS.GeoFilter.addGeoFilterFromSpatialObject(options, $scope.shape);
                    }

                    var queryOptions = {};
                    angular.extend(queryOptions, $scope.context.parameters, options);

                    if (tooltipSort) {
                        queryOptions.sort = tooltipSort;
                        ODSAPI.records.search($scope.context, queryOptions).success(function(data) { handleResults(data.records); });
                    } else {
                        ODSAPI.records.download($scope.context, queryOptions).success(handleResults);
                    }

                    function handleResults(data) {
                        if (data.length > 0) {
                            $scope.selectedIndex = 0;
                            $scope.records = data;
                            $scope.unCloak();
                            var shapeFields = $scope.context.dataset.getFieldsForType('geo_shape');
                            var shapeField;
                            if (shapeFields.length) {
                                shapeField = shapeFields[0].name;
                            }
                            if (shapeField && $scope.gridData &&
                                ($scope.gridData['ods:geo_type'] === 'Polygon' ||
                                 $scope.gridData['ods:geo_type'] === 'LineString' ||
                                 $scope.gridData['ods:geo_type'] === 'MultiPolygon' ||
                                 $scope.gridData['ods:geo_type'] === 'MultiLineString'
                                )) {
                                // Highlight the selected polygon
                                var record = data[0];
                                if (record.fields[shapeField]) {
                                    var geojson = record.fields[shapeField];
                                    if (geojson.type !== 'Point') {
                                        $scope.selectedShapeLayer = L.geoJson(geojson, {
                                            fill: false,
                                            color: '#CC0000',
                                            opacity: 1,
                                            dashArray: [5],
                                            weight: 2

                                        });
                                        $scope.map.addLayer($scope.selectedShapeLayer);
                                    }
                                }
                            }
                        } else {
                            $scope.map.closePopup();
                        }
                    }
                };

                $scope.$watch('context.parameters', function() {
                    refresh();
                }, true);
                $scope.$apply();

                /* *** HELPER METHODS FOR THE TEMPLATES *** */
                $scope.getTitle = function(record) {
                    if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_title) {
                        var titleField = $scope.context.dataset.extra_metas.visualization.map_tooltip_title;
                        if (angular.isDefined(record.fields[titleField]) && record.fields[titleField] !== '') {
                            return record.fields[titleField];
                        }
                    }
                    return null;
                };
                $scope.fields = angular.copy($scope.context.dataset.fields);
            }]
        };
    }]);
}());
