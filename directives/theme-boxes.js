(function() {
    'use strict';
    // TODO: There are hard dependencies in explore.less, this should not be here...
    // It is linked to our own code via the theme system. We can't really expose it without a dependency to that code.
    var mod = angular.module('ods-widgets');

    mod.directive('odsThemeBoxes', function() {
        return {
            restrict: 'E',
            replace: false,
            template: '<div class="odswidget-theme-boxes">' +
                '<ods-facet-enumerator context="context" facet="theme">' +
                    '<a ng-href="{{context.domainUrl}}/explore/?refine.theme={{item.path}}" target="_self" ods-tooltip="{{item.name}} ({{item.count}} jeux de données)" ods-tooltip-direction="bottom" style="display: block;">' +
                        '<ods-theme-picto theme="{{item.name}}"></ods-theme-picto>' +
                    '</a>' +
                '</div>' +
                '</ods-facet-enumerator>' +
                '</div>',
            scope: {
                context: '='
            }
        };
    });

}());