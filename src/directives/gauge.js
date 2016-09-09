(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsGauge', ['$timeout', function ($timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGauge
         * @scope
         * @restrict E
         * @param {string} [displayMode=circle] Type of chart : 'circle' or 'bar'
         * @param {float} [max=100] The maximum value for the gauge.
         * @param {float} value A number between 0 and the defined max
         * @description
         * This widget displays a gauge in one of the two following modes: circle or horizontal bar.
         * The widget relies on CSS3 and SVG and as a result is entirely customizable in CSS.
         * Values exceeding the given max will be represented as a full gauge, whereas values lower than 0 will be
         * represented as an empty gauge.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-gauge display-mode="circle" value="33" max="70"></ods-gauge>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                displayMode: '@',
                value: '=',
                max: '=?'
            },
            template: function (element, attrs) {
                var displayMode = attrs.displayMode;
                if (['horizontal', 'bar'].indexOf(displayMode) == -1) {
                    displayMode = 'circle';
                }
                var svg;
                if (displayMode == "bar") {
                    svg = '' +
                        '<svg class="odswidget-gauge__svg">' +
                        '    <line x1="0" y1="5px" x2="100%" y2="5px" class="odswidget-gauge__svg-background"/>' +
                        '    <line x1="0" y1="5px" x2="100%" y2="5px" class="odswidget-gauge__svg-filler" />' +
                        '</svg>';
                } else {
                    svg = '' +
                        '<svg class="odswidget-gauge__svg" viewBox="0 0 100 100" >' +
                        '    <circle cx="50" cy="50" r="45" ' +
                        '            class="odswidget-gauge__svg-background" ' +
                        '            vector-effect="non-scaling-stroke"/>' +
                        '    <circle cx="50%" cy="50%" r="45%" ' +
                        '            class="odswidget-gauge__svg-filler"' +
                        '            vector-effect="non-scaling-stroke"/> ' +
                        '</svg>';
                }

                return '' +
                    '<div class="odswidget-gauge odswidget-gauge--' + displayMode + '">' +
                    '    <div class="odswidget-gauge__value">{{ (value/max*100)|number:0 }}%</div>' + svg +
                    '</div>';
            },
            link: function (scope, element) {
                // default values

                if (!angular.isDefined(scope.max)) {
                    scope.max = 100;
                }
                if (['circle', 'bar'].indexOf(scope.displayMode) == -1) {
                    scope.displayMode = 'circle';
                }

                // common variables

                var fillerElement = element.find('.odswidget-gauge__svg-filler');

                // animation helpers

                var setupCircleChart = function () {
                    // we should be using 0.9 (because of r=45)
                    // but this way we avoid having a 1px gap in the circle for 100%
                    var perimeter = Math.PI * element.width() * 0.91;
                    fillerElement.css({
                        'stroke-dasharray': perimeter,
                        'stroke-dashoffset': perimeter,
                        'transition': 'none'
                    });
                    $timeout(function () {
                        fillerElement.css({
                            'transition': 'stroke-dashoffset 2.5s',
                            'stroke-dashoffset': perimeter * (1 - scope.percentage / 100)
                        });
                    });
                };

                var animateCircleChart = function () {
                    $timeout(function () {
                        var perimeter = Math.PI * element.width() * 0.91;
                        fillerElement.css({'stroke-dashoffset': perimeter * (1 - scope.percentage / 100)});
                    });
                };

                var setupBarChart = function () {
                    var length = element.width();
                    fillerElement.css({
                        'stroke-dasharray': length,
                        'stroke-dashoffset': length,
                        'transition': 'none'
                    });
                    $timeout(function () {
                        fillerElement.css({
                            'transition': 'stroke-dashoffset 2.5s',
                            'stroke-dashoffset': length * (1 - scope.percentage / 100) + 'px'
                        });
                    });

                };

                var animateBarChart = function () {
                    $timeout(function () {
                        var length = element.width();
                        fillerElement.css({'stroke-dashoffset': length * (1 - scope.percentage / 100) + 'px'});
                    });

                };

                var animationHelpers = {
                    'circle': {'setup': setupCircleChart, 'animate': animateCircleChart},
                    'bar': {'setup': setupBarChart, 'animate': animateBarChart}
                };


                var updatePercentage = function (value) {
                    scope.percentage = value / scope.max * 100;
                    scope.percentage = Math.max(scope.percentage, 0);
                    scope.percentage = Math.min(scope.percentage, 100);
                };

                updatePercentage(scope.value);
                animationHelpers[scope.displayMode].setup();

                scope.$watch('value', function (nv, ov) {
                    if (nv != ov) {
                        updatePercentage(nv);
                        animationHelpers[scope.displayMode].animate();
                    }
                });

                $(window).on('resize', function () {
                    animationHelpers[scope.displayMode].setup();
                });
            }
        }
    }]);
})();
