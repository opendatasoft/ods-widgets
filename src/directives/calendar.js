(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCalendar', ['ODSAPI', 'ModuleLazyLoader', 'ODSWidgetsConfig', '$compile', 'URLSynchronizer',
        function (ODSAPI, ModuleLazyLoader, ODSWidgetsConfig, $compile, URLSynchronizer) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCalendar
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} startField The name of the datetime field to use as event start datetime
         * @param {string} endField The name of the datetime field to use as event end datetime
         * @param {string} titleField The name of the text field to use as event title
         * @param {string} [eventColor=#C32D1C] The color (in hexadecimal form) used for all events
         * @param {string} [tooltipFields=none] An ordered, comma-separated list of fields to display in the event
         * tooltip
         * @param {string} [calendarView=month] The default mode for the calendar. The authorized values are 'month', 'agendaWeek', and
         * 'agendaDay'.
         * @param {string} [availableCalendarViews='month','agendaWeek','agendaDay'] A comma-separated list of available
         * views for the calendar. It must be a sub list of ['month', 'agendaWeek', 'agendaDay'].
         * @param {boolean} [syncToUrl] When set to `true`, it persists the `calendarView` in the page URL.
         * @description
         * The odsCalendar widget can take any dataset containing at least two datetime fields and a text field and use it to
         * display a calendar. It can load at most 1000 events (records) at once.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *              <ods-dataset-context context="events"
         *                                   events-domain="https://documentation-resources.opendatasoft.com/"
         *                                   events-dataset="evenements-publics-openagenda-extract">
         *                  <ods-calendar context="events"
         *                                start-field="date_debut"
         *                                end-field="date_de_fin"
         *                                title-field="titre"
         *                                event-color="#333"
         *                                tooltip-fields="image, latlon, lien, description"></ods-calendar>
         *              </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                startField: '@?',
                endField: '@?',
                titleField: '@?',
                tooltipFields: '@?',
                eventColor: '@?',
                calendarView: '@?',
                availableCalendarViews: '@?',
                syncToUrl: '@'
            },
            require: '?refineOnClick',
            replace: true,
            template: ''+
            '<div class="odswidget-calendar">' +
            '    <div class="odswidget-calendar__fullcalendar"></div>'+
            '    <div class="odswidget-calendar__tooltip"></div>'+
            '    <div class="odswidget-calendar__loading-backdrop">' +
            '        <ods-spinner class="odswidget-calendar__loading-wheel"></ods-spinner>'+
            '    </div>'+
            '</div>',
            controller: ['$scope', function ($scope) {
                if ($scope.syncToUrl !== 'false') {
                    URLSynchronizer.addSynchronizedValue($scope, 'calendarView', 'calendarview');
                }
            }],
            link: function (scope, element, attrs, refineOnClickCtrl) {
                var updateCalendarView = function () {
                    var currentView = scope.fullcalendar.fullCalendar('getView');
                    if (currentView.name != scope.calendarView) {
                        scope.calendarView = currentView.name;
                    }
                };
                var setupCalendar = function () {
                    // check directive params and fallback to metas if they are not set
                    var visualization_metas = {};
                    if (scope.context.dataset &&
                        scope.context.dataset.extra_metas &&
                        scope.context.dataset.extra_metas.visualization) {
                        visualization_metas = scope.context.dataset.extra_metas.visualization;
                    }
                    if (!angular.isDefined(scope.startField)) {
                        scope.startField = visualization_metas.calendar_event_start;
                    }

                    if (!angular.isDefined(scope.endField)) {
                        scope.endField = visualization_metas.calendar_event_end;
                    }

                    if (!angular.isDefined(scope.titleField)) {
                        scope.titleField = visualization_metas.calendar_event_title;
                    }

                    if (!angular.isDefined(scope.eventColor)) {
                        if (visualization_metas.calendar_event_color) {
                            scope.eventColor = visualization_metas.calendar_event_color;
                        } else {
                            scope.eventColor = '#C32D1C';
                        }
                    }
                    if (!angular.isDefined(scope.availableCalendarViews)) {
                        if (visualization_metas.calendar_available_views) {
                            scope.availableCalendarViews = visualization_metas.calendar_available_views.split(/\s*,\s*/);
                        } else {
                            scope.availableCalendarViews = ['month', 'agendaWeek', 'agendaDay'];
                        }
                    } else {
                        scope.availableCalendarViews = scope.availableCalendarViews.split(/\s*,\s*/);
                    }
                    if (!angular.isDefined(scope.calendarView)) {
                        if (visualization_metas.calendar_default_view &&
                            scope.availableCalendarViews.indexOf(visualization_metas.calendar_default_view) > -1) {
                            scope.calendarView = visualization_metas.calendar_default_view;
                        } else {
                            scope.calendarView = scope.availableCalendarViews[0];
                        }
                    } else if (scope.availableCalendarViews.indexOf(scope.calendarView) === -1) {
                        scope.calendarView = scope.availableCalendarViews[0];
                    }

                    if (angular.isDefined(scope.tooltipFields)) {
                        var tooltipFields = [];
                        angular.forEach(scope.tooltipFields.split(','), function (fieldName) {
                            tooltipFields.push(fieldName.trim());
                        });
                        scope.tooltipFields = tooltipFields;
                    } else if (visualization_metas.calendar_tooltip_fields) {
                        scope.tooltipFields = visualization_metas.calendar_tooltip_fields;
                    } else {
                        scope.tooltipFields = [];
                    }

                    // actual calendar setup
                    scope.tooltip = jQuery(element).children('.odswidget-calendar__tooltip').first()
                        .qtip({
                            content: {
                                text: '',
                                button: true // close tooltip upon click
                            },
                            position: {
                                my: 'bottom center',
                                at: 'top center',
                                target: 'mouse',
                                viewport: jQuery('.odswidget-calendar__fullcalendar'),
                                adjust: {
                                    mouse: false,
                                    scroll: false
                                }
                            },
                            show: false,
                            hide: false,
                            style: {
                                classes: 'odswidget-calendar__tooltip odswidget-calendar__tooltip--increase-precedence'
                            }
                        })
                        .qtip('api');

                    // hide tooltip for any click not directed at a calendar object
                    jQuery(document).on('click', function (event) {
                        if (!jQuery(event.target).parents('.fc-event').length &&
                            !jQuery(event.target).parents('.odswidget-calendar__tooltip').length) {
                            hideTooltip();
                        }
                    });

                    scope.fullcalendar = jQuery(element).children('.odswidget-calendar__fullcalendar').first();
                    scope.fullcalendar.fullCalendar({
                        lazyFetching: false,
                        header: {
                            left: jQuery(element).css('direction') === 'rtl' ? 'nextYear,next,prev,prevYear, today' : 'prevYear,prev,next,nextYear, today',
                            center: 'title',
                            right: scope.availableCalendarViews.join(',')
                        },
                        lang: ODSWidgetsConfig.language,
                        loading: toggleLoadingWheel,
                        editable: true,
                        eventLimit: true, // allow "more" link when too many events
                        events: calendarDataSource,
                        eventDataTransform: buildEventFromRecord,
                        eventColor: scope.eventColor,
                        defaultView: scope.calendarView,
                        eventClick: function(data, event) {
                            if (refineOnClickCtrl) {
                                refineOnClickCtrl.refineOnRecord(data.record);
                            }
                            hideTooltip();
                            scope.tooltip
                                .set({
                                    'content.text': data.buildTooltipContent(),
                                    'position.target': [event.pageX, event.pageY]
                                })
                                .reposition(event)
                                .show(event);
                        }
                    });
                };

                var hideTooltip = function () {
                    jQuery('.odswidget-calendar__tooltip').hide();
                };

                var updateCalendar = function () {
                    scope.fullcalendar.fullCalendar('refetchEvents');
                };

                var toggleLoadingWheel = function (isLoading) {
                    if (isLoading) {
                        jQuery('.odswidget-calendar__loading-backdrop').show();
                    } else {
                        jQuery('.odswidget-calendar__loading-backdrop').hide();
                    }
                };

                var search = ODSAPI.uniqueCall(ODSAPI.records.search);
                var calendarDataSource = function (start, end, timezone, callback) {
                    updateCalendarView();
                    search(scope.context, getSearchOptions(start, end)).
                        then(function (response) {
                            var data = response.data;
                            callback(data.records);
                        });
                };

                var buildEventFromRecord = function (record) {
                    var end;
                    // fullcalendar does not handle full day event correctly (misses 1 day) so we need to add to day
                    // to the event to render it correctly
                    if (scope.context.dataset.getField(scope.endField).type === "date") {
                        end = moment(record.fields[scope.endField]).add(1, "day").format('YYYY-MM-DD');
                    } else {
                        end = record.fields[scope.endField];
                    }
                    return {
                        title: record.fields[scope.titleField],
                        start: record.fields[scope.startField],
                        end: end,
                        buildTooltipContent: eventTooltipContentBuilder(record),
                        editable: false,
                        record: record
                    };
                };

                var eventTooltipContentBuilder = function (record) {
                    var buildTooltipContent = function () {
                        var newScope = scope.$new(true);
                        newScope.record = record;
                        newScope.dataset = scope.context.dataset;
                        newScope.ctx = scope.context;

                        newScope.domain = {
                            current_language: ODSWidgetsConfig.language
                        };

                        var content;
                        // FIXME: https://app.shortcut.com/opendatasoft/story/40502/xss-in-widgets-that-allow-custom-tooltips-maps-images-calendar
                        if (scope.context.dataset.extra_metas.visualization.calendar_tooltip_html_enabled && scope.context.dataset.extra_metas.visualization.calendar_tooltip_html) {
                            content = $compile('<div>' + scope.context.dataset.extra_metas.visualization.calendar_tooltip_html + '</div>')(newScope);
                        } else {
                            newScope.titleField = scope.titleField;
                            newScope.tooltipFields = scope.tooltipFields;
                            content = $compile('<ods-calendar-tooltip></ods-calendar-tooltip>')(newScope);
                        }
                        newScope.$apply();
                        return content;
                    };
                    return buildTooltipContent;
                };

                var getSearchOptions = function (start, end) {
                    // most basic options
                    var options = {
                        dataset: scope.context.dataset.datasetid,
                        rows: 1000
                    };
                    // apply common filters
                    options = jQuery.extend(options, scope.context.parameters);
                    // restrict to current view
                    var boundsQuery = [
                        scope.startField + '<' + end.format('YYYY-MM-DD'),
                        scope.endField + '>=' + start.format('YYYY-MM-DD')
                    ].join(' AND ');
                    options = jQuery.extend(options, {
                        'q.calendar_bounds': boundsQuery
                    });
                    return options;
                };

                ModuleLazyLoader('fullcalendar', 'qtip').then(function() {
                    scope.context.wait().then(function() {
                        setupCalendar();
                        // refresh data when context search parameters change
                        scope.$watch(function() {
                            // We don't want to include calendarview in the comparison, because when it changes,
                            // it already triggers a refresh via FullCalendar built-in mechanisms.
                            // We do an extend to do a shallow copy, to avoid a deep copy on every digest.
                            var params = angular.extend({}, scope.context.parameters);
                            delete params.calendarview;
                            return params;
                        }, function(nv, ov) {
                            if (nv !== ov) {
                                updateCalendar();
                            }
                        }, true);
                    });
                });

            }
        };
    }]);

    mod.directive('odsCalendarTooltip', function () {
        return {
            restrict: 'E',
            template: '' +
            '<h2 class="odswidget-calendar__tooltip-title">{{ record.fields[titleField] }}</h2>' +
            '<dl class="odswidget-calendar__tooltip-fields">' +
            '    <dt ng-repeat-start="field in dataset.fields|fieldsForVisualization:\'calendar\'|fieldsFilter:tooltipFields"' +
            '        ng-show="record.fields[field.name]|isDefined"' +
            '        class="odswidget-calendar__tooltip-field-name">' +
            '        {{ field.label }}' +
            '    </dt>' +
            '    <dd ng-repeat-end ng-switch="field.type" ng-show="record.fields[field.name]|isDefined">' +
            '        <debug data="record.fields[field.name]"></debug>' +
            '        <span ng-switch-when="geo_point_2d">' +
            '            <ods-geotooltip width="300" height="300" coords="record.fields[field.name]">'+
            '                {{ record.fields|formatFieldValue:field:ctx }}'+
            '            </ods-geotooltip>' +
            '        </span>' +
            '        <span ng-switch-when="geo_shape">' +
            '            <ods-geotooltip width="300" height="300" geojson="record.fields[field.name]">'+
            '                {{ record.fields|formatFieldValue:field:ctx }}'+
            '            </ods-geotooltip>' +
            '        </span>' +
            '        <span ng-switch-when="file">' +
            '            <div ng-if="!dataset.isFieldAnnotated(field, \'has_thumbnails\')"'+
            '                 ng-bind-html="record.fields|formatFieldValue:field:ctx"></div>' +
            '            <div ng-if="dataset.isFieldAnnotated(field, \'has_thumbnails\')"'+
            '                 ng-bind-html="record.fields[field.name]|displayImageValue:dataset.datasetid"'+
            '                 style="text-align: center;"></div>' +
            '        </span>' +
            '        <span ng-switch-default ' +
            '              title="{{record.fields|formatFieldValue:field:ctx}}" ' +
            '              ng-bind-html="record.fields|formatFieldValue:field:ctx|imagify|videoify|prettyText|nofollow">'+
            '        </span>' +
            '    </dd>' +
            '</dl>'
        };
    });
}());
