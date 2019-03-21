(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTimerange', ['ModuleLazyLoader', 'translate', 'odsTimerangeParser', function(ModuleLazyLoader, translate, odsTimerangeParser) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTimerange
         * @restrict E
         * @scope
         * @param {DatasetContext|DatasetContext[]} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} or array of context to use
         * @param {string=} [timeField=first date/datetime field available] The value is the name of the field (date or datetime) to filter on.<br><br><em>Use this form if you apply the timerange to only one context.</em>
         * @param {string=} [{context}TimeField=first date/datetime field available] The value is the name of the field (date or datetime) to filter on.<br><br><em>Use this form when you apply the timerange to multiple contexts. {context} must be replaced by the context name.</em>
         * @param {string} [defaultFrom=none] Default datetime for the "from" field: either "yesterday", "now" or a string representing a date
         * @param {string} [defaultTo=none] Default datetime for the "to" field: either "yesterday", "now" or a string representing a date
         * @param {string} [displayTime=true] Define if the date selector displays the time selector as well
         * @param {string} [dateFormat='YYYY-MM-DD HH:mm'] Define the format for the date displayed in the inputs
         * @param {string} [suffix='fieldname'] (optional) Add a suffix to the q.timerange, q.from_date or q.to_date parameter. This prevents widgets from overriding each other.
         * @param {string} [labelFrom='From'] Set the label before the first input
         * @param {string} [labelTo='to'] Set the label before the second input
         * @param {string} [placeholderFrom=''] Set the label before the first input
         * @param {string} [placeholderTo=''] Set the label before the second input
         * @param {string} [to=none] Set a variable that will get the iso formatted value of the first input
         * @param {string} [from=none] Set a variable that will get the iso formatted value of the second input
         * @description
         * This widget displays two fields to select the two bounds of a date and time range.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul" cibul-domain="public.opendatasoft.com" cibul-dataset="evenements-publics-cibul">
         *              <ods-timerange context="cibul" default-from="yesterday" default-to="now"></ods-timerange>
         *              <ods-table context="cibul"></ods-table>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         *
         */
         // TODO merge controller with timescale
        var romeOptions = {
            styles: {
                container: "rd-container odswidgets-rd-container"
            },
            weekStart: 1
        };
        var computeDefaultTime = function(value) {
            if (value === 'yesterday') {
                return moment().subtract('days', 1);
            } else if (value === 'now') {
                return moment();
            } else if (angular.isString(value)) {
                return moment(value);
            } else {
                return null;
            }
        };
        var formatTimeToISO = function(time) {
            if (time) {
                return moment(time).milliseconds(0).toISOString().replace('.000Z', 'Z');
            } else {
                return null;
            }
        };
        var roundTime = function (time, dateFormat, displayTime, role) {
            if (typeof time === 'string') {
                time = moment(time, dateFormat);
            }
            if (displayTime === 'false' || displayTime === false) {
                if (role === 'from') {
                    time.milliseconds(0);
                    if (dateFormat.indexOf('H') === -1 && dateFormat.indexOf('h') === -1 && dateFormat.indexOf('LLL') === -1 && dateFormat.indexOf('LT') === -1) {
                        time.hours(0);
                    }
                    if (dateFormat.indexOf('m') === -1 && dateFormat.indexOf('LLL') === -1 && dateFormat.indexOf('LT') === -1) {
                        time.minutes(0);
                    }
                    if (dateFormat.indexOf('s') === -1 && dateFormat.indexOf('LTS') === -1) {
                        time.seconds(0);
                    }
                }
                if (role === 'to') {
                    time.milliseconds(999);
                    if (dateFormat.indexOf('H') === -1 && dateFormat.indexOf('h') === -1 && dateFormat.indexOf('LLL') === -1 && dateFormat.indexOf('LT') === -1) {
                        time.hours(23);
                    }
                    if (dateFormat.indexOf('m') === -1 && dateFormat.indexOf('LLL') === -1 && dateFormat.indexOf('LT') === -1) {
                        time.minutes(59);
                    }
                    if (dateFormat.indexOf('s') === -1 && dateFormat.indexOf('LTS') === -1) {
                        time.seconds(59);
                    }
                }
            }
            return time;
        };

        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                timeField: '@?',
                defaultFrom: '@?',
                defaultTo: '@?',
                displayTime: '@?',
                dateFormat: '@?',
                suffix: '@?',
                to: '=?',
                from: '=?',
                labelFrom: '@?',
                labelTo: '@?',
                placeholderFrom: '@?',
                placeholderTo: '@?'
            },
            template: '' +
            '<div class="odswidget odswidget-timerange">' +
            '    <div class="odswidget-timerange__from">' +
            '        <span class="odswidget-timerange__label" ng-bind="labelFrom"></span>' +
            '        <input type="text" placeholder="{{ placeholderFrom }}" class="odswidget-timerange__input">' +
            '        <button type="reset" class="odswidget-timerange__reset" ng-show="from" ng-click="resetSearchFrom()" aria-label="Reset search" translate="aria-label">' +
            '           <i class="fa fa-times-circle" aria-hidden="true"></i>' +
            '        </button>' +
            '    </div>' +
            '    <div class="odswidget-timerange__to">' +
            '        <span class="odswidget-timerange__label" ng-bind="labelTo"></span>' +
            '        <input type="text" placeholder="{{ placeholderTo }}" class="odswidget-timerange__input">' +
            '        <button type="reset" class="odswidget-timerange__reset" ng-show="to" ng-click="resetSearchTo()" aria-label="Reset search" translate="aria-label">' +
            '           <i class="fa fa-times-circle" aria-hidden="true"></i>' +
            '        </button>' +
            '    </div>' +
            '</div>',
            link: function(scope, element, attrs) {
                var formattedSuffix = !angular.isUndefined(scope.suffix) ? ('.' + scope.suffix) : '';

                scope.labelFrom = angular.isDefined(scope.labelFrom) ? scope.labelFrom : translate('From');
                scope.labelTo = angular.isDefined(scope.labelTo) ? scope.labelTo : translate('to');
                var inputs = element.find('input');
                var defaultDateFormat = 'YYYY-MM-DD HH:mm';
                if (angular.isDefined(scope.displayTime) && scope.displayTime === 'false') {
                    defaultDateFormat = 'YYYY-MM-DD';
                }
                scope.dateFormat = scope.dateFormat || defaultDateFormat;

                // Handle default values
                // First step: override defaultFrom and defaultTo with values from context's parameters
                var getParameterName = function (context) {
                    var parameterName =  attrs[context.name + "ParameterName"] || 'q';
                    if (['q', 'rq'].indexOf(parameterName) > -1) {
                        // Naming the parameter to prevent overwriting between widgets
                        parameterName = parameterName + '.timerange' + formattedSuffix ;
                    }
                    return parameterName;
                };
                var parameterValue;
                if (angular.isArray(scope.context)) {
                    parameterValue = scope.context[0].parameters[getParameterName(scope.context[0])];
                } else {
                    parameterValue = scope.context.parameters[getParameterName(scope.context)];
                }

                if (angular.isDefined(parameterValue)) {
                    var parsedRange = odsTimerangeParser(parameterValue);
                    if (parsedRange.field === scope.timeField) {
                        scope.defaultFrom = parsedRange.from;
                        scope.defaultTo = parsedRange.to;
                    }
                }
                // Second step: parse defaultTo and defaultFrom and fill in the model
                if (angular.isDefined(scope.defaultFrom)) {
                    var from = roundTime(computeDefaultTime(scope.defaultFrom), scope.dateFormat, scope.displayTime, 'from');
                    inputs[0].value = from.format(scope.dateFormat);
                    scope.from = formatTimeToISO(from);
                }

                if (angular.isDefined(scope.defaultTo)) {
                    var to = roundTime(computeDefaultTime(scope.defaultTo), scope.dateFormat, scope.displayTime, 'to');
                    inputs[1].value = to.format(scope.dateFormat);
                    scope.to = formatTimeToISO(to);
                }
                // Init rome calendar plugin
                ModuleLazyLoader('rome').then(function() {
                    if (typeof scope.displayTime === "undefined") {
                        scope.displayTime = true;
                    } else {
                        scope.displayTime = (scope.displayTime === "true");
                    }

                    var fromRome = rome(inputs[0], angular.extend({}, romeOptions, {
                        time: scope.displayTime,
                        dateValidator: rome.val.beforeEq(inputs[1]),
                        initialValue: scope.defaultFrom,
                        inputFormat: scope.dateFormat
                    }));
                    fromRome.on('data', function(value) {
                        scope.$applyAsync(function() {
                            var from = roundTime(moment(value, scope.dateFormat), scope.dateFormat, scope.displayTime, 'from');
                            $(inputs[0]).val(from.format(scope.dateFormat));
                            fromRome.setValue(from);
                            scope.from = formatTimeToISO(from);
                        });
                    });
                    var toRome = rome(inputs[1], angular.extend({}, romeOptions, {
                        time: scope.displayTime,
                        dateValidator: rome.val.afterEq(inputs[0]),
                        initialValue: scope.defaultTo,
                        inputFormat: scope.dateFormat
                    }));
                    toRome.on('data', function(value) {
                        scope.$applyAsync(function() {
                            var to = roundTime(moment(value, scope.dateFormat), scope.dateFormat, scope.displayTime, 'to');
                            toRome.setValue(to);
                            scope.to = formatTimeToISO(to);
                        });
                    });

                    var isFromRangeParametersEmpty = function () {
                        var isEmpty = true;
                        var contexts = angular.isArray(scope.context) ? scope.context : [scope.context];
                        angular.forEach(contexts, function(context){
                             angular.forEach(context.parameters, function(query, parameter){
                                if (parameter.indexOf('from_date') !== -1 || parameter.indexOf('timerange') !== -1){
                                    isEmpty = false;
                                }
                            });
                        });
                        return isEmpty;
                    };

                    var isToRangeParametersEmpty = function () {
                        var isEmpty = true;
                        var contexts = angular.isArray(scope.context) ? scope.context : [scope.context];
                        angular.forEach(contexts, function(context){
                             angular.forEach(context.parameters, function(query, parameter){
                                if (parameter.indexOf('to_date') !== -1 || parameter.indexOf('timerange') !== -1){
                                    isEmpty = false;
                                }
                            });
                        });
                        return isEmpty;
                    };

                    scope.$watch(isFromRangeParametersEmpty, function (nv, ov) {
                        if (nv && !ov) {
                            scope.resetSearchFrom();
                        }
                    }, true);

                    scope.$watch(isToRangeParametersEmpty, function (nv, ov) {
                        if (nv && !ov) {
                            scope.resetSearchTo();
                        }
                    }, true);

                    scope.resetSearchFrom = function(){
                        inputs[0].value = null;
                        scope.from = undefined;
                    };

                    scope.resetSearchTo = function(){
                        inputs[1].value = null;
                        scope.to = undefined;
                    };


                });
            },
            controller: ['$scope', '$attrs', '$q', '$compile', '$rootScope', '$parse', function($scope, $attrs, $q, $compile, $rootScope, $parse) {
                var contexts = [],
                    conf = {};

                var formattedSuffix = !angular.isUndefined($scope.suffix) ? ('.' + $scope.suffix) : '';

                // We need to gather the time field before applying our filter
                var getTimeField = function(dataset) {
                    if (dataset) {
                        var fields = dataset.fields.filter(function(item) { return item.type === 'date' || item.type === 'datetime'; });
                        if (fields.length > 1) {
                            console.log('Warning: the dataset "' + dataset.getUniqueId() + '" has more than one date or datetime field, the first date or datetime field will be used. You can specify the field to use using the "time-field" parameter.');
                        }
                        if (fields.length === 0) {
                            console.log('Error: the dataset "' + dataset.getUniqueId() + '" doesn\'t have any date or datetime field, which is required for the Timerange widget.');
                        }
                        return fields[0].name;
                    }
                    return null;
                };

                if (!angular.isArray($scope.context)) {
                    contexts.push($scope.context);
                    conf[$scope.context.name] = {};
                    if ($scope.timeField) {
                        conf[$scope.context.name]['timeField'] = $scope.timeField;
                    }
                } else {
                    contexts = $scope.context;
                }

                angular.forEach(contexts, function(context) {
                    conf[context.name] = {
                        timefield: conf[$scope.context.name] && conf[$scope.context.name]['timeField'] ? conf[$scope.context.name]['timeField'] : null,
                        formatter: $parse("$field + ':[' + $from + ' TO ' + $to + ']'"),
                        // formatter: $parse("$field"),
                        parameter: "q",

                    };

                    if (angular.isDefined($attrs[context.name + "ParameterFormatter"])) {
                        conf[context.name]['formatter'] = $parse($attrs[context.name + "ParameterFormatter"]);
                    }
                    if (angular.isDefined($attrs[context.name + "ParameterName"])) {
                        conf[context.name]['parameter'] = $attrs[context.name + "ParameterName"];
                    }
                    if (angular.isDefined($attrs[context.name + "TimeField"])) {
                        conf[context.name]['timefield'] = $attrs[context.name + "TimeField"];
                    }
                });



                var react = function(contexts, configurations) {
                    var dates;
                    $scope.$watch('[from, to]', function(nv) {
                        if (nv[0] && nv[1]) {
                            dates = ['from_date', 'to_date'];
                            angular.forEach(contexts, function(context) {
                                var parameterName = configurations[context.name]['parameter'];
                                var evaluationScope = {};
                                evaluationScope.$to = $scope.to;
                                evaluationScope.$from = $scope.from;
                                evaluationScope.$field = configurations[context.name]['timefield'];
                                if (['q', 'rq'].indexOf(parameterName) > -1) {
                                    // Naming the parameter to prevent overwriting between widgets
                                    parameterName = parameterName + '.timerange' + formattedSuffix ;
                                }
                                context.parameters[parameterName] = configurations[context.name]['formatter'](evaluationScope);

                                // if a single date in range was used, remove it
                                deleteUsedDate(context, configurations, dates);
                            });
                        } else if (nv[0] && !nv[1]) {
                            dates = ['to_date', 'timerange'];
                            angular.forEach(contexts, function(context){
                                context.parameters[getParameterName(context, configurations, 'from_date')] = configurations[context.name]['timefield'] + '>="' + nv[0] + '"';
                                deleteUsedDate(context, configurations, dates);
                            });
                        } else if (nv[1] && !nv[0]) {
                            dates = ['from_date', 'timerange'];
                            angular.forEach(contexts, function(context){
                                context.parameters[getParameterName(context, configurations, 'to_date')] = configurations[context.name]['timefield'] + '<="' + nv[1] + '"';
                                deleteUsedDate(context, configurations, dates);
                            });
                        } else {
                            dates = ['from_date', 'to_date', 'timerange'];
                            angular.forEach(contexts, function(context) {
                                deleteUsedDate(context, configurations, dates);
                            });
                        }
                    }, true);
                };

                var deleteUsedDate = function(context, configurations, dates){
                    angular.forEach(dates, function(date){
                        if (context.parameters[getParameterName(context, configurations, date)]) {
                            delete context.parameters[getParameterName(context, configurations, date)];
                        }
                    });
                };

                var getParameterName = function(context, configurations, type){
                  return configurations[context.name]['parameter'] + '.' + type + formattedSuffix ;
                };

                if (contexts.length == 1 && contexts[0].type == 'catalog') {
                    react(contexts, conf);
                } else {
                    $q.all(contexts.map(function(context) {
                        return context.wait().then(function(dataset) {
                            if (conf[context.name]['timefield'] === null) {
                                conf[context.name]['timefield'] = getTimeField(dataset);
                            }
                        });
                    })).then(function() {
                        react(contexts, conf);
                    });
                }
            }]
        };
    }]);

}());
