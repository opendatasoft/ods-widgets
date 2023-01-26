(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    var shapeColor = "#00C7B1";
    var disabledShapeColor = "#565656";

    mod.directive('odsGeoNavigation', ['ModuleLazyLoader', 'ODSWidgetsConfig', 'ODSAPI', 'GeographicReferenceService', '$q', '$filter', function (ModuleLazyLoader, ODSWidgetsConfig, ODSAPI, GeographicReferenceService, $q, $filter) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsGeoNavigation
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog context} to use.
         * @param {number} minLevel Highest level available for navigation (countries are 10, other levels depend on the country)
         * @param {number} [maxLevel=none] Lowest level available for navigation (countries are 10, other levels depend on the country).
         * If not set, the user will be able to navigate to the lowest available level.
         * @param {string} defaultFilter Path of Geographic References leading to the filter's starting point
         * (e.g. `world/world_fr/fr_40_52`).
         * @param {boolean} [ascendingFilter=false] When set to `true`, the "Display all datasets that include current selection"
         * (ascending filter) option will be active by default.
         *
         * @description
         * The odsGeoNavigation widget allows to visually navigate a catalog using geographic metadata (currently, only the "Geographic coverage" metadata).
         * The navigation is similar to `odsFacets`, but with a visual indication (map) of the current location used as
         * a filter.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<div class="odswidget odswidget-geo-navigation">' +
                '    <div class="odswidget-geo-navigation__header-container">' +
                '        <h3 class="odswidget-geo-navigation__header" translate>Territory</h3>' +
                '        <div class="odswidget-geo-navigation__map" ng-click="enableFilter()"></div>' +
                '        <div ng-if="!isFilterEnabled" ng-bind="defaultFilterLabel" ng-click="enableFilter()" class="odswidget-geo-navigation__default-label"></div>' +

                '        <div ng-if="isFilterEnabled" class="odswidget-geo-navigation__current-filter">' +
                '            <div class="odswidget-geo-navigation__current-filter-title" title="{{ currentFilterLabel }}">' +
                '                <i class="fa fa-map-marker odswidget-geo-navigation__marker-icon" aria-hidden="true"></i> {{ currentFilterLabel }}' +
                '            </div>' +
                '           <button class="odswidget-geo-navigation__cancel" ng-click="closeFilter()" aria-label="Cancel" translate="aria-label"><i class="fa fa-times-circle" aria-hidden="true"></i></button>' +
                '        </div>' +
                '        <div ng-if="isFilterEnabled">' +
                '            <div ng-click="selectParent()" ng-show="parentFilterLabel" class="odswidget-geo-navigation__navigation-control">' +
                '                <i class="fa fa-chevron-left" aria-hidden="true"></i> <span translate>Back to {{parentFilterLabel}}</span>' +
                '            </div>' +
                '            <div ng-click="skipLevel()" ng-show="canBeSkipped && skipToLevelLabel" class="odswidget-geo-navigation__navigation-control">' +
                '                <i class="fa fa-chevron-right" aria-hidden="true"></i> <span translate>Go to {{skipToLevelLabel}} level</span>' +
                '            </div>' +
                '            <div ng-click="unskipLevel()" ng-show="backToOriginalLevelLabel" class="odswidget-geo-navigation__navigation-control">' +
                '                <i class="fa fa-chevron-left" aria-hidden="true"></i> <span translate>Back to {{backToOriginalLevelLabel}} level</span>' +
                '            </div>' +
                '            <label ng-show="showAscendingToggle" class="odswidget-geo-navigation__ascending-filter-container">' +
                '               <button aria-label="{{ ascendingFilter ? (\'Toggle off\'|translate) : (\'Toggle on\'|translate) }}" ng-click="onAscendingFilterToggle()" ng-class="{\'odswidget-geo-navigation__ascending-filter-button\': true, \'odswidget-geo-navigation__ascending-filter-button--enabled\': ascendingFilter, \'odswidget-geo-navigation__ascending-filter-button--disabled\': !ascendingFilter}">' +
                '                   <i aria-hidden="true" ng-class="{\'fa\': true, \'fa-toggle-off\': !ascendingFilter, \'fa-toggle-on\': ascendingFilter}"></i>' +
                '               </button>' +
                '               <div translate>Display all datasets that include {{ currentFilterLabel }}</div>' +
                '            </label>' +
                '            <div ng-show="showSearchbox" class="odswidget-geo-navigation__level-search-box-container">' +
                '                <input type="text" ng-model="searchInLevel" placeholder="Search a location" translate="placeholder" class="odswidget-geo-navigation__level-search-box">' +
                '                <i class="fa fa-search odswidget-geo-navigation__level-search-box-icon" aria-hidden="true"></i>' +
                '            </div>' +
                '            <hr ng-show="!showSearchbox && (parentFilterLabel || canBeSkipped && skipToLevelLabel) && choices.length" class="odswidget-geo-navigation__navigation-separator" />' +
                '            <div ng-repeat="choice in choices|filter:searchValue(searchInLevel)" ng-show="isVisible($index)" ng-click="selectChoice(choice.path)" class="odswidget-geo-navigation__choice">' +
                '                <div class="odswidget-geo-navigation__choice-label">{{choice.name}}</div>' +
                '                <div class="odswidget-geo-navigation__choice-count" ng-hide="ascendingFilter">{{choice.count}}</div>' +
                '            </div>' +
                '            <div ng-if="(choices|filter:searchValue(searchInLevel)).length > 5" ' +
                '                 class="odswidget-geo-navigation__expansion-control">' +
                '                <a ng-hide="expanded" href="#" ng-click="toggleExpand(true)" class="odswidget-geo-navigation__expansion-control-link">' +
                '                    <i class="fa fa-angle-right" aria-hidden="true"></i>' +
                '                    <span translate>More</span>' +
                '                </a>' +
                '                <a ng-show="expanded" href="#" ng-click="toggleExpand(false)" class="odswidget-geo-navigation__expansion-control-link">' +
                '                    <i class="fa fa-angle-right" aria-hidden="true"></i>' +
                '                    <span translate>Less</span>' +
                '                </a>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '</div>',
            scope: {
                context: '=',
                minLevel: '@',
                maxLevel: '@',
                country: '@',
                defaultFilter: '@',
                ascendingFilter: '=?'
            },
            link: function (scope, element, attrs) {
                function visibilityObserverCallback(entries) {
                    var isVisible = entries[0].isIntersecting;

                    if (isVisible) {
                        mountMap();
                    } else {
                        unmountMap();
                    }
                }

                var mapReady = $q.defer();
                var mapContainer = element.find('div.odswidget-geo-navigation__map');

                function mountMap() {
                    // Initialize a new map in the page. This shouldonly happen when the container is visible in the
                    // page, otherwise this brings issues with map viewport and tiles.
                    ModuleLazyLoader('leaflet').then(function () {
                        if (!scope.map) {
                            scope.map = new L.ODSMap(mapContainer[0], {
                                scrollWheelZoom: false,
                                dragging: false,
                                touchZoom: false,
                                doubleClickZoom: false,
                                boxZoom: false,
                                keyboard: false,
                                zoomControl: false,
                                basemapsList: [ODSWidgetsConfig.neutralBasemap],
                                maxBounds: [[-90, -180], [90, 180]],
                                zoom: 13
                            });
                            scope.map.setView([0, 0], 0);

                            mapReady.resolve(scope.map);

                            if (lastUid) {
                                scope.displayShape(lastUid);
                            }
                        }
                    });
                }

                function unmountMap() {
                    if (scope.map) {
                        scope.map.remove();
                        scope.map = null;
                        mapReady = $q.defer();
                    }
                }

                if (window.IntersectionObserver) {
                    // Make sure we revalidate the map's display if we go from hidden to visible (typically
                    // when in mobile view, where the filters are hidden by default)
                    var observer = new IntersectionObserver(visibilityObserverCallback);
                    observer.observe(mapContainer[0]);
                } else {
                    // Always mount once for browsers without IntersectionObserver support
                    mountMap();
                }

                var getShapeStyle = function() {
                    var color = scope.isFilterEnabled ? shapeColor : disabledShapeColor;
                    var dashArray = scope.isFilterEnabled ? null : "2, 2";
                    return {
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.25,
                        opacity: 1,
                        weight: 1,
                        clickable: false,
                        dashArray: dashArray
                    };
                };

                // Last UID displayed in the map (currently if the map exists, or the last time the map was visible)
                var lastUid = null;

                scope.displayShape = function(uid) {
                    if (!uid || uid === 'world') {
                        if (scope.currentShapeLayer) {
                            scope.map.removeLayer(scope.currentShapeLayer);
                            scope.currentShapeLayer = null;
                        }
                        return;
                    }

                    // Keeping the last drawn UID to recover if we dismount & remount the map again later
                    lastUid = uid;

                    GeographicReferenceService.getEntity(uid).then(function(entity) {
                        var shape = entity.geom;
                        mapReady.promise.then(function(map) {
                            if (scope.currentShapeLayer) {
                                map.removeLayer(scope.currentShapeLayer);
                            }
                            scope.currentShapeLayer = L.geoJson(shape, getShapeStyle());
                            map.addLayer(scope.currentShapeLayer);
                            map.fitBounds(scope.currentShapeLayer.getBounds());
                            // Sometimes on initial load, the map doesn't work unless we invalidate size. Not sure
                            // exactly why, this happens only on some browsers (Chome & FF, but not Safari),
                            // and appeared suddenly (early 2022).
                            map.invalidateSize();
                        });
                    });
                };
            },
            controller: ['$scope', 'translate', 'GeographicReferenceService', function($scope, translate, GeographicReferenceService) {
                $scope.enableFilter = function() {
                    $scope.context.parameters['geonav'] = $scope.defaultFilter || 'world';

                    if ($scope.ascendingFilter) {
                        $scope.context.parameters['geonav-asc'] = true
                    } else {
                        delete $scope.context.parameters['geonav-asc'];
                    }
                };
                $scope.closeFilter = function() {
                    delete $scope.context.parameters['geonav'];
                };

                $scope.toggleExpand = function(expand) {
                    $scope.expanded = expand;
                };

                $scope.isVisible = function(index) {
                    // Used to show or hide items depending on more/less
                    return index < 5 || $scope.expanded;
                };

                $scope.searchValue = function(search) {
                    // Used to filter the items in the level, based on the search box
                    if (!$scope.showSearchbox) { return function () { return true; }; }
                    if (!search) { return function() { return true; }; }
                    search = $filter('normalize')(search).toLowerCase();
                    return function(searchedChoice) {
                        var choiceName = $filter('normalize')(searchedChoice.name).toLowerCase();
                        return choiceName.indexOf(search) > -1;
                    };
                };

                $scope.onAscendingFilterToggle = function() {
                    $scope.ascendingFilter = !$scope.ascendingFilter;
                    if ($scope.ascendingFilter) {
                        $scope.context.parameters['geonav-asc'] = true
                    } else {
                        delete $scope.context.parameters['geonav-asc'];
                    }
                };

                var refreshChoices = function(skipLastLevel) {
                    // If "skip last level", we'll add a * to the path so that we skip one level (e.g. "Skip EPCIs to Communes")
                    GeographicReferenceService.getLabelPathFromUIDPath($scope.context.parameters['geonav']).then(
                        function(labelPath) {
                            var uidPath = $scope.context.parameters['geonav'];
                            var labelPathTokens = labelPath.split('/');
                            $scope.currentFilterLabel = decodeURIComponent(labelPathTokens.pop());
                            if (uidPath === 'world') {
                                $scope.parentFilterLabel = null;
                            } else {
                                var currentLevel = GeographicReferenceService.getLevelFromPath(uidPath);
                                // Min and max level restrictions
                                if (currentLevel && currentLevel.administrativeLevel <= $scope.minLevel) {
                                    // We're at the highest level we can, we can't go above
                                    $scope.parentFilterLabel = null;
                                } else {
                                    if (labelPath.split('/').length === 1) {
                                        // We're at the top!
                                        $scope.parentFilterLabel = translate('World');
                                    } else {
                                        $scope.parentFilterLabel = decodeURIComponent(labelPathTokens.pop());
                                    }
                                }
                            }

                            $scope.backToOriginalLevelLabel = null;
                            if (skipLastLevel) {
                                var originalLevel = GeographicReferenceService.getLevelFromPath(uidPath, 1)
                                if (originalLevel) {
                                    $scope.backToOriginalLevelLabel = originalLevel.label;
                                }
                            }

                            // Is it the lowest level in the country?
                            $scope.isMaxLevel = GeographicReferenceService.isMaxLevel(uidPath);
                            // We allow ascending filter only if at least 2 level deep in a country
                            $scope.showAscendingToggle = uidPath.split('/').length > 2;

                            if (!$scope.isMaxLevel && (!currentLevel || (!$scope.maxLevel || (currentLevel.administrativeLevel < $scope.maxLevel)))) {
                                if (skipLastLevel) {
                                    labelPath += '/*';
                                }

                                var params = {
                                    rows: 0,
                                    geonav: '' // Make sure the previous choice doesn't apply in the navigation
                                };
                                if (labelPath) {
                                    params['refine.explore.geographic_reference_path_labels'] = labelPath;
                                } else {
                                    params['facet'] = 'explore.geographic_reference_path_labels';
                                }
                                params['facetsort.explore.geographic_reference_path_labels'] = 'alphanum';
                                ODSAPI.datasets.search($scope.context, params).then(function(response) {
                                    var data = response.data;
                                    if (!data.facet_groups || !data.facet_groups.length) {
                                        // There is no facet group, which can happen if there are exactly 0 results
                                        $scope.choices = [];
                                        $scope.showSearchbox = false;
                                        $scope.canBeSkipped = false;
                                        $scope.backToOriginalLevelLabel = null;
                                        return;
                                    }

                                    var current = data.facet_groups.filter(function (facetGroup) {
                                        return facetGroup.name === 'explore.geographic_reference_path_labels';
                                    })[0];

                                    // Travel down the nodes until we reach the current situation.
                                    if (labelPath) {
                                        while (current.path !== labelPath) {
                                            current = current.facets.filter(function (facet) {
                                                // Two-part condition because a simple startswith without the / could confuse two places
                                                // that start the same ("Boulogne" / "Boulogne-sur-Mer")
                                                return labelPath.startsWith(facet.path + '/') || labelPath === facet.path;
                                            })[0];
                                        }
                                    }

                                    if (current.facets) {
                                        $scope.choices = current.facets
                                            .filter(function (facet) {
                                                return facet.name !== '*';
                                            })
                                            .map(function (facet) {
                                                facet.name = decodeURIComponent(facet.name);
                                                return facet;
                                            });
                                        $scope.canBeSkipped = $scope.choices.length !== current.facets.length;
                                        if ($scope.canBeSkipped) {
                                            var skipToLevel = GeographicReferenceService.getLevelFromPath(uidPath, 2)
                                            if (skipToLevel) {
                                                $scope.skipToLevelLabel = skipToLevel.label;
                                            }
                                        }
                                        $scope.showSearchbox = $scope.choices.length > 5;
                                    } else {
                                        $scope.choices = [];
                                        $scope.showSearchbox = false;
                                        $scope.canBeSkipped = false;
                                        $scope.backToOriginalLevelLabel = null;
                                    }
                                });
                            } else {
                                $scope.choices = [];
                                $scope.showSearchbox = false;
                                $scope.canBeSkipped = false;
                                $scope.backToOriginalLevelLabel = null;
                            }
                        }
                    )
                };

                $scope.skipLevel = function() {
                    refreshChoices(true);
                };

                $scope.unskipLevel = function() {
                    // Get back to the original level without skipping it
                    refreshChoices(false);
                };

                $scope.selectParent = function() {
                    var parentPathTokens = $scope.context.parameters['geonav'].split('/');
                    parentPathTokens.pop();
                    $scope.context.parameters['geonav'] = parentPathTokens.join('/');
                    if ($scope.ascendingFilter && parentPathTokens.length === 2) {
                        // Remove when reaching the country level
                        delete $scope.context.parameters['geonav-asc'];
                    }
                };

                $scope.selectChoice = function(labelPath) {
                    GeographicReferenceService.getUIDPathFromLabelPath(labelPath, $scope.context).then(function(uidPath) {
                        $scope.context.parameters['geonav'] = uidPath;

                        if ($scope.ascendingFilter && uidPath.split('/').length > 2) {
                            // This is a level where ascending filter makes sense, we apply it to the effective filter
                            $scope.context.parameters['geonav-asc'] = true;
                        }
                    });
                };

                $scope.isFilterEnabled = false;

                var outsideParametersWatcher;

                $scope.$watch("context.parameters.geonav", function(nv, ov) {
                    if (!!nv) {
                        $scope.isFilterEnabled = true;
                        if ($scope.context.parameters['geonav-asc']) {
                            $scope.ascendingFilter = true;
                        }
                        refreshChoices();
                        if (nv) {
                            $scope.displayShape(nv.split('/').pop());
                        } else {
                            $scope.displayShape(null);
                        }

                        if (!outsideParametersWatcher) {
                            outsideParametersWatcher = $scope.$watch(function() {
                                // We only want to watch non-geonav params, the geonav parameters are handled separately
                                var paramsCopy = angular.copy($scope.context.parameters);
                                delete paramsCopy.geonav;
                                delete paramsCopy['geonav-asc'];
                                return paramsCopy;
                            }, function (newValue, oldValue) {
                                if (newValue === oldValue) {
                                    // Ignore first run during init
                                    return;
                                }
                                // Refresh the choices, keeping the "skip to" part if it was the case
                                refreshChoices(Boolean($scope.backToOriginalLevelLabel));
                            }, true);
                        }
                    } else {
                        $scope.isFilterEnabled = false;
                        delete $scope.context.parameters['geonav-asc'];
                        $scope.displayShape($scope.defaultFilter.split('/').pop());
                        GeographicReferenceService.getLabelPathFromUIDPath($scope.defaultFilter || 'world').then(
                            function(defaultLabelPath) {
                                $scope.defaultFilterLabelPath = defaultLabelPath;
                                $scope.defaultFilterLabel = decodeURIComponent(defaultLabelPath.split('/').pop());
                            }
                        );
                        if (outsideParametersWatcher) {
                            // Disable the big watcher on the context parameters
                            outsideParametersWatcher();
                            outsideParametersWatcher = null;
                        }
                    }
                });
            }]
        };
    }]);
}());
