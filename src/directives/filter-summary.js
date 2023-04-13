(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFilterSummary', ['odsTimerangeParser', 'odsTimescaleParser', 'odsTimeboundParser', 'ValueDisplay', 'QueryParameters', function (odsTimerangeParser, odsTimescaleParser, odsTimeboundParser, ValueDisplay, QueryParameters) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFilterSummary
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context
         * {@link ods-widgets.directive:odsCatalogContext Catalog Context} or
         * {@link ods-widgets.directive:odsDatasetContext Dataset Context} to display the filters of. Can also be a
         * list of contexts.
         * @param {string} [exclude=none] Optional: Name of parameters not to display, separated by commas. For example, `q,rows,start`
         * @param {boolean} [clearAllButton=true] Optional: display a "clear all" button underneath the active filters' list.
         * @param {boolean} [hideContextsLabels=false] Optional: if you are working with multiple contexts, the
         * context's label will be displayed within the filter. Set this option to true if you'd like not to display
         * those.
         * @param {string} [mycontextLabel] Optional: if you are working with multiple contexts, the context's name
         * (that is "mycontext") will be displayed within the filter. Use this option to specify a custom label.
         * @description
         * The odsFilterSummary widget displays a summary of all the active filters in a context: text search, refinements, etc.
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
            '            <span ng-if="!refinement.displayValue.type" ' +
            '                  class="odswidget-filter-summary__active-filter-value"' +
            '                  ng-bind-html="refinement.displayValue"></span> ' +
            '            <span ng-if="refinement.displayValue.type === \'visualization\'" ' +
            '                  class="odswidget-filter-summary__active-filter-value" ' +
            '                  ng-bind-html="refinement.displayValue.value"></span>' +
            '        </a>' +
            '    </li>' +
            '    <li class="odswidget-filter-summary__clear-all" ng-show="clearAllButton && refinements.length > 0">' +
            '        <ods-clear-all-filters context="context" except="excludes"></ods-clear-all-filters>' +
            '    </li>' +
            '</ul>',
            scope: {
                context: '=',
                exclude: '@',
                clearAllButton: '=?',
                hideContextsLabels: '=?'
            },
            controller: ['$scope', '$attrs', '$filter', 'translate', function ($scope, $attrs, $filter, translate) {
                var timeParameters = ['timerange', 'from_date', 'to_date'];


                // Parameters

                // default activated
                if (Boolean($scope.clearAllButton) !== $scope.clearAllButton) {
                    $scope.clearAllButton = true;
                }

                $scope.excludes = $scope.exclude ? $scope.exclude.split(',') : [];

                // Methods
                var isParameterActive = function (context, parameterName) {
                    return context &&
                           context.parameters &&
                           $scope.excludes.indexOf(parameterName) === -1 &&
                           context.parameters[parameterName] &&
                           context.parameters[parameterName] !== undefined;
                };

                var getFacetGroupLabel = function (context, facetGroupName) {
                    if (context.type === 'catalog') {
                        if (facetGroupName === 'features') {
                            // FIXME: Find a way to centralize all these special cases regarding the "schema" of the catalog
                            facetGroupName = translate('View');
                        }
                        // Since metadata templates other than "basic/default" can be used, the facetGroupName may
                        // contain the name of the template, e.g. "dcat.contact_name" that we want to strip.
                        facetGroupName = facetGroupName.slice(facetGroupName.indexOf('.') + 1);
                        return translate(ODS.StringUtils.capitalize(facetGroupName));
                    } else {
                        return context.dataset.getFieldLabel(facetGroupName);
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
                                if (valueList[i] === refinement.value) {
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
                        if (typeof displayValue === "undefined") {
                            displayValue = ODS.StringUtils.escapeHTML(value);
                        }
                        var inserted = false;
                        angular.forEach(refinements, function (refinement) {
                            if (refinement.parameter === parameter &&
                                refinement.label === label &&
                                refinement.value === value) {
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

                    var addTimeRefinement = function (context, parameter) {

                        var fromLabel = 'From';
                        var toLabel = 'To';

                        var getTimeLabels = function(timeField){
                            if (document.querySelectorAll('[time-field="' + timeField.name + '"]').length > 0 ){
                                var timeWidgets = document.querySelectorAll('[time-field="' + timeField.name + '"]');
                                var timerangeFound = false;
                                angular.forEach(timeWidgets, function(timeWidget){
                                    if (!timerangeFound) {
                                        if (jQuery(timeWidget).is('.odswidget-timerange')){
                                            timerangeFound = true;
                                            if (!angular.isUndefined(jQuery(timeWidget).attr('label-from'))) {
                                                fromLabel = jQuery(timeWidget).attr('label-from');
                                            }
                                            if (!angular.isUndefined(jQuery(timeWidget).attr('label-to'))) {
                                                toLabel = jQuery(timeWidget).attr('label-to');
                                            }
                                        }
                                    }
                                });
                            }

                        };

                        var timeField;

                        if (parameter.indexOf('.timerange') !== -1) {
                            var timerange = odsTimerangeParser(context.parameters[parameter]);
                            timeField = context.dataset.getField(timerange.field);

                            getTimeLabels(timeField);

                            var timerangeDisplayValue = translate(fromLabel + ' {fromDate} ' + ' ' + toLabel + ' {toDate}');

                            timerangeDisplayValue = format_string(timerangeDisplayValue, {
                                fromDate: moment(timerange.from).format('LL'),
                                toDate: moment(timerange.to).format('LL')
                            });
                            addRefinement(context, timeField.label, context.parameters[parameter], parameter, timerangeDisplayValue);

                        } else if (parameter.indexOf('.from_date') !== -1) {
                            var fromDate = odsTimeboundParser(context.parameters[parameter]);
                            timeField = context.dataset.getField(fromDate.field);

                            getTimeLabels(timeField);

                            var fromDateDisplayValue = translate(fromLabel + ' {fromDate}');

                            fromDateDisplayValue = format_string(fromDateDisplayValue, {
                                fromDate: moment(fromDate.date).format('LL')
                            });
                            addRefinement(context, timeField.label, context.parameters[parameter], parameter, fromDateDisplayValue);

                        } else if (parameter.indexOf('.to_date') !== -1) {
                            var toDate = odsTimeboundParser(context.parameters[parameter]);
                            timeField = context.dataset.getField(toDate.field);

                            getTimeLabels(timeField);

                            var toDateDisplayValue = translate(toLabel + ' {toDate}');
                            toDateDisplayValue = format_string(toDateDisplayValue, {
                                toDate: moment(toDate.date).format('LL')
                            });
                            addRefinement(context, timeField.label, context.parameters[parameter], parameter, toDateDisplayValue);
                        }
                    };

                    // build refinements list

                    angular.forEach(contexts, function (context) {

                        if (context && context.parameters && (context.type === 'catalog' || context.dataset)) {
                            var isTimeQuery = false;

                            if (isParameterActive(context, 'q')) {
                                addRefinement(context, translate('Text search'), context.parameters['q'], 'q');
                            }

                            var drawnAreaParameters = ['geofilter.distance', 'geofilter.polygon'];
                            angular.forEach(drawnAreaParameters, function (parameter) {
                                if (isParameterActive(context, parameter)) {
                                    addRefinement(context, getFirstGeoFieldLabel(context), context.parameters[parameter], parameter, translate('Drawn area on the map'));
                                }
                            });

                            if (isParameterActive(context, 'q.timescale')) {
                                var timescale = odsTimescaleParser(context.parameters['q.timescale']);
                                addRefinement(context, context.dataset.getFieldLabel(timescale.field), context.parameters['q.timescale'], 'q.timescale', timescale.scaleLabel);
                            }

                            if (isParameterActive(context, 'q.mapfilter')) {
                                addRefinement(context, translate('Map filter'), context.parameters['q.mapfilter'], 'q.mapfilter');
                            }

                            if (isParameterActive(context, 'geonav')) {
                                addRefinement(context, translate('Location'), context.parameters['geonav'], 'geonav',  translate('Chosen territory'));
                            }

                            // Handle query with suffix attribute (q.mysuffix)
                            angular.forEach(context.parameters, function (value, parameter) {
                                var reservedQueryParameters = QueryParameters;
                                // Checks for the presence of "q.something" with .something not being any of the other accepted query parameters.
                                var pattern = /q\.[^\s]*/;

                                angular.forEach(timeParameters, function (timeParameter) {
                                    if (parameter.indexOf(timeParameter) !== -1) {
                                        isTimeQuery = true;
                                    }
                                });

                                var isTextQuery = (reservedQueryParameters.indexOf(parameter) === -1) && parameter.match(pattern);

                                if (!isTimeQuery && isTextQuery && isParameterActive(context, parameter)) {
                                    // addRefinement(context, translate('Text search'), value, parameter, displayValue);
                                    addRefinement(context, translate('Text search'), value, parameter, ODS.StringUtils.escapeHTML(value));
                                } else if (isTimeQuery && isParameterActive(context, parameter)) {
                                    addTimeRefinement(context, parameter);
                                }
                            });

                            // Handle facets
                            angular.forEach(context.parameters, function (values, parameter) {
                                if (parameter.substring(0, 7) === 'refine.' && $scope.excludes.indexOf(parameter) === -1) {
                                    var fieldName = parameter.substring(7);
                                    var label = getFacetGroupLabel(context, fieldName);
                                    if (!angular.isArray(values)) {
                                        values = [values];
                                    }
                                    angular.forEach(values, function (value) {
                                        var displayValue;
                                        if (context.type === 'catalog' && fieldName === 'language') {
                                            displayValue = ValueDisplay.format(value, 'language');
                                        } else if (context.type === 'catalog' && fieldName === 'features') {
                                            displayValue = {};
                                            displayValue.type = 'visualization';
                                            displayValue.value = ValueDisplay.format(value, 'visualization');
                                        } else {
                                            displayValue = ODS.StringUtils.escapeHTML(value);
                                        }
                                        addRefinement(context, label, value, parameter, displayValue);
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
                                    return $attrs[ctx.name + 'Label'] || ctx.name;
                                })
                                .join(', ');
                        }
                    });

                    return refinements;
                };

                $scope.$watch('context', function (nv) {
                    $scope.refinements = refreshRefinements(angular.isArray(nv) ? nv : [nv]);
                }, true);
            }]
        };
    }]);
}());
