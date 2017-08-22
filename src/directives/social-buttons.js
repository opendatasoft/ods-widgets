(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsSocialButtons', [function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSocialButtons
         * @scope
         * @restrict A
         * @param {string} addthisPubid Your AddThis account's public ID
         * @param {string} [buttons='google-plus,facebook,twitter'] Comma separated list of buttons you want to display.
         * @description
         * This widget displays a share button that on hover will reveal social media sharing buttons.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-social-buttons addthis-pubid="myaddthispubid"></ods-social-buttons>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            scope: {
                addthisPubid: '@',
                buttons: '@?'
            },
            replace: true,
            template: '' +
            '<div class="odswidget-social-buttons" ' +
            '     ng-init="displayButtons=false"' +
            '     ng-mouseenter="displayButtons=true" ng-mouseleave="displayButtons=false">' +
            '    <div class="odswidget-social-buttons__header">' +
            '        <span translate>Share</span>' +
            '        <i class="fa fa-angle-down" aria-hidden="true"></i>' +
            '    </div>' +
            '    <div class="odswidget-social-buttons__buttons" ' +
            '         ng-class="{\'odswidget-social-buttons__buttons--open\': displayButtons}">' +
            '        <div class="addthis_toolbox addthis_counter_style">' +
            '            <a ng-if="selectedButtons.indexOf(\'facebook\') > -1" ' +
            '               class="addthis_button_facebook_like" fb:like:layout="box_count"></a>' +
            '            <a ng-if="selectedButtons.indexOf(\'twitter\') > -1" ' +
            '               class="addthis_button_tweet" tw:count="vertical"></a>' +
            '            <a ng-if="selectedButtons.indexOf(\'google-plus\') > -1" ' +
            '               class="addthis_button_google_plusone" g:plusone:size="tall"></a>' +
            '        </div>' +
            '    </div>'+
            '    <script type="text/javascript">' +
            '        var addthis_config = addthis_config || {};' +
            '        addthis_config.pubid = "{{ addthisPubid }}";' +
            '    </script>' +
            '    <script type="text/javascript" src=""></script>' +
            '</div>',
            link: function (scope) {
                // check buttons
                var availableButtons = ['google-plus', 'facebook', 'twitter'];
                scope.selectedButtons = availableButtons;
                if (angular.isDefined(scope.buttons)) {
                    var tmpButtons = scope.buttons.split(',').map(function (button) {return button.trim();});
                    scope.selectedButtons = [];
                    angular.forEach(tmpButtons, function (button) {
                        if (availableButtons.indexOf(button) > -1) {
                            scope.selectedButtons.push(button);
                        }
                    });
                }
                // load AddThis
                var addthis = document.createElement('script');
                addthis.type  = 'text/javascript';
                addthis.async = true;
                addthis.src   = '//s7.addthis.com/js/300/addthis_widget.js#domready=1';
                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(addthis);
            }
        };
    }]);
})();
