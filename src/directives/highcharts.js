(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory("requestData", ['ODSAPI', '$q', 'ChartHelper', 'AggregationHelper', function(ODSAPI, $q, ChartHelper, AggregationHelper) {
        var buildTimescaleX = function(x, timescale) {
            var xs = [];
            if (timescale == 'year') {
                xs.push(x + '.year');
            } else if (timescale == 'month') {
                xs.push(x + '.year');
                xs.push(x + '.month');
            } else if (timescale == 'day') {
                xs.push(x + '.year');
                xs.push(x + '.month');
                xs.push(x + '.day');
            } else if (timescale == 'hour') {
                xs.push(x + '.year');
                xs.push(x + '.month');
                xs.push(x + '.day');
                xs.push(x + '.hour');
            } else if (timescale == 'minute') {
                xs.push(x + '.year');
                xs.push(x + '.month');
                xs.push(x + '.day');
                xs.push(x + '.hour');
                xs.push(x + '.minute');
            } else if (timescale == 'month month') {
                xs.push(x + '.month');
            } else if (timescale == 'day day') {
                xs.push(x + '.day');
            } else if (timescale == 'day weekday') {
                xs.push(x + '.weekday');
            } else if (timescale == 'day month') {
                xs.push(x + '.yearday');
            } else if (timescale == 'hour hour') {
                xs.push(x + '.hour');
            } else {
                xs.push(x);
            }
            return xs;
        };
        var buildSearchOptions = function(query, timeSerieMode, precision, periodic) {
            var breakdown,
                search_options = {
                dataset: query.config.dataset,
                x: [query.xAxis],
                sort: query.sort || '',
                maxpoints: query.maxpoints || ''
            };

            if (query.seriesBreakdown) {
                breakdown = query.seriesBreakdown;
                var xs = buildTimescaleX(breakdown, query.seriesBreakdownTimescale);
                for (var i = 0; i < xs.length; i++) {
                    search_options.x.push(xs[i]);
                }
                search_options['sort'] = search_options.x.map(function(item) { return 'x.' + item }).join(",");
            }

            if (timeSerieMode){
                search_options.precision = precision;
                search_options.periodic = periodic;
            }

            // is there a timescale override ?
            if(query.timescale){
                 var tokens = query.timescale.split(' ');
                 search_options.precision = tokens[0];
                 search_options.periodic = tokens.length == 2 ? tokens[1] : '';
            }
            return search_options;
        };
        var parseCustomExpression = function(serie, serieprefix, parentserie_for_subseries) {
            var regex = /([A-Z_-]*?)\((.*?)\)/g;
            var params2regex = /([A-Z_-]*?)\(([a-zA-Z0-9\.]+),\s?([0-9\.]+)\)/g;
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
                        options[serieprefix + '.func'] = match[1];
                        options[serieprefix + '.expr'] = match[2];
                        serie.compiled_expr += serie.compiled_expr.replace(match[0], 'y');
                    }
                }
            }

            return options;
        };
        var generateSerieOptions = function(serie, serie_name, aggregations, parent_for_subseries) {
            var options = {};
            if (serie.func === "CUSTOM") {
                return parseCustomExpression(serie, 'y.' + serie_name, parent_for_subseries);
            }
            options['y.' + serie_name + '.expr'] = serie.yAxis || serie.expr;
            options['y.' + serie_name + '.func'] = serie.func;
            options['y.' + serie_name + '.cumulative'] = serie.cumulative || false;
            if(serie.func === 'QUANTILES'){
                if (!serie.subsets){
                    serie.subsets = 50;
                }
                options['y.' + serie_name + '.subsets'] = serie.subsets || 50;
            }
            if (serie.func === "CONSTANT") {
                options['y.' + serie_name + '.expr'] = serie.yAxis || 0;
                options['y.' + serie_name + '.func'] = "AVG";
            }
            // if (!serie.color || serie.color.startsWith('dynamic-') || serie.color.startsWith('static-')) {
            //     options['agg.' + serie_name + '.func'] = ['MIN', 'MAX'].join(",");
            //     options['agg.' + serie_name + '.expr'] = serie_name;
            // }
            return options;
        }
        var addSeriesToSearchOptions = function(search_options, serie, serie_name) {
            if(serie.type && ChartHelper.isRangeChart(serie.type)) {
                if(search_options.sort ===  'y.' + serie_name) {
                    // cannot sort on range
                    search_options.sort = '';
                }
                // when trying to compute 2 quantiles on the same serie, optimize the call
                if (serie.charts[0].func === 'QUANTILES' && serie.charts[1].func === 'QUANTILES' && serie.charts[0].yAxis === serie.charts[1].yAxis) {
                    var temp_serie = angular.copy(serie.charts[0]);
                    temp_serie.subsets = serie.charts[0].subsets + "," + serie.charts[1].subsets;
                    addSeriesToSearchOptions(search_options, temp_serie, serie_name);
                } else {
                    addSeriesToSearchOptions(search_options, serie.charts[0], serie_name + 'min');
                    addSeriesToSearchOptions(search_options, serie.charts[1], serie_name + 'max');
                }
            } else {
                angular.extend(search_options, generateSerieOptions(serie, serie_name));
            }
        };

        return function(queries, search_parameters, timeSerieMode, precision, periodic, domain, apikey, callback) {
            var search_promises = [];
            var charts_by_query = [];
            var original_domain = domain;
            angular.forEach(queries, function(query, query_index){
                var charts = {};
                var search_options = buildSearchOptions(query, timeSerieMode, precision, periodic);

                angular.forEach(query.charts, function(chart, index){
                    var serie_name = 'serie' + (query_index + 1) + '-' + (index + 1);
                    addSeriesToSearchOptions(search_options, chart, serie_name);
                    charts[serie_name] = chart;
                });

                // Analyse request
                // We have to build virtual contexts from parameters because we can source charts from multiple
                // datasets.
                domain = query.config.domain || original_domain;
                apikey = query.config.apikey || apikey;
                var virtualContext = {
                    domain: domain,
                    domainUrl: ODSAPI.getDomainURL(domain),
                    dataset: {'datasetid': search_options.dataset},
                    apikey: apikey,
                    parameters: {}
                };

                search_promises.push(ODSAPI.records.analyze(virtualContext, angular.extend({}, search_parameters, query.config.options, search_options)));
                charts_by_query.push(charts);
            });
            $q.all(search_promises).then(function(promise) {
                callback(promise, charts_by_query);
            });
        }
    }]);

    mod.directive("odsHighchartsChart", ['colorScale', 'requestData', 'translate', 'ModuleLazyLoader', 'AggregationHelper', 'ChartHelper', '$rootScope', 'odsErrorService', function(colorScale, requestData, translate, ModuleLazyLoader, AggregationHelper, ChartHelper, $rootScope, odsErrorService) {
        // parameters : {
        //     timescale: year, month, week, day, hour, month year, day year, day month, day week
        //     xLabel:
        //     singleAxis:
        //     singleAxisScale:
        //     singleAxisLabel:
        //     queries : [
        //         {
        //             config: {
        //                 dataset:
        //                 options:
        //             },
        //             xAxis:
        //             timescale:
        //             sort:
        //             maxpoints:
        //             charts: [
        //                 {
        //                     type:
        //                     [charts:]
        //                     yAxis:
        //                     yLabel:
        //                     func:
        //                     [subsets:]
        //                     scale:
        //                     color:
        //                     extras:
        //                     cumulative:
        //                 },
        //                 ...
        //             ]
        //         },
        //         ...
        //     ]
        // }
        var getDatasetUniqueId = function(dataset_id, domain) {
            var uniqueid;
            if (domain) {
                uniqueid = domain + "." + dataset_id;
            } else {
                uniqueid = ChartHelper.getDatasetUniqueId(dataset_id);
            }
            return uniqueid;
        };

        var getTimeSerieMode = function(parameters) {
            var precision, periodic, timeSerieMode;

            if(parameters.timescale && $.grep(parameters.queries, function(query){return query.sort;}).length === 0){
                 timeSerieMode = parameters.timescale;
                 var tokens = timeSerieMode.split(' ');
                 precision = tokens[0];
                 periodic = tokens.length == 2 ? tokens[1] : '';
            } else {
                timeSerieMode = false;
                precision = false;
                periodic = false;
            }

            return {
                'precision': precision,
                'periodic': periodic,
                'timeSerieMode': timeSerieMode
            };
        }

        var getGlobalOptions = function(parameters, precision, periodic, chartplaceholder, domain) {
            var height = chartplaceholder.height();
            var width = chartplaceholder.width();

            if (parameters.queries.length === 0) {
                parameters.xLabel = '';
            } else {
                if (!angular.isDefined(parameters.xLabel)) {
                    var datasetid = getDatasetUniqueId(parameters.queries[0].config.dataset, domain);
                    parameters.xLabel = ChartHelper.getXLabel(datasetid, parameters.queries[0].xAxis, parameters.timescale);
                }
            }

            if (angular.isUndefined(parameters.displayLegend)) {
                parameters.displayLegend = true;
            }
            var options = {
                chart: {},
                title: {text: ''},
                credits: {enabled: false},
                series: [],
                xAxis: {
                    title: {
                        text: parameters.xLabel
                    },
                    labels: {
                        step: 1,
                        rotation: -45,
                        align: 'right'
                    },
                    startOfWeek: 1,
                    minPadding: 0,
                    maxPadding: 0,
                    dateTimeLabelFormats: {
                        second: '%H:%M:%S',
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%e %b %y',
                        week: '%e. %b',
                        month: '%b \'%y',
                        year: '%Y'
                    }
                    // startOnTick: true,
                    // endOnTick: true,
                },
                legend: {
                    enabled: !!parameters.displayLegend
                },
                // legend: {
                //     align: 'right',
                //     verticalAlign: 'top',
                //     layout: 'vertical',
                //     x: -10,
                //     y: 50,
                //     floating: false,
                //     borderWidth: 0,
                //     width: width/5
                // },
                yAxis: [],
                plotOptions: {
                    series: {
                        animation: false
                    },
                    columnrange: {
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    arearange: {
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    areasplinerange: {
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    pie: {
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y} ({point.percentage:.1f}%)</b>'
                        }
                    }
                },
                tooltip: {
                    valueDecimals: 2,
                    headerFormat: '{point.key}<br>',
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b>',
                    formatter: function (tooltip) {
                        var items = this.points || angular.isArray(this) ? this : [this],
                            series = items[0].series,
                            s;

                        // build the header
                        s = [tooltip.tooltipHeaderFormatter(items[0])];

                        // build the values
                        angular.forEach(items, function (item) {
                            series = item.series;
                            var value = (series.tooltipFormatter && series.tooltipFormatter(item)) || item.point.tooltipFormatter(series.tooltipOptions.pointFormat);
                            value = value.replace(/(\.|,)00</, '<');
                            s.push(value);
                        });
                        // footer
                        s.push(tooltip.options.footerFormat || '');

                        return s.join('');
                    }
                },
                noData: {
                    style: {
                        fontFamily: 'Open Sans',
                        fontWeight: 'normal',
                        fontSize: '1.4em',
                        color: '#333',
                        opacity: '0.5'
                    }
                },
                lang: {
                    noData: translate("No data available yet")
                }
            };

            if (precision) {
                options.xAxis.type = 'datetime';
                options.xAxis.maxZoom = 3600000; // fourteen days
                options.chart.zoomType = 'xy';
            } else {
                options.xAxis.categories = [];
            }

            if (periodic === "month") {  // month of year
                options.xAxis.labels.format = "{value: %B}";
            } else if (periodic === "weekday") {  // day of week
                options.xAxis.labels.format = "{value: %A}";
            } else if (periodic === "day") {  // day of month
                options.xAxis.labels.format = "{value: %d}";
            } else if (periodic === "hour") {
                options.xAxis.labels.format = "{value: %H}";
            }

            if(parameters.singleAxis) {
                var yAxisParamaters = {
                    color: "#000000",
                    scale: parameters.singleAxisScale,
                    yRangeMin: parameters.yRangeMin,
                    yRangeMax: parameters.yRangeMax,
                };

                options.yAxis = [buildYAxis(parameters.singleAxisLabel, yAxisParamaters, false)];
            }

            return options;
        };

        var colors = {};
        var colorsIndex = 0;
        var getSerieOptions = function(parameters, yAxisesIndexes, query, serie, suppXValue, domain) {
            var datasetid = ChartHelper.getDatasetId({dataset: {datasetid: query.config.dataset}, domain: domain});
            var yLabel = ChartHelper.getYLabel(datasetid, serie);
            var serieColor;
            if (!suppXValue && serie.type !== 'pie') {
                serieColor = colorScale.getUniqueColor(serie.color);
            } else if ( serie.type === 'pie') {
                if (!serie.extras) {
                    serie.extras = {};
                }
                serie.extras.colors = colorScale.getColors(serie.color);
            } else {
                if (!colors[suppXValue + serie.color]) {
                    colors[suppXValue + serie.color] = colorScale.getColorAtIndex(serie.color, colorsIndex);
                    colorsIndex++;
                }
                serieColor = colors[suppXValue + serie.color];
            }

            var options = angular.extend({}, {
                name: suppXValue ? suppXValue : yLabel,
                color: serieColor,
                type: serie.type,
                yAxis: parameters.singleAxis ? 0 : yAxisesIndexes[datasetid][yLabel],
                marker: {
                    enabled: (serie.type === 'scatter'),
                    radius: 3
                },
                shadow: false,
                tooltip: {},
                // zIndex: 
                data: [],
                stacking: query.stacked ? query.stacked : null
            }, serie.extras);

            options = angular.extend(options, ChartHelper.resolvePosition(serie.position));
            delete options.position;
            return options;
        };

        var buildDatePattern = function(object) {
            var datePattern = '';
            if (angular.isObject(object) && ('year' in object || 'month' in object || 'day' in object || 'hour' in object || 'minute' in object || 'weekday' in object)) {
                if(! ('year' in object)){
                    if('month' in object){
                        datePattern = '%B';
                    }
                    if('day' in object){
                        if('month' in object){
                            datePattern = '%e %B';
                        } else {
                            datePattern = '%e';
                        }
                    }
                    if('weekday' in object){
                        datePattern = '%a';
                    }
                    if('hour' in object){
                         datePattern = '%Hh';
                    }
                } else {
                    if('day' in object){
                        datePattern += ' %e';
                    }
                    if('month' in object){
                        datePattern += ' %B';
                    }
                    datePattern += ' %Y';

                    if('hour' in object){
                        if('minute' in object){
                             datePattern += ' %Hh%M';
                        } else {
                            datePattern +=' %Hh';
                        }
                    }
                }
            }
            return datePattern;
        }

        var getContextualizedSeriesOptions = function(x, timeSerieMode) {
            var options = {
                'tooltip': {}
            };

            if (timeSerieMode) {
                // options.pointPadding = 0;
                // options.groupPadding = 0;
                // options.borderWidth = 0;
                options.tooltip.xDateFormat = buildDatePattern(x);
            }

            return options;
        };
        
        var updateXAxisOptionsFromData = function(x, options, timeSerieMode) {
            if (timeSerieMode && angular.isObject(x)) {
                if ('second' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 1, 1, 1, 2) - Date.UTC(2010, 1, 1, 1, 1, 1);
                } else if ('minute' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 1, 1, 2) - Date.UTC(2010, 1, 1, 1, 1);
                } else if ('hour' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 1, 2) - Date.UTC(2010, 1, 1, 1);
                } else if ('weekday' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 2) - Date.UTC(2010, 1, 1);
                } else if ('day' in x) {
                    options.minTickInterval = Date.UTC(2010, 1, 2) - Date.UTC(2010, 1, 1);
                } else if ('month' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 1) - Date.UTC(2010, 0, 1);
                } else if ('year' in x){
                    options.minTickInterval = Date.UTC(2010, 0, 1) - Date.UTC(2009, 0, 1);
                }
            }
        }

        var buildYAxis = function(yLabel, chart, opposite, stacked) {
            var hasMin = typeof chart.yRangeMin !== "undefined" && chart.yRangeMin !== '';
            var hasMax = typeof chart.yRangeMax !== "undefined" && chart.yRangeMax !== '';
            var yAxis = {
                title: {
                    text: yLabel || "",
                    style: {
                        color: chart.color
                    }
                },
                labels: {
                    style: {
                        color: chart.color
                    }
                },
                type: chart.scale || 'linear',
                min: hasMin ? chart.yRangeMin : null,
                max: hasMax ? chart.yRangeMax : null,
                startOnTick: hasMin ? false : true,
                endOnTick: hasMax ? false : true,
                opposite: opposite
            };

            if (stacked) {
                yAxis.stackLabels = {
                    enabled: true
                };
            }

            return yAxis;
        };

        var getDateFromXObject = function(x, minDate) {
            var minYear = minDate ? minDate.getFullYear() : 2000;
            var minMonth = minDate ? minDate.getMonth() : 0;
            var minDay = minDate ? minDate.getDate() : 1;
            var minHour = minDate ? minDate.getHours() : 0;
            var minMinute = minDate ? minDate.getMinutes() : 0;
            if (angular.isObject(x) && ('year' in x || 'month' in x || 'day' in x || 'hour' in x || 'minute' in x || 'weekday' in x)) {
                // default to 2000 because it's a leap year
                var date = new Date(x.year || minYear, x.month-1 || 0, x.day || 1, x.hour || 0, x.minute || 0);
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                date.setFullYear(x.year || minYear);
                if (!'month' in x) date.setUTCMonth(minMonth);
                if (!'day' in x) date.setUTCDate(minDay);
                if (!'hour' in x) date.setUTCHours(minHour);
                if (!'minute' in x) date.setUTCMinutes(minMinute);
                if(! ('year' in x)){
                    if('weekday' in x){
                        date.setDate(date.getDate() + 7 - date.getDay() + x.weekday );
                    }
                }
                if('day' in x){
                    // handle bisextil years
                    if(x.day == 29 && x.month == 2) {
                        date.setDate(28);
                        date.setMonth(1);
                    }
                } else {
                    if('month' in x){
                        date.setDate(16);
                    }
                }
                return date;
            }
        };

        function getXValue(dateFormatFunction, datePattern, x, minDate, precision) {
            var date = getDateFromXObject(x, minDate);
            if (date && precision) {
                return date.getTime();
            } else if (date) {
                return dateFormatFunction(datePattern, date);
            } else {
                return "" + x;
            }
        }

        function getValidYValue(value, chart){
            if (chart.func === 'QUANTILES' && chart.subsets) {
                // elastic search now returns a float value as key, for now we just hack the thing to get the correct key
                if (typeof value[chart.subsets + ".0"] === "undefined") {
                    return null;
                } else {
                    return value[chart.subsets + ".0"];
                }
            } else {
                if (typeof value === "undefined") {
                    return null;
                } else {
                    return value;
                }
            }
        }

        function compileAggrValue(scope, compiled_expr, accumulations, aggregates) {
            var valueY;
            try {
                valueY = scope.$eval(compiled_expr, {
                        operators: Math,
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
            replace: true,
            require: ["odsHighchartsChart"],
            scope: {
                parameters: '=parameters',
                domain: '=',
                apikey: '=',
                colors: '='
            },
            template: '<div class="ods-chart"><div class="chartplaceholder"></div><debug data="chartoptions"></debug></div>',
            controller: ['$scope', '$element', '$attrs', function($scope) {
                var timeSerieMode, precision, periodic, yAxisesIndexes, domain,
                    that = this;
                this.highchartsLoaded = function(Highcharts, element) {
                    var chartplaceholder = element.find('.chartplaceholder');

                    Highcharts.setOptions({
                        global: {useUTC: false}
                    });

                    function formatRowX(value){
                        if (periodic) {
                            console.warn('formatRowX on periodic value should not be used anymore');
                            switch(periodic){
                                // FIXME should compute a proper date
                                case 'month':
                                    return [
                                    translate('Jan'),
                                    translate('Feb'),
                                    translate('Mar'),
                                    translate('Apr'),
                                    translate('May'),
                                    translate('Jun'),
                                    translate('Jul'),
                                    translate('Aug'),
                                    translate('Sep'),
                                    translate('Oct'),
                                    translate('Nov'),
                                    translate('Dec')][value.month - 1];
                                case 'weekday':
                                    return [
                                    translate('Monday'),
                                    translate('Tuesday'),
                                    translate('Wednesday'),
                                    translate('Thursday'),
                                    translate('Friday'),
                                    translate('Saturday'),
                                    translate('Sunday')][value.weekday];
                                case 'day':
                                    return value.day;
                                default:
                                    return "" + value;
                            }
                        } else {
                            if (angular.isObject(value) && ("day" in value || "month" in value || "year" in value)) {
                                var date = new Date(value.year, value.month-1 || 0, value.day || 1, value.hour || 0, value.minute || 0);
                                return Highcharts.dateFormat("%Y-%m-%d", date);
                            }
                            return "" + value;
                        }
                    }

                    var last_parameters_hash;
                    that.update = function(parameters) {
                        if (typeof parameters === "undefined") {
                            parameters = $scope.parameters;
                        }

                        // make a copy of the parameters to make sure that we will not trigger any external watches by modifying this object
                        parameters = angular.copy(parameters);

                        if (!parameters || !parameters.queries || parameters.queries.length === 0) {
                            if ($scope.chart) {
                                angular.element($scope.chart.container).empty();
                            }
                            return;
                        }

                        var search_promises = [];
                        timeSerieMode = undefined;
                        precision = undefined;
                        periodic = undefined;
                        yAxisesIndexes = {};

                        // make sure all required datasets metadata are loaded
                        for (var i = 0; i < parameters.queries.length; i++) {
                            try {
                                getDatasetUniqueId(parameters.queries[i].config.dataset, domain);
                            } catch (e) {
                                ChartHelper.onLoad(that.update);
                                return;
                            }
                        }
                        var timeserie = getTimeSerieMode(parameters);
                        timeSerieMode = timeserie['timeSerieMode'];
                        precision = timeserie['precision'];
                        periodic = timeserie['periodic'];

                        var options = getGlobalOptions(parameters, precision, periodic, chartplaceholder, domain);
                        $scope.chartoptions = options;
                        angular.forEach(parameters.queries, function(query) {
                            var datasetid = ChartHelper.getDatasetId({dataset: {datasetid: query.config.dataset}, domain: query.config.domain});
                            if (angular.isUndefined(yAxisesIndexes[datasetid])) {
                                yAxisesIndexes[datasetid] = {};
                            }
                            angular.forEach(query.charts, function(chart) {
                                var yLabel = ChartHelper.getYLabel(datasetid, chart);
                                if (!parameters.singleAxis && angular.isUndefined(yAxisesIndexes[datasetid][yLabel])) {
                                    // we dont yet have an axis for this column :
                                    // Create axis and register it in yAxisesIndexes
                                    var yAxis = buildYAxis(yLabel, chart, !!(options.yAxis.length % 2), chart.stacked);
                                    yAxisesIndexes[datasetid][yLabel] = options.yAxis.push(yAxis) - 1;
                                }

                                if( chart.type == 'bar') {
                                    // bar chart invert axis, thus we have to cancel the label rotation
                                    options.xAxis.labels.rotation = 0;
                                }
                                chart.colorScale = colorScale.getScale(chart.color);

                                if (!ChartHelper.allowThresholds(chart.type)) {
                                    delete chart.thresholds;
                                } else if (chart.thresholds) {
                                    for (var i = 0; i < chart.thresholds.length; i++) {
                                        if (!angular.isNumber(chart.thresholds[i].value)) {
                                            chart.thresholds.splice(i, 1);
                                        }
                                    }
                                    chart.thresholds = chart.thresholds.sort(function(a, b) {
                                        return a.value > b.value;
                                    });
                                }
                            });

                        });


                        function pushValues(serie, categoryIndex, scale, valueX, valueY, color, thresholds) {
                            if (options.xAxis.type === 'datetime') {
                                if (typeof valueY === 'object') {
                                    var min = valueY[0],
                                        max = valueY[1];
                                    if (scale === 'logarithmic' && (min <= 0 || max <= 0)) {
                                        serie.data.push([
                                            valueX,
                                            null,
                                            null
                                        ]);
                                    } else {
                                        serie.data.push([
                                            valueX,
                                            min,
                                            max
                                        ]);
                                    }
                                } else if (serie.type == 'pie') {
                                    serie.data.push({
                                        name: Highcharts.dateFormat(serie.tooltip.xDateFormat, new Date(valueX)),
                                        y: valueY
                                    });
                                } else {
                                    if (scale === 'logarithmic' && valueY <= 0) {
                                        serie.data.push([
                                            valueX,
                                            null
                                        ]);
                                    } else {
                                        serie.data.push([
                                            valueX,
                                            valueY
                                        ]);
                                    }
                                    if (thresholds.length > 0) {
                                        for (var i = thresholds.length - 1; i >= 0; i--) {
                                            if (valueY >= thresholds[i].value) {
                                                serie.data[serie.data.length - 1] = {
                                                    'x': serie.data[serie.data.length - 1][0],
                                                    'y': serie.data[serie.data.length - 1][1],
                                                    'color': thresholds[i].color
                                                };
                                                break;
                                            }
                                        }
                                    }
                                }
                            } else { // !precision
                                // push row data into proper serie data array
                                if(serie.type == 'pie') {
                                    serie.data[categoryIndex] = {
                                        name: formatRowX(valueX),
                                        y: valueY
                                    };
                                } else {
                                    if (typeof valueY === 'object') {
                                        var min = valueY[0],
                                            max = valueY[1];
                                        if (scale === 'logarithmic' && (min <= 0 || max <= 0)) {
                                            serie.data[categoryIndex] = [null, null];
                                        } else {
                                            serie.data[categoryIndex] = [min, max];
                                        }
                                    } else {
                                        if (scale === 'logarithmic' && valueY <= 0) {
                                            serie.data[categoryIndex] = null;
                                        } else {
                                            serie.data[categoryIndex] = valueY;
                                        }
                                    }
    
                                    if (thresholds.length > 0) {
                                        for (var i = thresholds.length - 1; i >= 0; i--) {
                                            if (valueY >= thresholds[i].value) {
                                                serie.data[categoryIndex] = {
                                                    'y': serie.data[categoryIndex],
                                                    'color': thresholds[i].color
                                                };
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                        }

                        requestData(parameters.queries, $scope.searchoptions, timeSerieMode, precision, periodic, $scope.domain, $scope.apikey, function(http_calls, charts_by_calls){
                            // If there is both periodic & datetime timescale, we need to find the min date to properly offset the periodic data
                            var minDate;
                            if (precision) {
                                for (var h = 0; h < http_calls.length; h++) {
                                    var http_call = http_calls[h];
                                    for (var i=0; i < http_call.data.length; i++) {
                                        var row = http_call.data[i];
                                        if(row.x.year){
                                            var date = new Date(row.x.year, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                                            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                                            date.setFullYear(row.x.year);
                                            if(minDate === undefined || date < minDate) {
                                                minDate = date;
                                            }
                                        }
                                    }
                                }
                            }


                            var registered_series = [];
                            for (var i = 0; i < parameters.queries.length; i++) {
                                if (!parameters.queries[i].seriesBreakdown) {
                                    for (var j = 0; j < parameters.queries[i].charts.length; j++) {
                                        registered_series.push('serie' + (i + 1) + '-' + (j + 1));
                                        options.series.push(false);
                                    }
                                }
                            }
                            var handleSerie = function(serieHash, parameters, options, serie_options, query, serie, valueX, valueY, rawValueX) {
                                var serieIndex = registered_series.indexOf(serieHash);
                                var color = serie.colorScale(valueY).hex();
                                var categoryIndex;

                                if (serieIndex === -1) {
                                    options.series.push(getSerieOptions(parameters, yAxisesIndexes, query, serie, rawValueX, query.config.domain || domain));
                                    serieIndex = registered_series.push(serieHash) - 1;
                                } else if (!options.series[serieIndex]) {
                                    options.series[serieIndex] = getSerieOptions(parameters, yAxisesIndexes, query, serie, rawValueX, query.config.domain || domain);
                                }

                                if (!precision && (categoryIndex = options.xAxis.categories.indexOf(valueX)) === -1) {
                                    categoryIndex = options.xAxis.categories.length;
                                    options.xAxis.categories.push(valueX);
                                }

                                if (!rawValueX && serie.type !== 'pie') {
                                    pushValues(angular.extend(options.series[serieIndex], serie_options), categoryIndex, parameters.singleAxisScale || serie.scale, valueX, valueY, serie.colorScale(valueY).hex(), serie.thresholds || []);
                                } else {
                                    pushValues(angular.extend(options.series[serieIndex], serie_options), categoryIndex, parameters.singleAxisScale || serie.scale, valueX, valueY, options.series[serieIndex].color, serie.thresholds || []);
                                }
                            }


                            angular.forEach(http_calls, function(http_call, index) {
                                var results, aggregations;
                                if (!http_call.data || http_call.data.length === 0) {
                                    return;
                                }

                                if (http_call.data.results) {
                                    results = http_call.data.results;
                                    aggregations = http_call.data.aggregations;
                                } else {
                                    results = http_call.data;
                                }

                                if (results.length === 0) return;

                                // first thing, we should analyze the first record and get x values
                                var query = parameters.queries[index];
                                var charts = charts_by_calls[index];
                                var xAxis = query.xAxis;
                                var multipleXs = !!query.seriesBreakdown;
                                var nbSupplementaryXs = 1;
                                var serie_options = getContextualizedSeriesOptions(multipleXs ? results[0].x[xAxis]: results[0].x, options, timeSerieMode);

                                // transform data format to a format understood by the chart plugin
                                updateXAxisOptionsFromData(multipleXs ? results[0].x[xAxis]: results[0].x, options.xAxis, timeSerieMode);

                                // generate a list of all series to make sure always have a value for all of them
                                query.defaultValues = {};
                                angular.forEach(charts, function(chart, name) {
                                    query.defaultValues[name] = null;
                                });

                                // use server side aggregations
                                if (aggregations) {
                                    angular.forEach(aggregations, function(aggr, key) {
                                        var min, max;
                                        if (key.endsWith("min")) {
                                            key = key.replace('min', '');
                                            min = aggr.min;
                                            max = aggregations[key + 'max'].max;
                                        } else if (key.endsWith("max")) {
                                            // ignore, handled in "min"
                                            return;
                                        } else if (charts[key].charts && charts[key].charts[0].func === "QUANTILES" && charts[key].charts[1].func === "QUANTILES") {
                                            min = aggr.min[charts[key].charts[0].subset + ".0"];
                                            min = aggr.max[charts[key].charts[1].subset + ".0"];
                                        } else {
                                            min = aggr.min;
                                            max = aggr.max;
                                        }

                                        charts[key].colorScale = colorScale.getScale(charts[key].color, min, max);
                                    });
                                }

                                var accumulate_x = false;
                                var series_to_accumulate = [];
                                var accumulations_x = [];
                                var accumulations_y = {};
                                var nb_series = parameters.queries[index].charts.length;
                                for (var j = 0; j < nb_series; j++) {
                                    var chart = parameters.queries[index].charts[j];
                                    if (chart.aggregates) {
                                        for (var a = 0; a < chart.aggregates.length; a++) {
                                            var aggr = chart.aggregates[a];
                                            if (aggr && series_to_accumulate.indexOf(aggr) === -1) {
                                                series_to_accumulate.push(aggr);
                                                accumulations_y[aggr] = [];
                                            }
                                        }
                                    }
                                    if (chart.compiled_expr) {
                                        accumulate_x = true;
                                    }
                                }

                                for (var i = 0; i < results.length; i++) {
                                    var row = results[i];
                                    angular.extend({}, query.defaultValues, row);
                                    var valueX = getXValue(Highcharts.dateFormat, serie_options.tooltip.xDateFormat, multipleXs ? row.x[xAxis]: row.x, minDate, precision);

                                    var j = 0;
                                    // iterate on all entries in the row...
                                    angular.forEach(row, function(rawValueY, keyY) {
                                        var valueY;
                                        var serie_name;
                                        // ...and avoid the x entry
                                        if (keyY !== "x") {
                                            if (keyY.endsWith('min')) {
                                                return;
                                            } else if (keyY.endsWith('max')) {
                                                serie_name = keyY.replace('max', '');
                                            } else {
                                                serie_name = keyY;
                                            }

                                            var serie = charts[serie_name];
                                            if (keyY.endsWith('max')) {
                                                valueY = [getValidYValue(row[keyY.replace('max', 'min')], serie.charts[0]), getValidYValue(rawValueY, serie.charts[1])];
                                            } else if (serie.charts) {
                                                valueY = [getValidYValue(rawValueY, serie.charts[0]), getValidYValue(rawValueY, serie.charts[1])]
                                            } else {
                                                valueY = getValidYValue(rawValueY, serie);
                                            }

                                            if (!multipleXs) {
                                                handleSerie("" + serie_name, parameters, options, serie_options, query, serie, valueX, valueY);
                                                if (series_to_accumulate.indexOf(serie_name) >= 0) {
                                                    accumulations_y[serie_name].push(valueY);
                                                }
                                            } else {
                                                angular.forEach(row.x, function(rawValueX, keyX) {
                                                    if (keyX !== xAxis) {
                                                        rawValueX = getXValue(Highcharts.dateFormat, buildDatePattern(rawValueX), rawValueX, minDate, false);

                                                        handleSerie("" + serie_name + keyX + rawValueX, parameters, options, serie_options, query, serie, valueX, valueY, rawValueX);
                                                        if (series_to_accumulate.indexOf(serie_name) >= 0) {
                                                            accumulations_y[serie_name].push(valueY);
                                                        }
                                                    }
                                                });
                                            }
                                            if (accumulate_x) {
                                                accumulations_x.push(valueX);
                                            }
                                            j++;
                                        }
                                    })
                                }

                                if (accumulate_x) {
                                    accumulations_x.sort(function(a, b) {
                                        return a - b;
                                    });
                                    // remove duplicates in accumulations_x
                                    for (var i = accumulations_x.length - 1; i > 0; i--) {
                                        if (accumulations_x[i] == accumulations_x[i - 1]) {
                                            accumulations_x.splice(i, 1);
                                        }
                                    }
                                }

                                for (var i = 0; i < query.charts.length; i++) {
                                    if (query.charts[i].aggregates) {
                                        var serie = query.charts[i];
                                        var valueY = compileAggrValue($scope, serie.compiled_expr, accumulations_y, serie.aggregates);
                                        for (var j = 0; j < accumulations_x.length; j++) {
                                            handleSerie("aggr" + index + "-" + i, parameters, options, serie_options, query, serie, accumulations_x[j], valueY);
                                        }
                                    }
                                }
                            });

                            var categories = options.xAxis.categories;
                            if (categories) {
                                for (var i = 0; i < options.series.length; i++) {
                                    for (var k = 0; k < categories.length; k++) {
                                        if (typeof options.series[i].data[k] === "undefined") {
                                            options.series[i].data[k] = null;
                                        }
                                    }
                                }
                            }

                            // render the charts
                            if ($scope.chart && options.chart.renderTo) {
                                $scope.chart.destroy();
                                chartplaceholder = $element.find('.chartplaceholder');
                            }
                            options.chart.renderTo = chartplaceholder[0];
                            try {
                                if (options.series.length > 500) {
                                    odsErrorService.sendErrorNotification(translate("There is too many series to be displayed correctly, try to refine your query a bit."));
                                    options.series = options.series.slice(0, 10);
                                }
                                $scope.chart = new Highcharts.Chart(options, function() {});
                            } catch (errorMsg) {
                                if(errorMsg.indexOf && errorMsg.indexOf('Highcharts error #19') === 0){
                                    // too many ticks
                                    odsErrorService.sendErrorNotification(translate("There was too many points to display, the maximum number of points has been decreased."));
                                    angular.forEach($scope.parameters.queries, function(query){
                                        query.maxpoints = 20;
                                    });
                                } else {
                                    if (angular.isString(errorMsg)) {
                                        odsErrorService.sendErrorNotification(errorMsg);
                                    } else {
                                        odsErrorService.sendErrorNotification(errorMsg.message);
                                    }
                                }
                            }
                        });
                    }
                };
            }],
            link: function(scope, element, attrs, ctrls) {
                var chartController = ctrls[0];
                ModuleLazyLoader('highcharts').then(function() {
                    chartController.highchartsLoaded(Highcharts, element);
                    scope.$watch('parameters', function(nv, ov) {
                        chartController.update(nv);
                    }, true);
                });
            }
        };
    }]);

    mod.directive('odsHighcharts', ['colorScale', function(colorScale) {
        /**
         * @deprecated
         * @ngdoc directive
         * @name ods-widgets.directive:odsHighcharts
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} fieldX Name of the field used for the X axis
         * @param {string} expressionY Expression for the Y axis, typically a field name. Optional if the function (function-y) is 'COUNT'.
         * @param {string} functionY Function applied to the expression for the Y axis: AVG, COUNT, MIN, MAX, STDDEV, SUM
         * @param {string} timescale If the X axis is time-based, then you can specify the timescale (year, month, week, day, hour)
         * @param {string} chartType One of the following chart types: line, spline, area, areaspline, column, bar, pie
         * @param {string} color The color (or comma-separated list of colors in case of a pie chart) to draw the chart in. Colors are in hex color code (e.g. *#2f7ed8*).
         * If not specified, the colors from {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.chartColors} will be used if they are configured, else Highcharts default colors.
         * @param {string} [sort=none] How to sort the data in the chart: *x* or *-x* to sort or reverse sort on the X axis; *y* or *-y* to sort or reverse sort on the Y axis.
         * @param {number} [maxpoints=50] Maximum number of points to chart.
         * @param {string} [labelX=none] Configure a specific label for the X axis. By default it is named after the field used for the X axis.
         * @param {string} [labelY=none] Configure a specific label for the charted values and the Y axis. By default it is named after the expression used for the Y axis, or 'Count' if `functionY` is "COUNT".
         * @param {string|Object} [chartConfig=none] a complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted. If this parameter is present, all the other parameters are ignored, and the chart will not change if the context changes.
         *
         * @description
         * This widget can be used to integrate a visualization based on Highcharts.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="hurricanes" hurricanes-domain="public.opendatasoft.com" hurricanes-dataset="hurricane-tracks-1851-20071">
         *              <ods-highcharts context="hurricanes" field-x="track_date" chart-type="line" timescale="year" function-y="COUNT"></ods-highcharts>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        var defaultColors = colorScale.getColors(colorScale.getDefaultColorSet());

        return {
            restrict: 'E',
            scope: {
                context: '=',
                fieldX: '@',
                expressionY: '@',
                functionY: '@',
                timescale: '@',
                chartType: '@',
                color: '@',
                chartConfig: '=',
                labelX: '@',
                labelY: '@',
                sort: '@',
                maxpoints: '@'
            },
            replace: true,
            template: '<div class="odswidget odswidget-highcharts"><div ods-highcharts-chart parameters="chart" domain="context.domain" apikey="context.apikey"></div></div>',
            controller: ['$scope', 'ODSWidgetsConfig', 'ChartHelper', function($scope, ODSWidgetsConfig, ChartHelper) {

                var colors = ODSWidgetsConfig.chartColors || defaultColors;
                if ($scope.color) {
                    colors = $scope.color.split(',').map(function(item) { return item.trim(); });
                }

                var unwatch = $scope.$watch('context.dataset', function(nv) {
                    if (nv) {
                        if ($scope.context.type !== 'dataset') {
                            console.error('ods-highcharts requires a Dataset Context');
                        }

                        ChartHelper.init($scope.context);
                        if (angular.isUndefined($scope.chartConfig)) {
                            var extras = {};
                            if ($scope.chartType === 'pie') {
                                extras = {'colors': colors};
                            }
                            // Sort: x, -x, y, -y
                            var sort = '';
                            if ($scope.sort === 'y') {
                                sort = 'serie1-1';
                            } else if ($scope.sort === '-y') {
                                sort = '-serie1-1';
                            } else {
                                sort = $scope.sort;
                            }
                            // TODO: Retrieve the field label for default X and Y labels (using ODS.Dataset coming soon)
                            var yLabel = $scope.labelY || ($scope.functionY.toUpperCase() === 'COUNT' ? 'Count' : $scope.expressionY);
                            $scope.chart = {
                                timescale: $scope.timescale,
                                xLabel: $scope.labelX,
                                queries : [
                                    {
                                        config: {
                                            dataset: $scope.context.dataset.datasetid,
                                            options: $scope.context.parameters,
                                            domain: $scope.context.domain
                                        },
                                        xAxis: $scope.fieldX,
                                        sort: sort,
                                        maxpoints: $scope.maxpoints || 50,
                                        charts: [
                                            {
                                                yAxis: $scope.expressionY,
                                                yLabelOverride: yLabel,
                                                func: $scope.functionY,
                                                color: colors[0],
                                                type: $scope.chartType,
                                                extras: extras
                                            }
                                        ]
                                    }
                                ]
                            };
                        } else {
                            if (angular.isString($scope.chartConfig)) {
                                $scope.chart = JSON.parse(b64_to_utf8($scope.chartConfig));
                            } else {
                                $scope.chart = $scope.chartConfig;
                            }
                        }
                        $scope.$broadcast('chartConfigReady', $scope.chart); //FIXME: broadcasts still used?

                        $scope.$watch('chart', function(nv) {
                            if (nv || ov) {
                                $scope.$broadcast('chartConfigReady', $scope.chart);
                            }
                        }, true);

                        unwatch();
                    }
                });
            }]
        };
    }]);

    mod.directive('odsMultiHighcharts', ["ODSAPI", 'ChartHelper', '$q', function(ODSAPI, ChartHelper, $q) {
        /**
         * @deprecated
         * @ngdoc directive
         * @name ods-widgets.directive:odsMultiHighcharts
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of OpenDataSoft.
         *
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                chartConfig: '='
            },
            replace: true,
            template: '<div class="odswidget odswidget-multihighcharts"><div ods-chart parameters="chart" domain="context.domain" apikey="context.apikey"></div></div>',
            controller: ['$scope', function($scope) {
                var unwatch = $scope.$watch('context', function(nv) {
                    if (!nv) return;
                    if (nv.type !== 'catalog') {
                        console.error('ods-multi-highcharts requires a Catalog Context');
                    }
                    var chartConfig;
                    if (angular.isString($scope.chartConfig)) {
                        chartConfig = JSON.parse(b64_to_utf8($scope.chartConfig));
                    } else {
                        chartConfig = $scope.chartConfig;
                    }

                    var datasets = [];
                    for (var i = 0; i < chartConfig.queries.length; i++) {
                        var datasetid = chartConfig.queries[i].config.dataset;
                        if (datasets.indexOf(datasetid) === -1) {
                            datasets.push(datasetid);
                        }
                    }
                    var requests = [];
                    for (var i = 0; i < datasets.length; i++) {
                        requests.push(ODSAPI.datasets.get($scope.context, datasets[i], {extrametas: true}).
                            success(function(data) {
                                var dataset = new ODS.Dataset(data);
                                // dataset.metas.domain = $scope.context.domain;
                                $scope.context.dataset = dataset;
                                ChartHelper.init($scope.context);
                            }));
                    }
                    $q.all(requests).then(function(arg) {
                        $scope.chart = chartConfig;
                        // $scope.$broadcast('chartConfigReady', $scope.chart);
                    });
                    unwatch();
                });
            }]
        };
    }]);




    mod.directive('odsChart', ["ODSAPI", 'ChartHelper', 'ODSWidgetsConfig', function(ODSAPI, ChartHelper, ODSWidgetsConfig) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsChart
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of OpenDataSoft.
         *
         */
        return {
            restrict: 'EA',
            scope: {
                timescale: '@',
                labelX: '@',
                singleYAxis: '@',
                singleYAxisLabel: '@',
                singleYAxisScale: '@',
                min: '@',
                max: '@',
                logarithmic: '@',
                displayLegend: '@',

                // old syntax can still be used for simple chart
                context: '=?',
                fieldX: '@',
                expressionY: '@',
                functionY: '@',
                chartType: '@',
                color: '@',
                chartConfig: '=?',
                labelY: '@',
                sort: '@',
                maxpoints: '@',

                chart: '=?parameters'
            },
            replace: true,
            transclude: true,
            template: '<div class="odswidget odswidget-charts">' +
                '<debug data="chart"></debug>' +
                '<div ods-highcharts-chart parameters="chart" domain="context.domain" apikey="context.apikey"></div>' +
                '<div ng-transclude></div>' +
            '</div>',
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                if (!$scope.chart) {
                    $scope.chart = {
                        queries: [],
                        xLabel: angular.isDefined($scope.labelX) ? $scope.labelX : undefined,
                        timescale: $scope.timescale || "",
                        singleAxis: !!$scope.singleYAxis,
                        singleAxisLabel: angular.isDefined($scope.singleYAxisLabel) ? $scope.singleYAxisLabel : undefined,
                        singleAxisScale: $scope.logarithmic ? 'logarithmic' : '',
                        yRangeMin: angular.isDefined($scope.min) ? parseInt($scope.min, 10) : undefined,
                        yRangeMax: angular.isDefined($scope.max) ? parseInt($scope.max, 10) : undefined,
                        displayLegend: angular.isDefined($scope.displayLegend) && $scope.displayLegend === "false" ? false : true
                    };
                }

                angular.forEach($scope.chart, function(item, key) {
                    if (typeof item === "undefined") {
                        delete $scope.chart[key];
                    }
                });

                if ($attrs['context']) {
                    // backward compatibility
                    (function() {
                        var colors = ODSWidgetsConfig.chartColors || defaultColors;
                        if ($scope.color) {
                            colors = $scope.color.split(',').map(function(item) { return item.trim(); });
                        }

                        var unwatch = $scope.$watch('context.dataset', function(nv) {
                            if (nv) {
                                if ($scope.context.type !== 'dataset') {
                                    console.error('ods-chart requires a Dataset Context');
                                }

                                ChartHelper.init($scope.context);
                                if (angular.isUndefined($scope.chartConfig)) {
                                    var extras = {};
                                    if ($scope.chartType === 'pie') {
                                        extras = {'colors': colors};
                                    }
                                    // Sort: x, -x, y, -y
                                    var sort = '';
                                    if ($scope.sort === 'y') {
                                        sort = 'serie1-1';
                                    } else if ($scope.sort === '-y') {
                                        sort = '-serie1-1';
                                    } else {
                                        sort = $scope.sort;
                                    }
                                    // TODO: Retrieve the field label for default X and Y labels (using ODS.Dataset coming soon)
                                    var yLabel = $scope.labelY || ($scope.functionY.toUpperCase() === 'COUNT' ? 'Count' : $scope.expressionY);
                                    $scope.chart = {
                                        timescale: $scope.timescale,
                                        xLabel: $scope.labelX,
                                        queries: [
                                            {
                                                config: {
                                                    dataset: $scope.context.dataset.datasetid,
                                                    options: $scope.context.parameters
                                                },
                                                xAxis: $scope.fieldX,
                                                sort: sort,
                                                maxpoints: $scope.maxpoints || 50,
                                                charts: [
                                                    {
                                                        yAxis: $scope.expressionY,
                                                        yLabelOverride: yLabel,
                                                        func: $scope.functionY,
                                                        color: colors[0],
                                                        type: $scope.chartType,
                                                        extras: extras
                                                    }
                                                ]
                                            }
                                        ]
                                    };
                                } else {
                                    if (angular.isString($scope.chartConfig)) {
                                        $scope.chart = JSON.parse(b64_to_utf8($scope.chartConfig));
                                    } else {
                                        $scope.chart = $scope.chartConfig;
                                    }
                                }
                                unwatch();
                            }
                        });
                    })();
                    this.setQuery = function(query, context) {
                        console.error("cannot use ods-chart-query when context and chartConfig are declared on ods-chart");
                    }
                } else {
                    this.setQuery = function(query, context) {
                        var index = $scope.chart.queries.indexOf(query);
                        var groups;
                        if (index === -1) {
                            index = $scope.chart.queries.length;
                            $scope.chart.queries.push(query);
                        } else {
                            $scope.chart.queries[index] = query;
                        }

                        if (query.sort) {
                            if (groups = query.sort.match(/^serie([0-9]+)$/)) {
                                $scope.chart.queries[index].sort = 'serie' + (index + 1) + '-' + groups[1];
                            }
                        }
                        // make sure everything is correctly set before displying it:
                        var uniqueid = ChartHelper.getDatasetId(context);

                        if (typeof query.xAxis === "undefined") {
                            ChartHelper.setDefaultQueryValues(uniqueid, query, true);
                        }

                        for (var j = 0; j < query.charts.length; j++) {
                            ChartHelper.setSerieDefaultValues(uniqueid, query.charts[j], query.xAxis);
                        }

                        ChartHelper.setDefaultQueryValues(uniqueid, query, true);

                        if ($scope.chart.queries.length === 1) {
                            ChartHelper.setChartDefaultValues(uniqueid, $scope.chart, true);
                        }

                        for (var j = 0; j < query.charts.length; j++) {
                            ChartHelper.setSerieDefaultColors(query.charts[j], query.seriesBreakdown);
                        }
                    }

                    $scope.$watch('labelX', function(nv, ov) {
                        $scope.chart.xLabel = nv;
                    })
                }
            }]
        };
    }]);


    mod.directive('odsChartQuery', ["ODSAPI", 'ChartHelper',function(ODSAPI, ChartHelper) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsChartQuery
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of OpenDataSoft.
         *
         */
        return {
            restrict: 'E',
            require: ["odsChartQuery", "^odsChart"],
            controller: ['$scope', function($scope) {
            }],
            compile: function() {
                return {
                    pre: function(scope, element, attrs, ctrls) {
                        var thisController = ctrls[0],
                            odsChartController = ctrls[1];
                        var query = {
                            config: {},
                            charts: [],
                            xAxis: attrs.fieldX,
                            maxpoints: attrs.maxpoints ? parseInt(attrs.maxpoints, 10): undefined,
                            timescale: attrs.timescale,
                            stacked: attrs.stacked,
                            seriesBreakdown: attrs.seriesBreakdown,
                            seriesBreakdownTimescale: attrs.seriesBreakdownTimescale
                        };

                        query.sort = '';
                        if (attrs.sort === 'y') {
                            query.sort = 'serie1';
                        } else if (attrs.sort === '-y') {
                            query.sort = '-serie1';
                        } else {
                            query.sort = attrs.sort;
                        }
                        var forcedOptions = attrs.options || {};

                        angular.forEach(query, function(item, key) {
                            if (typeof item === "undefined") {
                                delete query[key];
                            }
                        });

                        thisController.setChart = function(chart) {
                            if (query.charts.indexOf(chart) === -1) {
                                query.charts.push(chart);
                            }
                        }
                        var pushQuery = function(context) {
                            if (context) {
                                odsChartController.setQuery(query, context);
                            }
                        }

                        var context = attrs.context;

                        scope[context].wait().then(function(dataset) {
                            ChartHelper.init(scope[context]);
                            query.config.dataset = dataset.datasetid;
                            query.config.domain = scope[context].domain;
                            query.config.apikey = scope[context].apikey;
                            query.config.options = angular.extend({}, scope[context].parameters, forcedOptions);

                            thisController.setChart = function(chart) {
                                if (query.charts.indexOf(chart) === -1) {
                                    query.charts.push(chart);
                                }
                                pushQuery(scope[context]);
                            }

                            pushQuery(scope[context]);

                            scope.$watch(context + ".parameters", function(nv, ov) {
                                if (nv) {
                                    query.config.options = angular.extend({}, nv, forcedOptions);
                                    pushQuery(scope[context]);
                                }
                            }, true);
                        });
                    }
                }
            }
        };
    }]);

    mod.directive('odsChartSerie', ["ODSAPI", 'ChartHelper', '$compile', '$parse', function(ODSAPI, ChartHelper, $compile, $parse) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsChartSerie
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of OpenDataSoft.
         *
         */
        return {
            restrict: 'E',
            require: "^odsChartQuery",
            controller: ['$scope', '$transclude', function($scope, $transclude) {
            }],
            link: function(scope, element, attrs, ctrl) {
                var odsChartQueryController = ctrl;

                var chart = {
                    type: attrs.chartType || undefined,
                    func: attrs.functionY || undefined,
                    yAxis: attrs.expressionY || undefined,
                    color: attrs.color || undefined,
                    cumulative: !!attrs.cumulative || false,
                    yLabelOverride: angular.isDefined(attrs.labelY) ? attrs.labelY : undefined,
                    scale: attrs.logarithmic ? 'logarithmic' : '',
                    yRangeMin: angular.isDefined(attrs.min) ? parseInt(attrs.min, 10) : undefined,
                    yRangeMax: angular.isDefined(attrs.max) ? parseInt(attrs.max, 10) : undefined,
                    thresholds: attrs.colorThresholds || [],
                    subsets: attrs.subsets,
                    charts: attrs.subseries ? JSON.parse(attrs.subseries) : undefined
                };
                angular.forEach(chart, function(item, key) {
                    if (typeof item === "undefined") {
                        delete chart[key];
                    }
                });
                odsChartQueryController.setChart(chart);
                attrs.$observe('labelY', function(value) {
                    chart.yLabelOverride = value;
                    odsChartQueryController.setChart(chart);
                });
            }
        };
    }]);


}());
