(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.service('I18n', ['translate', function(translate_time) {
        return {
            weekdays: {
                shorthand: [
                    translate_time('Sun'),
                    translate_time('Mon'),
                    translate_time('Tue'),
                    translate_time('Wed'),
                    translate_time('Thu'),
                    translate_time('Fri'),
                    translate_time('Sat')
                ],
                longhand: [
                    translate_time('Sunday'),
                    translate_time('Monday'),
                    translate_time('Tuesday'),
                    translate_time('Wednesday'),
                    translate_time('Thursday'),
                    translate_time('Friday'),
                    translate_time('Saturday')
                ]
            },
            months: {
                shorthand: [
                    translate_time('Jan'),
                    translate_time('Feb'),
                    translate_time('Mar'),
                    translate_time('Apr'),
                    translate_time('May'),
                    translate_time('Jun'),
                    translate_time('Jul'),
                    translate_time('Aug'),
                    translate_time('Sep'),
                    translate_time('Oct'),
                    translate_time('Nov'),
                    translate_time('Dec')
                ],
                longhand: [
                    translate_time('January'),
                    translate_time('February'),
                    translate_time('March'),
                    translate_time('April'),
                    translate_time('May'),
                    translate_time('June'),
                    translate_time('July'),
                    translate_time('August'),
                    translate_time('September'),
                    translate_time('October'),
                    translate_time('November'),
                    translate_time('December')
                ]
            },

            fr: {
                timeFormat: 'HH:mm',
                timeSeparators: [':'],
                dateFormat: 'DD/MM/YYYY',
                dateSeparators: ['/'],
                firstDayOfWeek: 1
            },
            en: {
                timeFormat: 'hh:mm A',
                timeSeparators: [':', ' '],
                dateFormat: 'MM/DD/YYYY',
                dateSeparators: ['/'],
                firstDayOfWeek: 0
            }
        };
    }]);
}());