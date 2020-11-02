(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var functionUsesField = function(func) {
        return ['COUNT', 'CONSTANT'].indexOf(func) === -1;
    };

    function shouldOutputUTC(queries, timeSerieMode) {
        return (queries.length === 1 && ['hour', 'minute', 'second'].indexOf(queries[0].timescale) !== -1)
            || ['hour', 'minute', 'second'].indexOf(timeSerieMode) !== -1;
    }

    function escapeHTMLForAxisLabels(text) {
        // Highcharts doesn't support the escaped character for single quotes (&#039;) within the labels for axes
        // In this instance, the single quote isn't a menace on its own
        return text == null ? '' : String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    mod.factory("requestData", ['ODSAPI', '$q', 'ChartHelper', 'AggregationHelper', function(ODSAPI, $q, ChartHelper, AggregationHelper) {
        var buildTimescaleX = ODS.DateFieldUtils.getTimescaleX;

        var buildSearchOptions = function(query, timeSerieMode, precision, periodic) {
            var i, breakdown,
                xs,
                search_options = {
                    dataset: query.config.dataset,
                    x: [],
                    sort: query.sort || '',
                    maxpoints: query.maxpoints || ''
                };

            xs = buildTimescaleX(query.xAxis, query.timescale);
            for (i = 0; i < xs.length; i++) {
                search_options.x.push(xs[i]);
            }

            if (query.seriesBreakdown) {
                breakdown = query.seriesBreakdown;
                xs = buildTimescaleX(breakdown, query.seriesBreakdownTimescale);
                for (i = 0; i < xs.length; i++) {
                    search_options.x.push(xs[i]);
                }
            }
            if (timeSerieMode || query.seriesBreakdown) {
                search_options.sort = ODS.DateFieldUtils.getTimescaleSort(search_options.x);
            }

            // if (timeSerieMode){
            //     search_options.precision = precision;
            //     search_options.periodic = periodic;
            // }

            // // is there a timescale override ?
            // if(query.timescale){
            //      var tokens = query.timescale.split(' ');
            //      search_options.precision = tokens[0];
            //      search_options.periodic = tokens.length == 2 ? tokens[1] : '';
            // }
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
            match = regex.exec(serie.expr);
            while (match) {
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
                match = regex.exec(serie.expr);
            }

            return options;
        };
        var generateSerieOptions = function(serie, serie_name, aggregations, parent_for_subseries) {
            var options = {};
            if (serie.func === "CUSTOM") {
                return parseCustomExpression(serie, 'y.' + serie_name, parent_for_subseries);
            }

            if (['CONSTANT', 'COUNT'].indexOf(serie.func) === -1 && !(serie.yAxis || serie.expr)) {
                // invalid configuration, do not make the call to analyze API
                return {};
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

            if (angular.isDefined(serie.multiplier) && serie.multiplier !== "" && serie.multiplier !== null) {
                options['y.' + serie_name + '.expr'] += " * " + serie.multiplier;
            }
            // if (!serie.color || serie.color.startsWith('dynamic-') || serie.color.startsWith('static-')) {
            //     options['agg.' + serie_name + '.func'] = ['MIN', 'MAX'].join(",");
            //     options['agg.' + serie_name + '.expr'] = serie_name;
            // }
            return options;
        };

        var addSeriesToSearchOptions = function(search_options, serie, serie_name) {
            var i,
                allQuantiles = true,
                temp_serie;
            if(serie.type && (ChartHelper.isRangeChart(serie.type) || serie.type === 'boxplot')) {
                if (search_options.sort === 'y.' + serie_name) {
                    // cannot sort on range
                    search_options.sort = '';
                }
                // when trying to compute 2 quantiles on the same serie, optimize the call

                if (serie.charts[0].func === 'QUANTILES') {
                    temp_serie = angular.copy(serie.charts[0]);
                    for (i = 1; i < serie.charts.length; i++) {
                        if (serie.charts[i].func !== 'QUANTILES' || serie.charts[i - 1].yAxis !== serie.charts[i].yAxis) {
                            allQuantiles = false;
                        } else {
                            temp_serie.subsets = temp_serie.subsets + "," + serie.charts[i].subsets;
                        }
                    }
                } else {
                    allQuantiles = false;
                }
                if (allQuantiles) {
                    addSeriesToSearchOptions(search_options, temp_serie, serie_name);
                } else {
                    for (i = 0; i < serie.charts.length; i++) {
                        serie.charts[i].multiplier = serie.multiplier;
                        addSeriesToSearchOptions(search_options, serie.charts[i], serie_name + '-range-' + i);
                    }
                }
            } else {
                angular.extend(search_options, generateSerieOptions(serie, serie_name));
            }
        };

        return function(queries, search_parameters, timeSerieMode, precision, periodic, domain, apikey, canceller) {
            var search_promises = [];
            var charts_by_query = [];
            var original_domain = domain;
            search_parameters = search_parameters || {};

            if (shouldOutputUTC(queries, timeSerieMode)) {
                search_parameters.output_timezone = 'UTC';
            }

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
                    dataset: {
                        'datasetid': search_options.dataset,
                        'metas': {
                            timezone: (query.config && query.config.options && query.config.options.timezone) || null
                        }
                    },
                    apikey: apikey,
                    parameters: {}
                };

                var query_options = angular.extend({}, query.config.options);
                delete query_options.output_timezone;
                delete query_options.sort;

                var has_y = false;

                angular.forEach(search_options, function(value, key) {
                    if (key.match(/y\..*\.func/)) {
                        has_y = true;
                    }
                });

                if (has_y) {
                    search_promises.push(ODSAPI.records.analyze(virtualContext, angular.extend({}, search_parameters, query_options, search_options), canceller.promise));
                    charts_by_query.push(charts);
                }
            });
            return {
                promise: $q.all(search_promises),
                charts: charts_by_query
            };
        };
    }]);

    mod.directive("odsHighchartsChart", ['colorScale',
                                         'requestData',
                                         'translate',
                                         'ModuleLazyLoader',
                                         'AggregationHelper',
                                         'ChartHelper',
                                         '$rootScope',
                                         'odsNotificationService',
                                         '$q',
                                         'ODSWidgetsConfig',
        function(colorScale, requestData, translate, ModuleLazyLoader, AggregationHelper, ChartHelper, $rootScope, odsNotificationService, $q, ODSWidgetsConfig) {
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
        var translate_time = translate;
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

            var timescale = parameters.timescale;
            if (!timescale) {
                timescale = parameters.queries[0].timescale || false;
            }

            if(timescale && jQuery.grep(parameters.queries, function(query){return query.sort;}).length === 0){
                 timeSerieMode = timescale;
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
        };

        var shouldUseUtc = function(parameters){
            var timeserie = getTimeSerieMode(parameters);

            var precision = timeserie.precision;
            var periodic = timeserie.periodic;

            var useUTC = false;

            if (precision) {
                if (periodic && precision === "hour") {
                    useUTC = true;
                } else if (!periodic) {
                    if (['year', 'month', 'day'].indexOf(precision) !== -1) {
                        useUTC = true;
                    }
                }
            }

            return useUTC;
        };

        var getGlobalOptions = function(parameters, precision, periodic, chartplaceholder, domain) {
            var datasetid;

            if (parameters.queries.length === 0) {
                parameters.xLabel = '';
            } else {
                datasetid = getDatasetUniqueId(parameters.queries[0].config.dataset, domain);
                if (!angular.isDefined(parameters.xLabel)) {
                    parameters.xLabel = ChartHelper.getXLabel(datasetid, parameters.queries[0].xAxis, parameters.timescale);
                }
            }

            if (angular.isUndefined(parameters.displayLegend)) {
                parameters.displayLegend = true;
            }

            parameters.labelsXLength = parameters.labelsXLength || 12;


            var serieTitle = '<span style="color:{series.color}">{series.name}</span>:';
            var options = {
                chart: {},
                title: {text: ''},
                credits: {enabled: false},
                series: [],
                xAxis: {
                    title: {
                        text: escapeHTMLForAxisLabels(parameters.xLabel)
                    },
                    labels: {
                        step: 1,
                        rotation: -45,
                        align: 'right',
                        useHTML: true,
                        style: {direction: 'initial'}
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
                    enabled: !!parameters.displayLegend,
                    useHTML: true,
                    rtl: ODSWidgetsConfig.language === 'ar',
                    labelFormatter: function() {
                        return ODS.StringUtils.escapeHTML(this.name);
                    }
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
                        animation: false,
                        turboThreshold: 10000,
                    },
                    columnrange: {
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        tooltip: {
                            pointFormat: serieTitle + ' <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    arearange: {
                        tooltip: {
                            pointFormat: serieTitle + ' <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    areasplinerange: {
                        tooltip: {
                            pointFormat: serieTitle + ' <b>{point.low}</b> - <b>{point.high}</b>'
                        }
                    },
                    pie: {
                        tooltip: {
                            pointFormat: serieTitle + ' <b>{point.y} ({point.percentage:.1f}%)</b>'
                        },
                        dataLabels: {
                            formatter: function() {
                                var sanitizedValue = ODS.StringUtils.escapeHTML(this.key);
                                if (this.key.length > parameters.labelsXLength) {
                                    return '<span title="' + sanitizedValue.replace('"', '') + '" alt="' + sanitizedValue.replace('"', '') + '">' + ODS.StringUtils.escapeHTML(this.key.substring(0, parameters.labelsXLength - 3)) + '...' + "</span>";
                                } else {
                                    return sanitizedValue;
                                }
                            },
                            style: {
                                textOutline: 'none'
                            },
                            useHTML: true
                        }
                    },
                    treemap: {
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{point.name}</span>:' + '<b>{point.value}</b>'
                        },
                        layoutAlgorithm: 'squarified',
                        colorByPoint: true,
                        dataLabels: {
                            style: {
                                textOutline: 'none'
                            },
                            formatter: function() {
                                var sanitizedValue = ODS.StringUtils.escapeHTML(this.key);
                                if (this.key.length > parameters.labelsXLength) {
                                    return '<span title="' + sanitizedValue.replace('"', '') + '" alt="' + sanitizedValue.replace('"', '') + '">' + ODS.StringUtils.escapeHTML(this.key.substring(0, parameters.labelsXLength - 3)) + '...' + "</span>";
                                } else {
                                    return sanitizedValue;
                                }
                            },
                            useHTML: true
                        }
                    }
                },
                tooltip: {
                    useHTML: true,
                    padding: 0,
                    valueDecimals: 2,
                    headerFormat: '{point.key}<br>',
                    pointFormat: serieTitle + ' <b style="display: inline-block">{point.y}</b>',
                    formatter: function (tooltip) {
                        var items = this.points || angular.isArray(this) ? this : [this],
                            series = items[0].series,
                            s = [];

                        // We copy the item for the header formatting, so that we can sanitize it with no side effects
                        var headerItem = angular.copy(items[0]);
                        if (angular.isString(headerItem.key)) {
                            headerItem.key = ODS.StringUtils.escapeHTML(headerItem.key);
                        }

                        s = [tooltip.tooltipFooterHeaderFormatter(headerItem)];

                        // build the values
                        angular.forEach(items, function (item) {
                            series = item.series;
                            var value = (series.tooltipOptions.pointFormatter && series.tooltipOptions.pointFormatter.bind(item.point)()) || item.point.tooltipFormatter(series.tooltipOptions.pointFormat);
                            s.push(value);
                        });
                        // footer
                        s.push(tooltip.options.footerFormat || '');
                        // Add this in RTL to prevent the text-align:left on .highcharts-container added by highcharts to counter the direction
                        if (ODSWidgetsConfig.language === 'ar'){
                            s.unshift('<div style="text-align:right">');
                            s.push('</div>');
                        }

                        // Add css to prevent https://github.com/highcharts/highcharts/issues/2528#issuecomment-283177513
                        s.unshift('<div class="highcharts-tooltip-container">');
                        s.push('</div>');

                        return s.join('');
                    }
                },
                noData: {
                    style: {
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        fontWeight: 'normal',
                        fontSize: '1.4em',
                        color: '#333',
                        opacity: '0.5'
                    }
                },
                lang: {
                    noData: translate("No data available yet"),
                    resetZoom: translate('Reset zoom')
                }
            };

            var xAxisType = ChartHelper.getFieldType(datasetid, parameters.queries[0].xAxis);

            if (precision) {
                options.xAxis.type = 'datetime';
                options.xAxis.maxZoom = 60000; // one minute
                options.chart.zoomType = 'xy';

                if (periodic) {
                    options.xAxis.showFirstLabel = true;
                }
            } else if (['double', 'int'].indexOf(xAxisType) !== -1 && parameters.queries[0].sort === "") {
                options.xAxis.type = "linear";
            } else {
                options.xAxis.type = "category";
                options.xAxis.categories = [];
            }

            if (periodic === "month") {  // month of year
                if (precision === 'day') {
                    options.xAxis.labels.format = "{value: %j}"; // day of year, yeah it's weird
                } else {
                    options.xAxis.labels.format = "{value: %B}"; // month of year
                }
            } else if (periodic === "weekday") {  // day of week
                options.xAxis.labels.format = "{value: %A}";
                if (precision === "hour") {
                    options.xAxis.labels.format = "{value: %a %H:00}";
                }
            } else if (periodic === "day") {  // day of month
                options.xAxis.labels.format = "{value: %d}";
            } else if (periodic === "hour") {
                options.xAxis.labels.format = "{value: %H:00}";
            }

            if (!precision) {
                options.xAxis.labels.formatter = function() {
                    var sanitizedValue = ODS.StringUtils.escapeHTML(this.value);
                    if (this.value.length > parameters.labelsXLength) {
                        return '<span title="' + sanitizedValue.replace('"', '') + '" alt="' + sanitizedValue.replace('"', '') + '">' + ODS.StringUtils.escapeHTML(this.value.substring(0, parameters.labelsXLength - 3)) + '...' + "</span>";
                    } else {
                        return sanitizedValue;
                    }
                };
            } else {
                options.xAxis.labels.useHTML = false;
            }

            if(parameters.singleAxis) {
                var yAxisParameters = {
                    color: "#000000",
                    scale: parameters.singleAxisScale,
                    yRangeMin: parameters.yRangeMin,
                    yRangeMax: parameters.yRangeMax,
                    yStep: parameters.yStep,
                    scientificDisplay: parameters.scientificDisplay
                };

                options.yAxis = [buildYAxis(parameters.singleAxisLabel, yAxisParameters, false, false)];
            }

            for (var i = 0; i < parameters.queries.length; i++) {
                for (var j = 0; j < parameters.queries[i].charts.length; j++) {
                    if (parameters.queries[i].charts[j].type === "spiderweb" || parameters.queries[i].charts[j].type === "polar") {
                        options.chart.polar = true;
                        options.xAxis.lineWidth = 0;
                        options.xAxis.tickmarkPlacement = 'on';
                        options.xAxis.labels.rotation = 0;
                        options.xAxis.title = {};
                    }

                    if (parameters.queries[i].charts[j].type === "polar") {
                        options.plotOptions.series.pointPlacement = 'on';
                        options.plotOptions.series.pointPadding = 0;
                        options.plotOptions.series.groupPadding = 0;
                    }

                    if (parameters.queries[i].charts[j].type === "funnel") {
                        options.chart.type = "funnel";
                        options.chart.marginRight = 100;
                        options.legend.enabled = false;
                    }
                }
            }

            return options;
        };

        var getSerieOptions = function(parameters, yAxisesIndexes, query, serie, suppXValue, domain, scope, colorsIndex) {
            var datasetid = ChartHelper.getDatasetId({dataset: {datasetid: query.config.dataset}, domain: domain});
            var yLabel = ChartHelper.getYLabel(datasetid, serie);
            var serieColor;
            if (!suppXValue && !ChartHelper.isMultiColorChart(serie.type)) {
                serieColor = colorScale.getUniqueColor(serie.color);
            } else if (ChartHelper.isMultiColorChart(serie.type)) {
                if (!serie.extras) {
                    serie.extras = {};
                }

                if (serie.innersize) {
                    serie.extras.innerSize = serie.innersize;
                }
                if (serie.labelsposition === 'inside') {
                    serie.extras.dataLabels = {
                        distance: -50
                    };
                }

                serie.extras.colors = colorScale.getColors(serie.color);
            } else {
                if (query.categoryColors && query.categoryColors[suppXValue]) {
                    serieColor = query.categoryColors[suppXValue];
                } else {
                    serieColor = colorScale.getColorAtIndex(serie.color, colorsIndex);
                }
            }

            var type = 'line',
                polar = false;
            if (serie.type === 'spiderweb') {
                type = 'line';
            } else if (serie.type === 'polar') {
                type = 'column';
                serie.extras.colorByPoint = true;
            } else {
                type = serie.type;
            }

            var options = angular.extend({}, {
                name: suppXValue ? suppXValue : yLabel,
                color: serieColor,
                type: type,
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

            if (!options.dataLabels) {
                options.dataLabels = {};
            }

            if (serie.type === "funnel") {
                options.neckWidth = '30%';
                options.neckHeight = '25%';
            }

            var unit = false,
                decimals = false;
            if (functionUsesField(serie.func)) {
                unit = ChartHelper.getFieldUnit(datasetid, serie.yAxis);
                decimals = ChartHelper.getDecimals(datasetid, serie.yAxis);
            }

            if (serie.displayValues) {
                options.dataLabels.enabled = true;
                options.dataLabels.color = 'black';
                if (serie.type !== 'treemap') {
                    options.dataLabels.formatter = function() {
                        var label;
                        if (decimals !== false) {
                            label = Highcharts.numberFormat(this.point.y, decimals);
                        } else {
                            label = Highcharts.numberFormat(this.point.y).replace(/([,.][0-9]*?)0+$/, '$1').replace(/[,.]$/, '');
                        }
                        return label;
                    };
                }
            }

            if (serie.index) {
                options.index = serie.index;
            }

            if (serie.displayUnits && unit) {
                options.tooltip.valueSuffix = ' ' + unit;
                if (serie.displayValues && serie.type !== 'treemap') {
                    var _formatter = options.dataLabels.formatter;
                    options.dataLabels.formatter = function() {
                        if (unit === "$") {
                            return unit + _formatter.bind(this)(this.point.y);
                        } else {
                            return _formatter.bind(this)(this.point.y) + ' ' + unit;
                        }
                    };
                }
            }

            function formatValue(value, decimals, unit) {
                if (decimals !== false) {
                    value = Highcharts.numberFormat(value, decimals);
                } else if (angular.isNumber(value)) {
                    value = Highcharts.numberFormat(value).replace(/([,.][0-9]*?)0+$/, '$1').replace(/[,.]$/, '');
                }

                if (unit) {
                    if (unit === '$') {
                        value = unit + value;
                    } else {
                        value = value + ' ' + unit;
                    }
                }
                return value;
            }

            function getTooltipFormatterFunction(functionName) {
                var formatterFunction;
                var template = '<div class="ods-highcharts__tooltip"><span style="color: {color}">{name}</span>&nbsp;<b style="display: inline-block">{value}</b></div>';
                if (functionName === 'treemap') {
                    formatterFunction = function areaTooltip() {
                        var formattedValue = formatValue(this.value, decimals, serie.displayUnits ? unit : false);
                        return format_string(template, {
                            name: ODS.StringUtils.escapeHTML(this.series.name),
                            color: this.series.color,
                            value: formattedValue
                        });
                    };
                } else if (functionName === 'arearange' || functionName === 'areasplinerange' || functionName === 'columnrange') {
                    formatterFunction = function areaTooltip() {
                        var formattedLow = formatValue(this.low, decimals, serie.displayUnits ? unit : false);
                        var formattedHigh = formatValue(this.high, decimals, serie.displayUnits ? unit : false);
                        return format_string(template, {
                            name: ODS.StringUtils.escapeHTML(this.series.name),
                            color: this.series.color,
                            value: formattedLow + ' - ' + formattedHigh
                        });
                    };
                } else if (functionName === 'pie') {
                    formatterFunction = function singleValueTooltip() {
                        var formattedValue = formatValue(this.y, decimals, serie.displayUnits ? unit : false);
                        return format_string(template, {
                            name: ODS.StringUtils.escapeHTML(this.series.name),
                            color: this.series.color,
                            value: formattedValue + ' (' + Highcharts.numberFormat(this.percentage, 1) + '%)'
                        });
                    };
                } else if (functionName === 'boxplot') {
                    formatterFunction = function boxTooltip() {
                        var _format = function(value) {
                            return '<span>' + formatValue(value, decimals, serie.displayUnits ? unit : false) + '</span>';
                        };
                        var points = [this.low, this.q1, this.median, this.q3, this.high];
                        var value = '';
                        for (var i = serie.charts.length - 1; i >= 0; i--) {
                            value += ODS.StringUtils.escapeHTML(ChartHelper.getYLabel(datasetid, serie.charts[i])) + ' ' + _format(points[i]) + '<br>';
                        }
                        return format_string(template, {
                            name: ODS.StringUtils.escapeHTML(this.series.name),
                            color: this.series.color,
                            value: value,
                        });
                    };
                } else {
                    formatterFunction = function singleValueTooltip() {
                        var formattedValue = formatValue(this.y, decimals, serie.displayUnits ? unit : false);
                        if (this.series.userOptions.stacking == 'percent') {
                            formattedValue = formattedValue + ' (' + Highcharts.numberFormat(this.percentage, 1) + '%)';
                        }
                        return format_string(template, {
                            name: ODS.StringUtils.escapeHTML(this.series.name),
                            color: this.series.color,
                            value: formattedValue
                        });
                    };
                }
                return formatterFunction;
            }

            options.tooltip.pointFormatter = getTooltipFormatterFunction(serie.type);
            if (serie.refineOnClickCtrl) {
                options.point = {
                    events: {
                        'click': function(event) {
                            var value = this.category || this.name;
                            // if value is a timestamp then format it so that the API can understand it
                            var formats = {
                                'year': 'YYYY',
                                'month': 'YYYY/MM',
                                'day': 'YYYY/MM/DD',
                                'hour': 'YYYY/MM/DD HH',
                                'minute': 'YYYY/MM/DD HH:mm'
                            };
                            if (query.timescale && formats[query.timescale]) {
                                value = shouldUseUtc(parameters) ? moment.utc(value) : moment(value);
                                value = value.format(formats[query.timescale]);
                            }
                            // refine context
                            serie.refineOnClickCtrl.refineOnValue(value);
                            scope.$apply();
                        }
                    }
                };
                options.cursor = 'pointer';
            }

            options = angular.extend(options, ChartHelper.resolvePosition(serie.position));
            delete options.position;
            return options;
        };

        var buildDatePattern = ODS.DateFieldUtils.datePatternBuilder('highcharts');

        var getContextualizedSeriesOptions = function(x, timeSerieMode) {
            var tooltip = {};

            if (timeSerieMode) {
                // options.pointPadding = 0;
                // options.groupPadding = 0;
                // options.borderWidth = 0;
                tooltip.xDateFormat = buildDatePattern(x);
            }

            return tooltip;
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
                } else if ('day' in x || 'yearday' in x) {
                    options.minTickInterval = Date.UTC(2010, 1, 2) - Date.UTC(2010, 1, 1);
                } else if ('month' in x){
                    options.minTickInterval = Date.UTC(2010, 1, 1) - Date.UTC(2010, 0, 1);
                } else if ('year' in x){
                    options.minTickInterval = Date.UTC(2010, 0, 1) - Date.UTC(2009, 0, 1);
                }
            }
        };

        var buildYAxis = function(yLabel, chart, opposite, stacked, reverseStacks) {
            var hasMin = typeof chart.yRangeMin !== "undefined" && chart.yRangeMin !== '';
            var hasMax = typeof chart.yRangeMax !== "undefined" && chart.yRangeMax !== '';
            var yAxis = {
                title: {
                    text: yLabel && escapeHTMLForAxisLabels(yLabel) || "",
                    style: {
                        color: chart.color
                    }
                },
                labels: {
                    style: {
                        color: chart.color,
                        direction: 'initial'
                    }
                },
                type: chart.scale || 'linear',
                min: hasMin ? parseFloat(chart.yRangeMin) : null,
                max: hasMax ? parseFloat(chart.yRangeMax) : null,
                tickInterval: chart.yStep ? parseFloat(chart.yStep) : null,
                startOnTick: hasMin ? false : true,
                endOnTick: hasMax ? false : true,
                opposite: opposite
            };
            if (!chart.scientificDisplay) {
                yAxis.labels.formatter = function() {
                    if (angular.isNumber(this.value)) {
                        return Highcharts.numberFormat(this.value, -1);
                    } else {
                        return this.value;
                    }
                };
            }

            if (chart.type === 'spiderweb') {
                yAxis.gridLineInterpolation = 'polygon';
                yAxis.lineWidth = 0;
                delete(yAxis.startOnTick);
                delete(yAxis.endOnTick);
                delete(yAxis.title);
                delete(yAxis.labels);
            } else if (chart.type === 'polar') {
                yAxis.endOnTick = false;
                yAxis.showLastLabel = true;
                delete(yAxis.title);
                delete(yAxis.labels);
            }

            if (stacked) {
                yAxis.stackLabels = {
                    enabled: true,
                    style: {
                        fontWeight: 'bold'
                    }
                };

            }
            // we want to reverse the highcharts order (which default to true)
            yAxis.reversedStacks = !reverseStacks;

            return yAxis;
        };

        var getDateFromXObject = ODS.DateFieldUtils.getDateFromXObject;

        function getXValue(dateFormatFunction, datePattern, x, minDate, xAxisType, alignMonth) {
            var date = getDateFromXObject(x, minDate, alignMonth),
                xValue;

            if (date && xAxisType === "datetime") {
                xValue = date.getTime();
            } else if (date) {
                xValue = dateFormatFunction(datePattern, date);
            } else if (typeof x === "undefined") {
                xValue = undefined;
            } else if (angular.isObject(x) && x.week) {
                xValue = translate("Week") + " " + x.week;
            } else if (xAxisType === "linear") {
                xValue = x;
            } else {
                xValue = "" + x;
            }
            return xValue;
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
        }

        return {
            restrict: 'A',
            replace: true,
            require: ["odsHighchartsChart"],
            scope: {
                parameters: '=parameters',
                domain: '=',
                apikey: '=',
                colors: '=',
                contexts: '=?'
            },

            template: '' +
            '<div class="ods-chart">' +
            '    <div class="ods-chart__loading" ng-show="loading">' +
            '        <ods-spinner></ods-spinner>' +
            '    </div>' +
            '    <div class="chartplaceholder"></div>' +
            '    <debug data="chartoptions"></debug>' +
            '    <ul ng-if="tzsForcedLength > 0" class="chart-timezone-caption">' +
            '       <li ng-repeat="(datasetId, tz) in tzsForced">' +
            '           <i class="fa fa-info" aria-hidden="true">{{t}}</i>' +
            '           <span translate ng-if="hasDatasetWithoutTz || tzsForcedLength > 1">' +
            '               All dates and times for dataset {{datasetId}} are in {{tz}} time.' +
            '           </span>' +
            '           <span translate ng-if="!hasDatasetWithoutTz && tzsForcedLength === 1">' +
            '               All dates and times are in {{tz}} time.' +
            '           </span>' +
            '       </li>' +
            '    </ul>' +
            '</div>',
            controller: ['$scope', '$element', '$attrs', function($scope) {
                var timeSerieMode, precision, periodic, yAxisesIndexes, domain,
                    that = this;

                $scope.$watch('contexts', function(nv,ov) {
                    if (nv && nv.length > 0) {
                        var i;
                        for (i = 0; i < nv.length; i++) {
                            $scope[nv[i].name] = nv[i];
                        }
                    }
                }, true);

                this.highchartsLoaded = function(Highcharts, element) {
                    var chartplaceholder = element.find('.chartplaceholder');

                    function formatRowX(value){
                        if (periodic) {
                            console.warn('formatRowX on periodic value should not be used anymore');
                            switch(periodic){
                                // FIXME should compute a proper date
                                case 'month':
                                    return [
                                    translate_time('Jan'),
                                    translate_time('Feb'),
                                    translate_time('Mar'),
                                    translate_time('Apr'),
                                    translate_time('May'),
                                    translate_time('Jun'),
                                    translate_time('Jul'),
                                    translate_time('Aug'),
                                    translate_time('Sep'),
                                    translate_time('Oct'),
                                    translate_time('Nov'),
                                    translate_time('Dec')][value.month - 1];
                                case 'weekday':
                                    return [
                                    translate_time('Monday'),
                                    translate_time('Tuesday'),
                                    translate_time('Wednesday'),
                                    translate_time('Thursday'),
                                    translate_time('Friday'),
                                    translate_time('Saturday'),
                                    translate_time('Sunday')][value.weekday];
                                case 'day':
                                    return value.day;
                                default:
                                    return "" + value;
                            }
                        } else {
                            if (angular.isObject(value) && ("day" in value || "month" in value || "year" in value)) {
                                var date = new Date(Date.UTC(value.year, value.month-1 || 0, value.day || 1, value.hour || 0, value.minute || 0));
                                return Highcharts.dateFormat("%Y-%m-%d", date);
                            }
                            return "" + value;
                        }
                    }

                    var last_parameters_hash;
                    var request_canceller = $q.defer();
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
                        timeSerieMode = timeserie.timeSerieMode;
                        precision = timeserie.precision;
                        periodic = timeserie.periodic;

                        var options = getGlobalOptions(parameters, precision, periodic, chartplaceholder, domain);
                        $scope.chartoptions = options;
                        $scope.tzsForced = {};
                        $scope.hasDatasetWithoutTz = false;
                        angular.forEach(parameters.queries, function(query) {
                            var datasetid = ChartHelper.getDatasetId({dataset: {datasetid: query.config.dataset}, domain: query.config.domain});
                            if (angular.isUndefined(yAxisesIndexes[datasetid])) {
                                yAxisesIndexes[datasetid] = {};
                            }

                            // Map queries with contexts for to get timezone from metas
                            // We dont have the context name, only the dataset id, but it should be safe
                            // since timezone is not context dependent
                            if ($scope.contexts) {
                                var ctxsWithTz = $scope.contexts.filter(function (ctx) {
                                    return ctx.dataset.datasetid === query.config.dataset && ctx.dataset.metas && ctx.dataset.metas.timezone
                                });
                                if (ctxsWithTz.length > 0) {
                                    if (!query.config.options) {
                                        query.config.options = {};
                                    }
                                    query.config.options.timezone = ctxsWithTz[0].dataset.metas.timezone;
                                    if (!$scope.tzsForced[query.config.dataset]) {
                                        $scope.tzsForced[query.config.dataset] = query.config.options.timezone
                                    }
                                } else {
                                    $scope.hasDatasetWithoutTz = true;
                                }
                            }

                            angular.forEach(query.charts, function(chart) {
                                var yLabel = ChartHelper.getYLabel(datasetid, chart);
                                if (!parameters.singleAxis && angular.isUndefined(yAxisesIndexes[datasetid][yLabel])) {
                                    // we dont yet have an axis for this column :
                                    // Create axis and register it in yAxisesIndexes
                                    var yAxis = buildYAxis(yLabel, chart, Boolean(options.yAxis.length % 2), Boolean(chart.displayStackValues), query.reverseStacks);
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
                                    chart.thresholds.sort(function(a, b) {
                                        return a.value - b.value;
                                    });
                                }
                            });

                        });
                        $scope.tzsForcedLength = Object.keys($scope.tzsForced).length;


                        function pushValues(serie, categoryIndex, scale, valueX, valueY, colorForCategory, thresholds) {
                            var i, j, nullify = false, data = {};
                            if (options.xAxis.type === 'datetime' || options.xAxis.type === 'linear') {
                                if (typeof valueY === 'object') {
                                    data = [valueX];
                                    if (scale === 'logarithmic') {
                                        for (j = 0; j < valueY.length; j++) {
                                            if (valueY[j] <= 0) {
                                                nullify = true;
                                            }
                                        }
                                    }
                                    if (nullify) {
                                        for (j = 0; j < valueY.length; j++) {
                                            data.push(null);
                                        }
                                    } else {
                                        for (j = 0; j < valueY.length; j++) {
                                            data.push(valueY[j]);
                                        }
                                    }
                                    serie.data.push(data);
                                } else if (['pie', 'funnel'].indexOf(serie.type) !== -1) {
                                    if (options.xAxis.type === 'datetime') {
                                        serie.data.push({
                                            name: Highcharts.dateFormat(serie.tooltip.xDateFormat, new Date(valueX)),
                                            y: valueY
                                        });
                                    } else {
                                        serie.data.push({
                                            name: "" + valueX,
                                            y: valueY
                                        });
                                        if (colorForCategory) {
                                            serie.data[serie.data.length - 1].color = colorForCategory;
                                        }
                                    }
                                } else if (serie.type == 'treemap') {
                                    if (options.xAxis.type === 'datetime') {
                                        serie.data.push({
                                            name: Highcharts.dateFormat(serie.tooltip.xDateFormat, new Date(valueX)),
                                            value: valueY
                                        });
                                    } else {
                                        serie.data.push({
                                            name: "" + valueX,
                                            y: valueY
                                        });
                                        if (colorForCategory) {
                                            serie.data[serie.data.length - 1].color = colorForCategory;
                                        }
                                    }
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
                                    if (colorForCategory) {
                                        serie.data[serie.data.length - 1] = {
                                            'x': serie.data[serie.data.length - 1][0],
                                            'y': serie.data[serie.data.length - 1][1],
                                            'color': colorForCategory
                                        };
                                    }
                                    if (thresholds.length > 0) {
                                        for (i = thresholds.length - 1; i >= 0; i--) {
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
                            } else { // categories
                                // push row data into proper serie data array
                                if(['pie', 'funnel'].indexOf(serie.type) !== -1) {
                                    serie.data[categoryIndex] = {
                                        name: formatRowX(valueX),
                                        y: valueY
                                    };
                                    if (colorForCategory) {
                                        serie.data[categoryIndex].color = colorForCategory;
                                    }
                                } else if (serie.type == 'treemap') {
                                    serie.data[categoryIndex] = {
                                        name: formatRowX(valueX),
                                        value: valueY
                                    };

                                    if (colorForCategory) {
                                        serie.data[categoryIndex].color = colorForCategory;
                                    }
                                } else {
                                    if (typeof valueY === 'object') {
                                        data = [];
                                        if (scale === 'logarithmic') {
                                            for (j = 0; j < valueY.length; j++) {
                                                if (valueY[j] <= 0) {
                                                    nullify = true;
                                                }
                                            }
                                        }
                                        if (nullify) {
                                            for (j = 0; j < valueY.length; j++) {
                                                data.push(null);
                                            }
                                        } else {
                                            for (j = 0; j < valueY.length; j++) {
                                                data.push(valueY[j]);
                                            }
                                        }
                                        serie.data[categoryIndex] = data;
                                    } else {
                                        if (scale === 'logarithmic' && valueY <= 0) {
                                            serie.data[categoryIndex] = null;
                                        } else {
                                            serie.data[categoryIndex] = valueY;
                                        }
                                    }

                                    if (colorForCategory) {
                                        serie.data[categoryIndex] = {
                                            'y': serie.data[categoryIndex],
                                            'color': colorForCategory
                                        };
                                    }
                                    if (thresholds.length > 0) {
                                        for (i = thresholds.length - 1; i >= 0; i--) {
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

                        request_canceller.resolve("new request coming, cancelling current one");
                        request_canceller = $q.defer();
                        $scope.loading = true;
                        var requestPromise = requestData(parameters.queries, $scope.searchoptions, timeSerieMode, precision, periodic, $scope.domain, $scope.apikey, request_canceller);
                        requestPromise.promise.then(function(http_calls) {
                            $scope.loading = false;
                            var charts_by_calls = requestPromise.charts;
                            // If there is both periodic & datetime timescale, we need to find the min date to properly offset the periodic data
                            var minDate, i;
                            if (precision) {
                                for (var h = 0; h < http_calls.length; h++) {
                                    var http_call = http_calls[h];
                                    for (i = 0; i < http_call.data.length; i++) {
                                        var row = http_call.data[i];
                                        if(row.x.year && angular.isNumber(row.x.year)){
                                            var date = new Date(Date.UTC(row.x.year, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0));
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
                            for (i = 0; i < parameters.queries.length; i++) {
                                if (!parameters.queries[i].seriesBreakdown) {
                                    for (var j = 0; j < parameters.queries[i].charts.length; j++) {
                                        registered_series.push('serie' + (i + 1) + '-' + (j + 1));
                                        options.series.push(false);
                                    }
                                }
                            }
                            var colors = {};
                            var colorIndex = 0;
                            var handleSerie = function(serieHash, parameters, options, serie_options, query, serie, valueX, valueY, rawValueX) {
                                var serieIndex = registered_series.indexOf(serieHash);
                                var serieColorIndex = 0;
                                var categoryIndex;

                                if (rawValueX) {
                                    if ((rawValueX + serie.color) in colors) {
                                        serieColorIndex = colors[rawValueX + serie.color];
                                    } else {
                                        if (query.categoryColors && query.categoryColors[rawValueX]) {
                                            colors[rawValueX + serie.color] = query.categoryColors[rawValueX];
                                        } else {
                                            serieColorIndex = colorIndex;
                                            colors[rawValueX + serie.color] = serieColorIndex;
                                            colorIndex++;
                                        }
                                    }
                                } else {
                                    serieColorIndex = colorIndex;
                                    colorIndex++;
                                }
                                if (serieIndex === -1) {
                                    options.series.push(getSerieOptions(parameters, yAxisesIndexes, query, serie, rawValueX, query.config.domain || domain, $scope, serieColorIndex));
                                    serieIndex = registered_series.push(serieHash) - 1;
                                } else if (!options.series[serieIndex]) {
                                    options.series[serieIndex] = getSerieOptions(parameters, yAxisesIndexes, query, serie, rawValueX, query.config.domain || domain, $scope, serieColorIndex);
                                }

                                if (options.xAxis.type === "category" && (categoryIndex = options.xAxis.categories.indexOf(valueX)) === -1) {
                                    categoryIndex = options.xAxis.categories.length;
                                    options.xAxis.categories.push(valueX);
                                }

                                angular.extend(options.series[serieIndex].tooltip, serie_options);

                                var colorForCategory;
                                if (query.categoryColors) {
                                    colorForCategory = query.categoryColors[valueX];
                                }

                                if (!rawValueX && serie.type !== 'pie') {
                                    pushValues(options.series[serieIndex], categoryIndex, parameters.singleAxisScale || serie.scale, valueX, valueY, colorForCategory, serie.thresholds || []);
                                } else {
                                    pushValues(options.series[serieIndex], categoryIndex, parameters.singleAxisScale || serie.scale, valueX, valueY, colorForCategory, serie.thresholds || []);
                                }
                            };


                            angular.forEach(http_calls, function(http_call, index) {
                                var results, aggregations, i, j;
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
                                for (j = 0; j < nb_series; j++) {
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

                                for (i = 0; i < results.length; i++) {
                                    var row = results[i];
                                    angular.extend({}, query.defaultValues, row);
                                    var valueX = getXValue(Highcharts.dateFormat, serie_options.xDateFormat, multipleXs ? row.x[xAxis]: row.x, minDate, options.xAxis.type, parameters.alignMonth);
                                    j = 0;
                                    // iterate on all entries in the row...
                                    angular.forEach(row, function(rawValueY, keyY) {
                                        var i,
                                            valueY,
                                            serie_name,
                                            rangeserie = false,
                                            matches;
                                        // ...and avoid the x entry
                                        if (keyY !== "x") {
                                            matches = keyY.match(/-range-([0-9])$/);
                                            if (matches && matches.length === 2) {
                                                serie_name = keyY.replace(/-range-[0-9]$/, '');
                                                rangeserie = true;
                                                if (matches[1] !== "0") return;
                                            } else {
                                                serie_name = keyY;
                                            }

                                            var serie = charts[serie_name];
                                            if (rangeserie) {
                                                valueY = [];
                                                for (i = 0; i < serie.charts.length; i++) {
                                                    valueY.push(getValidYValue(row[serie_name + '-range-' + i], serie.charts[i]));
                                                }
                                            } else if (serie.charts) {
                                                valueY = [];
                                                for (i = 0; i < serie.charts.length; i++) {
                                                    valueY.push(getValidYValue(rawValueY, serie.charts[i]));
                                                }
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
                                                        rawValueX = getXValue(Highcharts.dateFormat, buildDatePattern(rawValueX), rawValueX, minDate, false, parameters.alignMonth);

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
                                    });
                                }

                                if (accumulate_x) {
                                    accumulations_x.sort(function(a, b) {
                                        return a - b;
                                    });
                                    // remove duplicates in accumulations_x
                                    for (i = accumulations_x.length - 1; i > 0; i--) {
                                        if (accumulations_x[i] == accumulations_x[i - 1]) {
                                            accumulations_x.splice(i, 1);
                                        }
                                    }
                                }

                                for (i = 0; i < query.charts.length; i++) {
                                    if (query.charts[i].aggregates) {
                                        var serie = query.charts[i];
                                        var valueY = compileAggrValue($scope, serie.compiled_expr, accumulations_y, serie.aggregates);
                                        for (j = 0; j < accumulations_x.length; j++) {
                                            handleSerie("aggr" + index + "-" + i, parameters, options, serie_options, query, serie, accumulations_x[j], valueY);
                                        }
                                    }
                                }
                            });

                            for (i = options.series.length - 1; i >= 0; i--) {
                                if (options.series[i] === false) {
                                    options.series.splice(i, 1);
                                }
                            }

                            var categories = options.xAxis.categories;

                            if (categories) {
                                for (i = 0; i < options.series.length; i++) {
                                    for (var k = 0; k < categories.length; k++) {
                                        if (options.series[i].data  && typeof options.series[i].data[k] === "undefined") {
                                            options.series[i].data[k] = null;
                                        }
                                    }
                                }

                                if (categories.length === 1) {
                                    for (i = 0; i < options.series.length; i++) {
                                        if (["line", "spline", "area", "arearange"].indexOf(options.series[i].type) !== -1) {
                                            options.series[i].marker = options.series[i].marker || {};
                                            options.series[i].marker.enabled = true;
                                        }
                                    }
                                }
                            } else {
                                for (i = 0; i < options.series.length; i++) {
                                    if (["line", "spline", "area", "arearange"].indexOf(options.series[i].type) !== -1 &&
                                        options.series[i].data.length === 1) {
                                        options.series[i].marker = options.series[i].marker || {};
                                        options.series[i].marker.enabled = true;
                                    }
                                }
                            }

                            // Check if UTC should be used

                            options.time = options.time || {};
                            options.time.useUTC = shouldUseUtc(parameters);

                                // render the charts
                            if ($scope.chart && options.chart.renderTo) {
                                $scope.chart.destroy();
                                chartplaceholder = $element.find('.chartplaceholder');
                            }
                            options.chart.renderTo = chartplaceholder[0];
                            if (shouldOutputUTC(parameters.queries, timeSerieMode) && $scope.tzsForcedLength === 1) {
                                options.time = options.time || {};
                                options.time.useUTC = true;
                                options.time.timezone = $scope.tzsForced[Object.keys($scope.tzsForced)[0]];
                            }
                            try {
                                if (options.series.length > 500) {
                                    odsNotificationService.sendNotification(translate("There are too many series to be displayed correctly, try to refine your query a bit."));
                                    options.series = options.series.slice(0, 10);
                                }
                                $scope.chart = new Highcharts.Chart(options, function() {});
                            } catch (errorMsg) {
                                if(errorMsg.indexOf && errorMsg.indexOf('Highcharts error #19') === 0){
                                    // too many ticks
                                    odsNotificationService.sendNotification(translate("There was too many points to display, the maximum number of points has been decreased."));
                                    angular.forEach($scope.parameters.queries, function(query){
                                        query.maxpoints = 20;
                                    });
                                } else {
                                    if (angular.isString(errorMsg)) {
                                        odsNotificationService.sendNotification(errorMsg);
                                    } else {
                                        odsNotificationService.sendNotification(errorMsg.message);
                                    }
                                }
                            }
                        }, function(reason) {
                            $scope.loading = false;
                        });
                    };
                };
            }],
            link: function(scope, element, attrs, ctrls) {
                var chartController = ctrls[0];
                ModuleLazyLoader('highcharts').then(function() {
                    // https://api.highcharts.com/class-reference/Highcharts#.dateFormats
                    Highcharts.dateFormats = Highcharts.extend(Highcharts.dateFormats, {
                        'j': function(timestamp) {
                            return moment.utc(timestamp).dayOfYear();
                        }
                    });
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
         *          <ods-dataset-context context="hurricanes" hurricanes-domain="public.opendatasoft.com" hurricanes-dataset="hurricane-tracks-1851-2007">
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
            template: '<div class="odswidget odswidget-highcharts"><div ods-highcharts-chart parameters="chart" domain="context.domain" contexts="[context]" apikey="context.apikey"></div></div>',
            controller: ['$scope', 'ODSWidgetsConfig', 'ChartHelper', function($scope, ODSWidgetsConfig, ChartHelper) {

                var colors = ODSWidgetsConfig.chartColors || defaultColors;
                if ($scope.color) {
                    colors = ODS.ArrayUtils.fromCSVString($scope.color);
                }

                var unwatch = $scope.$watch('context.dataset', function(nv) {
                    if (nv) {
                        if ($scope.context.type !== 'dataset') {
                            console.error('ods-highcharts requires a Dataset Context');
                        }

                        ChartHelper.init($scope.context);
                        if (angular.isUndefined($scope.chartConfig)) {
                            var extras = {};
                            if (ChartHelper.isMultiColorChart($scope.chartType)) {
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
                                $scope.chart = angular.copy($scope.chartConfig);
                            }
                        }
                        $scope.$broadcast('chartConfigReady', $scope.chart); //FIXME: broadcasts still used?

                        $scope.$watch('chart', function(nv) {
                            var i, j;
                            if (nv) {
                                var uniqueid = ChartHelper.getDatasetId($scope.context);

                                for (i = 0; i < nv.queries.length; i++) {
                                    var query = nv.queries[i];
                                    if (typeof query.xAxis === "undefined") {
                                        ChartHelper.setDefaultQueryValues(uniqueid, query, true);
                                    }

                                    for (j = 0; j < query.charts.length; j++) {
                                        ChartHelper.setSerieDefaultValues(uniqueid, query.charts[j], query.xAxis, true);
                                    }

                                    ChartHelper.setDefaultQueryValues(uniqueid, query, true);

                                    if ($scope.chart.queries.length === 1) {
                                        ChartHelper.setChartDefaultValues(uniqueid, nv, true);
                                    }

                                    for (j = 0; j < query.charts.length; j++) {
                                        ChartHelper.setSerieDefaultColors(query.charts[j], query.seriesBreakdown);
                                    }
                                }

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
         * @name ods-widgets.directive:odsMultiHighcharts
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of Opendatasoft.
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
                    var i;
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
                    for (i = 0; i < chartConfig.queries.length; i++) {
                        var datasetid = chartConfig.queries[i].config.dataset;
                        if (datasets.indexOf(datasetid) === -1) {
                            datasets.push(datasetid);
                        }
                    }
                    var requests = [];
                    var success = function(response) {
                        var data = response.data;
                        var dataset = new ODS.Dataset(data);
                        // dataset.metas.domain = $scope.context.domain;
                        $scope.context.dataset = dataset;
                        ChartHelper.init($scope.context);
                    };
                    for (i = 0; i < datasets.length; i++) {
                        requests.push(ODSAPI.datasets.get($scope.context, datasets[i], {extrametas: true}).
                            then(success));
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
         * @param {string} [timescale=none] Works only with timeseries. If defines the default timescale to use to display the X Axis. It does not affect the way the different series are requested (they have there own timescale) but enforces X axis intervals.
         * @param {string} [labelX=none] If set, it override the default X Axis label. The default label is generated from series.
         * @param {boolean} [singleYAxis=false] Enforces the use of only one Y axis for all series. In this case, specific Y axis parameters defined for each series will be ignored.
         * @param {string} singleYAxisLabel Set the label for the single Y axis.
         * @param {integer} [min=null] Set the min displayed value for Y axis. Active only when singleYAxis is true.
         * @param {integer} [max=null] Set the max displayed value for Y axis. Active only when singleYAxis is true.
         * @param {integer} [step=null] specify the step between each tick on the Y axis. If not defined, it is computed automatically. Active only when singleYAxis is true.
         * @param {boolean} [scientificDisplay=true] When set to false, force the full display of the numbers on the Y axis. Active only when singleYAxis is true.
         * @param {boolean} [logarithmic=false] Use a logarithmic scale for Y axis. Active only when singleYAxis is true.
         * @param {boolean} [displayLegend=true] enable or disable the display of series legend. Active only when singleYAxis is true.
         * @param {boolean} [alignMonth=true] Align the month values with the month label. The old behaviour was to align values with the middle of the month, setting this parameter to false reverts to the old behaviour.
         * @param {integer} [labelsXLength=12] Set the maximum number of characters displayed for the X axis labels.
         *
         * @description
         * This widget is the base widget allowing to display charts from Opendatasoft datasets.
         * A Chart is defined by one or more series that get there data from form one or more dataset represented by an {@link ods-widgets.directive:odsDatasetContext Dataset Context},
         * a type of chart and multiple parameters to fine tune the appearance of chart.
         *
         * Basic example:
         *    <pre>
         *        <ods-dataset-context context="trees"
         *                             trees-dataset="les-arbres-remarquables-de-paris"
         *                             trees-domain="https://widgets-examples.opendatasoft.com/">
         *            <ods-chart>
         *                <ods-chart-query context="trees" field-x="espece" maxpoints="10">
         *                    <ods-chart-serie expression-y="circonference" chart-type="column" function-y="MAX" color="#66c2a5">
         *                    </ods-chart-serie>
         *                </ods-chart-query>
         *            </ods-chart>
         *        </ods-dataset-context>
         *    </pre>
         *
         * You can display multiple series from the same dataset on the same chart:
         *    <pre>
         *        <ods-dataset-context context="trees"
         *                             trees-dataset="les-arbres-remarquables-de-paris"
         *                             trees-domain="https://widgets-examples.opendatasoft.com/">
         *            <ods-chart>
         *                <ods-chart-query context="trees" field-x="espece" maxpoints="10">
         *                    <ods-chart-serie expression-y="circonference" chart-type="column" function-y="AVG" color="#66c2a5">
         *                    </ods-chart-serie>
         *                    <ods-chart-serie expression-y="hauteur" chart-type="column" function-y="AVG" color="#fc8d62">
         *                    </ods-chart-serie>
         *                </ods-chart-query>
         *            </ods-chart>
         *        </ods-dataset-context>
         *    </pre>
         *
         * You can display multiple series from multiple datasets on the same chart:
         *    <pre>
         *        <ods-dataset-context context="commute,demographics"
         *                             commute-dataset="commute-time-us-counties"
         *                             commute-domain="https://widgets-examples.opendatasoft.com/">
         *                             demographics-dataset="us-cities-demographics"
         *                             demographics-domain="https://widgets-examples.opendatasoft.com/">
         *            <ods-chart align-month="true">
         *                <ods-chart-query context="commute" field-x="state" maxpoints="20">
         *                    <ods-chart-serie expression-y="mean_commuting_time" chart-type="column" function-y="AVG" color="#66c2a5" scientific-display="true">
         *                    </ods-chart-serie>
         *                </ods-chart-query>
         *                <ods-chart-query context="demographics" field-x="state" maxpoints="20">
         *                    <ods-chart-serie expression-y="count" chart-type="column" function-y="SUM" color="#fc8d62" scientific-display="true">
         *                    </ods-chart-serie>
         *                </ods-chart-query>
         *            </ods-chart>
         *        </ods-dataset-context>
         *    </pre>
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
                step: '@',
                scientificDisplay: '@',
                logarithmic: '@',
                displayLegend: '@',
                labelsXLength: '@',
                alignMonth: '@',

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
                '<div ods-highcharts-chart parameters="chart" domain="context.domain" apikey="context.apikey" contexts="contexts"></div>' +
                '<div ng-transclude></div>' +
            '</div>',
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                $scope.contexts = [];
                this.pushContext = function(context) {
                    $scope.contexts.push(context);
                };
                if (!$scope.chart) {
                    $scope.chart = {
                        queries: [],
                        xLabel: angular.isDefined($scope.labelX) ? $scope.labelX : undefined,
                        timescale: $scope.timescale || "",
                        singleAxis: !!$scope.singleYAxis,
                        singleAxisLabel: angular.isDefined($scope.singleYAxisLabel) ? $scope.singleYAxisLabel : undefined,
                        singleAxisScale: $scope.logarithmic ? 'logarithmic' : '',
                        yRangeMin: angular.isDefined($scope.min) && $scope.min !== "" ? parseFloat($scope.min) : undefined,
                        yRangeMax: angular.isDefined($scope.max) && $scope.max !== "" ? parseFloat($scope.max) : undefined,
                        yStep: angular.isDefined($scope.step) && $scope.step !== "" ? parseFloat($scope.step) : undefined,
                        scientificDisplay: angular.isDefined($scope.scientificDisplay) && $scope.scientificDisplay !== "" ? $scope.scientificDisplay === "true" : true,
                        displayLegend: angular.isDefined($scope.displayLegend) && $scope.displayLegend === "false" ? false : true,
                        labelsXLength: angular.isDefined($scope.labelsXLength) && $scope.labelsXLength !== "" ? parseInt($scope.labelsXLength) : undefined,
                        alignMonth: angular.isDefined($scope.alignMonth) && $scope.alignMonth === "false" ? false : true,
                    };
                }

                angular.forEach($scope.chart, function(item, key) {
                    if (typeof item === "undefined") {
                        delete $scope.chart[key];
                    }
                });

                if ($attrs.context) {
                    // backward compatibility
                    (function() {
                        var colors = ODSWidgetsConfig.chartColors || defaultColors;
                        if ($scope.color) {
                            colors = ODS.ArrayUtils.fromCSVString($scope.color);
                        }

                        var unwatch = $scope.$watch('context.dataset', function(nv) {
                            if (nv) {
                                if ($scope.context.type !== 'dataset') {
                                    console.error('ods-chart requires a Dataset Context');
                                }

                                ChartHelper.init($scope.context);
                                if (angular.isUndefined($scope.chartConfig)) {
                                    var extras = {};
                                    if (ChartHelper.isMultiColorChart($scope.chartType)) {
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
                    };
                } else {
                    this.setQuery = function(query, context) {
                        var index = $scope.chart.queries.indexOf(query);
                        var groups, j;
                        if (index === -1) {
                            index = $scope.chart.queries.length;
                            $scope.chart.queries.push(query);
                        } else {
                            $scope.chart.queries[index] = query;
                        }

                        if (query.sort) {
                            groups = query.sort.match(/^(-?)serie([0-9]+)$/);
                            if (groups) {
                                $scope.chart.queries[index].sort = groups[1] + 'serie' + (index + 1) + '-' + groups[2];
                            }
                        }
                        // copy the used context to the current $scope
                        var contextInArray = false;
                        for (var contextIndex = 0; contextIndex < $scope.contexts.length; contextIndex++) {
                            if ($scope.contexts[contextIndex].name === context.name) {
                                contextInArray = true;
                            }
                        }
                        if (!contextInArray) {
                            $scope.contexts.push(context);
                        }
                        // make sure everything is correctly set before displying it:
                        var uniqueid = ChartHelper.getDatasetId(context);

                        if (typeof query.xAxis === "undefined") {
                            ChartHelper.setDefaultQueryValues(uniqueid, query, true);
                        }

                        for (j = 0; j < query.charts.length; j++) {
                            ChartHelper.setSerieDefaultValues(uniqueid, query.charts[j], query.xAxis, true);
                        }

                        ChartHelper.setDefaultQueryValues(uniqueid, query, true);

                        if ($scope.chart.queries.length === 1) {
                            ChartHelper.setChartDefaultValues(uniqueid, $scope.chart, true);
                        }

                        for (j = 0; j < query.charts.length; j++) {
                            ChartHelper.setSerieDefaultColors(query.charts[j], query.seriesBreakdown);
                        }
                    };

                    $scope.$watch('labelX', function(nv, ov) {
                        $scope.chart.xLabel = nv;
                    });
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
         * @param {string} fieldX Set the field that is used to compute the aggregations during the analysis query.
         * @param {string} [timescale="year"] Works only with timeseries (when fieldX is a date or datetime). Y values will be computed against this interval. For example, if you have daily values in a dataset and ask for a "month" timescale, the Y values for the {@link ods-widgets.directive:odsChartSerie series} inside this query will aggregated month by month and computed.
         * @param {integer} [maxpoints=50] Defines the maximum number of points fetched by the query. With a value of 0, all points will be fetched by the query.
         * @param {string} [stacked=null] Stack the resulting charts. Stacked values can 'normal' or 'percent'. Only works with columns, bar, line, spline, area and spline area charts.
         * @param {boolean} [reverseStacks=false] Reverse the order of the displayed stack. Only works with stacked charts when the singleYAxis option is not active on the chart.
         * @param {string} [seriesBreakdown=none] When declared, all series are break down by the defined facet
         * @param {string} [seriesBreakdownTimescale=true] if the break down facet is a time serie (date or datetime), it defines the aggregation level for this facet
         * @param {object} [categoryColors={}] A object containing a color for each category name. For example: {'my value': '#FF0000', 'my other value': '#0000FF'}
         *
         * @description
         * odsChartQuery is the sub widget that defines the queries for the series defined inside.
         * see {@link ods-widgets.directive:odsChart odsChart} for complete examples.
         *
         * Note: All parameters are dynamic, which means that if they change, the chart will be refreshed accordingly.
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
                        };

                        function updateQueryFromAttrs() {
                            angular.extend(query, {
                                xAxis: attrs.fieldX,
                                maxpoints: attrs.maxpoints ? parseInt(attrs.maxpoints, 10) : undefined,
                                timescale: attrs.timescale,
                                stacked: attrs.stacked,
                                reverseStacks: attrs.reverseStacks === 'true',
                                seriesBreakdown: attrs.seriesBreakdown,
                                seriesBreakdownTimescale: attrs.seriesBreakdownTimescale,
                                categoryColors: attrs.categoryColors ? scope.$eval(attrs.categoryColors) : undefined
                            });

                            query.sort = '';
                            if (attrs.sort === 'y') {
                                query.sort = 'serie1';
                            } else if (attrs.sort === '-y') {
                                query.sort = '-serie1';
                            } else {
                                query.sort = attrs.sort;
                            }
                        }

                        updateQueryFromAttrs();

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
                        };

                        var pushQuery = function(context) {
                            if (context) {
                                odsChartController.setQuery(query, context);
                            }
                        };

                        thisController.pushContext = function(context) {
                            odsChartController.pushContext(context);
                        };

                        var context = attrs.context.trim();
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
                            };

                            pushQuery(scope[context]);

                            scope.$watch(context + ".parameters", function(nv, ov) {
                                if (nv) {
                                    query.config.options = angular.extend({}, nv, forcedOptions);
                                    pushQuery(scope[context]);
                                }
                            }, true);

                            // Update the chart if an attribute changes
                            scope.$watch(
                                function() {
                                    return attrs;
                                },
                                function(nv, ov) {
                                    if (nv !== ov) {
                                        updateQueryFromAttrs();
                                        pushQuery(scope[context]);
                                    }
                            }, true);
                        });
                    }
                };
            }
        };
    }]);

    mod.directive('odsChartSerie', ["ODSAPI", 'ChartHelper', '$compile', '$parse', function(ODSAPI, ChartHelper, $compile, $parse) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsChartSerie
         * @restrict E
         * @scope
         * @param {string} [chartType] available types are: 'line', 'spline', 'arearange', 'areasplinerange', 'columnrange', 'area', 'areaspline', 'column', 'bar', 'pie', 'scatter'
         * @param {string} [functionY] set up the function that will be used to calculate aggreation value. 'COUNT' counts the number of documents for each category defined by expressionY.
         * @param {string} [expressionY] set up the facet used for aggregation
         * @param {string} [color] defines the color used for this serie. see colors below
         * @param {string} [labelY] specify a custom label for the serie
         * @param {string} [labelsposition='outside'] specify the position of labels. value can 'inside' or 'outside' (for pie charts only)
         * @param {number} [innersize=0] this parameter can be used to change a pie chart into a donut by creating a hole in the center. The value is expressed in pixels.
         * @param {boolean} [cumulative] Y values are accumulated
         * @param {boolean} [logarithmic=false] display the serie using a logarithmic scale
         * @param {integer} [min=null] minimum value to be displayed on the Y axis. If not defined, it is computed automatically.
         * @param {integer} [max=null] maximum value to be displayed on the Y axis. If not defined, it is computed automatically.
         * @param {integer} [step=null] specify the step between each tick on the Y axis. If not defined, it is computed automatically.
         * @param {integer} [index=null] force the display order of the serie. The higher is on top, the lower is below (starts from 1)
         * @param {boolean} [scientificDisplay=true] When set to false, force the full display of the numbers on the Y axis.
         * @param {boolean} [displayUnits] enable the display of the units defined for the field in the tooltip
         * @param {boolean} [displayValues] enable the display of each invidual values in stacks
         * @param {boolean} [displayStackValues] enable the display of the cumulated values on top of stacks
         * @param {number} [multiplier] multiply all values for this serie by the defined number
         * @param {string} [colorThresholds] an array of (value, color) objects. For each threshold value, if the Y value is above the threshold, the defined color is used. The format for this parameter is color-thresholds="[{'value': 5, 'color': '#00ff00'},{'value': 10, 'color': '#ffff00'}]"
         * @param {string} [subsets] used when functionY is set to 'QUANTILES' to define the wanted quantile
         * @param {boolean} [subseries] an array of subserie. They are used for range, columnrange and boxplot charts. Each item of the array contains an object like: {"func": "AVG", "yAxis": "myfield"}
         * @param {string} [refineOnClickContext] context name or array of of contexts name on which to refine when the serie is clicked on. Won't work properly if the fieldX attribute of the parent odsChartQuery is a date or datetime field and if the associated timescale is not one of 'year', 'month', 'day', 'hour', 'minute'
         * @param {string} [refineOnClick[context]ContextField] name of the field that will be refined for each context.
         *
         * @description
         * odsChartSerie is the sub widget that defines a serie in the chart with all its parameters.
         * see {@link ods-widgets.directive:odsChart odsChart} for complete examples.
         * # Available chart types:
         * There are two available types of charts: simple series and areas that takes a minimal and a maximal value.
         * ## simple series
         * - line
         * - spline
         * - area
         * - areaspline
         * - column
         * - bar
         * - pie
         * - scatter
         * - polar
         * - spiderweb
         * - funnel
         * ## areas
         * - arearange
         * - areasplinerange
         * - columnrange
         * # available functions
         * - COUNT
         * - AVG
         * - MIN
         * - MAX
         * - STDDEV
         * - SUM
         * - QUANTILES
         * - CONSTANT
         */
        return {
            restrict: 'E',
            require: ["^odsChartQuery", "?refineOnClick", "?refineOnClickContext"],
            controller: ['$scope', '$transclude', function($scope, $transclude) {
            }],
            link: function(scope, element, attrs, ctrls) {
                var odsChartQueryController = ctrls[0],
                    refineOnClickCtrl = ctrls[1] || ctrls[2];

                var chart = {
                    type: attrs.chartType || undefined,
                    innersize: attrs.innersize || undefined,
                    labelsposition: attrs.labelsposition || undefined,
                    func: attrs.functionY || undefined,
                    yAxis: attrs.expressionY || undefined,
                    color: attrs.color || undefined,
                    index: parseInt(attrs.index) || undefined,
                    cumulative: !!attrs.cumulative || false,
                    yLabelOverride: angular.isDefined(attrs.labelY) ? attrs.labelY : undefined,
                    scale: attrs.logarithmic ? 'logarithmic' : '',
                    yRangeMin: angular.isDefined(attrs.min) && attrs.min !== "" ? parseFloat(attrs.min) : undefined,
                    yRangeMax: angular.isDefined(attrs.max) && attrs.max !== "" ? parseFloat(attrs.max) : undefined,
                    yStep: angular.isDefined(attrs.step) && attrs.step !== "" ? parseFloat(attrs.step) : undefined,
                    displayUnits: attrs.displayUnits === "true",
                    displayValues: attrs.displayValues === "true",
                    displayStackValues: attrs.displayStackValues === "true",
                    multiplier: angular.isDefined(attrs.multiplier) ? parseFloat(attrs.multiplier) : undefined,
                    thresholds: attrs.colorThresholds ? scope.$eval(attrs.colorThresholds) : [],
                    subsets: attrs.subsets,
                    charts: attrs.subseries ? JSON.parse(attrs.subseries) : undefined,
                    refineOnClickCtrl: refineOnClickCtrl,
                    scientificDisplay: attrs.scientificDisplay === "true"
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
