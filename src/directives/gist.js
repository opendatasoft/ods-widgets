(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsGist', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGist
         * @restrict E
         * @scope
         * @param {string} username The GitHub username
         * @param {string} id The Gist id. See the Gist URL to find it
         * @description
         * Integrates a GitHub Gist widget into a page
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-gist username="opendatasoft" id="8d81bb33e5a062253fe0"></ods-gist>
         *      </file>
         *  </example>
         */
         return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget"></div>',
            scope: {
                'username': '@',
                'id': '@'
            },
            link: function(scope, element, attrs) {
                $.ajax({
                    url: 'https://gist.github.com/'+attrs.username+'/'+attrs.id+'.json',
                    dataType: 'jsonp',
                    timeout: 1000,
                    success: function (data) {
                        $(document.head).append('<link href="' + data.stylesheet + '" rel="stylesheet">');
                        element.append(data.div);
                    }
                })
            }
        };
    });
}());