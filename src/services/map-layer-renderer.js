(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapLayerRenderer', [
        'ODSAPI', 'AggregationHelper', 'SVGInliner', 'PictoHelper', 'MapLayerHelper',
        'MapRenderingAggregation', 'MapRenderingClustered', 'MapRenderingHeatmap', 'MapRenderingRaw', 'MapRenderingShapePreview',
        '$q', '$filter', '$rootScope', '$compile', '$timeout',
        function(ODSAPI, AggregationHelper, SVGInliner, PictoHelper, MapLayerHelper,
                 MapRenderingAggregation, MapRenderingClustered, MapRenderingHeatmap, MapRenderingRaw, MapRenderingShapePreview,
                 $q, $filter, $rootScope, $compile, $timeout) {
        // TODO: Query interruption when moving
        return {
            updateDataLayer: function (layerConfig, map) {
                var service = this;
                var previousRenderedLayer = layerConfig._rendered;

                // Depending on the rendering mode, we either replace the previous layer with a new one, or we update
                // the existing one (tiles).

                // Available modes:
                // none: downloading all points
                // polygon, polygonforced: circles clustering
                // heatmap
                // aggregation (former "shape") - local and remote

                if (layerConfig._currentRequestTimeout) {
                    layerConfig._currentRequestTimeout.resolve();
                }
                var timeout = $q.defer();
                layerConfig._currentRequestTimeout = timeout;
                var deferred = $q.defer();

                var applyLayer = function (newLayer) {
                    service.swapLayers(map, previousRenderedLayer, newLayer);
                    layerConfig._rendered = newLayer;
                    layerConfig._currentRequestTimeout = null;
                    layerConfig._loading = false;
                    deferred.resolve();
                };

                if (layerConfig.display === 'tiles') {
                    // TODO
                    // If the bundlelayer already exists in layerConfig.layer, then setUrl to it.
                    if (!layerConfig._rendered) {
                        layerConfig._rendered = new L.BundleTileLayer('', {
                            tileSize: 512,
                            minZoom: map.getMinZoom(),
                            maxZoom: map.getMaxZoom(),
                            gridLayer: {
                                options: {
                                    resolution: 4
                                }
                            }
                        });
                        map.addLayer(layerConfig._rendered);

                        $timeout(function () {
                            // We have to bootstrap them outside of the angular cycle, otherwise it will directly trigger
                            // the first time and make a "digest already in progress"
                            layerConfig._rendered.on('loading', function () {
                                layerConfig._loading = true;
                                $rootScope.$apply();
                            });
                            layerConfig._rendered.on('load', function () {
                                layerConfig._loading = false;
                                $rootScope.$apply();
                            });
                        }, 0);

                        MapLayerHelper.bindTooltip(map, layerConfig._rendered, layerConfig);
                    }
                    var tilesOptions = {
                        color: layerConfig.color,
                        icon: layerConfig.picto,
                        showmarker: layerConfig.marker
                    };
                    angular.extend(tilesOptions, layerConfig.context.parameters);
                    // Change tile URL
                    var url = '/api/datasets/1.0/' + layerConfig.context.dataset.datasetid + '/tiles/simple/{z}/{x}/{y}.bundle';
                    //var url = '/api/tiles/icons/{z}/{x}/{y}.bundle';
                    var params = '';
                    angular.forEach(tilesOptions, function (value, key) {
                        if (value !== null) {
                            params += params ? '&' : '?';
                            params += key + '=' + encodeURIComponent(value);
                        }
                    });
                    url += params;
                    if (layerConfig._rendered._url !== url) {
                        layerConfig._rendered.setUrl(url);
                    }
                    // FIXME: Bind to load/unload to not resolve until all is loaded
                    deferred.resolve();
                } else if (layerConfig.display === 'none' || map.getZoom() === map.getMaxZoom() && layerConfig.display === 'polygon') {
                    layerConfig._loading = true;
                    MapRenderingRaw.render(layerConfig, map, timeout).then(applyLayer);
                } else if (['polygon', 'polygonforced', 'clusters'].indexOf(layerConfig.display) >= 0) {
                    layerConfig._loading = true;
                    MapRenderingClustered.render(layerConfig, map, timeout, true).then(applyLayer);
                } else if (layerConfig.display === 'heatmap') {
                    layerConfig._loading = true;
                    MapRenderingHeatmap.render(layerConfig, map, timeout).then(applyLayer);
                } else if (layerConfig.display === 'shape' || layerConfig.display === 'aggregation') { // 'shape' is legacy
                    layerConfig._loading = true;
                    MapRenderingAggregation.render(layerConfig, map, timeout).then(applyLayer);
                } else if (layerConfig.display === 'categories') {
                    layerConfig._loading = true;
                    MapRenderingRaw.render(layerConfig, map, timeout).then(applyLayer);
                } else if (layerConfig.display === 'auto') {
                    layerConfig._loading = true;
                    // Auto-decide what to do depending on the number of items
                    var parameters = angular.extend({}, layerConfig.context.parameters, {
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                    });
                    ODSAPI.records.boundingbox(layerConfig.context, parameters).success(function (data) {
                        /*
                         0 < x < DOWNLOAD_CAP : Download all points
                         DOWWNLOAD_CAP < x < [SHAPEPREVIEW/POLYGONCLUSTERS]_HIGHCAP: call geopreview/geopolygon
                         */
                        // TODO: Use geopreview when low cap?
                        var DOWNLOAD_CAP = 200;
                        var SHAPEPREVIEW_HIGHCAP = 500000;
                        // The number of points where we stop asking for the polygon representing the cluster's content
                        var POLYGONCLUSTERS_HIGHCAP = 500000;

                        var returnPolygons = (data.count < POLYGONCLUSTERS_HIGHCAP);

                        if (data.geometries && data.geometries.Point && data.geometries.Point > data.count / 2 && (data.count < DOWNLOAD_CAP || map.getZoom() === map.getMaxZoom())) {
                            // Low enough and mostly points: always download
                            MapRenderingRaw.render(layerConfig, map, timeout).then(applyLayer);
                        } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                            // We take our decision depending on the content of the envelope
                            if (data.geometries && data.geometries.Point && data.geometries.Point > data.count / 2) {
                                // Geo polygons
                                MapRenderingClustered.render(layerConfig, map, timeout, returnPolygons).then(applyLayer);
                            } else {
                                // Geo preview
                                MapRenderingShapePreview.render(layerConfig, map, timeout).then(applyLayer);
                            }
                        } else {
                            // Clusters
                            MapRenderingClustered.render(layerConfig, map, timeout, returnPolygons).then(applyLayer);
                        }
                    });
                } else {
                    console.log('ERROR: Unknown display mode "' + layerConfig.display + '"');
                }
                return deferred.promise;
            },
            swapLayers: function (map, oldLayer, newLayer) {
                if (oldLayer) {
                    map.removeLayer(oldLayer);
                }
                map.addLayer(newLayer);
            }
        };
    }]);
}());