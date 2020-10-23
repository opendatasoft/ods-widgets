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
         * @param {string} sort the default sort for the results
         * @param {CatalogContext} [context=none] {@link ods-widgets.directive:odsCatalogContext Catalog Context} indicating the domain to redirect the user to show the search results.
         * If none, the search is done on the local domain (/explore/ of the current domain the user is).
         * @param {string} [autofocus] Add the autofocus attribute (no need for a value) to set the focus in the text search input
         * @param {string} [formId=none] Configures the `id` attribute of the form generated internally by the widget, which can be used from other HTML elements (for example
         * to submit the search from another button)
         *
         * @description
         * This widget displays a wide searchbox that redirects the search on the Explore homepage of the domain.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-searchbox">' +
                '<form method="GET" action="{{ actionUrl }}" ng-show="actionUrl" ng-attr-id="{{formId}}">' +
                    '<input class="odswidget-searchbox__box" name="q" type="text" placeholder="{{placeholder|translate}}" aria-label="Search" translate="aria-label">' +
                    '<input ng-if="sort" name="sort" value="{{ sort }}" type="hidden">' +
                    '<button type="submit" class="ods-aria-instructions" translate>Submit</button>' +
                '</form>' +
            '</div>',
            scope: {
                placeholder: '@',
                sort: '@',
                context: '=',
                formId: '@?'
            },
            link: function (scope, element, attrs) {
                if ('autofocus' in attrs) {
                    jQuery(element).find('input').focus();
                }
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
