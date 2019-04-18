(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTimer', ['$window', '$interval', function ($window, $interval) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTimer
         * @scope
         * @restrict E
         * @param {Number} [delay=1000] The number of milliseconds to wait before executing the expression. Minimum value is 1000ms.
         * @param {Expression} [stopCondition=false] An AngularJS expression returning 'true' or 'false'. The timer stops when the condition is false.
         * @param {Expression} [exec] An AngularJS expression to execute.
         *
         * @description
         * This widget is a simple timer, it executes the AngularJS expression "exec" every "delay" milliseconds.
         * It doesn't stop until the user click on the pause button or when the "stopCondition" is true.
         *
         * It can be used to animate dashboards to go over a date field and add 1 day every 2 seconds like in the following example.
         * From and To will increase by 1 day until the user click on pause button.
         * @example
         * <example module="ods-widgets">
         *     <file name="index.html">
         *          <ods-dataset-context context="events"
         *                               events-domain="https://widgets-examples.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract">
         *              <div ng-init="values = {'from':undefined,'to':undefined}">
         *                  <ods-timerange context="events"
         *                          default-from="2019/01/01"
         *                          default-to="2019/02/31"
         *                          from="values.from"
         *                          to="values.to">
         *                  </ods-timerange>
         *                  <ods-timer stop-condition="false"
         *                             delay="3000"
         *                             exec="values.from = (values.from | momentadd : 'day' : 1 | moment : 'YYYY-MM-DD');
         *                                   values.to = (values.to | momentadd : 'day' : 1 | moment : 'YYYY-MM-DD');">
         *                  </ods-timer>
         *                  <div>
         *                      <h1 ods-aggregation="cnt"
         *                          ods-aggregation-context="events"
         *                          ods-aggregation-function="COUNT">
         *                          # events : {{ cnt  | number}}
         *                      </h1>
         *                      <ods-table context="events"></ods-table>
         *                  </div>
         *              </div>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         */
        return {
            restrict: 'E',
            scope: {
                stopCondition: '&',
                delay: '=',
                exec: '&'
            },
            replace: true,
            template: '' +
                '<div class="ods-widget-timer">' +
                '   <button class="ods-button ods-widget-timer-controller ods-widget-timer-play"' +
                '        ods-tooltip="play"' +
                '        ng-if="!running"' +
                '        ng-click="timerPlay()">' +
                '       <i class="fa fa-play" aria-hidden="true"></i>' +
                '   </button>' +
                '   <button class="ods-button ods-widget-timer-controller ods-widget-timer-stop"' +
                '        ods-tooltip="stop"' +
                '        ng-if="running"' +
                '        ng-click="timerStop()">' +
                '       <i class="fa fa-stop" aria-hidden="true"></i>' +
                '   </button>' +
                '</div>',
            link: function (scope, elem, $attrs) {
                scope.running = false;
                var delay = 1000;
                if (angular.isDefined(scope.delay)) {
                    if (!scope.delay || typeof scope.delay !== 'number' || !isFinite(scope.delay)) {
                        console.warn('ods-timer: delay is not a valid integer: fallbacking to default value (1000ms)');
                    } else if (scope.delay < 1000) {
                        console.warn('ods-timer: delay is too small (1000ms minimum): fallbacking to default value (1000ms)');
                    } else {
                        delay = scope.delay;
                    }
                }

                var stopTimer = function () {
                    $interval.cancel(scope.promise);
                    scope.promise = undefined;
                };

                scope.timerPlay = function () {
                    /* don't start another timer if one is already running ! */
                    if (angular.isDefined(scope.promise)) return;

                    scope.promise = $interval(function () {
                        if (!scope.stopCondition()) {
                            scope.exec();
                        } else {
                            stopTimer();
                        }
                    }, delay);

                    scope.running = true;
                };

                scope.timerStop = function () {
                    stopTimer();
                    scope.running = false;
                };
            },
        };
    }]);
}());
