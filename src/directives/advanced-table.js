(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    /* -------------------------------------------------------------------------- */
    /* Directive                                                                  */
    /* -------------------------------------------------------------------------- */

    mod.directive('odsAdvTable', ['$timeout', '$debounce', '$window', function($timeout, $debounce, $window) {
        return {
            restrict: 'E',
            replace: true,
            require: ['^?odsAdvAnalysis'],
            scope: {
                data: '=',
                columnsOrder: '=?',
                stickyHeader: '=?',
                stickyFirstColumn: '=?',
                totals: '=?',
            },
            template: '' +
                '<div class="odswidget-adv-table-container" ng-show="!!data.length">' +
                '    <div class="odswidget-adv-table-wrapper">' +
                '        <table>' +
                '            <thead>' +
                '                <tr>' +
                '                    <th ng-repeat="column in headerColumns track by $index">' +
                '                        <span ng-click="orderBy(column)">' +
                '                        {{column.field}}' +
                '                        <i aria-hidden="true" class="fa"' +
                '                            ng-if="!!advancedAnalysisCallback"' +
                '                            ng-class="{' +
                '                                \'fa-sort\': column.orderBy === null,' +
                '                                \'fa-sort-desc\': column.orderBy === \'DESC\',' +
                '                                \'fa-sort-asc\': column.orderBy === \'ASC\',' +
                '                            }"></i>' +
                '                        </span>' +
                '                    </th>' +
                '                </tr>' +
                '            </thead>' +
                '            <tbody>' +
                '                <tr ng-repeat="row in data track by $index">' +
                '                    <td ng-repeat="column in headerColumns track by $index">' +
                '                        {{row[column.field]}}&nbsp;' +
                '                    </td>' +
                '                </tr>' +
                '                <tr class="odswidget-adv-table-totals" ng-if="computedTotals.length">' +
                '                    <td ng-repeat="total in computedTotals track by $index">' +
                '                        <span ng-if="$index === 0"' +
                '                            class="odswidget-adv-table-total-legend"' +
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
                $scope.headerColumns = [];
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

                function initializeHeaderColumns() {
                    var headerColumns = setHeaderColumns();
                    headerColumns = rememberSortingState(headerColumns);
                    $scope.headerColumns = headerColumns;
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

                    return headerColumns;
                }

                function rememberSortingState(headerColumns) {
                    return headerColumns.map(function(column) {
                        var orderBy = null;

                        $scope.headerColumns.forEach(function(oldColumn) {
                            if (oldColumn.field === column) {
                                orderBy = oldColumn.orderBy;
                            }
                        });

                        return { field: column, orderBy: orderBy };
                    });
                }

                function computeTotals() {
                    $scope.computedTotals = [];

                    if (Array.isArray($scope.totals) && $scope.totals.length) {
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

                                $scope.computedTotals.push(total);
                                totalHasBeenComputed = true;
                            }

                            if (!totalHasBeenComputed) {
                                $scope.computedTotals.push(null);
                            }
                        });
                    }
                }

                /* -------------------------------------------------------------------------- */
                /* User's actions                                                             */
                /* -------------------------------------------------------------------------- */

                $scope.orderBy = function(column) {
                    if (!$scope.advancedAnalysisCallback) {
                        return;
                    }

                    var request = null;

                    // Toggle sorting state of the column.
                    if (!column.orderBy) {
                        column.orderBy = 'ASC';
                    } else if (column.orderBy === 'ASC') {
                        column.orderBy = 'DESC';
                    } else if (column.orderBy === 'DESC') {
                        column.orderBy = null;
                    }

                    // Clear the sorting state of the other columns.
                    $scope.headerColumns = $scope.headerColumns.map(function(c) {
                        if (c.field !== column.field) {
                            c.orderBy = null;
                        }
                        return c;
                    });

                    if (column.orderBy) {
                        request = '`' + column.field + '`' + ' ' + column.orderBy;
                    }

                    $scope.advancedAnalysisCallback({ orderBy: request });
                };

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */

                $scope.$watch('data', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        checkAttributes();
                        initializeHeaderColumns();

                        if ($scope.totals) {
                            computeTotals();
                        }
                    }
                }, true);
            }],
            link: function(scope, element, attrs, controllers) {
                if (controllers.length && controllers[0]) {
                    scope.advancedAnalysisCallback = controllers[0].queryCallback;
                } else {
                    scope.advancedAnalysisCallback = null;
                }

                scope.wrapperElement = element.find('div.odswidget-adv-table-wrapper');
                scope.UIState = {};
                scope.resizeObserverEntries = [];

                /* -------------------------------------------------------------------------- */
                /* DOM manipulations                                                          */
                /* -------------------------------------------------------------------------- */

                function setDefaultTableStyling() {
                    // We need to reset the table's CSS to save the initials default dimension in
                    // ... order to set each cells to `position: absolute`.
                    element.find('tr').css('position', 'static');
                    element.find('th, td').css({ position: 'static', width: 'auto' });
                    element.find('th:nth-child(2)').css('marginLeft', 0);
                    scope.wrapperElement.addClass('odswidget-adv-table-clear-styles');
                }

                function saveDefaultTableDimensions() {
                    scope.UIState = {
                        headerHeight: 0,
                        firstColumnWidth: 0,
                        hasVerticalScroll: false,
                        hasHorizontalScroll: false,
                    };

                    scope.UIState.headerHeight = element.find('table thead tr th').outerHeight();
                    scope.UIState.firstColumnWidth = element.find('table tbody tr td:first-child').outerWidth();
                    scope.UIState.hasVerticalScroll = scope.wrapperElement[0].scrollHeight > scope.wrapperElement[0].clientHeight;
                    scope.UIState.hasHorizontalScroll = scope.wrapperElement[0].scrollWidth > scope.wrapperElement[0].clientWidth;
                }

                function setSticky() {
                    var tableElement = element.find('table');

                    // Since the columns width are relative to each other, we need to
                    // ... hard set their width before manipulating their display.
                    tableElement.find('thead tr th, tbody tr td').each(function() { $(this).width($(this).width()) });

                    scope.wrapperElement.removeClass('odswidget-adv-table-clear-styles');
                    tableElement.addClass('odswidget-adv-table-sticky');
                    tableElement.find('thead tr').css('position', 'absolute');
                    tableElement.find('tbody tr td:first-child').css('position', 'absolute');

                    // We just positioned the header and the first column as absolute, therefore we
                    // need to push them using CSS.
                    tableElement.find('tbody tr').eq(0).css('paddingTop', scope.UIState.headerHeight);
                    tableElement.find('tbody tr td:nth-child(2)').css('marginLeft', scope.UIState.firstColumnWidth);

                    // We only build the fixed header if the wrapper has vertical scroll.
                    if (!!scope.stickyHeader && scope.UIState.hasVerticalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky header.

                        var fixedHeader = tableElement.find('thead tr');

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(scope.wrapperElement).unbind('scroll.vertical').bind('scroll.vertical', function(event) {
                            fixedHeader.css({
                                marginTop: event.currentTarget.scrollTop,
                                marginRight: event.currentTarget.scrollLeft,
                            });
                        });
                    }

                    // We only build the fixed first column if the wrapper has horizontal scroll.
                    if (!!scope.stickyFirstColumn && scope.UIState.hasHorizontalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky first column.

                        tableElement.find('thead tr th:first-child').css('position', 'absolute');
                        tableElement.find('thead tr th:nth-child(2)').css('marginLeft', scope.UIState.firstColumnWidth);

                        var prevScrollState = false;
                        var fixedColumn = tableElement.find('tbody tr td:first-child, thead tr th:first-child');

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(scope.wrapperElement).unbind('scroll.horizontal').bind('scroll.horizontal', function(event) {
                            var currentScrollState = !!event.currentTarget.scrollLeft;

                            if (prevScrollState !== currentScrollState) {
                                setShadows(tableElement, currentScrollState);
                            }

                            prevScrollState = !!event.currentTarget.scrollLeft;

                            fixedColumn.css({
                                marginLeft: event.currentTarget.scrollLeft,
                            });
                        });
                    }
                }

                function setShadows(tableElement, addShadow) {
                    if (addShadow) {
                        tableElement.addClass('horizontally-scrolled');
                    } else {
                        tableElement.removeClass('horizontally-scrolled');
                    }
                }

                /* -------------------------------------------------------------------------- */
                /* Watchers utils                                                             */
                /* -------------------------------------------------------------------------- */

                function tableIsVisible() {
                    // The trick to know when the widget related DOM has been updated, is to
                    // ... observe the height and width of the table's wrapper div element.
                    return !!(scope.wrapperElement[0].scrollWidth + scope.wrapperElement[0].scrollHeight);
                }

                function resizeObserverCallback() {
                    scope.resizeObserverEntries.forEach(function(entry) {
                        if (!!entry.contentRect.width) {
                            runTableStylingFunctions();
                        }
                    });
                }

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */

                function runTableStylingFunctions() {
                    setDefaultTableStyling();
                    saveDefaultTableDimensions();
                    if (!!scope.stickyHeader || !!scope.stickyFirstColumn) {
                        setSticky();
                    }
                }

                function initResizeWatcher() {
                    if (!!window.ResizeObserver) {
                        // The ResizeObserver interface reports changes to the dimensions of an Element
                        // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
                        var resizeObserver = new ResizeObserver(function(entries) {
                            scope.resizeObserverEntries = entries;
                            $debounce(resizeObserverCallback, 200);
                        });

                        // Here we observe any size changes on the table's wrapper element in order to
                        // ... rebuild the table with the right new dimensions.
                        resizeObserver.observe(scope.wrapperElement[0]);

                        scope.$on('$destroy', function() {
                            if (resizeObserver) {
                                resizeObserver.unobserve(scope.wrapperElement[0]);
                            }
                        });
                    } else {
                        scope.$watch(tableIsVisible, function(isVisible, wasVisible) {
                            // Since the widget can be under an "ng-if" and therefore his DOM elements could
                            // ... be invisible, we need to re-trigger the functions which manipulate the
                            // ... DOM if there any change.
                            $timeout(function() {
                                if (!!isVisible && isVisible !== wasVisible) {
                                    runTableStylingFunctions();
                                }
                            });
                        });

                        angular.element($window).bind('resize', function() {
                            $debounce(runTableStylingFunctions, 200);
                            // Manual $digest required as resize event is outside of angular
                            scope.$apply();
                        });
                    }
                }

                // We need to watch any data changes in order to rebuild the table
                scope.$watch('data', function(newVal) {
                    $timeout(function() {
                        var isVisible = tableIsVisible();
                        if (isVisible && angular.isDefined(newVal) && newVal.length) {
                            runTableStylingFunctions();
                        }
                    });
                }, true);

                initResizeWatcher();
            },
        };
    }]);
}());
