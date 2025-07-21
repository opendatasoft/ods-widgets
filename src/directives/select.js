(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    function filterSelectedItemsFromArray(items, selectedItems) {
        var i = 0, selectedDisplayedItems = [];
        for (i = 0; i < items.length; i++) {
            var itemKey = JSON.stringify(items[i].value);
            if (selectedItems[itemKey]) {
                selectedDisplayedItems.push(items[i]);
            }
        }
        return selectedDisplayedItems;
    };

    /* -------------------------------------------------------------------------- */
    /* Filter                                                                     */
    /* -------------------------------------------------------------------------- */

    mod.filter('odsSelectFilter', function() {
        return function(items, inputTextFilter, displaySelectedItemsOnly, selectedItems) {
            if (!inputTextFilter && !displaySelectedItemsOnly) {
                var key = null, itemsArray = [];

                for (key in items) {
                    itemsArray.push(items[key]);
                }

                return itemsArray;
            }

            var lowerCasedInput = ODS.StringUtils.normalize(inputTextFilter.toLowerCase());
            var key = null, filteredItems = [];

            for (key in items) {
                var item = items[key];
                var isSelected = !!selectedItems[JSON.stringify(item.value)];
                var foundMatchingLabel = ODS.StringUtils.normalize(item.label).toLowerCase().indexOf(lowerCasedInput) !== -1;
                var toDisplay = displaySelectedItemsOnly ? isSelected && foundMatchingLabel : foundMatchingLabel;

                if (toDisplay) {
                    filteredItems.push(item);
                }
            }

            return filteredItems;
        };
    });

    mod.filter('odsSelectItemIsSelected', function() {
        return function(item, selectedItems, returnIcon) {
            var itemKey = JSON.stringify(item.value);

            if (returnIcon) {
                return !!selectedItems[itemKey] ? 'fa fa-check-square' : 'fa fa-square-o';
            }

            return !!selectedItems[itemKey] ? true : false;
        };
    });

    /* -------------------------------------------------------------------------- */
    /* Directive                                                                  */
    /* -------------------------------------------------------------------------- */

    mod.directive('odsSelect', ['$document', '$timeout', 'translate', 'translatePlural', function($document, $timeout, translate, translatePlural) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSelect
         * @scope
         * @restrict E
         * @param {array} options The input array of value which feeds the list of options
         * @param {array} selectedValues The variable name to use to store the selected options' values
         * @param {expression} [labelModifier=none] An expression to apply on the options' label
         * @param {expression} [valueModifier=none] An expression to apply on the options' value. This parameter is used to modify the form of the values exposed by `selected-value`.
         * @param {expression} [onChange=none] An expression to evaluate whenever an option has been (de)selected
         * @param {boolean} [multiple=false] When set to `true`, the menu will support multiple selections.
         * @param {boolean} [isLoading=false] Specifies whether the widget should initially display a loader. This parameter will be automatically set to `false` as soon as options are loaded.
         * @param {boolean} [disabled=false] Specifies whether the widget should be disabled.
         * @param {string} [placeholder="Select one or more elements" or "Select one element"] Specifies a short hint that describes the expected value of the select field.
         *
         * @description
         * The odsSelect widget shows a list of options from which users can select one or more options. This list can be made up of strings or objects.
         *
         * If the `options` variable provided to the widget represents a simple array of strings, option labels and values will be automatically calculated by the widget.
         * If the options provided to the widget are objects, use the `label-modifier` and `value-modifier` parameters to define how to handle those objects.
         *
         * The `label-modifier` and `value-modifier` parameters each take an expression applied to each object representing an option.
         * Finally, the selection will be stored in the variable specified in the `selected-values` parameter.
         *
         * <h1>Explanation of the examples</h1>
         *
         * <h2>First example</h2>
         *
         * The first example shows a list of options from which users can select one or multiple trees.
         * This example uses the `ods-dataset-context`, `ods-result`, and `ods-select` widgets:
         * - The `ods-dataset-context` declares a context based on the `les-arbres-remarquables-de-paris` dataset.
         * - The `ods-results` widget is nested within `ods-dataset-context`. It stores the result of the search request in the variable `items`.
         *   The value of the variable `items` will have this form:
         *
         * <pre>
         * [
         *     { fields: { libellefrancais: "Noyer", espece: "nigra",  ... }, ... },
         *     { fields: { libellefrancais: "Marronnier", espece: "hippocastanum",  ... }, ... },
         *     { fields: { libellefrancais: "Chêne", espece: "cerris",  ... }, ... },
         *     ...
         * ]
         * </pre>
         *
         * - The `ods-select` widget is nested within `ods-results`.
         * It defines the list of options users can select, using the `options` parameter set to `items`.
         * `items` corresponds to the variable storing the results in `ods-results`.
         *
         * <b>The parameter `label-modifier`</b>
         *
         * In this example, the desired value for the option label is the field `libellefrancais` from the source dataset.
         * To access the value of this field, the `label-modifier` parameter for `ods-select` is set to `"fields.libellefrancais"`.
         *
         * <b>The parameter `value-modifier`</b>
         *
         * The desired structure for the values returned by `selected-values` is the following:
         *
         * <pre>
         * [
         *     { name: "Noyer", species: "nigra" },
         *     { name: "Marronnier", species: "hippocastanum" },
         *     ...
         * ]
         * </pre>
         *
         * To achieve this, the `value-modifier` for `ods-select` is set to `"{ 'name': fields.libellefrancais, 'species': fields.espece }"`.
         *
         * <h2>Second example</h2>
         *
         * The second example shows two lists of options from which users can select one or multiple options:
         * - From the first list, users can select districts.
         * - From the second list, users can select tree species.
         *
         * In the second example, context parameters are updated by injecting the selected values returned by `ods-select`.
         * This example uses the `ods-dataset-context`, `ods-result`, and `ods-select` widgets:
         * - The `ods-dataset-context` declares a context based on the `les-arbres-remarquables-de-paris` dataset.
         * - Two `ods-results` widgets are nested within `ods-dataset-context`. They fetch the values of the facets "arrondissement" and "libellefrancais" from the source dataset and store them in the variables `facetsArrondissement` and `facetsLibelleFrancais`, respectively.
         * The values of `facetsArrondissement` and `facetsLibelleFrancais` will have this form:
         *
         * <pre>
         * [
         *     { count: 1, path: "PARIS 1ER ARRDT", state: "displayed", name: "PARIS 1ER ARRDT" },
         *     { count: 8, path: "PARIS 17E ARRDT", state: "displayed", name: "PARIS 17E ARRDT" },
         *     { count: 11, path: "PARIS 7E ARRDT", state: "displayed", name: "PARIS 7E ARRDT" },
         *     ...
         * ]
         * </pre>
         *
         * <pre>
         * [
         *     { count: 32, path: "Platane", state: "displayed", name: "Platane" },
         *     { count: 12, path: "Hêtre", state: "displayed", name: "Hêtre" },
         *     { count: 11, path: "Chêne", state: "displayed", name: "Chêne" },
         *     ...
         * ]
         * </pre>
         *
         * - An `ods-select` widget is nested within each `ods-results`.
         * They define the lists of options users can select, using the `options` parameter set to `facetsArrondissement` and `facetsLibelleFrancais`, respectively.
         * To update the context each time an option is selected, the `selected-values` parameters for `ods-select` are set to `ctx.parameters['refine.arrondissement']` and `ctx.parameters['refine.libellefrancais']`, respectively.

         *
         * @example
         * <example module="ods-widgets">
         *     <file name="first_example.html">
         *         <ods-dataset-context
         *             context="ctx"
         *             ctx-domain="https://documentation-resources.opendatasoft.com/"
         *             ctx-dataset="les-arbres-remarquables-de-paris">
         *             <div ods-results="items" ods-results-context="ctx" ods-results-max="10">
         *                 <ods-select
         *                     disabled="items.length < 0"
         *                     selected-values="selectedTrees"
         *                     multiple="true"
         *                     options="items"
         *                     label-modifier="fields.libellefrancais"
         *                     value-modifier="{ 'name': fields.libellefrancais, 'species': fields.espece }">
         *                 </ods-select>
         *             </div>
         *         </ods-dataset-context>
         *     </file>
         * </example>
         * <example module="ods-widgets">
         *     <file name="second_example.html">
         *         <ods-dataset-context
         *             context="ctx"
         *             ctx-domain="https://documentation-resources.opendatasoft.com/"
         *             ctx-dataset="les-arbres-remarquables-de-paris"
         *             ctx-parameters="{ 'disjunctive.arrondissement': true, 'disjunctive.libellefrancais': true }">
         *             <div ods-facet-results="facetsArrondissement"
         *                 ods-facet-results-context="ctx"
         *                 ods-facet-results-facet-name="arrondissement">
         *                 <ods-select
         *                     options="facetsArrondissement"
         *                     selected-values="ctx.parameters['refine.arrondissement']"
         *                     label-modifier="name + ' (' + count + ')'"
         *                     value-modifier="name"
         *                     placeholder="Select one or more districts"
         *                     multiple="true">
         *                 </ods-select>
         *                 <br/>
         *             </div>
         *             <div ods-facet-results="facetsLibelleFrancais"
         *                 ods-facet-results-context="ctx"
         *                 ods-facet-results-facet-name="libellefrancais">
         *                 <ods-select
         *                     options="facetsLibelleFrancais"
         *                     selected-values="ctx.parameters['refine.libellefrancais']"
         *                     label-modifier="name"
         *                     value-modifier="name"
         *                     placeholder="Select one or more trees"
         *                     multiple="true">
         *                 </ods-select>
         *                 <br/>
         *             </div>
         *             <ods-table
         *                 context="ctx"
         *                 displayed-fields="libellefrancais, genre, arrondissement">
         *             </ods-table>
         *         </ods-dataset-context>
         *     </file>
         * </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                options: '=',
                selectedValues: '=',
                labelModifier: '@?',
                valueModifier: '@?',
                onChange: '@?',
                multiple: '=?',
                isLoading: '=?',
                disabled: '=?',
                placeholder: '@?',
            },
            template: '' +
                '<div class="odswidget-select">' +
                '    <div class="odswidget-select-dropdown">' +
                '        <button class="odswidget-select-button"' +
                '            type="button"' +
                '            ng-class="{ \'disabled\': disabled }"' +
                '            ng-disabled="disabled"' +
                '            ng-click="toggleDropdown()"' +
                '            aria-haspopup="listbox"' +
                '            aria-expanded="false"' +
                '            aria-label="Show options"' +
                '            translate="aria-label">' +
                '            <span class="odswidget-select-button-label"></span>' +
                '            <i class="fa fa-angle-down"' +
                '               title="Show options"' +
                '               translate="title"></i>' +
                '        </button>' +
                '        <div class="odswidget-select-input-container">' +
                '            <input class="odswidget-select-input"' +
                '                type="text"' +
                '                ng-model="_inputTextFilter"' +
                '                ng-model-options="{ debounce: 300 }"' +
                '                ng-disabled="disabled"' +
                '                placeholder="{{ \'Filter\' | translate }}"/>' +
                '            <button class="odswidget-select-button-dropdown-close" ' +
                '                   title="Hide options"' +
                '                   translate="title"' +
                '                   ng-click="toggleDropdown()">' +
                '               <i class="fa fa-angle-up"' +
                '                  aria-hidden="true">' +
                '               </i>' +
                '            </button>' +
                '        </div>' +
                '        <div class="odswidget-select-dropdown-menu">' +
                '            <ul class="odswidget-select-dropdown-menu-list"' +
                '                tabindex="-1"' +
                '                ng-hide="isLoading">' +
                '                <li class="odswidget-select-dropdown-menu-item odswidget-select-dropdown-actions-select-all"' +
                '                    ng-show="UIState.dropdown.header.selectAll"' +
                '                    ng-click="toggleSelectAll()"' +
                '                    ng-keydown="$event.keyCode === 13 && toggleSelectAll()"' +
                '                    tabindex="0"' +
                '                    role="option">' +
                '                    <i class="fa fa-square-o odswidget-select-dropdown-item-icon" aria-hidden="true"></i>' +
                '                    <span class="odswidget-select-dropdown-label checkbox">' +
                '                        <span translate>All</span>' +
                '                        <span class="odswidget-select-dropdown-actions-filtered-items-count"' +
                '                            ng-show="UIState.dropdown.header.itemsCount"' +
                '                            translate' +
                '                            translate-n="_displayedItems.length"' +
                '                            translate-plural="({{ $count }} options)">' +
                '                            ({{ $count }} option)' +
                '                        </span>' +
                '                    </span>' +
                '                </li>' +
                '                <hr class="odswidget-select-dropdown-divider" ng-show="UIState.dropdown.header.divider" />' +
                '                <li class="odswidget-select-dropdown-menu-item"' +
                '                    ng-class="{ \'odswidget-select-dropdown-menu-selected\': (item | odsSelectItemIsSelected:_selectedItems:false) }"' +
                '                    aria-selected="{{ item | odsSelectItemIsSelected:_selectedItems:false }}"' +
                '                    role="option"' +
                '                    tabindex="0"' +
                '                    ng-repeat="item in _items | odsSelectFilter:_inputTextFilter:_displaySelectedItemsOnly:_selectedItems"' +
                '                    ng-click="toggleSelectOne(item)"' +
                '                    ng-keydown="$event.keyCode === 13 && toggleSelectOne(item)">' +
                '                    <i aria-hidden="true"' +
                '                        ng-show="UIState.dropdown.list.checkboxes"' +
                '                        class="odswidget-select-dropdown-item-icon {{ item | odsSelectItemIsSelected:_selectedItems:true }}">' +
                '                    </i>' +
                '                    <span class="odswidget-select-dropdown-label"' +
                '                        ng-class="{ \'checkbox\': multiple }"' +
                '                        title="{{ item.label }}">' +
                '                        {{ item.label }}' +
                '                    </span>' +
                '                    <i class="fa fa-times-circle odswidget-select-dropdown-item-close-icon"' +
                '                        aria-hidden="true"' +
                '                        ng-show="!multiple && (item | odsSelectItemIsSelected:_selectedItems:false)">' +
                '                    </i>' +
                '                </li>' +
                '                <li class="odswidget-select-dropdown-menu-item odswidget-select-dropdown-no-options"' +
                '                    ng-show="UIState.dropdown.list.noOptions"' +
                '                    translate>' +
                '                    No options' +
                '                </li>' +
                '            </ul>' +
                '            <ul class="odswidget-select-dropdown-menu-list"' +
                '                ng-show="isLoading">' +
                '                <li class="odswidget-select-dropdown-menu-item odswidget-select-dropdown-no-options">' +
                '                    <i class="fa fa-spinner fa-pulse fa-fw"></i>&nbsp;' +
                '                    <span translate>Options are loading...</span>' +
                '                </li>' +
                '            </ul>' +
                '            <div class="odswidget-select-dropdown-menu-footer"' +
                '                ng-show="UIState.dropdown.footer.container">' +
                '                <div class="odswidget-select-dropdown-menu-footer-label"></div>' +
                '                <div class="odswidget-select-dropdown-menu-footer-actions"' +
                '                    ng-show="UIState.dropdown.footer.actions.container">' +
                '                    <span ng-show="UIState.dropdown.footer.actions.filter.container">' +
                '                        <button class="odswidget-select-dropdown-button"' +
                '                            ng-show="UIState.dropdown.footer.actions.filter.on"' +
                '                            ng-click="toggleSelectedItemsOnlyFilter()"' +
                '                            translate>' +
                '                            Show selection' +
                '                        </button>' +
                '                        <button class="odswidget-select-dropdown-button"' +
                '                            ng-show="UIState.dropdown.footer.actions.filter.off"' +
                '                            ng-click="toggleSelectedItemsOnlyFilter()"' +
                '                            translate>' +
                '                            Show all' +
                '                        </button> ' +
                '                        -' +
                '                    </span>' +
                '                    <button class="odswidget-select-dropdown-button odswidget-select-dropdown-menu-footer-actions-clear"' +
                '                        ng-show="UIState.dropdown.footer.actions.reset"' +
                '                        ng-click="toggleSelectAll(true)"' +
                '                        translate>' +
                '                        Clear selection' +
                '                    </button>' +
                '                </div>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '</div>' +
            '',
            controller: ['$scope', '$attrs', '$filter', '$parse', function($scope, $attrs, $filter, $parse) {
                // Internal objects
                $scope._items = {};
                $scope._displayedItems = [];
                $scope._selectedItems = {};
                $scope._inputTextFilter = '';
                $scope._displaySelectedItemsOnly = false;

                // Default attributes values
                $scope.multiple = !!$scope.multiple;

                if (typeof $scope.selectedValues === 'undefined' || $scope.selectedValues === null || $scope.selectedValues === '') {
                    $scope.selectedValues = [];
                } else if (Array.isArray($scope.selectedValues) === false) {
                    $scope.selectedValues = [$scope.selectedValues];
                }

                if (!$scope.placeholder) {
                    $scope.placeholder = $scope.multiple ? translate('Select one or more elements') : translate('Select one element');
                }

                /* -------------------------------------------------------------------------- */
                /* Utils                                                                      */
                /* -------------------------------------------------------------------------- */

                function initializeItems() {
                    $scope._selectedItems = {};
                    $scope._items = parseOptions($scope.options);
                    $scope.selectedValues = extractSelectedItemsValues($scope._selectedItems);
                    updateDisplayedItems();
                };

                function parseOptions(options) {
                    return options.reduce(function(accumulator, option) {
                        var label = $scope.labelModifier ? $parse($scope.labelModifier)(option) : option;
                        var value = $scope.valueModifier ? $parse($scope.valueModifier)(option) : option;
                        var isFullyDefined = label !== undefined && label !== null && value !== undefined && value !== null;
                        var key = JSON.stringify(value); // Note that we use the stringified value as the key.

                        if (!isFullyDefined) {
                            return accumulator;
                        }

                        if ($scope.selectedValues && $scope.selectedValues.length) {
                            // Compute the default selected items using the initial "selectedValues"
                            // ... variable given to the widget or when the "selectedValues" has
                            // ... been mutated from the outside.
                            $scope.selectedValues.forEach(function(sValue) {
                                if (angular.equals(sValue, value)) {
                                    $scope._selectedItems[key] = {
                                        label: label,
                                        value: value,
                                    };
                                }
                            });
                        }

                        accumulator[key] = {
                            label: label,
                            value: value,
                        };

                        return accumulator;
                    }, {});
                };

                function computeOnChangeExpression() {
                    // This function will be called every time the user (de)select an option.
                    // ... It has to be very versatile, many things can be done using this
                    // ... attribute's expression, therefore we have to call the outer scope
                    // ... ($scope.$parent) to evaluate it.
                    $timeout(function() {
                        $scope.$parent.$eval($attrs.onChange);
                    });
                };

                function extractSelectedItemsValues(items) {
                    var  key = null, selectedValues = [];
                    for (key in items) {
                        selectedValues.push(items[key].value);
                    }
                    return selectedValues;
                };

                function updateDisplayedItems() {
                    $scope._displayedItems = $filter('odsSelectFilter')($scope._items, $scope._inputTextFilter, $scope._displaySelectedItemsOnly, $scope._selectedItems);
                    if ($scope._displayedItems.length === 0) {
                        // If after filtering the items, there's none to display, it make sense to
                        // ... reset the following filter.
                        $scope._displaySelectedItemsOnly = false;
                    }
                };

                /* -------------------------------------------------------------------------- */
                /* User actions                                                               */
                /* -------------------------------------------------------------------------- */

                $scope.toggleSelectOne = function(item) {
                    var itemKey = JSON.stringify(item.value);
                    var isSelected = !!$scope._selectedItems[itemKey];

                    if ($scope.multiple === false) {
                        $scope._selectedItems = {};
                    }

                    if (isSelected) {
                        delete $scope._selectedItems[itemKey];
                    } else {
                        $scope._selectedItems[itemKey] = item;
                    }

                    computeOnChangeExpression();

                    $scope.selectedValues = extractSelectedItemsValues($scope._selectedItems);
                };

                $scope.toggleSelectAll = function(clearSelection) {
                    if (clearSelection || !$scope._inputTextFilter) {
                        $scope._selectedItems = angular.equals($scope._selectedItems, {}) ? angular.copy($scope._items) : {};
                    } else if (!!$scope._inputTextFilter) {
                        // When the user is filtering the list of options and click on the
                        // ... "All" checkbox, we want to apply the toggle only on the displayed
                        // ... items. It's more intuitive "UX-ly speaking" IMO.
                        var selectedDisplayedItems = filterSelectedItemsFromArray($scope._displayedItems, $scope._selectedItems);

                        if (selectedDisplayedItems.length) {
                            selectedDisplayedItems.forEach(function(selectedItem) {
                                var itemKey = JSON.stringify(selectedItem.value);
                                delete $scope._selectedItems[itemKey];
                            })
                        } else {
                            $scope._displayedItems.forEach(function(selectedItem) {
                                var itemKey = JSON.stringify(selectedItem.value);
                                $scope._selectedItems[itemKey] = selectedItem;
                            })
                        }
                    }

                    if (clearSelection) {
                        $scope._inputTextFilter = '';
                    }

                    computeOnChangeExpression();

                    $scope.selectedValues = extractSelectedItemsValues($scope._selectedItems);
                };

                $scope.toggleSelectedItemsOnlyFilter = function() {
                    $scope._inputTextFilter = '';
                    if (!$scope._displaySelectedItemsOnly && !$scope.selectedValues.length) {
                        // Of course, we don't apply the "display selected options only" filter
                        // ... if there's no selected items. This might be an overkill check but
                        // ... safer is better.
                        return;
                    }
                    $scope._displaySelectedItemsOnly = !$scope._displaySelectedItemsOnly;
                };

                /* -------------------------------------------------------------------------- */
                /* Watchers & Observers                                                       */
                /* -------------------------------------------------------------------------- */

                $scope.$watch('options', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        $scope.isLoading = false;
                        $timeout(function() {
                            // Since we may need to display the loader first, this function is
                            // ... queued using $timeout, therefore it will run after the DOM has
                            // ... been manipulated and after the browser renders.
                            initializeItems();
                        });
                    }
                }, true);

                $attrs.$observe('[valueModifier, labelModifier]', function() {
                    if (angular.isDefined($scope.options) && !$scope.disabled) {
                        $scope.$evalAsync(function() {
                            // We use $evalAsync here to be sure that the $digest cycle has
                            // ... evaluated potentials expressions inside the attribute before
                            // ... initializing the options parsing function.
                            initializeItems();
                        });
                    }
                });

                $scope.$watch('selectedValues', function(newVal, oldVal) {
                    if (angular.isDefined($scope.options) && !angular.equals(newVal, oldVal) && !$scope.disabled) {
                        $scope.$evalAsync(function() {
                            // We use $evalAsync here to be sure that the $digest cycle has
                            // ... evaluated potentials expressions inside the attribute before
                            // ... initializing the options parsing function.
                            if (newVal) {
                                $scope._selectedItems = {};
                                newVal.forEach(function(value) {
                                    var key = JSON.stringify(value);
                                    $scope._selectedItems[key] = $scope._items[key]
                                });
                            }
                        });
                    }
                }, true);

                $scope.$watch('[_inputTextFilter, _displaySelectedItemsOnly, _selectedItems]', function() {
                    updateDisplayedItems();
                }, true);
            }],
            link: function(scope, element) {
                scope.UIState = {};

                /* -------------------------------------------------------------------------- */
                /* Utils                                                                      */
                /* -------------------------------------------------------------------------- */

                function focusInput() {
                    $timeout(function() {
                        jQuery(element).find('.odswidget-select-input-container input').trigger('focus');
                    });
                };

                function extractLabels(obj) {
                    var key = null, labels = [];
                    for (key in obj) {
                        labels.push(obj[key].label);
                    }
                    return labels;
                };

                function updateIconSelectAllCheckbox() {
                    if (scope.multiple) {
                        var elem = element.find('.odswidget-select-dropdown-actions-select-all i')[0];
                        var selectedItemsCount;

                        if (!scope._inputTextFilter) {
                            // If there's no active text filter, we'll simply compare with the
                            // ... total selected items count.
                            selectedItemsCount = Object.keys(scope._selectedItems).length;
                        } else {
                            // But if there's an active text filter we have to loop through the
                            // ... displayed items and filter the selected ones.
                            selectedItemsCount = filterSelectedItemsFromArray(scope._displayedItems, scope._selectedItems).length;
                        }

                        if (selectedItemsCount === 0) {
                            // if no options are selected
                            elem.className = 'fa fa-square-o odswidget-select-dropdown-item-icon';
                        } else if (selectedItemsCount === scope._displayedItems.length) {
                            // if all displayed options are selected
                            elem.className = 'fa fa-check-square odswidget-select-dropdown-item-icon';
                        } else if (selectedItemsCount !== scope._displayedItems.length) {
                            // if some of the displayed options are selected
                            elem.className = 'fa fa-minus-square odswidget-select-dropdown-item-icon';
                        }
                    }
                };

                function updateHeaderText() {
                    var elem = element.find('.odswidget-select-button-label');
                    var selectedItemsLabels = extractLabels(scope._selectedItems);

                    if (selectedItemsLabels.length) {
                        var text;
                        if (selectedItemsLabels.length > 2) {
                            text = selectedItemsLabels.slice(0, 2).join(', ') + ', +' + (selectedItemsLabels.length - 2);
                        } else {
                            text = selectedItemsLabels.join(', ');
                        }
                        elem.text(text);
                    } else {
                        elem.text(scope.placeholder);
                    }
                };

                function updateFooterText() {
                    var selectedItemsLabels = extractLabels(scope._selectedItems);

                    if (scope.multiple) {
                        var text;
                        var elem = element.find('.odswidget-select-dropdown-menu-footer-label');
                        if (!!selectedItemsLabels.length) {
                            text = translatePlural(selectedItemsLabels.length, '{{ $count }} option selected', '{{ $count }} options selected', {});
                        } else {
                            text = translate('No option selected');
                        }
                        elem.text(text);
                    }
                };

                function updateUIState() {
                    // The "UIState" object will handle the conditional displays of the
                    // ... template's tags. It adds a level of abstraction but simplify the
                    // ... template readability.
                    scope.UIState = {
                        dropdown: {
                            header: {
                                selectAll: scope.multiple && scope._displayedItems.length,
                                divider: scope.multiple,
                                itemsCount: scope._displayedItems.length !== scope._items.length,
                            },
                            list: {
                                checkboxes: scope.multiple,
                                noOptions: !scope._displayedItems.length,
                            },
                            footer: {
                                container: scope.multiple,
                                actions: {
                                    container: scope.multiple && Object.keys(scope._selectedItems).length && Object.keys(scope._selectedItems).length !== scope._items.length,
                                    reset: scope.multiple && Object.keys(scope._selectedItems).length,
                                    filter: {
                                        container: scope.multiple && Object.keys(scope._selectedItems).length !== scope._items.length,
                                        on: !scope._displaySelectedItemsOnly,
                                        off: scope._displaySelectedItemsOnly,
                                    },
                                },
                            },
                        },
                    };
                };

                /* -------------------------------------------------------------------------- */
                /* User actions                                                               */
                /* -------------------------------------------------------------------------- */

                function clickOutsideHandlerCallback(event) {
                    // Ugly hard coded way BUT necessary:
                    // When only selected options are displayed, if you click, it deselect, then
                    // ... the element disappears from the DOM, then the test failed because it
                    // ... can"t be found any more within the element. The result behavior is
                    // ... that the dropdown menu is closed when the user un-click an item in
                    // ... "Show selection" mode.
                    var classList = event.target.classList;
                    if (classList.contains('odswidget-select-dropdown-label') || classList.contains('odswidget-select-dropdown-menu-footer-actions-clear')) {
                        if (!scope.multiple) {
                            element.find('.odswidget-select-button').get(0).setAttribute('aria-expanded', 'false');
                            element.find('.odswidget-select-dropdown').removeClass('open');
                        }
                        return;
                    }

                    var clickedElementIsChildOfDropdown = element.find(event.target).length > 0;
                    if (!clickedElementIsChildOfDropdown) {
                        element.find('.odswidget-select-button').get(0).setAttribute('aria-expanded', 'false');
                        element.find('.odswidget-select-dropdown').removeClass('open');
                    }
                };

                scope.toggleDropdown = function() {
                    var elem = element.find('.odswidget-select-dropdown');
                    var $button = element.find('.odswidget-select-button').get(0);
                    var $buttonAriaStatus = $button.getAttribute('aria-expanded');
                    if (elem.hasClass('open')) {
                        $document.unbind('click', clickOutsideHandlerCallback);
                    } else {
                        $document.bind('click', clickOutsideHandlerCallback);
                        focusInput();
                    }

                    // Reset filter search when opening
                    if (!elem.hasClass('open')) {
                        scope._inputTextFilter = '';
                    }

                    if($buttonAriaStatus === 'false') {
                        $button.setAttribute('aria-expanded', 'true');
                    } else {
                        $button.setAttribute('aria-expanded', 'false');
                    }
                    elem.toggleClass('open');
                };

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */

                scope.$watch('_items', function() {
                    updateUIState();
                });

                scope.$watch('_selectedItems', function() {
                    updateUIState();
                    updateHeaderText();
                    updateFooterText();
                    updateIconSelectAllCheckbox();
                }, true);

                scope.$watch('_displayedItems', function() {
                    updateUIState();
                    updateIconSelectAllCheckbox();
                });

                scope.$watch('_displaySelectedItemsOnly', function() {
                    updateUIState();
                });

                element.bind('keydown', function(event) {
                    // escape key
                    if(event.keyCode === 27) {
                        // prevent from exiting fullscreen mode
                        event.preventDefault();
                        // close the dropdown
                        scope.toggleDropdown();
                    }
                });
            },
        };
    }]);
}());
