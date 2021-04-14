(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsLastReusesFeed', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsLastReusesFeed
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {number} [max=5] Maximum number of reuses to show
         * @param {boolean} [externalLinks=false] Clicking on the reuses' titles or images will directly redirect to the reuse.
         * Otherwise, by default, it will redirect to the dataset.
         * @description
         * This widget displays the last five reuses published on a domain.
         *
         * It is possible to customize the template used to display each reuse by adding HTML inside the widget's tag.
         * The following variables are available:
         *
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
         *          <ods-catalog-context context="public" public-domain="https://public.opendatasoft.com">
         *              <ods-last-reuses-feed context="public"></ods-last-reuses-feed>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            template: '<div class="odswidget odswidget-last-reuses-feed">' +
                '<ul class="odswidget-last-reuses-feed__reuses">' +
                '   <li class="no-data" ng-hide="reuses" translate>No data available yet</li>' +
                '   <li class="odswidget-last-reuses-feed__reuse" ng-repeat="reuse in reuses" ng-if="reuses" inject>' +
                '       <div class="odswidget-last-reuses-feed__reuse-thumbnail">' +
                '           <span style="display: inline-block; height: 100%; vertical-align: middle;"></span>' +
                '           <a ng-href="{{reuse.url}}" target="_self"><img class="odswidget-last-reuses-feed__reuse-thumbnail-image" ng-if="reuse.thumbnail" ng-src="{{ reuse.thumbnail }}"></a>' +
                '       </div>' +
                '       <div class="odswidget-last-reuses-feed__reuse-details">' +
                '           <div class="odswidget-last-reuses-feed__reuse-details-title"><a ng-href="{{reuse.url}}" target="_self">{{ reuse.title }}</a></div>' +
                '           <div class="odswidget-last-reuses-feed__reuse-details-dataset"><a ng-href="{{reuse.datasetUrl}}" target="_self">{{ reuse.dataset.title }}</a></div>' +
                '           <div class="odswidget-last-reuses-feed__reuse-details-modified"><span title="{{ reuse.created_at|moment:\'LLL\' }}"><i class="fa fa-calendar" aria-hidden="true"></i> {{ reuse.created_at|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '=',
                max: '@',
                externalLinks: '=?'
            },
            controller: ['$scope', function($scope) {
                $scope.max = $scope.max || 5;
                var reuses = ODSAPI.uniqueCall(ODSAPI.reuses);
                var refresh = function() {
                    if ($scope.context.type === 'catalog') {
                        reuses($scope.context, {'rows': $scope.max}).
                            then(function(response) {
                                var data = response.data;
                                angular.forEach(data.reuses, function(reuse) {
                                    if (!$scope.externalLinks) {
                                        reuse.url = $scope.context.domainUrl + '/explore/dataset/' + reuse.dataset.id + '/information/';
                                    }
                                    reuse.datasetUrl = $scope.context.domainUrl + '/explore/dataset/' + reuse.dataset.id + '/information/';
                                });
                                $scope.reuses = data.reuses;
                            });
                    }
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());
