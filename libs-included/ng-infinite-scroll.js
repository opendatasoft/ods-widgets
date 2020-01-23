/* ng-infinite-scroll - v1.0.3 - 2013-10-07 */
// https://raw.github.com/platypus-creation/ngInfiniteScroll/

var mod = angular.module('infinite-scroll', []);

mod.directive('infiniteScroll', [
  '$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        $timeout(function() {
          $window = angular.element($window);
          var $scrollParent, checkWhenEnabled, elementTop, handler, scrollDistance, scrollEnabled, parentTop;

          $scrollParent = elem.parents().filter(function() {
            return /(auto|scroll)/.test(jQuery.css(this, 'overflow') + jQuery.css(this, 'overflow-y'));
          }).eq(0);

          if ($scrollParent.length === 0) {
            $scrollParent = $window;
          }

          if (attrs.infiniteScrollSelf != null) {
              $scrollParent = elem;
          }

          scrollDistance = 0;
          if (attrs.infiniteScrollDistance != null) {
            scope.$watch(attrs.infiniteScrollDistance, function(value) {
              return scrollDistance = parseFloat(value, 10);
            });
          }
          scrollEnabled = true;
          checkWhenEnabled = false;
          if (attrs.infiniteScrollDisabled != null) {
            scope.$watch(attrs.infiniteScrollDisabled, function(value) {
              scrollEnabled = !value;
              if (scrollEnabled && checkWhenEnabled) {
                checkWhenEnabled = false;
                return handler();
              }
            });
          }
          parentTop = $scrollParent !== $window ? $scrollParent.position().top : 0;
          elementTop = elem.position().top - parentTop;
          handler = function() {
            var elementBottom, remaining, scrollBottom, shouldScroll;

            if(elem == $scrollParent) {
                remaining = elem[0].scrollHeight - elem.scrollTop() - elem.height();
                shouldScroll = remaining <= (elem[0].scrollHeight * scrollDistance);
            } else {
                elementBottom = elementTop + elem.height();
                scrollBottom = $scrollParent.height() + $scrollParent.scrollTop();
                remaining = elementBottom - scrollBottom;
                shouldScroll = remaining <= ($scrollParent.height() * scrollDistance);
            }
            if (shouldScroll && scrollEnabled) {
              if ($rootScope.$$phase) {
                return scope.$eval(attrs.infiniteScroll);
              } else {
                return scope.$apply(attrs.infiniteScroll);
              }
            } else if (shouldScroll) {
              return checkWhenEnabled = true;
            }
          };

          // if there isn't enough content to show a scrollbar
          // var interval = setInterval(function(){
          //     if($scrollParent[0].offsetHeight === $scrollParent[0].scrollHeight) {
          //         // load more
          //         scope.$apply(attrs.infiniteScroll)
          //     }
          // }, 1000)
          $scrollParent.on('scroll', handler);

          scope.$on('$destroy', function() {
              // clearInterval(interval);
              return $scrollParent.off('scroll', handler);
          });
          return $timeout((function() {
            if (attrs.infiniteScrollImmediateCheck) {
              if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
                return handler();
              }
            } else {
              return handler();
            }
          }), 0);
        }, 0);
      }
    };
  }
]);
