(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.service('ValueDisplay', ['$filter', 'translate', 'ODSWidgetsConfig', '$sce', function($filter, translate, ODSWidgetsConfig, $sce) {
        var valueFormatters = {
            'language': function(value) {
                return $filter('isocode_to_language')(ODS.StringUtils.escapeHTML(value));
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
                    case 'custom_view':
                        return '<i class="odswidget-facet__value-icon fa fa-' + ODSWidgetsConfig.defaultCustomViewConfig.icon
                            + '"></i> ' + ODS.StringUtils.escapeHTML(ODSWidgetsConfig.defaultCustomViewConfig.title);
                    default:
                        return ODS.StringUtils.escapeHTML(value);
                }
            },
            'date': function(value, path) {
                if (path.match(/^[0-9]{4}\/[0-9]{2}$/)) {
                    return ODS.StringUtils.capitalize(moment.months()[parseInt(value, 10)-1]);
                }
                return ODS.StringUtils.escapeHTML(value);
            },
            'boolean': function(value) {
                switch (value) {
                    case 'false':
                        return ODS.StringUtils.capitalize(translate('No'));
                    case 'true':
                        return ODS.StringUtils.capitalize(translate('Yes'));
                }

            }
        };

        return {
            format: function(value, valueType, path) {
                if (angular.isDefined(valueFormatters)) {
                    return valueFormatters[valueType](value, path);
                }
                console.log('Warning (ValueDisplay): unknown value formatter "'+valueType+'"');
                return $sce.trustAsHtml(value);
            }
        };
    }]);
}());
