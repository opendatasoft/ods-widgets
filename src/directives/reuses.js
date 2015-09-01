(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsReuses', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsReuses
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays all reuses published on a domain, in a infinite list of large boxes that presents them
         * in a clear display. The lists show the more recent reuses first.
         *
         * You can optionally insert HTML code inside the `<ods-reuses></ods-reuses>` element, in which case it will be used
         * as a template for each displayed reuse. The following variables are available in the template:
         * * `reuse.url: URL to the reuse's dataset page
         * * `reuse.title`: Title of the reuse
         * * `reuse.thumbnail`: URL to the thumbnail of the reuse
         * * `reuse.description`: Description of the reuse
         * * `reuse.created_at`: ISO datetime of reuse's original submission (can be used as `reuse.created_at|moment:'LLL'` to format it)
         * * `reuse.dataset.title`: Title of the reuse's dataset
         * * `reuse.user.last_name`: Last name of the reuse's submitter
         * * `reuse.user.first_name`: First name of the reuse's submitter
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="paris" paris-domain="http://opendata.paris.fr">
         *              <ods-reuses context="paris"></ods-reuses>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            template: '<div class="odswidget odswidget-reuses">' +
                      '  <div infinite-scroll="loadMore()" infinite-scroll-distance="1">' +
                      '      <div class="reuse-card" ng-repeat="reuse in reuses" full-click inject>' +
                      '          <h2>{{ reuse.title }}' +
                      '             <a href="/explore/dataset/{{ reuse.dataset.id }}/?tab=metas" class="reuse-dataset-link" target="_self"><span translate>From dataset:</span> {{ reuse.dataset.title }}</a>' +
                      '          </h2>' +
                      '          <div class="infos">' +
                      '              <div class="thumbnail" ng-class="{\'no-preview\': !reuse.thumbnail}">' +
                      '                  <a ng-show="reuse.thumbnail" href="{{ reuse.url }}" main-click title="{{ reuse.title }}" target="_blank"><img ng-src="{{ reuse.thumbnail }}" /></a>' +
                      '                  <i ng-hide="reuse.thumbnail" class="icon icon-ban-circle"></i>' +
                      '              </div>' +
                      '              <div class="description" ng-bind-html="reuse.description|prettyText|safenewlines"></div>' +
                      '          </div>' +
                      '          <div class="author-date">' +
                      '              <strong ng-if="reuse.user.first_name || reuse.user.last_name">{{ reuse.user.first_name }} {{ reuse.user.last_name }}</strong>' +
                      '              <strong ng-if="!reuse.user.first_name && !reuse.user.last_name">{{ reuse.user.username }}</strong>' +
                      '              <i class="icon-calendar"></i> {{ reuse.created_at|moment:\'LLL\' }}' +
                      '          </div>' +
                      '      </div>' +
                      ' </div>' +
                    '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                // Infinite scroll parameters
                var done = false;
                var fetching = false;
                var numberReuses = 0;
                var page = 1;
                var resultsPerPage = 20;

                $scope.reuses = [];

                $scope.loadMore = function() {
                    if ($scope.reuses.length && !done && !fetching) {
                        fetching = true;
                        var start = page * resultsPerPage;
                        ODSAPI.reuses($scope.context, {'rows': resultsPerPage, 'start': start}).
                            success(function(data) {
                                $scope.reuses = $scope.reuses.concat(data.reuses);
                                done = (page + 1) * resultsPerPage >= numberReuses;
                                page++;
                                fetching = false;
                            }).
                            error(function() {
                                fetching = false;
                            });
                    }
                };

                var refresh = function() {
                    fetching = true;
                    ODSAPI.reuses($scope.context, {'rows': resultsPerPage}).
                        success(function(data) {
                            $scope.reuses = data.reuses;
                            done = resultsPerPage >= data.nhits;
                            numberReuses = data.nhits;
                            fetching = false;
                        }).
                        error(function(data) {
                            fetching = false;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());