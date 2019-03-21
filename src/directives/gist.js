(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsGist', ['translate', '$http', function (translate, $http) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGist
         * @restrict E
         * @scope
         * @param {string} username The GitHub username
         * @param {string} gist-id The Gist id. See the Gist URL to find it
         * @description
         * Integrates a GitHub Gist widget into a page and add a copy to clipboard button in it.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-gist username="opendatasoft" gist-id="8d81bb33e5a062253fe0"></ods-gist>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<div class="ods-gist gist">' +
                '   <div class="gist-file">' +
                '      <div class="gist-meta gist-clipboard">' +
                '          <div ods-tooltip' +
                '               ods-tooltip-template="tooltipMessage"' +
                '               ods-tooltip-direction="top"' +
                '               ng-click="copyToClipboard()"' +
                '               ng-mouseleave="resetTooltipMessage()">' +
                '              <textarea ng-model="rawData"' +
                '                        ng-readonly="true">' +
                '              </textarea>' +
                '               <i class="fa fa-clipboard" aria-hidden="true"></i>' +
                '               <span>' + translate('Copy to clipboard') + '</span>' +
                '           </div>' +
                '      </div>' +
                '      <div ng-bind-html="htmlData"></div>' +
                '   </div>' +
                '</div>',
            scope: {
                'username': '@',
                'gistId': '@',
            },
            link: function (scope, element, attrs) {
                if (attrs.id && !scope.gistId) {
                    scope.gistId = attrs.id;
                }
                var successTooltipMessage = '<i class="fa fa-check"></i> ' + translate('Copied');
                scope.resetTooltipMessage = function() {
                    scope.tooltipMessage = '<span style="text-align:center">' + translate('Copy to clipboard') + '</span>';
                };

                scope.resetTooltipMessage();

                $http.jsonp(
                    'https://gist.github.com/' + scope.username + '/' + scope.gistId + '.json?callback=JSON_CALLBACK',
                    {timeout: 1000}
                ).then(function(result) {
                    var data = result.data;
                    $(document.head).append('<link href="' + data.stylesheet + '" rel="stylesheet">');
                    var gistElement = $(data.div);

                    scope.rawData = gistElement.find('.gist-data').text()
                        .replace(/^[\s]*$\n/gm, '').replace(/^[ ]{8}/gm, '');
                    scope.htmlData = gistElement.find('.gist-file').html();
                    var textarea = element.find('textarea')[0];
                    scope.copyToClipboard = function () {
                        textarea.select();
                        document.execCommand('copy');
                        scope.tooltipMessage = successTooltipMessage;
                        scope.$broadcast('refresh-tooltip');
                        textarea.blur();
                    };
                });
            }
        };
    }]);
}());
