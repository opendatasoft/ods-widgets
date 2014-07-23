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
         * @description
         * This widget displays the last 5 reuses published on a domain.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-last-reuses-feed">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="reuses" translate>No data available yet</li>' +
                '   <li ng-repeat="reuse in reuses" ng-if="reuses">' +
                '       <div class="reuse-thumbnail">' +
                '           <span style="display: inline-block; height: 100%; vertical-align: middle;"></span>' +
                '           <a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self"><img ng-if="reuse.thumbnail" ng-src="{{ reuse.thumbnail }}"></a>' +
                '       </div>' +
                '       <div class="reuse-details">' +
                '           <div class="title"><a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self">{{ reuse.title }}</a></div>' +
                '           <div class="dataset"><a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self">{{ reuse.dataset.title }}</a></div>' +
                '           <div class="modified"><span title="{{ reuse.created_at|moment:\'LLL\' }}"><i class="icon-calendar"></i> {{ reuse.created_at|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    // TODO: If the context is a dataset-context
                    ODSAPI.reuses($scope.context, {'rows': 5, 'sort': 'modified'}).
                        success(function(data) {
                            $scope.reuses = data;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());