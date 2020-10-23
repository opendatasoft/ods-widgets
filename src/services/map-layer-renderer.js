(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapLayerRenderer', [
        'ODSAPI', 'AggregationHelper', 'SVGInliner', 'PictoHelper', 'MapLayerHelper',
        'MapRenderingAggregation', 'MapRenderingClustered', 'MapRenderingHeatmap', 'MapRenderingRaw', 'MapRenderingShapePreview', 'MapRenderingChoroplethAggregation',
        '$q', '$filter', '$rootScope', '$compile', '$timeout',
        function(ODSAPI, AggregationHelper, SVGInliner, PictoHelper, MapLayerHelper,
                 MapRenderingAggregation, MapRenderingClustered, MapRenderingHeatmap, MapRenderingRaw, MapRenderingShapePreview, MapRenderingChoroplethAggregation,
                 $q, $filter, $rootScope, $compile, $timeout) {
        // TODO: Query interruption when moving
        return {
            updateDataLayer: function (layerConfig, map, deferred) {
                var service = this;
                var leafletLayerGroup = new L.LayerGroup();

                // We replace the previous layer with a new one

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
                layerConfig._incomplete = false;

                var applyLayer = function (newLayer) {
                    layerConfig._rendered = newLayer;
                    layerConfig._currentRequestTimeout = null;
                    layerConfig._loading = false;
                    deferred.resolve();
                };

                // Nothing to do in that situation
                var cancelledRequest = function() {};

                if (layerConfig.context.error) {
                    console.log('ERROR: Unknown dataset "' + layerConfig.title + '"');
                } else if (layerConfig.display === 'none' || map.getZoom() === map.getMaxZoom() && layerConfig.display === 'polygon') {
                    layerConfig._loading = true;
                    MapRenderingRaw.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                } else if (['polygon', 'polygonforced', 'clusters'].indexOf(layerConfig.display) >= 0) {
                    layerConfig._loading = true;
                    MapRenderingClustered.render(layerConfig, map, leafletLayerGroup, timeout, true).then(applyLayer, cancelledRequest);
                } else if (layerConfig.display === 'heatmap') {
                    layerConfig._loading = true;
                    MapRenderingHeatmap.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                } else if (layerConfig.display === 'shape' || layerConfig.display === 'aggregation') { // 'shape' is legacy
                    layerConfig._loading = true;
                    MapRenderingAggregation.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                } else if (layerConfig.display === 'categories') {
                    layerConfig._loading = true;
                    MapRenderingRaw.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                } else if (layerConfig.display === 'choropleth') {
                    // TODO: Handle depending if aggregation or not
                    layerConfig._loading = true;
                    if (layerConfig.func) {
                        MapRenderingChoroplethAggregation.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                    } else {
                        MapRenderingRaw.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                    }
                } else if (layerConfig.display === 'auto') {
                    layerConfig._loading = true;
                    // Auto-decide what to do depending on the number of items
                    var parameters = angular.extend({}, layerConfig.context.parameters, {
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                    });
                    ODSAPI.records.boundingbox(layerConfig.context, parameters).then(function (response) {
                        var data = response.data;
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
                            MapRenderingRaw.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                        } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                            // We take our decision depending on the content of the envelope
                            if (data.geometries && data.geometries.Point && data.geometries.Point > data.count / 2) {
                                // Geo polygons
                                MapRenderingClustered.render(layerConfig, map, leafletLayerGroup, timeout, returnPolygons).then(applyLayer, cancelledRequest);
                            } else {
                                // Geo preview
                                MapRenderingShapePreview.render(layerConfig, map, leafletLayerGroup, timeout).then(applyLayer, cancelledRequest);
                            }
                        } else {
                            // Clusters
                            MapRenderingClustered.render(layerConfig, map, leafletLayerGroup, timeout, returnPolygons).then(applyLayer, cancelledRequest);
                        }
                    });
                } else {
                    console.log('ERROR: Unknown display mode "' + layerConfig.display + '"');
                }
                return leafletLayerGroup;
            }
        };
    }]);
}());
