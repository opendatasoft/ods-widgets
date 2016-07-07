(function(target) {
    var ODS = {
        Context: {
            toggleRefine: function(context, facetName, path, replace) {
                var refineKey = 'refine.'+facetName;
                if (angular.isDefined(context.parameters[refineKey])) {
                    // There is at least one refine already
                    var refines = angular.copy(context.parameters[refineKey]);
                    if (!angular.isArray(refines)) {
                        refines = [refines];
                    }

                    if (refines.indexOf(path) > -1) {
                        // Remove the refinement
                        refines.splice(refines.indexOf(path), 1);
                    } else {
                        // Activate
                        angular.forEach(refines, function(refine, idx) {
                            if (path.startsWith(refine+'/')) {
                                // This already active refine is less precise than the new one, we remove it
                                refines.splice(idx, 1);
                            } else if (refine.startsWith(path+'/')) {
                                // This already active refine is more precise than the new one, we remove it
                                refines.splice(idx, 1);
                            }
                        });
                        if (angular.isUndefined(replace) || replace === false) {
                            refines.push(path);
                        } else {
                            refines = [path];
                        }
                    }

                    if (refines.length === 0) {
                        delete context.parameters[refineKey];
                    } else {
                        context.parameters[refineKey] = refines;
                    }
                } else {
                    context.parameters[refineKey] = path;
                }
            }
        },
        GeoFilter: {
            /*
            Types of parameters:
                Bbox: Lat-SW,Lng-SW,Lat-NE,Lng-NE
                    e.g.: "43.14,12.62642,41.32,14.63"
                Polygon: a string of a list of lat,lng fit for geofilter.polygon
                    e.g.: "(48.92994318778139,2.1636199951171875),(48.92994318778139,2.5100326538085938),(48.79125929678568,2.5100326538085938),(48.79125929678568,2.1636199951171875)"
                Bounds: an object fit for leaflet's LatLngBounds objects, typically an array of arrays
                    e.g.: [ [43.14, 12.62642], [41.32, 14.63] ]
            */
            getBboxParameterAsBounds: function(bounds) {
                /*  Input: a Bbox
                    Output: a Bounds
                 */
                var members = bounds.split(',');
                return [
                    [ members[0], members[1] ],
                    [ members[2], members[3] ]
                ];
            },
            getBoundsAsBboxParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Bbox
                */
                if (angular.isArray(bounds)) {
                    return [ bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1] ].join(',');
                } else {
                    return [ bounds.getSouthWest().lat, bounds.getSouthWest().lng, bounds.getNorthEast().lat, bounds.getNorthEast().lng ].join(',');
                }
            },
            getBoundsAsPolygonParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Polygon
                */
                var leafletBounds;
                if (angular.isArray(bounds)) {
                    leafletBounds = new L.LatLngBounds(bounds);
                } else {
                    leafletBounds = bounds;
                }
                var polygon = [
                    [ leafletBounds.getNorthWest().lat, leafletBounds.getNorthWest().lng ],
                    [ leafletBounds.getNorthEast().lat, leafletBounds.getNorthEast().lng ],
                    [ leafletBounds.getSouthEast().lat, leafletBounds.getSouthEast().lng ],
                    [ leafletBounds.getSouthWest().lat, leafletBounds.getSouthWest().lng ]
                ];
                var polygonBounds = [];
                for (var i=0; i<polygon.length; i++) {
                    var bound = polygon[i];
                    polygonBounds.push(bound.join(','));
                }
                var param = '('+polygonBounds.join('),(')+')';
                return param;
            },
            getPolygonParameterAsBounds: function(parameter) {
                /*  Input: a Polygon
                    Output: a Bounds
                */
                var members = parameter.replace(/[()]/g, '').split(',');
                var minlat, minlng, maxlat, maxlng;
                for (var i=0; i<members.length; i+=2) {
                    var lat = parseFloat(members[i]);
                    var lng = parseFloat(members[i+1]);

                    if (!minlat || minlat > lat) { minlat = lat; }
                    if (!minlng || minlng > lng) { minlng = lng; }
                    if (!maxlat || maxlat < lat) { maxlat = lat; }
                    if (!maxlng || maxlng < lng) { maxlng = lng; }
                }
                return [
                    [ minlat, minlng ],
                    [ maxlat, maxlng ]
                ];
            },
            getPolygonParameterAsGeoJSON: function(parameter) {
                var geojson = {
                    'type': 'Polygon',
                    'coordinates': [[]]
                };
                var members = parameter.replace(/[()]/g, '').split(',');
                for (var i=0; i<members.length; i+=2) {
                    var lat = parseFloat(members[i]);
                    var lng = parseFloat(members[i + 1]);
                    geojson.coordinates[0].push([lng, lat]);
                }
                return geojson;
            },
            getBboxParameterAsPolygonParameter: function(bbox) {
                /*  Input: a Bbox
                    Output: a Polygon
                */
                return this.getBoundsAsPolygonParameter(this.getBboxParameterAsBounds(bbox));
            },
            getGeoJSONPolygonAsPolygonParameter: function(geoJsonPolygon) {
                /*  Input: a GeoJSON object of type Polygon
                    Output: a Polygon
                 */
                var coordinates;
                var polygonBounds = [];
                if (geoJsonPolygon.type === 'LineString') {
                    // Currently our API doesn't have a geofilter system that supports querying as a line, so we
                    // query its bounding box instead
                    coordinates = geoJsonPolygon.coordinates;

                    // Let's compute the boundingbox
                    var minLng = null,
                        minLat = null,
                        maxLng = null,
                        maxLat = null;
                    angular.forEach(coordinates, function(pos) {
                        // GeoJSON is lng,lat
                        var lng = pos[0],
                            lat = pos[1];

                        minLng = minLng === null ? lng : Math.min(minLng, lng);
                        minLat = minLat === null ? lat : Math.min(minLat, lat);
                        maxLng = maxLng === null ? lng : Math.max(maxLng, lng);
                        maxLat = maxLat === null ? lat : Math.max(maxLat, lat);
                    });

                    polygonBounds.push(minLat + ',' + minLng);
                    polygonBounds.push(minLat + ',' + maxLng);
                    polygonBounds.push(maxLat + ',' + maxLng);
                    polygonBounds.push(maxLat + ',' + minLng);
                } else {
                    // We are only working on the first set of coordinates
                    coordinates = geoJsonPolygon.coordinates[0];
                    // For MutliPolygon, we are only working on the first polygon
                    if (geoJsonPolygon.type === 'MultiPolygon') {
                        coordinates = coordinates[0];
                    }
                    for (var i=0; i<coordinates.length; i++) {
                        var bound = angular.copy(coordinates[i]);
                        if (bound.length > 2) {
                            // Discard the z
                            bound.splice(2, 1);
                        }
                        bound.reverse(); // GeoJSON has reverse coordinates from the rest of us
                        polygonBounds.push(bound.join(','));
                    }
                }
                return '('+polygonBounds.join('),(')+')';
            },
            addGeoFilterFromSpatialObject: function(parameters, spatial) {
                /*  Input: Either a GeoJSON or an array of lat,lng
                    Output: Nothing (it adds the new geofilter in place)
                 */
                if (angular.isArray(spatial)) {
                    // 2D coordinates (lat, lng)
                    parameters["geofilter.distance"] = spatial[0]+','+spatial[1];
                } else if (spatial.type === 'Point') {
                    parameters["geofilter.distance"] = spatial.coordinates[1]+','+spatial.coordinates[0];
                } else {
                   parameters["geofilter.polygon"] = this.getGeoJSONPolygonAsPolygonParameter(spatial);
                }
            }
        },
        StringUtils: {
            slugify: function(string) {
                if (!string) {
                    return string;
                }
                return string
                    .toLowerCase()
                    .replace(/\s+/g,'-')
                    .replace(/[^\w-]+/g,'')
                    .replace(/-+/g,'-');
            },
            capitalize: function(input) {
                return input.charAt(0).toUpperCase() + input.slice(1);
            },
            startsWith: function(input, searchedString) {
                return input && input.indexOf(searchedString) === 0;
            },
            escapeHTML: function(text) {
                return text
                     .replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
            }
        },
        ArrayUtils: {
            transpose: function(input) {
                if (angular.isArray(input)) {
                    return input.reduce(function (resultObject, key) {
                        resultObject[key] = true;
                        return resultObject;
                    }, {});
                } else {
                    return Object.keys(input).reduce(function (resultArray, key) {
                        if (input[key]) {
                            resultArray.push(key);
                        }
                        return resultArray;
                    }, []);
                }
            }
        },
        URLUtils: {
            cleanupAPIParams: function(params) {
                var params = angular.copy(params);

                function unnameParameter(prefix, parameterName, parameterValue) {
                    // Transforms a "named" parameter (e.g. q.myname) to put its value into the unnamed base parameter (q)
                    if (parameterName.startsWith(prefix+'.')) {
                        if (!params[prefix]) {
                            params[prefix] = parameterValue;
                        } else if (angular.isArray(params[prefix])) {
                            params[prefix].push(parameterValue);
                        } else {
                            params[prefix] = [params[prefix], parameterValue];
                        }
                        delete params[parameterName];
                    }
                }

                // Transforming named parameters into regular parameters... until the API supports it itself
                angular.forEach(params, function(paramValue, paramName) {
                    angular.forEach(['q', 'rq'], function(prefix) {
                        unnameParameter(prefix, paramName, paramValue);
                    });
                });
                return params;
            },
            getAPIQueryString: function(options) {
                var qs = [];
                options = this.cleanupAPIParams(options);
                angular.forEach(options, function(value, key) {
                    if (angular.isString(value)) {
                        qs.push(key+'='+encodeURIComponent(value));
                    } else {
                        angular.forEach(value, function(singleVal) {
                            qs.push(key+'='+encodeURIComponent(singleVal));
                        });
                    }
                });
                return qs.join('&');
            }
        },
        DatasetUtils: {
            isFieldSortable: function(field) {
                // This is in a separate function because it can be used independently from the dataset
                var supportedSortTypes = ['int', 'double', 'date', 'datetime'];
                if (supportedSortTypes.indexOf(field.type) >= 0) {
                    // These types are always sortable
                    return true;
                }
                if (field.type === 'text' && field.annotations) {
                    for (var a=0; a<field.annotations.length; a++) {
                        var anno = field.annotations[a];
                        if (anno.name === 'sortable') {
                            return true;
                        }
                    }
                }
                return false;
            }
        },
        Dataset: function(dataset) {
            var types, facetsCount, filtersDescription;

            var isFieldAnnotated = function(field, annotationName) {
                if (field.annotations) {
                    for (var i=0; i<field.annotations.length; i++) {
                        if (field.annotations[i].name === annotationName) {
                            return true;
                        }
                    }
                }
                return false;
            };

            var iterateFields = function(fields) {
                filtersDescription = {'facets': []};
                types = [];
                facetsCount = 0;
                for (var j=0; j< fields.length; j++) {
                    var field = fields[j];
                    if (isFieldAnnotated(field, 'facet')) {
                        facetsCount++;
                        filtersDescription.facets.push(field);
                    }
                    if (!types[field.type]) {
                        types[field.type] = 1;
                    } else {
                        types[field.type] += 1;
                    }
                }
            };

            return {
                datasetid: dataset.datasetid || "preview", // "preview" is here as a trick in publish as the dataset has no id
                has_records: dataset.has_records,
                metas: dataset.metas || {domain: 'preview'},
                features: dataset.features,
                attachments: dataset.attachments,
                alternative_exports: dataset.alternative_exports,
                fields: dataset.fields,
                extra_metas: dataset.extra_metas,
                interop_metas: dataset.interop_metas,
                billing_plans: dataset.billing_plans,
                setFields: function(fields) {
                    this.fields = fields;
                    iterateFields(this.fields);
                },
                getUniqueId: function() {
                    return this.metas.domain + '.' + this.datasetid;
                },
                getTypes: function() {
                    if (typeof types === "undefined") {
                        iterateFields(this.fields);
                    }
                    return types;
                },
                hasFeature: function(featureName) {
                    return (dataset.features.indexOf(featureName) > -1);
                },
                hasFieldType: function(fieldType) {
                    for (var i = 0; i < this.fields.length; i++) {
                        if (this.fields[i].type == fieldType) {
                            return true;
                        }
                    }
                    return false;
                },
                countFieldType: function (fieldType) {
                    var count = 0;
                    for (var i = 0; i < this.fields.length; i++) {
                        if (this.fields[i].type == fieldType) {
                            count++;
                        }
                    }
                    return count;
                },
                countFieldTypes: function (fieldTypes) {
                    var count = 0;
                    for (var i = 0; i < fieldTypes.length; i++) {
                        count += this.countFieldType(fieldTypes[i]);
                    }
                    return count;
                },
                getFacetsCount: function() {
                    if (typeof facetsCount === "undefined") {
                        iterateFields(this.fields);
                    }
                    return facetsCount;
                },
                hasFacet: function() {
                    if (typeof facetsCount === "undefined") {
                        iterateFields(this.fields);
                    }
                    return facetsCount > 0;
                },
                getFilterDescription: function() {
                    if (typeof filtersDescription === "undefined") {
                        iterateFields(this.fields);
                    }
                    return filtersDescription;
                },
                getFacets: function() {
                    return this.getFilterDescription().facets;
                },
                setMetas: function(metas) {
                    this.metas = metas;
                },
                getField: function(fieldName) {
                    for (var i=0; i<this.fields.length; i++) {
                        var field = this.fields[i];
                        if (field.name === fieldName) {
                            return field;
                        }
                    }
                    return null;
                },
                getFieldLabel: function(fieldName) {
                    var field = this.getField(fieldName);
                    if (!field) {
                        return field;
                    }
                    return field.label;
                },
                getFieldsForType: function(fieldType) {
                    var fields = [];
                    for (var i=0; i<this.fields.length; i++) {
                        var field = this.fields[i];
                        if (field.type === fieldType) {
                            fields.push(field);
                        }
                    }
                    return fields;
                },
                hasNumericField: function() {
                    for (var i=0; i < this.fields.length; i++) {
                        var field = this.fields[i];
                        if (field.type === 'int' || field.type === 'double') {
                            return true;
                        }
                    }
                    return false;
                },
                hasGeoField: function() {
                    for (var i=0; i < this.fields.length; i++) {
                        var field = this.fields[i];
                        if (field.type === 'geo_point_2d' || field.type === 'geo_shape') {
                            return true;
                        }
                    }
                    return false;
                },
                getExtraMeta: function(template, name) {
                    if (this.extra_metas && this.extra_metas[template] && this.extra_metas[template][name]) {
                        return this.extra_metas[template][name];
                    } else {
                        return null;
                    }
                },
                isFieldAnnotated: function(field, annotationName) {
                    return isFieldAnnotated(field, annotationName);
                }
            };
        }
    };

    if (typeof target.ODS === 'undefined') {
        target.ODS = {};
    }
    target.ODS = angular.extend(target.ODS, ODS);
})(window);
