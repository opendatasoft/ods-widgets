(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    var getSerieNames = function (spec) {
        // TODO: this only checks for data at the root of the spec object or directly beneath vconcat/hconcat.
        // However hconcat and vconcat can be nested. We should have a recursive method here.
        var i,
            serieNames = [];

        if (spec.hasOwnProperty('data')) {
            // single view or faceted view
            if (spec.data.name) {
                serieNames.push(spec.data.name);
            }
        } else if (spec.hasOwnProperty('vconcat')) {
            for (i = 0; i < spec.vconcat.length; i++) {
                if (spec.vconcat[i].data.name) {
                    serieNames.push(spec.vconcat[i].data.name);
                }
            }
        } else if (spec.hasOwnProperty('hconcat')) {
            for (i = 0; i < spec.hconcat.length; i++) {
                if (spec.hconcat[i].data.name) {
                    serieNames.push(spec.hconcat[i].data.name);
                }
            }
        } else {
            serieNames = ['_serie'];
        }
        return serieNames;
    };

    var getSerieAttrName = function (serieName) {
        if (serieName === '_serie') {
            return 'values';
        }
        return 'values' + ODS.StringUtils.capitalize(serieName);
    };

    var getSerieValues = function (scope, attrs, serieName) {
        return scope.$parent.$eval(attrs[getSerieAttrName(serieName)]);
    };

    mod.directive('odsVegaLiteChart', ['ModuleLazyLoader', function (ModuleLazyLoader) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsVegaLiteChart
         * @restrict E
         * @scope
         * @param {string} [spec] A JSON string representation of a Vega-Lite chart specification object
         * @param {array} [values{DataSourceName}] An array of data points
         *
         * @description
         * The odsVegaLiteChart widget builds a vega-lite chart according to the given specifications.
         * For more information about vega-lite configuration, see the  [Vega-Lite documentation](https://vega.github.io/vega-lite/docs/).
         *
         * The data sources must be declared in the Vega-Lite specification like this:
         * ```
         * "data": {"name": "mydatasource"},
         * ```
         * You can then specify an attribute on the widget called `values-mydatasource` that will receive the array
         * of values to be used in the chart.
         *
         * The dimensions of the chart can be controlled using two different methods:
         * - Use the width and height attributes in the vega specification. In this case, the chart dimensions will be fixed to these values.
         * - Do not specify the width and height in the vega specification. In this case, the chart will fill its container. You can control the container dimensions by applying CSS rules to `odswidget-vega-lite-chart`.
         *
         * The [tooltip](https://vega.github.io/vega-lite/docs/tooltip.html) plugin for vega is installed.
         *
         * Note: The widget currently uses Vega-Lite 3.0.0.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="commute,tree,demographics"
         *                               commute-dataset="average-commute-time-by-county"
         *                               commute-parameters="{'fields': 'county,commuting_time'}"
         *                               commute-domain="https://documentation-resources.opendatasoft.com/"
         *                               tree-dataset="les-arbres-remarquables-de-paris"
         *                               tree-domain="https://documentation-resources.opendatasoft.com/"
         *                               demographics-dataset="us-cities-demographics"
         *                               demographics-domain="https://documentation-resources.opendatasoft.com/">
         *
         *              <!-- data from ods-results -->
         *
         *              <div ods-results="res"
         *                   ods-results-context="commute">
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "data": {"name": "counties"},
         *                                          "mark": "bar",
         *                                          "encoding": {
         *                                              "x": {"field": "fields.county", "type": "nominal"},
         *                                              "y": {"field": "fields.commuting_time", "type": "quantitative"}
         *                                          }
         *                                        }'
         *                                        values-counties="res"></ods-vega-lite-chart>
         *              </div>
         *
         *              <!-- data from ods-analysis -->
         *
         *              <div ods-analysis="analysis"
         *                    ods-analysis-context="tree"
         *                    ods-analysis-max="10"
         *                    ods-analysis-x="espece"
         *                    ods-analysis-sort="circonference_en_cm"
         *                    ods-analysis-serie-hauteur="AVG(hauteur_en_m)"
         *                    ods-analysis-serie-hauteur-cumulative="false"
         *                    ods-analysis-serie-circonference="AVG(circonference_en_cm)">
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "data": {"name": "trees"},
         *                                          "mark": "bar",
         *                                          "encoding": {
         *                                              "x": {"field": "x", "type": "nominal"},
         *                                              "y": {"field": "hauteur", "type": "quantitative"}
         *                                          }
         *                                       }'
         *                                       values-trees="analysis.results"></ods-vega-lite-chart>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<div class="odswidget odswidget-vega-lite-chart">' +
                '   <div class="vega-chart"></div>' +
                '</div>',
            scope: {
                spec: '='
            },
            link: function (scope, element, attrs) {
                var vegaView;
                var serieNames = getSerieNames(scope.spec);
                var resizeTimeout;
                var autoWidth = false;
                var autoHeight = false;

                var setDimensions = function() {
                    var dimensions = element.get(0).getBoundingClientRect();
                    if (autoWidth) {
                        vegaView.width(dimensions.width);
                    }
                    if (autoHeight) {
                        vegaView.height(dimensions.height);
                    }
                };

                var _resizeHandler = function() {
                    setDimensions();
                    return vegaView.resize().runAsync();
                };

                var resizeHandler = function() {
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = undefined;
                    }
                    resizeTimeout = setTimeout(_resizeHandler, 200);
                };

                var initView = function () {
                    // build runtime from specs
                    var spec = scope.spec;
                    var specAutosize;
                    var multiLayerViz = spec.hasOwnProperty('vconcat') ||
                        spec.hasOwnProperty('hconcat') ||
                        spec.hasOwnProperty('repeat') ||
                        spec.hasOwnProperty('facet');

                    // insert dummy data in the case the user didn't specify a named 'values' prop
                    if (!spec.data && angular.equals(serieNames, ['_serie'])) {
                        spec.data = {name: '_serie', values: []};
                    }

                    if (!multiLayerViz) {
                        if (!spec.width) {
                            // if spec has no width, autosize to container width
                            autoWidth = true;
                            spec.width = 1;
                        }

                        if (!spec.height) {
                            autoHeight = true;
                            spec.height = 1;
                        }

                        // except if otherwise specified in the spec, force vega autosize to fit padding
                        if (typeof spec.autosize === "string") {
                            specAutosize = {
                                type: spec.autosize,
                            };
                        } else {
                            specAutosize = spec.autosize || {};
                        }

                        spec.autosize = {};

                        Object.assign(spec.autosize, {
                            "type": "fit",
                            "contains": "padding"
                        }, specAutosize);
                    }
                    spec = vl.compile(spec).spec;
                    var runtime = vega.parse(spec);

                    // use vega-tooltip for html tooltips
                    var tooltipHandler = new vegaTooltip.Handler();

                    // create vega view
                    vegaView = new vega.View(runtime)
                        .renderer('canvas')
                        .tooltip(tooltipHandler.call)
                        .initialize(element.find('.vega-chart')[0])
                        .hover();

                    if (autoWidth || autoHeight) {
                        setDimensions();
                        window.addEventListener('resize', resizeHandler);
                    }
                };

                var watchData = function () {
                    angular.forEach(serieNames, function (serieName) {
                        scope.$watch(function () {
                            var data = getSerieValues(scope, attrs, serieName);
                            return data;
                        }, function (nv, ov) {
                            if (typeof nv !== "undefined") {
                                updateSerieValues(serieName, angular.copy(nv) || []);
                            }
                        }, true);
                    });
                };

                var updateSerieValues = function (name, values) {
                    var changeSet = vega.changeset()
                        .remove(function (d) { return true; })
                        .insert(values);
                    vegaView
                        .change(name, changeSet)
                        .resize()
                        .runAsync();
                };

                scope.$on("$destroy", function () {
                    if (vegaView) {
                        vegaView.finalize();
                    }
                    window.removeEventListener('resize', resizeHandler);
                });

                // init

                ModuleLazyLoader('vega').then(function () {
                    // init Vega
                    var unwatch = scope.$watch('spec', function (spec) {
                        if (spec) {
                            unwatch();
                            initView();
                            watchData();
                        }
                    });
                });
            },
        };
    }]);
}());
