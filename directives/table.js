(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTable', ['ODSWidgetsConfig', function(ODSWidgetsConfig) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTable
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} [displayedFields=all] A comma-separated list of fields to display. By default all the available fields are displayed.
         * @param {string} [sort=none] Sort expression to apply initially (*field* or *-field*)
         * @param {Object} [tableContext=none] An object that you can use to share the sort state between two or more table widgets when they are not in the same context.
         * Beware that if you have two tables on two different datasets, they need to have the same sortable fields, else an user may try to sort on a field that doesn't exist in the other table, and
         * an error will occur.
         *
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                displayedFields: '@',
                tableContext: '=?',
                sort: '@'
            },
            replace: true,
            templateUrl: ODSWidgetsConfig.basePath + 'directives/templates/table.html',
            controller: ['$scope', '$element', '$timeout', '$document', '$window', 'ODSAPI', 'DebugLogger', '$filter', '$http', '$compile', function($scope, $element, $timeout, $document, $window, ODSAPI, DebugLogger, $filter, $http, $compile) {
                if (angular.isUndefined($scope.tableContext)) {
                    $scope.tableContext = {};
                }
                if ($scope.sort) {
                    $scope.tableContext.tablesort = $scope.sort;
                }
                $scope.displayedFieldsArray = null;

                // Infinite scroll parameters
                $scope.page = 0;
                $scope.resultsPerPage = 40;
                $scope.fetching = false;
                // New records are appended to the end of this array
                $scope.records = [];
                $scope.working = true;

                // Use to store the columns width to apply to the table.
                // Due to the fix header, we need to apply this to the fake header and the table body.
                $scope.layout = [];

                // End of the infinite scroll
                $scope.done = false;

                // Needed to construct the table
                var datasetFields, recordsHeader = $element.find('.records-header'), recordsBody = $element.find('.records-body tbody');

                var initScrollLeft = recordsHeader.offset().left;
                var prevScrollLeft = 0; // Use to know if it is a horizontal or vertical scroll
                var lastScrollLeft = 0; // To keep the horizontal scrollbar position when refining or sorting
                var forceScrollLeft = false; // Only reset the horizontal scrollbar position when refining or sorting

                // Use to keep track of the records currently visible for the users
                var lastStartIndex = 0, lastEndIndex = 0;

                var extraRecords = 100; // Number of extraneous records before & after
                var startIndex = 0, endIndex = 0; // Records between startIndex and endIndex are in the DOM

                var id = Math.random().toString(36).substring(7);
                var tableId = 'table-' + id;
                var styleSheetId = 'stylesheet-' + id;

                var refreshRecords = function(init) {
                    $scope.fetching = true;
                    var options = {}, start;

                    if (init) {
                        $scope.done = false;
                        $scope.page = 0;
                        $scope.records = [];
                        start = 0;
                    } else {
                        $scope.page++;
                        start = $scope.page * $scope.resultsPerPage;
                    }
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {start: start});

                    if ($scope.tableContext.tablesort) {
                        options.sort = $scope.tableContext.tablesort;
                    }

                    ODSAPI.records.search($scope.context, options).
                        success(function(data, status, headers, config) {
                            if (!data.records.length) {
                                $scope.working = false;
                            }

                            $scope.records = init ? data.records : $scope.records.concat(data.records);
                            $scope.nhits = data.nhits;

                            $scope.error = '';
                            $scope.fetching = false;
                            $scope.done = ($scope.page+1) * $scope.resultsPerPage >= data.nhits;
                        }).
                        error(function(data, status, headers, config) {
                            $scope.error = data.error;
                            $scope.fetching = false;
                        });
                };

                // Automatically called by ng-infinite-scroll
                $scope.loadMore = function() {
                    if (!$scope.fetching && !$scope.done && $scope.staticSearchOptions) {
                        refreshRecords(false);
                    }
                };

                $scope.isFieldSortable = function(field) {
                    return ODS.DatasetUtils.isFieldSortable(field);
                };

                $scope.toggleSort = function(field){
                    // Not all the sorts are supported yet
                    if($scope.isFieldSortable(field)){
                        if($scope.tableContext.tablesort == field.name){
                            $scope.tableContext.tablesort = '-' + field.name;
                            return;
                        }
                        if($scope.tableContext.tablesort == '-' + field.name){
                            $scope.tableContext.tablesort = field.name;
                            return;
                        }
                        $scope.tableContext.tablesort = '-'+field.name;
                    } else {
                        delete $scope.tableContext.tablesort;
                    }
                };

                var renderOneRecord = function(index, records, position) {
                    /*
                     <tr ng-repeat="record in records">
                         <td bindonce="field" ng-repeat="field in dataset.fields|fieldsForVisualization:'table'|fieldsFilter:dataset.extra_metas.visualization.table_fields" ng-switch="field.type">
                             <div>
                                 <span ng-switch-when="geo_point_2d">
                                     <geotooltip width="300" height="300" coords="record.fields[field.name]">{{ record.fields|formatFieldValue:field }}</geotooltip>
                                 </span>
                                 <span ng-switch-when="geo_shape">
                                    <geotooltip width="300" height="300" geojson="record.fields[field.name]">{{ record.fields|formatFieldValue:field|truncate }}</geotooltip>
                                 </span>
                                 <span ng-switch-default bo-title="record.fields|formatFieldValue:field" bo-html="record.fields|formatFieldValue:field|linky|nofollow"></span>
                             </div>
                         </td>
                     </tr>
                     */

                    // The following code does almost the same as above.
                    // Originally, it was in the angular template "records-table.html" but for performance issue
                    // all the work is done here without using angular.


                    var tr, td, record = records[index];

                    tr = document.createElement('tr');
                    tr.className = 'record-'+index;

                    // TODO: Don't use jQuery if there is performance issue.
                    if (position === 'end') {
                        var beforePlaceholder = $element.find('.placeholderBot')[0];
                        beforePlaceholder.parentNode.insertBefore(tr, beforePlaceholder);
                    } else {
                        var afterPlaceholder = $element.find('.placeholderTop')[0];
                        afterPlaceholder.parentNode.insertBefore(tr, afterPlaceholder.nextSibling);
                    }

                    // Insert the record number
                    td = document.createElement('td');
                    var div = document.createElement('div');
                    div.appendChild(document.createTextNode(index+1));
                    td.appendChild(div);
                    tr.appendChild(td);

                    for (var j=0; j<datasetFields.length; j++) {
                        var field = datasetFields[j];
                        var fieldValue = $filter('formatFieldValue')(record.fields, field);

                        td = document.createElement('td');
                        tr.appendChild(td);

                        var div = document.createElement('div');
                        td.appendChild(div);

                        var newScope = $scope.$new(false);
                        newScope.recordFields = record.fields[field.name];

                        if (field && field.type === 'geo_point_2d') {
                            newScope.fieldValue = fieldValue;
                            if (!window.ie8) {
                                node = $compile('<ods-geotooltip width="300" height="300" coords="recordFields">' + fieldValue + '</ods-geotooltip>')(newScope)[0];
                            } else {
                                node = document.createElement('span');
                                node.title = fieldValue;
                                node.innerHTML = fieldValue;
                            }
                        } else if (field && field.type === 'geo_shape') {
                            newScope.fieldValue = $filter('truncate')(fieldValue);
                            if (!window.ie8) {
                                node = $compile('<ods-geotooltip width="300" height="300" geojson="recordFields">' + fieldValue + '</ods-geotooltip>')(newScope)[0];
                            } else {
                                node = document.createElement('span');
                                node.title = fieldValue;
                                node.innerHTML = fieldValue;
                            }
                        } else {
                            var node = document.createElement('span');
                            node.title = fieldValue;
                            node.innerHTML = $filter('nofollow')($filter('prettyText')(fieldValue));
                        }

                        div.appendChild(node);
                    }

                    return tr;
                };

                var deleteOneRecord = function(index) {
                    var record = $element[0].getElementsByClassName('record-'+index)[0];
                    if (record) {
                        record.parentNode.removeChild(record);
                    }
                };

                var displayRecords = function() {
                    var offsetHeight = $element.find('.records-body')[0].offsetHeight;
                    var scrollTop = $element.find('.records-body')[0].scrollTop;
                    var recordHeight = recordsBody.find('tr').eq(1).height(); // First row is the placeholder

                    // Compute the index of the records that will be visible = that we have in the DOM
                    // TODO: Don't use jQuery if there is performance issue.
                    var placeholderTop = $element.find('.placeholderTop')[0];
                    var placeholderBot = $element.find('.placeholderBot')[0];

                    if(recordHeight) {
                        startIndex = Math.max(Math.floor((scrollTop - (extraRecords * recordHeight)) / recordHeight), 0);
                        endIndex = Math.min(Math.ceil((scrollTop + offsetHeight + (extraRecords * recordHeight)) / recordHeight), $scope.records.length);
                    } else {
                        startIndex = 0;
                        endIndex = $scope.records.length;
                    }
                    startIndex = startIndex && startIndex%2 ? startIndex+1 : startIndex;

                    var scrollDown = startIndex - lastStartIndex > 0 || endIndex - lastEndIndex > 0;

                    // Skip if it is already done
                    if (startIndex === lastStartIndex && endIndex === lastEndIndex) {
                        return;
                    }

                    // Hide the element to prevent intermediary renderings
                    // $element.hide();

                    // Insert placeholder tr
                    var tr;

                    if (!placeholderTop) {
                        tr = document.createElement('tr');
                        tr.className = 'placeholderTop';
                        tr.style.height = '0px';
                        recordsBody[0].appendChild(tr);
                        placeholderTop = $element.find('.placeholderTop')[0];
                    }

                    if (!placeholderBot) {
                        tr = document.createElement('tr');
                        tr.className = 'placeholderBot';
                        tr.style.height = '0px';
                        recordsBody[0].appendChild(tr);
                        placeholderBot = $element.find('.placeholderBot')[0];
                    }

                    if (!$scope.layout.length && $scope.records.length) {
                        var numberRecordsToRender = Math.min($scope.records.length, $scope.resultsPerPage);

                        for (var i=0; i<numberRecordsToRender; i++) {
                            renderOneRecord(i, $scope.records, 'end');
                        }
                    }
                    else {
                        if (scrollDown) {
                            for (var i=0; i<startIndex; i++) {
                                deleteOneRecord(i);
                            }

                            placeholderTop.style.height = startIndex*recordHeight + 'px';

                            var trInDom = $element[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                            var visible = trInDom.length > 2;
                            var lastRecordNumber = visible ? parseInt(trInDom[trInDom.length-2].className.substr(7), 10) : startIndex;

                            var count = 0;
                            for (var i=lastRecordNumber+1; i<endIndex; i++) {
                                renderOneRecord(i, $scope.records, 'end');
                                count++;
                            }

                            var newHeight = visible ? $(placeholderBot).height() - count*recordHeight : ($scope.records.length-endIndex)*recordHeight;
                            newHeight = newHeight > 0 ? newHeight : 0;
                            placeholderBot.style.height = newHeight + 'px';
                        } else {
                            var count = 0;
                            for (var i=endIndex+1; i<$scope.records.length; i++) {
                                deleteOneRecord(i);
                                count++;
                            }

                            var deltaRecords = ($scope.records.length - (endIndex+1));
                            deltaRecords = deltaRecords >= 0 ? deltaRecords : 0;
                            placeholderBot.style.height = deltaRecords*recordHeight + 'px';

                            var trInDom = $element[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                            var visible = trInDom.length > 2;
                            var firstRecordNumber = visible ? parseInt(trInDom[1].className.substr(7), 10) : endIndex;

                            var count = 0;
                            for (var i=firstRecordNumber-1; i>=startIndex; i--) {
                                renderOneRecord(i, $scope.records, 'begin');
                                count++;
                            }

                            var newHeight = visible ? $(placeholderTop).height() - count*recordHeight : startIndex*recordHeight;

                            newHeight = newHeight > 0 ? newHeight : 0;
                            placeholderTop.style.height = newHeight + 'px';
                        }
                    }

                    // $element.show();

                    lastStartIndex = startIndex;
                    lastEndIndex = endIndex;
                };


                $scope.$watch('records', function(newValue, oldValue) {
                    if (newValue !== oldValue) {
                        displayRecords();
                        $scope.computeLayout();
                    }
                });

                var unwatchSchema = $scope.$watch('context.dataset', function(newValue, oldValue) {
                    //if (newValue === oldValue) return;
                    if (!newValue || !newValue.datasetid) return;
                    unwatchSchema();

                    // No default sorting
                    // $scope.searchOptions.sort = $scope.dataset.fields[0].name

                    if ($scope.displayedFields) {
                        $scope.displayedFieldsArray = $scope.displayedFields.split(',').map(function(item) {return item.trim();});
                    } else {
                        if ($scope.context.dataset.extra_metas &&
                            $scope.context.dataset.extra_metas.visualization &&
                            angular.isArray($scope.context.dataset.extra_metas.visualization.table_fields) &&
                            $scope.context.dataset.extra_metas.visualization.table_fields.length > 0) {
                            $scope.displayedFieldsArray = $scope.context.dataset.extra_metas.visualization.table_fields;
                        } else {
                            $scope.displayedFieldsArray = null;
                        }
                    }

                    if (!$scope.tableContext.tablesort && $scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.table_default_sort_field) {
                        var sortField = $scope.context.dataset.extra_metas.visualization.table_default_sort_field;
                        if ($scope.context.dataset.extra_metas.visualization.table_default_sort_direction === '-') {
                            sortField = '-' + sortField;
                        }
                        $scope.tableContext.tablesort = sortField;
                    }

                    $scope.staticSearchOptions = {
                        rows: $scope.resultsPerPage
                    };

                    DebugLogger.log('table -> dataset watch -> refresh records');

                    var fieldsForVisualization = $filter('fieldsForVisualization')($scope.context.dataset.fields, 'table');
                    datasetFields = $filter('fieldsFilter')(fieldsForVisualization, $scope.displayedFieldsArray);

                    refreshRecords(true);
                }, true);

                $scope.$watch('[context.parameters, tableContext.tablesort]', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;

                    DebugLogger.log('table -> searchOptions watch -> refresh records');

                    // Reset all variables for next time
                    $scope.layout = []; // Reset layout (layout depends on records data)
                    $scope.working = true;
                    lastScrollLeft = $element.find('.records-body')[0].scrollLeft; // Keep scrollbar position
                    forceScrollLeft = true;

                    recordsBody.empty();

                    refreshRecords(true);
                }, true);

                var resetScroll = function() {
                    $element.find('.records-body').scrollLeft(0);
                    recordsHeader.css({left: 'auto'});
                    initScrollLeft = $element.find('.records-header').offset().left;
                };

                $(window).on('resize', function() {
                    $timeout(function() {
                        resetScroll();
                        $scope.layout = [];
                        $scope.computeLayout();
                    }, 0);
                });

                var lastRecordDisplayed = 0;
                $element.find('.records-body').on('scroll', function() {
                    if (this.scrollLeft !== prevScrollLeft) {
                        // Horizontal scroll
                        recordsHeader.offset({left: initScrollLeft - this.scrollLeft});
                        prevScrollLeft = this.scrollLeft;
                    } else {
                        // Vertical scroll
                        forceScrollLeft = false;
                        var recordDisplayed = Math.max(Math.floor(($element.find('.records-body')[0].scrollTop) / recordsBody.find('tr').eq(1).height()), 0);

                        if (Math.abs(recordDisplayed-lastRecordDisplayed) < extraRecords && recordDisplayed > startIndex) {
                            return;
                        }

                        lastRecordDisplayed = recordDisplayed;
                        displayRecords();
                    }
                });

                var computeStyle = function(tableId, disableMaxWidth) {
                    var styles = '';
                    for (var i=0; i<$scope.layout.length; i++) {
                        var j = i+1;
                        var maxWidth = disableMaxWidth ? 'max-width: none; ' : ''; // Table with few columns
                        styles += '#' + tableId + ' .records-header tr th:nth-child(' + j + ') > div, '
                                + '#' + tableId + ' .records-body tr td:nth-child(' + j + ') > div '
                                + '{ width: ' + $scope.layout[i] + 'px; ' + maxWidth + '} ';

                    }
                    return styles;
                };

                $scope.computeLayout = function() {
                    var rows = $element.find('.records-body tbody tr');

                    var padding = 22; // 22 = 2*paddingDiv + 2*paddingTh = 2*10 + 2*1

                    if (!$scope.layout.length && $scope.records.length) {
                        if (!$element.attr('id')) {
                            $element.attr('id', tableId);
                        }

                        if ($('.embedded').length) {
                            var elementHeight = $(window).height();
                            $element.height(elementHeight);
                        } else {
                            var elementHeight = $element.height();
                        }
                        $element.find('.records-body').height(elementHeight - 25); // Horizontal scrollbar height

                        var recordHeight = recordsBody.find('tr').eq(1).height();
                        var bodyHeight = (rows.length-2)*recordHeight; // Don't take in account placeholders

                        // Remove previous style
                        var node = document.getElementById(styleSheetId);
                        if (node && node.parentNode) {
                            node.parentNode.removeChild(node);
                        }

                        // Switch between the fake header and the default header
                        $element.find('.records-header thead').hide();
                        $element.find('.records-body thead').show();

                        var totalWidth = 0;
                        angular.forEach($element.find('.records-body thead th > div'), function (thDiv, i) {
                            $scope.layout[i] = $(thDiv).width() + 6; // For sortable icons
                            totalWidth += $scope.layout[i];
                        });
                        $scope.layout[0] = 30; // First column is the record number

                        var tableWidth = $element.find('.records-body table').width();
                        var tableFewColumns = (totalWidth + padding * $scope.layout.length) < $element.width();

                        if (tableFewColumns) {
                            var toAdd = Math.floor(tableWidth / $scope.layout.length);
                            var remaining = tableWidth - toAdd * $scope.layout.length;

                            // Dispatch the table width between the other columns
                            for (var i = 1; i < $scope.layout.length; i++) {
                                $scope.layout[i] = toAdd - padding;
                            }
                            $scope.layout[$scope.layout.length - 1] += remaining;

                            // Scrollbar is here: too many records
                            if (bodyHeight > 500) {
                                $element.find('.records-header table').width(tableWidth);
                            } else {
                                $element.find('.records-header table').width('');
                            }
                        }

                        // Append new style
                        var css = document.createElement('style');
                        var styles = computeStyle(tableId, tableFewColumns);

                        css.id = styleSheetId;
                        css.type = 'text/css';

                        css.styleSheet ?
                            css.styleSheet.cssText = styles :
                            css.appendChild(document.createTextNode(styles));

                        $element[0].appendChild(css);

                        // Switch between the default header and the fake header
                        $element.find('.records-body thead').hide();
                        $element.find('.records-header thead').show();

                        if (!forceScrollLeft) {
                            $timeout(function () {
                                resetScroll();
                            }, 0);
                        }
                    }

                    // Restore previous horizontal scrollbar position
                    if (forceScrollLeft) {
                        if (!lastScrollLeft) {
                            recordsHeader.css({left: 'auto'});
                        }
                        $element.find('.records-body')[0].scrollLeft = lastScrollLeft;
                    }

                    if ($scope.layout.length) {
                        $scope.working = false;
                    }
                };

            }]
        };
    }]);

}());