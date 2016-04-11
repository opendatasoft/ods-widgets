(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsClearAllFilters', function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsClearAllFilters
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to display the filters of
         * @description
         * This widget displays a button which will clear all active filters in the given context.
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '='
            },
            template: '' +
            '<a class="odswidget-clear-all-filters" href="" ng-click="clearAll()">' +
            '    <i class="fa fa-ban"></i> ' +
            '    <span translate>Clear all</span>' +
            '</a>',
            controller: ['$scope', function ($scope) {
                $scope.clearAll = function() {
                    angular.forEach($scope.context.getActiveFilters(), function (k) {
                        delete $scope.context.parameters[k];
                    });
                    return false;
                };

            }]
        }
    });
})();
