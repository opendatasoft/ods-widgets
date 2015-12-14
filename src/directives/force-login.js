(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsRedirectIfNotLoggedIn', ['ODSWidgetsConfig', 'config',function(ODSWidgetsConfig, config) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsRedirectIfNotLoggedIn
         * @scope
         * @restrict A
         * @description
         * This widget forces a redirect to the login page of the domain if the user is not logged in
         *
         */
        return {
            restrict: 'A',
            controller: ['$scope', '$location', function($scope, $location) {
                if (config.USER === "") {
                    $location.url("/login");
                }
            }]
        };
    }]);
}());
