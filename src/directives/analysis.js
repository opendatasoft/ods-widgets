(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsAnalysis', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAnalysis
         * @scope
         * @restrict A
         * @param {string} [odsAnalysis=analysis] Variable name to use
         * @param {DatasetContext} odsAnalysisContext {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} [odsAnalysisMax=all] Maximum number of results to show
         * @param {string} odsAnalysisSort name of serie to sort on (or -serieName to invert the sort)
         * @description
         * This widget exposes the results of an analysis (as an object containing a results array and optionally an aggregations object) in a variable available in the scope.
         * It can be used with AngularJS's ngRepeat to simply build a table of analysis results.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com">
         *              <table class="table table-bordered table-condensed table-striped">
         *                  <thead>
         *                      <tr>
         *                          <th>Tree name</th>
         *                          <th>Height</th>
         *                          <th>Circonference</th>
         *                      </tr>
         *                  </thead>
         *                  <tbody>
         *                      <tr ng-repeat="result in analysis.results"
         *                              ods-analysis="analysis"
         *                              ods-analysis-context="tree"
         *                              ods-analysis-max="10"
         *                              ods-analysis-x="espece"
         *                              ods-analysis-sort="circonference"
         *                              ods-analysis-serie-hauteur="AVG(hauteur)"
         *                              ods-analysis-serie-hauteur-cumulative="false"
         *                              ods-analysis-serie-circonference="AVG(circonf)"
         *                      >
         *                          <td>{{ result.x }}</td>
         *                          <td>{{ result.hauteur|number:2 }}</td>
         *                          <td>{{ result.circonference|number:2 }}</td>
         *                      </tr>
         *                  </tbody>
         *              </table>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        var parseCustomExpression = function(serie, parentserie_for_subseries) {
            var regex = /([A-Z_-]*?)\((.*?)\)/g;
            var params2regex = /([A-Z_-]*?)\(([a-zA-Z0-9\._]+),\s?([0-9\.]+)\)/g;
            var aggregates_holder = parentserie_for_subseries || serie;
            var match;

            serie.compiled_expr = "" + serie.expr;
            aggregates_holder.aggregates = [];

            var options = {};
            while (match = regex.exec(serie.expr)) {
                var extended_match = params2regex.exec(match[0]);
                if (extended_match && extended_match.length === 4) {
                    match = extended_match;
                }
                if (match && (match.length === 3 || match.length === 4)) {
                    if (match[2].indexOf('serie') === 0) {
                        var compiled = "operators." + match[1].toLowerCase() + ".apply(null, accumulation['" + match[2] + "']";
                        if (match.length === 4) {
                            compiled += ", " + match[3];
                        }
                        compiled += ")";
                        serie.compiled_expr = serie.compiled_expr.replace(match[0], compiled);
                        aggregates_holder.aggregates.push(match[2]);
                    } else { // we are really trying to get values from the index
                        options['func'] = match[1];
                        options['expr'] = match[2];
                        if (match[3]) {
                            options['subsets'] = match[3];
                        }
                        serie.compiled_expr += serie.compiled_expr.replace(match[0], 'y');
                    }
                }
            }
            return options;
        };

        return {
            restrict: 'A',
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                $scope[$attrs.odsAnalysisContext].wait().then(function() {
                    $scope.$watch($attrs.odsAnalysisContext, function(nv) {
                        var variable = $attrs.odsAnalysis || 'results';
                        var options = angular.extend({}, nv.parameters, {'maxpoints': $attrs.odsAnalysisMax || 0});
                        var aggregations = {}, series = {};
                        var xs = [];

                        if ($attrs.odsAnalysisSort) {
                            options.sort = $attrs.odsAnalysisSort;
                        }

                        angular.forEach($attrs, function(value, attr) {
                            var serie_name, cumulative;
                            if (attr.startsWith("odsAnalysisSerie")) {
                                serie_name = attr.replace("odsAnalysisSerie", "");
                                cumulative = false;
                                if (serie_name.endsWith("Cumulative")){
                                    if (serie_name.replace("Cumulative", "").length > 0) {
                                        serie_name = serie_name.replace("Cumulative", "");
                                        cumulative = value;
                                    } else {
                                        // serie name is in fact cumulative...
                                    }
                                }
                                serie_name = serie_name.toLowerCase();
                                if (!series[serie_name]) {
                                    series[serie_name] = {};
                                }
                                if (cumulative) {
                                    series[serie_name].cumulative = cumulative;
                                } else {
                                    var serie = {'expr': value};
                                    angular.extend(series[serie_name], parseCustomExpression(serie));
                                }
                            } else if (attr.startsWith("odsAnalysisAggregation")) {
                                serie_name = attr.replace("odsAnalysisAggregation", "");
                                serie_name = serie_name.toLowerCase();
                                if (!aggregations[serie_name]) {
                                    aggregations[serie_name] = {};
                                }
                                aggregations[serie_name].expr = serie_name;
                                aggregations[serie_name].func = value;
                            } else if (attr.startsWith("odsAnalysisX")) {
                                xs.push(value);
                            }
                        });

                        if (xs.length > 0) {
                            options.x = xs;
                        }

                        angular.forEach(series, function(serie, name) {
                            options["y." + name + ".expr"] = serie.expr;
                            options["y." + name + ".func"] = serie.func;
                            options["y." + name + ".cumulative"] = serie.cumulative || "false";
                            if (serie.func === 'QUANTILES') {
                                options["y." + name + ".subsets"] = serie.subsets || "50";
                            }

                            if (aggregations[name]) {
                                options['agg.' + name + '.expr'] = aggregations[name].expr;
                                options['agg.' + name + '.func'] = aggregations[name].func;
                            }
                        });

                        ODSAPI.records.analyze(nv, options).success(function(data) {
                            $scope[variable] = {};
                            if (angular.isArray(data)) {
                                $scope[variable] = {
                                    'results': data
                                };
                            } else {
                                $scope[variable] = data;
                            }
                        });
                    }, true);
                });
            }]
        };
    }]);

}());
