(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTimerange', ['ModuleLazyLoader', function(ModuleLazyLoader) {
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
                from: '=?'
            },
            template: '<div class="odswidget odswidget-timerange">' +
                    '<span class="odswidget-timerange__from"><span translate>From</span> <input type="text"></span>' +
                    '<span class="odswidget-timerange__to"><span translate>to</span> <input type="text"></span>' +
                '</div>',
            link: function(scope, element, attrs) {
                var inputs = element.find('input');
                scope.dateFormat = scope.dateFormat || 'YYYY-MM-DD HH:mm';
                // Handle default values
                if (angular.isDefined(scope.defaultFrom)) {
                    inputs[0].value = computeDefaultTime(scope.defaultFrom).format(scope.dateFormat);
                    scope.from = formatTimeToISO(computeDefaultTime(scope.defaultFrom));
                }

                if (angular.isDefined(scope.defaultTo)) {
                    inputs[1].value = computeDefaultTime(scope.defaultTo).format(scope.dateFormat);
                    scope.to = formatTimeToISO(computeDefaultTime(scope.defaultTo));
                }

                ModuleLazyLoader('rome').then(function() {
                    if (typeof scope.displayTime === "undefined") {
                        scope.displayTime = true;
                    } else {
                        scope.displayTime = (scope.displayTime === "true");
                    }

                    rome(inputs[0], angular.extend({}, romeOptions, {
                        time: scope.displayTime,
                        dateValidator: rome.val.beforeEq(inputs[1]),
                        initialValue: scope.defaultFrom,
                        inputFormat: scope.dateFormat
                    })).on('data', function(value) {
                        scope.$apply(function() {
                            scope.from = formatTimeToISO(moment(value, scope.dateFormat));
                        });
                    });
                    rome(inputs[1], angular.extend({}, romeOptions, {
                        time: scope.displayTime,
                        dateValidator: rome.val.afterEq(inputs[0]),
                        initialValue: scope.defaultTo,
                        inputFormat: scope.dateFormat
                    })).on('data', function(value) {
                        scope.$apply(function() {
                            scope.to = formatTimeToISO(moment(value, scope.dateFormat));
                        });
                    });
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

                $q.all(contexts.map(function(context) {
                    return context.wait().then(function(dataset) {
                        if (conf[context.name]['timefield'] === null) {
                            conf[context.name]['timefield'] = getTimeField(dataset);
                        }
                    });
                })).then(function() {
                    react(contexts, conf);
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
            }]
        };
    }]);

}());
