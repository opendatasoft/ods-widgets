(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('AggregationHelper', ['translate', function(translate) {
        var availableFunctions = [
            {label: translate('Count'), func: 'COUNT'},
            {label: translate('Average'), func: 'AVG'},
            {label: translate('Minimum'), func: 'MIN'},
            {label: translate('Maximum'), func: 'MAX'},
            {label: translate('Standard deviation'), func: 'STDDEV'},
            {label: translate('Sum'), func: 'SUM'},
            {label: translate('Percentile'), func: 'QUANTILES'},
            // {label: translate('Custom expression'), func: 'CUSTOM'},
            {label: translate('Constant value'), func: 'CONSTANT'}
        ];

        return {
            getAvailableFunctions: function(availableYCount) {
                if (availableYCount === 0) {
                    return [
                        availableFunctions[0],
                        availableFunctions[availableFunctions.length - 1]
                    ];
                } else {
                    return availableFunctions;
                }
            },
            getAvailableFunction: function(f) {
                return availableFunctions[f];
            },
            getFunctionLabel: function(func) {
                func = func.toUpperCase();
                return jQuery.grep(availableFunctions, function(f){return func === f.func;})[0].label;
            }
        };
    }]);

    mod.factory('ChartHelper', ['translate', 'AggregationHelper', 'ODSWidgetsConfig', 'ODSCurrentDomain', 'colorScale', function(translate, AggregationHelper, ODSWidgetsConfig, ODSCurrentDomain, colorScale) {
        var availableX = {},
            availableY = {},
            availableFunctions = [],
            timescales_label = {
                'year': translate('Year'),
                'month': translate('Month'),
                'day': translate('Day'),
                'hour': translate('Hour'),
                'minute': translate('Minute'),
                'month month': translate('Month of year'),
                'day day': translate('Day of month'),
                'day weekday': translate('Day of week'),
                'hour weekday': translate('Hour per weekday'),
                'day month': translate('Day of year'),
                'hour hour': translate('Hour of day')
            },
            callbacks = {},
            initialized = [],
            positions = {
                'top left': {
                    'label': translate('top left'),
                    'position': {center: ['15%', '20%'], size: '25%'}
                },
                'top right': {
                    'label': translate('top right'),
                    'position': {center: ['85%', '20%'], size: '25%'}
                },
                'bottom left': {
                    'label': translate('bottom left'),
                    'position': {center: ['15%', '80%'], size: '25%'}
                },
                'bottom right': {
                    'label': translate('bottom right'),
                    'position': {center: ['85%', '80%'], size: '25%'}
                },
                'center': {
                    'label': translate('center'),
                    'position': {}
                }
            },
            defaultColors = ODSWidgetsConfig.chartColors || chroma.brewer.Set2,
            availableCharts = [
                {
                    label: translate('Line'),
                    type: 'line',
                    group: translate('line charts')
                },
                {
                    label: translate('Spline'),
                    type: 'spline',
                    group: translate('line charts')
                },
                {
                    label: translate('Range'),
                    type: 'arearange',
                    group: translate('Area charts'),
                    filter: 'hasNumericField'
                },
                {
                    label: translate('Range spline'),
                    type: 'areasplinerange',
                    group: translate('Area charts'),
                    filter: 'hasNumericField'
                },
                {
                    label: translate('Column range'),
                    type: 'columnrange',
                    group: translate('Area charts'),
                    filter: 'hasNumericField'
                },
                {label: translate('Treemap'), type: 'treemap', group: translate('Special')},
                {label: translate('Area'), type: 'area', group: translate('Area charts')},
                {label: translate('Area spline'), type: 'areaspline', group: translate('Area charts')},
                {label: translate('Column chart'), type: 'column', group: translate('Bar charts')},
                {label: translate('Bar chart'), type: 'bar', group: translate('Bar charts')},
                {label: translate('Pie chart'), type: 'pie', group: translate('Pie charts')},
                {label: translate('Scatter plot'), type: 'scatter', group: translate('line charts')},
                {label: translate('Spiderweb chart'), type: 'spiderweb', group: translate('Pie charts')},
                {label: translate('Polar chart'), type: 'polar', group: translate('Pie charts')},
                {label: translate('Funnel chart'), type: 'funnel', group: translate('Pyramid charts')},
                {label: translate('Boxplot'), type: 'boxplot', group: translate('Boxplot charts')}
            ],
            timeserie_precision_tab = [
                "year",
                "month",
                "day",
                "hour",
                "minute"
            ],
            advanced_precision_tab = [
                'month month',
                'day day',
                'day weekday',
                'hour weekday',
                'day month',
                'hour hour'
            ],
            colorIdx = 0,
            fields = {},
            datasets = {},
            timeSeries;

            var getAvailableTimescalesFromPrecision = function(precision, type, fullList) {
                var forced = false;
                if (!precision) {
                    precision = type == 'date' ? 'day' : 'hour';
                } else {
                    forced = true;
                }
                var res = [];
                for (var i=0; i <= timeserie_precision_tab.indexOf(precision); i++){
                    res.push({name : timeserie_precision_tab[i], label: timescales_label[timeserie_precision_tab[i]]});
                    if (type === 'date' && timeserie_precision_tab[i] == 'day') {
                        break;
                    }
                    if (type === 'datetime' && !forced && timeserie_precision_tab[i] == 'hour') {
                        break;
                    }
                    if (type === 'datetime' && forced && timeserie_precision_tab[i] == 'minute') {
                        break;
                    }
                }
                if (fullList) {
                    for (var j = 0; j < advanced_precision_tab.length; j++) {
                        res.push({name: advanced_precision_tab[j], label: timescales_label[advanced_precision_tab[j]]});
                        if (type === 'date' && timeserie_precision_tab[j] == 'day month') {
                            break;
                        }
                    }
                }
                return res;
            };
        return {
            getDatasetUniqueId: function(datasetid) {
                var dataset;
                angular.forEach(datasets, function(value, key) {
                    if (key.endsWith(datasetid)) {
                        dataset = value;
                    }
                    return false;
                });
                if (dataset) {
                    return dataset.getUniqueId();
                } else {
                    throw "dataset " + datasetid + " not loaded yet.";
                }
            },
            getDataset: function(uniqueid) {
                var dataset;
                angular.forEach(datasets, function(value, key) {
                    if (uniqueid === key) {
                        dataset = value;
                    }
                    return false;
                });
                return dataset;
            },
            isChartSortable: function(chartType) {
                return !this.isRangeChart(chartType);
            },
            isRangeChart: function(chartType) {
                return ['arearange', 'areasplinerange', 'columnrange'].indexOf(chartType) > -1;
            },
            getAllTimescales: function() {
                return getAvailableTimescalesFromPrecision('minute', 'datetime', true);
            },
            getAvailableX: function(datasetid, i) {
                var that = this;
                if (typeof i === "undefined") {
                    return availableX[datasetid];
                }
                return availableX[datasetid][i];
            },
            getAvailableBreakDowns: function(datasetid, currentX) {
                if (!currentX) {
                    return [];
                }

                var xIsDatetime = (['date', 'datetime'].indexOf(this.getFieldType(datasetid, currentX)) !== -1);
                var a = [];
                for (var i = 0; i < availableX[datasetid].length; i++) {
                    if (availableX[datasetid][i].name !== currentX) {
                        if (!xIsDatetime || ['date', 'datetime'].indexOf(this.getFieldType(datasetid, availableX[datasetid][i].name)) === -1) {
                            a.push({label: availableX[datasetid][i].label, name: availableX[datasetid][i].name});
                        }
                    }
                }
                return a;
            },
            getAvailableY: function(datasetid, i) {
                if (typeof i === "undefined")
                    return availableY[datasetid];
                return availableY[datasetid][i];
            },
            getTimescales: function(datasetid, fieldName, advanced) {
                var precision;
                var field;
                for (var i = 0; i< fields[datasetid].length; i++) {
                    if (fields[datasetid][i].name === fieldName) {
                        field = fields[datasetid][i];
                        break;
                    }
                }
                if (!field) {
                    return;
                }
                if (field.annotations) {
                    for (var annotation=0; annotation<field.annotations.length; annotation++) {
                        if (field.annotations[annotation].name == 'timeserie_precision') {
                            precision = field.annotations[annotation].args[0];
                            break;
                        }
                    }
                }

                return getAvailableTimescalesFromPrecision(precision, field.type, advanced);
            },
            getDatasetId: function(context) {
                return (context.domain || ODSCurrentDomain.domainId) + "." + context.dataset.datasetid;
            },
            init: function(context, limitToTimeSeries, force) {
                if (typeof force === "undefined") {
                    force = false;
                }

                var availableX = [], availableY = [];
                var datasetid = this.getDatasetId(context);

                if (!force && !!(datasetid in initialized)) {
                    return;
                }
                fields[datasetid] = context.dataset.fields;

                var numericalXs = [];

                for (var i = 0; i< fields[datasetid].length; i++) {
                    var field = fields[datasetid][i];

                    if (field.type == 'int' || field.type == 'double') {
                        availableY.push(field);
                    }

                    if (field.type == 'datetime' || field.type == 'date') {
                        availableX.unshift(field);
                    } else if (field.type == 'double' || field.type == 'int') {
                        numericalXs.push(field);
                    } else {
                        // Find out if it has the analyse annotation
                        if (field.annotations) {
                            for (var a = 0; a < field.annotations.length; a++) {
                                var anno = field.annotations[a];
                                if (anno.name === 'analyse') {
                                    availableX.push(field);
                                }
                            }
                        }

                        // Find out if this is a facet
                        var facets = (
                            context.dataset.extra_metas &&
                            context.dataset.extra_metas.asset_content_configuration &&
                            context.dataset.extra_metas.asset_content_configuration.facets
                        ) || [];
                        if (facets.filter(function(facet) {
                            return facet.field_name === field.name;
                        }).length > 0) {
                            availableX.push(field);
                        }
                    }
                }
                availableX = availableX.concat(numericalXs);

                this.setAvailableX(datasetid, availableX);
                this.setAvailableY(datasetid, availableY);
                initialized[datasetid] = true;
                datasets[datasetid] = context.dataset;
                this.load(datasetid);
            },
            isInitialized: function(datasetid) {
                if (datasetid === '') {
                    return !!(initialized.length);
                } else {
                    return !!(datasetid in initialized);
                }
            },
            load: function(datasetid) {
                if (callbacks[datasetid]) {
                    for (var i = 0; i < callbacks[datasetid].length; i++) {
                        callbacks[datasetid][i]();
                    }
                }
                callbacks[datasetid] = [];
                var callback;
                if (callbacks['']) {
                    while (callbacks[''].length) {
                        callback = callbacks[''].pop();
                        setTimeout(callback);
                    }
                }
            },
            onLoad: function(datasetid, f) {
                if (typeof datasetid === "function") {
                    f = datasetid;
                    datasetid = '';
                }
                if (this.isInitialized(datasetid)) {
                    f();
                } else {

                    if (!(datasetid in callbacks)) {
                        callbacks[datasetid] = [];
                    }
                    if (callbacks[datasetid].indexOf(f) < 0) {
                        callbacks[datasetid].push(f);
                    }
                }
            },
            setAvailableX: function(datasetid, x) {
                availableX[datasetid] = x;
            },
            setAvailableY: function(datasetid, y) {
                availableY[datasetid] = y;
            },
            resolvePosition: function(position) {
                if (isNullOrUndefined(position)) {
                    position = "center";
                }
                if (!(position in positions)) {
                    position = "center";
                }
                return positions[position].position;
            },
            getPieChartPositions: function() {
                return jQuery.map(positions, function(v,k) {return {'label': v.label, 'value': k};});
            },
            getDefaultColors: function() {
                return defaultColors;
            },
            getDefaultColor: function(currentColor, serieType, breakdown, index) {
                return colorScale.getDefaultColor(currentColor, this.getAllowedColors(serieType, breakdown), index);
            },
            getAllowedColors: function(serietype, breakdown) {
                var allowedColors = [];
                if (breakdown || this.isMultiColorChart(serietype)) {
                    allowedColors.push('range');
                }
                if (!breakdown && !this.isMultiColorChart(serietype)) {
                    allowedColors.push('single');
                }
                return allowedColors;
            },
            getAvailableChartTypes: function(datasetid, stacked) {
                var availableChartTypes = [];
                if (datasets[datasetid]) {
                    for (var i = 0; i < availableCharts.length; i++) {
                        if ((stacked && ['column', 'area', 'areaspline', 'line', 'spline', 'bar', 'polar'].indexOf(availableCharts[i].type) !== -1) || !stacked) {
                            if (typeof availableCharts[i].filter === 'undefined') {
                                availableChartTypes.push(availableCharts[i]);
                            } else if (datasets[datasetid][availableCharts[i].filter]()) {
                                availableChartTypes.push(availableCharts[i]);
                            }
                        }
                    }
                }
                return availableChartTypes;
            },
            getSerieTemplate: function() {
                return angular.copy({
                    alignMonth: true
                });
            },
            setChartDefaultValues: function(datasetid, chart, conservative, advanced) {
                var cumulatedQueriesTimescale = '',
                    xType,
                    i;

                if (typeof conservative === "undefined") {
                    conservative = false;
                }
                if (typeof advanced === "undefined") {
                    advanced = false;
                }

                for (i = 0; i < chart.queries.length; i++) {
                    xType = this.getFieldType(datasetid, chart.queries[i].xAxis);
                    if (chart.queries[i].timescale && (xType === 'date' || xType === "datetime")) {
                        cumulatedQueriesTimescale = chart.queries[i].timescale;
                    }
                }

                if (!cumulatedQueriesTimescale) {
                    chart.timescale = '';
                } else if (!chart.timescale && advanced) {
                    chart.timescale = cumulatedQueriesTimescale;
                }

                // apply global timescale to queries that eventually might not anything set
                if (chart.timescale) {
                    for (i = 0; i < chart.queries.length; i++) {
                        if (!chart.queries[i].timescale) {
                            chart.queries[i].timescale = chart.timescale;
                        }
                    }
                }
                if (!chart.singleAxis) {
                    delete(chart.singleAxisLabel);
                    delete(chart.singleAxisScale);
                    delete(chart.yRangeMin);
                    delete(chart.yRangeMax);
                }

                if (typeof chart.displayLegend === "undefined") {
                    chart.displayLegend = true;
                }

                if (typeof chart.alignMonth === "undefined") {
                    chart.alignMonth = true;
                }

                // cleanup unwanted values
                if (!conservative) {
                    delete chart.xLabel;
                }
            },
            setDefaultQueryValues: function(datasetid, query, advancedFeatures, dontTouchMaxpoints, globalTimescale, conservative) {
                if (!query) {
                    query = {};
                }
                var searchOptions = {};
                var defaultX = searchOptions.x || this.getAvailableX(datasetid, 0).name;
                var defaultMaxpoints = 50;

                if (!query.xAxis) {
                    query.xAxis = defaultX;
                }

                if (this.getFieldType(datasetid, query.xAxis) == 'date' || this.getFieldType(datasetid, query.xAxis) == 'datetime') {
                    // If the default X is a date/datetime, then we assume timeserie mode and we remove any limitation
                    defaultMaxpoints = '';
                }

                if (typeof query.maxpoints === "undefined") {
                    query.maxpoints = defaultMaxpoints;
                }
                if (!query.charts) {
                    query.charts = [];
                }

                var xAxis = query.xAxis;
                var xType = this.getFieldType(datasetid, xAxis);

                if (xType == 'date' || xType == 'datetime') {
                    if(!query.timescale || this.getTimescales(datasetid, xAxis, advancedFeatures).map(function(t){return t.name;}).indexOf(query.timescale) === -1) {
                        // Set a default timescale value
                        query.timescale = 'year';
                        if (advancedFeatures && globalTimescale) {
                            query.timescale = globalTimescale;
                        } else {
                            // TODO use precision annotation to set the timescale more precisely by default
                            // don't go lower than day
                            query.timescale = 'year';
                        }
                    }
                } else {
                    if (query.timescale){
                        query.timescale = '';
                    }
                }
                if (query.seriesBreakdown === xAxis) {
                    query.seriesBreakdown = '';
                    query.seriesBreakdownTimescale = '';
                }

                var forceBreakdownRemoval = false;
                for (var i = 0; i < query.charts.length; i++) {
                    if (['treemap', 'pie'].indexOf(query.charts[i].type) !== -1) {
                        forceBreakdownRemoval = true;
                    }
                }

                if (forceBreakdownRemoval) {
                    query.seriesBreakdown = '';
                    query.seriesBreakdownTimescale = '';
                }

                if (!query.seriesBreakdown && query.charts.length < 2) {
                    delete query.stacked;
                }

                if (!query.sort || query.seriesBreakdown) {
                    query.sort = '';
                }
            },
            setSerieDefaultValues: function(datasetid, chart, xAxis, conservative) {
                var i, subsets;
                // Compute default labels
                // Enveloppe
                if (typeof xAxis === "undefined") {
                    return;
                }

                var availableY = this.getAvailableY(datasetid);
                if (!chart.type) {
                    chart.type = 'column';
                    if (xAxis && (this.getFieldType(datasetid, xAxis) == 'date' || this.getFieldType(datasetid, xAxis) == 'datetime')) {
                        chart.type = 'line';
                    }
                }

                if (!chart.func) {
                    chart.func = availableY.length > 0 ? 'AVG' : 'COUNT';
                }

                if (typeof chart.expr !== "undefined" && typeof chart.yAxis === "undefined") {
                    chart.yAxis = chart.expr;
                    delete chart.expr;
                }

                if (typeof chart.yAxis === "undefined" || chart.yAxis === "") {
                    // there is no yAxis defined, check if it's ok or if need to define one
                    if (availableY.length === 0 && ['COUNT', 'CONSTANT', 'CUSTOM'].indexOf(chart.func) === -1) {
                        chart.func = 'COUNT';
                    }
                    if (!conservative && ['COUNT', 'CONSTANT', 'CUSTOM'].indexOf(chart.func) === -1) {
                        // the current function needs an yAxis
                        chart.yAxis = availableY[0].name;
                    // } else { // remove current yAxis, not needed by the current function
                    //     chart.yAxis = '';
                    }
                } else {
                    // there is an yAxis defined, we need to check if it still exists
                    if (!conservative && ['COUNT', 'CONSTANT', 'CUSTOM'].indexOf(chart.func) === -1) {
                        if (jQuery.grep(availableY, function(y) {return y.name === chart.yAxis;}).length === 0) {
                            // the currently defined y does not seem to exists anymore, fallback on the first available one
                            chart.yAxis = availableY[0].name;
                        }
                    }
                }

                if(chart.type && this.isRangeChart(chart.type)) {
                    chart.func = 'COUNT';
                    subsets = [5, 95];
                    if (!chart.charts) {
                        if (chart.yAxis) {
                            chart.charts = [
                                {
                                    func: 'MIN',
                                    yAxis: chart.yAxis
                                },
                                {
                                    func: 'MAX',
                                    yAxis: chart.yAxis
                                }
                            ];
                        } else {
                            chart.charts = [
                                {
                                    func: 'COUNT'
                                },
                                {
                                    func: 'COUNT'
                                }
                            ];
                        }
                    }
                    if (chart.charts.length === 5) {
                        chart.charts[1] = angular.copy(chart.charts[4]);
                        chart.charts.splice(2, 3);
                    }

                    for (i = 0; i < 2; i++) {
                        if (typeof chart.charts[i].yAxis === "undefined" || chart.charts[i].yAxis === "") {
                            chart.charts[i].yAxis = chart.charts[i].expr || chart.yAxis;
                            delete chart.charts[i].expr;
                        }

                        if (chart.charts[i].func === 'QUANTILES' && (chart.charts[i].subsets === "" || typeof chart.charts[i].subsets === "undefined")) {
                            chart.charts[i].subsets = subsets[i];
                        }

                        if (chart.charts[i].func !== 'QUANTILES' && chart.charts[i].subsets) {
                            delete chart.charts[i].subsets;
                        }
                    }
                } else if (chart.type && chart.type === 'boxplot') {
                    chart.func = 'COUNT';
                    subsets = [1, 25, 50, 75, 100];
                    if (!chart.charts) {
                        chart.charts = [];
                    }
                    if (chart.charts.length === 2) {
                        chart.charts[4] = angular.copy(chart.charts[1]);
                        chart.charts[1] = undefined;
                    }

                    if (typeof chart.charts[0] === "undefined") {
                        chart.charts[0] = {
                            func: 'MIN',
                            yAxis: chart.yAxis
                        };
                    }
                    for (i = 1; i < 4; i++) {
                        if (typeof chart.charts[i] === "undefined") {
                            chart.charts[i] = {
                                func: 'QUANTILES',
                                yAxis: chart.yAxis,
                                subsets: subsets[i]
                            };
                        }
                    }
                    if (typeof chart.charts[4] === "undefined") {
                        chart.charts[4] = {
                            func: 'MAX',
                            yAxis: chart.yAxis
                        };
                    }
                    for (i = 0; i < 5; i++) {
                        if (typeof chart.charts[i].yAxis === "undefined" || chart.charts[i].yAxis === "") {
                            chart.charts[i].yAxis = chart.charts[i].expr || chart.charts[i].yAxis || chart.yAxis;
                            delete chart.charts[i].expr;
                        }

                        if (chart.charts[i].func === 'QUANTILES' && (chart.charts[i].subsets === "" || typeof chart.charts[i].subsets === "undefined")) {
                            chart.charts[i].subsets = subsets[i];
                        }

                        if (chart.charts[i].func !== 'QUANTILES' && chart.charts[i].subsets) {
                            delete chart.charts[i].subsets;
                        }
                    }
                } else {
                    if(chart.charts){
                        delete chart.charts;
                    }
                    if(chart.func === 'QUANTILES'){
                        if (!chart.subsets){
                            chart.subsets = 50;
                        }
                    } else {
                        if (chart.subsets) {
                          delete chart.subsets;
                        }
                    }
                }

                if (chart.type === "pie" && !chart.position) {
                    chart.position = "center";
                }

                if (chart.type !== 'column' && chart.type !== 'bar' && chart.displayStackValues) {
                    chart.displayStackValues = false;
                }

                if (typeof chart.scientificDisplay === "undefined") {
                    chart.scientificDisplay = true;
                }

                // cleanup unwanted values
                delete chart.yLabel;
                delete chart.extras;
            },
            setSerieDefaultColors: function(serie, breakdown, index) {
                serie.color = this.getDefaultColor(serie.color, serie.type, breakdown, index);
            },
            getXLabel: function(datasetid, xAxis, timescale, precision) {
                var xType = this.getFieldType(datasetid, xAxis);
                var xLabel = this.getFieldLabel(datasetid, xAxis);
                if ((xType === 'date' || xType === 'datetime') && timescale) {
                    // Timeserie
                    return xLabel + ' (' + timescales_label[timescale] + ')';
                } else {
                    return xLabel;
                }
            },
            getYLabel: function(datasetid, chart) {
                if (chart.yLabelOverride) {
                    return chart.yLabelOverride;
                } else {
                    if (this.isRangeChart(chart.type)) {
                        return this.getYLabel(datasetid, chart.charts[0]) + " / " + this.getYLabel(datasetid, chart.charts[1]);
                    } else if (chart.type === 'boxplot') {
                        return translate('Boxplot');
                    } else {
                        var funcLabel = AggregationHelper.getFunctionLabel(chart.func);
                        var nameY = chart.yAxis || chart.expr;
                        var possibleYAxis = jQuery.grep(this.getAvailableY(datasetid), function(y){return y.name == nameY;});
                        if (possibleYAxis.length > 0 && chart.func !== "COUNT" && chart.func !== "CONSTANT" && chart.func !== "CUSTOM") {
                            var label = funcLabel + ' ' + possibleYAxis[0].label;
                            if (chart.func === "QUANTILES") {
                                label = chart.subsets + ' ' + label;
                            }
                            return label;
                        } else {
                            return funcLabel;
                        }
                    }
                }
            },
            getField: function(datasetid, fieldName) {
                if (!fields[datasetid]) return null;
                for (var i=0; i < fields[datasetid].length; i++) {
                    var field = fields[datasetid][i];
                    if (field.name == fieldName) {
                        return field;
                    }
                }
                return undefined;
            },
            getFieldLabel: function(datasetid, fieldName) {
                var field = this.getField(datasetid, fieldName);
                if (!field) {
                    return field;
                }
                return field.label;
            },
            getFieldType: function(datasetid, fieldName) {
                var field = this.getField(datasetid, fieldName);
                if (!field) {
                    return field;
                }
                return field.type;
            },
            getFieldUnit: function(datasetid, fieldName) {
                var field = this.getField(datasetid, fieldName);
                if (field && field.annotations) {
                    for (var i = 0; i < field.annotations.length; i++) {
                        if (field.annotations[i].name === "unit") {
                            return field.annotations[i].args[0];
                        }
                    }
                    return field.annotations.unit;
                }
                return false;
            },
            getDecimals: function(datasetid, fieldName) {
                var field = this.getField(datasetid, fieldName);
                if (field && field.annotations) {
                    for (var i = 0; i < field.annotations.length; i++) {
                        if (field.annotations[i].name === "decimals") {
                            return field.annotations[i].args[0];
                        }
                    }
                    return false;
                }
                return false;
            },
            getAvailableFunctions: function(datasetid) {
                return AggregationHelper.getAvailableFunctions(this.getAvailableY(datasetid).length);
            },
            allowThresholds: function(type) {
                return ['column', 'bar', 'scatter'].indexOf(type) !== -1;
            },
            isMultiColorChart: function(type) {
                return ['pie', 'treemap', 'funnel', 'polar'].indexOf(type) !== -1;
            }
        };
    }]);

}());
