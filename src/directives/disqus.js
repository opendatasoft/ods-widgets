(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var disqusShortnamePattern = /^[a-z0-9-]*$/g;

    mod.directive('odsDisqus', ['ODSWidgetsConfig', '$location', '$window', function(ODSWidgetsConfig, $location, $window) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDisqus
         * @restrict E
         * @scope
         * @param {string} shortname Disqus short name for your account. If not specified, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.disqusShortname} will be used.
         * @param {string} [identifier=none] By default, the discussion is tied to the URL of the page. If you want to be independent from the URL or share the discussion between two or more pages, you can define an identifier in this parameter. Disqus recommends always doing this from the start.
         * @description
         * The odsDisqus widget shows a Disqus panel where users can comment on the page.
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
                $window.disqus_shortname = $window.disqus_shortname.toLowerCase();
                if (!$window.disqus_shortname.match(disqusShortnamePattern)) {
                    console.error(
                        'odsDisqus: The Disqus shortname should be a string with only alphanumeric characters or ' +
                        'dashes, such as "mydisqusshortname"; but the received value is "' + $window.disqus_shortname + '".');
                    return;
                }
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
