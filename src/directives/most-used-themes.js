(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMostUsedThemes', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMostUsedThemes
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the 5 most used themes.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="public" public-domain="public.opendatasoft.com">
         *              <ods-most-used-themes context="public"></ods-most-used-themes>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-most-used-themes">' +
                '<ul class="odswidget-most-used-themes__themes">' +
                '   <li class="no-data" ng-hide="themes" translate>No data available yet</li>' +
                '   <li class="odswidget-most-used-themes__theme" ng-repeat="theme in themes" ng-if="themes">' +
                '       <div class="odswidget-most-used-themes__theme-details">' +
                '           <div class="odswidget-most-used-themes__theme-details-name"><a ng-href="{{ context.domainUrl }}/explore/?refine.theme={{ theme.path }}" target="_self">{{ theme.name }}</a></div>' +
                '           <div class="odswidget-most-used-themes__theme-details-count"><i class="fa fa-table" aria-hidden="true"></i> <span translate translate-n="theme.count" translate-plural="Used by {{$count}} datasets">Used by {{$count}} dataset</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.facets($scope.context, 'theme').
                        success(function(data) {
                            if (data.facet_groups) {
                                $scope.themes = data.facet_groups[0].facets.slice(0, 5);
                            }
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());
