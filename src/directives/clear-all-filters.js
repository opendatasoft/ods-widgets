(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsClearAllFilters', function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsClearAllFilters
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context 
         * {@link ods-widgets.directive:odsCatalogContext Catalog Context} or 
         * {@link ods-widgets.directive:odsDatasetContext Dataset Context} to display the filters of, or a list of 
         * contexts
         * @param {String[]} except An array of parameters to exclude from the clearing operation
         * 
         * @description
         * The odsClearAllFilters widget displays a button that will clear all active filters in the given context.
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                except: '='
            },
            template: '' +
            '<a class="odswidget-clear-all-filters" href="" ng-click="clearAll()">' +
            '    <i class="fa fa-ban" aria-hidden="true"></i> ' +
            '    <span translate>Clear all</span>' +
            '</a>',
            controller: ['$scope', function ($scope) {

                $scope.clearAll = function () {
                    var excepts = $scope.except ? $scope.except : [];
                    var contexts = $scope.context;
                    if (!angular.isArray($scope.context)) {
                        contexts = [$scope.context];
                    }
                    angular.forEach(contexts, function (context) {
                        angular.forEach(context.getActiveFilters(excepts), function (k) {
                            delete context.parameters[k];
                        });
                    });
                    return false;
                };

            }]
        };
    });
})();
