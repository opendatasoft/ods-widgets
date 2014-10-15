(function(target) {
    var ODS = {
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
                    var lat = members[i];
                    var lng = members[i+1];

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
                    polygonBounds.push(coordinates[0][1] + ',' + coordinates[0][0]); // Point 1
                    polygonBounds.push(coordinates[0][1] + ',' + coordinates[1][0]);
                    polygonBounds.push(coordinates[1][1] + ',' + coordinates[1][0]); // Point 2
                    polygonBounds.push(coordinates[1][1] + ',' + coordinates[0][0]);
                } else {
                    // We are only working on the first set of coordinates
                    coordinates = geoJsonPolygon.coordinates[0];
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

            var iterateFields = function() {
                filtersDescription = {'facets': []};
                types = [];
                facetsCount = 0;
                for (var j=0; j< dataset.fields.length; j++) {
                    var field = dataset.fields[j];
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
                fields: dataset.fields,
                extra_metas: dataset.extra_metas,
                interop_metas: dataset.interop_metas,
                setFields: function(fields) {
                    this.fields = fields;
                    iterateFields();
                },
                getUniqueId: function() {
                    return this.metas.domain + '.' + this.datasetid;
                },
                getTypes: function() {
                    if (typeof types === "undefined") {
                        iterateFields();
                    }
                    return types;
                },
                hasFieldType: function(fieldType) {
                    for (var i = 0; i < this.fields.length; i++) {
                        if (this.fields[i].type == fieldType) {
                            return true;
                        }
                    }
                    return false;
                },
                getFacetsCount: function() {
                    if (typeof facetsCount === "undefined") {
                        iterateFields();
                    }
                    return facetsCount;
                },
                hasFacet: function() {
                    if (typeof facetsCount === "undefined") {
                        iterateFields();
                    }
                    return facetsCount > 0;
                },
                getFilterDescription: function() {
                    if (typeof filtersDescription === "undefined") {
                        iterateFields();
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
                }
            }
        }
    };

    target.ODS = ODS;
})(window);
