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
         * @param {string} [timeField=first date/datetime field available] Name of the field (date or datetime) to filter on
         * @param {string} [defaultFrom=none] Default datetime for the "from" field: either "yesterday", "now" or a string representing a date
         * @param {string} [defaultTo=none] Default datetime for the "to" field: either "yesterday", "now" or a string representing a date
         * @param {string} [displayTime=true] Define if the date selector displays the time selector as well
         * @param {string} [dateFormat='YYYY-MM-DD HH:mm'] Define the format for the date displayed in the inputs
         * @param {string} [labelFrom='From'] Set the label before the first input
         * @param {string} [labelTo='to'] Set the label before the second input
         * @param {string} [placeholderFrom=''] Set the label before the first input
         * @param {string} [placeholderTo=''] Set the label before the second input
         * @description
         * This widget displays two fields to select the two bounds of a date and time range.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul" cibul-domain="public.opendatasoft.com" cibul-dataset="evenements-publics-cibul">
         *              <ods-timerange context="cibul" default-from="yesterday" default-to="now"></ods-timerange>
         *              <ods-map context="cibul"></ods-map>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         *
         * Example with multiple contexts set by ods-timerange
         *  @example
         *  <ods-dataset-context
         *          context="cibul,medecins"
         *          cibul-domain="public.opendatasoft.com"
         *          cibul-dataset="evenements-publics-cibul"
         *          medecins-domain="public.opendatasoft.com"
         *          medecins-dataset="donnees-sur-les-medecins-accredites">
         *      <ods-timerange context="[cibul,medecins]" default-from="yesterday" default-to="now"></ods-timerange>
         *      <ods-map context="cibul"></ods-map>
         *      <ods-map context="medecins"></ods-map>
         *  </ods-dataset-context>
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
            '        <span ng-bind="labelFrom"></span> ' +
            '        <input type="text" placeholder="{{ placeholderFrom }}">' +
            '    </div>' +
            '    <div class="odswidget-timerange__to">' +
            '        <span ng-bind="labelTo"></span> ' +
            '        <input type="text" placeholder="{{ placeholderTo }}">' +
            '    </div>' +
            '</div>',
            link: function(scope, element, attrs) {
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
                        parameterName = parameterName + '.timerange';
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
                        scope.$apply(function() {
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
                        scope.$apply(function() {
                            var to = roundTime(moment(value, scope.dateFormat), scope.dateFormat, scope.displayTime, 'to');
                            toRome.setValue(to);
                            scope.to = formatTimeToISO(to);
                        });
                    });

                    var areAllParametersEmpty = function () {
                        var contexts = angular.isArray(scope.context) ? scope.context : [scope.context];
                        return contexts.reduce(function (allEmpty, context) {
                            return allEmpty && !context.parameters[getParameterName(context)];
                        }, true);
                    };

                    scope.$watch(areAllParametersEmpty, function (nv, ov) {
                        if (nv && !ov) {
                            inputs.val(null);
                        }
                    }, true)
                });
            },
            controller: ['$scope', '$attrs', '$q', '$compile', '$rootScope', '$parse', function($scope, $attrs, $q, $compile, $rootScope, $parse) {
                var contexts = [],
                    conf = {};

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
                    $scope.$watch('[from, to]', function(nv) {
                        if (nv[0] && nv[1]) {
                            angular.forEach(contexts, function(context) {
                                var parameterName = configurations[context.name]['parameter'];
                                var evaluationScope = {};
                                evaluationScope.$to = $scope.to;
                                evaluationScope.$from = $scope.from;
                                evaluationScope.$field = configurations[context.name]['timefield'];
                                if (['q', 'rq'].indexOf(parameterName) > -1) {
                                    // Naming the parameter to prevent overwriting between widgets
                                    parameterName = parameterName + '.timerange';
                                }
                                context.parameters[parameterName] = configurations[context.name]['formatter'](evaluationScope);
                            });
                        }
                    }, true);
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
