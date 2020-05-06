(function () {
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

    mod.factory('AnalysisHelper', function () {
        return {
            parseCustomExpression: function (serie, parentserie_for_subseries) {
                var regex = /([A-Z_-]*?)\((.*?)\)/g;
                var params2regex = /([A-Z_-]*?)\(([a-zA-Z0-9\._]+),\s?([0-9\.]+)\)/g;
                var aggregates_holder = parentserie_for_subseries || serie;
                var match;

                serie.compiled_expr = "" + serie.expr;
                aggregates_holder.aggregates = [];

                var options = {};
                while ((match = regex.exec(serie.expr))) {
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
            },
            calibrateValue: function (min, max, logScaleFactor, value) {
                var val = 1;
                if (min === max) {
                    val = 1;
                } else {
                    if (angular.isUndefined(logScaleFactor)) { // linear scale
                        val = ((value - min) / (max - min));
                    } else {
                        if (value === min) {
                            val = 0;
                        } else {
                            val = Math.pow(Math.log(value - min), logScaleFactor) / Math.pow(Math.log(max - min), logScaleFactor);
                        }
                    }
                }
                return val;
            },
            calibrateValueInClasses: function (nbClasses, value) {
                var step, position, valStartClass, valEndClass, val;
                step = 1 / nbClasses;
                if (value === 1) {
                    position = nbClasses - 1;
                } else {
                    position = Math.trunc(value / step);
                }
                valStartClass = position * step;
                valEndClass = (position + 1) * step;
                val = (valStartClass + valEndClass) / 2;

                return [valStartClass, val, valEndClass];
            },
            computeRGBColor: function (rgbHigh, rgbLow, value) {
                return "rgb(" +
                    Math.floor(value * rgbHigh[0] + (1 - value) * rgbLow[0]) +
                    "," +
                    Math.floor(value * rgbHigh[1] + (1 - value) * rgbLow[1]) +
                    "," +
                    Math.floor(value * rgbHigh[2] + (1 - value) * rgbLow[2]) +
                    ")";
            }
        }
    });

    mod.directive('odsAnalysis', ['ODSAPI', 'AnalysisHelper', function (ODSAPI, AnalysisHelper) {
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
         *          <ods-dataset-context context="tree"
         *                               tree-dataset="les-arbres-remarquables-de-paris"
         *                               tree-domain="https://widgets-examples.opendatasoft.com/">
         *              <table class="table table-bordered table-condensed table-striped">
         *                  <thead>
         *                      <tr>
         *                          <th>Tree name</th>
         *                          <th>Height</th>
         *                          <th>Girth</th>
         *                      </tr>
         *                  </thead>
         *                  <tbody>
         *                      <tr ods-analysis="analysis"
         *                          ods-analysis-context="tree"
         *                          ods-analysis-max="10"
         *                          ods-analysis-x="espece"
         *                          ods-analysis-sort="girth"
         *                          ods-analysis-serie-height="AVG(hauteur)"
         *                          ods-analysis-serie-height-cumulative="false"
         *                          ods-analysis-serie-girth="AVG(circonference)"
         *
         *                          ng-repeat="result in analysis.results"
         *                      >
         *                          <td>{{ result.x }}</td>
         *                          <td>{{ result.height|number:2 }}</td>
         *                          <td>{{ result.girth|number:2 }}</td>
         *                      </tr>
         *                  </tbody>
         *              </table>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope[$attrs.odsAnalysisContext].wait().then(function () {
                    var analyze = ODSAPI.uniqueCall(ODSAPI.records.analyze);

                    $scope.$watch($attrs.odsAnalysisContext, function (nv) {
                        var variable = $attrs.odsAnalysis || 'results';
                        var options = angular.extend({}, nv.parameters, {'maxpoints': $attrs.odsAnalysisMax || 0});
                        var aggregations = {}, series = {};
                        var xs = [];

                        if ($attrs.odsAnalysisSort) {
                            options.sort = $attrs.odsAnalysisSort;
                        }

                        angular.forEach($attrs, function (value, attr) {
                            var serie_name, cumulative;
                            if (attr.startsWith("odsAnalysisSerie")) {
                                serie_name = attr.replace("odsAnalysisSerie", "");
                                cumulative = false;
                                if (serie_name.endsWith("Cumulative")) {
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
                                    angular.extend(series[serie_name], AnalysisHelper.parseCustomExpression(serie));
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

                        angular.forEach(series, function (serie, name) {
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

                        analyze(nv, options).success(function (data) {
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

    mod.directive('odsColorGradient', ['ODSAPI', 'AnalysisHelper', function (ODSAPI, AnalysisHelper) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsColorGradient
         * @scope
         * @restrict A
         * @param {string} odsColorGradient Variable name to use to output the color gradient data structure. variable['colors'] can be used in ods-maps. 'values', 'range' keys are salso available.
         * @param {DatasetContext} odsColorGradientContext {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} odsColorGradientX The X axis of the analysis
         * @param {string} odsColorGradientSerie FUNC(expression) where FUNC is AVG, SUM, MIN, MAX etc... and expression is the field id to work on.
         * @param {string} [odsColorGradientHigh='rgb(0, 55, 237)'] RGB or HEX color code for highest value of the analysis serie. ex: "rgb(255, 0, 0)", "#abc"
         * @param {string} [odsColorGradientLow='rgb(180, 197, 241)'] RGB or HEX color code for the lowest value of the analysis serie. ex: "rgb(125, 125, 125)", "#ff009a"
         * @param {integer} [odsColorGradientNbClasses=undefined] Number of classes, ie number of color to compute. Mandatory to get a consistent legend with the corresponding number of grades/classes.
         * @param {integer} [odsColorGradientLogarithmicScaleFactor=undefined] Set to 1 to activate the logarithmic scale. Set a value greater from 1 to 10 to flatten the log effect and tend to a more linear scale. (1 is log, 10 is very linear, 3/4/5 are most of the time good choices)
         *
         * @description
         * This widget exposes the results of an analysis transposed to a set of colors for each X values.
         * The results is available in the scope.
         * It can be used directly on odsMap color-categories parameter with display=categories mode.
         * It can also be used on AngularJS's ngRepeat to build custom scales.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="logarithmic-scale.html">
         *          <ods-dataset-context context="regions,population"
         *                               regions-dataset="contours-geographiques-des-regions-2019-copy"
         *                               regions-domain="public"
         *                               regions-parameters="{'q':'NOT (guadeloupe OR mayotte OR guyane OR martinique OR reunion)',
         *                                                   'disjunctive.region':true}"
         *                               population-dataset="population-millesimee-communes-2016"
         *                               population-parameters="{'disjunctive.nom_reg':true}"
         *                               population-domain="public">
         *
         *              <div ods-color-gradient="colorgradient"
         *                   ods-color-gradient-context="population"
         *                   ods-color-gradient-x="nom_reg"
         *                   ods-color-gradient-serie="SUM(population_totale)"
         *                   ods-color-gradient-high="rgb(20, 33, 96)"
         *                   ods-color-gradient-low="rgb(180, 197, 241)">
         *
         *                  <ods-map>
         *                      <ods-map-layer context="regions"
         *                                     color-categories="colorgradient['colors']"
         *                                     color-by-field="region"
         *                                     color-categories-other="lightgrey"
         *                                     display="categories"
         *                                     shape-opacity="0.85"
         *                                     title="Sum of cities population">
         *                      </ods-map-layer>
         *                  </ods-map>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */

        var rgbRe = /^rgb\([ \t]*(\d{1,3})[ \t]*,[ \t]*(\d{1,3})[ \t]*,[ \t]*(\d{1,3})[ \t]*\)$/;
        var hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

        var getColorParam = function (color, defaultColor) {
            var rgbMatch = rgbRe.exec(color);
            if (rgbMatch && rgbMatch.length === 4) {
                return rgbMatch.slice(1).map(function(element) { return parseInt(element, 10);});
            } else {
                var hexMatch = hexRe.exec(color);
                if (hexMatch && hexMatch.length === 2) {
                    var r, g, b;
                    if (hexMatch[1].length == 6) {
                        r = parseInt(hexMatch[1].slice(0, 2), 16);
                        g = parseInt(hexMatch[1].slice(2, 4), 16);
                        b = parseInt(hexMatch[1].slice(4, 6), 16);
                    } else { // 3
                        r = parseInt(hexMatch[1].slice(0, 1) + '' + hexMatch[1].slice(0, 1), 16);
                        g = parseInt(hexMatch[1].slice(1, 2) + '' + hexMatch[1].slice(1, 2), 16);
                        b = parseInt(hexMatch[1].slice(2, 3) + '' + hexMatch[1].slice(2, 3), 16);
                    }
                    return [r, g, b];
                }
            }
            return defaultColor;
        };

        return {
            restrict: 'A',
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope[$attrs.odsColorGradient] = {};
                $scope[$attrs.odsColorGradient]['colors'] = {};
                $scope[$attrs.odsColorGradient]['values'] = {};
                $scope[$attrs.odsColorGradient]['range'] = {'min': undefined, 'max': undefined};

                var rgbhigh = getColorParam($attrs.odsColorGradientHigh, [0, 55, 237]);
                var rgblow = getColorParam($attrs.odsColorGradientLow, [180, 197, 241]);
                $scope[$attrs.odsColorGradient]['range']['high-color'] = 'rgb(' + rgbhigh[0] + ',' + rgbhigh[1] + ',' + rgbhigh[2] + ')';
                $scope[$attrs.odsColorGradient]['range']['low-color'] = 'rgb(' + rgblow[0] + ',' + rgblow[1] + ',' + rgblow[2] + ')';

                var logScaleFactor = parseInt($attrs.odsColorGradientLogarithmicScaleFactor) || undefined;
                $scope[$attrs.odsColorGradient]['range']['logscalefactor'] = logScaleFactor;

                $attrs.odsColorGradientNbClasses = parseInt($attrs.odsColorGradientNbClasses) || undefined;

                var serie = {};
                var x = [];

                angular.forEach($attrs, function (value, attr) {
                    var serie_name, cumulative;
                    if (attr === "odsColorGradientSerie") {
                        serie = AnalysisHelper.parseCustomExpression({'expr': value});
                    } else if (attr === "odsColorGradientX") {
                        x = value;
                    }
                });

                $scope[$attrs.odsColorGradientContext].wait().then(function () {
                    var analyze = ODSAPI.uniqueCall(ODSAPI.records.analyze);

                    $scope.$watch($attrs.odsColorGradientContext, function (nv) {
                        var options = angular.extend({}, nv.parameters, {'maxpoints': 0});
                        if (x) {
                            options.x = x;
                        }

                        options["y.serie.expr"] = serie.expr;
                        options["y.serie.func"] = serie.func;
                        if (serie.func === 'QUANTILES') {
                            options["y.serie.subsets"] = serie.subsets || "50";
                        }

                        analyze(nv, options).success(function (data) {
                            /* Compute min and max of each series */
                            var min = undefined;
                            var max = undefined;
                            angular.forEach(data, function (result) {
                                max = (result['serie'] >= (max || result['serie']) ? result['serie'] : max);
                                min = (result['serie'] <= (min || result['serie']) ? result['serie'] : min);
                            });
                            $scope[$attrs.odsColorGradient]['range']['min'] = min;
                            $scope[$attrs.odsColorGradient]['range']['max'] = max;

                            //var nbClasses = ($attrs.odsColorGradientNbClasses > data.length ? data.length : $attrs.odsColorGradientNbClasses);
                            var nbClasses = $attrs.odsColorGradientNbClasses;
                            if (nbClasses)
                                $scope[$attrs.odsColorGradient]['range']['classes'] = {};

                            /* Reset all objects BUT BUT BUT Keep the parent objects !! only del the values !
                             * if not : the ods-map watchers won't refresh as the watched object won't be the same any more */
                            for (var key in $scope[$attrs.odsColorGradient]['colors'])
                                delete $scope[$attrs.odsColorGradient]['colors'][key];
                            for (var key in $scope[$attrs.odsColorGradient]['values'])
                                delete $scope[$attrs.odsColorGradient]['values'][key];

                            /* Compute color objects */
                            var classesObj = {};
                            angular.forEach(data, function (result) {
                                $scope[$attrs.odsColorGradient]['values'][result.x] = result['serie'];
                                var startClass, val, endClass, color = undefined;
                                val = AnalysisHelper.calibrateValue(min, max, logScaleFactor, result['serie']);
                                if (nbClasses) {
                                    var res = AnalysisHelper.calibrateValueInClasses(nbClasses, val);
                                    startClass = res[0];
                                    val = res[1];
                                    endClass = res[2];
                                }
                                color = AnalysisHelper.computeRGBColor(rgbhigh, rgblow, val);

                                $scope[$attrs.odsColorGradient]['colors'][result.x] = color;
                                if (angular.isDefined(startClass) && angular.isDefined(endClass)) {
                                    var startValue, endValue;
                                    var range = max - min;
                                    startValue = min + range * startClass;
                                    endValue = min + range * endClass;
                                    classesObj[color] = {
                                        'start': startValue,
                                        'end': endValue,
                                        'color': color
                                    };
                                }
                            });

                            $scope[$attrs.odsColorGradient]['range']['classes'] = Object.keys( classesObj ).map(function( sortedKey ) {
                                return classesObj[ sortedKey ];
                            });
                        });
                    }, true);
                });
            }]
        };
    }]);

    mod.directive('odsAnalysisSerie', [function () {
        /**
         * @deprecated
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
         *          <ods-dataset-context context="tree" tree-dataset="les-arbres-remarquables-de-paris" tree-domain="https://widgets-examples.opendatasoft.com/">
         *              <div
         *                      ods-analysis="analysis"
         *                      ods-analysis-context="tree"
         *                      ods-analysis-max="10"
         *                      ods-analysis-x="genre"
         *                      ods-analysis-x="espece"
         *                      ods-analysis-sort="circonference"
         *                      ods-analysis-serie-hauteur="AVG(hauteur)"
         *                      ods-analysis-serie-hauteur-cumulative="false"
         *                      ods-analysis-serie-circonference="AVG(circonference)">
         *                 <div
         *                      ods-analysis-serie="analysis.results"
         *                      ods-analysis-serie-condition="y > 20"
         *                      ods-analysis-serie-name="hauteur"
         *                      ods-analysis-serie-separate-on-x="genre">
         *                     {{ results }}
         *                 </div>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         *
         * reduce the results to the longest serie
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="tree"
         *                               tree-dataset="les-arbres-remarquables-de-paris"
         *                               tree-domain="https://widgets-examples.opendatasoft.com/">
         *              <div ods-analysis="analysis"
         *                   ods-analysis-context="tree"
         *                   ods-analysis-max="10"
         *                   ods-analysis-x-genre="genre"
         *                   ods-analysis-x-espece="espece"
         *                   ods-analysis-sort="circonference"
         *                   ods-analysis-serie-hauteur="AVG(hauteur)"
         *                   ods-analysis-serie-hauteur-cumulative="false"
         *                   ods-analysis-serie-circonference="AVG(circonference)">
         *                  <div ods-analysis-serie="analysis.results"
         *                       ods-analysis-serie-condition="y > 20"
         *                       ods-analysis-serie-name="hauteur"
         *                       ods-analysis-serie-separate-on-x="genre"
         *                       ods-analysis-serie-mode="reduce">
         *                      Longest serie: {{ results.global.length }}
         *                  </div>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope.condition = '';
                $scope.field = '';
                $scope.$watch($attrs.odsAnalysisSerieCondition, function (nv) {
                    if (!$attrs.odsAnalysisSerieCondition) {
                        return;
                    }
                    $scope.condition = $attrs.odsAnalysisSerieCondition;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieName, function (nv) {
                    if (!$attrs.odsAnalysisSerieName) {
                        return;
                    }
                    $scope.name = $attrs.odsAnalysisSerieName;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieSeparateOnX, function (nv) {
                    if (!$attrs.odsAnalysisSerieSeparateOnX) {
                        return;
                    }
                    $scope.separateOnX = $attrs.odsAnalysisSerieSeparateOnX;
                }, true);
                $scope.$watch($attrs.odsAnalysisSerieMode, function (nv) {
                    if (!$attrs.odsAnalysisSerieMode) {
                        return;
                    }
                    $scope.mode = $attrs.odsAnalysisSerieMode;
                }, true);
            }],
            link: function (scope, element, attrs) {
                scope.$watch(attrs.odsAnalysisSerie, function (nv, ov) {
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
                            if (scope.separateOnX) {
                                currentXAxis = analysis[i]['x'][scope.separateOnX];
                            } else {
                                currentXAxis = "global";
                            }
                            if (checkCondition(scope, scope.condition, currentValue)) {
                                if (!longest_results[currentXAxis]) {
                                    longest_results[currentXAxis] = [];
                                }
                                longest_results[currentXAxis].push(analysis[i]);
                            } else {
                                if (longest_results[currentXAxis]) {
                                    if (!result[currentXAxis] || result[currentXAxis].length < longest_results[currentXAxis].length) {
                                        result[currentXAxis] = longest_results[currentXAxis];
                                    }
                                    longest_results[currentXAxis] = false;
                                }
                            }
                        }
                        angular.forEach(longest_results, function (longest_result, x) {
                            if (!result[x] || result[x].length < longest_result.length) {
                                result[x] = longest_result;
                            }
                        });

                        if (scope.mode == "reduce" && scope.separateOnX) {
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

    mod.directive('odsSubaggregation', ['ModuleLazyLoader', function (ModuleLazyLoader) {
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
         *          <ods-dataset-context context="tree" tree-dataset="les-arbres-remarquables-de-paris" tree-domain="https://widgets-examples.opendatasoft.com/">
         *              <div
         *                  ods-analysis="analysis"
         *                  ods-analysis-context="tree"
         *                  ods-analysis-max="10"
         *                  ods-analysis-x-genre="genre"
         *                  ods-analysis-x-espace="espece"
         *                  ods-analysis-sort="circonference"
         *                  ods-analysis-serie-height="AVG(hauteur)"
         *                  ods-analysis-serie-height-cumulative="false"
         *                  ods-analysis-serie-girth="AVG(circonference)">
         *                  <div
         *                      ods-subaggregation="analysis.results"
         *                      ods-subaggregation-serie-maxheight="MAX(height)"
         *                      ods-subaggregation-serie-avggirth="MEAN(girth)">
         *                      max height: {{ results[0].maxheight|number:2 }}<br>
         *                      average girth: {{ results[0].avggirth|number:2 }}
         *                  </div>
         *              </div>
         *          </ods-dataset-context>
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
            while ((match = regex.exec(serie.expr))) {
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
                        accumulation: function (accumulations, needed_aggregates) {
                            var res = {};
                            angular.forEach(needed_aggregates, function (k) {
                                res[k] = accumulations[k];
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
        };

        return {
            restrict: 'A',
            scope: true,
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope.aggregations = {};
                var cancel = $scope.$watch($attrs.odsSubaggregation, function (nv) {
                    if (!nv) {
                        return;
                    }
                    var aggregations = {};

                    angular.forEach($attrs, function (value, attr) {
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
            link: function (scope, element, attrs) {
                ModuleLazyLoader('simple-statistics').then(function () {
                    scope.$watch(attrs.odsSubaggregation, function (nv, ov) {
                        var values = {},
                            analysis = nv,
                            i,
                            result,
                            longest_results = {};

                        scope.results = [];

                        if (analysis) {
                            result = {};

                            angular.forEach(scope.aggregations, function (aggregation, name) {
                                values[aggregation.needed_aggregates] = [];
                            });

                            for (i = 0; i < analysis.length; i++) {
                                angular.forEach(values, function (useless, name) {
                                    if (typeof analysis[i][name] !== "undefined") {
                                        values[name].push(analysis[i][name]);
                                    }
                                });
                            }

                            angular.forEach(scope.aggregations, function (aggregation, name) {
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
