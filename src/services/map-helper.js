(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapHelper', ['ODSWidgetsConfig', 'ODSAPI', '$q', function (ODSWidgetsConfig, ODSAPI, $q) {
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
                                if (!options.geoOnly || datasetConfig.context.dataset.hasGeoField()) {
                                    if (!(datasetConfig.excludeFromRefit && options.skipExcludedFromRefit)) {
                                        contexts.push(datasetConfig.context);
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
                            if (datasetConfig.context.dataset.hasGeoField()) {
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
                    if (display === 'clusters') {
                        display = 'polygon';
                    }
                    if (display === 'clustersforced') {
                        display = 'polygonforced';
                    }
                    if (display === 'raw') {
                        display = 'none';
                    }
                    // FIXME: This is not clear which is what between this and setLayerDisplaySettingsFromDefault()
                    var layer = {
                        "context": null,
                        "color": config.color,
                        "colorFunction": config.colorFunction,
                        "picto": config.picto,
                        "display": display,
                        "func": config['function'] || (config.expression ? "AVG" : "COUNT"), // If there is a field, default to the average
                        "expr": config.expression || null,
                        "marker": null,
                        "size": null,
                        "tooltipTemplate": template,
                        "localKey": config.localKey || null,
                        "remoteKey": config.remoteKey || null,
                        "tooltipSort": config.tooltipSort,
                        "hoverField": config.hoverField || null,
                        //"opacity": config.opacity || null,
                        "shapeOpacity": config.shapeOpacity || null,
                        "borderOpacity": config.borderOpacity || null,
                        "pointOpacity": config.pointOpacity || null,
                        "borderColor": config.borderColor,
                        "excludeFromRefit": config.excludeFromRefit,
                        "caption": angular.isDefined(config.caption) ? config.caption : false,
                        "captionTitle": config.captionTitle || null
                    };
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
                    layer.picto = layer.picto || layer.context.dataset.getExtraMeta('visualization', 'map_marker_picto') || (layer.marker ? "circle" : "dot");
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
                createLayerId: function(layer) {
                    if (angular.isUndefined(layer._runtimeId)) {
                        layer._runtimeId = ODS.StringUtils.getRandomUUID();
                    }
                }
            }
        };
    }]);
}());