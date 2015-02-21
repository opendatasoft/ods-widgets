(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTimescale', function() {
        /**
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsTimescale
         *  @restrict E
         *  @scope
         *  @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} or array of context to use
         *  @param {string=} [timeField=first date/datetime field available] Name of the field (date or datetime) to filter on
         *  @param {string=} [*TimeField=first date/datetime field available] For each context you can set the name of the field (date or datetime) to filter on
         *  @param {string=} [defaultValue=everything] Define the default timescale
         *  @description
         * Displays a control to select either:
         *
         * * last day
         *
         * * last week
         *
         * * last month
         *
         * * last year
         *
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul" cibul-domain="public.opendatasoft.com" cibul-dataset="evenements-publics-cibul">
         *              <ods-timescale context="cibul" default-value="day"></ods-timescale>
         *              <ods-map context="cibul"></ods-map>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         */
         // TODO merge controller with timerange
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                timeField: '@',
                defaultValue: '@'
            },
            template: '<div class="odswidget odswidget-timescale">' +
                '<ul>' +
                    '<li ng-class="{\'active\': scale == \'everything\' || !scale}"><a href="#" ng-click="scale = \'everything\'; $event.preventDefault();" translate>Everything</a></li>' +
                    '<li ng-class="{\'active\': scale == \'year\'}"><a href="#" ng-click="scale = \'year\'; $event.preventDefault();" translate>Last 12 months</a></li>' +
                    '<li ng-class="{\'active\': scale == \'month\'}"><a href="#" ng-click="scale = \'month\'; $event.preventDefault();" translate>Last 4 weeks</a></li>' +
                    '<li ng-class="{\'active\': scale == \'week\'}"><a href="#" ng-click="scale = \'week\'; $event.preventDefault();" translate>Last 7 days</a></li>' +
                    '<li ng-class="{\'active\': scale == \'day\'}"><a href="#" ng-click="scale = \'day\'; $event.preventDefault();" translate>Last 24 hours</a></li>' +
                '</ul>' +
                '</div>',
            controller: ['$scope', '$attrs', '$q', function($scope, $attrs, $q) {
                var contexts = [];
                var timeFields = {};

                // We need to gather the time field before applying our filter
                var setTimeField = function(dataset) {
                    if (dataset) {
                        var fields = dataset.fields.filter(function(item) { return item.type === 'date' || item.type === 'datetime'; });
                        if (fields.length > 1) {
                            console.log('Warning: the dataset "' + dataset.getUniqueId() + '" has more than one date or datetime field, the first date or datetime field will be used. You can specify the field to use using the "time-field" parameter.');
                        }
                        if (fields.length === 0) {
                            console.log('Error: the dataset "' + dataset.getUniqueId() + '" doesn\'t have any date or datetime field, which is required for the Timerange widget.');
                        }
                        timeFields[dataset.getUniqueId()] = fields[0].name;
                    }
                };

                if (!angular.isArray($scope.context)) {
                    contexts.push($scope.context);
                } else {
                    contexts = $scope.context;
                }

                $q.all(contexts.map(function(context) {
                    return context.wait().then(function(dataset) {
                        if (angular.isDefined($attrs[context.name + "TimeField"])) {
                            timeFields[context.dataset.getUniqueId()] = $attrs[context.name + "TimeField"];
                        } else if ($scope.timeField) {
                            timeFields[context.dataset.getUniqueId()] = $scope.timeField;
                        } else {
                            setTimeField(dataset);
                        }
                    });
                })).then(function() {
                    react(contexts, timeFields);
                });

                var react = function(contexts, timeFields) {
                    $scope.scale = $scope.defaultValue || 'everything';
                    $scope.$watch('scale', function(scale) {
                        if (scale === 'everything') {
                            angular.forEach(contexts, function(context) {
                                delete context.parameters.q;
                            });
                            return;
                        }
                        var q = null;
                        var now = new Date();
                        if (scale === 'day') {
                            now.setDate(now.getDate()-1);
                        } else if (scale === 'week') {
                            now.setDate(now.getDate()-7);
                        } else if (scale === 'month') {
                            now.setMonth(now.getMonth()-1);
                        } else if (scale === 'year') {
                            now.setFullYear(now.getFullYear()-1);
                        }
                        q = now.toISOString();

                        angular.forEach(contexts, function(context) {
                            context.parameters.q = timeFields[context.dataset.getUniqueId()] + '>="' + q + '"';
                        });
                    }, true);
                };
            }]
        };
    });

}());
