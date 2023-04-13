(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    function v1PolygonToWkt(v1Polygon) {
        /*
        Transforms a polygon written for a geofilter.polygon function in API V1, to a WKT polygon understable by
        API V2.
         */
        // Example of a V1 polygon:
        // (43.474249352607615,-0.164794921875),(44.18161305421135,-0.164794921875),(44.18161305421135,1.47491455078125),(43.474249352607615,1.47491455078125),(43.474249352607615,-0.164794921875)
        var wkt = 'POLYGON((';
        var points = v1Polygon.split('),(');
        points.forEach(function(v1Point, index) {
            if (index) {
                wkt += ', ';
            }
            var cleanPoint = v1Point.replace(')', '').replace('(', '');
            var coords = cleanPoint.split(',');
            wkt += coords[1] + ' ' + coords[0];
        });
        wkt += '))';
        return wkt;
    }

    mod.service('APIParamsV1ToV2', function () {
        return function(paramsV1, fieldsV1) {
            var paramsV2 = {};
            if (!paramsV1) {
                return paramsV2;
            }

            var qClauses = [];
            var whereClauses = [];

            angular.forEach(paramsV1, function (paramValue, paramName) {
                if (paramValue === null || typeof(paramValue) === "undefined") {
                    // Not a real value to translate
                    return;
                }

                // We can have `q`, and `q.<text>` parameters.
                if ((paramName === 'q' || paramName.startsWith('q.')) && paramValue) {
                    qClauses.push(paramValue);
                }

                /*
                Refine and exclude parameters are direct mirrors of each others.
                However, disjunctive is different: in V1, it was a specific parameter (`disjunctive.<name>=true`),
                but in V2, the disjunctive behavior is triggered by the `disjunctive` annotation on the field itself,
                configured by the publisher in the Back-office.
                This means that currently, a facet will always be disjunctive or not, based on its dataset configuration,
                and there is no way to change that in a query.
                 */

                if (paramName.startsWith('refine.')) {
                    paramsV2.refine = paramsV2.refine || [];
                    if (!angular.isArray(paramValue)) {
                        paramValue = [paramValue];
                    }
                    angular.forEach(paramValue, function(value) {
                        paramsV2.refine.push(paramName.substring(7) + ':"' + value + '"');
                    });
                }

                if (paramName.startsWith('exclude.')) {
                    paramsV2.exclude = paramsV2.exclude || [];
                    if (!angular.isArray(paramValue)) {
                        paramValue = [paramValue];
                    }
                    angular.forEach(paramValue, function(value) {
                        paramsV2.exclude.push(paramName.substring(8) + ':"' + value + '"');
                    });
                }

                // Note: At this point in time, we only need to support the disjunctive parameter of facets; facet sorts,
                // hierarchical, separator and so on would only be used if we had a widget that displayed facets values
                // from the API v2.
                if (paramName.startsWith('disjunctive.')) {
                    if (paramValue) {
                        paramsV2.facet = paramsV2.facet || [];

                        var facetName = paramName.substring(12);

                        paramsV2.facet.push('facet(name="' + facetName + '", disjunctive=true)');
                    }
                }

                if (paramName === 'timezone' && paramValue) {
                    paramsV2.timezone = paramValue;
                }

                if (fieldsV1) {
                    var geoShape = fieldsV1.find(function(f) { return f.type === 'geo_shape'; });
                    var geoPoint = fieldsV1.find(function(f) { return f.type === 'geo_point_2d'; });

                    if (geoPoint && paramName === 'geofilter.distance') {
                        var distanceElements = paramValue.split(',');
                        whereClauses.push("distance(`" + geoPoint.name + "`, geom'POINT(" + distanceElements[1] + " " + distanceElements[0] + ")', " + distanceElements[2] + "m)");
                    }

                    if ((geoPoint || geoShape) && paramName === 'geofilter.polygon') {
                        // Use the best field available (geo_shape is more precise that geo_point_2d, for a shape dataset)
                        whereClauses.push("geometry(`" + (geoShape || geoPoint).name + "`, geom'"+v1PolygonToWkt(paramValue)+"')");
                    }
                }

            });

            if (qClauses.length) {
                paramsV2.qv1 = '(' + qClauses.join(') AND (') + ')';
            }

            if (whereClauses.length) {
                paramsV2.where = whereClauses.reduce(function(previous, current) {
                    var next = '';
                    if (previous) {
                        next += ' AND ';
                    } else {
                        next += '(' + current + ')';
                    }
                    return next;
                }, null);
            }

            return paramsV2;
        }
    });
}());
