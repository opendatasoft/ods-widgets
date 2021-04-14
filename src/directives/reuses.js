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
         * The odsReuses widget displays all reuses published on a domain in an infinite list of large boxes, presenting reuses in a clear display. The list shows the more recent reuses first.
         *
         * You can optionally insert HTML code inside the `<ods-reuses></ods-reuses>` element, in which case it will be used
         * as a template for each displayed reuse. The following variables are available in the template:
         * * `reuse.url`: URL to the reuse's dataset page
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
         *          <ods-catalog-context context="paris" paris-domain="https://opendata.paris.fr">
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
                      '      <div class="odswidget-reuses__reuse" ng-repeat="reuse in reuses" ods-full-click inject>' +
                      '          <h2 class="odswidget-reuses__reuse-title">{{ reuse.title }}' +
                      '             <a href="/explore/dataset/{{ reuse.dataset.id }}/?tab=metas" class="odswidget-reuses__reuse-dataset-link" target="_self"><span translate>From dataset:</span> {{ reuse.dataset.title }}</a>' +
                      '          </h2>' +
                      '          <div class="odswidget-reuses__reuse-infos">' +
                      '              <div class="odswidget-reuses__reuse-thumbnail" ng-class="{\'odswidget-reuses__reuse-thumbnail--no-thumbnail\': !reuse.thumbnail}">' +
                      '                  <a ng-show="reuse.thumbnail" href="{{ reuse.url }}" ods-main-click title="{{ reuse.title }}" target="_blank"><img class="odswidget-reuses__reuse-thumbnail-image" ng-src="{{ reuse.thumbnail }}" /></a>' +
                      '                  <i ng-hide="reuse.thumbnail" aria-hidden="true" class="fa fa-ban odswidget-reuses__reuse-thumbnail-image--no-thumbnail"></i>' +
                      '              </div>' +
                      '              <div class="odswidget-reuses__reuse-description" ng-bind-html="reuse.description|prettyText|safenewlines"></div>' +
                      '          </div>' +
                      '          <div class="odswidget-reuses__reuse-author">' +
                      '              <strong ng-if="reuse.user.first_name || reuse.user.last_name">{{ reuse.user.first_name }} {{ reuse.user.last_name }}</strong>' +
                      '              <strong ng-if="!reuse.user.first_name && !reuse.user.last_name">{{ reuse.user.username }}</strong>' +
                      '              <i class="fa fa-calendar odswidget-reuses__creation-icon" aria-hidden="true"></i> {{ reuse.created_at|moment:\'LLL\' }}' +
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
                var reuses = ODSAPI.uniqueCall(ODSAPI.reuses);

                $scope.reuses = [];

                $scope.loadMore = function() {
                    if ($scope.reuses.length && !done && !fetching) {
                        fetching = true;
                        var start = page * resultsPerPage;
                        reuses($scope.context, {'rows': resultsPerPage, 'start': start}).
                            then(function(response) {
                                var data = response.data;
                                $scope.reuses = $scope.reuses.concat(data.reuses);
                                done = (page + 1) * resultsPerPage >= numberReuses;
                                page++;
                                fetching = false;
                            }, function() {
                                fetching = false;
                            });
                    }
                };

                var refresh = function() {
                    fetching = true;
                    reuses($scope.context, {'rows': resultsPerPage}).
                        then(function(response) {
                            var data = response.data;
                            $scope.reuses = data.reuses;
                            done = resultsPerPage >= data.nhits;
                            numberReuses = data.nhits;
                            fetching = false;
                        }, function() {
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
