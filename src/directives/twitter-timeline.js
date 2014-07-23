(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTwitterTimeline', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTwitterTimeline
         * @restrict E
         * @scope
         * @param {string} widgetId The identifier of the Twitter widget you want to integrate. See https://twitter.com/settings/widgets for more information.
         * @description
         * Integrates a Twitter "widget" using the widget ID provided by Twitter.
         *
         * This directive is useful if you want to avoid having `<script>` tags in your page, for example to allow your users to enter HTML text without cross-scripting risks.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div></div>',
            scope: {
                'widgetId': '@'
            },
            link: function(scope, element, attrs) {
                var html = '' +
                    '<a class="twitter-timeline" href="https://twitter.com/twitterapi" data-widget-id="'+attrs.widgetId+'">Tweets</a>' +
                    '<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>';
                element.append(html);
            }
        };
    });
}());