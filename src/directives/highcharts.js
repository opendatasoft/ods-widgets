(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive("odsChart", ['ODSAPI', '$q', 'translate', 'ModuleLazyLoader', function(ODSAPI, $q, translate, ModuleLazyLoader) {
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
                apikey: '='
            },
            template: '<div class="ods-chart"><div class="chartplaceholder"></div><debug data="chartoptions"></debug></div>',
            link: function(scope, element, attrs) {
                var chartplaceholder = element.find('.chartplaceholder');
                ModuleLazyLoader('highcharts').then(function() {
                    Highcharts.setOptions({
                        global: {useUTC: false},
                        plotOptions: {
                            pie: {
                                tooltip: {
                                    pointFormat: '{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>'
                                }
                            }
                        }
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
                                    return value;
                            }
                        } else {
                            if (angular.isObject(value) && ("day" in value || "month" in value || "year" in value)) {
                                var date = new Date(value.year, value.month-1 || 0, value.day || 1, value.hour || 0, value.minute || 0);
                                return Highcharts.dateFormat("%Y-%m-%d", date);
                            }
                            return value;
                        }
                    }

                    var timeSerieMode, precision, periodic;
                    // scope.parameters = scope.$eval(attrs.chart);
                    scope.$watch('parameters',function(nv, ov){
                        timeSerieMode = undefined;
                        precision = undefined;
                        periodic = undefined;
                        if(nv && nv.queries && nv.queries.length){
                            var options = {
                                chart: {},
                                title: {text: ''},
                                // legend: {enabled: false},
                                credits: {enabled: false},
                                colors: [],
                                series: [],
                                xAxis: {
                                    title: {
                                        text: scope.parameters.xLabel || scope.parameters.queries[0].xAxis // all charts must use the same xAxis
                                    },
                                    labels: {
                                        rotation: -45,
                                        align: 'right'
                                    },
                                    minPadding: 0,
                                    maxPadding: 0
                                    // startOnTick: true,
                                    // endOnTick: true,
                                },
                                yAxis: [],
                                plotOptions: {
                                    columnrange: {
                                        pointPadding: 0,
                                        groupPadding: 0,
                                        borderWidth: 0
                                    }
                                },
                                tooltip: {
                                    valueDecimals: 2,
                                    formatter: function (tooltip) {
                                        var items = this.points || angular.isArray(this) ? this : [this],
                                            series = items[0].series,
                                            s;

                                        // build the header
                                        s = [series.tooltipHeaderFormatter(items[0])];

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
                            if(scope.parameters.timescale && $.grep(scope.parameters.queries, function(query){return query.sort;}).length === 0){
                                 timeSerieMode = scope.parameters.timescale;
                                 var tokens = timeSerieMode.split(' ');
                                 precision = tokens[0];
                                 periodic = tokens.length == 2 ? tokens[1] : '';
                            }

                            if (precision) {
                                options.xAxis.type = 'datetime';
                                options.xAxis.maxZoom = 3600000; // fourteen days
                                options.chart.zoomType = 'xy';
                            } else {
                                options.xAxis.categories = [];
                            }

                            var yAxisesIndexes = {};

                            // fetch all data with search options
                            var search_promises = [];

                            if(scope.parameters.singleAxis) {
                                options.yAxis.push({
                                    title: {
                                        text: scope.parameters.singleAxisLabel || ""
                                    },
                                    type: scope.parameters.singleAxisScale || "linear"
                                });
                            }
                            angular.forEach(scope.parameters.queries, function(query){
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

                                yAxisesIndexes[query.config.dataset] = {};

                                angular.forEach(query.charts, function(chart, index){
                                    if(['arearange', 'areasplinerange', 'columnrange'].indexOf(chart.type) >= 0){
                                        chart.func = 'COUNT';
                                        if(!chart.charts){
                                            chart.charts = [
                                                {
                                                    func: 'MIN',
                                                    expr: chart.yAxis
                                                },
                                                {
                                                    func: 'MAX',
                                                    expr: chart.yAxis
                                                }
                                            ];
                                        }
                                        if(chart.charts[0].func === 'QUANTILES' && !chart.charts[0].subsets){
                                            chart.charts[0].subsets = 5;
                                        }
                                        if(chart.charts[1].func === 'QUANTILES' && !chart.charts[1].subsets){
                                            chart.charts[1].subsets = 95;
                                        }
                                        $.each(chart.charts[0], function(key, value){
                                            search_options['y.serie' + (index+1) + 'min.'+key] = value;
                                        });
                                        $.each(chart.charts[1], function(key, value){
                                            search_options['y.serie' + (index+1) + 'max.'+key] = value;
                                        });

                                        if(query.sort ===  'serie' + (index+1)) {
                                            // cannot sort on range
                                            search_options.sort = '';
                                        }
                                    } else {
                                        if(chart.charts){
                                            delete chart.charts;
                                        }
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

                                    if(!scope.parameters.singleAxis && angular.isUndefined(yAxisesIndexes[query.config.dataset][chart.yAxis])){
                                        // we dont yet have an axis for this column :
                                        // Create axis and register it in yAxisesIndexes
                                        yAxisesIndexes[query.config.dataset][chart.yAxis] = options.yAxis.push({
                                           // labels:
                                           title: {
                                               text: chart.yLabel,
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
                                           opposite: !!(options.yAxis.length)  //boolean casting
                                        }) - 1;
                                    }

                                    // instantiate series
                                    options.series.push($.extend({}, {
                                        name: chart.yLabel,
                                        color: chart.color,
                                        type: chart.type,
                                        yAxis: scope.parameters.singleAxis ? 0 : yAxisesIndexes[query.config.dataset][chart.yAxis],
                                        marker: { enabled: false },
                                        shadow: false,
                                        tooltip: {},
                                        data: []
                                    }, chart.extras));

                                    if( chart.type == 'bar') {
                                        // bar chart invert axis, thus we have to cancel the label rotation
                                        options.xAxis.labels.rotation = 0;
                                    }
                                    options.colors.push(chart.color);
                                });

                                // Analyse request
                                // We have to build virtual contexts from parameters because we can source charts from multiple
                                // datasets.
                                var virtualContext = {
                                    domain: scope.domain,
                                    domainUrl: ODSAPI.getDomainURL(scope.domain),
                                    dataset: {'datasetid': search_options.dataset},
                                    apikey: scope.apikey,
                                    parameters: {}
                                };

                                search_promises.push(ODSAPI.records.analyze(virtualContext, angular.extend({}, query.config.options, search_options)));
                            });

                            // wait for all datas to come back
                            $q.all(search_promises).then(function(http_calls){
                                // compute
                                var series_index = 0;

                                // If there is both periodic & datetime timescale, we need to find the min date to properly offset the periodic data
                                var minDate;
                                if (precision) {
                                    angular.forEach(http_calls, function(http_call, index){
                                        var nb_series = scope.parameters.queries[index].charts.length;
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
                                    });
                                }

                                function getValue(value, chart){
                                    if(chart.subsets) {
                                        return value[chart.subsets + ".0"];
                                    } else {
                                        return value;
                                    }
                                }

                                angular.forEach(http_calls, function(http_call, index){
                                    // transform data format to a format understood by the chart plugin
                                    var nb_series = scope.parameters.queries[index].charts.length;

                                    for (var i=0; i < http_call.data.length; i++) {
                                        var row = http_call.data[i];
                                        for (var j=0; j < nb_series; j++) {
                                            var chart = scope.parameters.queries[index].charts[j];
                                            if (precision) {
                                                // options.series[series_index + j].pointPlacement = 'between';
                                                options.series[series_index + j].pointPadding = 0;
                                                options.series[series_index + j].groupPadding = 0;
                                                options.series[series_index + j].borderWidth = 0;

                                                // TimeSerie structure is different
                                                // push row data into proper serie data array
                                                var date;
                                                // default to 2000 because it's a leap year
                                                date = new Date(row.x.year || 2000, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                                                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                                                date.setFullYear(row.x.year || 2000);
                                                if(! ('year' in row.x)){
                                                    if(minDate){
                                                        date.setYear(minDate.getFullYear());
                                                    }
                                                    if('month' in row.x){
                                                        options.series[series_index + j].tooltip.xDateFormat = '%B';
                                                    }
                                                    if('day' in row.x){
                                                        if('month' in row.x){
                                                            options.series[series_index + j].tooltip.xDateFormat = '%e %B';
                                                        } else {
                                                            options.series[series_index + j].tooltip.xDateFormat = '%e';
                                                        }
                                                    }
                                                    if('weekday' in row.x){
                                                        date.setDate(date.getDate() - (date.getDay() - 1) + row.x.weekday); // a bit ugly
                                                        // need to set a date that starts with a monday, then add the weekday offset ?
                                                        options.series[series_index + j].tooltip.xDateFormat = '%a';
                                                    }
                                                    if('hour' in row.x){
                                                         options.series[series_index + j].tooltip.xDateFormat = '%Hh';
                                                    }
                                                } else {
                                                    var pattern = '';
                                                    if('day' in row.x){
                                                        pattern += ' %e';
                                                    }
                                                    if('month' in row.x){
                                                        pattern += ' %B';
                                                    }
                                                    pattern += ' %Y';

                                                    if('hour' in row.x){
                                                        if('minute' in row.x){
                                                             pattern += ' %Hh%M';
                                                        } else {
                                                            pattern +=' %Hh';
                                                        }
                                                    }
                                                    options.series[series_index + j].tooltip.xDateFormat = pattern;
                                                }

                                                if('month' in row.x){
                                                    options.series[series_index + j].pointRange = 30.5*24*3600*1000;
                                                }
                                                if('day' in row.x){
                                                    // handle bisextil years
                                                    if(row.x.day == 29 && row.x.month == 2) {
                                                        date.setDate(28);
                                                        date.setMonth(1);
                                                    }
                                                    options.series[series_index + j].pointRange = 24*3600*1000;
                                                } else {
                                                    if('month' in row.x){
                                                        date.setDate(16);
                                                    }
                                                }
                                                if('weekday' in row.x){
                                                    options.series[series_index + j].pointRange = 24*3600*1000;
                                                }
                                                if('hour' in row.x){
                                                     options.series[series_index + j].pointRange = 3600*1000;
                                                }

                                                if(['arearange', 'areasplinerange', 'columnrange'].indexOf(options.series[series_index + j].type) >= 0){
                                                    options.series[series_index + j].data.push([date.getTime(), getValue(row["serie"+(j+1)+"min"], chart.charts[0]), getValue(row["serie"+(j+1)+"max"], chart.charts[1])]);
                                                } else {
                                                    options.series[series_index + j].data.push([date.getTime(), getValue(row["serie"+(j+1)], chart)]);
                                                }
                                            } else {
                                                // push row data into proper serie data array
                                                if(options.series[series_index + j].type == 'pie') {
                                                    options.series[series_index + j].data.push([formatRowX(row.x) , getValue(row["serie"+(j+1)], chart)]);
                                                } else {
                                                    if(['arearange', 'areasplinerange', 'columnrange'].indexOf(options.series[series_index + j].type) >= 0){
                                                        options.series[series_index + j].data.push([getValue(row["serie"+(j+1)+"min"], chart.charts[0]), getValue(row["serie"+(j+1)+"max"], chart.charts[1])]);
                                                    } else {
                                                        options.series[series_index + j].data.push(getValue(row["serie"+(j+1)], chart));
                                                    }
                                                }
                                            }
                                        }
                                        if(!precision){
                                            options.xAxis.categories.push(formatRowX(row.x));
                                        }
                                    }
                                    series_index += nb_series;
                                });

                                // render the charts
                                try {
                                    chartplaceholder.css('height', chartplaceholder.height());
                                    scope.chart = chartplaceholder.highcharts(options);
                                    chartplaceholder.css('height', '');
                                } catch (errorMsg) {
                                    if(errorMsg.indexOf('Highcharts error #19') === 0){
                                        // too many ticks
                                        angular.forEach(scope.parameters.queries, function(query){
                                            query.maxpoints = 20;
                                        });
                                    }
                                }
                            });
                        }
                    }, true);
                });
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
            controller: ['$scope', 'ODSWidgetsConfig', function($scope, ODSWidgetsConfig) {
                var color = ODSWidgetsConfig.chartColors || defaultColors;
                if ($scope.color) {
                    color = $scope.color.split(',').map(function(item) { return item.trim(); });
                }
                var unwatch = $scope.$watch('context.dataset', function(nv) {
                    if (nv) {
                        if ($scope.context.type !== 'dataset') {
                            console.error('ods-highcharts requires a Dataset Context');
                        }
                        if (angular.isUndefined($scope.chartConfig)) {
                            var extras = {};
                            if ($scope.chartType === 'pie') {
                                extras = {colors: color};
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
                                                color: color[0],
                                                type: $scope.chartType,
                                                extras: extras
                                            }
                                        ]
                                    }
                                ]
                            };
                        } else {
                            if (angular.isString($scope.chartConfig)) {
                                $scope.chart = JSON.parse(atob($scope.chartConfig));
                            } else {
                                $scope.chart = $scope.chartConfig;
                            }
                        }
                        unwatch();
                    }
                });
            }]
        };
    });

    mod.directive('odsMultiHighcharts', function() {
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
                    if (angular.isString($scope.chartConfig)) {
                        $scope.chart = JSON.parse(atob($scope.chartConfig));
                    } else {
                        $scope.chart = $scope.chartConfig;
                    }
                    unwatch();
                });
            }]
        };
    });

}());
