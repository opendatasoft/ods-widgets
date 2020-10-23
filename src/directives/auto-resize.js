(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var autoResizeDefinition = ['$timeout', '$window', function($timeout, $window) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAutoResize
         * @restrict A
         *
         * @description
         * Enables the auto resize functionality on widget that supports it. By default, it forces the affected element to fill the height
         * to the bottom of the window.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <div ods-auto-resize>I fill the height</div>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'A',
            require: ["?odsAutoResize", "?autoResize"],
            link: function(scope, element, attrs, ctrls) {
                var timeout;
                var ctrl = ctrls[0] || ctrls[1];
                var autoresize = attrs.odsAutoResize || attrs.autoResize;

                if (autoresize !== 'false') {
                    var resize = function () {
                        var height = Math.max(200, angular.element($window).height() - element.offset().top);
                        element.height(height);
                    };
                    resize();

                    jQuery(window).on('resize', function () {
                        $timeout.cancel(timeout);
                        timeout = $timeout(function () {
                            resize();
                            if (ctrl.onResize) {
                                ctrl.onResize();
                            }
                        }, 50);
                    });
                }
            }
        };
    }];

    mod.directive('odsAutoResize', autoResizeDefinition);
    mod.directive('autoResize', autoResizeDefinition);

}());

