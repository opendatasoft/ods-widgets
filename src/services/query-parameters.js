(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    mod.service('QueryParameters', [function() {
        return [
            'q.timerange',
            'q.timescale',
            'q.calendar_bounds',
            'q.geographic_area',
            'q.mapfilter',
            'q.to_date',
            'q.from_date',
            'geofilter.distance',
            'geofilter.polygon'
        ];
    }]);
}());