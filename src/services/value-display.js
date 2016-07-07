(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.service('ValueDisplay', ['$filter', 'translate', function($filter, translate) {
        var valueFormatters = {
            'language': function(value) {
                return $filter('isocode_to_language')(value);
            },
            'visualization': function(value) {
                switch (value) {
                    case 'analyze':
                        return '<i class="odswidget-facet__value-icon fa fa-bar-chart"></i> ' + translate('Analyze');
                    case 'calendar':
                        return '<i class="odswidget-facet__value-icon fa fa-calendar"></i> ' + translate('Calendar');
                    case 'geo':
                        return '<i class="odswidget-facet__value-icon fa fa-globe"></i> ' + translate('Map');
                    case 'image':
                        return '<i class="odswidget-facet__value-icon fa fa-picture-o"></i> ' + translate('Image');
                    case 'api':
                        return '<i class="odswidget-facet__value-icon fa fa-cogs"></i> ' + translate('API');
                    default:
                        return value;

                }
            },
            'date': function(value, path) {
                if (path.match(/^[0-9]{4}\/[0-9]{2}$/)) {
                    return ODS.StringUtils.capitalize(moment.months()[parseInt(value, 10)-1]);
                }
                return value;
            }
        };

        return {
            format: function(value, valueType, path) {
                if (angular.isDefined(valueFormatters)) {
                    return valueFormatters[valueType](value, path);
                }
                console.log('Warning (ValueDisplay): unknown value formatter "'+valueType+'"');
                return value;
            }
        };
    }]);
}());