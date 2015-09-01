(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MapHelper', ['ODSWidgetsConfig', 'ODSAPI', '$q', function(ODSWidgetsConfig, ODSAPI, $q) {
        var locationAccuracy = 5;
        var locationDelimiter = ',';

        return {
            WORLD_BOUNDS: [[-60, -180], [80, 180]],
            retrieveBounds: function(contextList) {
                var service = this;
                /* Retrieves a bounding box that includes all the data visible from the context list */
                var deferred = $q.defer();

                if (contextList.length === 0) {
                    deferred.resolve(null);
                } else {
                    var promises = [];
                    angular.forEach(contextList, function(ctx) {
                        var options = {};
                        jQuery.extend(options, ctx.parameters);
                        promises.push(ODSAPI.records.boundingbox(ctx, options));
                    });

                    $q.all(promises).then(function(results) {
                        var bounds;

                        angular.forEach(results, function(result) {
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
            getLocationStructure: function(location) {
                /* Takes a "location" parameter (zoom, lat,lng) and returns a structured object */
                var tokens = location.split(locationDelimiter);
                return {
                    center: [tokens[1], tokens[2]],
                    zoom: tokens[0]
                };
            },
            getLocationParameter: function(center, zoom) {
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
                getActiveContextList: function(config, geoOnly) {
                    var contexts = [];
                    /* Returns all the contexts from active layergroups */
                    angular.forEach(config.layers, function(group) {
                        if (group.displayed) {
                            angular.forEach(group.activeDatasets, function(datasetConfig) {
                                if (geoOnly) {
                                    // Ensure the dataset is geo
                                    if (datasetConfig.context.dataset.hasGeoField()) {
                                        contexts.push(datasetConfig.context);
                                    }
                                } else {
                                    contexts.push(datasetConfig.context);
                                }
                            });
                        }
                    });
                    return contexts;
                },
                createLayerGroupConfiguration: function() {
                    return {
                        "color": "#369",
                        "title": "Calque #1",
                        "displayed": true,
                        "picto": "icon-circle",
                        "activeDatasets": []
                    };
                },
                createLayerConfiguration: function(template, config) {
                    if (angular.isUndefined(config)) {
                        config = {};
                    }
                    var display = config.display || 'auto';
                    if (display === 'clusters') { display = 'polygon'; }
                    if (display === 'clustersforced') { display = 'polygonforced'; }
                    if (display === 'raw') { display = 'none'; }
                    return {
                        "context": null,
                        "color": config.color,
                        "picto": config.picto,
                        "clusterMode": display,
                        "func": config['function'] || (config.expression ? "AVG" : "COUNT"), // If there is a field, default to the average
                        "expr": config.expression || null,
                        "marker": null,
                        "tooltipTemplate": template,
                        "localKey": config.localKey || null,
                        "remoteKey": config.remoteKey || null,
                        "tooltipSort": config.tooltipSort,
                        "hoverField": config.hoverField || null,
                        "opacity": config.opacity,
                        "borderColor": config.borderColor
                    };
                }
            }
        };
    }]);

    mod.factory('MapLayerRenderer', ['ODSAPI', 'AggregationHelper', 'SVGInliner', 'PictoHelper', '$q', '$filter', '$rootScope', '$compile', '$timeout', function(ODSAPI, AggregationHelper, SVGInliner, PictoHelper, $q, $filter, $rootScope, $compile, $timeout) {
        // TODO: Query interruption when moving
        return {
            updateDataLayer: function (layerConfig, map) {
                var service = this;
                var previousRenderedLayer = layerConfig.rendered;

                // Depending on the rendering mode, we either replace the previous layer with a new one, or we update
                // the existing one (tiles).

                // Available modes:
                // none: downloading all points
                // polygon, polygonforced: circles clustering
                // heatmap
                // aggregation (former "shape") - local and remote

                if (layerConfig.currentRequestTimeout) {
                    layerConfig.currentRequestTimeout.resolve();
                }
                var timeout = $q.defer();
                layerConfig.currentRequestTimeout = timeout;
                var deferred = $q.defer();
                if (layerConfig.clusterMode === 'tiles') {
                    // TODO
                    // If the bundlelayer already exists in layerConfig.layer, then setUrl to it.
                    if (!layerConfig.rendered) {
                        layerConfig.rendered = new L.BundleTileLayer('', {
                            tileSize: 512,
                            minZoom: map.getMinZoom(),
                            maxZoom: map.getMaxZoom(),
                            gridLayer: {
                                options: {
                                    resolution: 4
                                }
                            }
                        });
                        map.addLayer(layerConfig.rendered);

                        $timeout(function() {
                            // We have to bootstrap them outside of the angular cycle, otherwise it will directly trigger
                            // the first time and make a "digest already in progress"
                            layerConfig.rendered.on('loading', function () {
                                layerConfig.loading = true;
                                $rootScope.$apply();
                            });
                            layerConfig.rendered.on('load', function () {
                                layerConfig.loading = false;
                                $rootScope.$apply();
                            });
                        }, 0);

                        service.bindTooltip(map, layerConfig.rendered, layerConfig);
                    }
                    var tilesOptions = {
                        color: layerConfig.color,
                        icon: layerConfig.picto,
                        showmarker: layerConfig.marker
                    };
                    angular.extend(tilesOptions, layerConfig.context.parameters);
                    // Change tile URL
                    var url = '/api/datasets/1.0/' + layerConfig.context.dataset.datasetid + '/tiles/simple/{z}/{x}/{y}.bundle';
                    //var url = '/api/tiles/icons/{z}/{x}/{y}.bundle';
                    var params = '';
                    angular.forEach(tilesOptions, function(value, key) {
                        if (value !== null) {
                            params += params ? '&' : '?';
                            params += key + '=' + encodeURIComponent(value);
                        }
                    });
                    url += params;
                    if (layerConfig.rendered._url !== url) {
                        layerConfig.rendered.setUrl(url);
                    }
                    // FIXME: Bind to load/unload to not resolve until all is loaded
                    deferred.resolve();
                } else if (layerConfig.clusterMode === 'none' || map.getZoom() === map.getMaxZoom() && layerConfig.clusterMode === 'polygon') {
                    layerConfig.loading = true;
                    this.buildRawLayer(layerConfig, map, timeout).then(function(rawLayer) {
                        service.swapLayers(map, previousRenderedLayer, rawLayer);
                        layerConfig.rendered = rawLayer;
                        layerConfig.currentRequestTimeout = null;
                        layerConfig.loading = false;
                        deferred.resolve();
                    });
                } else if (layerConfig.clusterMode === 'polygon' || layerConfig.clusterMode === 'polygonforced') {
                    layerConfig.loading = true;
                    this.buildClusteredLayer(layerConfig, map, timeout, true).then(function(clusteredLayer) {
                        service.swapLayers(map, previousRenderedLayer, clusteredLayer);
                        layerConfig.rendered = clusteredLayer;
                        layerConfig.currentRequestTimeout = null;
                        layerConfig.loading = false;
                        deferred.resolve();
                    });
                } else if (layerConfig.clusterMode === 'heatmap') {
                    layerConfig.loading = true;
                    this.buildHeatmapLayer(layerConfig, map, timeout).then(function (heatmapLayer) {
                        service.swapLayers(map, previousRenderedLayer, heatmapLayer);
                        layerConfig.rendered = heatmapLayer;
                        layerConfig.currentRequestTimeout = null;
                        layerConfig.loading = false;
                        deferred.resolve();
                    });
                } else if (layerConfig.clusterMode === 'shape' || layerConfig.clusterMode === 'aggregation') { // 'shape' is legacy
                    layerConfig.loading = true;
                    this.buildAggregationLayer(layerConfig, map, timeout).then(function(shapeLayer) {
                        service.swapLayers(map, previousRenderedLayer, shapeLayer);
                        layerConfig.rendered = shapeLayer;
                        layerConfig.currentRequestTimeout = null;
                        layerConfig.loading = false;
                        deferred.resolve();
                    });
                } else if (layerConfig.clusterMode === 'auto') {
                    layerConfig.loading = true;
                    // Auto-decide what to do depending on the number of items
                    var parameters = angular.extend({}, layerConfig.context.parameters, {
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                    });
                    ODSAPI.records.boundingbox(layerConfig.context, parameters).success(function(data) {
                        /*
                            0 < x < DOWNLOAD_CAP : Download all points
                            DOWWNLOAD_CAP < x < [SHAPEPREVIEW/POLYGONCLUSTERS]_HIGHCAP: call geopreview/geopolygon
                         */
                        // TODO: Use geopreview when low cap?
                        // TODO: Factorize the "service.buildRawLayer..." which is already used above
                        var DOWNLOAD_CAP = 200;
                        var SHAPEPREVIEW_HIGHCAP = 500000;
                        // The number of points where we stop asking for the polygon representing the cluster's content
                        var POLYGONCLUSTERS_HIGHCAP = 500000;

                        var returnPolygons = (data.count < POLYGONCLUSTERS_HIGHCAP);

                        if (data.count < DOWNLOAD_CAP || map.getZoom() === map.getMaxZoom()) {
                            // Low enough: always download
                            service.buildRawLayer(layerConfig, map, timeout).then(function(rawLayer) {
                                service.swapLayers(map, previousRenderedLayer, rawLayer);
                                layerConfig.rendered = rawLayer;
                                layerConfig.currentRequestTimeout = null;
                                layerConfig.loading = false;
                                deferred.resolve();
                            });
                        } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                            // We take our decision depending on the content of the envelope
                            if (data.geometries.Point && data.geometries.Point > data.count/2) {
                                // Geo polygons
                                service.buildClusteredLayer(layerConfig, map, timeout, returnPolygons).then(function(clusteredLayer) {
                                    service.swapLayers(map, previousRenderedLayer, clusteredLayer);
                                    layerConfig.rendered = clusteredLayer;
                                    layerConfig.currentRequestTimeout = null;
                                    layerConfig.loading = false;
                                    deferred.resolve();
                                });
                            } else {
                                // Geo preview
                                service.buildShapePreviewLayer(layerConfig, map, timeout).then(function(previewLayer) {
                                    service.swapLayers(map, previousRenderedLayer, previewLayer);
                                    layerConfig.rendered = previewLayer;
                                    layerConfig.currentRequestTimeout = null;
                                    layerConfig.loading = false;
                                    deferred.resolve();
                                });
                            }
                        } else {
                            // Clusters
                            service.buildClusteredLayer(layerConfig, map, timeout, returnPolygons).then(function(clusteredLayer) {
                                service.swapLayers(map, previousRenderedLayer, clusteredLayer);
                                layerConfig.rendered = clusteredLayer;
                                layerConfig.currentRequestTimeout = null;
                                layerConfig.loading = false;
                                deferred.resolve();
                            });
                        }
                    });
                }
                return deferred.promise;
            },
            swapLayers: function(map, oldLayer, newLayer) {
                if (oldLayer) {
                    map.removeLayer(oldLayer);
                }
                map.addLayer(newLayer);
            },
            /*                               */
            /*          RENDERING            */
            /*                               */
            buildRawLayer: function(layerConfig, map, timeout) {
                var service = this;
                var deferred = $q.defer();
                var markerLayerGroup = new L.LayerGroup();
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'rows': 10000,
                    'format': 'json',
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });
                // Which fields holds the geometry?
                var shapeFields = layerConfig.context.dataset.getFieldsForType('geo_shape');
                var shapeField = shapeFields.length ? shapeFields[0].name : null;
                ODSAPI.records.download(layerConfig.context, parameters, timeout.promise).success(function (data) {
                    for (var i = 0; i < data.length; i++) {
                        var record = data[i];
                        var geoJSON;

                        if (shapeField) {
                            if (record.fields[shapeField]) {
                                geoJSON = record.fields[shapeField];
                                if (geoJSON.type === 'Point' && angular.isDefined(record.geometry)) {
                                    // Due to a problem with how we handke precisions, we query a point with a lower precision than
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
                            (function(geoJSON, record) {
                                SVGInliner.getPromise(PictoHelper.mapPictoToURL(layerConfig.picto, layerConfig.context), layerConfig.marker ? 'white' : service.getRecordColor(record, layerConfig)).then(function(svg) {
                                    var singleMarker = new L.VectorMarker([geoJSON.coordinates[1], geoJSON.coordinates[0]], {
                                        color: service.getRecordColor(record, layerConfig),
                                        icon: svg,
                                        marker: layerConfig.marker
                                    });
                                    service.bindTooltip(map, singleMarker, layerConfig, geoJSON, record.recordid);
                                    markerLayerGroup.addLayer(singleMarker);
                                });
                            }(geoJSON, record));
                        } else {
                            var shapeLayer = new L.GeoJSON(geoJSON, {
                                style: function(feature) {
                                    var opts = {
                                        radius: 3,
                                        weight: 1,
                                        opacity: 0.9,
                                        fillOpacity: 0.5,
                                        color: service.getRecordColor(record, layerConfig)
                                    };
                                    opts.fillColor = service.getRecordColor(record, layerConfig);
                                    if (angular.isDefined(layerConfig.opacity)) {
                                        opts.fillOpacity = layerConfig.opacity;
                                    }
                                    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                                        opts.weight = 5;
                                        opts.color = service.getRecordColor(record, layerConfig);
                                    } else {
                                        if (angular.isDefined(layerConfig.borderColor)) {
                                            opts.color = layerConfig.borderColor;
                                        } else {
                                            opts.color = "#fff";
                                        }
                                    }
                                    return opts;
                                }
                            });
                            service.bindTooltip(map, shapeLayer, layerConfig, geoJSON, record.recordid);
                            markerLayerGroup.addLayer(shapeLayer);
                        }


                    }
                    deferred.resolve(markerLayerGroup);
                });
                return deferred.promise;
            },
            buildClusteredLayer: function(layerConfig, map, timeout, showPolygons) {
                var service = this;
                var deferred = $q.defer();
                var layerGroup = new L.LayerGroup();
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'clusterdistance': 50,
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds()),
                    'return_polygons': showPolygons
                });

                if (layerConfig.func !== 'COUNT' && service.isAnalyzeEnabledClustering(layerConfig)) {
                    parameters['y.serie1.expr'] = layerConfig.expr;
                    parameters['y.serie1.func'] = layerConfig.func;
                }

                ODSAPI.records.geo(layerConfig.context, parameters, timeout.promise).success(function(data) {
                    // Display the clusters
                    var records = data.clusters;
                    for (var i=0; i<records.length; i++) {
                        var record = records[i];
                        if (record.count === 1 && layerConfig.clusterMode !== 'polygonforced') {
                            (function(record) {
                                SVGInliner.getPromise(PictoHelper.mapPictoToURL(layerConfig.picto, layerConfig.context), layerConfig.marker ? 'white' : layerConfig.color).then(function(svg) {
                                    var singleMarker = new L.VectorMarker(record.cluster_center, {
                                        color: layerConfig.color,
                                        icon: svg,
                                        marker: layerConfig.marker
                                    });
                                    service.bindTooltip(map, singleMarker, layerConfig, record.cluster);
                                    layerGroup.addLayer(singleMarker);
                                });
                            }(record));
                            //layerGroup.addLayer(new L.Marker(record.cluster_center)); // Uncomment to debug pointer alignment
                        } else {
                            var clusterValue = service.getClusterValue(record, layerConfig);
                            if (clusterValue !== null) {
                                var clusterMarker = new L.ClusterMarker(record.cluster_center, {
                                    geojson: record.cluster,
                                    value: service.getClusterValue(record, layerConfig),
                                    total: service.getClusterMax(data, layerConfig),
                                    color: layerConfig.color,
                                    numberFormattingFunction: service.formatNumber
                                });
                                service.bindZoomable(map, clusterMarker, layerConfig);
                                layerGroup.addLayer(clusterMarker);
                            }
                        }
                    }
                    deferred.resolve(layerGroup);
                });
                return deferred.promise;
            },
            buildHeatmapLayer: function(layerConfig, map, timeout) {
                var service = this;
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

                if (layerConfig.func !== 'COUNT' && service.isAnalyzeEnabledClustering(layerConfig)) {
                    parameters['y.serie1.expr'] = layerConfig.expr;
                    parameters['y.serie1.func'] = layerConfig.func;
                }

                ODSAPI.records.geo(layerConfig.context, parameters, timeout.promise).success(function(data) {
                    // Display the clusters
                    var records = data.clusters;

                    heatmapLayer.options.radius.value = Math.min((1/data.clusters.length)*4000 + 20, 50);

                    var heatmapData = [];
                    for (var i=0; i<records.length; i++) {
                        var record = records[i];
                        var clusterValue = service.getClusterValue(record, layerConfig);
                        if (clusterValue !== null) {
                            heatmapData.push({
                                lat: record.cluster_center[0],
                                lon: record.cluster_center[1],
                                value: service.getClusterValue(record, layerConfig) - service.getClusterMin(data, layerConfig) + 1 // FIXME: the 1 should be proportional (and if the min is really 0 then it is false)
                            });
                        }
                    }
                    if (heatmapData.length > 0) {
                        heatmapLayer.setData(heatmapData);
                    }
                    deferred.resolve(heatmapLayer);
                });
                return deferred.promise;
            },
            buildAggregationLayer: function(layerConfig, map, timeout) {
                var service = this;
                var deferred = $q.defer();
                var shapeLayerGroup = new L.LayerGroup();

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
                    getShape = function(item) {
                        if (angular.isArray(item.x) && item.x[0].fields) {
                            return item.x[0].fields[shapefield];
                        } else {
                            return null;
                        }
                    };
                    getItems = function(rawResult) {
                        return rawResult.results;
                    };
                    var joinedFields = shapefield;
                    if (layerConfig.hoverField) {
                        joinedFields += ',' + layerConfig.hoverField
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
                    getShape = function(item) {
                        return item.cluster;
                    };
                    getItems = function(rawResult) {
                        return rawResult.clusters;
                    };

                    parameters = angular.extend({}, layerConfig.context.parameters, {
                        'clusterprecision': map.getZoom(),
                        'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                    });

                    if (layerConfig.func !== 'COUNT' && service.isAnalyzeEnabledClustering(layerConfig)) {
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
                    var min = service.getClusterMin(rawResult, layerConfig);
                    var max = service.getClusterMax(rawResult, layerConfig);
                    var values = service.getClusterValues(rawResult, layerConfig);

                    var colorScale = function(value) { return service.getColor(value, layerConfig, min, max, values.length); };

                    var geojsonOptions = {
                        radius: 3,
                        color: "#fff",
                        weight: 1,
                        opacity: 0.9,
                        fillOpacity: 0.5
                    };

                    // Legend is only supported for "scale" colors (we may implement it for "range" as well later)
                    if (!(angular.isObject(layerConfig.color) && layerConfig.color.type === 'range') && ((layerConfig.func !== 'COUNT' && service.isAnalyzeEnabledClustering(layerConfig)) || min !== max)) {
                        L.Legend = L.Control.extend({
                            initialize: function(options) {
                                L.Control.prototype.initialize.call(this, options);
                            },
                            onAdd: function(map) {
                                var grades = chroma.scale().domain([min, max], Math.min(10, values.length)).domain(),
                                    htmlContent = '';

                                var legendDiv = L.DomUtil.create('div', 'info legend');
                                var datasetTitle = layerConfig.context.dataset.datasetid;
                                var fieldName = layerConfig.expr;
                                //if ($scope.datasetSchemas && $scope.datasetSchemas[datasetConfig.datasetid]) {
                                    if (fieldName) {
                                        fieldName = layerConfig.context.dataset.getFieldLabel(layerConfig.expr);
                                    }
                                    datasetTitle = layerConfig.context.dataset.metas.title;
                                //}
                                htmlContent += '<div class="title">' + datasetTitle + '<br/>' + AggregationHelper.getFunctionLabel(layerConfig.func);
                                if (layerConfig.func !== 'COUNT') {
                                    htmlContent += ' ' + fieldName;
                                }
                                htmlContent += '</div>';
                                htmlContent += '<div class="colors">';
                                if (values.length === 1) {
                                    htmlContent += '<i class="color_0" style="width: 90%; background-color:' + colorScale((grades[0] + grades[1]) / 2) + '; opacity: 1;"></i>';
                                    htmlContent += '</div><div class="counts">';
                                    htmlContent += '<span>';
                                    htmlContent += service.formatNumber(grades[0]);
                                    htmlContent += '</span>';
                                } else {
                                    var widthPercent = 90 / (grades.length - 1);
                                    // loop through our density intervals and generate a label with a colored square for each interval
                                    for (var i = 0; i < grades.length - 1; i++) {
                                        htmlContent += '<i class="color_' + i + '" style="width:' + widthPercent + '%; background-color:' + colorScale((grades[i] + grades[i + 1]) / 2) + '; opacity: 1;"></i>';
                                    }
                                    htmlContent += '</div><div>';
                                    htmlContent += '<span>';
                                    htmlContent += service.formatNumber(grades[0]);
                                    htmlContent += '</span>';
                                    htmlContent += '<span>';
                                    htmlContent += service.formatNumber(grades[grades.length - 1]);
                                    htmlContent += '</span>';
                                }
                                htmlContent += '</div>';

                                legendDiv.innerHTML = htmlContent;
                                return legendDiv;
                            }
                        });
                        var legend = new L.Legend({position: 'bottomleft'});
                        var addLegend = function(e) {
                            if (e.layer === shapeLayerGroup) {
                                map.addControl(legend);
                                map.off('layeradd', addLegend);
                            }
                        };
                        map.on('layeradd', addLegend);
                        var removeLegend = function(e) {
                            if (e.layer === shapeLayerGroup) {
                                map.removeControl(legend);
                                map.off('layerremove', removeLegend);
                            }
                        };
                        map.on('layerremove', removeLegend);
                    }

                    var bindMarkerOver = function(layerConfig, marker, record, recordid) {
                        marker.on('mouseover', function(e) {
                            var layer = e.target;
                            layer.setStyle({
                                weight: 2
                            });
                        });
                        marker.on('mouseout', function(e) {
                            var layer = e.target;
                            layer.setStyle({
                                weight: 1
                            });
                        });
                    };

                    for (var i=0; i < records.length; i++) {
                        var record = records[i];
                        var value = service.getClusterValue(record, layerConfig);
                        var shapeLayer, shape;
                        var pointToLayer = function (feature, latlng) { return L.circleMarker(latlng, geojsonOptions); };

                        if (value !== null) {
                            shape = getShape(record);
                            if (shape) {
                                shapeLayer = new L.GeoJSON(shape, {
                                    pointToLayer: pointToLayer,
                                    highlight: service.getColor(value, layerConfig, min, max, values.length),
                                    style: function (feature) {
                                        var opts = angular.copy(geojsonOptions);
                                        opts.fillColor = colorScale(value);
                                        if (angular.isDefined(layerConfig.opacity)) {
                                            opts.fillOpacity = layerConfig.opacity;
                                        }
                                        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                                            opts.weight = 5;
                                            opts.color = colorScale(value);
                                        } else {
                                            if (angular.isDefined(layerConfig.borderColor)) {
                                                opts.color = layerConfig.borderColor;
                                            }
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
                                            service.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest, record.x[0].fields[layerConfig.hoverField]);
                                        }
                                    } else {
                                        if (layerConfig.refineOnClick) {
                                            service.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest);
                                        }
                                    }
                                } else {
                                    if ((layerConfig.func !== 'COUNT' && service.isAnalyzeEnabledClustering(layerConfig)) || min !== max) {
                                        shapeLayer.bindLabel(service.formatNumber(value));
                                    }
                                    if (layerConfig.refineOnClick) {
                                        // We're not sure yet what we want to show when we click on an aggregated shape, so we just handled
                                        // refine on click for now.
                                        service.bindTooltip(map, shapeLayer, layerConfig, shape, null, record.geo_digest);
                                    }
                                }
                                shapeLayerGroup.addLayer(shapeLayer);
                            }
                        }
                    }
                    deferred.resolve(shapeLayerGroup);
                }


                return deferred.promise;
            },
            buildShapePreviewLayer: function(layerConfig, map, timeout) {
                var service = this;
                var deferred = $q.defer();
                var parameters = angular.extend({}, layerConfig.context.parameters, {
                    'rows': 1000,
                    'clusterprecision': map.getZoom(),
                    'geofilter.bbox': ODS.GeoFilter.getBoundsAsBboxParameter(map.getBounds())
                });
                var layerGroup = new L.LayerGroup();
                ODSAPI.records.geopreview(layerConfig.context, parameters, timeout.promise).success(function(data) {
                    var shape;
                    for (var i = 0; i < data.length; i++) {
                        shape = data[i];
                        var geojsonOptions = {
                            radius: 3,
                            color: "#fff",
                            weight: 1,
                            opacity: 0.9,
                            fillOpacity: 0.5,
                            fillColor: layerConfig.color
                        };

                        var shapeLayer = new L.GeoJSON(shape.geometry, {
                            pointToLayer: function (feature, latlng) {
                                return L.circleMarker(latlng, geojsonOptions);
                            },
                            style: function(feature) {
                                var opts = angular.copy(geojsonOptions);
                                if (angular.isDefined(layerConfig.opacity)) {
                                    opts.fillOpacity = layerConfig.opacity;
                                }
                                if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                                    opts.weight = 5;
                                    opts.color = layerConfig.color;
                                } else {
                                    if (angular.isDefined(layerConfig.borderColor)) {
                                        opts.color = layerConfig.borderColor;
                                    }
                                }
                                return opts;
                            }
                        });

                        layerGroup.addLayer(shapeLayer);
                        service.bindTooltip(map, shapeLayer, layerConfig, shape.geometry, null, shape.geo_digest);
                    }
                    deferred.resolve(layerGroup);
                });
                return deferred.promise;
            },
            getRecordColor: function(record, layerConfig) {
                // A record may only be colored if there is a configured field to color it from
                // Aggregation results may be colored from their values
                if (angular.isString(layerConfig.color)) {
                    return layerConfig.color;
                } else if (layerConfig.color.type === 'range') {
                    if (layerConfig.color.field) {
                        var value = record.fields[layerConfig.color.field];
                        if (angular.isUndefined(value)) {
                            return layerConfig.color.colors[0];
                        }
                        return this.getColor(value, layerConfig);
                    } else {
                        console.error('Range coloring requires a field');
                        return layerConfig.color.colors[0];
                    }
                    // TODO
                } else {
                    // Scale is not supported for records (yet?)
                    console.error('Scale coloring is not supported for simple records');
                    return chroma.scale(layerConfig.color.scale).out('hex').scale(0);
                }
            },
            getColor: function(value, layerConfig, min, max, scaleSteps) {
                scaleSteps = scaleSteps || 10;
                if (angular.isString(layerConfig.color)) {
                    if (angular.isDefined(min) && angular.isDefined(max)) {
                        return chroma.scale([chroma(layerConfig.color).brighten(50), layerConfig.color]).domain([min, max], Math.min(10, scaleSteps)).out('hex')(value);
                    } else {
                        // Simple color
                        return layerConfig.color;
                    }
                } else {
                    if (layerConfig.color.type === 'scale') {
                        return chroma.scale(layerConfig.color.scale).domain([min, max], Math.min(10, scaleSteps)).out('hex')(value);
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
                newScope.template = layerConfig.tooltipTemplate || dataset.extra_metas && dataset.extra_metas.visualization && dataset.extra_metas.visualization.map_tooltip_html || '';
                var popupOptions = {
                    offset: [0, angular.isDefined(yOffset) ? yOffset : -30],
                    maxWidth: 250,
                    minWidth: 250
                    //autoPanPaddingTopLeft: [50, 305]
                };
                newScope.context = layerConfig.context;
                // TODO: Move the custom template detection from the dataset inside geoscroller? (the dataset object is available in the context)
                var popup = new L.Popup(popupOptions).setLatLng(latLng)
                    .setContent($compile('<geo-scroller tooltip-sort="'+(layerConfig.tooltipSort||'')+'" shape="shape" recordid="recordid" context="context" map="map" template="{{ template }}" grid-data="gridData" geo-digest="'+(geoDigest||'')+'"></geo-scroller>')(newScope)[0]);
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
                if (layerConfig.clusterMode === 'aggregation' && layerConfig.joinContext) {
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
                if (layerConfig.clusterMode === 'aggregation' && layerConfig.joinContext) {
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
                if (layerConfig.clusterMode === 'aggregation' && layerConfig.joinContext) {
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
                if (layerConfig.clusterMode === 'aggregation' && layerConfig.joinContext) {
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
                return layerConfig.clusterMode === 'heatmap' || layerConfig.clusterMode === 'polygonforced' || layerConfig.clusterMode === 'shape' || layerConfig.clusterMode === 'aggregation';
            },
            doesLayerRefreshOnLocationChange: function(layerConfig) {
                if (layerConfig.clusterMode === 'tiles') {
                    return false;
                } else if ((layerConfig.clusterMode === 'shape' || layerConfig.clusterMode === 'aggregation') && layerConfig.joinContext) {
                    // We got all the data at once
                    return false;
                } else {
                    return true;
                }
            }
        };
    }]);
}());