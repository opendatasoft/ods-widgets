(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

        var pathMatches = function(queriedPath, comparedPath, allowSubstring) {
            /*
            Compares two paths to see if one matches the other.
            This is different from just comparing the strings, because it accounts for wildcards (*).

            If allowSubstring is true, then comparedPath can be contained inside queriedPath, but not the other
            way.

            queriedPath = a/b/c/d, comparedPath = a/b/c => true
            queriedPath = a/b/c, comparedPath = a/b/c/d => false
             */
            // queriedPath can contain a *, which would match anything in that level
            if (queriedPath === comparedPath) {
                return true;
            }

            var queriedPathTokens = queriedPath.split('/');
            var comparedPathTokens = comparedPath.split('/');

            if (!allowSubstring && queriedPathTokens.length !== comparedPathTokens.length) {
                return false;
            }

            if (queriedPathTokens.length < comparedPathTokens.length) {
                return false;
            }

            var matches = true;

            angular.forEach(queriedPathTokens, function(queriedPathToken, idx) {
                if (!matches) {
                    // No point going further
                    return;
                }

                if (idx >= comparedPathTokens.length) {
                    return;
                }

                if (queriedPathToken === '*' || comparedPathTokens[idx] === '*') {
                    // If either is a wildcard, then it's a match
                    return;
                }

                if (queriedPathToken !== comparedPathTokens[idx]) {
                    matches = false;
                }
            });

            return matches;
        };

    mod.service('GeographicReferenceService', ['$q', 'ODSAPI', 'ODSWidgetsConfig', function($q, ODSAPI, ODSWidgetsConfig) {
        // Note: each label in label path is URL-encoded
        // Pre-initialized with world path to spare one trivial API call
        var MAPPING_LABELS_TO_UIDS = {
            "World": "world"
        };
        var MAPPING_UIDS_TO_LABELS = {
            "world": "World"
        };

        var entityFetchRequests = {};

        var addMappings = function(uidPath, labelPath) {
            // Store mappings from these paths, and all the paths in-between
            var uidPathTokens = uidPath.split('/');
            var labelPathTokens = labelPath.split('/');

            var addedUIDPath = '',
                addedLabelPath = '';

            for (var i=0; i<uidPathTokens.length; i++) {
                if (i) {
                    addedUIDPath += '/';
                    addedLabelPath += '/';
                }
                addedUIDPath += uidPathTokens[i];
                addedLabelPath += labelPathTokens[i];
                MAPPING_LABELS_TO_UIDS[addedLabelPath] = addedUIDPath;
                MAPPING_UIDS_TO_LABELS[addedUIDPath] = addedLabelPath;
            }
        };

        var addMappingsFromEntity = function(entity) {
            // Inside an entity, we have several mappings readily available that we can get from the parents
            if (!entity.parents) {
                // This is a root level (country)
                addMappings(entity.uid, entity.name);
            } else {
                angular.forEach(entity.parents, function (parentHierarchy) {
                    var levels = Object.keys(parentHierarchy);
                    levels.sort();
                    var uidPath = '',
                        labelPath = '';
                    angular.forEach(levels, function (level, idx) {
                        if (idx) {
                            uidPath += '/';
                            labelPath += '/';
                        }
                        uidPath += parentHierarchy[level].uid;
                        labelPath += encodeURIComponent(parentHierarchy[level].label);
                    });

                    if (uidPath) {
                        uidPath += '/' + entity.uid;
                        labelPath += '/' + encodeURIComponent(entity.name);
                    }
                    addMappings(uidPath, labelPath);
                });
            }
        };

        return {
            // Geodomain
            getLabelPathFromUIDPath: function(uidPath) {
                var deferred = $q.defer();
                if (angular.isDefined(MAPPING_UIDS_TO_LABELS[uidPath])) {
                    deferred.resolve(MAPPING_UIDS_TO_LABELS[uidPath]);
                } else {
                    var uid = uidPath.split('/').pop();
                    this.getEntity(uid).then(function () {
                        // Entity fetching caches the paths already
                        deferred.resolve(MAPPING_UIDS_TO_LABELS[uidPath]);
                    });
                }
                return deferred.promise;
            },
            getUIDPathFromLabelPath: function(labelPath, catalogContext) {
                var deferred = $q.defer();
                if (angular.isDefined(MAPPING_LABELS_TO_UIDS[labelPath])) {
                    deferred.resolve(MAPPING_LABELS_TO_UIDS[labelPath]);
                } else {
                    var params = {
                        rows: 1,
                        geonav: '',
                        extrametas: true,
                        q: '#startswith(explore.geographic_reference_path_labels, "' + labelPath + '")'
                    };
                    ODSAPI.datasets.search(catalogContext, params).success(function(data) {
                        var dataset = data.datasets[0];
                        var pathIndex;
                        angular.forEach(dataset.extra_metas.explore.geographic_reference_path_labels, function(value, index) {
                            // In the case of a *, we'll get two paths in the facets, but we want the one without the wildcard,
                            // so that we get the real hierarchy.
                            if (value.split('/').indexOf('*') === -1 && pathMatches(value, labelPath, true)) {
                                pathIndex = index;
                            }
                        });

                        // var labels = dataset.metas.geographic_reference_path[pathIndex];
                        var uidPath = dataset.extra_metas.explore.geographic_reference_path[pathIndex];
                        var depth = labelPath.split('/').length;
                        uidPath = uidPath.split('/').slice(0, depth).join('/');
                        addMappings(dataset.extra_metas.explore.geographic_reference_path[pathIndex], dataset.extra_metas.explore.geographic_reference_path_labels[pathIndex]);
                        deferred.resolve(uidPath);
                    })
                }
                return deferred.promise;
            },
            getEntity: function(uid) {
                if (entityFetchRequests[uid]) {
                    return entityFetchRequests[uid];
                } else {
                    var deferred = $q.defer();
                    entityFetchRequests[uid] = deferred.promise;

                    ODSAPI.georeference.uid(uid, {geom: 'schematic'}).success(function(entity) {
                        addMappingsFromEntity(entity);
                        deferred.resolve(entity);
                    });

                    return deferred.promise;
                }
            },
            // Geonavigation levels
            getLevelsForCountry: function(country) {
                var levels = ODSWidgetsConfig.geonavigationLevels.world;
                if (ODSWidgetsConfig.geonavigationLevels[country]) {
                    levels = levels.concat(ODSWidgetsConfig.geonavigationLevels[country]);
                }
                return levels;
            },
            getLevelFromPath: function(uidPath, additionalDepth) {
                additionalDepth = additionalDepth || 0;
                var tokens = uidPath.split('/');
                if (tokens.length === 1) {
                    // World level
                    if (additionalDepth) {
                        return null;
                    } else {
                        return ODSWidgetsConfig.geonavigationLevels.world[0];
                    }
                }
                var country = tokens[1].substring(6);
                var levels = this.getLevelsForCountry(country);
                if (levels.length <= tokens.length - 1 + additionalDepth) {
                    return null;
                }
                return levels[tokens.length - 1 + additionalDepth];
            },
            isMaxLevel: function(uidPath) {
                if (!uidPath || uidPath === 'world') {
                    return false;
                }
                var tokens = uidPath.split('/');
                var country = tokens[1].substring(6);
                var allLevels = this.getLevelsForCountry(country);
                return tokens.length === allLevels.length;
            }
        }
    }]);
}());
