(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapHelper', ['ODSWidgetsConfig', 'ODSAPI', '$q', 'AggregationHelper', 'translate', function (ODSWidgetsConfig, ODSAPI, $q, AggregationHelper, translate) {
        var locationAccuracy = 5;
        var locationDelimiter = ',';
        var defaultMarkerColor = "#C32D1C";
        var defaultRangeColors = ["#FC9272", "#A5211B"];

        return {
            WORLD_BOUNDS: [[-60, -180], [80, 180]],
            DEFAULT_MARKER_COLOR: defaultMarkerColor,
            DEFAULT_RANGE_COLORS: defaultRangeColors,
            retrieveBounds: function (contextList) {
                var service = this;
                /* Retrieves a bounding box that includes all the data visible from the context list */
                var deferred = $q.defer();

                if (contextList.length === 0) {
                    deferred.resolve(null);
                } else {
                    var promises = [];
                    angular.forEach(contextList, function (ctx) {
                        var options = {};
                        jQuery.extend(options, ctx.parameters);
                        promises.push(ODSAPI.records.boundingbox(ctx, options));
                    });

                    $q.all(promises).then(function (results) {
                        var bounds;

                        angular.forEach(results, function (result) {
                            var data = result.data;
                            var newBounds = [[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]];
                            if (data.count > 0) {
                                if (!bounds) {
                                    bounds = L.latLngBounds(newBounds);
                                } else {
                                    bounds.extend(newBounds);
                                }
                            }
                        });

                        if (bounds && bounds.isValid()) {
                            deferred.resolve(bounds);
                        } else {
                            // Fallback to... the world
                            deferred.resolve(service.WORLD_BOUNDS);
                        }
                    });
                }

                return deferred.promise;
            },
            getLocationStructure: function (location) {
                /* Takes a "location" parameter (zoom, lat,lng) and returns a structured object */
                var tokens = location.split(locationDelimiter);
                return {
                    center: [tokens[1], tokens[2]],
                    zoom: tokens[0]
                };
            },
            getLocationParameter: function (center, zoom) {
                /* Takes a center and a zoom, and returns a "location" parameter suitable for sharing. The position
                 * is "blurred" to ensure the URL does not change at every pixel, to enhance performance a bit and avoid
                 * weird side effects like this problem where Chrome pops an option to allow geolocalisation of the user,
                 * but the URL changes immediately because the viewport is shrinked by a few pixels, and the option disappears. */
                if (angular.isArray(center)) {
                    center = L.latLng(center);
                }
                var lat = L.Util.formatNum(center.lat, locationAccuracy);
                var lng = L.Util.formatNum(center.lng, locationAccuracy);
                return zoom + locationDelimiter + lat + locationDelimiter + lng;
            },
            _getDatasetFieldBound: function(context, fieldName, orderPrefix) {
                var service = this;
                var deferred = $q.defer();
                var apiParams = angular.extend({}, context.parameters, {'rows': 1});
                var sort = fieldName;
                if (orderPrefix) {
                    sort = orderPrefix + sort;
                }
                ODSAPI.records.search(context, angular.extend(apiParams, {sort: sort})).then(function(result) {
                    deferred.resolve(service.boundAsNumber(result.data.records[0].fields[fieldName]));
                });
                return deferred.promise;
            },
            getDatasetFieldBoundMin: function(context, fieldName) {
                return this._getDatasetFieldBound(context, fieldName, '-');
            },
            getDatasetFieldBoundMax: function(context, fieldName) {
                return this._getDatasetFieldBound(context, fieldName);
            },
            getDatasetFieldBounds: function(context, fieldName) {
                var service = this;
                var calls = [
                    this.getDatasetFieldBoundMin(context, fieldName),
                    this.getDatasetFieldBoundMax(context, fieldName)
                ];
                var deferred = $q.defer();
                $q.all(calls).then(function(results) {
                    var values = results.sort(ODS.ArrayUtils.sortNumbers);
                    var minValue = values[0];
                    var maxValue = values[1];
                    deferred.resolve([minValue, maxValue]);
                });
                return deferred.promise;
            },
            getDatasetAggregationBounds: function(context, aggregationFunction, fieldName) {
                var service = this;
                var apiParams = angular.extend({}, context.parameters);
                var deferred = $q.defer();

                apiParams.maxpoints = 1;

                if (aggregationFunction !== 'COUNT') {
                    apiParams['y.serie.expr'] = fieldName;
                    apiParams['y.serie.func'] = aggregationFunction;
                }

                ODSAPI.records.geopolygon(context, apiParams).then(function(result) {
                    var data = result.data;
                    if (aggregationFunction !== 'COUNT') {
                        deferred.resolve([data.series.serie.min, data.series.serie.max]);
                    } else {
                        deferred.resolve([data.count.min, data.count.max]);
                    }
                });
                return deferred.promise;
            },
            boundAsNumber: function(number) {
                return parseFloat(number);
            },
            getLayerLegendLabel: function(layerConfig) {
                var label = null;
                if (['choropleth', 'categories', 'heatmap', 'clusters'].indexOf(layerConfig.display) >= 0) {
                    var field;
                    if (layerConfig.display === 'categories' || (layerConfig.display === 'choropleth' && layerConfig.color.field)) {
                        field = layerConfig.context.dataset.getField(layerConfig.color.field);
                    } else if (layerConfig.func.toUpperCase() !== 'COUNT') {
                        field = layerConfig.context.dataset.getField(layerConfig.expr);
                    }
                    if (field) {
                        label = field.label;

                        var addendums = [];
                        if (layerConfig.func) {
                            addendums.push(AggregationHelper.getFunctionLabel(layerConfig.func));
                        }

                        var unit = layerConfig.context.dataset.getFieldAnnotation(field, 'unit');
                        if (unit) {
                            var unitLabel = translate('in {unit}');
                            addendums.push(format_string(unitLabel, {unit: unit.args[0]}));
                        }

                        if (addendums.length) {
                            label += ' (' + addendums.join(', ') + ')';
                        }
                    } else {
                        label = translate('Number of elements');
                    }
                    return label;
                }
            },
            convertGeofiltersToQueries: function(parameters) {
                if (parameters['geofilter.polygon']) {
                    var polygon = parameters['geofilter.polygon'];
                    parameters['q.geofilter'] = '#polygon("' + polygon + '")';
                    delete parameters['geofilter.polygon'];
                }
                if (parameters['geofilter.distance']) {
                    var circle = parameters['geofilter.distance'];
                    // Add double quotes around the coordinates part
                    circle = '"' + circle.slice(0, circle.lastIndexOf(',')) + '",' + circle.slice(circle.lastIndexOf(',')+1);
                    parameters['q.geofilter'] = '#distance(' + circle + ')';
                    delete parameters['geofilter.distance'];
                }
            },
            convertQueriesToGeofilters: function(parameters) {
                if (parameters['q.geofilter']) {
                    var geofilter = parameters['q.geofilter'];
                    if (geofilter.startsWith('#polygon')) {
                        // Remove the "#polygon("[real polygon]") part
                        parameters['geofilter.polygon'] = geofilter.slice(geofilter.indexOf('"') + 1, -2);
                    } else {
                        // Remove the "#distance("[center]",[radius]) part
                        parameters['geofilter.distance'] = geofilter.slice(geofilter.indexOf('"')+1, -1).replace('",', ',')
                    }
                    delete parameters['q.geofilter'];
                }
            },
            MapConfiguration: {
                getActiveContextList: function (config, options) {
                    /*
                     Options:
                     {
                     geoOnly (true/false, default false): only keeps datasets with geo field
                     skipExcludedFromRefit (true/false, default false): effectively excludes from the list the layers
                     that have been "excluded from refit"
                     }
                     */
                    options = options || {};
                    var contexts = [];
                    /* Returns all the contexts from active layergroups */
                    angular.forEach(config.groups, function (group) {
                        if (group.displayed) {
                            angular.forEach(group.layers, function (datasetConfig) {
                                if (!datasetConfig.context.error) {
                                    if (!options.geoOnly || datasetConfig.context.dataset.hasGeoField()) {
                                        if (!(datasetConfig.excludeFromRefit && options.skipExcludedFromRefit)) {
                                            contexts.push(datasetConfig.context);
                                        }
                                    }
                                }
                            });
                        }
                    });
                    return contexts;
                },
                getContextList: function (config) {
                    var contexts = [];
                    /* Returns all the contexts from active layergroups */
                    angular.forEach(config.groups, function (group) {
                        angular.forEach(group.layers, function (datasetConfig) {
                            if (datasetConfig.context && datasetConfig.context.dataset && datasetConfig.context.dataset.hasGeoField()) {
                                contexts.push(datasetConfig.context);
                            }
                        });
                    });
                    return contexts;
                },
                createLayerGroupConfiguration: function () {
                    return {
                        "color": null,
                        "title": null,
                        "description": null,
                        "displayed": true,
                        "picto": null,
                        "layers": []
                    };
                },
                createLayerConfiguration: function (template, config) {
                    if (angular.isUndefined(config)) {
                        config = {};
                    }
                    var display = config.display || 'auto';
                    if (display === 'clusters' || display === 'clustersforced') {
                        // 'clusters' is the new name (Mapbuilder v2) for forced clusterization
                        display = 'polygonforced';
                    }
                    if (display === 'raw') {
                        display = 'none';
                    }
                    // Also converts the size to an int, if it was a string
                    config.size = Math.min(config.size, 10);
                    config.radius = Math.min(config.radius, 10);
                    // FIXME: This is not clear which is what between this and setLayerDisplaySettingsFromDefault()
                    var layer = {
                        "context": null,
                        "color": config.color,
                        "colorFunction": config.colorFunction,
                        "picto": config.picto,
                        "display": display,
                        "func": config['function'] || null,
                        "expr": config.expression || null,
                        "marker": null,
                        "size": config.size || null,
                        "radius": config.radius || null,
                        "tooltipDisabled": angular.isDefined(config.tooltipDisabled) ? config.tooltipDisabled : false,
                        "tooltipTemplate": template,
                        "localKey": config.localKey || null,
                        "remoteKey": config.remoteKey || null,
                        "tooltipSort": config.tooltipSort,
                        "hoverField": config.hoverField || null,
                        //"opacity": config.opacity || null,
                        "shapeOpacity": config.shapeOpacity || null,
                        "pointOpacity": config.pointOpacity || null,
                        "lineWidth": config.lineWidth || null,
                        "borderOpacity": config.borderOpacity || null,
                        "borderColor": config.borderColor,
                        "borderSize": config.borderSize || null,
                        "borderPattern": config.borderPattern || null,
                        "excludeFromRefit": config.excludeFromRefit,
                        "caption": angular.isDefined(config.caption) ? config.caption : false,
                        "captionTitle": config.captionTitle || null,
                        "captionPictoIcon": config.captionPictoIcon || null,
                        "captionPictoColor": config.captionPictoColor || null,
                        "title": config.title || null,
                        "description": config.description || null,
                        "showZoomMin": config.showZoomMin || undefined,
                        "showZoomMax": config.showZoomMax || undefined,
                        "minSize": config.minSize || null,
                        "maxSize": config.maxSize || null,
                        "sizeFunction": config.sizeFunction || null,
                        "geoField": config.geoField
                    };

                    if (!layer.func && ['shape', 'aggregation'].indexOf(layer.display) > -1) {
                        // In shape or aggregation mode, we *need* a function
                        layer.func = 'COUNT';
                    }

                    this.createLayerId(layer);
                    return layer;
                },
                setLayerDisplaySettingsFromDefault: function (layer) {
                    /*
                     Fills layer display settings with default values if these are not yet set explicitely.
                     */
                    if (angular.isUndefined(layer.marker) || layer.marker === null) {
                        if (layer.context.dataset.getExtraMeta('visualization', 'map_marker_hidemarkershape') !== null) {
                            layer.marker = !layer.context.dataset.getExtraMeta('visualization', 'map_marker_hidemarkershape');
                        } else {
                            layer.marker = true;
                        }
                    }

                    layer.color = layer.color || layer.context.dataset.getExtraMeta('visualization', 'map_marker_color') || defaultMarkerColor;
                    layer.picto = layer.picto || layer.context.dataset.getExtraMeta('visualization', 'map_marker_picto') || (layer.marker ? "ods-circle" : "dot");
                    if (layer.marker) {
                        layer.size = layer.size || 4;
                    } else {
                        layer.size = layer.size || 7;
                    }
                    if (angular.isUndefined(layer.shapeOpacity) || layer.shapeOpacity === null) {
                        layer.shapeOpacity = layer.shapeOpacity || 0.5;
                    }
                    if (angular.isUndefined(layer.pointOpacity) || layer.pointOpacity === null) {
                        layer.pointOpacity = layer.pointOpacity || 1;
                    }
                    layer.radius = layer.radius || 4;
                    layer.lineWidth = layer.lineWidth || 5;
                    layer.borderOpacity = layer.borderOpacity || 1;
                    layer.borderColor = layer.borderColor || '#FFFFFF';
                    layer.borderSize = layer.borderSize || 1;
                    layer.borderPattern = layer.borderPattern || 'solid';
                    layer.sizeFunction = layer.sizeFunction || 'linear';
                    layer.minSize = layer.minSize || 3;
                    layer.maxSize = layer.maxSize || 5;
                    this.createLayerId(layer);
                },
                getVisibleLayerIds: function (config) {
                    var layerIds = [];
                    /* Returns all the contexts from active layergroups */
                    angular.forEach(config.groups, function (group) {
                        if (group.displayed) {
                            angular.forEach(group.layers, function (layer) {
                                //if (angular.isUndefined(layer._runtimeId)) {
                                //    layer._runtimeId = ODS.StringUtils.getRandomUUID();
                                //}
                                layerIds.push(layer._runtimeId);
                            });
                        }
                    });
                    return layerIds;
                },


                createLayerId: function (layer) {
                    if (angular.isUndefined(layer._runtimeId)) {
                        layer._runtimeId = ODS.StringUtils.getRandomUUID();
                    }
                }
            }
        };
    }]);
}());
