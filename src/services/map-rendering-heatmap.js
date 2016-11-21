(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingHeatmap', ['ODSAPI', 'MapLayerHelper', '$q', function (ODSAPI, MapLayerHelper, $q) {
        return {
            render: function (layerConfig, map, timeout) {
                var deferred = $q.defer();
                var heatmapLayer = L.TileLayer.heatMap({
                    zIndex: 10,
                    radius: {
                        absolute: false,
                        value: 20
                    },
                    opacity: 0.8,
                    gradient: {
                        0.45: "rgb(0,0,255)",
                        0.55: "rgb(0,255,255)",
                        0.65: "rgb(0,255,0)",
                        0.95: "yellow",
                        1.0: "rgb(255,0,0)"
                    }
                });
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'clustermode': 'heatmap',
                    'clusterdistance': 15,
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });

                if (layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) {
                    parameters['y.serie1.expr'] = layerConfig.expr;
                    parameters['y.serie1.func'] = layerConfig.func;
                }

                ODSAPI.records.geo(layerConfig.context, parameters, timeout.promise).success(function (data) {
                    // Display the clusters
                    var records = data.clusters;

                    heatmapLayer.options.radius.value = Math.min((1 / data.clusters.length) * 4000 + 20, 50);

                    var heatmapData = [];
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var clusterValue = MapLayerHelper.getClusterValue(record, layerConfig);
                        if (clusterValue !== null) {
                            heatmapData.push({
                                lat: record.cluster_center[0],
                                lon: record.cluster_center[1],
                                value: MapLayerHelper.getClusterValue(record, layerConfig) - MapLayerHelper.getClusterMin(data, layerConfig) + 1 // FIXME: the 1 should be proportional (and if the min is really 0 then it is false)
                            });
                        }
                    }
                    if (heatmapData.length > 0) {
                        heatmapLayer.setData(heatmapData);
                    }
                    deferred.resolve(heatmapLayer);
                });
                return deferred.promise;
            }
        };
    }]);
}());
