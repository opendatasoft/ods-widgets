(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsLastDatasetsFeed', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsLastDatasetsFeed
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the last datasets of a catalog (default is last 5), based on the *modified* metadata.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="example" example-domain="data.opendatasoft.com">
         *              <ods-last-datasets-feed context="example"></ods-last-datasets-feed>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-last-datasets-feed">' +
                '<ul class="odswidget-last-datasets-feed__datasets">' +
                '   <li class="no-data" ng-hide="datasets" translate>No data available yet</li>' +
                '   <li class="odswidget-last-datasets-feed__dataset" ng-repeat="dataset in datasets" ng-if="datasets">' +
                '       <ods-theme-picto class="odswidget-last-datasets-feed__theme-picto" theme="{{dataset.metas.theme|firstValue}}"></ods-theme-picto>' +
                '       <div class="odswidget-last-datasets-feed__dataset-details">' +
                '           <div class="odswidget-last-datasets-feed__dataset-details-title"><a ng-href="{{context.domainUrl}}/explore/dataset/{{dataset.datasetid}}/" target="_self">{{ dataset.metas.title }}</a></div>' +
                '           <div class="odswidget-last-datasets-feed__dataset-details-modified"><i class="fa fa-calendar" aria-hidden="true"></i> <span title="{{ dataset.metas.modified|moment:\'LLL\' }}"><span translate>Modified</span> {{ dataset.metas.modified|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '=',
                max: '@'
            },
            controller: ['$scope', function($scope) {
                $scope.max = $scope.max || 5;
                var search = ODSAPI.datasets.search;
                var refresh = function() {
                    search($scope.context, {'rows': $scope.max, 'sort': 'modified'}).
                        then(function(response) {
                            $scope.datasets = response.data.datasets;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());
