(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsSocialButtons', ['translate', '$location', '$window', function(translate, $location, $window) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSocialButtons
         * @scope
         * @restrict A
         * @param {string} [buttons='twitter,facebook,linkedin,email'] Comma separated list of buttons you want to display.
         * @param {string} [title=current page's title] Title of the post on social media
         * @param {string} [url=current page's url] Url attached to the post on social media
         * @description
         * This widget displays a series of buttons for easy sharing on social media.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-social-buttons buttons="twitter,linkedin"></ods-social-buttons>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            scope: {
                buttons: '@?',
                title: '@?',
                url: '@?'
            },
            replace: true,
            template: '' +
            '<div class="odswidget-social-buttons">' +
            '   <button ng-repeat-start="(name, button) in activeButtons"' +
            '           ng-hide="name === \'email\'"   ' +
            '           type="button"' +
            '           class="odswidget-social-buttons__button"' +
            '           ng-click="openPopup(button)"' +
            '           aria-label="{{ button.aria }}">' +
            '       <i class="fa" ' +
            '          ng-class="button.icon" ' +
            '          aria-hidden="true"></i>' +
            '   </button>' +
            '   <a ng-repeat-end' +
            '      ng-show="name === \'email\'"' +
            '      class="odswidget-social-buttons__button"' +
            '      ng-href="{{ button.href }}" ' +
            '      aria-label="{{ button.aria }}" >' +
            '       <i class="fa" ' +
            '          ng-class="button.icon" ' +
            '          aria-hidden="true"></i>' +
            '   </a> ' +
            '</div>',
            link: function (scope) {
                scope.openPopup = function (button) {
                    if (!button.popupWidth || ! button.popupHeight) {
                        return;
                    }

                    var popupAttrs = format_string('menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height={height},width={width}', {
                        width: button.popupWidth,
                        height: button.popupHeight
                    });
                    $window.open(button.href, '', popupAttrs);
                };

                var buttons = {
                    twitter: {
                        aria: translate('Share on Twitter'),
                        hrefTemplate: 'https://twitter.com/intent/tweet?text={title}&url={url}',
                        icon: 'fa-twitter',
                        popupWidth: 600,
                        popupHeight: 250

                    },
                    facebook: {
                        aria: translate('Share on Facebook'),
                        hrefTemplate: 'https://www.facebook.com/sharer/sharer.php?u={url}',
                        icon: 'fa-facebook',
                        popupWidth: 600,
                        popupHeight: 600

                    },
                    linkedin: {
                        aria: translate('Share on Linkedin'),
                        hrefTemplate: 'https://www.linkedin.com/shareArticle?url={url}&mini=true&title={title}&source={title}',
                        icon: 'fa-linkedin',
                        popupWidth: 600,
                        popupHeight: 600
                    },
                    email: {
                        aria: translate('Share by email'),
                        hrefTemplate: 'mailto:?subject={title}&body={url}',
                        icon: 'fa-envelope'

                    }
                };
                if (angular.isDefined(scope.buttons)) {
                    scope.activeButtons = {};
                    var names = ODS.ArrayUtils.fromCSVString(scope.buttons);
                    angular.forEach(names, function (name) {
                        if (buttons[name]) {
                            scope.activeButtons[name] = buttons[name];
                        }
                    });
                } else {
                    scope.activeButtons = buttons;
                }

                var getAbsUrl = function () {
                    return $window.encodeURIComponent(scope.url || $location.absUrl());
                };

                var getTitle = function () {
                    return $window.encodeURIComponent(scope.title || $window.document.title);
                };

                scope.$watch(getAbsUrl, function (url) {
                    angular.forEach(buttons, function (button) {
                        button.href = format_string(button.hrefTemplate, {
                            url: url,
                            title: getTitle()
                        })
                    });
                });
            }
        };
    }]);
})();
