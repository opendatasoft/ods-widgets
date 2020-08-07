(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsGeoSearch', ['ModuleLazyLoader', 'ODSWidgetsConfig', 'MapHelper', function (ModuleLazyLoader, ODSWidgetsConfig, MapHelper) {
        /**
         * @deprecated
         * @name ods-widgets.directive:odsGeoSearch
         * @scope
         * @restrict E
         * @param {CatalogContext|CatalogContext[]} context
         * {@link ods-widgets.directive:odsCatalogContext Catalog context} or array of contexts to use.
         *
         * @description
         * This widget displays a mini map with a draw-rectangle tool that can be used to search through a catalog.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-geo-search">' +
            '    <div class="odswidget-geo-search__map"></div>' +
            '</div>',
            scope: {
                context: '='
            },
            link: function (scope, element) {
                var currentPolygonParameter;
                var polygonParameterRE = /.*polygon\(geographic_area,"(.*)"\).*/;

                var refineContexts = function (layer) {
                    var geoJson = layer.toGeoJSON();
                    currentPolygonParameter = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(geoJson.geometry);
                    var contexts = angular.isArray(scope.context) ? scope.context : [scope.context];
                    angular.forEach(contexts, function (context) {
                        context.parameters['q.geographic_area'] = '#polygon(geographic_area,"' + currentPolygonParameter + '")';
                    });
                    scope.$apply();
                };

                ModuleLazyLoader('leaflet').then(function () {
                    var map = new L.ODSMap(element.find('.odswidget-geo-search__map')[0], {
                        scrollWheelZoom: false,
                        basemapsList: [ODSWidgetsConfig.basemaps[0]],
                        disableAttribution: true,
                        maxBounds: [[-90, -180], [90, 180]]
                    });

                    var drawnItems = new L.FeatureGroup();
                    map.addLayer(drawnItems);
                    var drawControl = new L.Control.Draw({
                        edit: {
                            featureGroup: drawnItems,
                            edit: false,
                            remove: false
                        },
                        draw: {
                            polyline: false,
                            marker: false,
                            polygon: false,
                            circle: false
                        }
                    });
                    map.addControl(drawControl);
                    if (angular.isDefined(ODSWidgetsConfig.defaultMapLocation)) {
                        var loc = MapHelper.getLocationStructure(ODSWidgetsConfig.defaultMapLocation);
                        map.setView(loc.center, loc.zoom);
                    } else {
                        map.setView([0, 0], 0);
                    }

                    var clearLayers = function () {
                        if (drawnItems.getLayers().length > 0) {
                            drawnItems.removeLayer(drawnItems.getLayers()[0]);
                        }
                    };

                    map.on('draw:drawstart', function () {
                        clearLayers();
                    });
                    map.on('draw:created', function (event) {
                        var layer = event.layer;
                        drawnItems.addLayer(layer);
                        refineContexts(layer);
                    });

                    scope.$watch('context', function (nv) {
                        // extract polygon parameter from query
                        var polygonParameter = false;
                        var contexts = angular.isArray(nv) ? nv : [nv];
                        angular.forEach(contexts, function (context) {
                            if (!polygonParameter && context.parameters && context.parameters['q.geographic_area']) {
                                var matches = polygonParameterRE.exec(context.parameters['q.geographic_area']);
                                if (matches.length > 0) {
                                    polygonParameter = matches[1];
                                }
                            }
                        });

                        if (polygonParameter !== currentPolygonParameter) {
                            clearLayers();
                            if (polygonParameter) {
                                var layer = L.geoJson(ODS.GeoFilter.getPolygonParameterAsGeoJSON(polygonParameter));
                                drawnItems.addLayer(layer);
                            }
                            currentPolygonParameter = polygonParameter;
                        }
                    }, true);
                });
            }
        };
    }]);

}());
