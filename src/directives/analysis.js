(function() {
    'use strict';

    var checkCondition = function checkCondition(scope, condition_expr, value) {
        try {
            return !!(scope.$eval(condition_expr, {
                                y: value
                            }));
        } catch (e) {
            console.warn("Error while compiling condition with expr", condition_expr);
        }
        return false;
    };

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
         *                              ods-analysis-sort="circonferenceencm"
         *                              ods-analysis-serie-hauteur="AVG(hauteurenm)"
         *                              ods-analysis-serie-hauteur-cumulative="false"
         *                              ods-analysis-serie-circonference="AVG(circonferenceencm)"
         *                      >
         *                          <td>{{ result.x }}</td>
         *                          <td>{{ result.hauteur|number:2 }}</td>
         *                          <td>{{ result.circonference|number:2 }}</td>
         *                      </tr>
         *                  </tbody>
         *              </table>
         *          </ods-dataset-context>
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


    mod.directive('odsAnalysisSerie', [function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAnalysisSerie
         * @scope
         * @restrict A
         * @param {string} odsAnalysisSerie Analysis results
         * @param {string} odsAnalysisSerieCondition The condition to that the value must validate to be part of the serie. 'y' will be replaced by the value
         * @param {string} odsAnalysisSerieName name of the serie to check for validation
         * @param {string} odsAnalysisSerieSeparateOnX name of the x axis in the analysis response used to split series
         * @param {string} odsAnalysisSerieMode if mode is set to "reduce", keep only the longest serie of all splited series. Requires separate-on-x parameter.
         * @description
         * This widget exposes only keeps the longest serie in the results from an analysis.
         * Results can be used as if coming from an analysis widget (and use a subaggregation on it for example)
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com">
         *              <div
         *                      ods-analysis="analysis"
         *                      ods-analysis-context="tree"
         *                      ods-analysis-max="10"
         *                      ods-analysis-x="family"
         *                      ods-analysis-x="espece"
         *                      ods-analysis-sort="circonference"
         *                      ods-analysis-serie-hauteur="AVG(hauteur)"
         *                      ods-analysis-serie-hauteur-cumulative="false"
         *                      ods-analysis-serie-circonference="AVG(circonf)"
         *              >
         *                 <div
         *                      ods-analysis-serie="analysis.results"
         *                      ods-analysis-serie-condition="y > 20"
         *                      ods-analysis-serie-name="hauteur"
         *                      ods-analysis-serie-separate-on-x="family">
         *                     Longest serie: {{ results.length }}
         *                 </div>
         *              </div>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com">
         *              <div
         *                      ods-analysis="analysis"
         *                      ods-analysis-context="tree"
         *                      ods-analysis-max="10"
         *                      ods-analysis-x="family"
         *                      ods-analysis-x="espece"
         *                      ods-analysis-sort="circonference"
         *                      ods-analysis-serie-hauteur="AVG(hauteur)"
         *                      ods-analysis-serie-hauteur-cumulative="false"
         *                      ods-analysis-serie-circonference="AVG(circonf)"
         *              >
         *                 <div
         *                      ods-analysis-serie="analysis.results"
         *                      ods-analysis-serie-condition="y > 20"
         *                      ods-analysis-serie-name="hauteur"
         *                      ods-analysis-serie-separate-on-x="family">
         *                      ods-analysis-serie-mode="reduce">
         *                     Longest serie: {{ results.length }}
         *                 </div>
         *              </div>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                $scope.condition = '';
                $scope.field = '';
                $scope.$watch($attrs.odsAnalysisSerieCondition, function(nv) {
                    if (!$attrs.odsAnalysisSerieCondition) {
                        return;
                    }
                    $scope.condition = $attrs.odsAnalysisSerieCondition;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieName, function(nv) {
                    if (!$attrs.odsAnalysisSerieName) {
                        return;
                    }
                    $scope.name = $attrs.odsAnalysisSerieName;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieSeparateOnX, function(nv) {
                    if (!$attrs.odsAnalysisSerieSeparateOnX) {
                        return;
                    }
                    $scope.separateOnX = $attrs.odsAnalysisSerieSeparateOnX;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieMode, function(nv) {
                    if (!$attrs.odsAnalysisSerieMode) {
                        return;
                    }
                    $scope.mode = $attrs.odsAnalysisSerieMode;
                }, true);
            }],
            link: function(scope, element, attrs) {
                scope.$watch(attrs.odsAnalysisSerie, function(nv, ov) {
                    var analysis = nv,
                        i,
                        result,
                        currentValue,
                        longest_results = {},
                        currentXAxis;

                    if (scope.separateOnX) {
                        longest_results = {};
                    }
                    scope.results = {};

                    if (analysis) {
                        result = {};

                        for (i = 0; i < analysis.length; i++) {
                            currentValue = analysis[i][scope.name];
                            if ( scope.separateOnX ) {
                                currentXAxis = analysis[i]['x'][scope.separateOnX];
                            } else {
                                currentXAxis = "global";
                            }
                            if ( checkCondition(scope, scope.condition, currentValue) ) {
                                if ( !longest_results[currentXAxis] ) {
                                     longest_results[currentXAxis] = [];
                                }
                                longest_results[currentXAxis].push(analysis[i]);
                            } else {
                                if ( longest_results[currentXAxis] ) {
                                    if ( !result[currentXAxis] || result[currentXAxis].length < longest_results[currentXAxis].length ) {
                                        result[currentXAxis] = longest_results[currentXAxis];
                                    }
                                    longest_results[currentXAxis] = false;
                                }
                            }
                        }
                        angular.forEach(longest_results, function(longest_result, x) {
                            if ( !result[x] || result[x].length < longest_result.length ) {
                                result[x] = longest_result;
                            }
                        });

                        if ( scope.mode == "reduce" && scope.separateOnX ) {
                            var keys = Object.keys(result);
                            var biggest = [];
                            for (i = 0; i < keys.length; i++) {
                                if (result[keys[i]].length > biggest.length) {
                                    biggest = result[keys[i]];
                                }
                            }
                            angular.copy({'global': biggest}, scope.results);
                        } else {
                            angular.copy(result, scope.results);
                        }
                    }
                });
            }
        };
    }]);

    mod.directive('odsSubaggregation', ['ModuleLazyLoader', function(ModuleLazyLoader) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSubaggregation
         * @scope
         * @restrict A
         * @param {string} odsSubaggregation Analysis results
         * @param {number} odsSubaggregationSerie* Aggregation expression
         * @description
         * This widget computes aggregations on an analysis result. It
         * It can be used with AngularJS's ngRepeat to simply build a table of analysis results.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com">
         *                      <div
         *                              ods-analysis="analysis"
         *                              ods-analysis-context="tree"
         *                              ods-analysis-max="10"
         *                              ods-analysis-x="family"
         *                              ods-analysis-x="espece"
         *                              ods-analysis-sort="circonference"
         *                              ods-analysis-serie-hauteur="AVG(hauteur)"
         *                              ods-analysis-serie-hauteur-cumulative="false"
         *                              ods-analysis-serie-circonference="AVG(circonf)"
         *                      >
         *                          <div
         *                                  ods-subaggregation="analysis.results"
         *                                  ods-subaggregation-serie-maxhauteur="MAX(hauteur)"
         *                                  ods-subaggregation-serie-avgcirc="AVG(circonference)"
         *                          >
         *                              max height: {{ results[0].maxhauteur|number:2 }}<br>
         *                              average circonference: {{ results[0].avgcirc }}
         *                          </div>
         *                      </div>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        var parseCustomExpression = function parseCustomExpression(serie, parentserie_for_subseries) {
            var regex = /([A-Z_-]*?)\((.*?)\)/g;
            var params2regex = /([A-Z_-]*?)\(([a-zA-Z0-9\._]+),\s?(.+)\)/g;
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
                    options['func'] = match[1];
                    options['expr'] = match[2];
                    if (match[3]) {
                        options['param'] = match[3];
                    }
                    var compiled = "operators." + match[1].toLowerCase() + "(accumulation['" + match[2] + "']";
                    if (match.length === 4) {
                        compiled += ", " + match[3];
                    }
                    compiled += ")";
                    options['compiled_expr'] = serie.compiled_expr.replace(match[0], compiled);
                    options['needed_aggregates'] = match[2];
                }
            }
            return options;
        };

        var compileAggrValue = function compileAggrValue(scope, compiled_expr, accumulations, aggregates) {
            var valueY;
            try {
                valueY = scope.$eval(compiled_expr, {
                        operators: ss,
                        accumulation: function(accumulations, needed_aggregates) {
                            var res = {};
                            angular.forEach(needed_aggregates, function(k) {
                                res[k] = accumulations[k]
                            });
                            return res;
                        }(accumulations, aggregates),
                        console: console
                    }
                );
            } catch (e) {
                console.warn("Error while compiling aggregation value with expr", compiled_expr);
            }
            return valueY;
        }

        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function($scope, $attrs) {
                $scope.aggregations = {};
                var cancel = $scope.$watch($attrs.odsSubaggregation, function(nv) {
                    if (!nv) {
                        return;
                    }
                    var aggregations = {};

                    angular.forEach($attrs, function(value, attr) {
                        var serie_name, cumulative;
                        if (attr.startsWith("odsSubaggregationSerie")) {
                            serie_name = attr.replace("odsSubaggregationSerie", "");
                            serie_name = serie_name.toLowerCase();
                            if (!aggregations[serie_name]) {
                                aggregations[serie_name] = {};
                            }
                            var aggregation = {'expr': value};
                            angular.extend(aggregations[serie_name], parseCustomExpression(aggregation));
                        }
                    });

                    angular.copy(aggregations, $scope.aggregations);
                    cancel();
                }, true);
            }],
            link: function(scope, element, attrs) {
                ModuleLazyLoader('simple-statistics').then(function() {
                    scope.$watch(attrs.odsSubaggregation, function(nv, ov) {
                        var values = {},
                            analysis = nv,
                            i,
                            result,
                            longest_results = {};

                        scope.results = [];

                        if (analysis) {
                            result = {};

                            angular.forEach(scope.aggregations, function(aggregation, name) {
                                values[aggregation.needed_aggregates] = [];
                            });

                            for (i = 0; i < analysis.length; i++) {
                                angular.forEach(values, function(useless, name) {
                                    if (typeof analysis[i][name] !== "undefined") {
                                        values[name].push(analysis[i][name]);
                                    }
                                });
                            }

                            angular.forEach(scope.aggregations, function(aggregation, name) {
                                result[name] = compileAggrValue(scope, aggregation.compiled_expr, values, [aggregation.needed_aggregates]);
                            });

                            scope.results.push(result);
                        }
                    }, true);
                });
            }
        };
    }]);

}());
