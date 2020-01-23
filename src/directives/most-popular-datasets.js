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
         * @param {integer} [max=5] Amount of datasets to show in list
         * @param {string} [orderBy=downloads] Order the list by most downloaded or popularity. Options: "downloads" or "popularity".
         * @description
         * This widget displays the top datasets of a catalog (default is the 5 top datasets), based on the number of downloads.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="example"
         *                               example-domain="data.opendatasoft.com">
         *              <ods-most-popular-datasets context="example"></ods-most-popular-datasets>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-most-popular-datasets">' +
                '<ul class="odswidget-most-popular-datasets__datasets">' +
                '   <li class="no-data" ng-hide="datasets" translate>No data available yet</li>' +
                '   <li class="odswidget-most-popular-datasets__dataset" ng-repeat="dataset in datasets" ng-if="datasets">' +
                '       <ods-theme-picto class="odswidget-most-popular-datasets__theme-picto" theme="{{dataset.metas.theme|firstValue}}"></ods-theme-picto>' +
                '       <div class="odswidget-most-popular-datasets__dataset-details">' +
                '           <div class="odswidget-most-popular-datasets__dataset-details-title"><a ng-href="{{context.domainUrl}}/explore/dataset/{{dataset.datasetid}}/" target="_self">{{ dataset.metas.title }}</a></div>' +
                '           <div ng-if="displayMode === \'download_count\' " class="odswidget-most-popular-datasets__dataset-details-count">' +
                '               <i class="fa fa-download" aria-hidden="true"></i> <span translate translate-n="dataset.extra_metas.explore.download_count|number:0" translate-plural="{{$count}} downloads">{{$count}} download</span>' +
                '           </div>' +
                '           <div ng-if="displayMode === \'popularity_score\' " class="odswidget-most-popular-datasets__dataset-details-count">' +
                '               <i class="fa fa-trophy" aria-hidden="true"></i> <span ods-tooltip="The popularity score is the result of a calculation that uses the number of downloads, reuses and API calls of a dataset. The higher the score is, the more the dataset is being used!" translate="ods-tooltip">{{ dataset.extra_metas.explore.popularity_score  | number:0}}</span>' +
                '           </div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '=',
                max: '@',
                orderBy: '@'
            },
            controller: ['$scope', function($scope) {
                $scope.max = $scope.max || '5';

                var displayMode = function() {
                    if (['popularity'].indexOf($scope.orderBy) === 0) {
                        return 'popularity_score';
                    }
                    return 'download_count';
                };

                $scope.displayMode = displayMode();

                var search = ODSAPI.uniqueCall(ODSAPI.datasets.search);
                var refresh = function() {
                    search($scope.context, {'rows': $scope.max, 'sort': 'explore.' + $scope.displayMode, 'extrametas': true}).
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
