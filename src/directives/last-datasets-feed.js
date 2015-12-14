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
         * This widget displays the last 5 datasets of a catalog, based on the *modified* metadata.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="public" public-domain="public.opendatasoft.com">
         *              <ods-last-datasets-feed context="public"></ods-last-datasets-feed>
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
                '           <div class="odswidget-last-datasets-feed__dataset-details-modified"><i class="fa fa-calendar"></i> <span title="{{ dataset.metas.modified|moment:\'LLL\' }}"><span translate>Modified</span> {{ dataset.metas.modified|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.search($scope.context, {'rows': 5, 'sort': 'modified'}).
                        success(function(data) {
                            $scope.datasets = data.datasets;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());