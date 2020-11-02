(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapLegacy', ['ModuleLazyLoader', function(ModuleLazyLoader) {
        /**
         * @deprecated
         * @name ods-widgets.directive:odsMapLegacy
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {boolean} [autoResize=false] If true, the map will attempt to resize itself to always take up all the space to the bottom of the viewport.
         * It is only useful in very specific cases, when the map is the main focus of the page and should take all the window real estate available.
         * @param {string} [location=none] Initial location of the map, under the format "zoom,latitude,longitude" (e.g. *12,48.85887,2.3292*)
         * @param {string} [basemap=default basemap] Identifier of the basemap to apply. Basemaps are configured using {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.basemaps}.
         * @param {boolean} [isStatic=false] If true, the map can't be panned or zoomed; in other words the map is static and can only show the initial view. Interaction with the data is still active,
         * for example you can still click on a marker to have a tooltip.
         * @param {boolean} [showFilters=false] If true, displays additional tools to use the map to filter the data in the context. For example if you use a table and a map on the same context,
         * this makes you able to use the map to refine the data displayed in the table.
         * @param {Object} [mapContext=none] An object that you can use to share the map state (location and basemap) between two or more map widgets when they are not in the same context.
         * @param {DatasetContext} [itemClickContext=none] Instead of popping a tooltip when you click on an item on the map, you can decide to add a filter to another context using this parameter.
         * Clicks that would normally make a popup appear (markers, clusters that can't be expanded more, shapes) will instead filter the specified context.
         *
         * By default this is a spatial filter:
         * if you clicked a point, then the filter is the exact location; if you clicked a shape, then the filter is the content of this shape.
         *
         * Note that you can specify more than one context by passing an array:
         * <pre>
         *     <ods-map-legacy context="myctx"
         *              item-click-context="[context2, context3]">
         *     </ods-map-legacy>
         * </pre>
         * In that case, the `itemClickMapField` and `itemClickContextField` (as described below) need to contain the name of the context they apply to:
         * <pre>
         *     <ods-map-legacy context="myctx"
         *              item-click-context="[trees, roads]"
         *              item-click-trees-map-field="field1"
         *              item-click-trees-context-field="field2"
         *              item-click-roads-map-field="field1"
         *              item-click-roads-context-field="field3">
         *     </ods-map-legacy>
         * </pre>
         * @param {string} [itemClickMapField=none] If you are using `itemClickContext` and want to filter on the value of a field instead of a spatial query, you can use this parameter to specify the name of the field to take
         * the value from. This must be a field from the dataset displayed on the map. It must be used together with `itemClickContextField`.
         * @param {string} [itemClickContextField=none] This parameter specifies the field to filter on in the context configured in `itemClickContext`. It must be used together with `itemClickMapField`.
         * The field must be a facet.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="events"
         *                               events-domain="https://widgets-examples.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract">
         *              <ods-map-legacy context="events"></ods-map-legacy>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */

        var ICON_CIRCLE = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
            '<svg width="19px" height="19px" viewBox="0 0 19 19" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns">' +
            '    <path d="M18,9.50004182 C18,14.1944851 14.1944015,18.0000836 9.49995818,18.0000836 C4.80551469,18.0000836 0.99991635,14.1944851 0.99991635,9.50004182 C0.99991635,4.80559834 4.80551469,1 9.49995818,1 C14.1944015,1 18,4.80559834 18,9.50004182 L18,9.50004182 Z" id="path8568" fill="#000000"></path>' +
            '    <rect style="opacity: 0" x="0" y="0" width="19" height="19"></rect>' +
            '</svg>';

        return {
            restrict: 'E',
            scope: {
                context: '=',
                embedMode: '@', // FIXME: This concept is not useful, we could remove it and use the more explicit settings to achieve the same effects
                autoResize: '@',
                mapContext: '=?',
                location: '@',
                basemap: '@',
                isStatic: '@',
                showFilters: '@',
                itemClickContext: '=',
                colorBy: '@',
                colorByField: '@',
                colorByContext: '=',
                colorByAggregationKey: '@',
                colorByKey: '@',
                colorByExpression: '@',
                colorByFunction: '@',
                colorByRanges: '@',
                colorByRangesColors: '@'
            },
            replace: true,
            template: function(tElement) {
                tElement.contents().wrapAll('<div>');
                if (tElement.contents().length > 0 && tElement.contents().html().trim().length > 0) {
                    tElement.contents().wrapAll('<div>');
                    tElement.data('tooltipTemplate', tElement.children().html());
                }
                return '<div class="odswidget odswidget-map">' +
                        '<div class="odswidget-map__map"></div>' +
                        '<div class="odswidget-overlay map odswidget-overlay--opaque" ng-show="pendingRequests.length && initialLoading"><ods-spinner></ods-spinner></div>' +
                    '</div>';
            },
            link: function(scope, element) {
                if (angular.isUndefined(scope.mapContext)) {
                    scope.mapContext = {};
                    if (scope.location) {
                        scope.mapContext.location = scope.location;
                    }
                    if (scope.basemap) {
                        scope.mapContext.basemap = scope.basemap;
                    }
                }

                function resizeMap(){
                    if (jQuery('.odswidget-map__map').length > 0) {
                        // Only do this if visible
                        jQuery('.odswidget-map__map').height(Math.max(200, jQuery(window).height() - jQuery('.odswidget-map__map').offset().top));
                    }
                }
                if (scope.autoResize === 'true') {
                    jQuery(window).on('resize', resizeMap);
                    resizeMap();
                }
                ModuleLazyLoader('leaflet').then(function() {
                    // Define the "Filter By Map View" button
                    L.Control.FilterByView = L.Control.extend({
                        options: {
                            position: 'topright'
                        },

                        onAdd: function (map) {
                            var className = 'leaflet-control-filterview',
                                classNames = className + ' leaflet-bar leaflet-control',
                                container = L.DomUtil.create('div', classNames);

                            var link = L.DomUtil.create('a', 'leaflet-bar-part', container);
                            link.href = '#';
                            //link.title = 'Filter the data to what you see on the map';

                            if (scope.mapViewFilter) {
                                container.className = classNames + ' active';
                            }

                            L.DomEvent
                                .on(link, 'click', L.DomEvent.stopPropagation)
                                .on(link, 'click', L.DomEvent.preventDefault)
                                .on(link, 'click', function() {
                                    // Toggle the active filter view
                                    scope.$apply(function(scope) {
                                        scope.mapViewFilter = !scope.mapViewFilter;
                                    });
                                    if (scope.mapViewFilter) {
                                        container.className = classNames + ' active';
                                    } else {
                                        container.className = classNames;
                                    }
                                    return false;
                                })
                                .on(link, 'dblclick', L.DomEvent.stopPropagation);

                            scope.$watch('mapViewFilter', function(newValue, oldValue) {
                                // Change the button style if the filter is deactivated from outside
                                if (newValue === oldValue) return;
                                if (newValue) {
                                    container.className = classNames + ' active';
                                } else {
                                    container.className = classNames;
                                }
                            });
                            // FIXME: Plug it to a working ods-tooltip
//                            if ($) {
//                                jQuery(link).tooltip({
//                                    placement: 'left',
//                                    title: '<div style="white-space: nowrap; width: auto;" translate>Filter the data to what you see on the map</div>',
//                                    html: true
//                                });
//                            }

                            return container;
                        }

                    });

                    scope.initMap = function(dataset, embedMode, basemapsList, translate, geobox, basemap, staticMap, prependAttribution, language) {

                        var mapOptions = {
                            basemapsList: basemapsList,
                            worldCopyJump: true,
                            minZoom: 2,
                            basemap: basemap,
                            dragging: !staticMap,
                            zoomControl: !staticMap,
                            prependAttribution: prependAttribution
                        };

                        if (staticMap) {
                            mapOptions.doubleClickZoom = false;
                            mapOptions.scrollWheelZoom = false;
                        }
                        var map = new L.ODSMap(element.children()[0], mapOptions);

    //                    map.setView(new L.LatLng(48.8567, 2.3508),13);
                        map.addControl(new L.Control.Scale());

                        if (geobox && !staticMap) {
                            var geocoder = L.Control.geocoder({
                                placeholder: translate('Find a place...'),
                                errorMessage: translate('Nothing found.'),
                                geocoder: new L.Control.Geocoder.Nominatim({serviceUrl: "https://nominatim.openstreetmap.org/", geocodingQueryParams: {"accept-language": language || 'en', "polygon_geojson": true}})
                            });
                            geocoder.markGeocode = function(result) {
                                map.fitBounds(result.bbox);

                                if (result.properties.geojson) {
                                    var highlight = L.geoJson(result.properties.geojson, {
                                        style: function () {
                                            return {
                                                opacity: 0,
                                                fillOpacity: 0.8,
                                                fillColor: 'orange',
                                                className: 'leaflet-geocoder-highlight'
                                            };
                                        }
                                    });
                                    map.addLayer(highlight);
                                    $timeout(function () {
                                        element.addClass('geocoder-highlight-on');
                                    }, 0);
                                    $timeout(function () {
                                        element.removeClass('geocoder-highlight-on');
                                        map.removeLayer(highlight);
                                    }, 2500);
                                }
                            };
                            map.addControl(geocoder);
                        }

                        if (embedMode !== 'true') {
                            if (scope.showFilters === 'true') {
                                map.addControl(new L.Control.FilterByView());
                            }
                        }

                        if (!staticMap) {
                            map.addControl(new L.Control.Locate({maxZoom: 18}));
                        }

                        map.on('popupclose', function(e) {
                            jQuery(e.popup.getContent()).trigger('popupclose');
                        });

                        scope.map = map;
                    };
                });
            },
            controller: ['$scope', '$http', '$compile', '$q', '$filter', '$element', 'translate', 'ODSAPI', 'ODSWidgetsConfig', '$attrs', function($scope, $http, $compile, $q, $filter, $element, translate, ODSAPI, ODSWidgetsConfig, $attrs) {

                $scope.pendingRequests = $http.pendingRequests;
                $scope.initialLoading = true;

                if ($scope.itemClickMapField && !$scope.itemClickContextField || !$scope.itemClickMapField && $scope.itemClickContextField) {
                    console.log('ERROR: You need to configure both item-click-context-field and item-click-map-field.');
                }

                var shapeField = null;
                var createMarker = null;
                var colorAggregation;

                var locationParameterFunctions = {
                    delimiter: ',',
                    accuracy: 5,
                    formatLatLng: function(latLng) {
                        var lat = L.Util.formatNum(latLng.lat, this.accuracy);
                        var lng = L.Util.formatNum(latLng.lng, this.accuracy);
                        return new L.latLng(lat, lng);
                    },
                    getLocationParameterAsArray: function(location) {
                        return location.split(this.delimiter);
                    },
                    getLocationParameterFromMap: function(map) {
                        var center = this.formatLatLng(map.getCenter());
                        return map.getZoom() + this.delimiter + center.lat + this.delimiter + center.lng;
                    },
                    getCenterFromLocationParameter: function(location) {
                        var a = this.getLocationParameterAsArray(location);
                        return new L.latLng(a[1], a[2]);
                    },
                    getZoomFromLocationParameter: function(location) {
                        return this.getLocationParameterAsArray(location)[0];
                    }
                };

                var propagateSpatialItemClickToContext = function(context, shape) {
                    ODS.GeoFilter.addGeoFilterFromSpatialObject(context.parameters, shape);
                };

                var propagateItemClickToContext = function(context, mapField, contextField, record) {
                    if (angular.isDefined(record.fields[mapField])) {
                        // Until we can have named parameters, we need to avoid using the q= parameter as it will quickly
                        // conflict with other widgets that need to interact with the query.
                        context.parameters['refine.'+contextField] = record.fields[mapField];
//                        context.parameters.q = contextField + ':"' + record.fields[mapField] + '"';
                    }
                };

                var propagateToContext = function(context, mapField, contextField, shape, record) {
                    if (!mapField && !contextField) {
                        $scope.$apply(function() {
                            propagateSpatialItemClickToContext(context, shape);
                        });
                    } else if (record) {
                        $scope.$apply(function() {
                            propagateItemClickToContext(context, mapField, contextField, record);
                        });
                    } else {
                        // We need to retrieve a record for this to work
                        var options = {};
                        ODS.GeoFilter.addGeoFilterFromSpatialObject(options, shape);
                        jQuery.extend(
                            options,
                            $scope.staticSearchOptions,
                            $scope.context.parameters,
                            {'rows': 1});
                        ODSAPI.records.download($scope.context, options).then(function(response) {
                            var data = response.data;
                            propagateItemClickToContext(context, mapField, contextField, data[0]);
                        });
                    }
                };

                var clickOnItem = function(latLng, shape, recordid, record) {
                    // This method is triggered when the user clicks on a marker or anything that triggers a "selection"
                    // of something (a shape, a cluster that can't be more precise...).
                    var mapField, contextField, context;
                    if ($scope.itemClickContext) {
                        // Trigger a change in another context
                        if (angular.isArray($scope.itemClickContext)) {
                            // Multiple contexts
                            angular.forEach($scope.itemClickContext, function(context) {
                                contextField = $attrs['itemClick'+ODS.StringUtils.capitalize(context.name)+'ContextField'];
                                mapField = $attrs['itemClick'+ODS.StringUtils.capitalize(context.name)+'MapField'];
                                propagateToContext(context, mapField, contextField, shape, record);
                            });
                        } else {
                            // Single context
                            context = $scope.itemClickContext;
                            // If there is only one context, precising its name in the attributs is optional
                            contextField = $attrs['itemClick'+ODS.StringUtils.capitalize(context.name)+'ContextField'] || $attrs.itemClickContextField;
                            mapField = $attrs['itemClick'+ODS.StringUtils.capitalize(context.name)+'MapField'] || $attrs.itemClickMapField;
                            propagateToContext(context, mapField, contextField, shape, record);
                        }
                    } else {
                        // Good ol' popup
                        var newScope = $scope.$new(false);
                        if (recordid) {
                            newScope.recordid = recordid;
                        } else {
                            newScope.shape = shape;
                        }
                        var popupOptions = {
                            offset: [0, -30],
                            maxWidth: 250,
                            minWidth: 250,
                            autoPanPaddingTopLeft: [50, 305],
                            autoPan: !$scope.mapViewFilter && !$scope.staticMap
                        };
                        var html = $element.data('tooltipTemplate');
                        if (angular.isUndefined(html) || !angular.isString(html) || html.trim() === '') {
                            // If no template explicitely passed in the odsMap tag, we look into the map map_tooltip_html.
                            if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_html) {
                                html = $scope.context.dataset.extra_metas.visualization.map_tooltip_html;
                            } else {
                                html = '';
                            }
                        }
                        newScope.template = html;
                        var popup = new L.Popup(popupOptions).setLatLng(latLng)
                            .setContent($compile('<ods-map-tooltip shape="shape" context="context" recordid="recordid" map="map" template="{{template}}"></ods-map-tooltip>')(newScope)[0]);
                        popup.openOn($scope.map);
                    }
                };

                var numberFormatting = function(number) {
                    /* Passed as a callback for the cluster markers, to allow them to format their displayed value */
                    // Limiting the digits
                    number = Math.round(number*100)/100;
                    // Formatting the digits
                    number = $filter('number')(number);
                    return number;
                };

                var addClusterToLayerGroup = function(layerGroup) {
                    return function(cluster, maximum) {
                        if (cluster.count > 1) {
                            var clusterMarker = new L.ClusterMarker(cluster.cluster_center, {
                                geojson: cluster.cluster,
                                value: cluster.count,
                                total: maximum,
                                numberFormattingFunction: numberFormatting,
                                color: $scope.markerColor
                            });

                            if (!$scope.staticMap) {
                                clusterMarker.on('click', function (e) {
                                    if ($scope.map.getZoom() === $scope.map.getMaxZoom()) {
                                        clickOnItem(marker.getLatLng(), cluster.cluster);
                                    } else {
                                        // Get the boundingbox for the content
                                        $scope.$apply(function () {
                                            if (cluster.cluster) {
                                                if (cluster.cluster.type === 'Point') {
                                                    $scope.map.fitBounds([
                                                        [cluster.cluster.coordinates[1], cluster.cluster.coordinates[0]],
                                                        [cluster.cluster.coordinates[1], cluster.cluster.coordinates[0]]
                                                    ]);
                                                } else {
                                                    var options = {};
                                                    // The geofilter.polygon has to be added last because if we are in mapViewFilter mode,
                                                    // the searchOptions already contains a geofilter

                                                    // FIXME: This is a workaround until we know we can safely do polygon requests for the clusters.
                                                    // See https://github.com/opendatasoft/platform/issues/2116
    //                                                var polygonParameter = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(cluster.cluster); // This is the normal good one
                                                    var polygonParameter = ODS.GeoFilter.getBoundsAsPolygonParameter(L.geoJson(cluster.cluster).getBounds()); // This is the workaround

                                                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {
                                                        'geofilter.polygon': polygonParameter
                                                    });
                                                    ODSAPI.records.boundingbox($scope.context, options).then(function (response) {
                                                        var data = response.data;
                                                        $scope.map.fitBounds([
                                                            [data.bbox[1], data.bbox[0]],
                                                            [data.bbox[3], data.bbox[2]]
                                                        ]);
                                                    });
                                                }
                                            } else {
                                                $scope.map.setView(e.latlng, $scope.map.getZoom()+2);
                                            }
                                        });
                                    }
                                });
                            }

                            layerGroup.addLayer(clusterMarker);
                        } else {
                            var singleMarker = createMarker(cluster.cluster_center);
                            singleMarker.on('click', function(e) {
                                clickOnItem(e.target.getLatLng(), cluster.cluster);
                            });
                            layerGroup.addLayer(singleMarker);
                        }
                    };
                };

                var refreshClusteredGeo = function(showPolygons) {
                    var options = {
                        'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds()),
                        'clusterprecision': $scope.map.getZoom(),
                        'clusterdistance': 50,
                        'return_polygons': showPolygons
                    };
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    if ($scope.currentClusterRequestCanceler) {
                        $scope.currentClusterRequestCanceler.resolve();
                    }
                    $scope.currentClusterRequestCanceler = $q.defer();
                    ODSAPI.records.geo($scope.context, options, $scope.currentClusterRequestCanceler.promise).then(function(response) {
                        var data = response.data;
                        var clusters = data.clusters;
                        $scope.records = clusters ? clusters.length : 0;
                        var layerGroup = new L.LayerGroup();
        //                var bounds = new L.LatLngBounds();
                        var clusterStacker = addClusterToLayerGroup(layerGroup);
                        for (var i=0; i<clusters.length; i++) {
                            var cluster = clusters[i];
                            clusterStacker(cluster, data.count.max);
                        }

                        // Switch the layers
                        layerGroup.addTo($scope.map);
                        if ($scope.layerGroup) {
                            $scope.map.removeLayer($scope.layerGroup);
                        }

                        $scope.layerGroup = layerGroup;

                        $scope.initialLoading = false;

                        $scope.currentClusterRequestCanceler = null;
                    });
                };

                var refreshShapePreview = function() {
                    var options = {
                        'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds()),
                        'clusterprecision': $scope.map.getZoom()
                    };
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    options.rows = 1000;
                    if ($scope.currentClusterRequestCanceler) {
                        $scope.currentClusterRequestCanceler.resolve();
                    }
                    $scope.currentClusterRequestCanceler = $q.defer();
                    ODSAPI.records.geopreview($scope.context, options, $scope.currentClusterRequestCanceler.promise).then(function(response) {
                        var data = response.data;

                        var layerGroup = new L.LayerGroup();
                        for (var i = 0; i < data.length; i++) {
                            drawShapePreview(layerGroup, data[i]);
                        }

                        // Switch the layers
                        layerGroup.addTo($scope.map);
                        if ($scope.layerGroup) {
                            $scope.map.removeLayer($scope.layerGroup);
                        }

                        $scope.layerGroup = layerGroup;
                        $scope.initialLoading = false;
                        $scope.currentClusterRequestCanceler = null;
                    });
                };

                var drawShapePreview = function(layerGroup, shape) {
                    var geojsonMarkerOptions = {
                        radius: 3,
                        fillColor: "#0033ff",
                        color: "#0000ff",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.5
                    };

                    var shapeLayer = new L.GeoJSON(shape.geometry, {
                        pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, geojsonMarkerOptions);
                        }
                    });

                    layerGroup.addLayer(shapeLayer);
                    shapeLayer.on('click', function(e) {
                        clickOnItem(e.latlng, shape.geometry, shape.id); //shape
                    });
                };

                var getAggregationColor = function(value) {
                    var i;

                    for (i=0; i<colorAggregation.ranges.length; i++) {
                        if (value < colorAggregation.ranges[i]) {
                            return colorAggregation.colors[i];
                        }
                    }
                    return colorAggregation.colors[colorAggregation.colors.length-1];
                };

                var refreshAggregation = function() {
                    var options = angular.extend({}, colorAggregation.context.parameters, {
                        'join.geo.remotedataset': $scope.context.dataset.datasetid,
                        'join.geo.localkey': colorAggregation.localkey,
                        'join.geo.remotekey': colorAggregation.remotekey,
                        'y.agg.expr': colorAggregation.expr,
                        'y.agg.func': colorAggregation.func
                    });
                    var layerGroup = new L.LayerGroup();
                    var bounds = new L.LatLngBounds();
                    var markers = new L.FeatureGroup();

                    // We're stubbing a dataset context
                    ODSAPI.records.analyze(colorAggregation.context, options).
                        then(function(response) {
                            var data = response.data;
                            angular.forEach(data, function(result) {
                                var records = result.x;
                                var value = result.agg;
                                angular.forEach(records, function(record) {
                                    drawGeoJSON(record, layerGroup, bounds, markers, getAggregationColor(value));
                                });
                            });

                            if ($scope.layerGroup) {
                                $scope.map.removeLayer($scope.layerGroup);
                            }
                            layerGroup.addLayer(markers);
                            layerGroup.addTo($scope.map);
                            $scope.layerGroup = layerGroup;

                            $scope.initialLoading = false;
                        });
                };

                var refreshRawGeo = function() {
                    var options = {};
                    options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    ODSAPI.records.download($scope.context, options).
                        then(function(response) {
                            var data = response.data;
                            $scope.records = data;
                            $scope.error = '';
                            $scope.nhits = data.length;

                            var layerGroup = new L.LayerGroup();
                            var bounds = new L.LatLngBounds();
                            var markers = new L.FeatureGroup();

                            for (var i=0; i<data.length; i++) {
                                var record = data[i];
                                drawGeoJSON(record, layerGroup, bounds, markers);
                            }

                            if ($scope.layerGroup)
                                $scope.map.removeLayer($scope.layerGroup);
                            layerGroup.addLayer(markers);
                            layerGroup.addTo($scope.map);
                            $scope.layerGroup = layerGroup;

                            $scope.initialLoading = false;
                        }, function(response) {
                            $scope.error = response.data.error;
                            $scope.initialLoading = false;
                        });
                };

                var drawGeoJSON = function(record, layerGroup, bounds, markers, color) {
                    var geoJSON;
                    var drawColor = color;
                    if ($scope.colorBy === 'value') {
                        var colorByVal = record.fields[colorAggregation.field];
                        if (colorByVal) {
                            drawColor = getAggregationColor(colorByVal);
                        }
                    }
                    if (shapeField) {
                        if (record.fields[shapeField]) {
                            geoJSON = record.fields[shapeField];
                            if (geoJSON.type === 'Point' && angular.isDefined(record.geometry)) {
                                // Due to a problem with how we handke precisions, we query a point with a lower precision than
                                // the geoJSON, so we need to use the geometry field instead.
                                geoJSON = record.geometry;
                            }
                        } else {
                            // The designated shapefield has no value, skip
                            return;
                        }
                    } else if (record.geometry) {
                        geoJSON = record.geometry;
                    } else {
                        return;
                    }

                    if (geoJSON.type == 'Point') {
                        // We regroup all the markers in one layer so that we can clusterize them
                        var point = new L.LatLng(geoJSON.coordinates[1], geoJSON.coordinates[0]);
                        var marker = createMarker(point, drawColor);
                        marker.on('click', function(e) {
                            clickOnItem(e.target.getLatLng(), geoJSON, null, record);
                        });
                        markers.addLayer(marker);
                        bounds.extend(point);
                    } else {
                        var layer;
                        if (drawColor) {
                            layer = new L.GeoJSON(geoJSON, {
                                style: function(feature) {
                                    var opts = {
                                        radius: 3,
                                        weight: 1,
                                        opacity: 0.9,
                                        fillOpacity: 0.5,
                                        color: drawColor
                                    };
                                    opts.fillColor = drawColor;
                                    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                                        opts.weight = 5;
                                        opts.color = drawColor;
                                    } else {
                                        opts.color = "#fff";
                                    }
                                    return opts;
                                }
                            });
                        } else {
                            layer = new L.GeoJSON(geoJSON);
                        }
                        layer.on('click', function(e) {
                            // For geometries, we bind the popup query to the center
                            clickOnItem(L.latLng(record.geometry.coordinates[1], record.geometry.coordinates[0]), geoJSON, record.recordid, record); //shape
                        });
                        layerGroup.addLayer(layer);
                        bounds.extend(layer.getBounds());
                    }
                };

                $scope.$watch('context.parameters', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;
                    if ($scope.initialLoading) return;

                    // If the polygon parameter didn't change, we can fit bounds. Else, it means the user dragged the map, and we
                    // don't want to fit again.

                    if (!newValue['geofilter.polygon'] && oldValue['geofilter.polygon']) {
                        // Someone removed the geofilter parameter, we need to disable the map view filter
                        $scope.mapViewFilter = false;
                        // No reason to go further: the map shouldn't move just because someone removed the filter
                        return;
                    } else if (!oldValue['geofilter.polygon'] && newValue['geofilter.polygon']) {
                        $scope.mapViewFilter = true;
                        // Adding the geofilter parameter shouldn't trigger a refresh
                        return;
                    }

                    if ($scope.mapViewFilter) {
                        refreshRecords(false);
                    } else {
                        // This is not a viewport change: this comes from a filter modification, so we want to refit
                        refreshRecords(true);
                    }
                }, true);

                if ($scope.colorBy === 'aggregation') {
                    $scope.$watch('colorByContext.parameters', function() {
                        if ($scope.map) {
                            refreshRecords(false);
                        }
                    }, true);
                }

                $scope.$watch('mapContext.location', function() {
                    if ($scope.map) {
                        refreshRecords(false);
                    }
                }, true);

                var refreshRecords = function(globalSearch) {
                    var DOWNLOAD_CAP = 200;
                    var SHAPEPREVIEW_HIGHCAP = 500000;
                    // The number of points where we stop asking for the polygon representing the cluster's content
                    var POLYGONCLUSTERS_HIGHCAP = 500000;

                    var refresh = function(data) {
                        if ($scope.colorBy === 'aggregation') {
                            refreshAggregation();
                        } else if ($scope.colorBy === 'value' || data.count < DOWNLOAD_CAP || $scope.map.getZoom() === $scope.map.getMaxZoom()) {
                            // Low enough: always download
                            refreshRawGeo();
                        } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                            // We take our decision depending on the content of the envelope
                            if (data.geometries.Point && data.geometries.Point > data.count/2) {
                                refreshClusteredGeo(data.count <= POLYGONCLUSTERS_HIGHCAP);
                            } else {
                                refreshShapePreview();
                            }

                        } else {
                            // Cluster no matter what
                            refreshClusteredGeo(data.count <= POLYGONCLUSTERS_HIGHCAP);
                        }
                    };

                    var options = {
                        'without_bbox': !globalSearch
                    };
                    if (!globalSearch) {
                        // Stay within the viewport
                        options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    }
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    ODSAPI.records.boundingbox($scope.context, options).then(function(response) {
                        var data = response.data;
                        if (globalSearch) {
                            // We manually move the map and trigger the refreshes on the new viewport
                            if (data.bbox.length > 0) {
                                var oldBounds = $scope.map.getBounds();
                                $scope.map.fitBounds([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                                var newBounds = $scope.map.getBounds();
                                // FIXME: This comparison doesn't seem to work very much... but worst case we run
                                // two queries, and the first one is immediately cancelled
                                if (angular.equals(oldBounds, newBounds)) {
                                    // We need a refresh even though the map didn't move
                                    refresh(data);
                                }

                            } else {
                                // We know we have no data, and we can't count on a viewport move to refresh it
                                refresh(data);
                            }
                        } else {
                            refresh(data);
                        }
                    });
                };

                var onViewportMove = function(map) {
                    var size = map.getSize();
                    if (size.x > 0 && size.y > 0) {
                        // Don't attempt to do anything if the map is not displayed... we can't capture useful bounds
        //                var param = ODS.GeoFilter.getBoundsAsPolygonParameter(map.getBounds());
                        $scope.mapContext.location = locationParameterFunctions.getLocationParameterFromMap(map);
                        if ($scope.mapViewFilter) {
                            // Generate a polygon from the bounds
                            $scope.context.parameters['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter(map.getBounds());
                        }
                    }
                };

                var unwatchSchema = $scope.$watch('[context.dataset, colorByContext.dataset]', function(newValue, oldValue) {
                    if (!newValue[0] || !newValue[0].datasetid) return;

                    if ($scope.colorBy === 'aggregation' && (!newValue[1] || !newValue[1].datasetid)) return;

                    if ($scope.colorBy === 'aggregation') {
                        // We want to color our geo depending on an aggregation on a remote dataset
                        colorAggregation = {
                            context: $scope.colorByContext,
                            localkey: $scope.colorByAggregationKey || $scope.colorByKey,
                            remotekey: $scope.colorByKey,
                            expr: $scope.colorByExpression,
                            func: $scope.colorByFunction,
                            ranges: $scope.colorByRanges.split(','),
                            colors: $scope.colorByRangesColors.split(',')
                        };
                    } else if ($scope.colorBy === 'value') {
                        colorAggregation = {
                            field: $scope.colorByField,
                            ranges: $scope.colorByRanges.split(','),
                            colors: $scope.colorByRangesColors.split(',')
                        };
                    }

                    newValue = newValue[0];

                    // For now the only way to have the geofilter parameter is to enable the map view filter
                    if ($scope.context.parameters['geofilter.polygon']) {
                        $scope.mapViewFilter = true;
                    } else {
                        $scope.mapViewFilter = false;
                    }

                    $scope.staticMap = $scope.isStatic === 'true' || $scope.context.parameters.static === 'true';

                    // Wait for initMap to be ready (lazy loading)
                    var unwatchInit = $scope.$watch('initMap', function() {
                        if ($scope.initMap) {
                            unwatchInit();
                            $scope.initMap(newValue, $scope.embedMode, ODSWidgetsConfig.basemaps, translate, ODSWidgetsConfig.mapGeobox, $scope.mapContext.basemap, $scope.staticMap, ODSWidgetsConfig.mapPrependAttribution, ODSWidgetsConfig.language);
                        }
                    });
                    unwatchSchema();
                    $scope.staticSearchOptions = {
                        rows: $scope.recordLimit,
                        dataset: $scope.context.dataset.datasetid,
                        format: 'json'
                    };
                    for (var i=0; i<newValue.fields.length; i++) {
                        var field = newValue.fields[i];
                        if (field.type === 'geo_shape') {
                            shapeField = field.name;
                            // The first one is enough
                            break;
                        }
                    }

                    // Display settings
                    var visualization = {};
                    if (newValue.extra_metas && newValue.extra_metas.visualization) {
                        visualization = newValue.extra_metas.visualization;
                    }
                    $scope.markerColor = visualization.map_marker_color || '#29398C';
                    createMarker = function(latLng, color) {
                        return new L.VectorMarker(latLng, {
                            color: color || $scope.markerColor,
                            icon: angular.element('<div>' + ICON_CIRCLE + '</div>'),
                            size: 4,
                            marker: !visualization.map_marker_hidemarkershape
                        });
                    };

                    var mapInitWatcher = $scope.$watch('map', function(nv, ov){
                        if (nv) {
                            $scope.$watch('mapViewFilter', function(newValue, oldValue) {
                                // Don't fire at initialization time
                                if (newValue === oldValue) return;
                                if (newValue) {
                                    $scope.context.parameters['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                                } else {
                                    if ($scope.context.parameters['geofilter.polygon'])
                                        delete $scope.context.parameters['geofilter.polygon'];
                                }
                            });
                            var boundsRetrieval = function(dataset) {
                                var deferred = $q.defer();

                                if ($scope.context.parameters.mapviewport) {

                                    if ($scope.context.parameters.mapviewport.substring(0, 1) === '(') {
                                        // Legacy support
                                        $scope.context.parameters.mapviewport = ODS.GeoFilter.getBoundsAsBboxParameter(ODS.GeoFilter.getPolygonParameterAsBounds($scope.context.parameters.mapviewport));
                                    }
                                    deferred.resolve(ODS.GeoFilter.getBboxParameterAsBounds($scope.context.parameters.mapviewport));
                                } else if ($scope.context.parameters["geofilter.polygon"]) {
                                    deferred.resolve(ODS.GeoFilter.getPolygonParameterAsBounds($scope.context.parameters["geofilter.polygon"]));
                                } else {
                                    // Get the boundingbox from the API
                                    var options = {};
                                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                                    ODSAPI.records.boundingbox($scope.context, options).then(function(response) {
                                        var data = response.data;
                                        if (data.count > 0) {
                                            deferred.resolve([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                                        } else {
                                            // Fallback to... the world
                                            deferred.resolve([[-60, -180], [80, 180]]);
                                        }
                                    });
                                }

                                return deferred.promise;
                            };

                            var setMapView = function() {
                                var deferred = $q.defer();

                                if ($scope.mapContext.location) {
                                    var center = locationParameterFunctions.getCenterFromLocationParameter($scope.mapContext.location);
                                    var zoom = locationParameterFunctions.getZoomFromLocationParameter($scope.mapContext.location);
                                    nv.setView(center, zoom);

                                    refreshRecords(false);

                                    deferred.resolve();
                                } else {
                                    boundsRetrieval($scope.context.dataset).then(function(bounds) {
                                        if ($scope.context.parameters.mapviewport) {
                                            delete $scope.context.parameters.mapviewport;
                                        }

                                        // Fit to dataset boundingbox if there is no viewport or geofilter
                                        nv.fitBounds(bounds);

                                        deferred.resolve();
                                    });
                                }

                                return deferred.promise;
                            };

                            setMapView().then(function() {
                                onViewportMove($scope.map);

                                $scope.map.on('moveend', function(e) {
                                    // Whenever the map moves, we update the displayed data
                                    onViewportMove(e.target);
                                    if(!$scope.$$phase && !$scope.$root.$$phase) {
                                        // Don't trigger a digest if it is already running (for example if a fitBounds is
                                        // triggered from within a apply)
                                        $scope.$apply();
                                    }
                                });
                            });

                            if (ODSWidgetsConfig.basemaps.length > 1) {
                                $scope.map.on('baselayerchange', function (e) {
                                    $scope.mapContext.basemap = e.layer.basemapId;
                                    if(!$scope.$$phase && !$scope.$root.$$phase) {
                                        // Don't trigger a digest if it is already running (for example if a fitBounds is
                                        // triggered from within a apply)
                                        $scope.$apply();
                                    }
                                });
                            }

                            mapInitWatcher();
                        }
                    });

                }, true);

            }]

        };
    }]);
}());
