(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTwitterTimeline', function () {
        /**
         * @deprecated
         * @name ods-widgets.directive:odsTwitterTimeline
         * @restrict E
         * @scope
         * @param {string} widgetId The identifier of the Twitter widget you want to integrate. See https://twitter.com/settings/widgets for more information.
         * @param {number} [width=300] Forces the width of the Twitter timeline widget.
         * @param {number} [height=600] Forces the height of the Twitter timeline widget.
         * @description
         * Note: this twitter works with the former Twitter Widget system, which provided an ID, and was available until
         * late 2016. Newly created Twitter Widgets are not supported, and can usually directly be integrated in pages
         * by pasting the code given by Twitter.
         *
         * This widget integrates a Twitter "widget" using the widget ID provided by Twitter.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-twitter-timeline widget-id="502475045042544641"></ods-twitter-timeline>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget"></div>',
            scope: {
                'widgetId': '@'
            },
            link: function (scope, element, attrs) {
                var html = '' +
                    '<a class="twitter-timeline" ' +
                    '   href="https://twitter.com/twitterapi" ' +
                    '   data-widget-id="' + attrs.widgetId + '"';
                if (attrs.height) {
                    html += '   height="' + attrs.height + '"';
                }
                if (attrs.width) {
                    html += '   width="' + attrs.width + '"';
                }
                html +=
                    '   >Tweets</a>' +
                    '<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>';
                element.append(html);
            }
        };
    });
}());
