(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCrossTable', ['ODSAPI', '$q', '$filter', '$timeout', function (ODSAPI, $q, $filter, $timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCrossTable
         * @scope
         * @restrict E
         *
         * @param {DatasetContext} context Context {@link ods-widgets.directive:odsDatasetContext Dataset Context} from which data is
         * extracted
         * @param {string} rows Comma-separated list of field names which will be used for row headers' values
         * @param {string} column Name of the field which will be used for column header's values
         * @param {string} serieXxxLabel Label of the serie, which will be displayed as column header (Xxx being the
         * name of the serie).
         * @param {string} serieXxxFunc Function (SUM, AVG, COUNT etc...) used to aggregate the serie's analysis (Xxx
         * being the name of the serie)
         * @param {string} serieXxxExpr Name of the field used for the serie's analysis (Xxx being the name of the
         * serie)
         * @param {boolean} [repeatRowHeaders=false] Whether to repeat the row headers on each line or not.
         * @param {boolean} [displayIntermediaryResults=false] Whether to display intermediary subtotals, subaverages
         * etc...
         * @param {integer} [numberPrecision=3] The number of decimals to display for number values.
         *
         * @description
         * This widget create a cross table from a context.
         * It supports multiple aggregations for a single column field and multiple row fields.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="averagewages"
         *                               averagewages-domain="https://data.opendatasoft.com"
         *                               averagewages-dataset="oecd-average-wages@public-us">
         *              <ods-cross-table context="averagewages"
         *                               rows="location"
         *                               column="time"
         *                               serie-production-label="Average wages"
         *                               serie-production-func="AVG"
         *                               serie-production-expr="value"></ods-cross-table>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */


        /**
         * CrossTable
         *
         * In order to illustrate each method, we'll consider a table containing columns A, B, C, D and E, each having
         * two values A1-A2, B1-B2 etc.
         * * A,B and C will be used as rowFields
         * * D will be used as colField
         * * E will be used to define two series, SUM_E and AVG_E
         */
        var CrossTable = function (rowFields, colField, series, schema, dataset, repeatRowHeaders, displayIntermediaryResults, numberPrecision) {

            /**
             * Array of field names which values will be used as row headers.
             * @type {Array}
             */
            this.rowFields = rowFields;

            /**
             * Field name which values will be used as column headers.
             * @type {string}
             */
            this.colField = colField;

            /**
             * Schema of fields used in rowFields or colFields, indexed by field name.
             * @type {{}}
             */
            this.schema = schema;

            /**
             * Dataset related to the given schema (useful for helpers)
             * @type {{}}
             */
            this.dataset = dataset;

            /**
             * Array of Serie objects
             * @type {Array}
             */
            this.series = series;

            /**
             * Array of RowNumbersIndex where the index matches the depth.
             * This allows to store one RowNumbersIndex for each intermediary analysis.
             * @type {RowNumbersIndex[]}
             */
            this.rowNumbersIndexes = [];

            /**
             * Col numbers indexed by values extracted from the column field.
             * @type {{}}
             */
            this.colNumbersIndex = {};

            /**
             * Array of array representing all cells in the table (headers included)
             * each item of the array is either a cell object or a simple type (string or number)
             * @type {Array}
             */
            this.table = [];

            /**
             * Whether to repeat row headers in case of multiple rowFields or not.
             * @type {Boolean}
             */
            this.repeatRowHeaders = repeatRowHeaders;

            /**
             * Whether to display intermediary SUMs, AVGs, etc. or not
             * @type {Boolean}
             */
            this.displayIntermediaryResults = displayIntermediaryResults;

            /**
             * List of rowField values indexed by the rowField's name
             * @type {{}}
             */
            this._insertedRowHeaders = [];

            /**
             * Helper able to generate a label from an analysisValue
             * @type {LabelBuilder}
             */
            this.labelBuilder = new LabelBuilder(this.dataset, this.schema, this.rowFields, this.colField);

            /**
             * Number of decimals use in formatting numbers
             * @type {integer}
             */
            this.numberPrecision = numberPrecision;

            this.setData = function (columnHeadersAnalysis, rowHeadersAnalyses, analyses) {
                this.resetData();

                this.buildColNumbersIndexes(columnHeadersAnalysis, false);
                this.buildRowNumbersIndexes(rowHeadersAnalyses, this.rowFields.length > 1);

                this.buildTableStructure(rowHeadersAnalyses);

                this.buildTableColumnHeaders(columnHeadersAnalysis, false);
                this.buildTableRowHeaders(rowHeadersAnalyses, this.rowFields.length > 1);
                this.buildTableBody(analyses, true);
            };

            this.resetData = function () {
                // colNumbersIndex
                this.colNumbersIndex = {};

                // rowNumbersIndexes
                this.rowNumbersIndexes = [];
                if (this.displayIntermediaryResults) {
                    for (var i = 0; i < this.rowFields.length; i++) {
                        this.rowNumbersIndexes.push(new RowNumbersIndex(this.rowFields, i + 1, this.labelBuilder));
                    }
                } else {
                    this.rowNumbersIndexes.push(new RowNumbersIndex(this.rowFields, this.rowFields.length, this.labelBuilder));
                }

                // _insertedRowHeaders
                this._insertedRowHeaders = rowFields.reduce(function (previous, current) {
                    previous[current] = [];
                    return previous
                }, {});

                // table
                this.table = [];
            };

            this.buildColNumbersIndexes = function (colValues, isMultiXAnalysis) {
                for (var i = 0; i < colValues.length; i++) {
                    var index = {};
                    for (var j = 0; j < this.series.length; j++) {
                        var serieName = this.series[j].name;
                        index[serieName] = i * this.series.length + j;
                    }
                    this.colNumbersIndex[this.labelBuilder.buildLabel(colValues[i], this.colField, isMultiXAnalysis)] = index;
                }
            };

            this.buildRowNumbersIndexes = function (analyses, isMultiXAnalysis) {
                var analysisValues = analyses[analyses.length - 1];
                var currentRowNumber = 0;
                var rowNumbersIndex = this.rowNumbersIndexes[0];
                for (var i = 0; i < analysisValues.length; i++) {
                    var analysisValue = analysisValues[i];

                    if (this.displayIntermediaryResults) {
                        for (var j = 0; j < this.rowFields.length; j++) {
                            rowNumbersIndex = this.rowNumbersIndexes[j];
                            if (rowNumbersIndex.getRowNumber(analysisValue, isMultiXAnalysis) === undefined) {
                                rowNumbersIndex.setRowNumber(analysisValue, currentRowNumber, isMultiXAnalysis);
                                currentRowNumber++;
                            }
                        }
                    } else {
                        if (rowNumbersIndex.getRowNumber(analysisValue, isMultiXAnalysis) === undefined) {
                            rowNumbersIndex.setRowNumber(analysisValue, currentRowNumber, isMultiXAnalysis);
                            currentRowNumber++;
                        }

                    }
                }
            };

            this.buildTableStructure = function (analyses) {
                var i;

                // Reserve space for table header
                for (i = 0; i < Math.min(2, this.series.length); i++) {
                    this.table.push([]);
                }

                // Reserve space for table data
                var that = this;
                var tableWidth = Object.keys(this.colNumbersIndex).length * this.series.length + this.rowFields.length;
                var analysisValues;
                if (this.displayIntermediaryResults) {
                    for (i = 0; i < analyses.length; i++) {
                        analysisValues = analyses[i];
                        angular.forEach(analysisValues, function () {
                            that.table.push(new Array(tableWidth));
                        });
                    }
                } else {
                    analysisValues = analyses[0];
                    angular.forEach(analysisValues, function () {
                        that.table.push(new Array(tableWidth));
                    });
                }
            };


            this.buildTableColumnHeaders = function (colValues, isMultiXAnalysis) {
                var that = this;
                var row;

                var nbSeries = this.series.length;

                if (nbSeries > 1) {
                    // first row
                    row = [];
                    angular.forEach(this.rowFields, function () {
                        row.push(new Cell('', 'ods-cross-table__cell--header'))
                    });
                    angular.forEach(colValues, function (colValue) {
                        row.push(new Cell(that.labelBuilder.buildLabel(colValue, that.colField, isMultiXAnalysis), 'ods-cross-table__cell--header', nbSeries));
                    });
                    this.table[0] = row;

                    // second row
                    row = [];
                    angular.forEach(this.rowFields, function (fieldName) {
                        row.push(new Cell(that.schema[fieldName].label, 'ods-cross-table__cell--header'))
                    });
                    var serieHeaders = [];
                    angular.forEach(this.series, function (serie) {
                        serieHeaders.push(new Cell(serie.label || serie.name, 'ods-cross-table__cell--header'))
                    });
                    angular.forEach(colValues, function () {
                        row = row.concat(serieHeaders);
                    });
                    this.table[1] = row;
                } else {
                    row = [];
                    angular.forEach(this.rowFields, function (fieldName) {
                        row.push(new Cell(that.schema[fieldName].label, 'ods-cross-table__cell--header'))
                    });
                    angular.forEach(colValues, function (colValue) {
                        row.push(new Cell(that.labelBuilder.buildLabel(colValue, that.colField, isMultiXAnalysis), 'ods-cross-table__cell--header'));
                    });
                    this.table[0] = row;
                }
            };

            this.buildTableRowHeaders = function (analyses, isMultiXAnalysis) {
                var that = this;
                angular.forEach(analyses, function (analysisValues, analysisIndex) {
                    angular.forEach(analysisValues, function (analysisValue) {
                        var rowNumber = that.getRowNumber(analysisValue, analysisIndex, isMultiXAnalysis) + Math.min(2, that.series.length);
                        var end = that.displayIntermediaryResults ? analysisIndex + 1 : that.rowFields.length;
                        for (var i = 0; i < end; i++) {
                            var fieldName = that.rowFields[i];
                            var label = that.labelBuilder.buildLabel(analysisValue, fieldName, isMultiXAnalysis);
                            if (i === that.rowFields.length - 1 || that.repeatRowHeaders || that._insertedRowHeaders[fieldName].indexOf(label) === -1) {
                                that.table[rowNumber][i] = new Cell(label, 0, 'ods-cross-table__cell--header');
                                // Reset row value as it wasn't repeated
                                that._insertedRowHeaders[fieldName] = [];
                                that._insertedRowHeaders[fieldName].push(label);
                            }
                        }
                    });
                });
            };

            this.buildTableBody = function (analyses, isMultiXAnalysis) {
                var that = this;
                angular.forEach(analyses, function (analysisValues, analysisIndex) {
                    angular.forEach(analysisValues, function (analysisValue) {
                        angular.forEach(that.series, function (serie) {
                            // row index is corrected by the number of col headers in the table
                            var row = that.getRowNumber(analysisValue, analysisIndex, isMultiXAnalysis) + Math.min(2, that.series.length);
                            // col index is corrected by the number of row headers in the table
                            var col = that.getColNumber(analysisValue, serie.name, isMultiXAnalysis) + that.rowFields.length;
                            that.table[row][col] = new Cell($filter('number')(analysisValue[serie.name], that.numberPrecision), 'ods-cross-table__cell--value');
                        });
                    });
                });
            };

            this.getColNumber = function (analysisValue, serieName, isMultiXAnalysis) {
                return this.colNumbersIndex[this.labelBuilder.buildLabel(analysisValue, this.colField, isMultiXAnalysis)][serieName];
            };

            this.getRowNumber = function (analysisValue, analysisIndex, isMultiXAnalysis) {
                var rowNumbersIndex = this.rowNumbersIndexes[analysisIndex];
                return rowNumbersIndex.getRowNumber(analysisValue, isMultiXAnalysis);
            };

            return this;
        };

        var LabelBuilder = function (dataset, schema, rowFields, colField) {
            this.dataset = dataset;
            this.schema = schema;
            this.rowFields = rowFields;
            this.colField = colField;

            this.formatXValue = function (xValue) {
                if (angular.isObject(xValue)) {
                    var datePattern = ODS.DateFieldUtils.datePatternBuilder('moment')(xValue);
                    return moment(ODS.DateFieldUtils.getDateFromXObject(xValue)).format(datePattern);
                }
                return xValue;
            };

            this.buildLabel = function (analysisValue, field, isMultiXAnalysis) {
                if (isMultiXAnalysis) {
                    return this.formatXValue(analysisValue.x[field]);
                }

                return this.formatXValue(analysisValue.x);
            };

            return this;
        };

        /**
         * Simple object storing serie properties.
         *
         * @param name
         * @returns {Serie}
         * @constructor
         */
        var Serie = function (name) {
            this.name = name;
            this.label = undefined;
            this.func = undefined;
            this.expr = undefined;

            this.update = function (property, value) {
                this[property] = value;
            };

            return this;
        };

        /**
         * Representation of a cell's content.
         *
         * @param label
         * @param classes
         * @param colspan
         * @returns {Cell}
         * @constructor
         */
        var Cell = function (label, classes, colspan) {
            this.label = label;
            this.colspan = colspan || 0;
            this.classes = classes || '';

            return this;
        };

        /**
         * Multi level object storing for each tuple of the first {depth} rowFields the corresponding rowNumber.
         *
         * Example of stored structure for rowFields = A,B,C and depth = 2 (row numbers are not relevant)
         *   {
         *     A1: {
         *       B1: 1,
         *       B2: 2
         *     },
         *     A2: {
         *       B1: 3,
         *       B2: 4
         *     }
         *   }
         *
         * Example of stored structure for rowFields = A,B,C and depth = 3 (row numbers are not relevant)
         *   {
         *     A1: {
         *       B1: {
         *         C1: 1,
         *         C2: 2
         *       },
         *       B2: {
         *         C1: 3,
         *         C2: 4
         *       }
         *     },
         *     A2: {
         *       B1: {
         *         C1: 5,
         *         C2: 6
         *       },
         *       B2: {
         *         C1: 7,
         *         C2: 8
         *       }
         *     }
         *   }
         *
         * @param rowFields List of field names
         * @param depth Depth of the index (depth < rowFields.length)
         * @param labelBuilder {LabelBuilder}
         * @constructor
         */
        var RowNumbersIndex = function (rowFields, depth, labelBuilder) {
            this.rowFields = rowFields;
            this.depth = depth;
            this.labelBuilder = labelBuilder;

            this.rowNumbers = {};

            this.getRowNumber = function (analysisValue, isMultiXAnalysis) {
                var rowNumber = this.rowNumbers;
                for (var i = 0; i < this.depth; i++) {
                    var rowField = this.rowFields[i];
                    var label = this.labelBuilder.buildLabel(analysisValue, rowField, isMultiXAnalysis);
                    rowNumber = rowNumber[label];
                    if (rowNumber === undefined) {
                        return undefined;
                    }
                }
                return rowNumber;
            };

            this.setRowNumber = function (analysisValue, rowNumber, isMultiXAnalysis) {
                for (var i = this.depth - 1; i >= 0; i--) {
                    var rowField = this.rowFields[i];
                    var label = this.labelBuilder.buildLabel(analysisValue, rowField, isMultiXAnalysis);
                    var tmp = {}; // necessary because we can't do rowNumber = {label: rowNumber}
                    tmp[label] = rowNumber;
                    rowNumber = tmp;
                }
                angular.merge(this.rowNumbers, rowNumber);
            };

            return this;
        };

        return {
            restrict: 'E',
            scope: {
                context: '=',
                column: '@',
                rows: '@',
                repeatRowHeaders: '=',
                displayIntermediaryResults: '=',
                numberPrecision: '='
            },
            template: '' +
            '<div class="ods-cross-table">' +
            '    <ods-spinner with-backdrop ng-show="loading"></ods-spinner>' +
            '    <div class="ods-cross-table__frozen-header-wrapper">' +
            '        <table class="ods-cross-table__frozen-header">' +
            '            <tr ng-repeat="row in table | limitTo:nbFrozenRows track by $index" class="ods-cross-table__row">' +
            '                <td ng-repeat="cell in row | limitTo:nbFrozenCols track by $index" ' +
            '                    colspan="{{ cell.colspan }}" ' +
            '                    class="ods-cross-table__cell {{ cell.classes }}">' +
            '                    <div class="ods-cross-table__cell-content" ng-bind="cell.label || \'&nbsp;\'"></div>' +
            '                </td>' +
            '            </tr>' +
            '        </table>' +
            '    </div>' +
            '    <div class="ods-cross-table__frozen-rows-wrapper">' +
            '        <table class="ods-cross-table__frozen-rows">' +
            '            <tr ng-repeat="row in table | limitTo:nbFrozenRows track by $index" class="ods-cross-table__row">' +
            '                <td ng-repeat="cell in row | limitTo:row.length:nbFrozenCols track by $index" ' +
            '                    colspan="{{ cell.colspan }}" ' +
            '                    class="ods-cross-table__cell {{ cell.classes }}">' +
            '                    <div class="ods-cross-table__cell-content" ng-bind="cell.label || \'&nbsp;\'"></div>' +
            '                </td>' +
            '            </tr>' +
            '        </table>' +
            '    </div>' +
            '    <div class="ods-cross-table__frozen-cols-wrapper">' +
            '        <table class="ods-cross-table__frozen-cols">' +
            '            <tr ng-repeat="row in table | limitTo:table.length:nbFrozenRows track by $index" class="ods-cross-table__row">' +
            '                <td ng-repeat="cell in row | limitTo:nbFrozenCols track by $index" ' +
            '                    colspan="{{ cell.colspan }}" ' +
            '                    class="ods-cross-table__cell {{ cell.classes }}">' +
            '                    <div class="ods-cross-table__cell-content" ng-bind="cell.label || \'&nbsp;\'"></div>' +
            '                </td>' +
            '            </tr>' +
            '        </table>' +
            '    </div>' +
            '    <div class="ods-cross-table__body-wrapper">' +
            '        <table class="ods-cross-table__body">' +
            '            <tr ng-repeat="row in table | limitTo:table.length:nbFrozenRows track by $index" class="ods-cross-table__row">' +
            '                <td ng-repeat="cell in row | limitTo:row.length:nbFrozenCols track by $index" ' +
            '                    colspan="{{ cell.colspan }}" ' +
            '                    class="ods-cross-table__cell {{ cell.classes }}">' +
            '                    <div class="ods-cross-table__cell-content" ng-bind="cell.label || \'&nbsp;\'"></div>' +
            '                </td>' +
            '            </tr>' +
            '        </table>' +
            '    </div>' +
            '</div>',
            link: function (scope, element, attrs) {
                scope.table = [];
                scope.nbFrozenRows = 0;
                scope.nbFrozenCols = 0;
                scope.loading = false;

                var crossTable;
                var rows = scope.rows.split(',');

                var $element = $(element);
                var $frozenHeaderWrapper = $element.find('.ods-cross-table__frozen-header-wrapper');
                var $frozenHeaderTable = $element.find('.ods-cross-table__frozen-header');
                var $frozenColsWrapper = $element.find('.ods-cross-table__frozen-cols-wrapper');
                var $frozenColsTable = $element.find('.ods-cross-table__frozen-cols');
                var $frozenRowsWrapper = $element.find('.ods-cross-table__frozen-rows-wrapper');
                var $frozenRowsTable = $element.find('.ods-cross-table__frozen-rows');
                var $bodyWrapper = $element.find('.ods-cross-table__body-wrapper');
                var $bodyTable = $element.find('.ods-cross-table__body');

                // init cross table

                var buildSeries = function () {
                    var series = {};
                    angular.forEach(attrs, function (attributeValue, attributeName) {
                        var regex = /serie([0-9A-Z][0-9a-z]*)(Label|Func|Expr)/g;
                        var match = regex.exec(attributeName);
                        if (match) {
                            var name = match[1].toLowerCase();
                            var serie = series[name] || new Serie(name);
                            serie.update(match[2].toLowerCase(), attributeValue);
                            series[name] = serie;
                        }
                    });
                    return Object.keys(series).map(function (name) {
                        return series[name]
                    });
                };

                var buildFieldSchemas = function () {
                    var schema = {};
                    angular.forEach(scope.context.dataset.fields, function (field) {
                        if (rows.indexOf(field.name) > -1 || field.name == scope.column) {
                            schema[field.name] = field;
                        }
                    });
                    return schema;
                };

                // fetch data

                var buildX = function (fieldNames) {
                    fieldNames = angular.isArray(fieldNames) ? fieldNames : [fieldNames];
                    var xs = [];
                    angular.forEach(fieldNames, function (fieldName) {
                        var fieldSchema = scope.context.dataset.getField(fieldName);
                        if (['date', 'datetime'].indexOf(fieldSchema.type) > -1) {
                            var timescale = scope.context.dataset.getFieldAnnotation(fieldSchema, 'timeserie_precision').args[0];
                            xs = xs.concat(ODS.DateFieldUtils.getTimescaleX(fieldName, timescale))
                        } else {
                            xs.push(fieldName);
                        }
                    });
                    return xs;
                };

                var buildSort = function (fieldNames) {
                    if (!angular.isArray(fieldNames)) {
                        fieldNames = [fieldNames];
                    }
                    return fieldNames.map(function (name) {
                        return 'x.' + name
                    }).join(',');
                };

                var reloadData = function () {
                    scope.loading = true;
                    var promises = [];

                    // fetch values for column headers
                    var columnXs = buildX(crossTable.colField);
                    var columnHeadersParams = {
                        'x': columnXs,
                        'y.serie1.func': 'COUNT',
                        'sort': buildSort(columnXs)
                    };

                    promises.push(ODSAPI.records.analyze(scope.context, angular.extend({}, scope.context.parameters, columnHeadersParams)));

                    var rowHeadersPromises = [];
                    var seriesPromises = [];
                    for (var i = scope.displayIntermediaryResults ? 0 : crossTable.rowFields.length - 1; i < crossTable.rowFields.length; i++) {
                        var subfields = crossTable.rowFields.slice(0, i+1);
                        var options, xs;

                        // fetch values for row headers
                        xs = buildX(subfields);
                        options = angular.extend({}, scope.context.parameters, {
                            'x': xs,
                            'y.serie1.func': 'COUNT',
                            'sort': buildSort(xs)
                        });
                        rowHeadersPromises.push(ODSAPI.records.analyze(scope.context, options));

                        // fetch values for series
                        xs = buildX(subfields.concat(crossTable.colField));
                        options = angular.extend({}, scope.context.parameters, {
                            'x': xs,
                            'sort': buildSort(xs)
                        });
                        angular.forEach(crossTable.series, function (serie) {
                            options['y.' + serie.name + '.expr'] = serie.expr;
                            options['y.' + serie.name + '.func'] = serie.func;
                        });
                        seriesPromises.push(ODSAPI.records.analyze(scope.context, options));
                    }

                    promises = promises.concat(rowHeadersPromises).concat(seriesPromises);

                    $q.all(promises).then(function (responses) {
                        var columnHeadersAnalysis = responses[0].data;
                        var rowHeadersAnalyses = responses.slice(1, (responses.length - 1)/2 + 1).map(function (item) {
                            return item.data;
                        });
                        var analyses = responses.slice((responses.length-1)/2 + 1, responses.length).map(function (item) {
                            return item.data;
                        });
                        crossTable.setData(columnHeadersAnalysis, rowHeadersAnalyses, analyses);
                        scope.table = crossTable.table;
                        scope.nbFrozenCols = crossTable.rowFields.length;
                        scope.nbFrozenRows = Math.min(2, crossTable.series.length);

                        $timeout(function () {
                            // synchronise frozen cells width

                            var synchronizeWidth = function ($bodyCell, $headerCellContent) {
                                var width = Math.max($headerCellContent.outerWidth(), $bodyCell.outerWidth());
                                $headerCellContent.css({width: width});
                                $bodyCell.find('.ods-cross-table__cell-content').css({width: width});
                            };

                            var serieHeaderCells = $frozenRowsTable.find('tr:last-child .ods-cross-table__cell-content');
                            $bodyTable.find('tr:first-child td').each(function (index) {
                                synchronizeWidth($(this), $(serieHeaderCells[index]));
                            });

                            var headerCells = $frozenHeaderTable.find('tr:last-child .ods-cross-table__cell-content');
                            $frozenColsTable.find('tr:first-child td').each(function (index) {
                                synchronizeWidth($(this), $(headerCells[index]));
                            });

                            // synchronize header cells height

                            headerCells = $frozenHeaderTable.find('td:first-child .ods-cross-table__cell-content');
                            $frozenRowsTable.find('td:first-child').each(function (index) {
                                $(headerCells[index]).css({height: $(this).height()});
                            });

                            // reposition sections

                            var frozenColsWidth = $frozenColsWrapper.outerWidth();
                            var frozenRowsHeight = $frozenRowsWrapper.outerHeight();

                            $frozenHeaderWrapper.css({
                                top: 0,
                                left: 0,
                                width: frozenColsWidth,
                                height: frozenRowsHeight
                            });
                            $frozenRowsWrapper.css({
                                top: 0,
                                left: frozenColsWidth
                            });
                            $frozenColsWrapper.css({
                                top: frozenRowsHeight,
                                left: 0
                            });
                            $bodyWrapper.css({
                                top: frozenRowsHeight,
                                left: frozenColsWidth
                            });


                            // synchronise scroll
                            $bodyWrapper.on('scroll', function () {
                                $frozenColsTable.css({'margin-top': -$(this).scrollTop()});
                                $frozenRowsTable.css({'margin-left': -$(this).scrollLeft()});
                            });
                            $frozenColsWrapper.on('wheel', function (event) {
                                $bodyWrapper.scrollTop($bodyWrapper.scrollTop() + event.originalEvent.deltaY);
                                event.preventDefault();
                            });
                            $frozenRowsWrapper.on('wheel', function (event) {
                                $bodyWrapper.scrollLeft($bodyWrapper.scrollLeft() + event.originalEvent.deltaX);
                                event.preventDefault();
                            });

                            // synchronise hover
                            $bodyTable.find('tr').hover(
                                function () {
                                    $frozenColsTable.find('tr:nth-child(' + ($(this).index() + 1) + ')').addClass('ods-cross-table__row--hover');
                                },
                                function () {
                                    $frozenColsTable.find('tr:nth-child(' + ($(this).index() + 1) + ')').removeClass('ods-cross-table__row--hover');
                                });
                            $frozenColsTable.find('tr').hover(
                                function () {
                                    $bodyTable.find('tr:nth-child(' + ($(this).index() + 1) + ')').addClass('ods-cross-table__row--hover');
                                },
                                function () {
                                    $bodyTable.find('tr:nth-child(' + ($(this).index() + 1) + ')').removeClass('ods-cross-table__row--hover');
                                });

                            // hide spinner
                            scope.loading = false;
                        });
                    });
                };

                scope.context.wait().then(function () {
                    if (!angular.isDefined(scope.numberPrecision)) {
                        scope.numberPrecision = 3;
                    }
                    crossTable = new CrossTable(
                        rows,
                        scope.column,
                        buildSeries(),
                        buildFieldSchemas(),
                        scope.context.dataset,
                        scope.repeatRowHeaders === true,
                        scope.displayIntermediaryResults === true,
                        scope.numberPrecision);
                    scope.$watch('context.parameters', reloadData);
                });
            }
        }
    }]);
})();
