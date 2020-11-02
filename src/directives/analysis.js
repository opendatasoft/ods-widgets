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
            }
        }
    });

    mod.directive('odsAnalysis', ['ODSAPI', 'AnalysisHelper', function (ODSAPI, AnalysisHelper) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAnalysis
         * @scope
         * @restrict A
         * @param {string} [odsAnalysis=analysis] <i>(mandatory)</i> Name of the variable
         * @param {DatasetContext} odsAnalysisContext <i>(mandatory)</i> {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use.
         * @param {number} [odsAnalysisMax=all] Maximum number of results to show.
         * @param {string} [odsAnalysisX=none] Name of the field used as X axis (e.g. date or datetime field, facet, etc.)
         * @param {string} [odsAnalysisSort=none] Name of serie to sort on.
         *
         * Note that `-` before the name of the serie indicates that the sorting will be descending instead of ascending (e.g. `-serieName`).
         *
         * @param {string} [odsAnalysisSerieName=none] Function to apply:
         *
         * - AVG: average
         * - COUNT
         * - MIN: minimum
         * - MAX: maximum
         * - STDDEV: standard deviation
         * - SUM
         *
         * Must be written in the following form: `FUNCTION(fieldname)`.
         *
         * @description
         * The odsAnalysis widget creates a variable that contains the result of an analysis (i.e. an object containing a results array and optionally an aggregations object).
         *
         * odsAnalysis allows applying functions to chosen groups of data, to analyze them with the same logic as that of a chart visualization. For instance, an analysis can consist in obtaining the average value for several series of data, broken down by a chosen field used as an X axis. The result can then be sorted by another serie.
         *
         * odsAnalysis can be used with AngularJS's ngRepeat to build a table of analysis results.
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
         *                          ng-repeat="result in analysis.results">
         *
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

                        analyze(nv, options).then(function (response) {
                            var data = response.data;
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

    mod.directive('odsColorGradient', ['ModuleLazyLoader', 'ODSAPI', 'AnalysisHelper', function (ModuleLazyLoader, ODSAPI, AnalysisHelper) {
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
         * @param {integer} [odsColorGradientPowExponent=undefined] Set to 1 for a linear scale (default value), to 0.3 to approximate a logarithmic scale. Power scale tend to look like a log scale when the exponent is less than 1, tend to an exponential scale when bigger than 1.
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
         *                               regions-parameters="{'q':'NOT (guadeloupe OR mayotte OR guyane OR martinique OR reunion)', 'disjunctive.region':true}"
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
         *                  <ods-map location="5,46.50595,3.40576">
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
                $scope[$attrs.odsColorGradient]['range'] = {'min': undefined, 'max': undefined, 'classes': []};

                $scope[$attrs.odsColorGradientContext].wait().then(function () {
                    var rgbhigh = getColorParam($attrs.odsColorGradientHigh, [0, 55, 237]);
                    var rgblow = getColorParam($attrs.odsColorGradientLow, [180, 197, 241]);
                    $scope[$attrs.odsColorGradient]['range']['high-color'] = 'rgb(' + rgbhigh[0] + ',' + rgbhigh[1] + ',' + rgbhigh[2] + ')';
                    $scope[$attrs.odsColorGradient]['range']['low-color'] = 'rgb(' + rgblow[0] + ',' + rgblow[1] + ',' + rgblow[2] + ')';

                    var powExponent = angular.isDefined($attrs.odsColorGradientPowExponent) ? parseFloat($attrs.odsColorGradientPowExponent) : undefined;
                    var logScaleFactor = parseInt($attrs.odsColorGradientLogarithmicScaleFactor) || undefined;

                    if (angular.isUndefined(powExponent)) {
                        /* Legacy :
                        handle logScaleFactor to simulate a very close result :
                        logScaleFactor = 1 -> log effect -> pow(0.3)
                        logScaleFactor = 10 -> linear -> pow(0.9666) ~ pow(1)
                         */
                        if (angular.isDefined(logScaleFactor) && logScaleFactor > 0) {
                            if (logScaleFactor > 10) logScaleFactor = 10;
                            $scope[$attrs.odsColorGradient]['range']['logscalefactor'] = logScaleFactor;
                            powExponent = 0.245 + logScaleFactor / 15
                        } else {
                            powExponent = 1;
                        }
                    }

                    $scope[$attrs.odsColorGradient]['range']['powExponent'] = powExponent;

                    $attrs.odsColorGradientNbClasses = parseInt($attrs.odsColorGradientNbClasses) || undefined;

                    var serie = {};
                    var x = [];

                    angular.forEach($attrs, function (value, attr) {
                        if (attr === "odsColorGradientSerie") {
                            serie = AnalysisHelper.parseCustomExpression({'expr': value});
                        } else if (attr === "odsColorGradientX") {
                            x = value;
                        }
                    });

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

                        analyze(nv, options).then(function (response) {
                            var data = response.data;
                            /* Compute min and max of each series */
                            var min = undefined;
                            var max = undefined;
                            angular.forEach(data, function (result) {
                                if (angular.isUndefined(max) || result.serie > max) max = result.serie;
                                if (angular.isUndefined(min) || result.serie < min) min = result.serie;
                            });
                            $scope[$attrs.odsColorGradient]['range']['min'] = min;
                            $scope[$attrs.odsColorGradient]['range']['max'] = max;

                            //var nbClasses = ($attrs.odsColorGradientNbClasses > data.length ? data.length : $attrs.odsColorGradientNbClasses);
                            var nbClasses = $attrs.odsColorGradientNbClasses;
                            if (nbClasses)
                                $scope[$attrs.odsColorGradient]['range']['classes'] = [];

                            /* Reset all objects BUT BUT BUT Keep the parent objects !! only del the values !
                             * if not : the ods-map watchers won't refresh as the watched object won't be the same any more */
                            for (var key in $scope[$attrs.odsColorGradient]['colors'])
                                delete $scope[$attrs.odsColorGradient]['colors'][key];
                            for (var key in $scope[$attrs.odsColorGradient]['values'])
                                delete $scope[$attrs.odsColorGradient]['values'][key];


                            ModuleLazyLoader('d3.scale').then(function () {
                                // linear scale used for values
                                var calibratewithin0and1 = d3.scaleLinear().domain([min, max]).range([0, 1]);

                                // the final scale to use, pow scale or threshold scale depending the nb classes param
                                var scale, valueScale = undefined;

                                // If classes are set, use threshold scale, else use normal scale
                                if (nbClasses) {
                                    // pow scale (used for values)
                                    valueScale = d3.scalePow().exponent(powExponent).range([0, 1]);

                                    // threshold and boundaries
                                    var steps = new Array(nbClasses + 1).fill(undefined).map(function(x, i) { return i * 1 / nbClasses; }); // nbClasses = 5, steps = [0, 0.2, 0.4, 0.6, 0.8]

                                    // linear scale (used for colors)
                                    // the domain starts at 0 and ends at the highest starting boundary, so that the colors
                                    // range from min color to max color once matched to ranges
                                    var colorScale = d3.scaleLinear().domain([0, steps.slice(nbClasses-1, nbClasses)]).range([
                                        d3.rgb(rgblow[0], rgblow[1], rgblow[2]),
                                        d3.rgb(rgbhigh[0], rgbhigh[1], rgbhigh[2])
                                    ]);

                                    // Threshold scale transform continuous input into discret output, nota the slice to have 1 less value for thresholds than for color ranges
                                    scale = d3.scaleThreshold().domain(steps.slice(1, nbClasses).map(valueScale.invert)).range(steps.slice(0, nbClasses).map(colorScale));
                                } else {
                                    scale = d3.scalePow().exponent(powExponent).domain([0, 1]).range([
                                        d3.rgb(rgblow[0], rgblow[1], rgblow[2]),
                                        d3.rgb(rgbhigh[0], rgbhigh[1], rgbhigh[2])
                                    ]);
                                }

                                /* Compute color objects */
                                var usedColors = []; // used for the legend, just to store which color has been used
                                angular.forEach(data, function (result) {
                                    $scope[$attrs.odsColorGradient]['values'][result.x] = result['serie'];
                                    var color = scale(calibratewithin0and1(result['serie']));
                                    $scope[$attrs.odsColorGradient]['colors'][result.x] = color;
                                    usedColors.push(color);
                                });

                                if (nbClasses) {
                                    var classesObj = {};
                                    for (var i = 0; i < steps.length - 1; i++) {
                                        var startValue = min + (max - min) * valueScale.invert(steps[i]);
                                        var endValue = min + (max - min) * valueScale.invert(steps[i + 1]);
                                        var color = scale(valueScale.invert(steps[i]));
                                        if (usedColors.indexOf(color) >= 0) {
                                            classesObj[color] = {
                                                'start': startValue,
                                                'end': endValue,
                                                'color': color
                                            };
                                        }
                                    }

                                    $scope[$attrs.odsColorGradient]['range']['classes'] = Object.keys(classesObj).map(function (sortedKey) {
                                        return classesObj[sortedKey];
                                    });
                                }
                            }); // end lazy load d3
                        }, function() {});
                    }, true);
                });
            }]
        };
    }]);

    mod.directive('odsAnalysisSerie', [function () {
        /**
         * @deprecated
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
