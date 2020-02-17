(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsGetElementLayout', ['$timeout', function ($timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGetElementLayout
         * @scope
         * @restrict A
         * @description
         * Get the height and width of the element where odsGetElementLayout is set. The variable is an object that contains 2 keys : 'height' and 'width'
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <div ods-get-element-layout="layout">
         *              {{ layout.height }} px
         *          </div>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {
                var output = $attrs.odsGetElementLayout;
                var timeout;
                if (angular.isDefined(output)) {
                    $scope[output] = { 'height' : $element[0].offsetHeight, 'width' : $element[0].offsetWidth };

                    jQuery(window).on('resize', function () {
                        $timeout.cancel(timeout);
                        timeout = $timeout(function () {
                            $scope[output] = { 'height' : $element[0].offsetHeight, 'width' : $element[0].offsetWidth };
                        }, 100);
                    });
                }
            }
        };
    }]);

    mod.directive('odsGetWindowLayout', ['$window', '$timeout', function ($window, $timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGetWindowLayout
         * @scope
         * @restrict A
         * @description
         * Get the height and width of the window. The variable is an object that contains 2 keys : 'height' and 'width'
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <div ods-get-window-Layout="mylayout">
         *              {{ mylayout.width }} px
         *          </div>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            controller: function ($scope, $attrs) {
                var output = $attrs.odsGetWindowLayout;
                var timeout;
                if (angular.isDefined(output)) {
                    $scope[output] = { 'height': $window.innerHeight, 'width': $window.innerWidth };

                    jQuery(window).on('resize', function () {
                        $timeout.cancel(timeout);
                        timeout = $timeout(function () {
                            $scope[output] = { 'height': $window.innerHeight, 'width': $window.innerWidth };
                        }, 100);
                    });
                }
            }
        };
    }]);
})();
