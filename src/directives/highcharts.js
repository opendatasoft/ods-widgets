(function() {
    'use strict';

    var mod = angular.module('ods-widgets');


    mod.factory("requestData", ['ODSAPI', '$q', 'ChartHelper', 'AggregationHelper', function(ODSAPI, $q, ChartHelper, AggregationHelper) {
        var buildSearchOptions = function(query, timeSerieMode, precision, periodic) {
            var search_options = {
                dataset: query.config.dataset,
                x: query.xAxis,
                sort: query.sort || '',
                maxpoints: query.maxpoints || ''
            };

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
        var addSeriesToSearchOptions = function(search_options, chart, index) {
            if(!ChartHelper.isChartSortable(chart.type)) {
                $.each(chart.charts[0], function(key, value){
                    search_options['y.serie' + (index+1) + 'min.'+key] = value;
                });
                if(chart.charts[0].func === 'QUANTILES'){
                    if (!chart.charts[0].subsets){
                        chart.charts[0].subsets = 50;
                    }
                    search_options['y.serie' + (index+1) + 'min.subsets'] = chart.charts[0].subsets;
                }
                $.each(chart.charts[1], function(key, value){
                    search_options['y.serie' + (index+1) + 'max.'+key] = value;
                });
                if(chart.charts[1].func === 'QUANTILES'){
                    if (!chart.charts[1].subsets){
                        chart.charts[1].subsets = 50;
                    }
                    search_options['y.serie' + (index+1) + 'max.subsets'] = chart.charts[1].subsets;
                }

                if(search_options.sort ===  'serie' + (index+1)) {
                    // cannot sort on range
                    search_options.sort = '';
                }
            } else {
                search_options['y.serie' + (index+1) + '.expr'] = chart.yAxis;
                search_options['y.serie' + (index+1) + '.func'] = chart.func;
                search_options['y.serie' + (index+1) + '.cumulative'] = chart.cumulative || false;
                if(chart.func === 'QUANTILES'){
                    if (!chart.subsets){
                        chart.subsets = 50;
                    }
                    search_options['y.serie' + (index+1) + '.subsets'] = chart.subsets;
                }
            }
            return search_options;
        };

        return function(queries, timeSerieMode, precision, periodic, domain, apikey, callback) {
            var search_promises = [];
            angular.forEach(queries, function(query){
                var search_options = buildSearchOptions(query, timeSerieMode, precision, periodic);

                angular.forEach(query.charts, function(chart, index){
                    
                    addSeriesToSearchOptions(search_options, chart, index);

                });

                // Analyse request
                // We have to build virtual contexts from parameters because we can source charts from multiple
                // datasets.
                var virtualContext = {
                    domain: domain,
                    domainUrl: ODSAPI.getDomainURL(domain),
                    dataset: {'datasetid': search_options.dataset},
                    apikey: apikey,
                    parameters: {}
                };

                search_promises.push(ODSAPI.records.analyze(virtualContext, angular.extend({}, query.config.options, search_options)));
            });
            $q.all(search_promises).then(callback);
        }
    }]);

    mod.directive("odsChart", ['requestData', 'translate', 'ModuleLazyLoader', 'AggregationHelper', 'ChartHelper', '$rootScope', 'odsErrorService', function(requestData, translate, ModuleLazyLoader, AggregationHelper, ChartHelper, $rootScope, odsErrorService) {
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
        return {
            restrict: 'A',
            // scope: true,
            replace: true,
            scope: {
                parameters: '=odsChart',
                domain: '=',
                apikey: '=',
                colors: '='
            },
            template: '<div class="ods-chart"><div class="chartplaceholder"></div><debug data="chartoptions"></debug></div>',
            link: function(scope, element, attrs) {
                var update = function() {};
                var chartplaceholder = element.find('.chartplaceholder');
                ModuleLazyLoader('highcharts').then(function() {
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

                    var timeSerieMode, precision, periodic, yAxisesIndexes;
                    var getDatasetUniqueId = function(dataset_id) {
                        var datasetid;
                        if (scope.domain) {
                            datasetid = scope.domain + "." + dataset_id;
                        } else {
                            datasetid = ChartHelper.getDatasetUniqueId(dataset_id);
                        }
                        return datasetid;
                    }

                    var getGlobalOptions = function(parameters) {
                        var height = chartplaceholder.height();
                        var width = chartplaceholder.width();
                        
                        if (parameters.queries.length === 0) {
                            parameters.xLabel = '';
                        } else {

                            var datasetid = getDatasetUniqueId(parameters.queries[0].config.dataset);
                            parameters.xLabel = ChartHelper.getXLabel(datasetid, parameters.queries[0].xAxis, parameters.timescale);
                        }

                        var options = {
                            chart: {
                            },
                            title: {text: ''},
                            credits: {enabled: false},
                            colors: [],
                            series: [],
                            xAxis: {
                                title: {
                                    text: (parameters.queries.length > 0) ? (parameters.xLabel || parameters.queries[0].xAxis) :  "" // all charts must use the same xAxis
                                },
                                labels: {
                                    step: 1,
                                    rotation: -45,
                                    align: 'right'
                                },
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
                            // legend: {
                            //     // align: 'right',
                            //     // verticalAlign: 'bottom',
                            //     // layout: 'horizontal',
                            //     // x: -10,
                            //     y: 0,
                            //     // floating: false,
                            //     borderWidth: 0,
                            //     // width: width/5
                            // },
                            yAxis: [],
                            plotOptions: {
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
                        scope.chartoptions = options;

                        // is it a timeSerie ? with default sort
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
                            var hasMin = typeof parameters.yRangeMin !== "undefined" && parameters.yRangeMin !== '',
                                hasMax = typeof parameters.yRangeMax !== "undefined" && parameters.yRangeMax !== '';
                            options.yAxis = [{
                                title: {
                                    text: parameters.singleAxisLabel || ""
                                },
                                type: parameters.singleAxisScale || "linear",
                                min: hasMin ? parameters.yRangeMin : null,
                                max: hasMax ? parameters.yRangeMax : null,
                                startOnTick: hasMin ? false : true,
                                endOnTick: hasMax ? false : true
                            }];
                        }
                        
                        return options;
                    };
                    var getSerieOptions = function(parameters, query, chart) {
                        var datasetid = getDatasetUniqueId(query.config.dataset);
                        var yLabel = ChartHelper.getYLabel(datasetid, chart);

                        var options = angular.extend({}, {
                            name: yLabel,
                            color: chart.color,
                            type: chart.type,
                            yAxis: parameters.singleAxis ? 0 : yAxisesIndexes[datasetid][yLabel],
                            marker: {
                                enabled: (chart.type === 'scatter'),
                                radius: 3
                            },
                            shadow: false,
                            tooltip: {},
                            data: []
                        }, chart.extras);
                        options = angular.extend(options, ChartHelper.resolvePosition(chart.position));
                        delete options.position;
                        return options;
                    };

                    var getContextualizedSeriesOptions = function(row, globalOptions) {
                        var options = {
                            'tooltip': {}
                        };

                        if (angular.isObject(row.x) && ('year' in row.x || 'month' in row.x || 'day' in row.x || 'hour' in row.x || 'minute' in row.x)) {
                            // options.series[series_index + j].pointPlacement = 'between';
                            options.pointPadding = 0;
                            options.groupPadding = 0;
                            options.borderWidth = 0;

                            // TimeSerie structure is different
                            // push row data into proper serie data array
                            // var date;
                            // // default to 2000 because it's a leap year
                            // date = new Date(row.x.year || 2000, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                            // // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                            // date.setFullYear(row.x.year || 2000);
                            var datePattern = '';
                            if(! ('year' in row.x)){
                                // if(minDate){
                                //     date.setYear(minDate.getFullYear());
                                // }
                                if('month' in row.x){
                                    datePattern = '%B';
                                }
                                if('day' in row.x){
                                    if('month' in row.x){
                                        datePattern = '%e %B';
                                    } else {
                                        datePattern = '%e';
                                    }
                                }
                                if('weekday' in row.x){
                                    // date.setDate(date.getDate() - (date.getDay() - 1) + row.x.weekday); // a bit ugly
                                    // need to set a date that starts with a monday, then add the weekday offset ?
                                    datePattern = '%a';
                                }
                                if('hour' in row.x){
                                     datePattern = '%Hh';
                                }
                            } else {
                                if('day' in row.x){
                                    datePattern += ' %e';
                                }
                                if('month' in row.x){
                                    datePattern += ' %B';
                                }
                                datePattern += ' %Y';

                                if('hour' in row.x){
                                    if('minute' in row.x){
                                         datePattern += ' %Hh%M';
                                    } else {
                                        datePattern +=' %Hh';
                                    }
                                }
                            }
                            options.tooltip.xDateFormat = datePattern;

                            if('month' in row.x){
                                options.pointRange = 30.5*24*3600*1000;
                            }
                            if ('day' in row.x) {
                                options.pointRange = 24*3600*1000;
                            }
                            if('weekday' in row.x){
                                options.pointRange = 24*3600*1000;
                            }
                            if('hour' in row.x){
                                 options.pointRange = 3600*1000;
                            }
                        } else {
                            globalOptions.xAxis.categories.push(formatRowX(row.x));
                        }
                        return options;
                    }

                    var getDateFromRow = function(row, minDate) {
                        var minYear = minDate ? minDate.getFullYear() : 2000;
                        var minMonth = minDate ? minDate.getMonth() : 0;
                        var minDay = minDate ? minDate.getDate() : 1;
                        var minHour = minDate ? minDate.getHours() : 0;
                        var minMinute = minDate ? minDate.getMinutes() : 0;
                        if (angular.isObject(row.x) && ('year' in row.x || 'month' in row.x || 'day' in row.x || 'hour' in row.x || 'minute' in row.x)) {
                            // default to 2000 because it's a leap year
                            var date = new Date(row.x.year || minYear, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                            if (!'month' in row.x) date.setMonth(minMonth);
                            if (!'day' in row.x) date.setDate(minDay);
                            if (!'hour' in row.x) date.setHours(minHour);
                            if (!'minute' in row.x) date.setMinutes(minMinute);
                            date.setFullYear(row.x.year || minYear);
                            if(! ('year' in row.x)){
                                if('weekday' in row.x){
                                    date.setDate(date.getDate() - (date.getDay() - 1) + row.x.weekday); // a bit ugly
                                }
                            }
                            if('day' in row.x){
                                // handle bisextil years
                                if(row.x.day == 29 && row.x.month == 2) {
                                    date.setDate(28);
                                    date.setMonth(1);
                                }
                            } else {
                                if('month' in row.x){
                                    date.setDate(16);
                                }
                            }
                            return date;
                        }
                    };

                    var last_parameters_hash;
                    update = function(parameters) {
                        if (typeof parameters === "undefined") {
                            parameters = scope.parameters;
                        }
                        // make a copy of the parameters to make sure that we will not trigger any external watches by modifying this object
                        parameters = angular.copy(parameters);

                        if (last_parameters_hash === angular.toJson(parameters)) {
                            return;
                        }

                        if (!parameters || !parameters.queries || parameters.queries.length === 0) {
                            if (scope.chart) {
                                angular.element(scope.chart.container).empty();
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
                                getDatasetUniqueId(parameters.queries[i].config.dataset);
                            } catch (e) {
                                ChartHelper.onLoad(update);
                                return;
                            }
                        }

                        last_parameters_hash = angular.toJson(parameters);

                        var options = getGlobalOptions(parameters);
                        angular.forEach(parameters.queries, function(query) {
                            var datasetid = getDatasetUniqueId(query.config.dataset);
                            yAxisesIndexes[datasetid] = {};
                            angular.forEach(query.charts, function(chart) {
                                var yLabel = ChartHelper.getYLabel(datasetid, chart);
                                if(!parameters.singleAxis && angular.isUndefined(yAxisesIndexes[datasetid][yLabel])){
                                    // we dont yet have an axis for this column :
                                    // Create axis and register it in yAxisesIndexes
                                    var hasMin = typeof chart.yRangeMin !== "undefined" && chart.yRangeMin !== '';
                                    var hasMax = typeof chart.yRangeMax !== "undefined" && chart.yRangeMax !== '';
                                    yAxisesIndexes[datasetid][yLabel] = options.yAxis.push({
                                        // labels:
                                        title: {
                                            text: yLabel,
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
                                        opposite: !!(options.yAxis.length % 2)  //boolean casting
                                    }) - 1;
                                }

                                // instantiate series
                                options.series.push(getSerieOptions(parameters, query, chart));
                                
                                if( chart.type == 'bar') {
                                    // bar chart invert axis, thus we have to cancel the label rotation
                                    options.xAxis.labels.rotation = 0;
                                }
                                options.colors.push(chart.color);
                            });

                        });

                        function getValue(value, chart){
                            if(chart.func === 'QUANTILES' && chart.subsets) {
                                // elastic search now returns a float value as key, for now we just hack the thing to get the correct key
                                return value[chart.subsets + ".0"];
                            } else {
                                if (typeof value === "undefined") {
                                    return null;
                                } else {
                                    return value;
                                }
                            }
                        }

                        requestData(parameters.queries, timeSerieMode, precision, periodic, scope.domain, scope.apikey, function(http_calls){
                            // compute
                            var series_index = 0;

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
                            angular.forEach(http_calls, function(http_call, index){
                                // transform data format to a format understood by the chart plugin
                                var nb_series = parameters.queries[index].charts.length;
                                for (var i=0; i < http_call.data.length; i++) {
                                    var row = http_call.data[i];
                                    var serie_options = getContextualizedSeriesOptions(row, options);
                                    var dateX = getDateFromRow(row, minDate);
                                    var valueX;

                                    if (dateX && precision) {
                                        valueX = dateX.getTime();
                                    } else if (dateX) {
                                        valueX = Highcharts.dateFormat(serie_options.tooltip.xDateFormat, dateX);
                                    } else {
                                        valueX = "" + row.x;
                                    }

                                    for (var j=0; j < nb_series; j++) {
                                        var current_serie = series_index + j;
                                        var chart = parameters.queries[index].charts[j];
                                        var serie = options.series[current_serie];

                                        serie = angular.extend(serie, serie_options);

                                        if (options.xAxis.type === 'datetime') {
                                            if(['arearange', 'areasplinerange', 'columnrange'].indexOf(serie.type) >= 0){
                                                var min = getValue(row["serie"+(j+1)+"min"], chart.charts[0]);
                                                var max = getValue(row["serie"+(j+1)+"max"], chart.charts[1]);
                                                if (scope.parameters.singleAxisScale === 'logarithmic' && (min <= 0 || max <= 0)) {
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
                                                serie.data.push([
                                                    Highcharts.dateFormat(serie_options.tooltip.xDateFormat, new Date(dateX)),
                                                    getValue(row["serie"+(j+1)], chart)
                                                ]);
                                            } else {
                                                var value = getValue(row["serie"+(j+1)], chart);
                                                if (scope.parameters.singleAxisScale === 'logarithmic' && value <= 0) {
                                                    serie.data.push([valueX, null]);
                                                } else {
                                                    serie.data.push([valueX, value]);
                                                }
                                            }
                                        } else { // !precision
                                            // push row data into proper serie data array
                                            if(serie.type == 'pie') {
                                                serie.data.push([formatRowX(row.x), getValue(row["serie"+(j+1)], chart)]);
                                            } else {
                                                if(['arearange', 'areasplinerange', 'columnrange'].indexOf(serie.type) >= 0){
                                                    var min = getValue(row["serie"+(j+1)+"min"], chart.charts[0]);
                                                    var max = getValue(row["serie"+(j+1)+"max"], chart.charts[1]);
                                                    if (scope.parameters.singleAxisScale === 'logarithmic' && (min <= 0 || max <= 0)) {
                                                        serie.data.push([null, null]);
                                                    } else {
                                                        serie.data.push([min, max]);
                                                    }
                                                } else {
                                                    var value = getValue(row["serie"+(j+1)], chart);
                                                    if (scope.parameters.singleAxisScale === 'logarithmic' && value <= 0) {
                                                        serie.data.push(null);
                                                    } else {
                                                        serie.data.push(value);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                series_index += nb_series;
                            });

                            // render the charts
                            if (scope.chart && options.chart.renderTo) {
                                scope.chart.destroy();
                                chartplaceholder = element.find('.chartplaceholder');
                            }
                            options.chart.renderTo = chartplaceholder[0];

                            try {
                                scope.chart = new Highcharts.Chart(options, function() {});
                            } catch (errorMsg) {
                                if(errorMsg.indexOf && errorMsg.indexOf('Highcharts error #19') === 0){
                                    // too many ticks
                                    odsErrorService.sendErrorNotification(translate("There was too many points to display, the maximum number of points has been decreased."));
                                    angular.forEach(scope.parameters.queries, function(query){
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
                    update();
                });
                
                scope.$on('chartConfigReady', function(event, parameters) {
                    update(parameters);
                });

                scope.updateChart = update;
            }
        };
    }]);

    mod.directive('odsHighcharts', function() {
        /**
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
        var defaultColors = [
            '#2f7ed8',
            '#0d233a',
            '#8bbc21',
            '#910000',
            '#1aadce',
            '#492970',
            '#f28f43',
            '#77a1e5',
            '#c42525',
            '#a6c96a'
        ];

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
            template: '<div class="odswidget odswidget-highcharts"><div ods-chart="chart" domain="context.domain" apikey="context.apikey"></div></div>',
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

                        $scope.context.dataset.metas.domain = $scope.context.domain;
                        ChartHelper.init($scope.context.dataset);
                        if (angular.isUndefined($scope.chartConfig)) {
                            var extras = {};
                            if ($scope.chartType === 'pie') {
                                extras = {'colors': colors};
                            }
                            // Sort: x, -x, y, -y
                            var sort = '';
                            if ($scope.sort === 'y') {
                                sort = 'serie1';
                            } else if ($scope.sort === '-y') {
                                sort = '-serie1';
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
                                            options: $scope.context.parameters
                                        },
                                        xAxis: $scope.fieldX,
                                        sort: sort,
                                        maxpoints: $scope.maxpoints || 50,
                                        charts: [
                                            {
                                                yAxis: $scope.expressionY,
                                                yLabel: yLabel,
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
                        $scope.$broadcast('chartConfigReady', $scope.chart);

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
    });

    mod.directive('odsMultiHighcharts', ["ODSAPI", 'ChartHelper', '$q', function(ODSAPI, ChartHelper, $q) {
        /**
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
            template: '<div class="odswidget odswidget-multihighcharts"><div ods-chart="chart" domain="context.domain" apikey="context.apikey"></div></div>',
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
                                dataset.metas.domain = $scope.context.domain;
                                ChartHelper.init(dataset);
                            }));
                    }
                    $q.all(requests).then(function(arg) {
                        $scope.chart = chartConfig;
                        $scope.$broadcast('chartConfigReady', $scope.chart);
                    });
                    unwatch();
                });
            }]
        };
    }]);
}());
