(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingShapePreview', ['ODSAPI', 'MapLayerHelper', '$q', function (ODSAPI, MapLayerHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout) {
                var deferred = $q.defer();
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'rows': 1000,
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });
                ODSAPI.records.geopreview(layerConfig.context, parameters, timeout.promise).success(function (data) {
                    var shape;
                    for (var i = 0; i < data.length; i++) {
                        shape = data[i];
                        if (shape.geometry.type === 'Point') {
                            MapLayerHelper.drawPoint(layerConfig, map, [shape.geometry.coordinates[1], shape.geometry.coordinates[0]], null, layerGroup, shape.geo_digest);
                        } else {
                            MapLayerHelper.drawShape(layerConfig, map, shape.geometry, null, layerGroup, shape.geo_digest);
                        }
                    }
                    deferred.resolve(layerGroup);
                });
                return deferred.promise;
            }
        };
    }]);
}());
