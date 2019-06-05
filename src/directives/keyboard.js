(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    var crossBrowserTranslation = {
        " ": "Spacebar",
        "ArrowUp": "Up",
        "ArrowDown": "Down",
        "ArrowLeft": "Left",
        "ArrowRight": "Right",
        "Escape": "Esc",
        "Delete": "Del"
    };

    mod.directive('odsKeyboard', function () {
        /**
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsKeyboard
         *  @restrict AE
         *  @param {string} odsKeyboardKey the keyboard key code, see https://keycode.info/ and get the 'event.key'
         *  @param {string} odsKeyboardExpression the expression to execute
         *  @param {boolean} odsKeyboardPreventDefault to prevent the event to trigger the default behavior. Usefull for Escape, Space mainly. Default to 'false'
         *  @description
         *  Bind a keyboard key to execute the associated ngClick or specific expression.
         *  Get the correct key here : https://keycode.info/
         *  For the space bar, use 'Space' code.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *              <div ng-init="values = { 'count' : 0 }">
         *                  <div style="cursor: pointer;text-decoration: underline;color: #0086d6;width: fit-content;"
         *                       ods-keyboard
         *                       ods-keyboard-key="ArrowLeft"
         *                       ods-keyboard-prevent-default="true"
         *                       ng-click="values.count = values.count - 1">
         *                          Left arrow : -1
         *                  </div>
         *                  <ods-keyboard   class="ods-button"
         *                                  ods-keyboard-key="ArrowRight"
         *                                  ods-keyboard-prevent-default="true"
         *                                  ods-keyboard-expression="values.count = values.count + 1">
         *                          Right arrow : +1
         *                  </ods-keyboard>
         *                  <div style="cursor: pointer;text-decoration: underline;color: #0086d6;width: fit-content;"
         *                       ods-keyboard
         *                       ods-keyboard-key="Enter"
         *                       ng-click="values.count = 0">
         *                      Enter : set to 0
         *                  </div>
         *                  <p>
         *                      Counter = {{ values.count }}
         *                  </p>
         *              </div>
         *     </file>
         * </example>
         */
        return {
            restrict: 'AE',
            link: function (scope, elem, attrs) {
                var key = attrs.odsKeyboardKey;
                var expr = attrs.odsKeyboardExpression || attrs.ngClick;
                var preventDefault = attrs.odsKeyboardPreventDefault || false;

                if (angular.isUndefined(key)) return;
                if (angular.isUndefined(expr)) return;

                if (key === "Space")
                    key = " ";

                var cb = function (e) {
                    if (e.key === key || (key in crossBrowserTranslation && e.key === crossBrowserTranslation[key])) {
                        if (!(e.target.tagName === 'INPUT' ||
                                e.target.tagName === 'SELECT' ||
                                e.target.tagName === 'TEXTAREA' ||
                                (e.target.contentEditable && e.target.contentEditable === 'true'))) {
                            scope.$evalAsync(expr);
                            if (preventDefault) {
                                e.preventDefault();
                            }
                        }
                    } else {
                        return;
                    }
                }

                $(document).on("keydown", cb);

                scope.$on('$destroy', function () {
                    $(document).off("keydown", cb);
                });
            }
        };
    });
}());
