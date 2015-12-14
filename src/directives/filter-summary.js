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
         * @param {boolean} [clearAllButton=true] Optional: display a "clear all" button underneath the active filters' list.
         * @description
         * This widget displays a summary of all the active filters on a context: text search, refinements...
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<ul class="odswidget odswidget-filter-summary">' +
                '    <li class="odswidget-filter-summary__active-filter" ng-show="isParameterActive(\'q\')">' +
                '        <a class="odswidget-filter-summary__active-filter-link" ng-click="removeParameter(\'q\')">' +
                '            <span class="odswidget-filter-summary__active-filter-label" translate>Text</span> {{context.parameters.q}}' +
                '        </a>' +
                '    </li>' +
                '    <li class="odswidget-filter-summary__active-filter" ng-show="isParameterActive(\'geofilter.polygon\') || isParameterActive(\'geofilter.distance\')">' +
                '        <a class="odswidget-filter-summary__active-filter-link" ng-click="removeParameter(\'geofilter.polygon\'); removeParameter(\'geofilter.distance\');"> ' +
                '            <span class="odswidget-filter-summary__active-filter-label" translate>Drawn area on the map</span>' +
                '        </a>' +
                '    </li>' +
                '    <li class="odswidget-filter-summary__active-filter" ng-repeat="refinement in refinements">' +
                '        <a class="odswidget-filter-summary__active-filter-link" ng-click="removeParameter(\'refine.\'+refinement.groupName, refinement.path)">' +
                '            <span class="odswidget-filter-summary__active-filter-label">{{refinement.groupLabel}}</span> ' +
                '            {{refinement.label}}' +
                '        </a>' +
                '    </li>' +
                '    <li class="odswidget-filter-summary__clear-all" ng-show="clearAllButton && isAnyFilterActive">' +
                '        <ods-clear-all-filters context="context"></ods-clear-all-filters>' +
                '    </li>' +
                '</ul>',
            scope: {
                context: '=',
                exclude: '@',
                clearAllButton: '=?'
            },
            controller: ['$scope', 'translate', function($scope, translate) {
                // default activated
                if (Boolean($scope.clearAllButton) !== $scope.clearAllButton) {
                    $scope.clearAllButton = true;
                }
                $scope.isAnyFilterActive = false;

                var excludes = $scope.exclude ? $scope.exclude.split(',') : [];
                $scope.isParameterActive = function(name) {
                    return $scope.context && $scope.context.parameters && excludes.indexOf(name) === -1 && $scope.context.parameters[name] && $scope.context.parameters[name] !== undefined;
                };
                var getFacetGroupLabel = function(facetGroupName) {
                    if ($scope.context.type === 'catalog') {
                        if (facetGroupName === 'features') {
                            // FIXME: Find a way to centralize all these special cases regarding the "schema" of the catalog
                            facetGroupName = 'view';
                        }
                        return translate(ODS.StringUtils.capitalize(facetGroupName));
                    }  else {
                        for (var i=0; i<$scope.context.dataset.fields.length; i++) {
                            var field = $scope.context.dataset.fields[i];
                            if (field.name == facetGroupName) {
                                return field.label;
                            }
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

                    if ($scope.context && $scope.context.parameters && ($scope.context.type === 'catalog' || $scope.context.dataset))
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

                    $scope.isAnyFilterActive = $scope.context.getActiveFilters().length > 0;
                };

                $scope.$watch('context', function(newValue, oldValue) {
                    refreshRefinements();
                }, true);
            }]
        };
    });
}());
