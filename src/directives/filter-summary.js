(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFilterSummary', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFilterSummary
         * @scope
         * @restrict A
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to display the filters of
         * @param {string} [exclude=none] Optional: Name of parameters to not display, separated by commas. For example `q,rows,start`
         * @description
         * This widget displays a summary if all the active filters on a context: text search, refinements...
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<ul class="odswidget odswidget-filter-summary filters">' +
                '<li ng-show="isParameterActive(\'q\')">' +
                '    <a ng-click="removeParameter(\'q\')"><span class="filter-label">Text</span> {{context.parameters.q}}</a>' +
                '</li>' +
                '<li ng-show="isParameterActive(\'geofilter.polygon\') || isParameterActive(\'geofilter.distance\')">' +
                '    <a ng-click="removeParameter(\'geofilter.polygon\'); removeParameter(\'geofilter.distance\');" translate>Drawn area on the map</a>' +
                '</li>' +
                '<li ng-repeat="refinement in refinements">' +
                '    <a ng-click="removeParameter(\'refine.\'+refinement.groupName, refinement.path)"><span class="filter-label">{{refinement.groupLabel}}</span> {{refinement.label}}</a>' +
                '</li>',
            scope: {
                context: '=',
                exclude: '@'
            },
            controller: ['$scope', function($scope) {
                var excludes = $scope.exclude ? $scope.exclude.split(',') : [];
                $scope.isParameterActive = function(name) {
                    return $scope.context.parameters && excludes.indexOf(name) === -1 && $scope.context.parameters[name] && $scope.context.parameters[name] !== undefined;
                };
                var getFacetGroupLabel = function(facetGroupName) {
                    for (var i=0; i<$scope.context.dataset.fields.length; i++) {
                        var field = $scope.context.dataset.fields[i];
                        if (field.name == facetGroupName) {
                            return field.label;
                        }
                    }
                };

                $scope.removeParameter = function(paramName, paramValue) {
                    if (!paramValue) {
                        delete $scope.context.parameters[paramName];
                    } else {
                        var valueList = $scope.context.parameters[paramName];
                        if (!angular.isArray(valueList)) {
                            valueList = [valueList];
                        }
                        for (var i=0; i<valueList.length; i++) {
                            if (valueList[i] == paramValue) {
                                valueList.splice(i, 1);
                                if (valueList.length === 0) {
                                    delete $scope.context.parameters[paramName];
                                }
                                return;
                            }
                        }
                    }
                };
                var refreshRefinements = function() {
                    var refinements = [];

                    if ($scope.context.parameters && $scope.context.dataset)
                        for (var paramName in $scope.context.parameters) {
                            if (paramName.substring(0, 7) == 'refine.' && excludes.indexOf(paramName) === -1) {
                                var refinementPaths = $scope.context.parameters[paramName];
                                var facetGroupName = paramName.substring(7);
                                if (!angular.isArray(refinementPaths)) {
                                    refinementPaths = [refinementPaths];
                                }
                                // Find the right top-level facets to begin
                                for (var r=0; r<refinementPaths.length; r++) {
                                    // Iterate over each refinement path for this facet group
                                    var refinementPath = refinementPaths[r];
                                    refinements.push({
                                        groupLabel: getFacetGroupLabel(facetGroupName),
                                        groupName: facetGroupName,
                                        path: refinementPath,
                                        label: refinementPath.replace(/\//g, ' > ')
                                    });
                                }
                            }
                        }
                    $scope.refinements = refinements;
                };

                $scope.$watch('context', function(newValue, oldValue) {
                    refreshRefinements();
                }, true);
            }]
        };
    });
}());