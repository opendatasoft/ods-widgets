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
         * @param {array} options The input array of value which feeds the select menu.
         * @param {array} selectedValues The variable name to use to store the selected options' values.
         * @param {expression} [labelModifier=none] An expression to apply on the options' label.
         * @param {expression} [valueModifier=none] An expression to apply on the options' value. This parameter is used to modify the form of the values exposed by `selected-value`.
         * @param {expression} [onChange=none] An expression to evaluate whenever an option has been (de)selected.
         * @param {boolean} [multiple=false] If true, the menu will support multiple selections.
         * @param {boolean} [isLoading=false] Specifies if the widget should initially display a loader. This parameter will be automatically set to `false` as soon as options are loaded.
         * @param {boolean} [disabled=false] Specifies if the widget should be disabled.
         * @param {string} [placeholder="Select one or more elements" or "Select one element"] Specifies a short hint that describes the expected value of the select field.
         *
         * @description
         * This widget allows the selection of one or more items from a list of options. This list can be made up of strings or objects.
         *
         * If the "options" variable provided to the widget represents a simple array of string, the labels and values of these options will be automatically calculated by the widget.
         * But if the options provided to the widget are objects, it will be necessary to specify how to handle them using the "label-modifier" and "value-modifier" parameters.
         *
         * The "label-modifier" and "value-modifier" parameters each take an expression that will be applied to the each individual object representing an option.
         * And finally, the result of the selection will be stored in the variable specified in the "selected-values" parameter.
         *
         * <h1>Explanation of the examples</h1>
         *
         * <h2>First example</h2>
         *
         * In the <b>first example</b> bellow, the widget `ods-result` will store the result of the request in the variable `items`.
         * The value of the variable `items` will have this form:
         *
         * ```
         * [
         *     { fields: { libellefrancais: "Noyer", espece: "nigra",  ... }, ... },
         *     { fields: { libellefrancais: "Marronnier", espece: "hippocastanum",  ... }, ... },
         *     { fields: { libellefrancais: "Chêne", espece: "cerris",  ... }, ... },
         *     ...
         * ]
         * ```
         * <b>The parameter `label-modifier`</b>
         *
         * In this example we want to use the value of the field `libellefrancais` as label.
         *
         * To do so, we will need to use the parameter `label-modifier` to access the value of the field, by passing it the following configuration: `"fields.libellefrancais"`.
         *
         * <b>The parameter `value-modifier`</b>
         *
         * As for the `value-modifier` parameter, we want the shape of the values returned by `selected-values` to look like this:
         *
         * ```
         * [
         *     { name: "Noyer", species: "nigra" },
         *     { name: "Marronnier", species: "hippocastanum" },
         *     ...
         * ]
         * ```
         *
         * To do so, we will pass it the following configuration: `"{ 'name': fields.libellefrancais, 'species': fields.espece }"`.
         *
         * <h2>Second example</h2>
         *
         * What we want to accomplish in the <b>second example</b> bellow, is to update the context's parameters by directly injecting the selected values returned by `ods-select`.
         *
         * First, we will use the widget `ods-facet-results` to fetch the values of the facets "arrondissement" and "libellefrancais".
         * Please note that the values of `facetsArrondissement` and `facetsLibelleFrancais` will have this form:
         *
         * ```
         * [
         *     { count: 1, path: "PARIS 1ER ARRDT", state: "displayed", name: "PARIS 1ER ARRDT" },
         *     { count: 8, path: "PARIS 17E ARRDT", state: "displayed", name: "PARIS 17E ARRDT" },
         *     { count: 11, path: "PARIS 7E ARRDT", state: "displayed", name: "PARIS 7E ARRDT" },
         *     ...
         * ]
         * ```
         *
         * ```
         * [
         *     { count: 32, path: "Platane", state: "displayed", name: "Platane" },
         *     { count: 12, path: "Hêtre", state: "displayed", name: "Hêtre" },
         *     { count: 11, path: "Chêne", state: "displayed", name: "Chêne" },
         *     ...
         * ]
         * ```
         *
         * Now that we have those values injected into the `ods-select` widget, we will pass the following configuration to the `selected-values` parameters: `"ctx.parameters['refine.arrondissement']"` and `"ctx.parameters['refine.libellefrancais']"`.
         *
         * This will cause the context to be updated each time an option is selected.
         *
         * @example
         * <example module="ods-widgets">
         *     <file name="first_example.html">
         *         <ods-dataset-context
         *             context="ctx"
         *             ctx-domain="https://widgets-examples.opendatasoft.com/"
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
         *             ctx-domain="https://widgets-examples.opendatasoft.com/"
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
                '            ng-click="toggleDropdown()">' +
                '            <span class="odswidget-select-header-label pull-left"></span>' +
                '            <i class="fa fa-angle-down pull-right"></i>' +
                '        </button>' +
                '        <div class="odswidget-select-input-container">' +
                '            <input class="odswidget-select-input"' +
                '                type="text"' +
                '                ng-model="_inputTextFilter"' +
                '                ng-model-options="{ debounce: 300 }"' +
                '                ng-disabled="disabled"' +
                '                placeholder="{{ \'Filter\' | translate }}"/>' +
                '            <i class="fa fa-angle-up pull-right"' +
                '                ng-click="toggleDropdown()">' +
                '            </i>' +
                '        </div>' +
                '        <div class="odswidget-select-dropdown-menu">' +
                '            <ul class="odswidget-select-dropdown-menu-list"' +
                '               ng-hide="isLoading">' +
                '                <li class="odswidget-select-dropdown-actions-select-all"' +
                '                    ng-show="UIState.dropdown.header.selectAll"' +
                '                    ng-click="toggleSelectAll()">' +
                '                    <i class="fa fa-square-o" aria-hidden="true"></i>' +
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
                '                <hr ng-show="UIState.dropdown.header.divider" />' +
                '                <li ng-class="{ \'odswidget-select-dropdown-menu-selected\': (item | odsSelectItemIsSelected:_selectedItems:false) }"' +
                '                    ng-repeat="item in _items | odsSelectFilter:_inputTextFilter:_displaySelectedItemsOnly:_selectedItems"' +
                '                    ng-click="toggleSelectOne(item)">' +
                '                    <i aria-hidden="true"' +
                '                        ng-show="UIState.dropdown.list.checkboxes"' +
                '                        class="{{ item | odsSelectItemIsSelected:_selectedItems:true }}">' +
                '                    </i>' +
                '                    <span class="odswidget-select-dropdown-label"' +
                '                        ng-class="{ \'checkbox\': multiple }"' +
                '                        title="{{ item.label }}">' +
                '                        {{ item.label }}' +
                '                    </span>' +
                '                    <i class="fa fa-times-circle"' +
                '                        aria-hidden="true"' +
                '                        ng-show="!multiple && (item | odsSelectItemIsSelected:_selectedItems:false)">' +
                '                    </i>' +
                '                </li>' +
                '                <li class="odswidget-select-dropdown-no-options"' +
                '                    ng-show="UIState.dropdown.list.noOptions"' +
                '                    translate>' +
                '                    No options' +
                '                </li>' +
                '            </ul>' +
                '            <ul class="odswidget-select-dropdown-menu-list"' +
                '                ng-show="isLoading">' +
                '                <li class="odswidget-select-dropdown-no-options">' +
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
                '                        <a href="#"' +
                '                            ng-show="UIState.dropdown.footer.actions.filter.on"' +
                '                            ng-click="toggleSelectedItemsOnlyFilter()"' +
                '                            translate>' +
                '                            Show selection' +
                '                        </a>' +
                '                        <a href="#"' +
                '                            ng-show="UIState.dropdown.footer.actions.filter.off"' +
                '                            ng-click="toggleSelectedItemsOnlyFilter()"' +
                '                            translate>' +
                '                            Show all' +
                '                        </a>' +
                '                        -' +
                '                    </span>' +
                '                    <a href="#"' +
                '                        class="odswidget-select-dropdown-menu-footer-actions-clear"' +
                '                        ng-show="UIState.dropdown.footer.actions.reset"' +
                '                        ng-click="toggleSelectAll(true)"' +
                '                        translate>' +
                '                        Clear selection' +
                '                    </a>' +
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
                    $scope.isLoading = !Object.keys($scope._items).length;
                };

                function parseOptions(options) {
                    return options.reduce(function(accumulator, option) {
                        var label = $scope.labelModifier ? $parse($scope.labelModifier)(option) : option;
                        var value = $scope.valueModifier ? $parse($scope.valueModifier)(option) : option;
                        var isFullyDefined = !!label && !!value;
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
                        $scope.isLoading = newVal.length > 500;
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
                            elem.className = 'fa fa-square-o';
                        } else if (selectedItemsCount === scope._displayedItems.length) {
                            // if all displayed options are selected
                            elem.className = 'fa fa-check-square';
                        } else if (selectedItemsCount !== scope._displayedItems.length) {
                            // if some of the displayed options are selected
                            elem.className = 'fa fa-minus-square';
                        }
                    }
                };

                function updateHeaderText() {
                    var elem = element.find('.odswidget-select-header-label');
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
                    var classList = event.target.classList
                    if (classList.contains('odswidget-select-dropdown-label') || classList.contains('odswidget-select-dropdown-menu-footer-actions-clear')) {
                        if (!scope.multiple) {
                            element.find('.odswidget-select-dropdown').removeClass('open');
                        }
                        return;
                    }

                    var clickedElementIsChildOfDropdown = element.find(event.target).length > 0;
                    if (!clickedElementIsChildOfDropdown) {
                        element.find('.odswidget-select-dropdown').removeClass('open');
                    }
                };

                scope.toggleDropdown = function() {
                    var elem = element.find('.odswidget-select-dropdown');

                    if (elem.hasClass('open')) {
                        $document.unbind('click', clickOutsideHandlerCallback);
                    } else {
                        $document.bind('click', clickOutsideHandlerCallback);
                        focusInput();
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
            },
        };
    }]);
}());
