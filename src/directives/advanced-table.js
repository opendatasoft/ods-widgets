(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    var theadContentTemplate = '' +
        ' <tr>' +
        '     <th ng-repeat="column in headerColumns track by $index" ng-click="onSortChange(column)">' +
        '         {{column.label}}' +
        '         <span>' +
        '             <i aria-hidden="true" class="fa"' +
        '                 ng-class="{' +
        '                     \'fa-sort\': column.orderBy === null,' +
        '                     \'fa-sort-desc\': column.orderBy === \'DESC\',' +
        '                     \'fa-sort-asc\': column.orderBy === \'ASC\',' +
        '                 }"></i>' +
        '         </span>' +
        '     </th>' +
        ' </tr>';

    /* -------------------------------------------------------------------------- */
    /* Directive                                                                  */
    /* -------------------------------------------------------------------------- */

    mod.directive('odsAdvTable', ['$timeout', '$debounce', '$filter', function($timeout, $debounce, $filter) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsAdvTable
         * @scope
         * @restrict E
         * @param {array} data The input array of value which feeds the table.
         * @param {array} [columnsOrder] An array of strings representing the columns' order.
         * @param {object} [columnsOptions] An object representing the formatting to apply on the columns. Two options are available: `label` is used to rename the column's header and `decimals` to set the number of decimals on each cell of the column (e.g., `{ label: 'New name', decimals: 2 }`).
         * @param {string} [sort] Name of the column to sort on, following by the suffix `ASC` or `DESC` (e.g., `columnName ASC`).
         * @param {array} [totals] An array of strings containing the names of the columns whose totals must be calculated.
         * @param {boolean} [stickyHeader=false] When set to `true`, the header will be fixed at the top of the table.
         * @param {boolean} [stickyFirstColumn=false] When set to `true`, the first column will be fixed on the left side of the table.
         *
         * @description
         * The odsAdvTable widget is used to analyze data from a table perspective.
         *
         * It is especially interesting to use this widget in conjunction with an odsAdvAnalysis widget, but you can feed it with static data.
         * The odsAdvTable widget gives you the ability to:
         * - compute totals,
         * - sort, reorder and rename columns,
         * - format numbers as text and define the number of decimal places to round the number to, and
         * - set the header and/or the first column in a fixed position.
         *
         *
         * @example
         * <example module="ods-widgets">
         *    <file name="a_simple_example_with_static_data.html">
         *        <div ng-init="pets = [{ species: 'dog', name: 'Rex'}, { species: 'cat', name: 'Felix'}, { species: 'Mouse', name: 'Pikachu'}, { species: 'Owl', name: 'Hedwig'}]">
         *            <ods-adv-table
         *                data="pets"
         *                columns-order="['species', 'name']">
         *            </ods-adv-table>
         *        </div>
         *    </file>
         * </example>
         * <example module="ods-widgets">
         *    <file name="an_example_using_odsAdvAnalysis.html">
         *        <ods-dataset-context
         *            context="ctx"
         *            ctx-domain="https://documentation-resources.opendatasoft.com/"
         *            ctx-dataset="les-arbres-remarquables-de-paris">
         *            <div ods-adv-analysis="data"
         *                ods-adv-analysis-context="ctx"
         *                ods-adv-analysis-select="count(objectid) as count"
         *                ods-adv-analysis-where="arrondissement like 'PARIS'"
         *                ods-adv-analysis-group-by="espece, genre, arrondissement, hauteur_en_m">
         *                <ods-adv-table
         *                    data="data"
         *                    sort="espece ASC"
         *                    totals="['count']"
         *                    columns-order="['espece', 'count', 'genre', 'arrondissement', 'hauteur_en_m']"
         *                    columns-options="{
         *                        espece: {
         *                            label: 'The species',
         *                        },
         *                        count: {
         *                            decimals: 0,
         *                            label: '#',
         *                        },
         *                        genre: {
         *                            label: 'The genus',
         *                        },
         *                        arrondissement: {
         *                            label: 'The district',
         *                        },
         *                        hauteur_en_m: {
         *                            decimals: 2,
         *                            label: 'The height (in meters)',
         *                        },
         *                    }"
         *                    sticky-header="true"
         *                    sticky-first-column="true">
         *                </ods-adv-table>
         *            </div>
         *        </ods-dataset-context>
         *    </file>
         * </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                data: '=',
                columnsOrder: '=?',
                columnsOptions: '=?',
                stickyHeader: '=?',
                stickyFirstColumn: '=?',
                totals: '=?',
                sort: '@?',
            },
            template: '' +
                '<div class="odswidget-adv-table__container" ng-show="!!displayedData.length">' +
                '    <div class="odswidget-adv-table__wrapper">' +
                '        <table class="odswidget-adv-table__table__sticky-first-column" aria-hidden="true">' +
                '            <tbody ng-if="stickyFirstColumnVisible">' +
                '                <tr ng-repeat="row in displayedData track by $index">' +
                '                    <td>' +
                '                        {{row[headerColumns[0].field]}}&nbsp;' +
                '                    </td>' +
                '                </tr>' +
                '                <tr class="odswidget-adv-table__totals" ng-if="computedTotals.length">' +
                '                    <td>' +
                '                        <span class="odswidget-adv-table__total__legend" translate>' +
                '                            Total' +
                '                        </span>' +
                '                        &nbsp;{{computedTotals[0]}}&nbsp;' +
                '                    </td>' +
                '                </tr>' +
                '            </tbody>' +
                '        </table>' +
                '        <table class="odswidget-adv-table__table__sticky-header" aria-hidden="true">' +
                '            <thead ng-if="stickyHeaderVisible">' + theadContentTemplate + '</thead>' +
                '        </table>' +
                '        <table class="odswidget-adv-table__table__sticky-first-header-column" aria-hidden="true">' +
                '            <thead ng-if="stickyFirstHeaderColumnVisible">' +
                '                <tr>' +
                '                    <th ng-click="onSortChange(headerColumns[0])">' +
                '                        {{headerColumns[0].label}}' +
                '                        <span>' +
                '                            <i aria-hidden="true" class="fa"' +
                '                                ng-class="{' +
                '                                    \'fa-sort\': headerColumns[0].orderBy === null,' +
                '                                    \'fa-sort-desc\': headerColumns[0].orderBy === \'DESC\',' +
                '                                    \'fa-sort-asc\': headerColumns[0].orderBy === \'ASC\',' +
                '                                }"></i>' +
                '                        </span>' +
                '                    </th>' +
                '                </tr>' +
                '            </thead>' +
                '        </table>' +
                '        <table class="odswidget-adv-table__table">' +
                '            <thead>' + theadContentTemplate + '</thead>' +
                '            <tbody>' +
                '                <tr ng-repeat="row in displayedData track by $index">' +
                '                    <td ng-repeat="column in headerColumns track by $index">' +
                '                        {{formatNumber(row[column.field], column.field)}}&nbsp;' +
                '                    </td>' +
                '                </tr>' +
                '                <tr class="odswidget-adv-table__totals" ng-if="computedTotals.length">' +
                '                    <td ng-repeat="total in computedTotals track by $index">' +
                '                        <span ng-if="$index === 0"' +
                '                            class="odswidget-adv-table__total__legend"' +
                '                            translate>' +
                '                            Total' +
                '                        </span>' +
                '                        <span ng-if="$index === 0">&nbsp;</span>' +
                '                        {{total}}&nbsp;' +
                '                    </td>' +
                '                </tr>' +
                '            </tbody>' +
                '        </table>' +
                '    </div>' +
                '</div>' +
            '',
            controller: ['$scope', function($scope) {
                $scope.displayedData = [];
                $scope.headerColumns = [];
                $scope.headerColumnsKeys = [];
                $scope.columnsWithDecimalsOption = [];
                $scope.computedTotals = [];

                function checkAttributes() {
                    var errorFound;
                    if (typeof $scope.data === 'undefined' || $scope.data === null || $scope.data === '') {
                        $scope.data = [];
                    } else if (Array.isArray($scope.data) === false) {
                        console.error('Given "data" is not well formatted. It must be an array of objects.');
                    } else {
                        errorFound = false;

                        $scope.data.forEach(function(row) {
                            if (typeof row !== 'object') {
                                errorFound = true;
                            }
                        });

                        if (errorFound) {
                            console.error('Given "data" is not well formatted. It must be an array of objects.');
                        }
                    }

                    if (typeof $scope.columnsOrder === 'undefined' || $scope.columnsOrder === null || $scope.columnsOrder === '') {
                        $scope.columnsOrder = [];
                    } else if (Array.isArray($scope.columnsOrder) === false) {
                        console.error('Given "columns-order" is not well formatted. It must be an array of strings.');
                    } else {
                        errorFound = false;

                        $scope.columnsOrder.forEach(function(column) {
                            if (typeof column !== 'string') {
                                errorFound = true;
                            }
                        });

                        if (errorFound) {
                            console.error('Given "columns-order" is not well formatted. It must be an array of strings.');
                        }
                    }

                    if ($scope.totals) {
                        if (Array.isArray($scope.totals) === false) {
                            console.error('Given "totals" is not well formatted. It must be an array of strings.');
                        } else {
                            errorFound = false;

                            $scope.totals.forEach(function(column) {
                                if (typeof column !== 'string') {
                                    errorFound = true;
                                }
                            });

                            if (errorFound) {
                                console.error('Given "totals" is not well formatted. It must be an array of strings.');
                            }
                        }
                    }
                }

                function setHeaderColumns() {
                    // This function loop through each key of the data objects and build the
                    // ... headers from it.
                    var headerColumns = [];

                    $scope.data.forEach(function(row) {
                        angular.forEach(row, function(_, column) {
                            if (headerColumns.indexOf(column) === -1) {
                                headerColumns.push(column);
                            }
                        });
                    });

                    if ($scope.columnsOrder && $scope.columnsOrder.length) {
                        headerColumns.sort(function(a, b) {
                            var posA = $scope.columnsOrder.indexOf(a);
                            var posB = $scope.columnsOrder.indexOf(b);

                            if (posA === -1) {
                                return 1;
                            } else if (posB === -1) {
                                return -1;
                            }

                            return posA - posB;
                        });
                    }

                    if ($scope.sort) {
                        // If there's an initial sort defined. We apply it every time the data
                        // ... source is updated.
                        var initialSortingState = {};
                        var sortAttributeRegex = /(\S*)[\s\t]*(ASC|DESC)?/;
                        var found = $scope.sort.match(sortAttributeRegex);

                        if (found) {
                            initialSortingState.field = found[1];
                            initialSortingState.orderBy =  found[2] || 'ASC';
                        }
                    }

                    return headerColumns.map(function(column) {
                        var options = $scope.columnsOptions;
                        var orderBy = null;

                        if (!!initialSortingState && initialSortingState.field === column) {
                            orderBy = initialSortingState.orderBy;
                        } else {
                            $scope.headerColumns.forEach(function(oldColumn) {
                                if (oldColumn.field === column) {
                                    orderBy = oldColumn.orderBy;
                                }
                            });
                        }

                        // Use the explicit label if configured, else use the column name
                        var label = options && options[column] && options[column].label || column;

                        return { field: column, orderBy: orderBy, label: label };
                    });
                }

                function computeTotals() {
                    if (!$scope.totals || !Array.isArray($scope.totals) || !$scope.totals.length) {
                        return [];
                    }
                    var computedTotals = [];

                    // Remove duplicates
                    var cleanedTotalFields = $scope.totals.filter(function(item, pos, self) {
                        return self.indexOf(item) === pos;
                    });

                    $scope.headerColumns.forEach(function(column) {
                        var totalHasBeenComputed = false;

                        if (cleanedTotalFields.indexOf(column.field) >= 0) {
                            var total = null;

                            $scope.data.forEach(function(row) {
                                var cellValue = row[column.field];

                                if (angular.isNumber(cellValue)) {
                                    total += cellValue;
                                }
                            });

                            // Apply formatting options to the total as well.
                            if ($scope.columnsWithDecimalsOption.includes(column.field)) {
                                var decimals = $scope.columnsOptions[column.field].decimals;
                                total = $filter('number')(total, decimals);
                            } else {
                                total = $filter('number')(total);
                            }

                            computedTotals.push(total);
                            totalHasBeenComputed = true;
                        }

                        if (!totalHasBeenComputed) {
                            computedTotals.push(null);
                        }
                    });

                    return computedTotals;
                }

                /* -------------------------------------------------------------------------- */
                /* Data transformation                                                        */
                /* -------------------------------------------------------------------------- */

                function _compareValues(val1, val2) {
                    if (angular.isObject(val1) || angular.isObject(val2)) {
                        // We can't compare objects, and it can potentially be extremely heavy (geojson...)
                        return 0;
                    }

                    // If strictly equal, just keep unchanged
                    if (angular.equals(val1, val2)) {
                        return 0;
                    }

                    // Null or missing values at the end
                    if (angular.isUndefined(val1) || val1 === null) {
                        return -1;
                    }
                    if (angular.isUndefined(val2) || val2 === null) {
                        return -1;
                    }

                    if (!(angular.isNumber(val1) && angular.isNumber(val2))) {
                        // Either both are numbers, or both are strings, in order to have consistent sorting
                        val1 = ODS.StringUtils.normalize(String(val1).toLowerCase());
                        val2 = ODS.StringUtils.normalize(String(val2).toLowerCase());
                    }
                    if (val1 < val2) {
                        return -1;
                    } else if (val1 > val2) {
                        return 1;
                    } else {
                        return 0;
                    }
                }

                function updateSortingState(clickedColumn) {
                    $scope.headerColumns = $scope.headerColumns.map(function(c) {
                        if (c.field === clickedColumn.field) {
                            // Toggle sorting state of the column.
                            if (!c.orderBy) {
                                c.orderBy = 'ASC';
                            } else if (c.orderBy === 'ASC') {
                                c.orderBy = 'DESC';
                            } else if (c.orderBy === 'DESC') {
                                c.orderBy = null;
                            }
                        } else {
                            c.orderBy = null;
                        }
                        return c;
                    });
                }

                function getSortedColumn() {
                    // A simple getter of the current sorting state.
                    var sortedColumn = null;

                    $scope.headerColumns.forEach(function(column) {
                        if (column.orderBy) {
                            sortedColumn = column;
                        }
                    });

                    return sortedColumn;
                }

                function applySort(data) {
                    // We work on a copy of the data because sorting will transform it; a shallow copy
                    // is enough because we just change the order of the rows
                    var clonedData = data.slice(0);
                    var sortedColumn = getSortedColumn();

                    if (sortedColumn === null) {
                        // If there's no active sort, we have to return the original array.
                        return $scope.data;
                    }

                    clonedData.sort(function(a, b) {
                        var compared = _compareValues(a[sortedColumn.field], b[sortedColumn.field]);

                        if (sortedColumn.orderBy === 'DESC') {
                            compared = compared * -1;
                        }

                        return compared;
                    });

                    return clonedData;
                }

                $scope.formatNumber = function(value, columnKey) {
                    if (!angular.isNumber(value)) {
                        return value;
                    }


                    if ($scope.columnsWithDecimalsOption.indexOf(columnKey) >= 0) {
                        var decimals = $scope.columnsOptions[columnKey].decimals;
                        return $filter('number')(value, decimals);
                    }

                    return $filter('number')(value);
                }

                function getColumnsWithDecimalsOption() {
                    var columns = [];

                    angular.forEach($scope.columnsOptions, function(optionValue, optionKey) {
                        if ($scope.headerColumnsKeys.indexOf(optionKey) >= 0 &&
                            angular.isDefined(optionValue.decimals) &&
                            angular.isNumber(optionValue.decimals)) {
                            columns.push(optionKey);
                        }
                    });

                    return columns;
                }

                /* -------------------------------------------------------------------------- */
                /* User's actions                                                             */
                /* -------------------------------------------------------------------------- */

                $scope.onSortChange = function(clickedColumn) {
                    updateSortingState(clickedColumn);
                    $scope.displayedData = applySort($scope.data, clickedColumn);
                };

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */

                $scope.$watch('data', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        checkAttributes();
                        $scope.headerColumns = setHeaderColumns();
                        $scope.headerColumnsKeys = $scope.headerColumns.map(function(c) { return c.field; });
                        $scope.columnsWithDecimalsOption = getColumnsWithDecimalsOption();
                        $scope.computedTotals = computeTotals();
                        $scope.displayedData = applySort(newVal);
                    } else {
                        $scope.headerColumns = [];
                        $scope.displayedData = [];
                    }
                });
            }],
            link: function(scope, element) {
                scope.elementRefs = {
                    wrapper: element.find('div.odswidget-adv-table__wrapper'),
                    table: element.find('table.odswidget-adv-table__table'),
                    stickyHeader: element.find('table.odswidget-adv-table__table__sticky-header'),
                    stickyColumn: element.find('table.odswidget-adv-table__table__sticky-first-column'),
                    stickyFirstHeaderColumn: element.find('table.odswidget-adv-table__table__sticky-first-header-column'),
                }

                scope.resizeObserverEntries = [];

                /* -------------------------------------------------------------------------- */
                /* DOM manipulations                                                          */
                /* -------------------------------------------------------------------------- */

                function setSticky() {
                    var hasVerticalScroll = scope.elementRefs.wrapper[0].scrollHeight > scope.elementRefs.wrapper[0].clientHeight;
                    var hasHorizontalScroll = scope.elementRefs.wrapper[0].scrollWidth > scope.elementRefs.wrapper[0].clientWidth;

                    setStickyHeader(hasVerticalScroll);
                    setStickyColumn(hasHorizontalScroll);
                    setStickyFirstHeaderColumn(hasVerticalScroll, hasHorizontalScroll);
                }

                function setStickyHeader(hasVerticalScroll) {
                    scope.stickyHeaderVisible = false;

                    // We only build the fixed header if the wrapper has vertical scroll.
                    if (scope.stickyHeader && hasVerticalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky header.
                        scope.elementRefs.table.find('thead tr th').each(function(index) {
                            var width = $(this).width();
                            scope.elementRefs.stickyHeader.find('thead tr th').eq(index).width(width);
                        });

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(scope.elementRefs.wrapper)
                            .unbind('scroll.vertical')
                            .bind('scroll.vertical', function(event) {
                            scope.elementRefs.stickyHeader.css({
                                marginTop: event.currentTarget.scrollTop,
                                marginRight: event.currentTarget.scrollLeft,
                            });
                        });

                        scope.stickyHeaderVisible = true;
                    }
                }

                function setStickyColumn(hasHorizontalScroll) {
                    scope.stickyFirstColumnVisible = false;

                    // We only build the fixed first column if the wrapper has horizontal scroll.
                    if (scope.stickyFirstColumn && hasHorizontalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky first column.
                        var firstColumnWidth = scope.elementRefs.table.find('tbody tr:first-child td:first-child').outerWidth();
                        var headerHeight = scope.elementRefs.table.find('thead tr th').outerHeight();
                        var prevScrollState = false;

                        scope.elementRefs.stickyColumn.css('marginTop', headerHeight + 1);

                        scope.elementRefs.stickyColumn.each(function() {
                            this.style.width = firstColumnWidth + 'px';
                        });

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(scope.elementRefs.wrapper)
                            .unbind('scroll.horizontal')
                            .bind('scroll.horizontal', function(event) {
                            var currentScrollState = !!event.currentTarget.scrollLeft;

                            if (prevScrollState !== currentScrollState) {
                                setShadows(currentScrollState);
                            }

                            prevScrollState = !!event.currentTarget.scrollLeft;

                            scope.elementRefs.stickyColumn.css({
                                marginLeft: event.currentTarget.scrollLeft,
                            });
                        });

                        scope.stickyFirstColumnVisible = true;
                    }
                }

                function setStickyFirstHeaderColumn(hasVerticalScroll, hasHorizontalScroll) {
                    scope.stickyFirstHeaderColumnVisible = false;
                    scope.elementRefs.stickyFirstHeaderColumn.style = null;
                    var hasToFollowVerticalScroll = scope.stickyHeader && hasVerticalScroll && scope.stickyFirstColumn && hasHorizontalScroll;

                    // We only build the fixed first column header if the wrapper has horizontal AND
                    // ... vertical scroll.
                    if (scope.stickyFirstColumn && hasHorizontalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky first column header.
                        var firstHeaderColumnWidth = scope.elementRefs.table.find('thead tr th:first-child').outerWidth();

                        scope.elementRefs.stickyFirstHeaderColumn.width(firstHeaderColumnWidth);

                        $(scope.elementRefs.wrapper)
                            .unbind('scroll.all')
                            .bind('scroll.all', function(event) {
                            scope.elementRefs.stickyFirstHeaderColumn.css({
                                marginTop: hasToFollowVerticalScroll ? event.currentTarget.scrollTop : 0,
                                marginLeft: event.currentTarget.scrollLeft,
                            });
                        });
                    }

                    scope.stickyFirstHeaderColumnVisible = true;
                }

                function setShadows(addShadow) {
                    if (addShadow) {
                        scope.elementRefs.stickyColumn.addClass('horizontally-scrolled');
                        scope.elementRefs.stickyFirstHeaderColumn.addClass('horizontally-scrolled');
                    } else {
                        scope.elementRefs.stickyColumn.removeClass('horizontally-scrolled');
                        scope.elementRefs.stickyFirstHeaderColumn.removeClass('horizontally-scrolled');
                    }
                }

                /* -------------------------------------------------------------------------- */
                /* Watchers utils                                                             */
                /* -------------------------------------------------------------------------- */

                function tableIsVisible() {
                    // Little hack to know when the widget related DOM has been updated: we
                    // ... observe the height and width of the table's wrapper div element then
                    // ... return a truthly value.
                    return !!(scope.elementRefs.wrapper[0].scrollWidth + scope.elementRefs.wrapper[0].scrollHeight);
                }

                function resizeObserverCallback() {
                    scope.resizeObserverEntries.forEach(function(entry) {
                        if ((scope.stickyHeader || scope.stickyFirstColumn) && !!entry.contentRect.width) {
                            setSticky();
                        }
                    });
                }

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */

                function initResizeWatcher() {
                    // The ResizeObserver interface reports changes to the dimensions of an element
                    // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
                    var resizeObserver = new ResizeObserver(function(entries) {
                        scope.resizeObserverEntries = entries;
                        $debounce(resizeObserverCallback, 200);
                    });

                    // Here we observe any size changes on the table's wrapper element in order to
                    // ... rebuild the table with the right new dimensions.
                    resizeObserver.observe(scope.elementRefs.wrapper[0]);

                    scope.$on('$destroy', function() {
                        if (resizeObserver) {
                            resizeObserver.unobserve(scope.elementRefs.wrapper[0]);
                        }
                    });
                }

                // We need to watch any data changes in order to rebuild the table.
                scope.$watch('displayedData', function(newVal) {
                    $timeout(function() {
                        var isVisible = tableIsVisible();

                        if ((scope.stickyHeader || scope.stickyFirstColumn) &&
                            isVisible &&
                            !!window.ResizeObserver &&
                            angular.isDefined(newVal) &&
                            newVal.length) {
                            setSticky();
                        }
                    });
                }, true);

                // If the `ResizeObserver` API is not available on the browser, we don't fire the
                // ... sticky layouts related functions.
                if (!!window.ResizeObserver) {
                    initResizeWatcher();
                }
            },
        };
    }]);
}());
