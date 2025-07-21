(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsSearchbox', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSearchbox
         * @scope
         * @restrict E
         * @param {string} placeholder Controls the text to display as a placeholder when the search box is empty.
         * @param {string} sort Controls the default sort order for the results.
         * @param {CatalogContext} [context=none] {@link ods-widgets.directive:odsCatalogContext Catalog Context} indicating the domain to redirect the user to show the search results.
         * If `none`, the search is performed on the local domain; that is, the domain to which the widget has been added.
         * @param {string} [autofocus] Adds the autofocus attribute to set the focus in the text search input. No value is required.
         * @param {string} [formId=none] Configures the `id` attribute of the form generated internally by the widget, which can be used from other HTML elements. For example, it can be used to submit the search from another button.
         *
         * @description
         * The odsSearchbox widget displays a wide search box that redirects the search on the Explore homepage of the domain.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-searchbox">' +
                '<form method="GET" action="{{ actionUrl }}" ng-show="actionUrl" ng-attr-id="{{formId}}">' +
                    '<input class="odswidget-searchbox__box" name="{{ queryParamName }}" type="text" placeholder="{{placeholder|translate}}" aria-label="Search" translate="aria-label">' +
                    '<input ng-if="applySort && sort" name="sort" value="{{ sort }}" type="hidden">' +
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
            controller: ['$scope', '$sce', 'ODSWidgetsConfig', function($scope, $sce, ODSWidgetsConfig) {
                $scope.actionUrl = '/explore/';
                $scope.applySort = !ODSWidgetsConfig.isMultiAssets;
                $scope.queryParamName = ODSWidgetsConfig.isMultiAssets ? 'search' : 'q';

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
