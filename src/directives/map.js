(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    /*
    NOTE: There has been a change in terminology between Cartograph v1 and Cartograph v2 (current version); due to
    retrocompatibility reasons, the old terminology is still used in the map data structure, and therefore you will
    encounter references to it in the code.
    - A "layer" (a group of datasets that you can show/hide and document) is now a "layer group"
    - An "active dataset" is now a "layer"
     */

    /* Migration note (for Cartograph)
      "activeDatasets": [
        {
          "searchParameters": {},
          "color": "#C32D1C",
          "expr": "id_geofla",
          "picto": "icon-circle",
          "clusterMode": "polygon",
          "func": "COUNT",
          "marker": true,
          "datasetid": "geoflar-communes-2"
        },

        BECOMES
      "activeDatasets": [
        {
          "context": <context>
          "color": "#C32D1C",
          "expr": "id_geofla",
          "picto": "icon-circle",
          "clusterMode": "polygon",
          "func": "COUNT",
          "marker": true,
        },

     When persisting, the context can be serialized as a datasetid and searchparameters. We trust Cartograph to make the
     transformation in both direction.
     */
    mod.directive('odsMap', ['URLSynchronizer', 'MapHelper', 'ModuleLazyLoader', 'ODSWidgetsConfig', 'MapLayerRenderer', 'translate', 'translatePlural', '$q', '$timeout', '$location', function(URLSynchronizer, MapHelper, ModuleLazyLoader, ODSWidgetsConfig, MapLayerRenderer, translate, translatePlural, $q, $timeout, $location) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMap
         * @scope
         * @restrict E
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {boolean} [syncToUrl] If true, persists the `location` and `basemap` in the page's URL.
         * @param {Object} [syncToObject] An object where the `location` and `basemap` selection is kept. You can use it from
         * another widget to read the location or basemap.
         * @param {string} [location] The default location of the map upon initialization, under the following format: "zoom,latitude,longitude".
         * For example, to have a map centered on Paris, France, you can use "12,48.85218,2.36996". By default, if a location is not specified,
         * the map will try to fit all the displayed data when initializing.
         * @param {string} [basemap] The identifier of the basemap to use by default, as defined in {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.basemaps}. By default,
         * the first available basemap will be used.
         * @param {string} [tooltipSort] The identifier of the field used to define the tooltips rendering order at a same spot. Use "field" for default sort, use "-field" for reversed sort.
         * By default, numeric fields are sorted in decreasing order, date and datetime are sorted chronologically, and text fields are sorted alphanumerically.
         * @param {boolean} [staticMap] If "true", then users won't be able to move or zoom on the map. They will still be able to click on markers.
         * @param {boolean} [noRefit] By default, the map refits its view whenever the displayed data changes.
         * If "true", then the map will stay at the same location instead.
         * @param {boolean} [toolbarGeolocation=true] If "false", then the "geolocate" button won't be displayed in the map's toolbar.
         * @param {boolean} [toolbarDrawing=true] If "false", then the drawing tools (to draw filter areas) won't be displayed in the map's toolbar.
         * @param {boolean} [toolbarFullscreen=true] If "false", then the "go fullscreen" button won't be displayed in the map's toolbar.
         * @param {boolean} [scrollWheelZoom=true] If "false", then scrolling your mouse wheel over the map won't zoom/unzoom it.
         * @param {integer} [minZoom=none] Limits the map to a minimum zoom value. By default this is defined by the minimum zoom of the basemap.
         * @param {integer} [maxZoom=none] Limits the map to a maximum zoom value. By default this is defined by the maximum zoom of the basemap.
         * @param {boolean} [odsAutoResize] see {@link ods-widgets.directive:odsAutoResize Auto Resize} for more informations
         * @param {boolean} [autoGeolocation=false] If "true", then the geolocation (center and zoom the map on the location of the user) is automatically done upon initialization.
         * Only available when there is no `location` parameter on the widget.
         * Warning: location sharing must be allowed priorly for Firefox users when multiple odsMap widget are set with autoGeolocation=true on the same page
         * @param {boolean} [displayControl=false] If true, displays a control to toggle display of groups (or single datasets outside groups). Note:
         * it shouldn't be combined with the usage of `showIf` on `odsMapLayer`, as it will lead to inconsistencies in the user interface.
         * @param {boolean} [displayControlSingleLayer=false] If true, only one layer will be displayed at a time using the control to toggle the display of groups.
         * @param {boolean} [searchBox=false] If true, a search box will appear in the map, allowing you to jump to locations, or search data on the map.
         *
         * @description
         * This widget allows you to build a map visualization and show data using various modes of display using layers.
         * Each layer is based on a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, a mode of display (clusters...), and various properties to define the
         * display itself, such as colors.
         *
         * Layers can be combined, so that you map shows various data sources in various ways.
         *
         * Layers are dynamic, which means that if a context changes (e.g. a new refine is added), the layer will be refreshed and display the new relevant data.
         *
         * This widget can also be used to control other widgets: you can configure a layer to act as a refine control on another context, so that for example
         * if you click on a road you get a {@link ods-widgets.directive:odsTable table view} of the traffic on that road. You can also draw zones on the map,
         * which will accordingly refine the context.
         *
         * You can use the widget alone to propose a simple map using default settings, such as this:
         * <pre>
         *     <!-- Displays a map of Paris using the data from mycontext and an automatic visualization mode (clusters or shapes depending on the zoom level) -->
         *     <ods-map context="mycontext" location="12,48.85218,2.36996"></ods-map>
         * </pre>
         *
         * However, the ability to build a more advanced and configurable map comes with a second `odsMapLayer` tag, used to define a layer:
         *
         * <pre>
         *     <!-- A map containing a single layer to display data from mycontext, in a specific color, and as clusters. -->
         *     <ods-map>
         *         <ods-map-layer context="mycontext" color="#FF0000" display="clusters"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * You can have several layers, each with their own configuration and context:
         *
         * <pre>
         *     <ods-map>
         *         <ods-map-layer context="mycontext" color="#FF0000" display="clusters"></ods-map-layer>
         *         <ods-map-layer context="mycontext2" display="heatmap"></ods-map-layer>
         *         <ods-map-layer context="mycontext3" display="raw" color="#0000FF"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * You can show or hide layers using the `showIf` property, similar to Angular's `ngIf`.
         *
         * <pre>
         *     <ods-map>
         *         <ods-map-layer context="mycontext" color="#FF0000" display="clusters"></ods-map-layer>
         *         <ods-map-layer context="mycontext2" display="heatmap" show-if="showHeatmap"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * You can also configure layers to only be visible between certain zoom levels, using `showZoomMin`,
         * `showZoomMax`, or both.
         *
         * <pre>
         *     <!-- In this example I want to show only one layer at a time, but change it as the user zooms in the map. -->
         *     <ods-map>
         *         <!-- This layer is only visible up to zoom 8 -->
         *         <ods-map-layer context="mycontext1" show-zoom-max="8"></ods-map-layer>
         *         <!-- This layer appears between zoom 9 and 14 -->
         *         <ods-map-layer context="mycontext2" show-zoom-min="9" show-zoom-max="14"></ods-map-layer>
         *         <!-- This layer is visible starting at zoom 15 -->
         *         <ods-map-layer context="mycontext3" show-zoom-min="15"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * Several display modes are available, under two categories: visualization of the data itself (each point is a record),
         * and visualization of an aggregation of data (each point is the result of an aggregation function).
         *
         * - `auto`: depending on the number of points and the type of geometry, the best display mode is automatically chosen. This is the default display
         * mode, and makes sense mot of the time of you want to simply represent geo data.
         * - `raw`: data is downloaded and displayed directly as is, with no clustering or simplification of any kind. Do not
         * use on large (1000+) datasets, as it may freeze the user's browser.
         * - `clusters`: data is aggregated spatially into clusters; each cluster represents two or more "close" points. When at maximum
         * zoom, all points are shown.
         * - `clustersforced`: data is aggregated spatially into clusters, but the number on the cluster is the result of an aggregation function.
         * - `heatmap`: data is displayed as a heatmap; by default it represents the density of points, but it can be the result of an aggregation function.
         * - `aggregation`: data is aggregated based on their geo shape (e.g. two records with the exact same associated shape); by default the color represents
         * the number of aggregated records, but it can be the result of an aggregation function. This mode supports aggregating the context
         * using a join with another context that contains geometrical shapes: use a `joinContext` property, and `localKey` and `remoteKey` to configure
         * the field names of the local and joined datasets; you can also configure one of the fields from the "remote" dataset to be displayed when the mouse
         * hovers the shapes, using `hoverField` and the name of a field.
         *
         * You can specify aggregation functions on display modes that support it (`aggregation`, `heatmap`, `clustersforced`).
         * This is done using two parameters: `function` (AVG for average, MIN for minimum, MAX for maximum, STDDEV for standard deviation,
         * COUNT to count the number of records, SUM for the sum of values), and `expression` to define the value used for the
         * function, usually the name of a field (`expression` is not required when the function is COUNT).
         *
         * <pre>
         *     <ods-map>
         *         <!-- Display a heatmap of the average value -->
         *         <ods-map-layer context="mycontext" display="heatmap" expression="value" function="AVG"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * Apart from `heatmap`, all display modes support color configuration. Three types of configurations are available, depending on the display mode.
         *
         * - `color`: a simple color, as an hex code (#FF0F05) or a simple CSS color name like "red". Available for any mode except `heatmap`.
         * - `colorScale`: the name of a ColorBrewer [http://colorbrewer2.org/] scheme, like "YlGnBu". Available for `aggregation`.
         * - `colorRanges`: a serie of colors and ranges separated by a semicolon, to decide a color depending on a value. For example "red;20;orange;40;#00CE00" to color anything between
         * 20 and 40 in orange, below 20 in red, and above 40 in a custom hex color. Combine with a decimal or integer field name in `colorByField` to configure which field will be
         * used to decide on the color (for `raw`) or with `function` and `expression` to determine the calculation used for the color (for `aggregation`). Available for `raw` and `aggregation`.
         *
         * An additional `colorFunction` property can contain the `log` value to use logarithmic scales (instead of the default linear scale) for generating the color scale. Available for `aggregation` and with `color` and `colorScale` display modes (or when none is specified).
         *
         * On top of color configuration, the icon used as a marker on the map can be configured through the `picto`
         * property. The property supports the keywords listed in the <a href="https://help.opendatasoft.com/platform/en/other_resources/pictograms_reference/pictograms_reference.html" target="_blank">Pictograms reference</a>
         *
         * When displaying shapes, you can also use `borderColor` and `opacity` to configure the color of the shape border and the opacity of the shape's fill.
         *
         * If you are displaying data where multiple points or shapes are stacked, you can configure the order in which the items will be
         * displayed in the tooltip, using `tooltipSort` and the name of a field, prefixed by `-` to have a reversed sort.
         * Note: by default, numeric fields are sorted in decreasing order, date and datetime are sorted chronologically, and text fields are sorted
         * alphanumerically.
         *
         * <pre>
         *     <ods-map>
         *         <!-- Reverse sort on 'field' -->
         *         <ods-map-layer context="mycontext" tooltip-sort="-field"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         *
         * By default, tooltips show the values associated with a point or shape in a simple template. You can configure your own template by adding
         * HTML inside the `<ods-map-layer></ods-map-layer>` tag. Your template is AngularJS-enabled and will be provided with a `record` object; this object contains
         * a `fields` object with all the values associated with the clicked point or shape.
         *
         * <pre>
         *    <ods-map location="12,48.86167,2.34146">
         *        <ods-map-layer context="mycontext">
         *            <div>my value is: {{record.fields.myvalue}}</div>
         *        </ods-map-layer>
         *    </ods-map>
         * </pre>
         *
         *
         * If tooltips are not relevant for your data, you can disable them by using the `tooltip-disabled="true"` option.
         *
         * <pre>
         *    <ods-map>
         *        <ods-map-layer context="mycontext" tooltip-disabled="true"></ods-map-layer>
         *    </ods-map>
         * </pre>
         *
         *
         * If your layer is displayed as `raw` or `aggregation`, you can configure a layer so that a click on an item triggers a refine on another context, using `refineOnClickContext`.
         * One or more contexts can be defined:
         * <pre>
         *     <ods-map>
         *         <ods-map-layer context="mycontext" refine-on-click-context="mycontext2"></ods-map-layer>
         *         <ods-map-layer context="mycontext3" refine-on-click-context="[mycontext4, mycontext5]"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * By default, the filter occurs on geometry; for example, clicking on a shape filters the other context on the area.
         * You can also trigger a refine on specific fields; using `refineOnClickMapField` to configure the name of the field to get the value from, and `refineOnClickContextField`
         * to configure the name of the field of the other context to refine on. If you have two or more contexts, you can configure the fields by indicating the context in the
         * name of the property, as `refineOnClick[context]MapField` and `refineOnClick[context]ContextField`.
         *
         * <pre>
         *     <ods-map>
         *         <ods-map-layer context="mycontext" refine-on-click-context="[mycontext, mycontext2]"
         *                                            refine-on-click-mycontext-map-field="field1"
         *                                            refine-on-click-mycontext-context-field="field2"
         *                                            refine-on-click-mycontext2-map-field="field3"
         *                                            refine-on-click-mycontext2-context-field="field4"></ods-map-layer>
         *     </ods-map>
         * </pre>
         *
         * When you first load the map (if there is no `location` parameter), and when your context parameters change, the
         * map is refreshed and moves to fit the content of the new data to display. If you want to exclude a layer's data
         * from the new position's calculation, you can use `excludeFromRefit`:
         *
         * <pre>
         *     <ods-map>
         *         <ods-map-layer context="mycontext"></ods-map-layer>
         *         <ods-map-layer context="mycontext3" exclude-from-refit="true"></ods-map-layer>
         *     </ods-map>
         * </pre>
         */
        return {
            restrict: 'EA',
            scope: {
                context: '=',
                syncToUrl: '@',
                syncToObject: '=',
                location: '@', // Hard-coded location (widget)
                basemap: '@', // Hard-coded basemap (widget),
                staticMap: '@', // Prevent the map to be moved,
                noRefit: '@',
                autoResize: '@',
                autoGeolocation: '@',
                toolbarDrawing: '@',
                toolbarGeolocation: '@',
                toolbarFullscreen: '@',
                scrollWheelZoom: '@',
                minZoom: '@',
                maxZoom: '@',
                displayControl: '=?',
                displayControlSingleLayer: '=?',
                searchBox: '=?',
                displayLegend: '=?',
                mapConfig: '=?',
                dynamicConfig: '=?'
            },
            transclude: true,
            template: '' +
            '<div class="odswidget odswidget-map">' +
            '    <div class="odswidget odswidget-map__map" ng-class="{\'odswidget-map__map--with-searchbox\': searchBox, \'odswidget-map__map--with-display-control\': displayControl}"></div>' +
            '    <div class="odswidget-overlay map odswidget-overlay--opaque" ng-show="initialLoading">' +
            '        <ods-spinner></ods-spinner>' +
            '    </div>' +
            '    <div class="odswidget-map__loading" ng-show="loading">' +
            '        <ods-spinner></ods-spinner>' +
            '    </div>' +
            '    <div class="ods-message-box ods-message-box--warning odswidget-map__limited-data-warning" ng-if="partialDataLayersArray.length > 0"><i class="fa fa-fw fa-warning"></i><span translate><a ods-tooltip="{{ partialDataLayers }}" ods-tooltip-direction="top">Some layers</a> show partial results for performance reasons. Try zooming in.</span></div>' +
            '    <ods-map-display-control ng-if="displayControl && allContextsInitialized" single-layer="displayControlSingleLayer" map-config="mapConfig"></ods-map-display-control>' +
            '    <ods-map-search-box ng-if="searchBox"></ods-map-search-box>' +
            '    <ods-map-legend ng-if="displayLegend && allContextsInitialized" map-config="mapConfig"></ods-map-legend>' +
            '    <div ng-transclude></div>' + // Can't find any better solution...
            '    <div ng-if="forcedTimezone" class="map-timezone-caption">' +
            '       <i class="fa fa-info" aria-hidden="true"></i>' +
            '       All dates and times are in {{ forcedTimezone }} time.' +
            '    </div>' +
            '</div>',
            link: function(scope, element, attrs, ctrl) {
                var mapElement = angular.element(element.children()[0]);
                // "Porting" the attributes to the real map.
                if (attrs.id) { mapElement.attr('id', attrs.id); }
                if (attrs.style) { mapElement.attr('style', attrs.style); }
                if (attrs['class']) { mapElement.addClass(attrs['class']); }
                if (attrs.odsAutoResize === 'true' || attrs.odsAutoResize === '') {scope.autoResize = 'true'; }

                var isStatic = scope.staticMap && scope.staticMap.toLowerCase() === 'true';
                var noRefit = scope.noRefit && scope.noRefit.toLowerCase() === 'true';
                var toolbarDrawing = !(scope.toolbarDrawing && scope.toolbarDrawing.toLowerCase() === 'false');

                var toolbarGeolocation,
                    toolbarFullscreen,
                    autoGeolocation;
                scope.forcedTimezone = null;

                if (angular.isUndefined(scope.toolbarGeolocation)) {
                    if (angular.isDefined(scope.mapConfig.toolbarGeolocation)) {
                        toolbarGeolocation = !!scope.mapConfig.toolbarGeolocation;
                    } else {
                        // if nothing is defined, default is true
                        toolbarGeolocation = true;
                    }
                } else {
                    toolbarGeolocation = !(scope.toolbarGeolocation && scope.toolbarGeolocation.toLowerCase() === 'false');
                }
                if (angular.isUndefined(scope.toolbarFullscreen)) {
                    if (angular.isDefined(scope.mapConfig.toolbarFullscreen)) {
                        toolbarFullscreen = !!scope.mapConfig.toolbarFullscreen;
                    } else {
                        // if nothing is defined, default is true
                        toolbarFullscreen = true;
                    }
                } else {
                    toolbarFullscreen = !(scope.toolbarFullscreen && scope.toolbarFullscreen.toLowerCase() === 'false');
                }
                if (angular.isUndefined(scope.autoGeolocation)) {
                    autoGeolocation = !!scope.mapConfig.autoGeolocation;
                } else {
                    autoGeolocation = scope.autoGeolocation && scope.autoGeolocation.toLowerCase() === 'true';
                }


                if (angular.isUndefined(scope.displayControl)) {
                    scope.displayControl = scope.mapConfig.layerSelection;
                }
                if (angular.isUndefined(scope.displayLegend)) {
                    scope.displayLegend = true;
                }
                if (angular.isUndefined(scope.displayControlSingleLayer)) {
                    scope.displayControlSingleLayer = scope.mapConfig.singleLayer;
                }
                if (angular.isUndefined(scope.searchBox)) {
                    scope.searchBox = scope.mapConfig.searchBox;
                }

                if (scope.context) {
                    // Handle the view defined on the map tag directly
                    var group = MapHelper.MapConfiguration.createLayerGroupConfiguration();
                    var layer = MapHelper.MapConfiguration.createLayerConfiguration();
                    group.layers.push(layer);
                    scope.mapConfig.groups.push(group);

                    layer.context = scope.context;

                    scope.context.wait().then(function (nv) {
                        if (nv) {
                            if (scope.context.dataset.metas.timezone) {
                                scope.forcedTimezone = scope.context.dataset.metas.timezone;
                            }
                            if (scope.context.dataset.extra_metas && scope.context.dataset.extra_metas.visualization) {
                                layer.tooltipDisabled = Boolean(scope.context.dataset.extra_metas.visualization.map_tooltip_disabled);
                            }
                            MapHelper.MapConfiguration.setLayerDisplaySettingsFromDefault(layer);
                        }
                    });
                }

                function resizeMap() {
                    var mapElement = jQuery('.odswidget-map__map');
                    if (scope.autoResize === 'true' && mapElement.length > 0) {
                        // Only do this if visible
                        var height = Math.max(200, jQuery(window).height() - mapElement.offset().top);
                        mapElement.height(height);
                    }

                    // resize map-display-control
                    ctrl.resizeMapDisplayControl();
                }

                if (scope.autoResize === 'true') {
                    jQuery(window).on('resize', resizeMap);
                    resizeMap();
                }

                scope.$on('invalidateMapSize', function() {
                    if (scope.map) {
                        scope.map.invalidateSize();
                    }
                    //console.log('Invalidate Map Size', jQuery('.odswidget-map').width());
                });

                scope.$on('mapFitBounds', function(e, bounds) {
                    scope.map.fitBounds(bounds);
                });

                scope.$on('toggleMapDisplayControl', function (event, data) {
                    var $leafletControlsElement = jQuery('.leaflet-top.leaflet-right');
                    if (data.expanded) {
                        $leafletControlsElement.removeClass('collapsed');
                    } else {
                        $leafletControlsElement.addClass('collapsed');
                    }
                });

                /* INITIALISATION AND DEFAULT VALUES */
                scope.initialLoading = true;


                if (scope.syncToObject) {
                    scope.mapContext = scope.syncToObject;
                } else {
                    scope.mapContext = {};
                }

                if (scope.syncToUrl === 'true') {
                    // We can't safely have more than one addSynchronizedObject so we target explicitely what we want,
                    // because the context could also use addSynchronizedObject
                    URLSynchronizer.addSynchronizedValue(scope, 'mapContext.location', 'location', true);
                    URLSynchronizer.addSynchronizedValue(scope, 'mapContext.basemap', 'basemap', true);
                }

                if (scope.location) {
                    scope.mapContext.location = scope.mapContext.location || scope.location;
                } else if (scope.mapConfig && scope.mapConfig.mapPresets && scope.mapConfig.mapPresets.location) {
                    scope.mapContext.location = scope.mapContext.location || scope.mapConfig.mapPresets.location;
                }

                if (scope.basemap) {
                    scope.mapContext.basemap = scope.mapContext.basemap || scope.basemap;
                } else if (scope.mapConfig && scope.mapConfig.mapPresets && scope.mapConfig.mapPresets.basemap) {
                    scope.mapContext.basemap = scope.mapContext.basemap || scope.mapConfig.mapPresets.basemap;
                }

                /* END OF INITIALISATION */

                ModuleLazyLoader('leaflet').then(function() {
                    // Initializing the map
                    var mapOptions = {
                        basemapsList: ODSWidgetsConfig.basemaps,
                        worldCopyJump: true,
                        basemap: scope.mapContext.basemap,
                        dragging: !isStatic,
                        keyboard: !isStatic,
                        prependAttribution: ODSWidgetsConfig.mapPrependAttribution,
                        appendAttribution: ODSWidgetsConfig.mapAppendAttribution,
                        maxBounds: [[-90, -240], [90, 240]],
                        zoomControl: false
                    };
                    if (scope.syncToUrl === 'true' && 'scrollWheelZoom' in $location.search()) {
                        mapOptions.scrollWheelZoom = $location.search()['scrollWheelZoom'] !== 'false';
                    } else {
                        mapOptions.scrollWheelZoom = scope.scrollWheelZoom !== 'false';
                    }

                    if (scope.minZoom) {
                        mapOptions.minZoom = scope.minZoom;
                    }
                    if (scope.maxZoom) {
                        mapOptions.maxZoom = scope.maxZoom;
                    }

                    if (isStatic) {
                        mapOptions.doubleClickZoom = false;
                        mapOptions.scrollWheelZoom = false;
                    }

                    resizeMap();

                    var map = new L.ODSMap(element.children()[0].children[0], mapOptions);

//                    map.setView(new L.LatLng(48.8567, 2.3508),13);
                    map.addControl(new L.Control.Scale());

                    if (!isStatic) {
                        map.addControl(new L.Control.Zoom({
                            position: 'topright',
                            zoomInTitle: translate('Zoom in'),
                            zoomOutTitle: translate('Zoom out')
                        }));
                    }

                    if (toolbarFullscreen) {
                        // Only add the Fullscreen control if we are not in an iframe, as it is blocked by browsers
                        try {
                            if (window.self === window.top) {
                                // We are NOT in an iframe
                                map.addControl(new L.Control.ODSMapFullscreen({
                                    title: {
                                        'false': translate('View Fullscreen'),
                                        'true': translate('Exit Fullscreen')
                                    }
                                }));
                            }
                        } catch (e) {
                            // We are in an iframe
                        }
                    }


                    // Only during the Mapbuilder beta phase
                    if (ODSWidgetsConfig.mapGeobox && !scope.searchBox && !isStatic) {
                        var geocoder = L.Control.geocoder({
                            placeholder: translate('Find a place...'),
                            errorMessage: translate('Nothing found.'),
                            geocoder: new L.Control.Geocoder.Nominatim({serviceUrl: "https://nominatim.openstreetmap.org/", geocodingQueryParams: {"accept-language": ODSWidgetsConfig.language || 'en', "polygon_geojson": true}})
                        });
                        geocoder.markGeocode = function(result) {
                            map.fitBounds(result.bbox);

                            if (result.properties.geojson) {
                                var highlight = L.geoJson(result.properties.geojson, {
                                    style: function () {
                                        return {
                                            opacity: 0,
                                            fillOpacity: 0.8,
                                            fillColor: 'orange',
                                            className: 'leaflet-geocoder-highlight'
                                        };
                                    }
                                });
                                map.addLayer(highlight);
                                $timeout(function () {
                                    element.addClass('geocoder-highlight-on');
                                }, 0);
                                $timeout(function () {
                                    element.removeClass('geocoder-highlight-on');
                                    map.removeLayer(highlight);
                                }, 2500);
                            }
                        };
                        map.addControl(geocoder);
                    }

                    if (toolbarGeolocation && !isStatic) {
                        var geolocateControl = new L.Control.Locate({
                            position: 'topright',
                            maxZoom: 18,
                            strings: {
                                title: translate("Show me where I am"),
                                popup: translate("You are within {distance} {unit} from this point"),
                                outsideMapBoundsMsg: translate("You seem located outside the boundaries of the map")
                            }
                        });

                        map.addControl(geolocateControl);
                    }

                    // Drawing
                    scope.drawnItems = new L.FeatureGroup(); // Necessary to show geofilters
                    map.addLayer(scope.drawnItems);

                    if (toolbarDrawing && !isStatic) {
                        // Localize all the messages
                        L.drawLocal.draw.toolbar.buttons.circle = translate('Draw a circle to filter on');
                        L.drawLocal.draw.toolbar.buttons.polygon = translate('Draw a polygon to filter on');
                        L.drawLocal.draw.toolbar.buttons.rectangle = translate('Draw a rectangle to filter on');
                        L.drawLocal.draw.toolbar.actions = {
                            title: translate('Cancel area filter'),
                            text: translate('Cancel')
                        };
                        L.drawLocal.draw.toolbar.undo = {
                            title: translate('Delete last point'),
                            text: translate('Delete last point')
                        };
                        L.drawLocal.edit.toolbar.buttons = {
                            edit: translate('Edit area filter.'),
                            editDisabled: translate('No area filter to edit.'),
                            remove: translate('Delete area filter.'),
                            removeDisabled: translate('No area filter to delete.')
                        };
                        L.drawLocal.edit.toolbar.actions = {
                            save: {
                                title: translate('Apply'),
                                text: translate('Apply')
                            },
                            cancel: {
                                title: translate('Cancel editing, discards all changes.'),
                                text: translate('Cancel')
                            }
                        };
                        L.drawLocal.draw.handlers = {
                            circle: {
                                tooltip: {
                                    start: translate('Click and drag to draw circle')
                                },
                                radius: translate('Radius')
                            },
                            marker: {
                                tooltip: {
                                    start: translate('Click map to place marker')
                                }
                            },
                            polygon: {
                                tooltip: {
                                    start: translate('Click to start drawing shape'),
                                    cont: translate('Click to continue drawing shape'),
                                    end: translate('Click first point to close this shape')
                                }
                            },
                            polyline: {
                                error: '<strong>' + translate('Error:') + '</strong> ' + translate('shape edges cannot cross!'),
                                tooltip: {
                                    start: translate('Click to start drawing line'),
                                    cont: translate('Click to continue drawing line'),
                                    end: translate('Click last point to finish line')
                                }
                            },
                            rectangle: {
                                tooltip: {
                                    start: translate('Click and drag to draw rectangle')
                                }
                            },
                            simpleshape: {
                                tooltip: {
                                    end: translate('Release mouse to finish drawing')
                                }
                            }
                        };
                        L.drawLocal.edit.handlers = {
                            edit: {
                                tooltip: {
                                    text: translate('Drag handles to edit shape, then apply') +
                                        '<br>' +
                                        '<em>' + translate('Click cancel to undo changes') + '</em>'
                                }
                            },
                            remove: {
                                tooltip: {
                                    text: translate('Click on a shape to delete it, then apply')
                                }
                            }
                        };

                        var drawControl = new L.Control.Draw({
                            edit: {
                                featureGroup: scope.drawnItems
                            },
                            draw: {
                                polyline: false,
                                marker: false,
                                circle: {
                                    showRadius: true,
                                    metric: true,
                                    feet: false
                                }
                            }
                        });
                        map.options.drawControlTooltips = true;
                        map.addControl(drawControl);
                    }

                    scope.map = map;

                    // Now that the map is ready, we need to know where to set the map first
                    // - If there is an explicit location, use it. This includes older legacy parameters and formats
                    // - Else, we deduce it from the displayed datasets
                    var setInitialMapView = function(location) {
                        var deferred = $q.defer();

                        if (location && typeof location !== 'boolean') {
                            var loc = MapHelper.getLocationStructure(location);
                            scope.map.setView(loc.center, loc.zoom);
                            waitForVisibleContexts().then(function() {
                                refreshData(false);
                            });

                            deferred.resolve();

                            if (autoGeolocation && geolocateControl) {
                                geolocateControl.locate();
                            }
                        } else {
                            waitForVisibleContexts().then(function() {
                                MapHelper.retrieveBounds(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig, {geoOnly: true, skipExcludedFromRefit: true})).then(function (bounds) {
                                    // Fit to dataset boundingbox if there is no viewport or geofilter
                                    if (bounds) {
                                        scope.map.fitBounds(bounds);
                                    } else {
                                        var loc = MapHelper.getLocationStructure(ODSWidgetsConfig.defaultMapLocation);
                                        scope.map.setView(loc.center, loc.zoom);
                                    }
                                    refreshData(false);

                                    deferred.resolve();

                                    //FF and IE don't fire locationerror event
                                    //so we need to have a default view already set before trying to geolocate
                                    if (autoGeolocation && geolocateControl) {
                                        geolocateControl.locate();
                                    }
                                });
                            });
                        }

                        return deferred.promise;
                    };

                    setInitialMapView(scope.mapContext.location).then(function() {
                        scope.initialLoading = false;
                        onViewportMove(scope.map);

                        if (!isStatic) {
                            // Initialize all the drawing support events
                            waitForVisibleContexts().then(initDrawingTools);
                        }

                        scope.map.on('moveend', function(e) {
                            // Whenever the map moves, we update the displayed data
                            if (scope.$applyAsync) {
                                scope.$applyAsync(function () {
                                    onViewportMove(e.target);
                                });
                            } else {
                                // For the last UI that doesn't have Angular 1.4, and thefore doesn't have applyAsync yet
                                $timeout(function() {
                                    onViewportMove(e.target);
                                });
                            }
                        });

                        // Refresh events
                        scope.$watch('mapContext.location', function(nv, ov) {
                            if (nv !== ov) {
                                // When the location changes, triggers a data refresh.
                                // We could do it in the moveend event instead of watching the location, but that way we ensure that
                                // if something else from outside changes the location, we react as well.
                                refreshData(false, true);
                            }
                        });

                        scope.allContextsInitialized = false;
                        waitForVisibleContexts().then(function() {
                            scope.allContextsInitialized = true;
                        });

                        // INitialize watcher
                        scope.$watch(function() {
                            var pending = 0;
                            angular.forEach(scope.mapConfig.groups, function(groupConfig) {
                                angular.forEach(groupConfig.layers, function (layerConfig) {
                                    if (layerConfig._loading) {
                                        pending++;
                                    }

                                });
                            });
                            return pending;
                        }, function(nv) {
                            scope.loading = !!nv;
                        });

                        // Initialize data watchers
                        // TODO: Make the contexts broadcast an event when the parameters change? Will spare
                        // a potentially heavy watch.

                        // This watcher ensures that whenever a displayed context changes, or whenever the list of visible
                        // displays change, we refresh the display.
                        scope.$watch(function() {
                            // We create a second param list with all the parameters that should trigger a refit, so that
                            // we can check if it changed before triggering a refit.
                            var params = [],
                                paramsNoRefit = [];
                            angular.forEach(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig), function(ctx) {
                                params.push([ctx.name, ctx.parameters]);
                            });
                            angular.forEach(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig, {skipExcludedFromRefit: true}), function(ctx) {
                                paramsNoRefit.push([ctx.name, ctx.parameters]);
                            });
                            return [params, paramsNoRefit, MapHelper.MapConfiguration.getVisibleLayerIds(scope.mapConfig)];
                        }, function(nv, ov) {
                            if (nv !== ov) {
                                //console.log('Something changed in the contexts, refreshing');
                                // Refresh with a refit
                                syncGeofilterToDrawing();
                                refreshData(!angular.equals(nv[1], ov[1]));
                            }
                        }, true);
                    });


                    var configWatcher;
                    // This watch ensures the display is refreshed whenever the map display config changes.
                    // It is very heavy, and only useful in cases where you live-edit the config (mapbuilder), so it
                    // is not active constantly.
                    // TODO: Maybe we can just watch a single layer and only refresh this one?
                    var startConfigWatcher = function() {
                        //console.log('Start config watcher');
                        stopColorWatcher();
                        configWatcher = scope.$watch(function() {
                            // We want a light version of the config, and the only reliable mechanism to efficiently
                            // simplify a complex object for comparison is JSON.stringify.
                            var simplified = JSON.stringify(scope.mapConfig, function(key, value) {

                                if (typeof(value) === "function") {
                                    return undefined;
                                }
                                if (key.substring(0, 2) === '$$') {
                                    // Internal angular stuff
                                    return undefined;
                                }
                                if (key[0] === '_') {
                                    // Internal runtime properties
                                    return undefined;
                                }
                                if (key === 'context') {
                                    return {
                                        datasetId: value.dataset.datasetid,
                                        parameters: value.parameters,
                                    };
                                }
                                // Things we want to discard, that don't impact the display
                                if (['mapPresets', 'singleLayer', 'toolbarGeolocation', 'toolbarFullscreen',
                                        'autoGeolocation', 'layerSelection', 'searchBox',
                                        'title', 'description', 'caption', 'captionTitle'].indexOf(key) > -1) {
                                    return undefined;
                                }
                                return value;
                            });
                            return simplified;
                        }, function() {
                            //console.log('Map config changed');
                            refreshData();
                        });

                    };

                    var stopConfigWatcher = function() {
                        //console.log('Stop config watcher');
                        if (configWatcher) {
                            configWatcher();
                        }
                        startColorWatcher();
                    };

                    var unwatchColor;
                    var startColorWatcher = function() {
                        if (ctrl.userControlledColors.length) {
                            unwatchColor = scope.$watch(function() { return ctrl.userControlledColors; }, function() {
                                refreshData();
                            }, true);
                        }

                    };
                    var stopColorWatcher = function() {
                        if (unwatchColor) {
                            unwatchColor();
                        }
                    };
                    startColorWatcher();

                    scope.$watch('dynamicConfig', function(nv, ov) {
                        if (angular.isDefined(nv)) {
                            if (nv) {
                                startConfigWatcher();
                            } else {
                                stopConfigWatcher();
                            }
                        }
                    });

                    if (ODSWidgetsConfig.basemaps.length > 1) {
                        scope.map.on('baselayerchange', function (e) {
                            scope.$evalAsync('mapContext.basemap = "'+e.layer.basemapId+'"');


                            // The bundle layer zooms have to be the same as the basemap, else it will drive the map
                            // to be zoomable beyond the basemap levels
                            angular.forEach(scope.mapConfig.groups, function(groupConfig) {
                                if (groupConfig.displayed) {
                                    angular.forEach(groupConfig.layers, function (layerConfig) {
                                        if (layerConfig.display === 'tiles' && layerConfig._rendered) {
                                            layerConfig._rendered.setMinZoom(e.layer.options.minZoom);
                                            layerConfig._rendered.setMaxZoom(e.layer.options.maxZoom);
                                        }
                                    });
                                }
                            });
                        });
                    }

                    var onViewportMove = function(map) {
                        var size = map.getSize();
                        if (size.x > 0 && size.y > 0) {
                            // Don't attempt to do anything if the map is not displayed... we can't capture useful bounds
                            scope.mapContext.location = MapHelper.getLocationParameter(map.getCenter(), map.getZoom());
                        }
                    };

                    var renderedLayers = {};
                    var previousMasterLayerGroup;
                    var refreshData = function(fitView, locationChangedOnly) {
                        /* Used when one of the context changes, or the viewport changes: triggers a refresh of the displayed data
                           If "fitView" is true, then the map moves to the new bounding box containing all the data, before
                           beginning to render the result.

                           dataUnchanged means only the location changed, and some layers don't need a refresh at all (tiles, or
                           layers that load all at once)
                         */
                        fitView = !noRefit && fitView;
                        var renderData = function(locationChangedOnly) {
                            var promises = [];
                            var newlyRenderedLayers = {};
                            var masterLayerGroup = new L.LayerGroup();

                            scope.partialDataLayers = '';
                            scope.partialDataLayersArray = [];

                            angular.forEach(scope.mapConfig.groups, function(layerGroup) {
                                if (!layerGroup.displayed) {
                                    angular.forEach(layerGroup.layers, function(layer) {
                                        if (layer._currentRequestTimeout) {
                                            layer._currentRequestTimeout.resolve();
                                            layer._loading = false;
                                        }
                                        if (layer._rendered) {
                                            scope.map.removeLayer(layer._rendered);
                                            layer._rendered = null;
                                        }
                                    });
                                    return;
                                }
                                angular.forEach(layerGroup.layers, function(layer) {
                                    if (layer.showZoomMin && layer.showZoomMin > scope.map.getZoom()) {
                                        return;
                                    }
                                    if (layer.showZoomMax && layer.showZoomMax < scope.map.getZoom()) {
                                        return;
                                    }

                                    if (layer.context.dataset === null){
                                        return;
                                    }

                                    // Depending on the layer config, we can opt for various representations

                                    // Tiles: call a method on the existing layer
                                    // Client-side: build a new layer and remove the old one
                                    if (!locationChangedOnly || MapLayerRenderer.doesLayerRefreshOnLocationChange(layer)) {
                                        var deferred = $q.defer();
                                        masterLayerGroup.addLayer(MapLayerRenderer.updateDataLayer(layer, scope.map, deferred));
                                        promises.push(deferred.promise);
                                        newlyRenderedLayers[layer._runtimeId] = layer;
                                    }
                                });
                            });

                            // If there is something that was rendered before but not now, this is the case of a
                            // layer that was removed from the configuration.
                            //console.log('renderedLayers', Object.keys(renderedLayers), 'newlyRenderedLayers', Object.keys(newlyRenderedLayers));
                            Object.keys(renderedLayers).forEach(function(runtimeId) {
                                if (angular.isUndefined(newlyRenderedLayers[runtimeId])) {
                                    var layer = renderedLayers[runtimeId];
                                    if (layer._currentRequestTimeout) {
                                        layer._currentRequestTimeout.resolve();
                                        layer._loading = false;
                                    }
                                    if (layer._rendered) {
                                        scope.map.removeLayer(layer._rendered);
                                        layer._rendered = null;
                                    }
                                }
                            });

                            renderedLayers = newlyRenderedLayers;
                            $q.all(promises).then(function() {
                                // We got them all
                                if (previousMasterLayerGroup) {
                                    scope.map.removeLayer(previousMasterLayerGroup);
                                }
                                scope.map.addLayer(masterLayerGroup);
                                previousMasterLayerGroup = masterLayerGroup;

                                // Show a warning in Preview mode if the dataset has over a 1000 records and the view type is choropleth or categories
                                // (currently the map can only show up to 1000 points at a time so it can be confusing for users)
                                angular.forEach(renderedLayers, function(layerConfig) {
                                    if (layerConfig._incomplete) {
                                        var layerTitle = layerConfig.title || layerConfig.context.dataset.metas.title;
                                        var maxTitleLength = 50;
                                        // Trim the title if it's extremely long
                                        if (layerTitle.length > maxTitleLength) {
                                            layerTitle = layerTitle.substr(0, maxTitleLength - 1) + '&hellip;';
                                        }
                                        scope.partialDataLayersArray.push('&bull; ' + layerTitle);
                                        scope.partialDataLayers = scope.partialDataTooltipMessage(scope.partialDataLayersArray);

                                    }
                                });

                            });
                        };

                        if (fitView) {
                            // Move the viewport to the new location, and change the tile
                            MapHelper.retrieveBounds(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig, {geoOnly: true, skipExcludedFromRefit: true})).then(function(bounds) {
                                if (bounds && bounds !== MapHelper.WORLD_BOUNDS) {
                                    // Until $applyAsync... Make sure the fitting is done outside this digest cycle,
                                    // so that the triggering of viewport move doesn't clash with it
                                    $timeout(function() {
                                        var before = scope.map.getBounds().toBBoxString();
                                        scope.map.fitBounds(bounds);
                                        var after = scope.map.getBounds().toBBoxString();

                                        if (before === after) {
                                            // The map didn't move, so we can't rely on the location change to trigger a refresh
                                            refreshData(false, true);
                                        }
                                    }, 0);
                                } else {
                                    renderData(locationChangedOnly);
                                }
                            });
                        } else {
                            renderData();
                        }
                    };

                    scope.partialDataTooltipMessage = function(layerList) {
                        var layerCountLimit = 5;
                        // Cut off list if there are too many layers
                        if (layerList.length > layerCountLimit) {
                            var otherLayerCount = layerList.length - layerCountLimit;
                            layerList.splice(0, layerCountLimit);
                            var text = translatePlural(otherLayerCount, '... and {{ $count }} more layer', '... and {{ $count }} more layers', {});
                            layerList.push('<em>' + text + '</em>');
                        }
                        return layerList.join("<br>");
                    };

                    scope.$on('mapRefresh', function(e, bounds) {
                        refreshData(false);
                    });

                    var initDrawingTools = function() {
                        // Make sure we know when the user is drawing, so that we can ignore other interactions (click on
                        // shapes...)
                        scope.map.on('draw:drawstart draw:editstart', function() {
                            scope.map.isDrawing = true;
                        });
                        scope.map.on('draw:drawstop draw:editstop', function() {
                            scope.map.isDrawing = false;
                        });

                        // Set the drawn items as clickable when in deletion mode. We have to do it manually because
                        // we are redrawing our own shapes (due to parameter sync on init) instead of using the leaflet-draw builtint.
                        var setLayerInteractive = function(layer) {
                            layer._path.setAttribute('style','cursor: pointer; pointer-events: auto;');
                        };
                        var setLayerNonInteractive = function(layer) {
                            layer._path.setAttribute('style','cursor: auto; pointer-events: none;');
                        };

                        scope.map.on('draw:deletestart', function() {
                            setLayerInteractive(scope.drawnItems.getLayers()[0]);
                        });

                        scope.map.on('draw:deleteend', function() {
                            setLayerNonInteractive(scope.drawnItems.getLayers()[0]);
                        });

                        // Applying drawing effects on contexts
                        scope.map.on('draw:created', function (e) {
                            var layer = e.layer;
                            if (scope.drawnItems.getLayers().length > 0) {
                                scope.drawnItems.removeLayer(scope.drawnItems.getLayers()[0]);
                            }
                            scope.drawnItems.addLayer(layer);

                            // Apply to parameters
                            applyDrawnLayer(layer, e.layerType);

                            scope.$apply();
                        });

                        scope.map.on('draw:edited', function(e) {
                            var layer = e.layers.getLayers()[0];
                            var type = getDrawnLayerType(layer);

                            applyDrawnLayer(layer, type);
                            scope.$apply();
                        });

                        scope.map.on('draw:deleted', function() {
                            delete scope.mapConfig.drawnArea;
                            scope.$apply();
                        });

                        var applyDrawnLayer = function(layer, type) {
                            if (type === 'circle') {
                                var distance = layer.getRadius();
                                var center = layer.getLatLng();
                                scope.mapConfig.drawnArea = {
                                    'shape': 'circle',
                                    'coordinates': center.lat + ',' + center.lng + ',' + distance
                                };
                            } else {
                                // Compute the polygon
                                var geoJson = layer.toGeoJSON();
                                var path = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(geoJson.geometry);
                                scope.mapConfig.drawnArea = {
                                    'shape': 'polygon',
                                    'coordinates': path
                                };
                            }
                        };

                        var getDrawnLayerType = function(layer) {
                            if (angular.isDefined(layer.getRadius)) {
                                return 'circle';
                            } else {
                                return 'polygon';
                            }
                        };

                        var drawableStyle = {
                            color: '#2ca25f',
                            fillOpacity: 0.2,
                            opacity: 0.8,
                            clickable: true
                        };

                        scope.$watch('mapConfig.drawnArea', function(nv) {
                            // Wipe the current drawn polygon
                            if (scope.drawnItems.getLayers().length > 0) {
                                scope.drawnItems.removeLayer(scope.drawnItems.getLayers()[0]);
                            }

                            // Draw
                            var drawn;
                            if (nv) {
                                if (nv.shape === 'polygon') {
                                    // FIXME: maybe a cleaner way than using GeoJSON, but it felt weird adding a method
                                    // just to output a Leaflet-compatible arbitrary format. Still, we should do it.
                                    var geojson = ODS.GeoFilter.getPolygonParameterAsGeoJSON(nv.coordinates);
                                    var coordinates = geojson.coordinates[0];
                                    coordinates.splice(geojson.coordinates[0].length - 1, 1);
                                    var i, coords, swap;
                                    for (i = 0; i < coordinates.length; i++) {
                                        coords = coordinates[i];
                                        swap = coords[0];
                                        coords[0] = coords[1];
                                        coords[1] = swap;
                                    }
                                    if (coordinates.length === 4 &&
                                        coordinates[0][0] === coordinates[3][0] &&
                                        coordinates[1][0] === coordinates[2][0] &&
                                        coordinates[0][1] === coordinates[1][1] &&
                                        coordinates[2][1] === coordinates[3][1]) {
                                        drawn = new L.Rectangle(coordinates, drawableStyle);
                                    } else {
                                        drawn = new L.Polygon(coordinates, drawableStyle);
                                    }
                                    //drawn = new L.GeoJSON(geojson);
                                } else if (nv.shape === 'circle') {
                                    var parts = nv.coordinates.split(',');
                                    var lat = parts[0],
                                        lng = parts[1],
                                        radius = parts[2] || 0;
                                    drawn = new L.Circle([lat, lng], radius, drawableStyle);
                                }

                                if (drawn) {
                                    scope.drawnItems.addLayer(drawn);
                                    setLayerNonInteractive(scope.drawnItems.getLayers()[0]);
                                }
                            }

                            // Apply to every context available
                            angular.forEach(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig, {geoOnly: true}), function(ctx) {
                                if (nv) {
                                    // There is something to apply
                                    if (nv.shape === 'circle') {
                                        ctx.parameters['geofilter.distance'] = nv.coordinates;
                                        delete ctx.parameters['geofilter.polygon'];
                                    } else if (nv.shape === 'polygon') {
                                        ctx.parameters['geofilter.polygon'] = nv.coordinates;
                                        delete ctx.parameters['geofilter.distance'];
                                    }
                                } else {
                                    // Remove the filters
                                    delete ctx.parameters['geofilter.polygon'];
                                    delete ctx.parameters['geofilter.distance'];
                                }
                            });

                        }, true);
                    };
                });

                function waitForVisibleContexts() {
                    var deferred = $q.defer();

                    // Watches all the active contexts, and resolves once they are ready
                    // FIXME: Include joinContexts and refineOnClickContexts
                    var contexts = MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig);
                    var promises = contexts.map(function(context) { return context.wait(); });

                    var resolvedPromises = function(promises){
                        $q.all(promises).then(function(){
                            syncGeofilterToDrawing();
                            deferred.resolve();
                        }).catch(function(){
                            promises = promises.filter(function(promise) {
                                return promise.$$state.status !== 2;
                            });
                            resolvedPromises(promises);
                        });
                    };

                    resolvedPromises(promises);

                    return deferred.promise;
                }

                var syncGeofilterToDrawing = function() {
                    // Check if there are geofilters shared by everyone at init time, and if so, synchronize the
                    // drawn shapes to match them.
                    var polygon, distance;
                    angular.forEach(MapHelper.MapConfiguration.getActiveContextList(scope.mapConfig, {geoOnly: true}), function(context) {
                        if (angular.isUndefined(polygon) && angular.isUndefined(polygon)) {
                            // First time
                            polygon = context.parameters['geofilter.polygon'];
                            distance = context.parameters['geofilter.distance'];
                        } else {
                            if (polygon !== context.parameters['geofilter.polygon']) {
                                polygon = null;
                            }
                            if (distance !== context.parameters['geofilter.distance']) {
                                distance = null;
                            }
                        }
                    });
                    if (polygon) {
                        scope.mapConfig.drawnArea = {
                            shape: 'polygon',
                            coordinates: polygon
                        };
                    } else if (distance) {
                        scope.mapConfig.drawnArea = {
                            shape: 'circle',
                            coordinates: distance
                        };
                    } else {
                        scope.mapConfig.drawnArea = {};
                    }
                };

                // TODO: Plug polygon drawing to the geofilter.polygon of every context. Possibly store it in a specific
                // place in the map config, so we know which one to use when loading the map

            },
            controller: ['$scope', function($scope) {
                if (angular.isUndefined($scope.mapConfig)) {
                    //console.log('Using a new config');
                    $scope.mapConfig = {
                        singleLayer: false,
                        layerSelection: false,
                        'groups': []
                    };
                } else {
                    // Apply default values for existing configs (useful for migration of old configs)
                    $scope.mapConfig.groups.forEach(function(group) {
                        group.layers.forEach(function(layer) {
                            layer.context.wait().then(function() {
                                MapHelper.MapConfiguration.setLayerDisplaySettingsFromDefault(layer);
                            });
                        });
                    });
                }

                // DEBUG //
                window.mapConfig = $scope.mapConfig;
                // END OF DEBUG //

                //
                this.registerLayer = function(layer) {
                    // Register with a dummy single-layer-group
                    //console.log('register layer');
                    var group = MapHelper.MapConfiguration.createLayerGroupConfiguration();
                    group.layers.push(layer);
                    $scope.mapConfig.groups.push(group);
                    return group;
                };

                this.registerLayerGroup = function(layer) {
                    $scope.mapConfig.groups.push(layer);
                };

                // API
                this.getCurrentPosition = function() {
                    return $scope.mapContext.location;
                };

                this.moveMap = function(coords, zoom) {
                    $scope.map.setView(coords, zoom);
                };

                this.getMap = function(obj) {
                    return $scope.map;
                };

                this.fitMapToShape = function(geoJson) {
                    var layer = L.geoJson(geoJson);
                    $scope.map.fitBounds(layer.getBounds());
                };

                this.fitMapToBoundingBox = function(bbox) {
                    // Bbox should be as [ [lat, lng], [lat, lng] ]
                    $scope.map.fitBounds(bbox);
                };

                this.resetMapDataFilter = function() {
                    var contexts = MapHelper.MapConfiguration.getContextList($scope.mapConfig);
                    contexts.forEach(function(ctx) {
                        delete ctx.parameters['q.mapfilter'];
                    });
                    if (resetCallback) {
                        resetCallback();
                    }
                };
                this.applyMapDataFilter = function(userQuery) {
                    // This applies the search to all contexts. We could have done this only for the map, but this could
                    // lead to inconsistent displays if other visualization widgets were displaying data from the same
                    // contexts.
                    var contexts = MapHelper.MapConfiguration.getContextList($scope.mapConfig);
                    contexts.forEach(function(ctx) {
                        ctx.parameters['q.mapfilter'] = userQuery;
                    });
                };

                this.getActiveContexts = function() {
                    return MapHelper.MapConfiguration.getActiveContextList($scope.mapConfig);
                };

                var resetCallback;
                this.registerResetCallback = function (callback) {
                    resetCallback = callback;
                };

                this.resizeMapDisplayControl = function () {
                    $timeout(function () {
                        var $mapElement = jQuery('.odswidget-map');
                        var $legendElement = jQuery('.odswidget-map-legend');
                        var $mapDisplayControlElement = jQuery('.odswidget-map-display-control__groups');
                        if ($mapDisplayControlElement.length === 1) {
                            $mapDisplayControlElement = $mapDisplayControlElement.first();
                            if ($legendElement.length > 0) {
                                $legendElement = $legendElement.first();
                                $mapDisplayControlElement.css('max-height', 'calc(' + $mapElement.outerHeight() + 'px - 2*10px - 26px - ' + $legendElement.outerHeight() + 'px)');
                            } else {
                                $mapDisplayControlElement.css('max-height', 'calc(' + $mapElement.outerHeight() + 'px - 10px - 26px)');
                            }
                        }
                    });
                };

                // The list of color objects that have been configured as a widget parameter, and therefore could
                // change
                this.userControlledColors = [];
                this.registerUserControlledColor = function(colorConfiguration) {
                    this.userControlledColors.push(colorConfiguration);
                };

                // watch for reset
                var that = this;
                $scope.$watch(
                    function () {
                        var contexts = MapHelper.MapConfiguration.getContextList($scope.mapConfig);
                        return contexts.reduce(function (empty, context) {
                            return empty && !context.parameters['q.mapfilter'];
                        }, true);
                    },
                    function (nv, ov) {
                        if (nv && !ov && resetCallback) {
                            resetCallback();
                        }
                    },
                    true);
            }]
        };
    }]);

    mod.directive('odsMapLayerGroup', ['MapHelper', function(MapHelper) {
        // TODO: Plug for real
        return {
            restrict: 'EA',
            scope: {
                "title": "@",
                "description": "@",
                "pictoColor": "@",
                "pictoIcon": "@",
                "displayed": "=?"
            },
            require: '^odsMap',
            link: function(scope, element, attrs, mapCtrl) {
                mapCtrl.registerLayerGroup(scope.group);
            },
            controller: ['$scope', function($scope) {
                $scope.group = MapHelper.MapConfiguration.createLayerGroupConfiguration();
                if (!angular.isDefined($scope.displayed)) {
                    $scope.displayed = true;
                }
                angular.extend($scope.group, {
                    "title": $scope.title,
                    "description": $scope.description,
                    "pictoColor": $scope.pictoColor,
                    "pictoIcon": $scope.pictoIcon,
                    "displayed": $scope.displayed
                });

                this.registerLayer = function(obj) {
                    // Register to the group
                    $scope.group.layers.push(obj);
                    return $scope.group;
                };
            }]
        };
    }]);

    mod.directive('odsMapLayer', ['MapHelper', function(MapHelper) {
        return {
            restrict: 'EA',
            scope: {
                context: '=',
                showIf: '=',
                showZoomMin: '@',
                showZoomMax: '@',
                color: '@',
                borderColor: '@',
                borderSize: '@',
                borderPattern: '@',
                borderOpacity: '@',
                opacity: '@',
                shapeOpacity: '@',
                pointOpacity: '@',
                lineWidth: '@',
                colorScale: '@',
                colorRanges: '@',
                colorCategories: '=',
                colorCategoriesOther: '@',
                colorUndefined: '@',
                colorOutOfBounds: '@',
                colorNumericRanges: '=',
                colorNumericRangeMin: '=',
                colorGradient: '=',
                colorByField: '@',
                colorFunction: '@',
                radius: '@',
                size: '@',
                sizeMin: '@',
                sizeMax: '@',
                sizeFunction: '@',

                picto: '@',
                showMarker: '@',
                display: '@',
                'function': '@', // A less risky name?
                expression: '@',

                tooltipSort: '@',
                tooltipDisabled: '@?',
                hoverField: '@',

                refineOnClickContext: '=',

                joinContext: '=',
                localKey: '@',
                remoteKey: '@',

                caption: '=?',
                captionTitle: '@',
                captionPictoColor: "@",
                captionPictoIcon: "@",
                title: '@',
                description: '@',

                geoField: '@',

                excludeFromRefit: '=?',
            },
            template: function(tElement) {
                var tpl = '';
                tElement.contents().wrapAll('<div>');
                if (tElement.contents().length > 0 && tElement.contents().html().trim().length > 0) {
                    tElement.contents().wrapAll('<div>');
                    tpl = tElement.children().html();
                }
                // Yes, it seems highly weird, but unfortunately it sems to be the only option as we want to get the
                // original content BEFORE compile, and pass it to the link function.
                return '<div tooltiptemplate="'+tpl.replace(/"/g, '&quot;')+'"></div>';
            },
            require: ['?^odsMapLayerGroup', '^odsMap'],
            link: function(scope, element, attrs, controllers) {
                var layerGroupCtrl  = controllers[0],
                    mapCtrl         = controllers[1];
                var tplHolder = angular.element(element.children()[0]);
                var customTemplate = tplHolder.attr('tooltiptemplate');
                var tooltipDisabled = angular.isDefined(scope.tooltipDisabled) && scope.tooltipDisabled.toLowerCase() !== 'false';

                var color;
                if (scope.color) {
                    color = scope.color;
                } else if (scope.colorScale) {
                    color = {
                        type: 'scale',
                        scale: scope.colorScale
                    };
                } else if (scope.colorRanges) {
                    var tokens = scope.colorRanges.split(';');
                    var ranges = tokens.filter(function(elt, idx) { return idx % 2 === 1; });
                    var colors = tokens.filter(function(elt, idx) { return idx % 2 === 0; });
                    color = {
                        type: 'range',
                        ranges: ranges,
                        colors: colors,
                        field: scope.colorByField
                    };
                } else if (scope.colorCategories) {
                    if (!scope.colorByField) {
                        console.error('odsMapLayer: using colorCategories requires specifying a field to use, using colorByField');
                    }
                    color = {
                        type: 'categories',
                        field: scope.colorByField,
                        categories: scope.colorCategories
                    };
                    if (scope.colorCategoriesOther) {
                        color.otherCategories = scope.colorCategoriesOther;
                    }
                    mapCtrl.registerUserControlledColor(color);
                } else if (scope.colorGradient) {
                    color = {
                        type: 'gradient',
                        steps: scope.colorGradient
                    };
                } else if (scope.colorNumericRanges) {
                    if (!scope.colorByField && !scope['function']) {
                        console.error('odsMapLayer: using colorNumericRanges requires specifying either a field to use (using colorByField) or a function');
                    }
                    color = {
                        type: 'choropleth',
                        field: scope.colorByField,
                        ranges: scope.colorNumericRanges
                    };
                    if (scope.colorNumericRangeMin){
                        color.minValue = scope.colorNumericRangeMin;
                    }
                    if (scope.colorUndefined) {
                        color.undefinedColor = scope.colorUndefined;
                    }
                    if (scope.colorOutOfBounds) {
                        color.outOfBoundsColor = scope.colorOutOfBounds;
                    }
                } else if (scope.colorByField) {
                    color = {
                        type: 'field',
                        field: scope.colorByField,
                    };
                }

                var config = {
                    'color': color,
                    'colorFunction': scope.colorFunction,
                    'borderColor': scope.borderColor,
                    'borderSize': scope.borderSize,
                    'borderPattern': scope.borderPattern,
                    'borderOpacity': scope.borderOpacity,
                    'shapeOpacity': angular.isDefined(scope.shapeOpacity) && scope.shapeOpacity || scope.opacity,
                    'pointOpacity': angular.isDefined(scope.pointOpacity) && scope.pointOpacity || scope.opacity,
                    'lineWidth': scope.lineWidth,
                    'picto': scope.picto,
                    'display': scope.display,
                    'function': scope['function'],
                    'expression': scope.expression,
                    'localKey': scope.localKey,
                    'remoteKey': scope.remoteKey,
                    'tooltipSort': scope.tooltipSort,
                    'hoverField': scope.hoverField,
                    'excludeFromRefit': scope.excludeFromRefit,
                    'caption': !!scope.caption,
                    'captionTitle': scope.captionTitle,
                    'captionPictoIcon': scope.captionPictoIcon,
                    'captionPictoColor': scope.captionPictoColor,
                    'title': scope.title,
                    'description': scope.description,
                    'showZoomMin': scope.showZoomMin,
                    'showZoomMax': scope.showZoomMax,
                    'radius': scope.radius,
                    'size': scope.size,
                    'minSize': scope.sizeMin,
                    'maxSize': scope.sizeMax,
                    'sizeFunction': scope.sizeFunction,
                    'geoField': scope.geoField,
                    'tooltipDisabled': tooltipDisabled,
                };
                var layer = MapHelper.MapConfiguration.createLayerConfiguration(customTemplate, config);
                var layerGroup;
                if (layerGroupCtrl) {
                    // Register to the group
                    layerGroup = layerGroupCtrl.registerLayer(layer);
                } else {
                    // Register to the map
                    layerGroup = mapCtrl.registerLayer(layer);
                }

                if (attrs.showIf) {
                    scope.$watch('showIf', function(nv, ov) {
                        layerGroup.displayed = nv;
                    });
                }

                var unwatch = scope.$watch('context', function(nv) {
                    if (nv) {
                        layer.context = nv;
                        nv.wait().then(function() {
                            if (scope.showMarker) {
                                layer.marker = (scope.showMarker.toLowerCase() === 'true');
                            }
                            if (!angular.isDefined(scope.tooltipDisabled)) {
                                layer.tooltipDisabled = Boolean(scope.context.dataset.extra_metas.visualization.map_tooltip_disabled);
                            }
                            MapHelper.MapConfiguration.setLayerDisplaySettingsFromDefault(layer);
                        });
                        unwatch();
                    }
                });

                var unwatchJoinContext = scope.$watch('joinContext', function(nv) {
                    if (nv) {
                        layer.joinContext = nv;
                        unwatchJoinContext();
                    }
                });

                var unwatchRefineOnClick = scope.$watch('refineOnClickContext', function(nv) {
                    if (angular.isArray(nv)) {
                        // Check that all contexts are defined
                        var allDefined = true;
                        angular.forEach(nv, function(ctx) {
                            allDefined = allDefined && angular.isDefined(ctx);
                        });
                        if (!allDefined) {
                            return;
                        }

                    } else if (!nv) {
                        return;
                    }

                    layer.refineOnClick = [];
                    var contexts = angular.isArray(nv) && nv || [nv];
                    angular.forEach(contexts, function(ctx) {
                        var replaceRefine = false;
                        var attrname = 'refineOnClick' + ODS.StringUtils.capitalize(ctx.name);
                        if (angular.isDefined(attrs[attrname + 'ReplaceRefine'])) {
                            if (attrs[attrname + 'ReplaceRefine'] !== 'false') {
                                replaceRefine = true;
                            }
                        } else if (angular.isDefined(attrs.refineOnClickReplaceRefine)) {
                            if (attrs.refineOnClickReplaceRefine !== 'false') {
                                replaceRefine = true;
                            }
                        }
                        layer.refineOnClick.push({
                            context: ctx,
                            mapField: attrs[attrname + 'MapField'] || attrs.refineOnClickMapField,
                            contextField: attrs[attrname + 'ContextField'] || attrs.refineOnClickContextField,
                            replaceRefine: replaceRefine
                        });
                        unwatchRefineOnClick();
                    });
                });
            },
            controller: ['$scope', function($scope) {
            }]
        };
    }]);
}());
