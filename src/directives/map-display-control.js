(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapDisplayControl', ['translate', function (translate) {
        return {
            restrict: 'E',
            require: '^odsMap',
            template: '' + '' +
            '<div class="odswidget odswidget-map-display-control"' +
            '     ng-class="{\'odswidget-map-display-control--expanded\': expanded}"  >' +
            '   <button class="odswidget-map-display-control__toggle"' +
            '           ng-if="expanded"' +
            '           ods-tooltip="Collapse panel"' +
            '           translate="ods-tooltip"' +
            '           ods-tooltip-direction="left"' +
            '           ng-click="toggleDisplayControl()">' +
            '       <i class="fa fa-caret-right"></i>' +
            '   </button>' +
            '   <button class="odswidget-map-display-control__toggle"' +
            '           ng-if="!expanded"' +
            '           ods-tooltip="Expand panel"' +
            '           translate="ods-tooltip"' +
            '           ods-tooltip-direction="left"' +
            '           ng-click="toggleDisplayControl()">' +
            '       <i class="fa fa-caret-left"></i>' +
            '   </button>' +
            '   <ul class="odswidget-map-display-control__groups">' +
            '       <li ng-repeat="group in mapConfig.groups" ' +
            '           ng-click="mapConfig.groups.length > 1 && toggleGroup(group)" ' +
            '           ng-class="{\'odswidget-map-display-control__group\': true, \'odswidget-map-display-control__group--disabled\': !group.displayed, \'odswidget-map-display-control__group--not-toggleable\': mapConfig.groups.length === 1}"' +
            '           ng-style="group.pictoColor && {\'border-left-color\':group.pictoColor} || group.layers.length === 1 && group.layers[0].captionPictoColor && {\'border-left-color\':group.layers[0].captionPictoColor}">' +
            '           <ods-map-picto class="odswidget-map-display-control__picto"'+
            '                          ng-if="!group._hasUnknownDataset && (group.pictoIcon || (group.layers.length === 1 && group.layers[0].captionPictoIcon))"'+
            '                          name="{{ group.pictoIcon || group.layers[0].captionPictoIcon }}"'+
            '                          color="{{ group.pictoColor || group.layers[0].captionPictoColor }}">' +
            '           </ods-map-picto>' +
            '           <i class="fa fa-exclamation-triangle odswidget-map-display-control__picto--error" ' +
            '              ng-if="group._hasUnknownDataset"></i>' +
            '           <span class="odswidget-map-display-control__group-title" ' +
            '                ng-class="{\'odswidget-map-display-control__group-title--error\' : group._hasUnknownDataset}"' +
            '                title="{{ getGroupTitle(group) }}" ' +
            '                ng-bind="shortSummaryFilter(getGroupTitle(group), 50)"></span>' +
            '           <div class="odswidget-map-display-control__group-description"' +
            '                ng-class="{\'odswidget-map-display-control__group-description--error\' : group._hasUnknownDataset}"' +
            '                ng-if="getGroupDescription(group)" ' +
            '                ng-bind-html="getGroupDescription(group)|prettyText|safenewlines"></div>' +
            '       </li>' +
            '   </ul>' +
            '</div>',
            scope: {
                mapConfig: '=',
                singleLayer: '='
            },
            link: function (scope, element, attrs, odsMapCtrl) {
                scope.resizeMapDisplayControl = odsMapCtrl.resizeMapDisplayControl;
            },
            controller: ['$scope', 'shortSummaryFilter', function ($scope, shortSummaryFilter) {
                $scope.expanded = true;
                $scope.$emit('toggleMapDisplayControl', {expanded: $scope.expanded});

                $scope.shortSummaryFilter = shortSummaryFilter;

                $scope.getGroupDescription = function(group) {
                    group._hasUnknownDataset = false;
                    angular.forEach(group.layers, function(layer){
                        if (layer.context.dataset === null && layer.context.error){
                            group._hasUnknownDataset = true;
                        }
                    });

                    if (group._hasUnknownDataset && group.layers.length === 1){
                        return translate('The dataset associated with this layer is unknown. Some data may not appear on the map.');
                    } else if (group._hasUnknownDataset && group.layers.length > 1){
                        return translate('One or more datasets associated with this group of layers are unknown. Some data may not appear on the map.');
                    } else if (group.layers.length > 1) {
                        // The group has its own configuration panel, if the description is empty, it's intended
                        return group.description;
                    } else {
                        // The description of the only dataset within is usually the right one, but in widget mode, we
                        // may set the description on the layer group even if there is only one layer
                        return group.description || group.layers[0].description;
                    }

                };

                $scope.getGroupTitle = function(group) {
                    // The title has to have a value
                    return group.title || group.layers[0].title || group.layers[0].context.dataset.metas.title;
                };

                $scope.toggleDisplayControl = function (){
                    $scope.expanded = !$scope.expanded;
                    $scope.$emit('toggleMapDisplayControl', {expanded: $scope.expanded});
                };

                $scope.toggleGroup = function(group) {
                    if (!$scope.singleLayer) {
                        group.displayed = !group.displayed;
                    } else {
                        $scope.mapConfig.groups.forEach(function(group) {group.displayed = false; });
                        group.displayed = true;
                    }
                    $scope.resizeMapDisplayControl();
                };

                $scope.$on('resizeMapDisplayControl', function () {
                    $scope.resizeMapDisplayControl();
                });

                // FIXME: What if we want to have an empty description? Maybe default to empty instead of dataset description?
            }]
        };
    }]);

}());
