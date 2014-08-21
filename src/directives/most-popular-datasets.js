(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMostPopularDatasets', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMostPopularDatasets
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the top 5 datasets of a catalog, based on the number of downloads.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="public" public-domain="public.opendatasoft.com">
         *              <ods-most-popular-datasets context="public"></ods-most-popular-datasets>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-most-popular-datasets">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="datasets" translate>No data available yet</li>' +
                '   <li ng-repeat="dataset in datasets" ng-if="datasets">' +
                '       <ods-theme-picto theme="{{dataset.metas.theme}}"></ods-theme-picto>' +
                '       <div class="dataset-details">' +
                '           <div class="title"><a ng-href="{{context.domainUrl}}/explore/dataset/{{dataset.datasetid}}/" target="_self">{{ dataset.metas.title }}</a></div>' +
                '           <div class="count"><i class="icon-download-alt"></i> {{ dataset.extra_metas.explore.download_count }} ' + "<ng-pluralize count=\"dataset.extra_metas.explore.download_count\" translate=\"when\" when=\"{'0': 'download', '1': 'download', 'other': 'downloads'}\"></ng-pluralize>" + '</div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.search($scope.context, {'rows': 5, 'sort': 'explore.download_count', 'extrametas': true}).
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