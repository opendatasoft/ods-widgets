(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingRaw', ['ODSAPI', 'MapLayerHelper', 'SVGInliner', 'PictoHelper', '$q', function (ODSAPI, MapLayerHelper, SVGInliner, PictoHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout) {
                var deferred = $q.defer();
                var markerLayerGroup = layerGroup;
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'rows': 1000,
                    'format': 'json',
                    'geo_simplify': true,
                    'geo_simplify_zoom': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });
                // Which fields holds the geometry?
                var shapeFields = layerConfig.context.dataset.getFieldsForType('geo_shape');
                var shapeField = shapeFields.length ? shapeFields[0].name : null;

                var includedFields = [];
                if (shapeField) {
                    includedFields.push(shapeField);
                } else {
                    // We need at least one field to retrieve the geometry object in the record. We know there will be
                    // at least one point field, and this one should be rather short (text fields could be more random).
                    includedFields.push(layerConfig.context.dataset.getFieldsForType('geo_point_2d')[0].name);
                }
                if (layerConfig.color.field) {
                    includedFields.push(layerConfig.color.field);
                }

                parameters.fields = includedFields.join(',');

                ODSAPI.records.download(layerConfig.context, parameters, timeout.promise).success(function (data) {
                    for (var i = 0; i < data.length; i++) {
                        var record = data[i];
                        var geoJSON;

                        if (shapeField) {
                            if (record.fields[shapeField]) {
                                geoJSON = record.fields[shapeField];
                                if (geoJSON.type === 'Point' && angular.isDefined(record.geometry)) {
                                    // Due to a problem with how we handle precisions, we query a point with a lower precision than
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

                        if (geoJSON.type === 'Point') {
                            MapLayerHelper.drawPoint(layerConfig, map, [geoJSON.coordinates[1], geoJSON.coordinates[0]], record, markerLayerGroup);
                        } else {
                            MapLayerHelper.drawShape(layerConfig, map, geoJSON, record, markerLayerGroup);
                        }

                    }
                    deferred.resolve(markerLayerGroup);
                });
                return deferred.promise;
            }
        };
    }]);
}());
