(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingClustered', ['ODSAPI', 'MapLayerHelper', 'SVGInliner', 'PictoHelper', '$q', function (ODSAPI, MapLayerHelper, SVGInliner, PictoHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout, showPolygons) {
                var deferred = $q.defer();
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'clusterdistance': 50,
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds()),
                    'return_polygons': showPolygons
                });

                if (layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) {
                    parameters['y.serie1.expr'] = layerConfig.expr;
                    parameters['y.serie1.func'] = layerConfig.func;
                }

                ODSAPI.records.geo(layerConfig.context, parameters, timeout.promise).then(function (response) {
                    if (!response || !response.data) {
                        // Cancelled requests
                        deferred.reject();
                        return;
                    }
                    var data = response.data;
                    // Display the clusters
                    var records = data.clusters;
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        if  (record.count === 1 && layerConfig.display !== 'polygonforced' && layerConfig.display !== 'clusters') {
                            MapLayerHelper.drawPoint(layerConfig, map, record.cluster_center, record, layerGroup);
                            //layerGroup.addLayer(new L.Marker(record.cluster_center)); // Uncomment to debug pointer alignment
                        } else {
                            var clusterValue = MapLayerHelper.getClusterValue(record, layerConfig);
                            if (clusterValue !== null) {
                                var clusterMarker = new L.ClusterMarker(record.cluster_center, {
                                    geojson: record.cluster,
                                    value: MapLayerHelper.getClusterValue(record, layerConfig),
                                    min: MapLayerHelper.getClusterMin(data, layerConfig),
                                    max: MapLayerHelper.getClusterMax(data, layerConfig),
                                    color: MapLayerHelper.getClusterColor(record, layerConfig),
                                    opacity: layerConfig.pointOpacity,
                                    numberFormattingFunction: MapLayerHelper.formatNumber,
                                    minSize: layerConfig.minSize,
                                    maxSize: layerConfig.maxSize,
                                    borderOpacity: layerConfig.borderOpacity,
                                    borderSize: layerConfig.borderSize,
                                    borderColor: layerConfig.borderColor,
                                    sizeFunction: layerConfig.sizeFunction
                                });
                                MapLayerHelper.bindZoomable(map, clusterMarker, layerConfig);
                                layerGroup.addLayer(clusterMarker);
                            }
                        }
                    }
                    deferred.resolve(layerGroup);
                }, function () {});
                return deferred.promise;
            }
        };
    }]);
}());
