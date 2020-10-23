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
         *          <ods-gist username="Amli" gist-id="b845c8d4b3a2ce08c0a5ce3dd0d7625d"></ods-gist>
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
                '      <div ng-bind-html="htmlError"></div>' +
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
                var successTooltipMessage = '<i class="fa fa-check" aria-hidden="true"></i> ' + translate('Copied');
                scope.resetTooltipMessage = function () {
                    scope.tooltipMessage = '<span style="text-align:center">' + translate('Copy to clipboard') + '</span>';
                };

                scope.resetTooltipMessage();

                $http.jsonp(
                    'https://gist.github.com/' + scope.username + '/' + scope.gistId + '.json?callback=JSON_CALLBACK',
                    {timeout: 5000}
                ).then(function (result) {
                        var data = result.data;
                        jQuery(document.head).append('<link href="' + data.stylesheet + '" rel="stylesheet">');
                        var gistElement = jQuery(data.div);

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
                    },
                    function (error) {
                        scope.htmlError =
                            "<div class=\"gist blob-code-inner ods-gist-error\">" +
                                "<p translate>Impossible to load code resource</p>" +
                                "<a target=\"_blank\" href=\"" + 'https://gist.github.com/' + scope.username + '/' + scope.gistId + "\" translate>Try directly on Github</a>" +
                            "</div>";
                    });
            }
        };
    }]);
}());
