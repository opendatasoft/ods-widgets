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
        /*
         * @ngdoc directive
         * @name ods-widgets.directive:odsVegaLiteChart
         * @restrict E
         * @scope
         * @param {object} spec A vega-lite chart specification object depending on the type parameter
         * @param {array} values An array whose items are data points
         *
         * @description
         * This widget builds a vega-lite chart according to the given specs. The
         * [tooltip](https://vega.github.io/vega-lite/docs/tooltip.html) plugin is installed.
         *
         * If there are multiple data series, use values-[myname] instead of values to clear ambiguity.
         *
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="stations,tree"
         *                               stations-domain="https://public.opendatasoft.com"
         *                               stations-dataset="jcdecaux_bike_data"
         *                               tree-dataset="arbresremarquablesparis2011"
         *                               tree-domain="https://parisdata.opendatasoft.com">
         *
         *              <!-- data from ods-results -->
         *
         *              <div ods-results="res"
         *                   ods-results-context="stations">
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "mark": "line",
         *                                          "encoding": {
         *                                              "x": {"field": "fields.name", "type": "nominal"},
         *                                              "y": {"field": "fields.available_bikes", "type": "quantitative"}
         *                                          }
         *                                       }'
         *                                       values="res"></ods-vega-lite-chart>
         *
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "data": {"name": "mystations"},
         *                                          "mark": "line",
         *                                          "encoding": {
         *                                              "x": {"field": "fields.name", "type": "nominal"},
         *                                              "y": {"field": "fields.available_bikes", "type": "quantitative"}
         *                                          }
         *                                        }'
         *                                        values-mystations="res"></ods-vega-lite-chart>
         *
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "vconcat": [
         *                                              {
         *                                                  "data": {"name": "mystations1"},
         *                                                  "mark": "line",
         *                                                  "encoding": {
         *                                                      "x": {"field": "fields.name", "type": "nominal"},
         *                                                      "y": {"field": "fields.available_bikes", "type": "quantitative"}
         *                                                  }
         *                                              },
         *                                              {
         *                                                  "data": {"name": "mystations2"},
         *                                                  "mark": "line",
         *                                                  "encoding": {
         *                                                      "x": {"field": "fields.name", "type": "nominal"},
         *                                                      "y": {"field": "fields.available_bikes", "type": "quantitative"}
         *                                                  }
         *                                              }
         *                                          ]
         *                                       }'
         *                                       values-mystations1="res"
         *                                       values-mystations2="res"></ods-vega-lite-chart>
         *              </div>
         *
         *              <!-- data from ods-analysis -->
         *
         *              <div ods-analysis="analysis"
         *                    ods-analysis-context="tree"
         *                    ods-analysis-max="10"
         *                    ods-analysis-x="espece"
         *                    ods-analysis-sort="circonferenceencm"
         *                    ods-analysis-serie-hauteur="AVG(hauteurenm)"
         *                    ods-analysis-serie-hauteur-cumulative="false"
         *                    ods-analysis-serie-circonference="AVG(circonferenceencm)">
         *                  <ods-vega-lite-chart spec='{
         *                                          "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
         *                                          "data": {"name": "trees"},
         *                                          "mark": "line",
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
                spec: '=',
            },
            link: function (scope, element, attrs) {
                var vegaView;
                var serieNames = getSerieNames(scope.spec);

                var initView = function () {
                    // build runtime from specs
                    var spec = scope.spec;
                    // insert dummy data in the case the user didn't specify a named 'values' prop
                    if (!spec.data && angular.equals(serieNames, ['_serie'])) {
                        spec.data = {name: '_serie', values: []};
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
                        .hover()
                        .run();
                };

                var watchData = function () {
                    angular.forEach(serieNames, function (serieName) {
                        scope.$watch(function () {
                            return getSerieValues(scope, attrs, serieName);
                        }, function (nv, ov) {
                            updateSerieValues(serieName, nv || []);
                        });
                    });
                };

                var updateSerieValues = function (name, values) {
                    var changeSet = vega.changeset()
                        .remove(function (d) { return true; })
                        .insert(values);
                    vegaView
                        .change(name, changeSet)
                        .resize()
                        .run();
                };

                scope.$on("$destroy", function () {
                    if (vegaView) {
                        vegaView.finalize();
                    }
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
