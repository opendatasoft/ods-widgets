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
         * @param {string} [showButton=false] display the "search" button
         * @param {string} button the text to display in the "search" button
         * @param {string} [field=none] The name of a field you want to restrict the search on (i.e. only search on the textual content of a specific field).
         * The search will be a simple text search and won't support any query language or operators.
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @description
         * This widget displays a search box that can be used to do a full-text search on a context.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-text-search">' +
            '    <form ng-submit="applySearch()" class="odswidget-text-search__form">' +
            '        <input class="odswidget-text-search__search-box" name="q" type="text" ng-model="searchExpression" placeholder="{{ translatedPlaceholder }}">' +
            '        <button type="submit" class="odswidget-text-search__submit"><i class="fa fa-search"></i></button>' +
            '    </form>' +
            '</div>',
            scope: {
                placeholder: '@?',
                button: '@?',
                context: '=',
                field: '@'
            },
            controller: ['$scope', 'translate', function($scope, translate) {
                var unwatch = $scope.$watch('context', function(nv, ov) {
                    if (nv) {
                        $scope.searchExpression = $scope.context.parameters.q;
                        unwatch();
                    }
                });

                var placeholderUnwatcher = $scope.$watch('placeholder', function (nv, ov) {
                    if (nv) {
                        $scope.translatedPlaceholder = translate($scope.placeholder);
                        placeholderUnwatcher();
                    }
                });

                $scope.applySearch = function() {
                    if ($scope.field && $scope.searchExpression) {
                        $scope.context.parameters.q = $scope.field + ':"' + $scope.searchExpression + '"';
                    } else {
                        $scope.context.parameters.q = $scope.searchExpression;
                    }
                };
            }]
        };
    });

}());