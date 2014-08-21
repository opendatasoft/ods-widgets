(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDisqus', ['ODSWidgetsConfig', '$location', '$window', function(ODSWidgetsConfig, $location, $window) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDisqus
         * @restrict E
         * @scope
         * @param {string} shortname Disqus shortname for your account. If not specified, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.disqusShortname} will be used.
         * @param {string} [identifier=none] By default, the discussion is tied to the URL of the page. If you want to be independant from the URL, or share the discussion between two or more pages, you can define an identifier in this parameter; it is recommended by Disqus to always do it from the start.
         * @description
         * This widget shows a Disqus panel where users can comment the page.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                'shortname': '@',
                'identifier': '@'
            },
            template: '<div id="disqus_thread" class="odswidget"></div>',
            link: function (scope) {
                $window.disqus_shortname = scope.shortname || ODSWidgetsConfig.disqusShortname;
                if (scope.identifier) {
                    $window.disqus_identifier = scope.identifier;
                }
                $window.disqus_url = $location.absUrl();
                $window.disqus_config = function() {
                    this.language = ODSWidgetsConfig.language;
                };

                var dsq = document.createElement('script');

                dsq.type  = 'text/javascript';
                dsq.async = true;
                dsq.src   = '//' + $window.disqus_shortname + '.disqus.com/embed.js';

                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);

            }
        };
    }]);

}());