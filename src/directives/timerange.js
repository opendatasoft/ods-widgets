(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTimerange', ['ModuleLazyLoader', function(ModuleLazyLoader) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTimerange
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} [timeField=first date/datetime field available] Name of the field (date or datetime) to filter on
         * @param {string} [defaultFrom=none] Default datetime for the "from" field: either "yesterday" or "now"
         * @param {string} [defaultTo=none] Default datetime for the "to" field: either "yesterday" or "now"
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
         */
        var romeOptions = {
            styles: {
                container: "rd-container odswidgets-rd-container"
            },
            weekStart: 1
        };
        var computeDefaultTime = function(value) {
            if (value === 'yesterday') {
                return moment().subtract('days', 1).format('YYYY-MM-DD HH:mm');
            } else if (value === 'now') {
                return moment().format('YYYY-MM-DD HH:mm');
            } else {
                return null;
            }
        };
        var formatTimeToISO = function(time) {
            if (time) {
                return moment(time).toISOString().replace('.000Z', 'Z');
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
                defaultTo: '@?'
            },
            template: '<div class="odswidget odswidget-timerange">' +
                    '<span class="odswidget-timerange-from"><span translate>From</span> <input type="text"></span>' +
                    '<span class="odswidget-timerange-to"><span translate>to</span> <input type="text"></span>' +
                '</div>',
            link: function(scope, element, attrs) {
                var inputs = element.find('input');

                // Handle default values
                if (angular.isDefined(scope.defaultFrom)) {
                    inputs[0].value = computeDefaultTime(scope.defaultFrom);
                    scope.from = formatTimeToISO(inputs[0].value);
                }
                if (angular.isDefined(scope.defaultTo)) {
                    inputs[1].value = computeDefaultTime(scope.defaultTo);
                    scope.to = formatTimeToISO(inputs[1].value);
                }

                ModuleLazyLoader('rome').then(function() {
                    rome(inputs[0], angular.extend({}, romeOptions, {
                        dateValidator: rome.val.beforeEq(inputs[1])
                    })).on('data', function(value) {
                            // Format is YYYY-MM-DD HH:MM, local time
                        scope.$apply(function() {
                            scope.from = formatTimeToISO(value);
                        });
                    });
                    rome(inputs[1], angular.extend({}, romeOptions, {
                        dateValidator: rome.val.afterEq(inputs[0])
                    })).on('data', function(value) {
                        scope.$apply(function() {
                            scope.to = formatTimeToISO(value);
                        });
                    });
                });
            },
            controller: ['$scope', function($scope) {
                var timeField = $scope.timeField;

                var runWatcher = function() {
                    $scope.$watch('[from, to]', function(nv) {
                        if (nv[0] && nv[1]) {
                            $scope.context.parameters.q = timeField+':[' + $scope.from + ' TO ' + $scope.to + ']';
                        }
                    }, true);
                };

                if (angular.isUndefined(timeField)) {
                    // FIXME: By setting our filters later, we take the risk of having a first query sent somewhere else (e.g. a table) both before and after the filter.

                    // We need to gather the time field before applying our filter
                    var init = $scope.$watch('context.dataset', function(nv) {
                        if (nv) {
                            var timeFields = nv.fields.filter(function(item) { return item.type === 'date' || item.type === 'datetime'; });
                            if (timeFields.length > 1) {
                                console.log('Warning: the dataset "'+nv.datasetid+'" has more than one date or datetime field, the first date or datetime field will be used. You can specify the field to use using the "time-field" parameter.');
                            }
                            if (timeFields.length === 0) {
                                console.log('Error: the dataset "'+nv.datasetid+'" doesn\'t have any date or datetime field, which is required for the Timerange widget.');
                            }
                            timeField = timeFields[0].name;
                            runWatcher();
                            init();
                        }
                    });
                } else {
                    runWatcher();
                }

            }]
        };
    }]);

}());
