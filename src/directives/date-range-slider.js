(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsDateRangeSlider', ['ModuleLazyLoader', 'translate', 'odsTimerangeParser', '$q', '$parse', function (ModuleLazyLoader, translate, odsTimerangeParser, $q, $parse) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDateRangeSlider
         * @restrict E
         * @scope
         * @param {DatasetContext|DatasetContext[]} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} or array of context to use
         * @param {string} [initialFrom=none] Default date for the "from" field: "yesterday", "now", or a string representing a date
         * @param {string} [initialTo=none] Default date for the "to" field: "yesterday", "now", or a string representing a date
         * @param {expression} [startBound=none] Beginning bound of the range slider, it will define the minimum selectable from "yesterday", "now", or a string representing a date. As an AngularJS expression is expected, no need to use {{}} syntax for variables or expressions, and if you want to provide a static string value, surround it with simple quotes.
         * @param {expression} [endBound=none] End bound of the range slider, it will define the maximum selectable to "yesterday", "now", or a string representing a date. As an AngularJS expression is expected, no need to use {{}} syntax for variables or expressions, and if you want to provide a static string value, surround it with simple quotes.
         * @param {string} [dateFormat='YYYY-MM-DD'] Defines the format to render the two bounds and the selection.
         * @param {string} [dateField=none] Date field to query on. If no field is provided, the first date type field of the dataset is used.
         * @param {string} [precision='day'] Defines the precision, 'day', 'month' or 'year', default is 'day'
         * @param {string} [suffix=none] Context parameter query suffix. Used to avoid collision with other widget queries.
         * @param {string} [to=none] Sets a variable that will get the iso formatted value of the first input
         * @param {string} [from=none] Sets a variable that will get the iso formatted value of the second input
         *
         * @description
         * The odsDateRangeSlider widget displays a range slider to select the two bounds of a date range.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="ctx"
         *              ctx-dataset="product-release-notes"
         *              ctx-domain="documentation-resources">
         *              <div class="ods-box" ng-init="obj = {}">
         *                  <ods-date-range-slider context="ctx"
         *                      date-format="YYYY"
         *                      precision="year"
         *                      initial-from="2019/01/01"
         *                      initial-to="2019/12/31"
         *                      start-bound="'2010/01/01'"
         *                      end-bound="'2020/03/30'"
         *                      from="obj.from"
         *                      to="obj.to">
         *                  </ods-date-range-slider>
         *                  <br/>
         *                  <p>
         *                      {{ obj.from }} -- {{ obj.to }}
         *                  </p>
         *              </div>
         *              <ods-table context="ctx"></ods-table>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         *
         */
        var ionRangesliderOptions = {
            type: "double",
            grid: true,
            skin: "flat",
        };

        var ODSDateFormats = {
            year: 'YYYY',
            month: 'YYYY-MM',
            day: 'YYYY-MM-DD',
        };

        var forceDayStart = function (date) {
            return date.startOf('day');
        }

        var computeDate = function (value) {
            var parsedDate;
            if (value === 'yesterday') {
                return forceDayStart(moment.utc().subtract('days', 1));
            } else if (value === 'now') {
                return forceDayStart(moment.utc());
            } else if (angular.isString(value)) {
                // when parsing a date string that is not in ISO 8601, moment.js fallback to browser Date parsing implementation.
                // YYYY format is not standard ISO format so we try this format explicitely before letting moment.js try other formats
                parsedDate = moment.utc(value, ["YYYY"], true);
                if (!parsedDate.isValid()) {
                    // otherwise we let moment try by itself
                    parsedDate = moment.utc(value);
                }
                return forceDayStart(parsedDate);
            } else if (value instanceof Date) {
                return forceDayStart(moment.utc(value));
            } else if (value instanceof moment) {
                return forceDayStart(value);
            } else {
                return null;
            }
        }

        var uniqueId = 0;

        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',

                dateField: '@?',

                initialFrom: '@?',
                initialTo: '@?',

                startBound: '=',
                endBound: '=',

                dateFormat: '@?',
                suffix: '@?',

                precision: '@?',

                to: '=?',
                from: '=?'
            },
            template: '' +
                '<div class="odswidget odswidget-date-range-slider odswidget-date-range-slider-{{ uniqueId }}">' +
                '    <input type="hidden" value="" />' +
                '</div>',
            link: function (scope, element, attrs) {
                //scope.uniqueId = 'date-range-slider-' + Math.random().toString(36).substring(7);
                scope.uniqueId = uniqueId++;

                scope.precisionClean = ["day", "month", "year"].indexOf(scope.precision) >= 0 ? scope.precision : 'day';

                /* get closest divider that returns an integer, needed for a correct legend */
                var _getclosestdivider = function (rangesize, start, limitincr) {
                    var divider = start;
                    var incr = 0;
                    var findmore = false;
                    var findless = false;
                    do {
                        if (rangesize % (divider + incr) === 0 || Number.isInteger(rangesize / (divider + incr))) { // n -> n+1 -> n+2 -> n+3 etc...
                            findmore = true;
                            divider = divider + incr;
                        } else if (rangesize % (divider + incr * -1) === 0 || Number.isInteger(rangesize / (divider + incr * -1))) { // n -> n-1 -> n-2 -> n-3 etc...
                            findless = true;
                            divider = divider - incr;
                        } else
                            incr = incr + 1;
                    } while (!findmore && !findless && incr <= limitincr);

                    return [rangesize, divider];
                };

                /* grid_snap mode suits year and month dispaly, but day display must have a custom legend settings
                We get the jquery.width() and estimate the number of items in the legend */
                var computeRangeSizeAndGridSettings = function (min, max, widgetWidth) {
                    var rangesize = computeDate(max).diff(computeDate(min), scope.precisionClean);

                    if (scope.precisionClean === 'day') {
                        if (widgetWidth < 150) {
                            return [rangesize, 1];
                        } else if (widgetWidth < 350) {
                            return [rangesize, 3];
                        } else if (widgetWidth < 500) {
                            return _getclosestdivider(rangesize, 5, 2);
                        } else {
                            return _getclosestdivider(rangesize, 8, 4);
                        }
                    } else {
                        return [rangesize, null];
                    }
                };

                var input = element.find('input');

                var tmp_rangesetting = computeRangeSizeAndGridSettings(scope.startBound, scope.endBound, 0); // we don't know the width yet (not before rendering the widget)
                scope.rangesize = tmp_rangesetting[0];
                scope.gridsetting = tmp_rangesetting[1];

                scope.dateFormat = scope.dateFormat || (scope.precisionClean === 'day' ? "LL" : null || scope.precisionClean === 'month' ? "MMMM YYYY" : null || scope.precisionClean === 'year' ? 'YYYY' : null);
                // LL = Locale date format, ex: February 8, 2019
                // If no date format, and a different date precision

                var formattedSuffix = angular.isDefined(scope.suffix) ? ('.' + scope.suffix) : '';

                var getParameterName = function (context) {
                    var parameterName = attrs[context.name + "ParameterName"] || 'q';
                    if (['q', 'rq'].indexOf(parameterName) > -1) {
                        // Naming the parameter to prevent overwriting between widgets
                        parameterName = parameterName + '.rangeslider' + formattedSuffix;
                    }
                    return parameterName;
                };
                var parameterValue;
                if (angular.isArray(scope.context)) {
                    parameterValue = scope.context[0].parameters[getParameterName(scope.context[0])];
                } else {
                    parameterValue = scope.context.parameters[getParameterName(scope.context)];
                }
                if (angular.isDefined(parameterValue)) {
                    var parsedRange = odsTimerangeParser(parameterValue);
                    if (parsedRange.field === scope.dateField) {
                        scope.initialFrom = parsedRange.from;
                        scope.initialTo = parsedRange.to;
                    }
                }

                var intToDate = function (value) {
                    var d = computeDate(scope.startBound).add(value, scope.precisionClean);
                    return d.format(scope.dateFormat);
                }

                var ionRangesliderSettings = {
                    min: 0,
                    max: scope.rangesize,
                    grid_snap: true,
                    from: angular.isDefined(scope.initialFrom) ? computeDate(scope.initialFrom).diff(computeDate(scope.startBound), scope.precisionClean) : null,
                    to: angular.isDefined(scope.initialTo) ? computeDate(scope.initialTo).diff(computeDate(scope.startBound), scope.precisionClean) : null,
                    prettify: intToDate,
                    onStart: function (data) {
                        scope.$applyAsync(function () {
                            scope.from = computeDate(scope.startBound).add(data.from, scope.precisionClean).format(ODSDateFormats[scope.precisionClean]);
                            scope.to = computeDate(scope.startBound).add(data.to, scope.precisionClean).format(ODSDateFormats[scope.precisionClean]);
                        });
                    },
                    onFinish: function (data) {
                        scope.$applyAsync(function () {
                            scope.from = computeDate(scope.startBound).add(data.from, scope.precisionClean).format(ODSDateFormats[scope.precisionClean]);
                            scope.to = computeDate(scope.startBound).add(data.to, scope.precisionClean).format(ODSDateFormats[scope.precisionClean]);
                        });
                    }
                }
                // Init plugin
                ModuleLazyLoader('ion.rangeSlider').then(function () {
                    scope.rangeslider = jQuery(input).ionRangeSlider(angular.extend(
                        ionRangesliderSettings, ionRangesliderOptions));
                    scope.slider_instance = scope.rangeslider.data("ionRangeSlider");
                    var tmp_rangesetting = computeRangeSizeAndGridSettings(scope.startBound, scope.endBound, scope.rangeslider.parent().width());
                    scope.rangesize = tmp_rangesetting[0];
                    scope.gridsetting = tmp_rangesetting[1];
                    scope.slider_instance.update({
                        grid_num: (scope.gridsetting ? scope.gridsetting : null),
                        grid_snap: !scope.gridsetting
                    });
                });

                var contexts = [],
                    conf = {};

                // We need to gather the time field before applying our filter
                var getDateField = function (context) {
                    if (context.type === 'catalog')
                        return 'modified';
                    if (context) {
                        var fields = context.fields.filter(function (item) {
                            return item.type === 'date';
                        });
                        if (fields.length > 1) {
                            console.warn('Warning: the dataset "' + context.getUniqueId() + '" has more than one date field, the first date field will be used. You can specify the field to use using the "time-field" parameter.');
                        }
                        if (fields.length === 0) {
                            console.warn('Error: the dataset "' + context.getUniqueId() + '" doesn\'t have any date field, which is required for the Rangeslider widget.');
                        }
                        return fields[0].name;
                    }
                    return null;
                };

                var getDiffWithMin = function (date) {
                    return computeDate(date).diff(computeDate(scope.startBound), scope.precisionClean);
                };

                if (!angular.isArray(scope.context)) {
                    contexts.push(scope.context);
                    conf[scope.context.name] = {};
                    if (scope.dateField) {
                        conf[scope.context.name]['dateField'] = scope.dateField;
                    }
                } else {
                    contexts = scope.context;
                }

                angular.forEach(contexts, function (context) {
                    conf[context.name] = {
                        datefield: conf[scope.context.name] && conf[scope.context.name]['dateField'] ? conf[scope.context.name]['dateField'] : null,
                        formatter: $parse("$field + ':[' + $from + ' TO ' + $to + ']'"),
                        // formatter: $parse("$field"),
                        parameter: "q.daterangeslider",
                    };

                    if (angular.isDefined(attrs[context.name + "DateField"])) {
                        conf[context.name]['datefield'] = attrs[context.name + "DateField"];
                    }
                });

                var updateContexts = function(contexts, configurations) {
                    angular.forEach(contexts, function (context) {
                        if (scope.to && scope.from) {
                            var parameterName = configurations[context.name]['parameter'];
                            var evaluationScope = {};
                            evaluationScope.$to = scope.to;
                            evaluationScope.$from = scope.from;
                            evaluationScope.$field = configurations[context.name]['datefield'];
                            if (formattedSuffix)
                                parameterName = parameterName + formattedSuffix;
                            context.parameters[parameterName] = configurations[context.name]['formatter'](evaluationScope);
                        }
                    });
                }

                var react = function (contexts, configurations) {
                    scope.$watch('[from, to]', function (nv, ov) {
                        if ((nv[0] && nv[1]) && (nv.join("") != ov.join(""))) {
                            if (moment(scope.from).isAfter(scope.to)) {
                                console.warn('Warning: [ods-date-range-slider-' + scope.uniqueId + ']: trying to set a "from" after the "to" parameter that is impossible, therefore "to" takes "from" value also.');
                                scope.to = scope.from;
                            }
                            updateContexts(contexts, configurations);

                            if (scope.rangeslider) {
                                //var slider_instance = scope.rangeslider.data("ionRangeSlider");
                                var fromvalue = getDiffWithMin(scope.from);
                                var tovalue = getDiffWithMin(scope.to);
                                /* Here we update the slider if the changes come from the from and to variable parameter of the widget.
                                  If the changes are coming from the slider itself, it will trigger the watch, but it's useless, so we can skip
                                */
                                if (scope.slider_instance.result.from != fromvalue || scope.slider_instance.result.to != tovalue)
                                    scope.slider_instance.update({
                                        from: fromvalue,
                                        to: tovalue,
                                    });
                            }
                        }

                    }, true);

                    scope.$watch('[startBound, endBound]', function (nv, ov) {
                        if ((nv[0] && nv[1]) && (nv.join("") != ov.join(""))) {
                            var tmp_rangesetting = computeRangeSizeAndGridSettings(scope.startBound, scope.endBound);
                            scope.rangesize = tmp_rangesetting[0];
                            scope.gridsetting = tmp_rangesetting[1];

                            if (scope.rangeslider && (scope.from || scope.to)) {
                                //var slider_instance = scope.rangeslider.data("ionRangeSlider");
                                scope.slider_instance.update({
                                    max: scope.rangesize,
                                    grid_snap: true,
                                    from: getDiffWithMin(scope.from),
                                    to: getDiffWithMin(scope.to)
                                });
                            }
                        }
                    }, true);
                };

                // Go over contexts, set date field for catalogs
                contexts.map(function (context) {
                    if (context.type === 'catalog') {
                        conf[context.name]['datefield'] = getDateField(context);
                        //react(contexts, conf);
                        // react set the watchers, but for the very first init. we must set the from and to on the context
                        //updateContexts(contexts, conf);
                    }
                });

                // Go over contexts, set date field for datasets
                $q.all(contexts.map(function (context) {
                    if (context.type === 'dataset') {
                        return context.wait().then(function (dataset) {
                            if (conf[context.name]['datefield'] === null) {
                                conf[context.name]['datefield'] = getDateField(dataset);
                            }
                        });
                    }
                })).then(function () {
                    react(contexts, conf);
                    // react set the watchers, but for the very first init. we must set the from and to on the context
                    updateContexts(contexts, conf);
                });
            },
            controller: ['$scope', '$attrs', function ($scope, $attrs) {

            }]
        };
    }]);

}());
