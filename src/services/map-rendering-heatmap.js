(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingHeatmap', ['ODSAPI', 'MapLayerHelper', '$q', function (ODSAPI, MapLayerHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout) {
                var deferred = $q.defer();
                var heatmapOptions = {};
                if (angular.isObject(layerConfig.color) && layerConfig.color.type === 'gradient' && layerConfig.color.steps) {
                    heatmapOptions.gradient = layerConfig.color.steps;
                }
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

                ODSAPI.records.geo(layerConfig.context, parameters, timeout.promise).then(function (response) {
                    if (!response || !response.data) {
                        // Cancelled requests
                        deferred.reject();
                        return;
                    }

                    var data = response.data;
                    // Display the clusters
                    var records = data.clusters;

                    //heatmapLayer.options.radius.value = Math.min((1 / data.clusters.length) * 4000 + 20, 50);

                    heatmapOptions.radius = Math.min((1 / data.clusters.length) * (4000 * (layerConfig.radius / 4)) + 20, 50);

                    var min = MapLayerHelper.getClusterMin(data, layerConfig);
                    var max = MapLayerHelper.getClusterMax(data, layerConfig);

                    layerConfig._bounds = [min, max];

                    var heatmapData = [];
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var clusterValue = MapLayerHelper.getClusterValue(record, layerConfig);
                        if (clusterValue !== null) {
                            var ratio = ODS.CalculationUtils.getValueOnScale(clusterValue, min, max, layerConfig.sizeFunction);

                            heatmapData.push([
                                record.cluster_center[0],
                                record.cluster_center[1],
                                ratio
                            ]);
                        }
                    }
                    var heatmapLayer = null;
                    if (heatmapData.length > 0) {
                        heatmapLayer = L.heatLayer(heatmapData, heatmapOptions);
                        layerGroup.addLayer(heatmapLayer);
                    }
                    deferred.resolve(heatmapLayer);
                });
                return deferred.promise;
            }
        };
    }]);
}());
