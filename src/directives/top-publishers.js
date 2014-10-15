(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTopPublishers', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTopPublishers
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the 5 top publishers
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="public" public-domain="public.opendatasoft.com">
         *              <ods-top-publishers context="public"></ods-top-publishers>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-top-publishers">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="publishers" translate>No data available yet</li>' +
                '   <li ng-repeat="publisher in publishers" ng-if="publishers">' +
                '       <div class="dataset-details">' +
                '           <div class="name"><a ng-href="{{ context.domainUrl }}/explore/?refine.publisher={{ publisher.path }}" target="_self">{{ publisher.name }}</a></div>' +
                '           <div class="count"><i class="icon-table"></i> <span translate>Used by</span> {{ publisher.count }} ' + "<span ng-pluralize count=\"publisher.count\" translate=\"when\" when=\"{'0': 'dataset', '1': 'dataset', 'other': 'datasets'}\"></span>" + '</div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.facets($scope.context, 'publisher').
                        success(function(data) {
                            $scope.publishers = data.facet_groups[0].facets.slice(0, 5);
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());