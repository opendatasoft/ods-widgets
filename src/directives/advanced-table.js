(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    /* -------------------------------------------------------------------------- */
    /* Directive                                                                  */
    /* -------------------------------------------------------------------------- */

    mod.directive('odsAdvTable', ['$timeout', function($timeout) {
        return {
            restrict: 'E',
            replace: true,
            require: ['^?odsAdvAnalysis'],
            scope: {
                data: '=',
                columnsOrder: '=?',
                stickyHeader: '=?',
                stickyFirstColumn: '=?',
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
                '            </tbody>' +
                '        </table>' +
                '    </div>' +
                '</div>' +
            '',
            controller: ['$scope', function($scope) {
                $scope.headerColumns = [];

                function checkAttributes() {
                    if (typeof $scope.data === 'undefined' || $scope.data === null || $scope.data === '') {
                        $scope.data = [];
                    } else if (Array.isArray($scope.data) === false) {
                        console.error('Given "data" is not well formatted. It must be an array of objects.');
                    } else {
                        var errorFound = false;

                        $scope.data.forEach(function(row) {
                            if (typeof row !== 'object') {
                                errorFound = true;
                            }
                        })

                        if (errorFound) {
                            console.error('Given "data" is not well formatted. It must be an array of objects.');
                        }
                    }

                    if (typeof $scope.columnsOrder === 'undefined' || $scope.columnsOrder === null || $scope.columnsOrder === '') {
                        $scope.columnsOrder = [];
                    } else if (Array.isArray($scope.columnsOrder) === false) {
                        console.error('Given "columns-order" is not well formatted. It must be an array of strings.');
                    } else {
                        var errorFound = false;

                        $scope.columnsOrder.forEach(function(column) {
                            if (typeof column !== 'string') {
                                errorFound = true;
                            }
                        });

                        if (errorFound) {
                            console.error('Given "columns-order" is not well formatted. It must be an array of strings.');
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
                    }
                }, true);
            }],
            link: function(scope, element, attrs, controllers) {
                if (controllers.length && controllers[0]) {
                    scope.advancedAnalysisCallback = controllers[0].queryCallback;
                } else {
                    scope.advancedAnalysisCallback = null;
                }

                scope.UIState = {};
                scope.initializeLayout = true;

                /* -------------------------------------------------------------------------- */
                /* DOM manipulations                                                          */
                /* -------------------------------------------------------------------------- */

                function saveTableDimensions() {
                    if (scope.initializeLayout === false) {
                        return;
                    } else {
                        scope.initializeLayout = false;
                    }

                    scope.UIState = {
                        container: {
                            width: 0,
                        },
                        header: {
                            height: 0,
                            cells: [],
                        },
                        body: {
                            firstColumnWidth: 0,
                            hasVerticalScroll: false,
                            hasHorizontalScroll: false,
                        },
                    };

                    // Container ----------
                    scope.UIState.container.width = element.width();

                    // Header -------------
                    scope.UIState.header.height = element.find('table thead tr th').outerHeight();

                    element.find('table thead tr th')
                        .each(function() {
                            var width = $(this).innerWidth();
                            var height = $(this).innerHeight();
                            scope.UIState.header.cells.push({ width: width, height: height });
                        });

                    // Body ---------------
                    var tableWrapper = element.find('div.odswidget-adv-table-wrapper')[0];
                    scope.UIState.body.firstColumnWidth = element.find('table tbody tr td').outerWidth();
                    scope.UIState.body.hasVerticalScroll = tableWrapper.scrollHeight > tableWrapper.clientHeight;
                    scope.UIState.body.hasHorizontalScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth;
                }

                function setSticky() {
                    var tableElement = element.find('table');

                    // Since the columns width are relative to each other, we need to
                    // ... hard set their width before manipulating their display.
                    tableElement.find('thead tr th, tbody tr td')
                        .each(function() {
                            $(this).width($(this).width());
                        });

                    tableElement.addClass('odswidget-adv-table-sticky');

                    tableElement.find('thead tr').css('position', 'absolute');
                    tableElement.find('tbody tr td:first-child').css('position', 'absolute');

                    // We just positioned the header and the first column as absolute, therefore we
                    // need to push them using CSS.
                    tableElement.find('tbody tr').eq(0).css('paddingTop', scope.UIState.header.height);
                    tableElement.find('tbody tr td:nth-child(2)').css('marginLeft', scope.UIState.body.firstColumnWidth);

                    var tableWrapper = element.find('div.odswidget-adv-table-wrapper');

                    // We only build the fixed header if the wrapper has vertical scroll.
                    if (!!scope.stickyHeader && scope.UIState.body.hasVerticalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky header.

                        var fixedHeader = tableElement.find('thead tr');

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(tableWrapper).unbind('scroll.vertical').bind('scroll.vertical', function(event) {
                            fixedHeader.css({
                                marginTop: event.currentTarget.scrollTop,
                                marginRight: event.currentTarget.scrollLeft,
                            });
                        });
                    }

                    // We only build the fixed first column if the wrapper has horizontal scroll.
                    if (!!scope.stickyFirstColumn && scope.UIState.body.hasHorizontalScroll) {
                        // We listen to scroll events on the table wrapper to apply the correct
                        // ... position to the detached sticky first column.

                        tableElement.find('thead tr th:first-child').css('position', 'absolute');
                        tableElement.find('thead tr th:nth-child(2)').css('marginLeft', scope.UIState.body.firstColumnWidth);

                        var prevScrollState = false;
                        var fixedColumn = tableElement.find('tbody tr td:first-child, thead tr th:first-child');

                        // In order to avoid multiple binding on the scroll event, we first need to
                        // ... differentiate the horizontal and vertical scroll events. To do so, we
                        // ... use two different namespaces (`scroll.horizontal` and
                        // ... `scroll.vertical`). Then, we simply unbind those namespaces prior to
                        // ... binding.
                        $(tableWrapper).unbind('scroll.horizontal').bind('scroll.horizontal', function(event) {
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
                    // ... observe the height of the table's wrapper div element.
                    return !!element.find('div.odswidget-adv-table-wrapper')[0].scrollHeight;
                }

                /* -------------------------------------------------------------------------- */
                /* Watchers                                                                   */
                /* -------------------------------------------------------------------------- */
                scope.$watch(tableIsVisible, function(newVal, oldVal) {
                    // Since the widget can be under an "ng-if" and therefore his DOM elements could
                    // ... be invisible, we need to re-trigger the functions which manipulate the
                    // ... DOM if there any change.
                    $timeout(function() {
                        if (!!newVal && newVal !== oldVal && (!!scope.stickyHeader || !!scope.stickyFirstColumn)) {
                            scope.initializeLayout = true;
                            saveTableDimensions();
                            setSticky();
                        }
                    });
                }, true);

                scope.$watch('data', function(newVal) {
                    $timeout(function() {
                        var isVisible = tableIsVisible();
                        if (isVisible && angular.isDefined(newVal) && newVal.length && (!!scope.stickyHeader || !!scope.stickyFirstColumn)) {
                            saveTableDimensions();
                            setSticky();
                        }
                    });
                }, true);
            },
        };
    }]);
}());
