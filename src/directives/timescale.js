(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTimescale', function() {
        /**
        *  @ngdoc directive
        *  @name ods-widgets.directive:odsTimescale
        *  @restrict E
        *  @scope
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
        *  @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
        *  @param {string} timeField Name of the field (date or datetime) to filter on
        *
        *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul" cibul-domain="public.opendatasoft.com" cibul-dataset="evenements-publics-cibul">
         *              <ods-timescale context="cibul"></ods-timescale>
         *              <ods-map context="cibul"></ods-map>
         *          </ods-dataset-context>
         *     </file>
         * </example>
        */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                timeField: '@'
            },
            template: '<div class="odswidget odswidget-timescale">' +
                '<ul>' +
                    '<li ng-class="{\'active\': scale == \'everything\' || !scale}"><a href="#" ng-click="selectScale(\'everything\'); $event.preventDefault();" translate>Everything</a></li>' +
                    '<li ng-class="{\'active\': scale == \'year\'}"><a href="#" ng-click="selectScale(\'year\'); $event.preventDefault();" translate>Last 12 months</a></li>' +
                    '<li ng-class="{\'active\': scale == \'month\'}"><a href="#" ng-click="selectScale(\'month\'); $event.preventDefault();" translate>Last 4 weeks</a></li>' +
                    '<li ng-class="{\'active\': scale == \'week\'}"><a href="#" ng-click="selectScale(\'week\'); $event.preventDefault();" translate>Last 7 days</a></li>' +
                    '<li ng-class="{\'active\': scale == \'day\'}"><a href="#" ng-click="selectScale(\'day\'); $event.preventDefault();" translate>Last 24 hours</a></li>' +
                '</ul>' +
                '</div>',
            controller: ['$scope', function($scope) {
                var contexts = {};
                if (angular.isUndefined($scope.timeField)) {
                    // Try to guess the time field
                    var init = $scope.$watch('context', function(nv) {
                        if (nv) {
                            if (angular.isArray($scope.context)) {
                                angular.forEach($scope.context, function(item) { contexts[item.name] = {'context': item}; });
                            } else {
                                contexts[$scope.context.name] = {'context': $scope.context};
                            }

                            angular.forEach(contexts, function(ctx) {
                                var unwatch = $scope.$watch(function() { return ctx.context.dataset; }, function(nv) {
                                    if (nv) {
                                        var timeFields = nv.fields.filter(function(item) { return item.type === 'date' || item.type === 'datetime'; });
                                        if (timeFields.length > 1) {
                                            console.log('Error: the dataset "'+nv.datasetid+'" has more than one date or datetime field, the Timescale requires the name of the field to use.');
                                        }
                                        if (timeFields.length === 0) {
                                            console.log('Error: the dataset "'+nv.datasetid+'" doesn\'t have any date or datetime field, which is required for the Timescale widget.');
                                        }
                                        ctx.timeField = timeFields[0].name;

                                        unwatch();
                                    }
                                });
                            });
                            init();
                        }
                    });

                }
                $scope.selectScale = function(scale) {
                    $scope.scale = scale;
                    if (scale === 'everything') {
                        angular.forEach(contexts, function(ctx) {
                            delete ctx.context.parameters.q;
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
                    angular.forEach(contexts, function(ctx) {
                        if (ctx.timeField) {
                            ctx.context.parameters.q = ctx.timeField + '>="' + q + '"';
                        }
                    });
                };
            }]
        };
    });

}());
