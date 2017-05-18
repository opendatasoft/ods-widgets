(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapLayerHelper', ['$rootScope', '$compile', '$filter', 'ODSAPI', 'PictoHelper', 'SVGInliner', function($rootScope, $compile, $filter, ODSAPI, PictoHelper, SVGInliner) {
        return {
            getRecordColor: function(record, layerConfig) {
                // A record may only be colored if there is a configured field to color it from
                // Aggregation results may be colored from their values
                var value, color;
                if (angular.isUndefined(layerConfig.color)) {
                    return "#C32D1C";
                }
                if (angular.isString(layerConfig.color)) {
                    return layerConfig.color;
                } else if (layerConfig.color.type === 'range') {
                    if (layerConfig.color.field) {
                        value = record && record.fields && record.fields[layerConfig.color.field];
                        if (angular.isUndefined(value)) {
                            return layerConfig.color.colors[0];
                        }
                        return this.getColor(value, layerConfig);
                    } else {
                        console.error('Range coloring requires a field');
                        return layerConfig.color.colors[0];
                    }
                    // TODO
                } else if (layerConfig.color.type === 'categories') {
                    value = record && record.fields && record.fields[layerConfig.color.field];
                    color = layerConfig.color.categories[value];
                    if (angular.isUndefined(color)) {
                        return layerConfig.color.otherCategories || '#000000';
                    } else {
                        return color;
                    }
                } else if (layerConfig.color.type === 'field') {
                    color = record && record.fields && record.fields[layerConfig.color.field];
                    if (!color) {
                        return '#000000';
                    }
                    try {
                        return chroma(color).hex();
                    } catch (err) {
                        return '#000000';
                    }
                } else if (layerConfig.color.type === 'choropleth') {
                    value = record && record.fields && record.fields[layerConfig.color.field];
                    if (angular.isUndefined(value)) {
                        return '#000000';
                    }
                    if (!angular.isNumber(value)) {
                        // TODO: Handle using an "other values" option?
                        console.warn(value, 'is not a numeric value to display in choropleth mode.');
                        return '#000000';
                    }
                    var rangesUpperBounds = Object.keys(layerConfig.color.ranges)
                            .map(function(b) { return parseFloat(b); })
                            .sort(function(a, b) { return a - b; });
                    var i = 0;
                    for (i=0; i<rangesUpperBounds.length; i++) {
                        if (value <= rangesUpperBounds[i]) {
                            return layerConfig.color.ranges[rangesUpperBounds[i]];
                        }
                    }
                    // If higher than the last option, use it anyway
                    return layerConfig.color.ranges[rangesUpperBounds[rangesUpperBounds.length-1]];
                } else {
                    // Scale is not supported for records (yet?)
                    console.error('Scale coloring is not supported for simple records');
                    return chroma.scale(layerConfig.color.scale).out('hex').scale(0);
                }
            },
            getClusterColor: function(cluster, layerConfig) {
                if (angular.isUndefined(layerConfig.color)) {
                    return "#C32D1C";
                }
                if (angular.isString(layerConfig.color)) {
                    return layerConfig.color;
                } else {
                    return layerConfig.color.colors[0];
                }
            },
            getColor: function(value, layerConfig, min, max, scaleSteps) {
                scaleSteps = scaleSteps || 10;
                if (angular.isUndefined(layerConfig.color)) {
                    return "#C32D1C";
                }
                if (angular.isString(layerConfig.color)) {
                    if (angular.isDefined(min) && angular.isDefined(max)) {
                        return chroma.scale([chroma(layerConfig.color).brighten(50), layerConfig.color]).domain([min, max], Math.min(10, scaleSteps), layerConfig.colorFunction).out('hex')(value);
                    } else {
                        // Simple color
                        return layerConfig.color;
                    }
                } else {
                    if (layerConfig.color.type === 'scale') {
                        return chroma.scale(layerConfig.color.scale).domain([min, max], Math.min(10, scaleSteps), layerConfig.colorFunction).out('hex')(value);
                    } else if (layerConfig.color.type === 'range') {
                        var i;
                        for (i=0; i<layerConfig.color.ranges.length; i++) {
                            if (value < layerConfig.color.ranges[i]) {
                                return layerConfig.color.colors[i];
                            }
                        }
                        return layerConfig.color.colors[layerConfig.color.colors.length-1];
                    }
                }
            },
            /*                                  */
            /*          INTERACTIONS            */
            /*                                  */
            bindTooltip: function(map, feature, layerConfig, clusterShape, recordid, geoDigest, fieldValue) {
                var service = this;
                if (angular.isArray(clusterShape)) {
                    // A coords made of lat,lng
                    clusterShape = {
                        type: "Point", coordinates: [clusterShape[1], clusterShape[0]]
                    };
                }
                if (layerConfig.refineOnClick) {
                    feature.on('click', function(e) {
                        if (map.isDrawing) {
                            return;
                        }
                        // TODO: Support tiles and refineOnClick
                        service.refineContextOnClick(layerConfig, clusterShape, geoDigest, fieldValue);
                    });
                } else {
                    // Binds on a feature (marker, shape) so that it shows a popup on click
                    feature.on('click', function(e) {
                        if (map.isDrawing) {
                            return;
                        }
                        if (!clusterShape && !recordid && !geoDigest && !e.data) {
                            // An UTFGrid event with no grid data
                            return;
                        }
                        var latLng, yOffset;
                        if (angular.isDefined(e.target.getLatLng)) {
                            latLng = e.target.getLatLng();
                        } else {
                            latLng = e.latlng;
                            yOffset = 0; // Displayed where the user clicked
                        }
                        // FIXME: We assume that if the event contains a data, it is a gridData
                        service.showPopup(map, layerConfig, latLng, clusterShape, recordid, geoDigest, yOffset, e.data || null);
                    });
                }
            },
            refineContextOnClick: function(layerConfig, shape, digest, fieldValue) {
                var refineContext = function(refineConfig) {
                    var contextField = refineConfig.contextField;
                    var mapField = refineConfig.mapField;
                    var context = refineConfig.context;
                    var replaceRefine = refineConfig.replaceRefine;

                    if (!mapField && !contextField) {
                        $rootScope.$apply(function() {
                            // We are using the real shape so that we match anythinh within the shape
                            ODS.GeoFilter.addGeoFilterFromSpatialObject(context.parameters, shape);
                        });
                    } else {
                        if (angular.isDefined(fieldValue) && mapField == layerConfig.hoverField) {
                            $rootScope.$apply(function() {
                                context.toggleRefine(contextField, fieldValue, replaceRefine);
                            });
                        } else {
                            // We need to retrieve a record for this to work
                            // FIXME: Factorize with the same code just above
                            var options = {
                                format: 'json'
                            };
                            if (digest) {
                                options.geo_digest = digest;
                            } else {
                                ODS.GeoFilter.addGeoFilterFromSpatialObject(options, shape);
                            }
                            angular.extend(options, layerConfig.context.parameters, {rows: 1});
                            ODSAPI.records.download(layerConfig.context, options).success(function(data) {
                                if (angular.isDefined(data[0].fields[mapField])) {
                                    context.toggleRefine(contextField, data[0].fields[mapField], replaceRefine);
                                }
                            });
                        }
                    }
                };
                // This layer is configured to refine another context on click
                angular.forEach(layerConfig.refineOnClick, refineContext);
            },
            bindZoomable: function(map, feature, layerConfig) {
                // Binds on a feature (marker, shape) so that when clicked, it attemps to zoom on it, or show a regular
                // tooltip if at maximum zoom
                feature.on('click', function(e) {
                    if (map.isDrawing) {
                        return;
                    }
                    if (map.getZoom() === map.getMaxZoom()) {
                        this.showPopup(map, layerConfig, e.target.getLatLng(), e.target.getClusterShape());
                    } else {
                        map.setView(e.latlng, map.getZoom()+2);
                    }
                });
            },
            showPopup: function(map, layerConfig, latLng, shape, recordid, geoDigest, yOffset, gridData) {
                // TODO: How to pass custom template?
                // Displays a popup
                var newScope = $rootScope.$new(true);
                if (recordid) {
                    newScope.recordid = recordid;
                }
                if (shape) {
                    newScope.shape = shape;
                }
                if (gridData) {
                    newScope.gridData = gridData;
                }
                var dataset = layerConfig.context.dataset;
                newScope.map = map;
                newScope.template = layerConfig.tooltipTemplate || dataset.extra_metas && dataset.extra_metas.visualization && dataset.extra_metas.visualization.map_tooltip_html_enabled && dataset.extra_metas.visualization.map_tooltip_html || '';
                var popupOptions = {
                    offset: [0, angular.isDefined(yOffset) ? yOffset : -30],
                    maxWidth: 250,
                    minWidth: 250
                    //autoPanPaddingTopLeft: [50, 305]
                };
                newScope.context = layerConfig.context;
                // TODO: Move the custom template detection from the dataset inside odsMapTooltip? (the dataset object is available in the context)
                var popup = new L.Popup(popupOptions).setLatLng(latLng)
                    .setContent($compile('<ods-map-tooltip tooltip-sort="'+(layerConfig.tooltipSort||'')+'" shape="shape" recordid="recordid" context="context" map="map" template="{{ template }}" grid-data="gridData" geo-digest="'+(geoDigest||'')+'"></ods-map-tooltip>')(newScope)[0]);
                popup.openOn(map);
            },
            /*                              */
            /*          UTILITIES           */
            /*                              */
            formatNumber: function(number) {
                /* Passed as a callback for the cluster markers, to allow them to format their displayed value */
                // Limiting the digits
                number = Math.round(number*100)/100;
                // Formatting the digits
                number = $filter('number')(number);
                return number;
            },
            getClusterValue: function(cluster, layerConfig) {
                if (layerConfig.display === 'aggregation' && layerConfig.joinContext) {
                    // This is a join
                    return cluster.serie1;
                }

                if (layerConfig.func !== 'COUNT' && this.isAnalyzeEnabledClustering(layerConfig)) {
                    if (cluster.series) {
                        return cluster.series.serie1;
                    } else {
                        return null;
                    }
                } else {
                    return cluster.count;
                }
            },
            getClusterMin: function(apiResult, layerConfig) {
                if (layerConfig.display === 'aggregation' && layerConfig.joinContext) {
                    // This is a join
                    return apiResult.aggregations.agg1.min;
                }

                if (layerConfig.func !== 'COUNT' && this.isAnalyzeEnabledClustering(layerConfig)) {
                    return apiResult.series.serie1.min;
                } else {
                    return apiResult.count.min;
                }
            },
            getClusterMax: function(apiResult, layerConfig) {
                if (layerConfig.display === 'aggregation' && layerConfig.joinContext) {
                    // This is a join
                    return apiResult.aggregations.agg1.max;
                }

                if (layerConfig.func !== 'COUNT' && this.isAnalyzeEnabledClustering(layerConfig)) {
                    return apiResult.series.serie1.max;
                } else {
                    return apiResult.count.max;
                }
            },
            getClusterValues: function(apiResult, layerConfig) {
                var values = [], i;
                if (layerConfig.display === 'aggregation' && layerConfig.joinContext) {
                    // This is a join
                    for (i = 0; i < apiResult.results.length; i++) {
                        values.push(apiResult.results[i].serie1);
                    }
                } else if (layerConfig.func !== 'COUNT' && this.isAnalyzeEnabledClustering(layerConfig)) {
                    for (i = 0; i < apiResult.clusters.length; i++) {
                        if (apiResult.clusters[i].series) {
                            values.push(apiResult.clusters[i].series.serie1);
                        }
                    }
                } else {
                    for (i = 0; i < apiResult.clusters.length; i++) {
                        values.push(apiResult.clusters[i].count);
                    }
                }
                return values;
            },
            isAnalyzeEnabledClustering: function(layerConfig) {
                /* Are the analyze features enabled for this clustering? */
                return ['heatmap', 'polygonforced', 'shape', 'aggregation', 'clusters'].indexOf(layerConfig.display) >= 0;
            },
            doesLayerRefreshOnLocationChange: function(layerConfig) {
                if (layerConfig.display === 'tiles') {
                    return false;
                } else if ((layerConfig.display === 'shape' || layerConfig.display === 'aggregation') && layerConfig.joinContext) {
                    // We got all the data at once
                    return false;
                } else {
                    return true;
                }
            },
            drawPoint: function(layerConfig, map, coords, record, targetLayer, geoDigest) {
                var service = this;
                SVGInliner.getPromise(PictoHelper.mapPictoToURL(layerConfig.picto, layerConfig.context), layerConfig.marker ? 'white' : service.getRecordColor(record, layerConfig)).then(function (svg) {
                    var singleMarker = new L.VectorMarker(coords, {
                        color: service.getRecordColor(record, layerConfig),
                        icon: svg,
                        marker: layerConfig.marker,
                        opacity: layerConfig.pointOpacity,
                        size: layerConfig.size
                    });

                    targetLayer.addLayer(singleMarker);
                    //targetLayer.addLayer(new L.Marker(coords)); // Uncomment to debug pointer alignment
                    if (record) {
                        service.bindTooltip(map, singleMarker, layerConfig, coords, record.recordid);
                    } else {
                        service.bindTooltip(map, singleMarker, layerConfig, coords, null, geoDigest);
                    }
                });
            },
            drawShape: function(layerConfig, map, geoJSON, record, targetLayer, geoDigest) {
                var service = this;

                var shapeLayer = new L.GeoJSON(geoJSON, {
                    style: function (feature) {
                        var opts = {};
                        opts.radius = 3;

                        if (layerConfig.borderPattern && layerConfig.borderPattern !== 'solid') {
                            opts.dashArray = service.patternToDashArray(layerConfig.borderPattern);
                        }

                        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                            opts.weight = 5; // To be overloaded
                            opts.color = service.getRecordColor(record, layerConfig);
                            if (angular.isDefined(layerConfig.shapeOpacity)) {
                                opts.opacity = layerConfig.shapeOpacity;
                            } else {
                                opts.opacity = 0.5;
                            }
                        } else {
                            opts.fillColor = service.getRecordColor(record, layerConfig);

                            if (angular.isDefined(layerConfig.borderSize)) {
                                opts.weight = layerConfig.borderSize;
                            } else {
                                opts.weight = 1;
                            }
                            if (angular.isDefined(layerConfig.shapeOpacity)) {
                                opts.fillOpacity = layerConfig.shapeOpacity;
                            } else {
                                opts.fillOpacity = 0.5;
                            }
                            if (angular.isDefined(layerConfig.borderOpacity)) {
                                opts.opacity = layerConfig.borderOpacity;
                            } else {
                                opts.opacity = 1;
                            }
                            if (angular.isDefined(layerConfig.borderColor)) {
                                opts.color = layerConfig.borderColor;
                            } else {
                                opts.color = "#fff";
                            }
                            if (layerConfig.borderPattern && layerConfig.borderPattern !== 'solid') {
                                opts.dashArray = service.patternToDashArray(layerConfig.borderPattern);
                            }
                        }
                        return opts;
                    }
                });

                // TODO: Document the cases
                if (record) {
                    service.bindTooltip(map, shapeLayer, layerConfig, geoJSON, record.recordid);
                } else {
                    service.bindTooltip(map, shapeLayer, layerConfig, geoJSON, null, geoDigest);
                }

                targetLayer.addLayer(shapeLayer);
            },
            patternToDashArray: function(pattern) {
                var dashArray;
                var DOT = 1;
                var SHORT = 5;
                var MEDIUM = 15;
                var LONG = 30;
                switch (pattern) {
                    case 'long-dashes':
                        dashArray = [LONG, MEDIUM];
                        break;
                    case 'medium-dashes':
                        dashArray = [MEDIUM, MEDIUM];
                        break;
                    case 'short-dashes':
                        dashArray = [SHORT, MEDIUM];
                        break;
                    case 'dots':
                        dashArray = [DOT, MEDIUM];
                        break;
                    case 'short-dot':
                        dashArray = [DOT, SHORT, SHORT];
                        break;
                    case 'short-dot-dot':
                        dashArray = [DOT, SHORT, SHORT, DOT, SHORT];
                        break;
                    case 'medium-short':
                        dashArray = [MEDIUM, SHORT, SHORT, SHORT];
                        break;
                    default:
                        console.error('Unknown border pattern', pattern);
                        break;
                }
                return dashArray.join(', ');
            },
        };
    }]);
}());