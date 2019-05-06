(function () {
    'use strict';

    var mod = angular.module('ods-widgets');
    /**
     * @ngdoc directive
     * @name ods-widgets.directive:odsPopIn
     * @scope
     * @restrict E
     * @param {string} name The name of the pop-in, used internally to uniquely reference it (required)
     * @param {string} [title=''] The title displayed inside the popup
     * @param {number} [displayAfter=10] the delay in second before displaying the popup window
     * @param {boolean} [displayOnlyOnce=true] if false, the popup will be displayed at each browsing session of the user
     *
     * @description
     * Displays a pop-in on the page with the provided content.
     * You can define the time before displaying the pop-in (the timer start when the widget is loaded)
     * In the content you have access to a `hidePopIn()` function that you can use in an `ng-click`.
     *
     * @example
     * <example module="ods-widgets">
     *     <file name="index.html">
     *         <ods-pop-in display-after="5" name="test" display-only-once="false">
     *             <div style="text-align: center;">
     *                 <i class="fa fa-thumbs-o-up" style="color: #FFD202; font-size: 40px"></i>
     *             </div>
     *             <div style="text-align: center;">
     *                 <h2>
     *                     Signup to improve your data experience
     *                 </h2>
     *             </div>
     *             <p>
     *                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
     *             </p>
     *             <div style="text-align: center;">
     *                 <a href="" ng-click="hidePopIn()">Signup now to improve your experience <i class="fa fa-arrow-right"></i></a>
     *             </div>
     *         </ods-pop-in>
     *     </file>
     * </example>
     */
    mod.directive('odsPopIn', ['$document', '$timeout', '$compile', '$window', 'ODSWidgetsConfig',
        function ($document, $timeout, $compile, $window, ODSWidgetsConfig) {
        return {
            transclude: true,
            scope: {
                displayAfter: '@',
                displayOnlyOnce: '=?',
                name: '@',
                title: '@?',
            },
            controller: function($scope, $element, $attrs, $transclude) {
                var transcludedContent, transclusionScope, storage;

                if (typeof $scope.name === "undefined") {
                    console.error("odsPopIn requires a name attribute");
                    return;
                }

                var storeKey = 'ods-popin-displayed-' + $scope.name;

                if (typeof $scope.displayAfter === "undefined") {
                    $scope.displayAfter = 10;
                }

                if (typeof $scope.displayOnlyOnce === "undefined") {
                    $scope.displayOnlyOnce = true;
                }

                if ($scope.displayOnlyOnce) {
                    storage = $window.localStorage;
                } else {
                    storage = $window.sessionStorage;
                }

                var stopPropagation = function(event) {
                    event.stopPropagation();
                };

                $scope.keyboardHidePopIn = function(event) {
                    if (event.keyCode === 27) {
                        $scope.hidePopIn();
                    }
                };

                $scope.hidePopIn = function() {
                    $scope.rootEl.find('.ods-pop-in__container').off('click', stopPropagation);
                    $document.off('keydown', $scope.keyboardHidePopIn);
                    $document.off('click', $scope.hidePopIn);
                    $scope.rootEl.addClass("ods-pop-in--hidden");
                };

                $scope.showPopIn = function() {
                    $scope.rootEl.removeClass("ods-pop-in--hidden");
                    $scope.rootEl.find('.ods-pop-in__container').on('click', stopPropagation);
                    $document.one('click', $scope.hidePopIn);
                    $document.one('keydown', $scope.keyboardHidePopIn);
                    if (!ODSWidgetsConfig.devMode) {
                        storage.setItem(storeKey, true);
                    }
                };

                if (ODSWidgetsConfig.devMode || !storage.getItem(storeKey)) {
                    $scope.rootEl =  $compile('' +
                        '<div class="ods-pop-in ods-pop-in--hidden">' +
                        '   <div class="ods-pop-in__container">' +
                        '       <div class="ods-pop-in__close-button" ng-click="hidePopIn();"><i class="fa fa-close"></i></div>' +
                        '       <div class="ods-pop-in__body">' +
                        '           <h2 ng-if="title" ng-bind="title" class="ods-pop-in__title"></h2>' +
                        '       </div>' +
                        '    </div>'
                    )($scope);
                    $transclude(function(clone, scope) {
                        $scope.rootEl.find('.ods-pop-in__body').append(clone);
                        scope.hidePopIn = $scope.hidePopIn;
                        transcludedContent = clone;
                        transclusionScope = scope;
                    });
                    $document.find('body').append($scope.rootEl);
                    $timeout($scope.showPopIn, parseInt($scope.displayAfter, 10) * 1000);

                    // clean up transclude and popup on $destroy
                    $element.on('$destroy', function() {
                        transcludedContent.remove();
                        transclusionScope.$destroy();
                        $scope.hidePopIn();
                    });
                }
            }
        };
    }]);
})();

