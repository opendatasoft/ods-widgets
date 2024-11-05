(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    // This symbol is only available inside this module, and is used as a token to indicate to odsPicto that it is being
    // instantiated by odsThemePicto. This is used as a temporary measure so that we can apply rigorous restrictions to
    // odsPicto URLs when used in user content, but not when used via odsThemePicto, until odsThemePicto doesn't use
    // odsPicto anymore (https://app.shortcut.com/opendatasoft/story/49785/odsthemepicto-and-themepicto-should-load-svg-files-using-an-img-tag)
    var originThemePicto = Symbol('ods-theme-picto');

    mod.directive('odsPicto', ['SVGInliner', 'ODSWidgetsConfig', '$http', '$document', function(SVGInliner, ODSWidgetsConfig, $http, $document) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPicto
         * @scope
         * @restrict E
         * @param {string} url The URL of the SVG or image to display
         * @param {string} localId The ID of the SVG to use in the current page
         * @param {string} color The color to use to fill the SVG
         * @param {Object} colorByAttribute An object containing a mapping between elements within the SVG, and colors.
         * The elements within the SVG with a matching `data-fill-id` attribute take the corresponding color.
         * @param {string} classes The classes to directly apply to the SVG element
         * @description
         * The odsPicto widget displays a pictogram specified by a URL or the ID of a SVG to duplicate from the same page,
         * and forces a fill color on it.
         * This element can be styled (height, width, etc.), especially if the pictogram is vectorial (SVG).
         *
         * Either the `url` or `localId` attributes have to be used.
         *
         * In the case of `localId`, the recommended use is to include the code of the SVG inside your HTML document,
         * with a `display: none` style attribute at the root, on the `svg` node. This inlined SVG will be duplicated,
         * the `display: none` removed, and this new duplicated and colored SVG will be inserted in place of the odsPicto
         * element.
         *
         * All parameters expect javascript variables or literals. If you want to provide hardcoded strings, you'll have to wrap them in quotes, as shown in the following example.
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
                localId: '=',
                color: '=',
                colorByAttribute: '=',
                classes: '=',
                origin: '=',
            },

            template: '<div class="odswidget odswidget-picto {{ classes }}"></div>',
            link: function(scope, element) {
                var svgContainer;
                scope.$watch('[url, localId, color, colorByAttribute]', function(nv) {
                    var url = nv[0],
                        localId = nv[1];

                    if (url || localId) {
                        if (svgContainer) {
                            element.empty();
                        }
                        if (localId) {
                            svgContainer = SVGInliner.getLocalElement(scope.localId, scope.color, scope.colorByAttribute);
                        } else {
                            if (!ODSWidgetsConfig.allowExternalPictoUrls && scope.origin !== originThemePicto) {
                                // Enforce ODS pictos only
                                // We only allow SVG URLs maintained by ODS, so that we can guarantee that inlining them
                                // doesn't cause any potential security issue.
                                if (
                                    // Default picto and fallback
                                    url !== '/static/ods/img/themes/odslogo.svg' &&
                                    // set-v2 and set-v3 built-in pictos
                                    !url.startsWith('/static/pictos/img/') &&
                                    // Georefs for static choropleths (https://codelibrary.opendatasoft.com/widget-tricks/svg-maps/)
                                    !url.startsWith('https://static.opendatasoft.com/georef/svg/') &&
                                    // Built-in pictos on other ODS domains
                                    !/^https:\/\/[a-z0-9-]*\.opendatasoft\.com\/static\/pictos\/img\//.test(url)
                                ) {
                                    console.warn('External URLs are not supported by ods-picto. ('+url+')');
                                    return;
                                }
                            }

                            svgContainer = SVGInliner.getElement(scope.url, scope.color, scope.colorByAttribute);
                        }
                        if (!svgContainer) {
                            return;
                        }
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
                var isNewRender = Boolean(new URL(window.location.href).searchParams.get('newthemes'));

                scope.originalClasses = element.attr('class').replace('ng-isolate-scope', '').trim();

                var template;
                if (isNewRender) {
                    template = '' +
                        '<div class="odswidget odswidget-picto odswidget-theme-picto {{ originalClasses }} theme-{{getTheme()|themeSlug}}">' +
                        // Make sure non-square images are vertically aligned in the center
                        '   <div class="odswidget-theme-picto__container">' +
                        '       <img ng-src="{{ themeConfig.url }}" aria-label="Theme of this dataset: {{ theme|firstValue }}" translate="aria-label">' +
                        '   </div>' +
                        '</div>';
                } else {
                    scope.origin = originThemePicto;
                    template = '<ods-picto origin="origin" url="themeConfig.url" aria-label="Theme of this dataset: {{ theme|firstValue }}" translate="aria-label" color="themeConfig.color" classes="originalClasses + \' odswidget-theme-picto theme-\' + (getTheme()|themeSlug) "></ods-picto>';
                }
                var defaultPicto = false;
                if (ODSWidgetsConfig.themes[scope.theme] && ODSWidgetsConfig.themes[scope.theme].url) {
                    scope.themeConfig = ODSWidgetsConfig.themes[scope.theme];
                } else {
                    // No matching theme
                    scope.themeConfig = ODSWidgetsConfig.themes['default'] || {};
                    defaultPicto = true;
                }

                if (!ODS.URLUtils.isODSPicto(scope.themeConfig.url)) {
                    // Custom SVG should not be colorized or applied any color rule
                    // https://app.shortcut.com/opendatasoft/story/49783/remove-coloring-for-custom-svg-theme-pictos
                    scope.themeConfig.color = null;
                }

                if (isNewRender && ODS.URLUtils.isODSPicto(scope.themeConfig.url)) {
                    // Use backend-based coloring
                    var urlTokens = scope.themeConfig.url.split('/');
                    var pictoSet = urlTokens[4].replace('set-', ''),
                        pictoName = urlTokens[urlTokens.length-1];
                    scope.themeConfig.url = '/picto/' + pictoSet + ':' + pictoName + '/?color=' + encodeURIComponent(scope.themeConfig.color);
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
