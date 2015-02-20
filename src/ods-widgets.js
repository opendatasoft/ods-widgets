(function() {
    'use strict';

    // ODS-Widgets, a library of web components to build interactive visualizations from APIs
    // by OpenDataSoft
    //  License: MIT
    var version = '0.1.5';
    //  Homepage: https://github.com/opendatasoft/ods-widgets

    var mod = angular.module('ods-widgets', ['infinite-scroll', 'ngSanitize', 'translate', 'translate.directives', 'translate.filters']);

    mod.provider('ODSWidgetsConfig', function() {
        /**
         * @ngdoc object
         * @name ods-widgets.ODSWidgetsConfigProvider
         * @description
         * Use `ODSWidgetsConfigProvider` to set configuration values used by various directives.
         * The available settings are:
         *
         * - **`defaultDomain`** - {@type string} - Value used as `domain` parameter for {@link ods-widgets.directive:odsCatalogContext Catalog Contexts}
         * and {@link ods-widgets.directive:odsDatasetContext Dataset Contexts} when none is specified. Defaults is '' (empty string), which means a local API (root is /).
         * - **`basemaps`** - {@type Array} A list of `basemap` objects.
         * - **`chartColors`** - {@type Array} A list of colors to use for charts. In each chart widget, the first chart will use the first color, the second chart
         * will use the second color, and so on until the end of the list is reached, and we start from the beginning of the list again. If not set, default colors will be used,
         * depending on the widgets themselves.
         * - **`disqusShortname`** - {@type string} - Shortname used by default for all {@link ods-widgets.directive:odsDisqus} widgets.
         * - **`themes`** - {@type Object} - Configuration of themes and their colors and/or picto
         *
         * @example
         * <pre>
         *   var app = angular.module('ods-widgets').config(function(ODSWidgetsConfigProvider) {
         *       ODSWidgetsConfig.setConfig({
         *           defaultDomain: '/myapi'
         *       });
         *   });
         * </pre>
         */
        /**
         * @ngdoc service
         * @name ods-widgets.ODSWidgetsConfig
         * @description
         * A service containing all the configuration values available. Available configuration values are described
         * in the {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfigProvider} documentation.
         */
        this.defaultConfig = {
            ODSWidgetsVersion: version,
            defaultDomain: '', // Defaults to local API
            language: null,
            disqusShortname: null,
            customAPIHeaders: null,
            basemaps: [
                {
                    "provider": "mapquest",
                    "label": "MapQuest"
                }
            ],
            mapGeobox: false,
            chartColors: null,
            mapPrependAttribution: null,
            basePath: null,
            websiteName: null,
            themes: {},
            defaultMapLocation: "12,48.85218,2.36996" // Paris
        };

        this.customConfig = {};

        this.setConfig = function(customConfig) {
            /**
             * @ngdoc method
             * @name ods-widgets.ODSWidgetsConfigProvider#setConfig
             * @methodOf ods-widgets.ODSWidgetsConfigProvider
             *
             * @description Sets configuration values by overriding existing values with the values from a new configuration
             * object. Existing values that are not present in the new object are left untouched.
             *
             * @param {Object=} customConfig An object containing the configuration values to override.
             */
            angular.extend(this.customConfig, customConfig);
        };

        this.$get = function() {
            return angular.extend({}, this.defaultConfig, this.customConfig);
        };
    });

    mod.run(['translate', 'ODSWidgetsConfig', function(translate, ODSWidgetsConfig) {
        // Initialize with an empty config so that at least it doesn't crash if
        // nobody bothers to add a translation dictionary.
        translate.add({});

        if (!ODSWidgetsConfig.basePath) {
            // Try to detect the path where ODS-Widgets is loaded from
            // Kudos to Leaflet for the idea
            var scriptTags = document.getElementsByTagName('script');

            var odswidgetsRE = /[\/^]ods-widgets(\.min)?\.js\??/;

            var i, src, matches, path;
            for (i=0; i<scriptTags.length; i++) {
                src = scriptTags[i].src;
                matches = src.match(odswidgetsRE);

                if (matches) {
                    path = src.split(odswidgetsRE)[0];
                    if (!path) {
                        // Path is '/'
                        ODSWidgetsConfig.basePath = '/';
                    } else if (path.substring(path.length-3) === '.js') {
                        // This is loaded from the same folder
                        ODSWidgetsConfig.basePath = '';
                    } else {
                        ODSWidgetsConfig.basePath = path + '/';
                    }
                }
            }
        }
    }]);
}());
