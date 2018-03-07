(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsPageRefresh', ['$window', '$interval', function($window, $interval) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPageRefresh
         * @scope
         * @restrict AE
         * @param {Number} [delay=10000] The number of milliseconds to wait before refreshing the page. Minimum value is 10000ms.
         *
         * @description
         * This widget can be used to periodically refresh the page.
         *
         */
        return {
            restrict: 'AE',
            scope: {
                delay: '=',
            },
            link: function (scope, elem, $attrs) {
                var delay = 10000;
                var reloading = false;

                if (angular.isDefined($attrs['delay'])) {
                    if (!scope.delay || typeof scope.delay !== 'number' || !isFinite(scope.delay)) {
                        console.warn('ods-page-refresh: delay is not a valid integer: fallbacking to default value (10000ms)');
                    } else if (scope.delay < 10000) {
                        console.warn('ods-page-refresh: delay is too small (10000ms minimum): fallbacking to default value (10000ms)');
                    } else {
                        delay = scope.delay;
                    }
                }

                $interval(function() {
                    if (!reloading) {
                        reloading = true;
                        $window.location.reload();
                    }
                }, delay);
            },
        };
    }]);
}());