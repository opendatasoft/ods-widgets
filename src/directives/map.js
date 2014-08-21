(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMap', ['ModuleLazyLoader', function(ModuleLazyLoader) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMap
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
         * @param {Object} [mapContext=none] An object that you can use to share the map state (location and basemap) between two or more table widgets when they are not in the same context.
         *
         */
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
                showFilters: '@'
            },
            replace: true,
            template: function(tElement) {
                tElement.children().wrapAll('<div>');
                tElement.data('tooltip-template', tElement.children().html());
                return '<div class="odswidget odswidget-map">' +
                        '<div class="map"></div>' +
                        '<div class="overlay map opaque-overlay" ng-show="pendingRequests.length && initialLoading"><spinner class="spinner"></spinner></div>' +
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
                    if ($('.odswidget-map > .map').length > 0) {
                        // Only do this if visible
                        $('.odswidget-map > .map').height(Math.max(200, $(window).height() - $('.odswidget-map > .map').offset().top));
                    }
                }
                if (scope.autoResize === 'true') {
                    $(window).on('resize', resizeMap);
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
//                                $(link).tooltip({
//                                    placement: 'left',
//                                    title: '<div style="white-space: nowrap; width: auto;" translate>Filter the data to what you see on the map</div>',
//                                    html: true
//                                });
//                            }

                            return container;
                        }

                    });

                    scope.initMap = function(dataset, embedMode, basemapsList, translate, geobox, basemap, staticMap, prependAttribution) {

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
                        if (embedMode !== 'true') {
                            if (scope.showFilters === 'true') {
                                map.addControl(new L.Control.FilterByView());
                            }
                            map.addControl(new L.Control.Fullscreen());
                        }

                        // Because of the weird CSS method we use to stay within Leaflet's control system, we need to add it
                        // last
                        if (geobox && !staticMap) {
                            map.addControl(new L.Control.GeoBox({placeholder: translate('Find a place...')}));
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
            controller: ['$scope', '$http', '$compile', '$q', '$filter', '$element', 'translate', 'ODSAPI', 'DebugLogger', 'ODSWidgetsConfig', function($scope, $http, $compile, $q, $filter, $element, translate, ODSAPI, DebugLogger, ODSWidgetsConfig) {
                DebugLogger.log('init map');

                $scope.pendingRequests = $http.pendingRequests;
                $scope.initialLoading = true;

        //        var refreshRecords;
                var shapeField = null;
                var createMarker = null;

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

                var openRecordPopup = function(latLng, shape, recordid) {
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
                    var html = $element.data('tooltip-template');

                    // FIXME: It may not work after transcluding "fixes" in Angular, see https://github.com/angular/angular.js/issues/7874
                    if (angular.isUndefined(html) || !angular.isString(html) || html.trim() === '') {
                        html = '';
                        newScope.template = $scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_template || ODSWidgetsConfig.basePath + "templates/geoscroller_tooltip.html";
                    }
                    var popup = new L.Popup(popupOptions).setLatLng(latLng)
                        .setContent($compile('<geo-scroller shape="shape" context="context" recordid="recordid" map="map" template="{{ template }}">'+html+'</geo-scroller>')(newScope)[0]);
                    popup.openOn($scope.map);
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
                                        openRecordPopup(marker.getLatLng(), cluster.cluster);
                                    } else {
                                        // Get the boundingbox for the content
                                        $scope.$apply(function () {
                                            if (cluster.cluster.type === 'Point') {
                                                $scope.map.fitBounds([
                                                    [cluster.cluster.coordinates[1], cluster.cluster.coordinates[0]],
                                                    [cluster.cluster.coordinates[1], cluster.cluster.coordinates[0]]
                                                ]);
                                            } else {
                                                var options = {};
                                                // The geofilter.polygon has to be added last because if we are in mapViewFilter mode,
                                                // the searchOptions already contains a geofilter
                                                jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {
                                                    'geofilter.polygon': ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(cluster.cluster)
                                                });
                                                ODSAPI.records.boundingbox($scope.context, options).success(function (data) {
                                                    $scope.map.fitBounds([
                                                        [data.bbox[1], data.bbox[0]],
                                                        [data.bbox[3], data.bbox[2]]
                                                    ]);
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            layerGroup.addLayer(clusterMarker);
                        } else {
                            var singleMarker = createMarker(cluster.cluster_center);
                            singleMarker.on('click', function(e) {
                                openRecordPopup(e.target.getLatLng(), cluster.cluster);
                            });
                            layerGroup.addLayer(singleMarker);
                        }
                    };
                };

                var refreshClusteredGeo = function() {
                    var options = {
                        'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds()),
                        'clusterprecision': $scope.map.getZoom(),
                        'clusterdistance': 50
                    };
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    if ($scope.currentClusterRequestCanceler) {
                        $scope.currentClusterRequestCanceler.resolve();
                    }
                    $scope.currentClusterRequestCanceler = $q.defer();
                    ODSAPI.records.geo($scope.context, options, $scope.currentClusterRequestCanceler.promise).success(function(data) {
                        var clusters = data.clusters;
                        $scope.records = clusters.length;
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
                    ODSAPI.records.geopreview($scope.context, options, $scope.currentClusterRequestCanceler.promise).success(function(data) {

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
                        openRecordPopup(e.latlng, null, shape.id);
                    });
                };

                var refreshRawGeo = function() {
                    var options = {};
                    options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    DebugLogger.log('map -> download');
                    ODSAPI.records.download($scope.context, options).
                        success(function(data, status, headers, config) {
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
                        }).
                        error(function(data, status, headers, config) {
                            $scope.error = data.error;
                            $scope.initialLoading = false;
                        });
                };

                var drawGeoJSON = function(record, layerGroup, bounds, markers) {
                    var geoJSON;
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
                        var marker = createMarker(point);
                        marker.on('click', function(e) {
                            openRecordPopup(e.target.getLatLng(), geoJSON);
                        });
                        markers.addLayer(marker);
                        bounds.extend(point);
                    } else {
                        var layer = new L.GeoJSON(geoJSON);
                        layer.on('click', function(e) {
                            // For geometries, we bind the popup query to the center
                            openRecordPopup(L.latLng(record.geometry.coordinates[1], record.geometry.coordinates[0]), record.geometry);
                        });
                        layerGroup.addLayer(layer);
                        bounds.extend(layer.getBounds());
                    }
                };

                $scope.$watch('context.parameters', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;
                    if ($scope.initialLoading) return;
                    DebugLogger.log('map -> searchOptions watch -> refresh records');

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

                $scope.$watch('mapContext.location', function() {
                    if ($scope.map) {
                        refreshRecords(false);
                    }
                }, true);

                var refreshRecords = function(globalSearch) {
                    var DOWNLOAD_CAP = 200;
                    var SHAPEPREVIEW_HIGHCAP = 500000;
                    var options = {};
                    if (!globalSearch) {
                        // Stay within the viewport
                        options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    }
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    ODSAPI.records.boundingbox($scope.context, options).success(function(data) {
                        if (globalSearch) {
                            // We manually move the map and trigger the refreshes on the new viewport
                            if (data.bbox.length > 0) {
                                var oldBounds = $scope.map.getBounds();
                                $scope.map.fitBounds([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                                var newBounds = $scope.map.getBounds();

                                if (angular.equals(oldBounds, newBounds)) {
                                    // We need a refresh even though the map didn't move
                                    refreshRawGeo();
                                }

                            } else {
                                // We know we have no data, and we can't count on a viewport move to refresh it
                                refreshRawGeo();
                            }
                        } else {
                            if (data.count < DOWNLOAD_CAP || $scope.map.getZoom() === $scope.map.getMaxZoom()) {
                                // Low enough: always download
                                refreshRawGeo();
                            } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                                // We take our decision depending on the content of the envelope
                                if (data.geometries.Point && data.geometries.Point > data.count/2) {
                                    refreshClusteredGeo();
                                } else {
                                    refreshShapePreview();
                                }

                            } else {
                                // Cluster no matter what
                                refreshClusteredGeo();
                            }
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

                var unwatchSchema = $scope.$watch('context.dataset', function(newValue, oldValue) {
                    if (!newValue || !newValue.datasetid) return;

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
                            $scope.initMap(newValue, $scope.embedMode, ODSWidgetsConfig.basemaps, translate, ODSWidgetsConfig.mapGeobox, $scope.mapContext.basemap, $scope.staticMap, ODSWidgetsConfig.mapPrependAttribution);
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
                    createMarker = function(latLng) {
                        return new L.VectorMarker(latLng, {
                            color: $scope.markerColor,
                            icon: visualization.map_marker_picto || 'icon-circle',
                            marker: !visualization.map_marker_hidemarkershape
                        });
                    };

                    DebugLogger.log('map -> dataset watch -> refresh records');

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
                                    ODSAPI.records.boundingbox($scope.context, options).success(function(data) {
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
                                    DebugLogger.log('Location found');
                                    var center = locationParameterFunctions.getCenterFromLocationParameter($scope.mapContext.location);
                                    var zoom = locationParameterFunctions.getZoomFromLocationParameter($scope.mapContext.location);
                                    DebugLogger.log(center, zoom);
                                    nv.setView(center, zoom);

                                    deferred.resolve();
                                } else {
                                    DebugLogger.log('Use boundsRetrieval');
                                    boundsRetrieval($scope.context.dataset).then(function(bounds) {
                                        if ($scope.context.parameters.mapviewport) {
                                            DebugLogger.log('Deleted mapviewport');
                                            delete $scope.context.parameters.mapviewport;
                                        }

                                        // Fit to dataset boundingbox if there is no viewport or geofilter
                                        DebugLogger.log(bounds);
                                        nv.fitBounds(bounds);

                                        deferred.resolve();
                                    });
                                }

                                return deferred.promise;
                            };

                            setMapView().then(function() {
                                DebugLogger.log('First onViewportMove');
                                onViewportMove($scope.map);

                                refreshRecords(false);

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

    mod.directive('geoScroller', function() {
        // FIXME: remove the ugly div from the DL tag, once we migrate to Angular 1.2+
        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="odswidget-geo-scroller">' +
                    '<spinner ng-hide="records"></spinner>' +
                    '<h2 ng-show="records.length > 1" class="scroller-control ng-leaflet-tooltip-cloak">' +
                        '<i class="icon-chevron-left" ng-click="moveIndex(-1)"></i>' +
                        '<span ng-bind="(selectedIndex+1)+\'/\'+records.length" ng-click="moveIndex(1)"></span>' +
                        '<i class="icon-chevron-right" ng-click="moveIndex(1)"></i>' +
                    '</h2>' +
                    '<div class="ng-leaflet-tooltip-cloak limited-results" ng-show="records && records.length == RECORD_LIMIT" translate>(limited to the first {{RECORD_LIMIT}} records)</div>' +
                    '<div ng-if="template" ng-include src="template"></div>' +
                    '<div inject></div>' +
                '</div>',
            scope: {
                shape: '=',
                context: '=',
                recordid: '=',
                map: '=',
                template: '@'
            },
            replace: true,
            link: function(scope, element) {
                element.bind('popupclose', function() {
                    scope.$destroy();
                });
                scope.unCloak = function() {
                    jQuery('.ng-leaflet-tooltip-cloak', element).removeClass('ng-leaflet-tooltip-cloak');
                };
            },
            controller: ['$scope', '$filter', 'ODSAPI', function($scope, $filter, ODSAPI) {
                $scope.RECORD_LIMIT = 100;
                $scope.records = [];
                $scope.selectedIndex = 0;
                $scope.moveIndex = function(amount) {
                    var newIndex = ($scope.selectedIndex + amount) % $scope.records.length;
                    if (newIndex < 0) {
                        newIndex = $scope.records.length + newIndex;
                    }
                    $scope.selectedIndex = newIndex;
                };

                // Prepare the geofilter parameter
                var options = {
                    format: 'json',
                    rows: $scope.RECORD_LIMIT
                };
                if ($scope.recordid) {
                    options.q = "recordid:'"+$scope.recordid+"'";
                } else if (angular.isArray($scope.shape)) {
                    // 2D coordinates (lat, lng)
                    options["geofilter.distance"] = $scope.shape[0]+','+$scope.shape[1];
                } else if ($scope.shape.type === 'Point') {
                    options["geofilter.distance"] = $scope.shape.coordinates[1]+','+$scope.shape.coordinates[0];
                } else {
                    var polygon = $scope.shape.coordinates[0];
                    var polygonBounds = [];
                    for (var i=0; i<polygon.length; i++) {
                        var bound = angular.copy(polygon[i]);
                        if (bound.length > 2) {
                            // Discard the z
                            bound.splice(2, 1);
                        }
                        bound.reverse(); // GeoJSON has reverse coordinates from the rest of us
                        polygonBounds.push(bound.join(','));
                    }
                    var param = '('+polygonBounds.join('),(')+')';
                    options["geofilter.polygon"] = param;
                }
                var refresh = function() {
                    var queryOptions = {};
                    angular.extend(queryOptions, $scope.context.parameters, options);
                    ODSAPI.records.download($scope.context, queryOptions).success(function(data, status, headers, config) {
                        if (data.length > 0) {
                            $scope.selectedIndex = 0;
                            $scope.records = data;
                            $scope.unCloak();
                        } else {
                            $scope.map.closePopup();
                        }
                    });
                };
                $scope.$watch('searchOptions', function(nv, ov) {
                    refresh();
                });
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
            }]
        };
    });

}());