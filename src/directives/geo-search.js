(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsGeoSearch', ['ModuleLazyLoader', 'ODSWidgetsConfig', function (ModuleLazyLoader, ODSWidgetsConfig) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGeoSearch
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog context} to use
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
            link: ['scope', 'element', function (scope, element) {
                var currentPolygonParameter;
                var polygonParameterRE = /.*polygon\(geographic_area,"(.*)"\).*/;

                var refineContext = function (layer) {
                    var geoJson = layer.toGeoJSON();
                    currentPolygonParameter = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(geoJson.geometry);
                    scope.context.parameters['q.geographic_area'] = '#polygon(geographic_area,"' + currentPolygonParameter + '")';
                    scope.$apply();
                };

                ModuleLazyLoader('leaflet').then(function () {
                    var map = new L.ODSMap(element.find('.odswidget-geo-search__map')[0], {
                        scrollWheelZoom: false,
                        basemapsList: [ODSWidgetsConfig.basemaps[0]],
                        disableAttribution: true
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
                    map.setView([0, 0], 0);

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
                        refineContext(layer);
                    });

                    scope.$watch('context.parameters', function (nv) {
                        // extract polygon parameter from query
                        var polygonParameter = false;
                        if (nv['q.geographic_area']) {
                            var matches = polygonParameterRE.exec(nv['q.geographic_area']);
                            if (matches.length > 0) {
                                polygonParameter = matches[1];
                            }
                        }

                        if (polygonParameter !== currentPolygonParameter) {
                            clearLayers();
                            if (polygonParameter) {
                                var layer = L.geoJson(ODS.GeoFilter.getPolygonParameterAsGeoJSON(polygonParameter));
                                drawnItems.addLayer(layer);
                            }
                            currentPolygonParameter = polygonParameter;
                        }
                    });
                });
            }]
        };
    }]);

}());
