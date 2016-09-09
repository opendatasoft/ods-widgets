(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsSpinner', ['ODSWidgetsConfig', function (ODSWidgetsConfig) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSpinner
         * @scope
         * @restrict E
         *
         * @description
         * This widget displays the custom OpenDataSoft spinner.
         * Its size and color match the current font's.
         * If the browser doesn't support svg animation via css, an animated gif will be displayed instead.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-spinner></ods-spinner> Loading
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: function (element, attrs) {
                var spinner;
                if (Modernizr && Modernizr.cssanimations && Modernizr.svg) {
                    // Fallback to gif
                    spinner = '' +
                        '<img src="' + ODSWidgetsConfig.basePath + 'src/img/spinner.gif" ' +
                        '     class="odswidget-spinner odswidget-spinner--gif"/>';
                } else {
                    spinner = '' +
                        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" version="1.1"' +
                        '     class="odswidget-spinner odswidget-spinner--svg">' +
                        '    <rect x="0" y="0" width="30" height="30" class="odswidget-spinner__cell-11"></rect>' +
                        '    <rect x="35" y="0" width="30" height="30" class="odswidget-spinner__cell-12"></rect>' +
                        '    <rect x="70" y="0" width="30" height="30" class="odswidget-spinner__cell-13"></rect>' +
                        '    <rect x="0" y="35" width="30" height="30" class="odswidget-spinner__cell-21"></rect>' +
                        '    <rect x="35" y="35" width="30" height="30" class="odswidget-spinner__cell-22"></rect>' +
                        '    <rect x="70" y="35" width="30" height="30" class="odswidget-spinner__cell-23"></rect>' +
                        '    <rect x="0" y="70" width="30" height="30" class="odswidget-spinner__cell-31"></rect>' +
                        '    <rect x="35" y="70" width="30" height="30" class="odswidget-spinner__cell-32"></rect>' +
                        '    <rect x="70" y="70" width="30" height="30" class="odswidget-spinner__cell-33"></rect>' +
                        '</svg>';
                }

                if ('withBackdrop' in attrs) {
                    spinner = '<div class="odswidget-spinner__backdrop">' + spinner + '</div>';
                }

                return spinner;
            }
        }
    }]);
})();
