(function() {
    'use strict';

    angular.module('ods-widgets')
        .directive('odsGeotooltip', ['$timeout', 'ModuleLazyLoader', function ($timeout, ModuleLazyLoader) {
            /**
             * @ngdoc directive
             * @name ods-widgets.directive:odsGeotooltip
             * @scope
             * @restrict E
             * @param {Array|string} coords Coordinates of a point to display in the tooltip; either an array of two numbers as [latitude, longitude], or a string under the form of "latitude,longitude".
             * If you use a string, surround it with simple quotes to ensure Angular treats it as a string.
             * @param {Object} geojson GeoJSON object of a shape to display in the tooltip.
             * @param {number} [width=200] Width of the tooltip, in pixels.
             * @param {number} [height=200] Height of the tooltip, in pixels.
             * @param {number} [delay=500] Delay before the tooltip appears on hover, in milliseconds.
             *
             * @description
             * This directive, when used to surround a text, displays a tooltip showing a point and/or a shape in a map.
             *
             * @example
             * <pre>
             * <ods-geotooltip coords="'48,2'">my location</ods-geotooltip>
             * <ods-geotooltip coords="[48.04,2.12434]">my other location</ods-geotooltip>
             * </pre>
             */
            // The container is shared between directives to avoid performance issues
            var container = angular.element('<div id="odswidget-geotooltip" class="odswidget" style="opacity: 0; transition: opacity 200ms ease-out; position: fixed; z-index: 40000; visibility: hidden;"></div>');
            var map = null;
            var layerGroup = null;

            var displayTooltip = function(tippedElement, width, height, coords, geoJson) {
                // Make the container the right size
                var resized = false;
                if (width !== container.css('width') || height !== container.css('height')) {
                    resized = true;
                }
                container.css('width', width);
                container.css('height', height);

                // Position it at the right place
                var availableBottomSpace = jQuery(window).height()-(tippedElement.offset().top-jQuery(document).scrollTop());
                if (container.height() < availableBottomSpace) {
                    // There is enough space below: let's place the tooltip right below the element
                    container.css('top', tippedElement.height()+tippedElement.offset().top-jQuery(document).scrollTop()+5+'px');
                } else {
                    container.css('top', tippedElement.offset().top-jQuery(document).scrollTop()-5-container.height()+'px');
                }
                var availableRightSpace = jQuery(window).width()-(tippedElement.offset().left-jQuery(document).scrollLeft());
                if (container.width() < availableRightSpace) {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()+'px');
                } else {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()-container.width()+'px');
                }
                tippedElement.after(container);

                if (map === null) {
                    map = new L.map(container[0], {zoomControl: false});
                    var tileLayer = new L.TileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
                        minZoom: 1,
                        maxZoom: 16,
                        attribution: 'Tiles <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>',
                        subdomains: '1234'
                    });
                    map.addLayer(tileLayer);
                } else if (resized) {
                    map.invalidateSize();
                }

                if (layerGroup !== null) {
                    map.removeLayer(layerGroup);
                }
                layerGroup = L.layerGroup();
                var bounds = new L.LatLngBounds();

                if (coords) {
                    if (angular.isString(coords)) {
                        coords = coords.split(',');
                    }
                    var point = new L.LatLng(coords[0], coords[1]);
                    var pointLayer = L.marker(point);
                    layerGroup.addLayer(pointLayer);
                    bounds.extend(point);
                }

                if (geoJson) {
                    if (angular.isString(geoJson)) {
                        geoJson = angular.fromJson(geoJson);
                    }
                    var geoJsonLayer = L.geoJson(geoJson);
                    layerGroup.addLayer(geoJsonLayer);
                    bounds.extend(geoJsonLayer.getBounds());
                }

                layerGroup.addTo(map);
                map.fitBounds(bounds, {reset: true});
                container.css('opacity', '1');
                container.css('visibility', 'visible');
            };

            var hideTooltip = function() {
                container.css('opacity', '0');
                $timeout(function() {
                    container.css('visibility', 'hidden');
                }, 200);
            };

            return {
                template: '<span ng-transclude style="border-bottom: 1px dotted #000000; cursor: help;" class="geotooltip"></span>',
                replace: true,
                restrict: 'E',
                transclude: true,
                scope: {
                    'coords': '=',
                    'width': '@',
                    'height': '@',
                    'delay': '@',
                    'geojson': '='
                },
                link: function(scope, element, attrs) {
                    ModuleLazyLoader('leaflet').then(function() {
                        var tooltipWidth = (attrs.width || 200) + 'px';
                        var tooltipHeight = (attrs.height || 200) + 'px';
                        var tooltipPop = null;
                        var delay = attrs.delay || 500;

                        // Events
                        element.bind('mouseenter', function() {
                            if (delay === 0) {
                                displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                            } else {
                                tooltipPop = $timeout(function() {
                                    displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                                    tooltipPop = null;
                                }, delay);
                            }
                        });
                        element.bind('click', function() {
                            displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                            if (tooltipPop !== null) {
                                // Chances are we triggered the original timer
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }
                        });
                        element.bind('mouseleave', function() {
                            hideTooltip();
                            if (tooltipPop !== null) {
                                // We are currently counting down until the tooltip appearance, let's forget it
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }

                        });
                    });
                }
            };
        }]);
}());