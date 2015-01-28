(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsSearchbox', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSearchbox
         * @scope
         * @restrict E
         * @param {string} placeholder the text to display as a placeholder when the searchbox is empty
         * @param {CatalogContext} [context=none] {@link ods-widgets.directive:odsCatalogContext Catalog Context} indicating the domain to redirect the user to show the search results.
         * If none, the search is done on the local domain (/explore/ of the current domain the user is).
         * @description
         * This widget displays a wide searchbox that redirects the search on the Explore homepage of the domain.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-searchbox">' +
                    '<form method="GET" action="{{ actionUrl }}" ng-if="actionUrl">' +
                    '<input class="searchbox" name="q" type="text" placeholder="{{placeholder}}">' +
                    '</form>' +
                '</div>',
            scope: {
                placeholder: '@',
                context: '='
            },
            controller: ['$scope', '$sce', function($scope, $sce) {
                $scope.actionUrl = '/explore/';

                var unwatch = $scope.$watch('context', function(nv) {
                    if (nv) {
                        $scope.actionUrl = $sce.trustAsResourceUrl($scope.context.domainUrl + $scope.actionUrl);
                        unwatch();
                    }
                });
            }]
        };
    });

}());