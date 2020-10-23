(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingChoroplethAggregation', ['ODSAPI', 'MapLayerHelper', 'AggregationHelper', '$q', function (ODSAPI, MapLayerHelper, AggregationHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout) {
                var deferred = $q.defer();
                var shapeLayerGroup = layerGroup;

                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });

                if (layerConfig.geoField) {
                    parameters['geo_field'] = layerConfig.geoField;
                }

                if (layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) {
                    parameters['y.serie1.expr'] = layerConfig.expr;
                    parameters['y.serie1.func'] = layerConfig.func;
                }

                ODSAPI.records.geopolygon(layerConfig.context, parameters, timeout.promise).then(handleResult);

                function handleResult(response) {
                    if (!response || !response.data) {
                        // Cancelled requests
                        deferred.reject();
                        return;
                    }

                    var rawResult = response.data;
                    var records = rawResult.clusters;

                    // var min = MapLayerHelper.getClusterMin(rawResult, layerConfig);
                    // var max = MapLayerHelper.getClusterMax(rawResult, layerConfig);
                    // var values = MapLayerHelper.getClusterValues(rawResult, layerConfig);

                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var value = MapLayerHelper.getClusterValue(record, layerConfig);
                        var shape = record.cluster;
                        if (shape.type === 'Point') {
                            MapLayerHelper.drawPoint(layerConfig, map, [shape.coordinates[1], shape.coordinates[0]], value, shapeLayerGroup, record.geo_digest);
                        } else {
                            MapLayerHelper.drawShape(layerConfig, map, shape, value, shapeLayerGroup, record.geo_digest);
                        }
                    }
                    deferred.resolve(shapeLayerGroup);
                }

                return deferred.promise;
            }
        };
    }]);
}());
