(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('odsTimerangeParser', function () {
        var parameterRE = /([\w-]+):\[(.*) TO (.*)\]/;

        return function (parameterValue) {
            var matches = parameterRE.exec(decodeURIComponent(parameterValue));

            if (!matches) {
                return {};
            }

            return {
                field: matches[1],
                from: matches[2],
                to: matches[3]
            };
        };
    });

    mod.factory('odsTimeboundParser', function () {
        var parameterRE = /([\w]+)(<|>)="(.*)"/;

        return function (parameterValue) {
            var matches = parameterRE.exec(decodeURIComponent(parameterValue));

            if (!matches) {
                return {};
            }

            return {
                field: matches[1],
                date: matches[3]
            };
        };
    });

    mod.factory('odsTimescaleParser', ['translate', function (translate) {
        var parameterRE = /([\w-]+)>=#now\((.*)=-(\w)\)/;

        var scaleLabels = {
            'years': {'1': translate('Last 12 months')},
            'weeks': {
                '1': translate('Last 7 days'),
                '4': translate('Last 4 weeks')
            },
            'days': {'1': translate('Last 24 hours')}
        };

        return function (parameterValue) {
            var matches = parameterRE.exec(decodeURIComponent(parameterValue));

            if (!matches) {
                return {};
            }

            return {
                field: matches[1],
                scaleLabel: scaleLabels[matches[2]][matches[3]]
            };
        };
    }]);
}());
