(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.service('I18n', ['translate', function(translate) {
        return {
            weekdays: {
                shorthand: [
                    translate('Sun'),
                    translate('Mon'),
                    translate('Tue'),
                    translate('Wed'),
                    translate('Thu'),
                    translate('Fri'),
                    translate('Sat')
                ],
                longhand: [
                    translate('Sunday'),
                    translate('Monday'),
                    translate('Tuesday'),
                    translate('Wednesday'),
                    translate('Thursday'),
                    translate('Friday'),
                    translate('Saturday')
                ]
            },
            months: {
                shorthand: [
                    translate('Jan'),
                    translate('Feb'),
                    translate('Mar'),
                    translate('Apr'),
                    translate('May'),
                    translate('Jun'),
                    translate('Jul'),
                    translate('Aug'),
                    translate('Sep'),
                    translate('Oct'),
                    translate('Nov'),
                    translate('Dec')
                ],
                longhand: [
                    translate('January'),
                    translate('February'),
                    translate('March'),
                    translate('April'),
                    translate('May'),
                    translate('June'),
                    translate('July'),
                    translate('August'),
                    translate('September'),
                    translate('October'),
                    translate('November'),
                    translate('December')
                ]
            },

            fr: {
                timeFormat: 'HH:mm',
                timeSeparators: [':'],
                dateFormat: 'DD/MM/YYYY',
                dateSeparators: ['/'],
                firstDayOfWeek: 1,
            },
            en: {
                timeFormat: 'hh:mm A',
                timeSeparators: [':', ' '],
                dateFormat: 'MM/DD/YYYY',
                dateSeparators: ['/'],
                firstDayOfWeek: 0,
            }
        };
    }]);
}());