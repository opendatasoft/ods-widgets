(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsReuses', ['ODSAPI', 'ODSWidgetsConfig', '$sce', function(ODSAPI, ODSWidgetsConfig, $sce) {
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
            templateUrl: $sce.trustAsResourceUrl(ODSWidgetsConfig.basePath + 'templates/reuses.html'),
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