(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('inject', function(){
        // Thank you petebacondarwin: https://github.com/angular/angular.js/issues/7874#issuecomment-47647003
        return {
            link: function($scope, $element, $attrs, controller, $transclude) {
                var innerScope = $scope.$new();
                if (!$transclude) {
                    console.warn("inject directive used on an element with no transcluded directives", $element);
                    return;
                }
                $transclude(innerScope, function(clone) {
                    var testClone = clone.clone();
                    testClone.contents().wrapAll('<div>');
                    if (testClone.contents().length > 0 && testClone.contents().html().trim().length > 0) {
                        // Only do that if there is content to use. That way, we can keep the HTML inside the element
                        // that has the inject directive, and use it as a "default" template if there is nothing to transclude.
                        $element.empty();
                        $element.append(clone);
                        $element.on('$destroy', function () {
                            innerScope.$destroy();
                        });
                    }
                });
            }
        };
    });

    mod.directive('fullClick', function(){
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                if (attrs.fullClick) {
                    element.find('[main-click]').attr('href', attrs.fullClick);
                }
                element.click(function(evt){
                    if (!$(evt.target).is('a,button,[ng-click]') && // The element is not a link in itself
                        ($(evt.target).parents('a,button,[ng-click]').length === 0) && // The element is not within a clickable element
                        element.find('[main-click]').length) {
                        if (document.createEvent){
                            // Web Browsers
                            // you cannot redispatch an existing event :(
                            var cloneEvent = document.createEvent('MouseEvents');
                            var e = evt.originalEvent;
                            cloneEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail,
                                e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey,
                                e.metaKey, e.button, e.relatedTarget);

                            element.find('[main-click]')[0].dispatchEvent(cloneEvent);
                        } else if (document.createEventObject){
                            // IE
                            // This should be the proper way to do it, but it doesn't work :/
                            // element.find('[main-click]')[0].fireEvent('onclick', document.createEventObject())
                            window.location = element.find('[main-click]')[0].href;
                        }
                    }
                });
            }
        };
    });
}());