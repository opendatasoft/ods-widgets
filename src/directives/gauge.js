(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsGauge', ['$timeout', function ($timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGauge
         * @scope
         * @restrict E
         * @param {string} [displayMode=circle] Type of chart: 'circle' or 'bar'
         * @param {float} [max=100] The maximum value for the gauge
         * @param {float} value A number between 0 and the defined `max` value
         * @description
         * The odsGauge widget displays a gauge in one of the two following modes: circle or horizontal bar.
         * The widget relies on CSS3 and SVG. As a result, it is entirely customizable in CSS.
         * 
         * The widget will decide its size based on its width, so you can make it larger or smaller using the CSS `width`
         * property; however, the widget will always take the necessary height, so forcing the height using CSS won't work.
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

        var getDisplayMode = function (attrs) {
            if (['horizontal', 'bar'].indexOf(attrs.displayMode) === -1) {
                return 'circle';
            }
            return attrs.displayMode;
        };
        return {
            restrict: 'E',
            replace: true,
            scope: {
                displayMode: '@',
                value: '=',
                max: '=?'
            },
            template: function (element, attrs) {
                var displayMode = getDisplayMode(attrs),
                    svg;
                if (displayMode === "bar") {
                    svg = '' +
                        '<svg class="odswidget-gauge__svg" viewBox="0 0 100 10" preserveAspectRatio="none">' +
                        '   <line x1="0" y1="5px" x2="100%" y2="5px" class="odswidget-gauge__svg-background"/>' +
                        '   <line x1="0" y1="5px" x2="100%" y2="5px" class="odswidget-gauge__svg-filler"/>' +
                        '</svg>';
                } else {
                    svg = '' +
                        '<svg class="odswidget-gauge__svg" viewBox="0 0 100 100">' +
                        '   <circle cx="50" cy="50" r="45" class="odswidget-gauge__svg-background"/>' +
                        '   <circle cx="50%" cy="50%" r="45%" class="odswidget-gauge__svg-filler"/>' +
                        '</svg>';
                }

                return '' +
                    '<div class="odswidget-gauge odswidget-gauge--' + displayMode + '">' +
                    '    <div class="odswidget-gauge__value">{{ percentage | number:0 }}%</div>' + svg +
                    '</div>';
            },
            link: function (scope, element, attrs) {
                var fillerElement = element.find('.odswidget-gauge__svg-filler');

                var updatePercentage = function (value, max) {
                    value = value || 0;
                    max = max || 100;
                    scope.percentage = value / max * 100;
                    scope.percentage = Math.max(scope.percentage, 0);
                    scope.percentage = Math.min(scope.percentage, 100);
                };

                var updateGauge = function (length) {
                    fillerElement.css({
                        'stroke-dasharray': format_string('{filled} {total}', {
                            filled: scope.percentage / 100 * length,
                            total: length
                        })
                    });
                };

                var getGaugeLength = function () {
                    if (getDisplayMode(attrs) === 'circle') {
                        return 283; // 283 === Math.ceil(2 * Math.PI * 45);
                    }
                    return 100;
                };


                scope.$watch('[value, max]', function (newValues) {
                    updatePercentage(newValues[0], newValues[1]);
                    updateGauge(getGaugeLength());
                });
            }
        };
    }]);
})();
