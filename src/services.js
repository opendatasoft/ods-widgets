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
            {label: translate('Percentile'), func: 'QUANTILES'}
        ];
        
        return {
            getAvailableFunctions: function() {
                return availableFunctions;
            },
            getAvailableFunction: function(f) {
                return availableFunctions[f];
            },
            getFunctionLabel: function(func) {
                func = func.toUpperCase();
                return $.grep(availableFunctions, function(f){return func === f.func;})[0].label;
            }
        }
    }]);

    mod.factory('ChartHelper', ['translate', 'AggregationHelper', 'ODSWidgetsConfig', function(translate, AggregationHelper, ODSWidgetsConfig) {
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
                'day month': translate('Day of year'),
                'hour hour': translate('Hour of day')
            },
            callbacks = {},
            initialized = [],
            positions = {
                'top left': {center: ['15%', '20%'], size: '25%'},
                'top right': {center: ['85%', '20%'], size: '25%'},
                'bottom left': {center: ['15%', '80%'], size: '25%'},
                'bottom right': {center: ['85%', '80%'], size: '25%'},
                'center': {}
            },
            defaultColors = ODSWidgetsConfig.chartColors || [
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
            ],
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
                {label: translate('Area'), type: 'area', group: translate('Area charts')},
                {label: translate('Area spline'), type: 'areaspline', group: translate('Area charts')},
                {label: translate('Column chart'), type: 'column', group: translate('Bar charts')},
                {label: translate('Bar chart'), type: 'bar', group: translate('Bar charts')},
                {label: translate('Pie chart'), type: 'pie', group: translate('Pie charts')},
                {label: translate('Scatter plot'), type: 'scatter', group: translate('line charts')}
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
                    throw new Exception("dataset " + datasetid + " not loaded yet.");
                }
            },
            getDataset: function(uniqueid) {
                var dataset;
                angular.forEach(datasets, function(value, key) {
                    if (uniqueid === key) {
                        dataset = value;
                    }
                    return false;
                })
                return dataset;
            },
            isChartSortable: function(chartType) {
                return ['arearange', 'areasplinerange', 'columnrange'].indexOf(chartType) < 0;
            },
            getAllTimescales: function() {
                return getAvailableTimescalesFromPrecision('minute', 'datetime', true);
            },
            getAvailableX: function(datasetid, i) {
                if (typeof i === "undefined") 
                    return availableX[datasetid];
                return availableX[datasetid][i];
            },
            getAvailableY: function(datasetid, i) {
                if (typeof i === "undefined") 
                    return availableY[datasetid];
                return availableY[datasetid][i];
            },
            getTimescales: function(datasetid, fieldName) {
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

                return getAvailableTimescalesFromPrecision(precision, field.type, timeSeries);
            },
            init: function(dataset, limitToTimeSeries, force) {
                if (typeof force === "undefined") {
                    force = false;
                }
                if (typeof limitToTimeSeries === "undefined") {
                    limitToTimeSeries = false;
                }
                timeSeries = limitToTimeSeries;
                var availableX = [], availableY = [];
                var datasetid = dataset.getUniqueId();

                if (!force && !!(datasetid in initialized)) {
                    return;
                }
                fields[datasetid] = dataset.fields;

                for (var i = 0; i< fields[datasetid].length; i++) {
                    var field = fields[datasetid][i];
                    if (field.type == 'int' || field.type == 'double') {
                        availableY.push(field);
                    }
                    if (field.type == 'datetime' || field.type == 'date') {
                        availableX.unshift(field);
                    } else if (!limitToTimeSeries) {
                        // Find out if this is a facet
                        if (field.annotations) {
                            for (var a=0; a<field.annotations.length; a++) {
                                var anno = field.annotations[a];
                                if (anno.name == 'facet') {
                                    availableX.push(field);
                                }
                            }
                        }
                    }
                }
                this.setAvailableX(datasetid, availableX);
                this.setAvailableY(datasetid, availableY);
                initialized[datasetid] = true;
                datasets[datasetid] = dataset;
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
                if (callbacks['']) {
                    for (var i = 0; i < callbacks[''].length; i++) {
                        callbacks[''][i]();
                    }
                }
                callbacks[''] = [];
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
                if (typeof position == undefined) {
                    position = "center";
                }
                if (!(position in positions)) {
                    position = "center";
                }
                return positions[position];
            },
            getPieChartPositions: function() {
                return $.map(positions, function(v,k) {return k;});
            },
            getDefaultColors: function() {
                return defaultColors;
            },
            getDefaultColor: function(currentColor, backupColor) {
                if (typeof currentColor !== "undefined" && currentColor !== "") {
                    colorIdx++;
                    return currentColor;
                } else if (typeof backupColor !== "undefined" && backupColor !== "") {
                    // coming back from a pie chart, we don't want to increase the color counter
                    return backupColor;
                } else {
                    var color = defaultColors[colorIdx++%defaultColors.length];
                    return color;
                }
            },
            getAvailableChartTypes: function(datasetid) {
                var availableChartTypes = [];
                for (var i = 0; i < availableCharts.length; i++) {
                    // console.log(datasets[datasetid][availableCharts[i].filter]());
                    if (typeof availableCharts[i].filter === 'undefined') {
                        availableChartTypes.push(availableCharts[i]);
                    } else if (datasets[datasetid][availableCharts[i].filter]()) {
                        availableChartTypes.push(availableCharts[i]);
                    }
                }
                return availableChartTypes;
            },
            setDefaultValues: function(datasetid, chart) {
                // Compute default labels
                // Enveloppe
                if(chart.yAxis === ''){
                    if (this.getAvailableY(datasetid).length === 0) {
                        chart.func = 'COUNT';
                    } else {
                        chart.yAxis = this.getAvailableY(datasetid, 0).name;
                    }
                } else if (chart.func === 'COUNT') {
                    // chart.func = 'AVG';
                }

                if(!this.isChartSortable(chart.type)){
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
                    if (!chart.charts[0].expr) {
                        chart.charts[0].expr = chart.yAxis;
                    }
                    if (!chart.charts[1].expr) {
                        chart.charts[1].expr = chart.yAxis;
                    }
                    if(chart.charts[0].func === 'QUANTILES' && !chart.charts[0].subsets){
                        chart.charts[0].subsets = 5;
                    }
                    if(chart.charts[1].func === 'QUANTILES' && !chart.charts[1].subsets){
                        chart.charts[1].subsets = 95;
                    }

                    if (chart.charts[0].func !== 'QUANTILES' && chart.charts[0].subsets) {
                        delete chart.charts[0].subsets;
                    }
                    if (chart.charts[1].func !== 'QUANTILES' && chart.charts[1].subsets) {
                        delete chart.charts[1].subsets;
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
                this.setColor(chart);
            },
            setColor: function(chart) {
                if(chart.type === 'pie'){
                    chart._color = chart.color;
                    delete chart.color;
                    chart.extras = this.resolvePosition(chart.position);
                    chart.extras.colors = this.getDefaultColors();
                } else {
                    chart.color = this.getDefaultColor(chart.color, chart._color);
                }
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
                    if (!this.isChartSortable(chart.type)) {
                        return this.getYLabel(datasetid, chart.charts[0]) + " / " + this.getYLabel(datasetid, chart.charts[1]);
                    } else {
                        var funcLabel = AggregationHelper.getFunctionLabel(chart.func);
                        var nameY = chart.yAxis || chart.expr;
                        var possibleYAxis = $.grep(this.getAvailableY(datasetid), function(y){return y.name == nameY;});
                        if (possibleYAxis.length > 0 && chart.func !== "COUNT") {
                            return funcLabel + ' ' + possibleYAxis[0].label;
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
            getAvailableFunctions: function(datasetid, fieldName) {
                if (fieldName == '' || typeof this.getFieldType(fieldName) === "undefined") {
                    return [{label: translate('Count'), func: 'COUNT'}];
                } else {
                    return AggregationHelper.getAvailableFunctions();
                }
            }
        };
    }]);

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', 'odsErrorService', function($http, ODSWidgetsConfig, odsErrorService) {
        /**
         * This service exposes OpenDataSoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context ? context.domainUrl : '';
            url += path;
            params = params || {};
            params.timezone = jstz.determine().name();
            if (context && context.apikey) {
                params.apikey = context.apikey;
            }
            var options = {
                params: params
            };
            if (timeout) {
                options.timeout = timeout;
            }
            if (ODSWidgetsConfig.customAPIHeaders) {
                options.headers = ODSWidgetsConfig.customAPIHeaders;
            } else {
                options.headers = {};
            }
            options.headers['ODS-Widgets-Version'] = ODSWidgetsConfig.ODSWidgetsVersion;
            if (!context.domainUrl || Modernizr.cors) {
                return $http.
                    get(url, options).
                    error(function(data) {
                        if (data) {
                            odsErrorService.sendErrorNotification(data);
                        }
                    });
            } else {
                // Fallback for non-CORS browsers (IE8, IE9)
                // In that case we won't have proper errors from the API
                url += url.indexOf('?') > -1 ? '&' : '?';
                url += 'callback=JSON_CALLBACK';
                return $http.jsonp(url, options);
            }

        };
        return {
            'getDomainURL': function(domain) {
                var root = null;
                if (angular.isUndefined(domain) || domain === null || domain === '') {
                    root = ODSWidgetsConfig.defaultDomain;
                } else {
                    if (domain.substr(0, 1) !== '/' && domain.indexOf('.') === -1) {
                        root = domain+'.opendatasoft.com';
                    } else {
                        root = domain;
                    }
                    if (root.substr(0, 1) !== '/' && root.indexOf('http://') === -1 && root.indexOf('https://') === -1) {
                        root = 'https://' + root;
                    }
                }

                if (root.substr(-1) === '/') {
                    // Remove trailing slash
                    root = root.substr(0, root.length-1);
                }

                return root;
            },
            'datasets': {
                'get': function(context, datasetID, parameters) {
                    return request(context, '/api/datasets/1.0/'+datasetID+'/', parameters);
                },
                'search': function(context, parameters) {
                    var queryParameters = angular.extend({}, context.parameters, parameters);
                    return request(context, '/api/datasets/1.0/search/', queryParameters);
                },
                'facets': function(context, facetName) {
                    return this.search(context, {'rows': 0, 'facet': facetName});
                }
            },
            'records': {
                // FIXME: Why don't we implicitely use the parameters from the context, instead of requiring the widgets
                // to explicitely send them together with the other parameters?
                'analyze': function(context, parameters) {
//                    return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'search': function(context, parameters) {
                    return request(context, '/api/records/1.0/search/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'download': function(context, parameters) {
                    return request(context, '/api/records/1.0/download/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'geo': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geocluster/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geopreview': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geopreview/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'boundingbox': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/boundingbox/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                }
            },
            'reuses': function(context, parameters) {
                return request(context, '/explore/reuses/', parameters);
            }
        };
    }]);

    mod.provider('ModuleLazyLoader', function() {
        // We always load from https://, because if we don't put a scheme in the URL, local testing (from filesystem)
        // will look at file:// URLs and won't work.
        var lazyloading = {
            'highcharts': {
                'css': [],
                'js': [
                    ["https://code.highcharts.com/3.0.10/highcharts.js"],
                    ["https://code.highcharts.com/3.0.10/modules/no-data-to-display.js"],
                    ["https://code.highcharts.com/3.0.10/highcharts-more.js"]
                ]
            },
            'leaflet': {
                'css': [
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css",
                    "https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/leaflet.fullscreen.css",
                    "https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.css",
                    "libs/ods-geobox/geobox.css",
                    "libs/ods-vectormarker/vectormarker.css",
                    "libs/ods-clustermarker/clustermarker.css",
                    "libs/leaflet-label/leaflet.label.css"
                ],
                'js': [
                    [
                        "L@https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"
                    ],
                    [
                        "L.Control.FullScreen@https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/Leaflet.fullscreen.min.js",
                        "L.Control.Locate@https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.js",
                        "L.Label@libs/leaflet-label/leaflet.label.js",
                        "L.ODSMap@libs/ods-map/ods-map.js",
                        "L.ODSTileLayer@libs/ods-map/ods-tilelayer.js",
                        "L.Control.GeoBox@libs/ods-geobox/geobox.js",
                        "L.VectorMarker@libs/ods-vectormarker/vectormarker.js",
                        "L.ClusterMarker@libs/ods-clustermarker/clustermarker.js"
                    ]
                ]
            },
            'rome': {
                'css': ['libs/rome/rome.css'],
                'js': ['libs/rome/rome.standalone.js']
            }
        };

        this.getConfig = function() {
            return lazyloading;
        };

        var objectIsDefined = function(scope, name) {
            var nameParts = name.split('.');
            if (scope.hasOwnProperty(nameParts[0]) && angular.isDefined(scope[nameParts[0]])) {
                if (nameParts.length === 1) {
                    return true;
                } else {
                    var newScope = scope[nameParts[0]];
                    nameParts.shift();
                    return objectIsDefined(newScope, nameParts.join('.'));
                }
            } else {
                return false;
            }
        };

        var isAlreadyAvailable = function(objectName) {
            return objectIsDefined(window, objectName);
        };

        this.$get = ['$q', 'ODSWidgetsConfig', function($q, ODSWidgetsConfig) {
            var loading = {};
            var loaded = [];

            var lazyload = function(type, url) {
                if (angular.isDefined(loading[url])) {
                    return loading[url];
                } else {
                    var deferred = $q.defer();
                    // If it is a relative URL, make it relative to ODSWidgetsConfig.basePath
                    var realURL =  url.substring(0, 1) === '/'
                                || url.substring(0, 7) === 'http://'
                                || url.substring(0, 8) === 'https://' ? url : ODSWidgetsConfig.basePath + url;
                    LazyLoad[type](realURL, function() {
                        loaded.push(url);
                        deferred.resolve();
                    });
                    loading[url] = deferred;
                    return deferred;
                }
            };

            return function(name) {
                var module = lazyloading[name];
                var promises = [];

                for (var i=0; i<module.css.length; i++) {
                    if (loaded.indexOf(module.css[i]) === -1) {
                        promises.push(lazyload('css', module.css[i]).promise);
                    }
                }

                var jsDeferred = $q.defer();
                var deferredSteps = null;
                for (var j=0; j<module.js.length; j++) {
                    // Each item is a step in a sequence
                    var step = module.js[j];
                    if (!angular.isArray(step)) {
                        step = [step];
                    }

                    var stepPromises = [];
                    for (var k=0; k<step.length; k++) {
                        var parts = step[k].split('@');
                        var url;
                        if (parts.length > 1) {
                            // There is an object name whose existence we can check
                            if (isAlreadyAvailable(parts[0])) {
                                continue;
                            }
                            url = parts[1];
                        } else {
                            url = parts[0];
                        }
                        if (loaded.indexOf(url) === -1) {
                            stepPromises.push(lazyload('js', url).promise);
                        }
                    }
                    if (!deferredSteps) {
                        deferredSteps = $q.all(stepPromises);
                    } else {
                        deferredSteps = deferredSteps.then(function() {
                            return $q.all(stepPromises);
                        });
                    }
                }
                deferredSteps.then(function() { jsDeferred.resolve(); });
                promises.push(jsDeferred.promise);
                return $q.all(promises);
            };
        }];
    });

    mod.factory("DebugLogger", ['$window', function($window) {
        // TODO: Don't duplicate our own DebugLogger
        return {
            log: function() {
                if ($window.location.hash == '#debug' || $window.location.hash.indexOf('debug=') >= 0 || $(document.body).hasClass('showDebug')) {
                    console.log.apply(console, arguments);
                }
            }
        };
    }]);

    mod.factory("odsErrorService", function() {
        var notificationList = [];
        return {
            registerForErrorNotification: function(callback) {
                notificationList.push(callback);
            },
            sendErrorNotification: function(error) {
                if (angular.isString(error)) {
                    error = {
                        title: 'Error',
                        error: error
                    };
                }
                angular.forEach(notificationList, function(callback) {
                    callback(error);
                });
            },
            markErrorAsHandled: function(error) {
                error.handled = true;
            }
        };
    });
}());
