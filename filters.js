(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.filter('nofollow', function() {
        return function(value) {
            if (angular.isString(value)) {
                return value.replace(/<a href="/g, '<a target="_blank" rel="nofollow" href="');
            } else {
                return value;
            }
        };
    });

    mod.filter('prettyText', ['$filter', function($filter) {
        /**
         * Prepares a text value to be displayed
         */
        var re = /[<>]+/;
        // I stole this part from angular-sanitize
        var NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;
        function encodeEntities(value) {
          return value.
            replace(/&/g, '&amp;').
            replace(NON_ALPHANUMERIC_REGEXP, function(value){
              return '&#' + value.charCodeAt(0) + ';';
            }).
            replace(/</g, '&lt;').
            replace(/>/g, '&gt;');
        }

        return function(value) {
            if (!value || !angular.isString(value)) {
                return value;
            }
            if (re.test(value)) {
                return encodeEntities(value);
            } else {
                return $filter('linky')(value, '_blank');
            }
        };
    }]);

    mod.filter('imagify', ['$sce', function($sce) {
        var re = /^(http(?:s?):\/\/[^;,]*(?:jpg|jpeg|png|gif))(?:$|\?.*|;|,|&)/i;
        return function(value) {
            if (angular.isString(value)) {
                value = value.trim();
                var match = re.exec(value);
                if (match !== null) {
                    // It looks like an image
                    return $sce.trustAsHtml('<img class="imagify" src="' + match[1] + '" />');
                }
            }
            return value;
        };
    }]);

    mod.filter('isDefined', function() {
        return function(value) {
            return angular.isDefined(value);
        };
    });

    mod.filter('displayImageValue', function($sce) {
        return function(value, datasetid) {
            if (!value) {
                return value;
            }
            var url = '/explore/dataset/'+datasetid+'/images/'+value.id+'/300/';

            return $sce.trustAsHtml('<img class="imagify" src="' + url + '" />');
        };
    });

    mod.filter('fieldsForVisualization', function() {
        var blacklist = {
            'table': ['image'],
            'map': ['geo_point_2d', 'geo_shape'],
            'images': ['image']
        };
        return function(fields, viz) {
            if (angular.isUndefined(fields)) { return fields; }
            if (angular.isUndefined(blacklist[viz])) {
                throw 'Unknown visualization type "' + viz + "'";
            }
            return fields.filter(function(field) { return blacklist[viz].indexOf(field.type) === -1; });
        };
    });

    mod.filter('formatFieldValue', ['$filter', function($filter) {
        var getPrecision = function(field) {
            if (field.annotations) {
                var annos = field.annotations.filter(function(anno) { return anno.name === 'timeserie_precision'; });
                if (annos.length > 0) {
                    return annos[0].args[0];
                }
            }
            return null;
        };

        return function(record, field) {

            var value = record[field.name];
            if (value === null || value === undefined) {
                return '';
            }
            if (field.type === 'int' || field.type === 'double') {
                var unit = '';
                if (field.annotations) {
                    for (var a=0; a<field.annotations.length; a++) {
                        if (field.annotations[a].name === 'unit') {
                            unit = ' ' + field.annotations[a].args[0];
                        }
                    }
                }
                return $filter('number')(value) + unit;
            } else if (field.type === 'geo_point_2d') {
                return value[0] + ', ' + value[1];
            } else if (field.type === 'geo_shape') {
                return angular.toJson(value);
            } else if (field.type === 'date') {
                var precision = getPrecision(field);
                if (precision === 'year') {
                    return $filter('moment')(value, 'YYYY');
                } else if (precision === 'month') {
                    return $filter('capitalize')($filter('moment')(value, 'MMMM YYYY'));
                }
                return $filter('moment')(value, 'LL');
            } else if (field.type === 'datetime') {
                if (value.length === 19) {
                    // Fix for legacy timestamps that don't have a timezone
                    value += 'Z';
                }
                return $filter('moment')(value, 'LLL');
            } else {
                return ''+value;
            }
        };
    }]);

    mod.filter('truncate', function() {
        return function(text, length) {
            if (!text || !angular.isString(text)) {
                return text;
            }
            if (!length) {
                length = 200;
            }
            return text.substring(0, length);
        };
    });

    mod.filter('fieldsFilter', function(){
        return function(fields, config){
            if (!fields) {
                return fields;
            }
            if(angular.isArray(config) && config.length) {
                var output = [];
                angular.forEach(config, function(fieldName){
                    var field = $.grep(fields, function(field){ return field.name === fieldName; })[0];
                    if (angular.isDefined(field)) {
                        output.push(field);
                    }
                });
                return output;
            }
            return fields;
        };
    });

    mod.filter('moment', [function() {
        return function(isoDate, format) {
            if (isoDate)
                return moment(isoDate).format(format);
        };
    }]);

    mod.filter('timesince', [function() {
        return function(isoDate) {
            if (isoDate)
                return moment(isoDate).fromNow();
        };
    }]);

}());