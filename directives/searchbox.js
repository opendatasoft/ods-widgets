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
         * @description
         * This widget displays a wide searchbox that redirects the search on the Explore homepage of the domain.
         *
         */
        // FIXME: Take a catalog context so that the searchbox redirects to the absolute URL of the domain
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-searchbox">' +
                    '<form method="GET" action="/explore/">' +
                    '<input class="searchbox" name="q" type="text" placeholder="{{placeholder}}">' +
                    '</form>' +
                '</div>',
            scope: {
                placeholder: '@'
            }
        };
    });

}());