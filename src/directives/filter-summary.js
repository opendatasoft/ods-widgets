(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFilterSummary', function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFilterSummary
         * @scope
         * @restrict A
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context
         * {@link ods-widgets.directive:odsCatalogContext Catalog Context} or
         * {@link ods-widgets.directive:odsDatasetContext Dataset Context} to display the filters of. Can also be a
         * list of contexts.
         * @param {string} [exclude=none] Optional: Name of parameters to not display, separated by commas. For example `q,rows,start`
         * @param {boolean} [clearAllButton=true] Optional: display a "clear all" button underneath the active filters' list.
         * @param {boolean} [hideContextsLabels=false] Optional: if you are working with multiple contexts, the
         * context's label will be displayed within the filter. Set this option to true if you'd like not to display
         * those.
         * @param {string} [mycontextLabel] Optional: if you are working with multiple contexts, the context's name
         * (that is "mycontext") will be displayed within the filter. Use this option to specify a custom label.
         * @description
         * This widget displays a summary of all the active filters on a context: text search, refinements...
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<ul class="odswidget odswidget-filter-summary">' +
            '    <li class="odswidget-filter-summary__active-filter" ' +
            '        ng-repeat="refinement in refinements">' +
            '        <a class="odswidget-filter-summary__active-filter-link" ' +
            '           ng-click="removeRefinement(refinement)">' +
            '            <span class="odswidget-filter-summary__active-filter-label">{{ refinement.label }}<span ng-if="refinement.contextsLabel && !hideContextsLabels"> ({{ refinement.contextsLabel }})</span></span>' +
            '            {{ refinement.displayValue || refinement.value }}' +
            '        </a>' +
            '    </li>' +
            '    <li class="odswidget-filter-summary__clear-all" ng-show="clearAllButton && refinements.length > 0">' +
            '        <ods-clear-all-filters context="context"></ods-clear-all-filters>' +
            '    </li>' +
            '</ul>',
            scope: {
                context: '=',
                exclude: '@',
                clearAllButton: '=?',
                hideContextsLabels: '=?'
            },
            controller: ['$scope', '$attrs', 'translate', function ($scope, $attrs, translate) {
                // Parameters

                // default activated
                if (Boolean($scope.clearAllButton) !== $scope.clearAllButton) {
                    $scope.clearAllButton = true;
                }

                var excludes = $scope.exclude ? $scope.exclude.split(',') : [];

                // Methods

                var isParameterActive = function (context, parameterName) {
                    return context
                        && context.parameters
                        && excludes.indexOf(parameterName) === -1
                        && context.parameters[parameterName]
                        && context.parameters[parameterName] !== undefined;
                };

                var getFacetGroupLabel = function (context, facetGroupName) {
                    if (context.type === 'catalog') {
                        if (facetGroupName === 'features') {
                            // FIXME: Find a way to centralize all these special cases regarding the "schema" of the catalog
                            facetGroupName = 'view';
                        }
                        return translate(ODS.StringUtils.capitalize(facetGroupName));
                    } else {
                        for (var i = 0; i < context.dataset.fields.length; i++) {
                            var field = context.dataset.fields[i];
                            if (field.name == facetGroupName) {
                                return field.label;
                            }
                        }
                    }
                };

                var getFirstGeoFieldLabel = function (context) {
                    for (var i = 0; i < context.dataset.fields.length; i++) {
                        var field = context.dataset.fields[i];
                        if (field.type === 'geo_point_2d' || field.type === 'geo_shape') {
                            return field.label;
                        }
                    }
                    return '';
                };

                $scope.removeRefinement = function (refinement) {
                    angular.forEach(refinement.contexts, function (context) {
                        if (!refinement.value) {
                            delete context.parameters[refinement.parameter];
                        } else {
                            var valueList = context.parameters[refinement.parameter];
                            if (!angular.isArray(valueList)) {
                                valueList = [valueList];
                            }
                            for (var i = 0; i < valueList.length; i++) {
                                if (valueList[i] == refinement.value) {
                                    valueList.splice(i, 1);
                                    if (valueList.length === 0) {
                                        delete context.parameters[refinement.parameter];
                                    }
                                    return;
                                }
                            }
                        }
                    });
                };

                var refreshRefinements = function (contexts) {
                    var refinements = [];

                    var addRefinement = function (context, label, value, parameter, displayValue) {
                        var inserted = false;
                        angular.forEach(refinements, function (refinement) {
                            if (refinement.parameter == parameter
                                && refinement.label == label
                                && refinement.value == value) {
                                refinement.contexts.push(context);
                                inserted = true;
                            }
                        });
                        if (!inserted) {
                            refinements.push({
                                label: label,
                                value: value,
                                displayValue: displayValue,
                                parameter: parameter,
                                contexts: [context]
                            });
                        }
                    };

                    // build refinements list

                    angular.forEach(contexts, function (context) {
                        if (context && context.parameters && (context.type === 'catalog' || context.dataset)) {
                            if (isParameterActive(context, 'q')) {
                                addRefinement(context, translate('Text search'), context.parameters['q'], 'q');
                            }

                            var drawnAreaParameters = ['geofilter.distance', 'geofilter.polygon'];
                            angular.forEach(drawnAreaParameters, function (parameter) {
                                if (isParameterActive(context, parameter)) {
                                    addRefinement(context, getFirstGeoFieldLabel(context), context.parameters[parameter], parameter, translate('Drawn area on the map'));
                                }
                            });

                            if (context.type === 'catalog' && isParameterActive(context, 'q.geographic_area')) {
                                addRefinement(context, translate('Geographic area'), context.parameters['q.geographic_area'], 'q.geographic_area', translate('Drawn area on the map'));
                            }

                            // handle facets
                            angular.forEach(context.parameters, function (values, parameter) {
                                if (parameter.substring(0, 7) == 'refine.' && excludes.indexOf(parameter) === -1) {
                                    var label = getFacetGroupLabel(context, parameter.substring(7));
                                    if (!angular.isArray(values)) {
                                        values = [values];
                                    }
                                    angular.forEach(values, function (value) {
                                        addRefinement(context, label, value, parameter);
                                    });
                                }
                            });
                        }
                    });

                    // build tags for refinements
                    angular.forEach(refinements, function (refinement) {
                        if (refinement.contexts.length < contexts.length) {
                            refinement.contextsLabel = refinement.contexts
                                .map(function (ctx) {
                                    return $attrs[ctx.name + 'Label'] || ctx.name
                                })
                                .join(', ')
                        }
                    });

                    return refinements;
                };

                $scope.$watch('context', function (nv) {
                    $scope.refinements = refreshRefinements(angular.isArray(nv) ? nv : [nv]);
                }, true);
            }]
        };
    });
}());
