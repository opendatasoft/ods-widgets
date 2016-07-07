(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsThemeBoxes', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsThemeBoxes
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to pull the theme list from.
         * @param {string} facetName Name of the facet to enumerate
         * @description
         * This widget enumerates the themes available on the domain, by showing their pictos and the number of datasets they contain.
         * They require the `themes` setting to be configured in {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig}.
         */
        return {
            restrict: 'E',
            replace: false,
            template: '' +
                '<div class="odswidget odswidget-theme-boxes">' +
                '   <div ng-repeat="item in items" class="odswidget-theme-boxes__box" ods-facet-results="items" ods-facet-results-context="context" ods-facet-results-facet-name="theme">' +
                '       <a ng-href="{{context.domainUrl}}/explore/?refine.theme={{encode(item.path)}}" target="_self" translate="ods-tooltip" translate-n="item.count" translate-plural="{{item.name}} ({{$count}} datasets)" ods-tooltip="{{item.name}} ({{$count}} dataset)" ods-tooltip-direction="bottom" style="display: block;">' +
                '           <ods-theme-picto class="odswidget-theme-boxes__picto" theme="{{item.name}}"></ods-theme-picto>' +
                '       </a>' +
                '   </div>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                $scope.encode = encodeURIComponent;
            }]
        };
    });

}());