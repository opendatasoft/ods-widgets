(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsPicto', ['SVGInliner', '$http', '$document', function(SVGInliner, $http, $document) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPicto
         * @scope
         * @restrict E
         * @param {string} url The URL of the SVG or image to display
         * @param {string} color The color to use to fill the SVG
         * @param {Object} colorByAttribute An object containing a mapping between elements within the SVG, and colors.
         * The elements within the SVG with a matching `data-fill-id` attribute take the corresponding color.
         * @param {string} classes The classes to directly apply to the SVG element
         * @description
         * The odsPicto widget displays a pictogram specified by a URL and forces a fill color on it.
         * This element can be styled (height, width, etc.), especially if the pictogram is vectorial (SVG).
         *
         * All parameters expect javascript variables or literals. If you want to provide hardcoded strings, you'll have to wrap them in quotes, as shown in the following example.
         * @todo implement defs and use in svg
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-picto url="'assets/opendatasoft-logo.svg'"
         *                     color="'#33629C'" style="width: 64px; height: 64px"></ods-picto>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                url: '=',
                color: '=',
                colorByAttribute: '=',
                classes: '='
            },

            template: '<div class="odswidget odswidget-picto {{ classes }}"></div>',
            link: function(scope, element) {
                var svgContainer;
                scope.$watch('[url, color, colorByAttribute]', function(nv) {
                    if (nv[0]) {
                        if (svgContainer) {
                            element.empty();
                        }
                        svgContainer = SVGInliner.getElement(scope.url, scope.color, scope.colorByAttribute);
                        if (!scope.color) {
                            svgContainer.addClass('ods-svginliner__svg-container--colorless');
                        }
                        element.append(svgContainer);
                    }
                }, true);
            }
        };
    }]);

    mod.directive('odsThemePicto', ['ODSWidgetsConfig', '$compile', function(ODSWidgetsConfig, $compile) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsThemePicto
         * @scope
         * @restrict E
         * @param {string} theme The label of the theme to display the pictogram of
         * @description
         * The odsThemePicto widget displays the pictogram of a theme based on the `themes` setting in {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig}.
         * This element can be styled (height, width, etc.), especially if the pictogram is vectorial (SVG).
         *
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                theme: '@'
            },
            template: '',
            link: function(scope, element) {
                scope.originalClasses = element.attr('class').replace('ng-isolate-scope', '').trim();
                var template = '<ods-picto url="themeConfig.url" aria-label="Theme of this dataset: {{ theme|firstValue }}" translate="aria-label" color="themeConfig.color" classes="originalClasses + \' odswidget-theme-picto theme-\' + (getTheme()|themeSlug) "></ods-picto>';
                var defaultPicto = false;
                if (ODSWidgetsConfig.themes[scope.theme] && ODSWidgetsConfig.themes[scope.theme].url) {
                    scope.themeConfig = ODSWidgetsConfig.themes[scope.theme];
                } else {
                    scope.themeConfig = ODSWidgetsConfig.themes['default'];
                    defaultPicto = true;
                }
                scope.getTheme = function() {
                    if (defaultPicto) {
                        return 'default';
                    } else {
                        return scope.theme;
                    }
                };
                if (scope.themeConfig) {
                    element.replaceWith(angular.element($compile(template)(scope)));
                }
            }
        };
    }]);

    mod.directive('odsMapPicto', ['ODSWidgetsConfig', 'PictoHelper', '$compile', function(ODSWidgetsConfig, PictoHelper, $compile) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                name: '@',
                color: '@',
                context: '='
            },
            template: '',
            link: function(scope, element) {
                scope.originalClasses = element.attr('class').replace('ng-isolate-scope', '').trim();
                var template = '<ods-picto url="pictoUrl" color="color" classes="originalClasses + \' odswidget-map-picto\'"></ods-picto>';

                scope.$watch('[name, color]', function() {
                    scope.pictoUrl = PictoHelper.mapPictoToURL(scope.name, scope.context);
                    if (scope.pictoUrl) {
                        element.replaceWith(angular.element($compile(template)(scope)));
                    }
                }, true);
            }
        };
    }]);
}());
