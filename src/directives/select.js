(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    /* -------------------------------------------------------------------------- */
    /* Filter                                                                     */
    /* -------------------------------------------------------------------------- */

    mod.filter('odsSelectFilter', function() {
        return function(items, inputTextFilter, displaySelectedItemsOnly) {
            if (!inputTextFilter && !displaySelectedItemsOnly) {
                return items;
            }
            var lowerCasedInput = ODS.StringUtils.normalize(inputTextFilter.toLowerCase());
            return items.filter(function(item) {
                if (displaySelectedItemsOnly) {
                    return item.selected;
                } else {
                    return ODS.StringUtils.normalize(item.label).toLowerCase().indexOf(lowerCasedInput) !== -1;
                }
            });
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
         * @param {array} selectedValues The variable name to use to store the selected options' values.
         * @param {boolean} [multiple=false] If true, the specified <code>selected-values</code> variable will be an array and the menu will support multiple selections.
         * @param {array} options The input array of value which feeds the select menu.
         * @param {expression} [labelModifier] An expression to apply on the options' label.
         * @param {expression} [valueModifier] An expression to apply on the options' value.
         * @param {expression} [onChange] An expression to evaluate whenever an option has been (de)selected.
         * @param {boolean} [disabled=false] Specifies if the widget should be disabled.
         * @param {string} [placeholder="Select one or more elements" or "Select one element"] Specifies a short hint that describes the expected value of the select field.
         *
         * @description
         * This widget allows the selection of one or more items from a list of options. This list can be made up of strings or objects.
         * If the "options" variable provided to the widget represents a simple array of string, the labels and values of these options will be automatically calculated by the widget.
         * But if the options provided to the widget are objects, it will be necessary to specify how to handle them using the "label-modifier" and "value-modifier" parameters.
         * The "label-modifier" and "value-modifier" parameters each take an expression that will be applied to the each individual object representing an option.
         * And finally, the result of the selection will be stored in the variable specified in the "selected-values" parameter.
         *
         * @example
         * <example module="ods-widgets">
         *    <file name="a_simple_example_with_a_dataset.html">
         *         <ods-dataset-context context="trees" trees-dataset="les-arbres-remarquables-de-paris" trees-domain="https://widgets-examples.opendatasoft.com/">
         *             <div ods-results="items" ods-results-context="trees" ods-results-max="10">
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
         *    </file>
         * </example>
         * <example module="ods-widgets">
         *    <file name="advanced_use_of_labelModifier_and_valueModifier_parameters.html">
         *         <ods-dataset-context context="trees" trees-dataset="les-arbres-remarquables-de-paris" trees-domain="https://widgets-examples.opendatasoft.com/">
         *             <div ods-results="items" ods-results-context="trees" ods-results-max="10"
         *                 ng-init="keys = ['libellefrancais', 'domanialite']">
         *                 <ods-select
         *                     multiple="false"
         *                     placeholder="Select a dynamic key to use as name"
         *                     selected-values="keyToUse"
         *                     options="keys">
         *                 </ods-select>
         *                 <ods-select
         *                     multiple="true"
         *                     disabled="!keyToUse.length || items.length < 0"
         *                     selected-values="selectedTrees"
         *                     options="items"
         *                     label-modifier="fields.{{keyToUse[0]}}"
         *                     value-modifier="{ 'name': fields.{{keyToUse[0]}}, 'species': fields.espece }">
         *                 </ods-select>
         *             </div>
         *         </ods-dataset-context>
         *    </file>
         * </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                selectedValues: '=',
                multiple: '=?',
                options: '=',
                labelModifier: '@?',
                valueModifier: '@?',
                onChange: '@?',
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
                '                ng-disabled="disabled"' +
                '                placeholder="{{ \'Filter\' | translate }}"/>' +
                '            <i class="fa fa-angle-up pull-right"' +
                '                ng-click="toggleDropdown()">' +
                '            </i>' +
                '        </div>' +
                '        <div class="odswidget-select-dropdown-menu">' +
                '            <ul class="odswidget-select-dropdown-menu-list">' +
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
                '                <li ng-class="{ \'odswidget-select-dropdown-menu-selected\': item.selected }"' +
                '                    ng-repeat="item in _items | odsSelectFilter:_inputTextFilter:_displaySelectedItemsOnly track by item.uuid"' +
                '                    ng-click="toggleSelectOne(item)">' +
                '                    <i class="fa"' +
                '                        aria-hidden="true"' +
                '                        ng-show="UIState.dropdown.list.checkboxes"' +
                '                        ng-class="{ \'fa-check-square\': item.selected, \'fa-square-o\': !item.selected }">' +
                '                    </i>' +
                '                    <span class="odswidget-select-dropdown-label"' +
                '                        ng-class="{ \'checkbox\': multiple }"' +
                '                        title="{{ item.label }}">' +
                '                        {{ item.label }}' +
                '                    </span>' +
                '                    <i class="fa fa-times-circle"' +
                '                        aria-hidden="true"' +
                '                        ng-show="!multiple && !!item.selected">' +
                '                    </i>' +
                '                </li>' +
                '                <li class="odswidget-select-dropdown-no-options"' +
                '                    ng-show="UIState.dropdown.list.noOptions"' +
                '                    translate>' +
                '                    No options' +
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
                '                        </a>-' +
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
                $scope._isFirstMount = true;
                $scope._items = [];
                $scope._displayedItems = [];
                $scope._selectedLabels = [];
                $scope._inputTextFilter = '';
                $scope._displaySelectedItemsOnly = false;

                // Default attributes values
                $scope.multiple = !!$scope.multiple;

                if (!$scope.selectedValues) {
                    $scope.selectedValues = [];
                }

                if (!$scope.placeholder) {
                    $scope.placeholder = $scope.multiple ? translate('Select one or more elements') : translate('Select one element');
                }

                /* -------------------------------------------------------------------------- */
                /* Utils                                                                      */
                /* -------------------------------------------------------------------------- */

                function initializeItems(useCache) {
                    // Initialize filters.
                    $scope._inputTextFilter = '';

                    var items = [];

                    // Parse and filter the given options.
                    items = parseOptions($scope.options, useCache);

                    // Remove the duplicated or the not fully defined items.
                    items = cleanItems(items);

                    setSelectedItems(items);
                    $scope._items = items;
                    $scope._isFirstMount = false;
                };

                function parseOptions(options, useCache) {
                    // Parse and filter the given options.
                    var items;

                    items = options.map(function(option) {
                        var label = $scope.labelModifier ? $parse($scope.labelModifier)(option) : option;
                        var value = $scope.valueModifier ? $parse($scope.valueModifier)(option) : option;
                        var selected = false;

                        if (useCache) {
                            // If some options have already been selected, we need to identify them and
                            // ... conserve their "selected" state.
                            $scope._items.forEach(function(i) {
                                    if (i.selected && i.value === value) {
                                        selected = true;
                                    }
                                });
                        } else if ($scope.selectedValues.length) {
                            // Compute the default selected items using the initial "selectedValues"
                            // ... variable given to the widget or when the "selectedValues" has
                            // ... been mutated from the outside.
                            $scope.selectedValues.forEach(function(sValue) {
                                if (angular.equals(sValue, value)) {
                                    selected = true;
                                }
                            });
                        }

                        return {
                            uuid: ODS.StringUtils.getRandomUUID(),
                            label: label,
                            value: value,
                            selected: selected,
                        };
                    });

                    return items;
                };

                function cleanItems(items) {
                    // Remove the duplicated or undefined items.
                    items = items.filter(function(item, index, arr) {
                        var isUnique = arr.map(function(mapItem) { return mapItem.value; }).indexOf(item.value) === index;
                        var isFullyDefined = !!item.label && !!item.value;

                        if (isFullyDefined && isUnique) {
                            return true;
                        }
                        return false;
                    });

                    return items;
                };

                function setSelectedItems(items) {
                    ['label', 'value'].forEach(function(type) {
                            var selectedItems = items
                                .filter(function(item) { return item.selected; })
                                .map(function(item) { return item[type]; });

                            if (type === 'label') {
                                $scope._selectedLabels = selectedItems;
                            } else if (type === 'value') {
                                $scope.selectedValues = selectedItems;
                            }
                        });
                };

                function computeOnChangeExpression() {
                    // This function will be called every time the user (de)select an option.
                    // ... It has to be very versatile, many things can be done using this
                    // ... attribute's expression, therefore we have to call the outer scope
                    // ... ($scope.$parent) to evaluate it.
                    $scope.$evalAsync(function() {
                        $scope.$parent.$eval($attrs.onChange);
                    });
                };

                /* -------------------------------------------------------------------------- */
                /* User actions                                                               */
                /* -------------------------------------------------------------------------- */

                $scope.toggleSelectOne = function(item) {
                    var items = $scope._items.map(function(i) {
                            if (item.uuid === i.uuid) {
                                // Toggle the clicked item.
                                i.selected = !i.selected;
                            } else if (!$scope.multiple) {
                                // If non-multiple select, deselect all the other items.
                                i.selected = false;
                            }
                            return i;
                        });

                    computeOnChangeExpression();
                    setSelectedItems(items);
                    $scope._items = items;
                };

                $scope.toggleSelectAll = function(reset) {
                    var items;
                    if (reset || !$scope._inputTextFilter) {
                        items = $scope._items.map(function(item) {
                                // If at least one item is selected, we can assume that the toggle
                                // ... needs to deselect all the options (and vice versa).
                                item.selected = !$scope.selectedValues.length;
                                return item;
                            });
                    } else if (!!$scope._inputTextFilter) {
                        // When the user is filtering the list of options and click on the
                        // ... "All" checkbox, we want to apply the toggle only on the displayed
                        // ... items. It's more intuitive "UX-ly speaking" IMO.
                        var selectedDisplayedItems = $scope._displayedItems.filter(function (item) { return item.selected; });
                        items = $scope._items.map(function(item) {
                                $scope._displayedItems.forEach(function (di) {
                                        // If the UUIDs match, we can toggle them.
                                        if (item.uuid === di.uuid) {
                                            // If at least one displayed item is selected, we can assume
                                            // ... that the toggle needs to deselect all the displayed
                                            // ... options (and vice versa).
                                            item.selected = !selectedDisplayedItems.length;
                                        }
                                    });
                                return item;
                            });
                    }

                    if (reset) {
                        $scope._inputTextFilter = '';
                    }

                    computeOnChangeExpression();
                    setSelectedItems(items);
                    $scope._items = items;
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

                $scope.$watch('[options, selectedValues]', function(newVal, oldVal) {
                    if (angular.isDefined(newVal[0]) && !$scope.disabled) {
                        var useCache = true;

                        if ($scope._isFirstMount || !angular.equals(newVal[1], oldVal[1])) {
                            // If the widget has just been initialized or if the "selectedValues"
                            // ... variable has been mutated from the outside, we don't use the
                            // ... cached "selected" state of the items. Instead we'll use the
                            // ... "selectedValues" variable as the only source of truth.
                            useCache = false;
                        }

                        initializeItems(useCache);
                    }
                }, true);

                $scope.$watch('disabled', function() {
                    if (angular.isDefined($scope.options) && !$scope.disabled) {
                        initializeItems(true);
                    }
                }, true);

                $attrs.$observe('labelModifier', function() {
                    if (angular.isDefined($scope.options) && !$scope.disabled) {
                        $scope.$evalAsync(function() {
                            // We use $evalAsync here to be sure that the $digest cycle has
                            // ... evaluated potentials expressions inside the attribute before
                            // ... initializing the options parsing function.
                            initializeItems(true);
                        });
                    }
                });

                $attrs.$observe('valueModifier', function() {
                    if (angular.isDefined($scope.options) && !$scope.disabled) {
                        $scope.$evalAsync(function() {
                            // We use $evalAsync here to be sure that the $digest cycle has
                            // ... evaluated potentials expressions inside the attribute before
                            // ... initializing the options parsing function.
                            initializeItems(true);
                        });
                    }
                });

                $scope.$watch('[_items, _inputTextFilter, _displaySelectedItemsOnly]', function() {
                    $scope._displayedItems = $filter('odsSelectFilter')($scope._items, $scope._inputTextFilter, $scope._displaySelectedItemsOnly);
                    if ($scope._displayedItems.length === 0) {
                        // If after filtering the items, there's none to display, it make sense to
                        // ... reset the following filter.
                        $scope._displaySelectedItemsOnly = false;
                    }
                }, true);
            }],
            link: function(scope, element) {
                scope.UIState = {};

                /* -------------------------------------------------------------------------- */
                /* Utils                                                                      */
                /* -------------------------------------------------------------------------- */

                function focusInput() {
                    $timeout(function() {
                        jQuery(element).find('.odswidget-select-input-container input').focus();
                    });
                }

                function updateIconSelectAllCheckbox() {
                    if (scope.multiple) {
                        var elem = element.find('.odswidget-select-dropdown-actions-select-all i')[0];
                        var selectedItemsCount;

                        if (!scope._inputTextFilter) {
                            // If there's no active text filter, we'll simply compare with the
                            // ... total selected items count.
                            selectedItemsCount = scope.selectedValues.length;
                        } else {
                            // But if there's an active text filter we have to loop through the
                            // ... displayed items and filter the selected ones.
                            var selectedDisplayedItems = scope._displayedItems.filter(function (item) { return item.selected; });
                            selectedItemsCount = selectedDisplayedItems.length;
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

                    if (scope.selectedValues.length) {
                        var text;
                        if (scope.selectedValues.length > 2) {
                            text = scope._selectedLabels.slice(0, 2).join(', ') + ', +' + (scope.selectedValues.length - 2);
                        } else {
                            text = scope._selectedLabels.join(', ');
                        }
                        elem.text(text);
                    } else {
                        elem.text(scope.placeholder);
                    }
                };

                function updateFooterText() {
                    if (scope.multiple) {
                        var text;
                        var elem = element.find('.odswidget-select-dropdown-menu-footer-label');
                        if (!!scope.selectedValues.length) {
                            text = translatePlural(scope.selectedValues.length, '{{ $count }} option selected', '{{ $count }} options selected', {});
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
                                    container: scope.multiple && scope.selectedValues.length && scope.selectedValues.length !== scope._items.length,
                                    reset: scope.multiple && scope.selectedValues.length,
                                    filter: {
                                        container: scope.multiple && scope.selectedValues.length !== scope._items.length,
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

                scope.$watch('[_items, _displayedItems, _inputTextFilter]', function() {
                    updateIconSelectAllCheckbox();
                    updateHeaderText();
                    updateFooterText();
                }, true);

                scope.$watch('_selectedLabels', function() {
                    updateHeaderText();
                }, true);

                scope.$watch('[_items, _displayedItems, _displaySelectedItemsOnly, selectedValues]', function() {
                    updateUIState();
                }, true);
            },
        };
    }]);
}());
