(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsThemePicto', ['ODSWidgetsConfig', '$http', function(ODSWidgetsConfig, $http) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsThemePicto
         * @scope
         * @restrict E
         * @param {string} theme The label of the theme to display the picto of.
         * @description
         * This widget displays the "picto" of a theme, based on the theme configuration. This element can be styled (height, width...),
         * especially if the picto is vectorial (SVG).
         *
         */
        var inlineImages = {};
        return {
            restrict: 'E',
            replace: true,
            scope: {
                theme: '@'
            },
            template: '<div class="odswidget-theme-picto theme-{{getTheme()|themeSlug}}"></div>',
            link: function(scope, element) {
                // TODO: IE8 fallback
                // TODO: png fallback
                var themeConfig = null;
                var defaultPicto = false;
                if (ODSWidgetsConfig.themes[scope.theme]) {
                    themeConfig = ODSWidgetsConfig.themes[scope.theme];
                } else {
                    themeConfig = ODSWidgetsConfig.themes['default'];
                    defaultPicto = true;
                }

                scope.getTheme = function() {
                    if (defaultPicto) {
                        return 'default';
                    } else {
                        return scope.theme;
                    }
                };

                var loadImageInline = function(code) {
                    var svg = angular.element(code);
                    if (themeConfig.color) {
                        svg.css('fill', themeConfig.color);
                    } else {
                        element.addClass('colorless');
                    }
                    element.append(svg);
                };

                var url = themeConfig.img;

                if (url.indexOf('.svg') === -1) {
                    // Normal image
                    element.append(angular.element('<img src="'+url+'"/>'));
                } else {
                    // SVG
                    if (inlineImages[scope.theme]) {
                        if (inlineImages[scope.theme].code) {
                            loadImageInline(inlineImages[scope.theme].code);
                        } else {
                            inlineImages[scope.theme].promise.success(function(data) {
                                loadImageInline(data);
                            });
                        }

                    } else {
                        var promise = $http.get(url);
                        inlineImages[scope.theme] = {promise: promise};
                        promise.success(function(data) {
                            inlineImages[scope.theme].code = data;
                            loadImageInline(data);
                        });
                    }
                }

            }
        };
    }]);
}());