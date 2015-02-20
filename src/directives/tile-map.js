(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTileMap', ['ModuleLazyLoader', function (ModuleLazyLoader) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                embedMode: '@', // FIXME: This concept is not useful, we could remove it and use the more explicit settings to achieve the same effects
                autoResize: '@',
                mapContext: '=?',
                location: '@',
                basemap: '@',
                isStatic: '@'
            },
            template: function(tElement) {
                tElement.contents().wrapAll('<div>');
                if (tElement.contents().length > 0 && tElement.contents().html().trim().length > 0) {
                    tElement.contents().wrapAll('<div>');
                    tElement.data('tooltip-template', tElement.children().html());
                }
                return '<div class="odswidget odswidget-map">' +
                '<div class="map"></div>' +
                '<div class="overlay map opaque-overlay" ng-show="pendingRequests.length && initialLoading"><spinner class="spinner"></spinner></div>' +
                '<div class="loading-tiles" ng-show="loadingTiles"><i class="icon-spinner icon-spin"></i></div>' +
                '</div>';
            },
            link: function (scope, element, attrs) {
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
                            map.addControl(new L.Control.Fullscreen());
                        }
                        if (!staticMap) {
                            map.addControl(new L.Control.Locate({maxZoom: 18}));
                        }

                        // Drawing
                        scope.drawnItems = new L.FeatureGroup();
                        map.addLayer(scope.drawnItems);
                        var drawControl = new L.Control.Draw({
                            edit: {
                                featureGroup: scope.drawnItems
                            },
                            draw: {
                                polyline: false,
                                marker: false
                            }
                        });
                        map.addControl(drawControl);
                        scope.map = map;

                        map.on('popupclose', function(e) {
                            // Propagating the event to the geoScroller
                            jQuery(e.popup.getContent()).trigger('popupclose');
                        });
                    };
                });
            },
            controller: ['$scope', '$q', '$compile', '$element', 'ODSAPI', 'ODSWidgetsConfig', 'translate', 'DebugLogger', 'odsErrorService', function ($scope, $q, $compile, $element, ODSAPI, ODSWidgetsConfig, translate, DebugLogger, odsErrorService) {
                $scope.initialLoading = true;
                var locationParameterFunctions = {
                    delimiter: ',',
                    accuracy: 5,
                    formatLatLng: function(latLng) {
                        var lat = L.Util.formatNum(latLng.lat, this.accuracy);
                        var lng = L.Util.formatNum(latLng.lng, this.accuracy);
                        return new L.LatLng(lat, lng);
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
                        return new L.LatLng(a[1], a[2]);
                    },
                    getZoomFromLocationParameter: function(location) {
                        return this.getLocationParameterAsArray(location)[0];
                    }
                };

                $scope.$watch('context.parameters', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;
                    if ($scope.initialLoading) return;

                    refreshRecords(true);

                }, true);

                var refreshRecords = function(fitView) {
                    var refresh = function() {
                        var tilesOptions = {
                            color: $scope.context.dataset.getExtraMeta('visualization', 'map_marker_color'),
                            icon: $scope.context.dataset.getExtraMeta('visualization', 'map_marker_picto'),
                            showmarker: !$scope.context.dataset.getExtraMeta('visualization', 'map_marker_hidemarkershape')
                        };
                        angular.extend(tilesOptions, $scope.context.parameters);
                        // Change tile URL
                        var url = '/api/datasets/1.0/' + $scope.context.dataset.datasetid + '/tiles/simple/{z}/{x}/{y}.bundle';
                        //var url = '/api/tiles/icons/{z}/{x}/{y}.bundle';
                        var params = '';
                        angular.forEach(tilesOptions, function(value, key) {
                            if (value != null) {
                                params += params ? '&' : '?';
                                params += key + '=' + encodeURIComponent(value);
                            }
                        });
                        url += params;
                        if ($scope.bundleLayer._url !== url) {
                            $scope.bundleLayer.setUrl(url);
                        }
                    };

                    if (fitView) {
                        // Move the viewport to the new location, and change the tile
                        var options = {};
                        jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                        ODSAPI.records.boundingbox($scope.context, options).success(function(data) {
                            if (data.bbox.length > 0) {
                                $scope.map.fitBounds([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                            }
                            refresh();
                        });
                    } else {
                        refresh();
                    }

                };

                var onViewportMove = function(map) {
                    var size = map.getSize();
                    if (size.x > 0 && size.y > 0) {
                        // Don't attempt to do anything if the map is not displayed... we can't capture useful bounds
                        $scope.mapContext.location = locationParameterFunctions.getLocationParameterFromMap(map);
                    }
                };

                var unwatchSchema = $scope.$watch('context.dataset', function(newValue, oldValue) {
                    if (!newValue || !newValue.datasetid) return;

                    if ($scope.context.dataset.hasFieldType('geo_shape')) {
                        // Get the first shape field of the dataset
                        angular.forEach($scope.context.dataset.fields, function(field) {
                            if (angular.isUndefined($scope.shapeField) && field.type === 'geo_shape') {
                                $scope.shapeField = field.name;
                            }
                        });
                    } else {
                        $scope.shapeField = null;
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
                        dataset: $scope.context.dataset.datasetid
                    };

                    var mapInitWatcher = $scope.$watch('map', function(nv, ov){
                        if (nv) {
                            $scope.bundleLayer = new L.BundleTileLayer('', {
                                tileSize: 512,
                                minZoom: nv.getMinZoom(),
                                maxZoom: nv.getMaxZoom(),
                                gridLayer: {
                                    options: {
                                        resolution: 4
                                    },
                                    events: {
                                        click: function(e) {
                                            if ($scope.drawing) {
                                                // User is currently drawing a shape
                                                return;
                                            }
                                            if (e.data) {
                                                console.log(e.data);

                                                var newScope = $scope.$new(false);

                                                var popupOptions = {
                                                    offset: [0, -10],
                                                    maxWidth: 250,
                                                    minWidth: 250
                                                };

                                                // If there is a template passed as HTML inside the directive HTML tag,
                                                // then we use it. Else, if there is a template within the dataset's metadata,
                                                // we use it. Else, we let geoscroller use its default one.
                                                var html = $element.data('tooltip-template');
                                                if (angular.isUndefined(html) || !angular.isString(html) || html.trim() === '') {
                                                    if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_html) {
                                                        html = $scope.context.dataset.extra_metas.visualization.map_tooltip_html;
                                                    } else {
                                                        html = '';
                                                    }
                                                }
                                                newScope.template = html;
                                                newScope.map = $scope.map;
                                                newScope.gridData = e.data;

                                                var popup = new L.Popup(popupOptions).setLatLng(e.latlng)
                                                    .setContent($compile('<geo-scroller context="context" grid-data="gridData" template="{{template}}" map="map" shape-field="'+($scope.shapeField||'')+'"></geo-scroller>')(newScope)[0]);
                                                popup.openOn($scope.map);
                                            }
                                        }
                                    }
                                }
                            });
                            $scope.bundleLayer.on('loading', function() {
                                $scope.$evalAsync('loadingTiles = true');
                            });
                            $scope.bundleLayer.on('load', function() {
                                $scope.$evalAsync('loadingTiles = false');
                            });
                            $scope.bundleLayer.on('tileerror', function() {
                                odsErrorService.sendErrorNotification({'error': 'Error while loading the map view.'});
                            })
                            $scope.map.addLayer($scope.bundleLayer);
                            var boundsRetrieval = function() {
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

                                    refreshRecords(false);

                                    deferred.resolve();
                                } else {
                                    DebugLogger.log('Use boundsRetrieval');
                                    boundsRetrieval().then(function(bounds) {
                                        if ($scope.context.parameters.mapviewport) {
                                            DebugLogger.log('Deleted mapviewport');
                                            delete $scope.context.parameters.mapviewport;
                                        }

                                        // Fit to dataset boundingbox if there is no viewport or geofilter
                                        DebugLogger.log(bounds);
                                        nv.fitBounds(bounds);

                                        refreshRecords(false);

                                        deferred.resolve();
                                    });
                                }

                                return deferred.promise;
                            };

                            setMapView().then(function() {
                                $scope.initialLoading = false;
                                DebugLogger.log('First onViewportMove');
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
                                    // The bundle layer zooms have to be the same as the basemap, else it will drive the map
                                    // to be zoomable beyond the basemap levels
                                    $scope.bundleLayer.setMinZoom(e.layer.options.minZoom);
                                    $scope.bundleLayer.setMaxZoom(e.layer.options.maxZoom);
                                    if(!$scope.$$phase && !$scope.$root.$$phase) {
                                        // Don't trigger a digest if it is already running (for example if a fitBounds is
                                        // triggered from within a apply)
                                        $scope.$apply();
                                    }
                                });
                            }

                            // Drawing

                            var geofilterFromDrawnLayer = function(layer, type) {
                                if (type === 'circle') {
                                    var distance = layer.getRadius();
                                    var center = layer.getLatLng();
                                    $scope.context.parameters['geofilter.distance'] = center.lat+','+center.lng+','+distance;
                                     delete $scope.context.parameters['geofilter.polygon'];
                                } else {
                                    // Compute the polygon
                                    var geoJson = layer.toGeoJSON();
                                    var path = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(geoJson.geometry);
                                    $scope.context.parameters['geofilter.polygon'] = path;
                                    delete $scope.context.parameters['geofilter.distance'];
                                }
                            };

                            var getDrawnLayerType = function(layer) {
                                if (angular.isDefined(layer.getRadius)) {
                                    return 'circle';
                                } else {
                                    return 'polygon';
                                }
                            };

                            var setLayerInteractive = function(layer) {
                                layer._path.setAttribute('style','cursor: pointer; pointer-events: auto;');
                            };
                            var setLayerNonInteractive = function(layer) {
                                layer._path.setAttribute('style','cursor: auto; pointer-events: none;');
                            };

                            $scope.map.on('draw:drawstart draw:editstart', function() {
                                $scope.drawing = true;
                                $scope.$apply();
                            });
                            $scope.map.on('draw:drawstop draw:editstop', function() {
                                $scope.drawing = false;
                                $scope.$apply();
                            });

                            $scope.map.on('draw:created', function (e) {
                                var layer = e.layer;
                                if ($scope.drawnItems.getLayers().length > 0) {
                                    $scope.drawnItems.removeLayer($scope.drawnItems.getLayers()[0]);
                                }
                                $scope.drawnItems.addLayer(layer);

                                // Apply to parameters
                                geofilterFromDrawnLayer(layer, e.layerType);

                                $scope.$apply();
                            });

                            $scope.map.on('draw:deleted', function(e) {
                                delete $scope.context.parameters['geofilter.distance'];
                                delete $scope.context.parameters['geofilter.polygon'];
                                $scope.$apply();
                            });

                            $scope.map.on('draw:edited', function(e) {
                                var layer = e.layers.getLayers()[0];
                                var type = getDrawnLayerType(layer);

                                geofilterFromDrawnLayer(layer, type);
                                $scope.$apply();
                            });

                            $scope.map.on('draw:deletestart', function() {
                                setLayerInteractive($scope.drawnItems.getLayers()[0]);
                            });

                            $scope.map.on('draw:deleteend', function() {
                                setLayerNonInteractive($scope.drawnItems.getLayers()[0]);
                            });

                            var drawableStyle = {
                                color: '#2ca25f',
                                fillOpacity: 0.2,
                                opacity: 0.8,
                                clickable: true
                            };

                            $scope.$watch('[context.parameters["geofilter.polygon"], context.parameters["geofilter.distance"]]', function(nv, ov) {
                                var polygon = nv[0],
                                    distance = nv[1];

                                // Wipe the current drawn polygon
                                if ($scope.drawnItems.getLayers().length > 0) {
                                    $scope.drawnItems.removeLayer($scope.drawnItems.getLayers()[0]);
                                }

                                // Draw
                                var drawn;
                                if (polygon) {
                                    // FIXME: maybe a cleaner way than using GeoJSON, but it felt weird adding a method
                                    // just to output a Leaflet-compatible arbitrary format. Still, we should do it.
                                    var geojson = ODS.GeoFilter.getPolygonParameterAsGeoJSON(polygon);
                                    var coordinates = geojson.coordinates[0];
                                    coordinates.splice(geojson.coordinates[0].length-1, 1);
                                    var i, coords, swap;
                                    for (i=0; i<coordinates.length; i++) {
                                        coords = coordinates[i];
                                        swap = coords[0];
                                        coords[0] = coords[1];
                                        coords[1] = swap;
                                    }
                                    if (coordinates.length === 4 &&
                                        coordinates[0][0] === coordinates[3][0] &&
                                        coordinates[1][0] === coordinates[2][0] &&
                                        coordinates[0][1] === coordinates[1][1] &&
                                        coordinates[2][1] === coordinates[3][1]) {
                                        drawn = new L.Rectangle(coordinates, drawableStyle);
                                    } else {
                                        drawn = new L.Polygon(coordinates, drawableStyle);
                                    }
                                    //drawn = new L.GeoJSON(geojson);
                                } else if (distance) {
                                    var parts = distance.split(',');
                                    var lat = parts[0],
                                        lng = parts[1],
                                        radius = parts[2];
                                    drawn = new L.Circle([lat, lng], radius, drawableStyle);
                                }

                                if (drawn) {
                                    $scope.drawnItems.addLayer(drawn);
                                    setLayerNonInteractive($scope.drawnItems.getLayers()[0]);
                                }
                            }, true);

                            mapInitWatcher();
                        }
                    });

                }, true);

            }]
        };
    }]);
}());