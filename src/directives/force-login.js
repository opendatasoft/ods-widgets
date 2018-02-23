(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsRedirectIfNotLoggedIn', ['config', '$window', '$timeout', function(config, $window, $timeout) {
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
            controller: function() {
                if (config.USER === "" || config.USER === null) {
                    $timeout(function() {
                        $window.location.href = '/login';
                    }, 0);
                }
            }
        };
    }]);
}());
