(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('MapRenderingAggregation', ['ODSAPI', 'MapLayerHelper', 'AggregationHelper', '$q', function (ODSAPI, MapLayerHelper, AggregationHelper, $q) {
        return {
            render: function (layerConfig, map, layerGroup, timeout) {
                var deferred = $q.defer();
                var shapeLayerGroup = layerGroup;

                // Either we self-join, or we join on a remote dataset
                // Remote requires:
                // - a remote dataset
                // - a local key, and optionally a remote key (else, assumes the remote is the local)
                var getShape, getItems, parameters;
                if (layerConfig.joinContext) {
                    // Remote!
                    var localKey = layerConfig.localKey;
                    var remoteKey = layerConfig.remoteKey;

                    if (!localKey || !remoteKey) {
                        console.error('An aggregation layer with a remote dataset requires a local-key and a remote-key');
                    }

                    var shapefields = layerConfig.joinContext.dataset.getFieldsForType('geo_shape');
                    if (!shapefields.length) {
                        console.error('You can only join an aggregation layer with a dataset that contains a geo_shape field.');
                    }
                    var shapefield = shapefields[0].name;
                    getShape = function (item) {
                        if (angular.isArray(item.x) && item.x[0].fields) {
                            return item.x[0].fields[shapefield];
                        } else {
                            return null;
                        }
                    };
                    getItems = function (rawResult) {
                        return rawResult.results;
                    };
                    var joinedFields = shapefield;
                    if (layerConfig.hoverField) {
                        joinedFields += ',' + layerConfig.hoverField;
                    }
                    parameters = angular.extend({}, layerConfig.context.parameters, {
                        'clusterprecision': map.getZoom(),
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds()),
                        'join.agg1.fields': joinedFields,
                        'join.agg1.remotedataset': layerConfig.joinContext.dataset.datasetid,
                        'join.agg1.remotekey': remoteKey,
                        'join.agg1.localkey': localKey,
                        'agg.agg1.func': 'MIN,MAX',
                        'agg.agg1.expr': 'serie1',
                        'y.serie1.expr': layerConfig.expr,
                        'y.serie1.func': layerConfig.func
                    });

                    ODSAPI.records.analyze(layerConfig.context, parameters, timeout.promise).success(handleResult);

                } else {
                    // Local
                    getShape = function (item) {
                        return item.cluster;
                    };
                    getItems = function (rawResult) {
                        return rawResult.clusters;
                    };

                    parameters = angular.extend({}, layerConfig.context.parameters, {
                        'clusterprecision': map.getZoom(),
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                    });

                    if (layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) {
                        parameters['y.serie1.expr'] = layerConfig.expr;
                        parameters['y.serie1.func'] = layerConfig.func;
                    }

                    ODSAPI.records.geopolygon(layerConfig.context, parameters, timeout.promise).success(handleResult);
                }

                function handleResult(rawResult) {
                    var records = getItems(rawResult);
                    if (records.length === 0) {
                        deferred.resolve(shapeLayerGroup);
                        return;
                    }
                    var min = MapLayerHelper.getClusterMin(rawResult, layerConfig);
                    var max = MapLayerHelper.getClusterMax(rawResult, layerConfig);
                    var values = MapLayerHelper.getClusterValues(rawResult, layerConfig);

                    var colorScale = function (value) {
                        return MapLayerHelper.getColor(value, layerConfig, min, max, values.length);
                    };

                    var geojsonOptions = {
                        radius: 3,
                        color: "#fff",
                        weight: 1,
                        opacity: 0.9,
                        fillOpacity: 0.5
                    };

                    // Legend is only supported for "scale" colors (we may implement it for "range" as well later)
                    if (!(angular.isObject(layerConfig.color) && layerConfig.color.type === 'range') && ((layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) || min !== max)) {
                        L.Legend = L.Control.extend({
                            initialize: function (options) {
                                L.Control.prototype.initialize.call(this, options);
                            },
                            onAdd: function (map) {
                                var grades = chroma.scale().domain([min, max], Math.min(10, values.length), layerConfig.colorFunction).domain(),
                                    htmlContent = '';

                                var legendDiv = L.DomUtil.create('div', 'odswidget-map__legend');
                                var datasetTitle = layerConfig.context.dataset.datasetid;
                                var fieldName = layerConfig.expr;
                                //if ($scope.datasetSchemas && $scope.datasetSchemas[datasetConfig.datasetid]) {
                                if (fieldName) {
                                    fieldName = layerConfig.context.dataset.getFieldLabel(layerConfig.expr);
                                }
                                datasetTitle = layerConfig.context.dataset.metas.title;
                                //}
                                htmlContent += '<div class="odswidget-map__legend-title">' + datasetTitle + '<br/>' + AggregationHelper.getFunctionLabel(layerConfig.func);
                                if (layerConfig.func !== 'COUNT') {
                                    htmlContent += ' ' + fieldName;
                                }
                                htmlContent += '</div>';
                                htmlContent += '<div class="odswidget-map__legend-colors">';
                                if (values.length === 1) {
                                    htmlContent += '<i class="color_0" style="width: 90%; background-color:' + colorScale((grades[0] + grades[1]) / 2) + '; opacity: 1;"></i>';
                                    htmlContent += '</div><div class="odswidget-map__legend-counts">';
                                    htmlContent += '<span class="odswidget-map__legend-value">';
                                    htmlContent += MapLayerHelper.formatNumber(grades[0]);
                                    htmlContent += '</span>';
                                } else {
                                    var widthPercent = 90 / (grades.length - 1);
                                    // loop through our density intervals and generate a label with a colored square for each interval
                                    for (var i = 0; i < grades.length - 1; i++) {
                                        htmlContent += '<i class="odswidget-map__legend-color" style="width:' + widthPercent + '%; background-color:' + colorScale((grades[i] + grades[i + 1]) / 2) + '; opacity: 1;"></i>';
                                    }
                                    htmlContent += '</div><div>';
                                    htmlContent += '<span class="odswidget-map__legend-value">';
                                    htmlContent += MapLayerHelper.formatNumber(grades[0]);
                                    htmlContent += '</span>';
                                    htmlContent += '<span class="odswidget-map__legend-value">';
                                    htmlContent += MapLayerHelper.formatNumber(grades[grades.length - 1]);
                                    htmlContent += '</span>';
                                }
                                htmlContent += '</div>';

                                legendDiv.innerHTML = htmlContent;
                                return legendDiv;
                            }
                        });
                        var legend = new L.Legend({position: 'bottomleft'});
                        var addLegend = function (e) {
                            if (e.layer === shapeLayerGroup) {
                                map.addControl(legend);
                                map.off('layeradd', addLegend);
                            }
                        };
                        map.on('layeradd', addLegend);
                        var removeLegend = function (e) {
                            if (e.layer === shapeLayerGroup) {
                                map.removeControl(legend);
                                map.off('layerremove', removeLegend);
                            }
                        };
                        map.on('layerremove', removeLegend);
                    }

                    var bindMarkerOver = function (layerConfig, marker, record, recordid) {
                        marker.on('mouseover', function (e) {
                            var layer = e.target;
                            layer.setStyle({
                                weight: 2
                            });
                        });
                        marker.on('mouseout', function (e) {
                            var layer = e.target;
                            layer.setStyle({
                                weight: 1
                            });
                        });
                    };

                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var value = MapLayerHelper.getClusterValue(record, layerConfig);
                        var shapeLayer, shape;
                        var pointToLayer = function (feature, latlng) {
                            return L.circleMarker(latlng, geojsonOptions);
                        };

                        if (value !== null) {
                            shape = getShape(record);
                            if (shape) {
                                shapeLayer = new L.GeoJSON(shape, {
                                    pointToLayer: pointToLayer,
                                    highlight: MapLayerHelper.getColor(value, layerConfig, min, max, values.length),
                                    style: function (feature) {
                                        var opts = angular.copy(geojsonOptions);
                                        opts.fillColor = colorScale(value);

                                        // update defaults
                                        // in this map, the keys are the keys of layerOption and the values the keys of opts
                                        var optionsMap = {
                                            'shapeOpacity': 'fillOpacity',
                                            'size': 'radius',
                                            'borderSize': 'weight',
                                            'borderOpacity': 'opacity',
                                            'borderColor': 'color'
                                        };
                                        for (var prop in optionsMap) {
                                            if (optionsMap.hasOwnProperty(prop) && angular.isDefined(layerConfig[prop])) {
                                                opts[optionsMap[prop]] = layerConfig[prop];
                                            }
                                        }

                                        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                                            opts.weight = 5;
                                            opts.color = colorScale(value);
                                        }
                                        return opts;
                                    }
                                });


                                if (shape.type !== 'LineString' && shape.type !== 'MultiLineString') {
                                    bindMarkerOver(layerConfig, shapeLayer, record, null);
                                }

                                if (layerConfig.joinContext && layerConfig.hoverField) {
                                    // Always show the value if it exists
                                    if (record.x[0].fields[layerConfig.hoverField]) {
                                        // TODO: We may want to make the value prettier (e.g. format number if it is one)
                                        shapeLayer.bindLabel(record.x[0].fields[layerConfig.hoverField]);
                                        if (layerConfig.refineOnClick) {
                                            MapLayerHelper.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest, record.x[0].fields[layerConfig.hoverField]);
                                        }
                                    } else {
                                        if (layerConfig.refineOnClick) {
                                            MapLayerHelper.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest);
                                        }
                                    }
                                } else {
                                    if ((layerConfig.func !== 'COUNT' && MapLayerHelper.isAnalyzeEnabledClustering(layerConfig)) || min !== max) {
                                        shapeLayer.bindLabel(MapLayerHelper.formatNumber(value));
                                    }

                                    MapLayerHelper.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest);
                                }
                                shapeLayerGroup.addLayer(shapeLayer);
                            }
                        }
                    }
                    deferred.resolve(shapeLayerGroup);
                }

                return deferred.promise;
            }
        };
    }]);
}());
