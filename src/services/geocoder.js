(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    /*
    Calls to the following services should return an array of:
        {
            "location": {
                "lat": 12,
                "lng": 34
            },
            "bbox": [[lat1, lng1], [lat2, lng2]], // Optional
            "name": "Paris",
            "highlightedName": "<em>Par</em>is"
            "parents": "Ile-de-France, France"
            "type": "country"|"region"|"city"|"street"|"address"|"poi"|"railway"|"aeroway"
     */

    mod.service('Geocoder', ['$http', 'ODSWidgetsConfig', '$q', function($http, ODSWidgetsConfig, $q) {
        // https://www.jawg.io/docs/apidocs/places/autocomplete/#layers
        // Regarding configuration: https://app.clubhouse.io/opendatasoft/story/17461/experiment-alternative-geocoding-api-as-a-backend-for-geosearch#activity-19300
        var includedLayers = [
            'address',
            // 'venue',
            'street',
            // 'neighbourhood',
            'locality',
            // 'borough',
            'localadmin',
            'county',
            // 'macrocounty',
            'region',
            'macroregion',
            'country',
            // 'coarse',
            'postalcode'
        ];

        // https://github.com/pelias/openstreetmap/blob/master/config/category_map.js
        // The categories parameter lets you select which types of OSM POIs are included in the data.
        // Additionally, it adds a "category" property on results that help us determine their type.
        // var includedCategories = [
        //     'transport',
        //     // 'recreation',
        //     // 'religion',
        //     // 'education',
        //     // 'entertainment',
        //     // 'nightlife',
        //     // 'food',
        //     'government',
        //     'professional',
        //     // 'finance',
        //     // 'health',
        //     // 'retail',
        //     // 'accommodation',
        //     // 'industry',
        //     // 'recreation',
        //     'natural',
        // ];

        var computeHighlight = function(query, result) {
            // Best-effort client-side highlighting
            // Try to account for spaces, quotes... that may match (e.g. "Saint-Nazaire" / "Saint Nazaire")
            var whitespace = new RegExp(/\W/);
            query = query.replace(whitespace, "\\W");
            var re = new RegExp(query, 'i');
            return result.replace(re, '<em>$&</em>');
        };

        var computeParents = function(jawgSuggestion) {
            var parents = '';
            var previousParent = null;

            ['locality', 'region', 'country'].forEach(function(prop) {
                var existingProp = jawgSuggestion.properties[prop];

                if (!existingProp && prop === 'locality') {
                    // localadmin can be a fallback for locality, depending on the country and data source
                    existingProp = jawgSuggestion.properties['localadmin'];
                }

                if (angular.isDefined(existingProp) && existingProp !== jawgSuggestion.properties.name) {
                    if (previousParent !== existingProp) {
                        if (parents.length > 0) {
                            parents += ', ';
                        }
                        parents += existingProp;
                        previousParent = existingProp;
                    }
                }
            });

            return parents;
        };

        var computeType = function(jawgSuggestion) {
            // Aeroway, Railway are unsupported
            if (jawgSuggestion.properties.category && jawgSuggestion.properties.category.indexOf('transport:air') >= 0) {
                return 'aeroway';
            } else if (jawgSuggestion.properties.category
                && (jawgSuggestion.properties.category.indexOf('transport:public') >= 0
                || jawgSuggestion.properties.category.indexOf('transport:rail') >= 0)) {
                // Somehow, parisian metro isn't rail
                return 'railway';
            } else if (jawgSuggestion.properties.layer === 'venue') {
                return 'poi';
            } else if (jawgSuggestion.properties.layer === 'country') {
                return 'country';
            } else if (jawgSuggestion.properties.layer === 'locality') {
                return 'city';
            } else if (jawgSuggestion.properties.layer === 'street') {
                return 'street';
            } else if (jawgSuggestion.properties.layer === 'region' || jawgSuggestion.properties.layer === 'macroregion') {
                return 'region';
            } else {
                return 'address';
            }
        };

        var currentRequest = null;

        return function(query, aroundLatLng) {
            var deferred = $q.defer();

            if (currentRequest) {
                currentRequest.resolve();
            }
            currentRequest = $q.defer();
            var queryOptions = {
                'params': {
                    'focus.point.lat': aroundLatLng[0],
                    'focus.point.lon': aroundLatLng[1],
                    'layers': includedLayers.join(','),
                    // 'categories': includedCategories.join(','),
                    'text': query,
                    'access-token': ODSWidgetsConfig.jawgGeocodingAPIKey,
                    'size': 5
                },
                'timeout': currentRequest.promise
            };

            $http.get('https://api.jawg.io/places/v1/autocomplete', queryOptions).then(function(response) {
                var result = response.data;
                var suggestions = [];
                angular.forEach(result.features, function(suggestion) {
                    var normalizedSuggestion = {
                        location: {
                            lat: suggestion.geometry.coordinates[1],
                            lng: suggestion.geometry.coordinates[0]
                        },
                        name: suggestion.name,
                        highlightedName: computeHighlight(query, suggestion.properties.name), // The API doesn't provide highlight
                        parents: computeParents(suggestion),
                        type: computeType(suggestion)
                    };

                    if (suggestion.bbox) {
                        normalizedSuggestion.bbox = [
                            [suggestion.bbox[1], suggestion.bbox[0]],
                            [suggestion.bbox[3], suggestion.bbox[2]],
                        ];
                    }
                    suggestions.push(normalizedSuggestion);
                });
                deferred.resolve(suggestions);
            }, function() {
                deferred.reject();
            });
            return deferred.promise;
        };
    }]);
}());
