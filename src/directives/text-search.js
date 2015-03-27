(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTextSearch', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTextSearch
         * @scope
         * @restrict E
         * @param {string} placeholder the text to display as a placeholder when the searchbox is empty
         * @param {string} button the text to display in the "search" button
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @description
         * This widget displays a search box that can be used to do a full-text search on a context.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-text-search">' +
                    '<form ng-submit="applySearch()">' +
                    '<input class="searchbox" name="q" type="text" ng-model="searchExpression" placeholder="{{placeholder}}">' +
                    '<button ng-bind="buttonText"></button>' +
                    '</form>' +
                '</div>',
            scope: {
                placeholder: '@?',
                button: '@?',
                context: '='
            },
            controller: ['$scope', 'translate', function($scope, translate) {
                $scope.buttonText = $scope.button || translate("Search");
                
                var unwatch = $scope.$watch('context', function(nv, ov) {
                    if (nv) {
                        $scope.searchExpression = $scope.context.parameters.q;
                        unwatch();
                    }
                });

                $scope.applySearch = function() {
                    $scope.context.parameters.q = $scope.searchExpression;
                };
            }]
        };
    });

}());