(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsPicto', ['SVGInliner', '$http', '$document', function(SVGInliner, $http, $document) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPicto
         * @scope
         * @restrict E
         * @param {string} url The url of the svg or image to display
         * @param {string} color The color to use to fill the svg
         * @param {string} classes The classes to directly apply to the svg element
         * @description
         * This widget displays a "picto" specified by a url and force a fill color on it.
         * This element can be styled (height, width...), especially if the picto is vectorial (SVG).
         * @todo implement defs and use in svg
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                url: '=',
                color: '=',
                classes: '='
            },
            template: '<div class="odswidget odswidget-picto {{ classes }}"></div>',
            link: function(scope, element) {
                var svgContainer;
                scope.$watch('[url, color]', function(nv) {
                    if (nv[0]) {
                        if (Modernizr && !Modernizr.svg) {
                            return;
                        }
                        if (svgContainer) {
                            element.empty();
                        }
                        svgContainer = SVGInliner.getElement(scope.url, scope.color);
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
         * @param {string} theme The label of the theme to display the picto of.
         * @description
         * This widget displays the "picto" of a theme, based on the `themes` setting in {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig}.
         * This element can be styled (height, width...), especially if the picto is vectorial (SVG).
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
                var themeConfig = null;
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
                color: '@'
            },
            template: '',
            link: function(scope, element) {
                scope.originalClasses = element.attr('class').replace('ng-isolate-scope', '').trim();
                var template = '<ods-picto url="pictoUrl" color="color" classes="originalClasses + \' odswidget-map-picto\'"></ods-picto>';

                scope.$watch('[name, color]', function() {
                    scope.pictoUrl = PictoHelper.mapPictoToURL(scope.name);
                    if (scope.pictoUrl) {
                        element.replaceWith(angular.element($compile(template)(scope)));
                    }
                }, true);
            }
        };
    }]);
}());