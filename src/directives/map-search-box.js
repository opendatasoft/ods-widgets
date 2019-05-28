(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMapSearchBox', ['$timeout', 'AlgoliaPlaces', 'MapHelper', 'PictoHelper', 'SVGInliner', function ($timeout, AlgoliaPlaces, MapHelper, PictoHelper, SVGInliner) {
        return {
            restrict: 'E',
            template: '' +
            '<div class="odswidget odswidget-map-search-box" ' +
            '     ng-class="{\'odswidget-map-search-box--datasearch\': dataSearchActive, \'odswidget-map-search-box--expanded\': expanded}">' +
            '   <div class="odswidget-map-search-box__box-wrapper"' +
            '        ng-class="{\'odswidget-map-search-box__box-wrapper--datasearch\': dataSearchActive}">' +
            '       <input type="text" ' +
            '              class="odswidget-map-search-box__box"' +
            '              ng-class="{\'odswidget-map-search-box__box--datasearch\': dataSearchActive}"' +
            '              ng-model="userQuery" ' +
            '              ng-change="runQuery(userQuery)" ' +
            '              ng-keydown="handleKeyDown($event)"' +
            '              ng-focus="expandSearchBox()" >' +
            '       <button type="button" class="odswidget-map-search-box__box-cancel" ng-click="resetSearch()" ng-show="userQuery || dataSearchActive">' +
            '           <i class="fa fa-times odswidget-map-search-box__close-search-icon"></i>' +
            '       </button>' +
            '       <button class="odswidget-map-search-box__toggle"' +
            '               ng-hide="expanded"' +
            '               ods-tooltip="Expand the search bar"' +
            '               ods-tooltip-direction="right"' +
            '               translate="ods-tooltip"' +
            '               ng-click="expandSearchBox()">' +
            '           <i class="fa fa-caret-right"></i>' +
            '       </button>' +
            '       <button class="odswidget-map-search-box__toggle"' +
            '               ng-show="expanded"' +
            '               ods-tooltip="Collapse the search bar"' +
            '               translate="ods-tooltip"' +
            '               ods-tooltip-direction="left"' +
            '               ng-click="collapseSearchBox()">' +
            '           <i class="fa fa-caret-left"></i>' +
            '       </button>' +
            '   </div>' +
            '   <ul class="odswidget-map-search-box__suggestions" ' +
            '     ng-class="{\'odswidget-map-search-box__suggestions--expanded\': expanded}"' +
            '       ng-if="!dataSearchActive && userQuery">' +
            '       <li ng-show="userQuery"' +
            '           ng-click="runDataSearch(userQuery)"' +
            '           ng-class="[\'odswidget-map-search-box__search-suggestion\', {\'odswidget-map-search-box__search-suggestion--selected\': selectedIndex === 0}]">' +
            '           <i class="fa fa-search"></i> Search {{userQuery}} in displayed data' +
            '       </li>' +
            '       <li ng-repeat="suggestion in suggestions" ' +
            '           ng-click="moveToSuggestion(suggestion, $index + 1)"' +
            '           ng-class="[\'odswidget-map-search-box__suggestion\', {\'odswidget-map-search-box__suggestion--selected\': selectedIndex === $index + 1}]">' +
            '           <i ng-class="[\'odswidget-map-search-box__suggestion-icon\', getSuggestionIcon(suggestion)]"></i>' +
            '           <span class="odswidget-map-search-box__suggestion-name" ng-bind-html="suggestion._highlightResult.locale_names[0].value"></span>' +
            '           <span class="odswidget-map-search-box__suggestion-localization" ng-bind-html="getLocalization(suggestion)"></span>' +
            '       </li>' +
            '   </ul>' +
            '   <div class="odswidget-map-search-box__data-search" ng-if="dataSearchActive">' +
            '       <ods-spinner ng-if="dataSearchWorking"></ods-spinner>' +
            '       <ul ng-if="!dataSearchWorking && datasetSearchDatasetsCount > 1" class="odswidget-map-search-box__data-search__datasets">' +
            '           <li ng-repeat="result in dataSearchResults" ' +
            '               ng-click="selectResult(result)"' +
            '               class="odswidget-map-search-box__data-search__dataset"' +
            '               ng-class="{\'odswidget-map-search-box__data-search__dataset--active\': selectedResult === result}">' +
            '               <div class="odswidget-map-search-box__data-search__dataset-title" ng-bind="::result.context.dataset.metas.title"></div>' +
            '               <div class="odswidget-map-search-box__data-search__dataset-count">' +
            '                   {{result.nhits}} items' +
            '               </div>' +
            '           </li>' +
            '       </ul>' +
            '       <ul ng-if="!dataSearchWorking && datasetSearchDatasetsCount > 0" class="odswidget-map-search-box__data-search__results">' +
            '           <li ng-repeat="record in currentResults" ' +
            '               class="odswidget-map-search-box__data-search__result"' +
            '               ods-tooltip' +
            '               ods-tooltip-template="getResultPreviewTemplate(selectedResult.context.dataset, record)"' +
            '               ng-click="moveToDataRecord(selectedResult.context.dataset, record)">' +
            '               <i class="fa fa-map-marker odswidget-map-search-box__data-search__result-icon"></i>' +
            '               <span class="odswidget-map-search-box__data-search__result-empty" ng-if="getResultTitle(selectedResult.context.dataset, record) === null" translate>Empty</span>' +
            '               <span ng-if="getResultTitle(selectedResult.context.dataset, record) !== null">{{getResultTitle(selectedResult.context.dataset, record)}}</span>' +
            '           </li>' +
            '       </ul>' +
            '       <div class="odswidget-map-search-box__data-search__no-results" ng-if="!dataSearchWorking && datasetSearchDatasetsCount === 0">' +
            '           No results found for your search' +
            '       </div>' +
            '       <div class="odswidget-map-search-box__data-search__pagination" ng-if="!dataSearchWorking && datasetSearchDatasetsCount > 0">' +
            '           <div class="odswidget-map-search-box__data-search__pagination-counter">' +
            '               {{ selectedResult.nhits }} results' +
            '           </div>' +
            '           <div class="odswidget-map-search-box__data-search__pagination-pages">' +
            '               {{currentResultsStartIndex+1}}' +
            '               -' +
            '               {{selectedResult.nhits|min:(currentResultsStartIndex+11)}}' +
            '               <button type="button" ' +
            '                       ng-click="previousResultPage()" ' +
            '                       ng-disabled="currentResultsStartIndex === 0"' +
            '                       class="odswidget-map-search-box__data-search__pagination-button">' +
            '                   <i class="fa fa-chevron-left"></i>' +
            '               </button>' +
            '               <button type="button" ' +
            '                       ng-click="nextResultPage()" ' +
            '                       ng-disabled="currentResultsStartIndex+10 >= selectedResult.nhits"' +
            '                       class="odswidget-map-search-box__data-search__pagination-button">' +
            '                   <i class="fa fa-chevron-right"></i>' +
            '               </button>' +
            '           </div>' +
            '       </div>' +
            '   </div>' +
            '</div>',
            require: '^odsMap',
            scope: {},
            link: function(scope, element, attrs, mapCtrl) {
                var searchMarkers = [];
                scope.suggestions = [];
                scope.selectedIndex = 0;
                scope.expanded = false;
                scope.runQuery = function(userQuery) {
                    scope.removeSearchMarkers();
                    var loc = MapHelper.getLocationStructure(mapCtrl.getCurrentPosition());
                    AlgoliaPlaces(userQuery, loc.center.join(',')).then(
                        function success(response) {
                            scope.selectedIndex = 0;
                            scope.suggestions = response.data.hits;
                        },
                        function error(response) {

                        }
                    );
                };

                scope.expandSearchBox = function () {
                    scope.expanded = true;
                };

                scope.collapseSearchBox = function () {
                    jQuery('.odswidget-map-search-box__box').blur();
                    scope.expanded = false;
                };

                scope.addSearchMarker = function(coords) {
                    SVGInliner.getPromise(PictoHelper.mapPictoToURL('ods-circle'), 'white').then(function (svg) {
                        var marker = new L.VectorMarker(coords, {
                            clickable: false,
                            color: '#F06644',
                            icon: svg,
                            zIndexOffset: 9999,
                            extraClasses: 'ods-widget__ods-search-marker',
                        });
                        marker.addTo(mapCtrl.getMap());
                        $timeout(function() {
                            marker.setOpacity(1);
                        });
                        searchMarkers.push(marker);
                    });
                };

                scope.removeSearchMarkers = function() {
                    angular.forEach(searchMarkers, function (marker) {
                        marker.setOpacity(0);
                        $timeout(function () {
                            mapCtrl.getMap().removeLayer(marker)
                        }, 300);
                    });
                    searchMarkers = [];
                };

                scope.$on('odsMapInteractiveClick', scope.removeSearchMarkers);

                // Reset search

                scope.resetSearch = function() {
                    // this will trigger then the registered reset callback (see below)
                    mapCtrl.resetMapDataFilter();
                };

                mapCtrl.registerResetCallback(function () {
                    scope.suggestions = [];
                    scope.userQuery = '';
                    scope.stopDataSearch();
                });

                scope.$on('$destroy', scope.resetSearch);
                scope.moveToSuggestion = function(suggestion, index) {
                    if (angular.isDefined(index)) {
                        scope.selectedIndex = index;
                    }
                    var zoom;
                    if (suggestion.is_city) {
                        zoom = 14;
                    } else if (suggestion.is_country) {
                        zoom = 5;
                    } else if (suggestion.is_highway) {
                        zoom = 18;
                    } else {
                        zoom = 21;
                    }

                    scope.addSearchMarker(suggestion._geoloc);
                    mapCtrl.moveMap(suggestion._geoloc, zoom);
                    scope.collapseSearchBox();
                    scope.resetSearch();
                };
                scope.moveToDataRecord = function(dataset, record) {
                    var geoShapeFields = dataset.getFieldsForType('geo_shape');
                    var fieldName, isShape;
                    if (geoShapeFields.length) {
                        fieldName = geoShapeFields[0].name;
                        isShape = true;
                    } else {
                        fieldName = dataset.getFieldsForType('geo_point_2d')[0].name;
                        isShape = false;
                    }

                    if (isShape) {
                        mapCtrl.fitMapToShape(record.fields[fieldName]);
                    } else {
                        mapCtrl.moveMap(record.fields[fieldName], 21);
                    }
                    scope.collapseSearchBox();
                };

                scope.runDataSearch = function(userQuery) {
                    // Apply a filter on the map
                    mapCtrl.applyMapDataFilter(userQuery);
                    // Display the results in a panel
                    // TODO
                    scope.startDataSearch(userQuery, mapCtrl.getActiveContexts());
                };
            },
            controller: ['$scope', '$q', '$compile', 'ODSAPI', function ($scope, $q, $compile, ODSAPI) {

                // Same codes as odsDatalist
                var keyCodes = {
                    RETURNKEY: 13,
                    ESCAPE: 27,
                    UPARROW: 38,
                    DOWNARROW: 40
                };
                $scope.handleKeyDown = function($event) {
                    switch ($event.keyCode) {
                    case keyCodes.UPARROW:
                        $scope.selectedIndex = Math.max(0, $scope.selectedIndex - 1);
                        $event.preventDefault();
                        break;
                    case keyCodes.DOWNARROW:
                        $scope.selectedIndex = Math.min($scope.suggestions.length, $scope.selectedIndex + 1);
                        $event.preventDefault();
                        break;
                    case keyCodes.ESCAPE:
                        $scope.resetSearch();
                        $event.preventDefault();
                        break;
                    case keyCodes.RETURNKEY:
                        if ($scope.selectedIndex === 0) {
                            $scope.runDataSearch($scope.userQuery);
                        } else {
                            $scope.moveToSuggestion($scope.suggestions[$scope.selectedIndex-1]);
                        }
                        $event.preventDefault();
                        break;

                    }
                };

                $scope.dataSearchActive = false;
                $scope.dataSearchWorking = false;
                var searchesTimeouts;
                $scope.startDataSearch = function(userQuery, contexts) {
                    $scope.currentResults = [];
                    $scope.dataSearchActive = true;
                    $scope.dataSearchWorking = true;

                    // First, sort the contexts by title
                    var sortedContexts = contexts.slice(0);
                    $scope.dataSearchResults = sortedContexts
                        .map(function(c) {
                            return {'context': c};
                        }).sort(function(a, b) {
                            var aTitle = a.context.dataset.metas.title,
                                bTitle = b.context.dataset.metas.title;
                            return aTitle > bTitle ? 1 : aTitle < bTitle ? -1 : 0;
                        });
                    var searches = [];
                    if (angular.isArray(searchesTimeouts)) {
                        searchesTimeouts.forEach(function(timeout) { timeout.resolve(); });
                    }
                    searchesTimeouts = [];

                    // TODO: We do one search per context, but we should rather do one search per dataset. The issue is
                    // how to "combine" the filters of 2+ contexts ("OR" on the q, refines are tricker due to disjunctive...)
                    $scope.dataSearchResults.forEach(function(resultObject) {
                        var ctx = resultObject.context;
                        var timeout = $q.defer();
                        var params = angular.extend({}, ctx.parameters, {rows: 0});
                        var promise = ODSAPI.records.search(ctx, params, timeout.promise).then(function(result) {
                            var data = result.data;
                            var datasetId = data.parameters.dataset;
                            resultObject.nhits = data.nhits;
                        });
                        searches.push(promise);
                    });

                    $q.all(searches).then(function(results) {
                        $scope.dataSearchWorking = false;

                        $scope.dataSearchResults = $scope.dataSearchResults.filter(function(r) { return r.nhits > 0; });

                        $scope.datasetSearchDatasetsCount = Object.keys($scope.dataSearchResults).length;

                        // Pre-select the first one, alphabetically
                        if ($scope.dataSearchResults.length) {
                            $scope.selectResult($scope.dataSearchResults[0]);
                        }
                    });
                };

                var selectionQueryTimeout = null;
                $scope.currentResultsStartIndex = 0;
                $scope.selectResult = function(result) {
                    $scope.selectedResult = result;
                    $scope.currentResultsStartIndex = 0;

                    getResultRecords(result);
                };
                var getResultRecords = function(result) {
                    if (selectionQueryTimeout) {
                        selectionQueryTimeout.resolve();
                    }
                    selectionQueryTimeout = $q.defer();
                    var params = angular.extend({}, result.context.parameters, {rows: 10, start: $scope.currentResultsStartIndex});
                    ODSAPI.records.search(result.context, params, selectionQueryTimeout.promise).then(function(response) {
                        selectionQueryTimeout = null;
                        $scope.currentResults = response.data.records;
                    });
                };

                $scope.previousResultPage = function() {
                    $scope.currentResultsStartIndex -= 10;
                    getResultRecords($scope.selectedResult);
                };
                $scope.nextResultPage = function() {
                    $scope.currentResultsStartIndex += 10;
                    getResultRecords($scope.selectedResult);
                };

                $scope.stopDataSearch = function() {
                    if (angular.isArray(searchesTimeouts)) {
                        searchesTimeouts.forEach(function(timeout) { timeout.resolve(); });
                    }
                    searchesTimeouts = [];
                    $scope.dataSearchActive = false;
                    $scope.dataSearchWorking = false;
                };

                $scope.getSuggestionIcon = function(suggestion) {
                    if (suggestion._tags.indexOf('railway') >= 0) {
                        return 'fa fa-train';
                    } else if (suggestion._tags.indexOf('aeroway') >= 0) {
                        return 'fa fa-plane';
                    } else {
                        return 'fa fa-map-marker';
                    }
                };

                $scope.getLocalization = function(suggestion) {
                    var localization = '';

                    ['city', 'administrative', 'country'].forEach(function(prop) {
                        if (angular.isDefined(suggestion[prop])) {
                            if (localization.length > 0) {
                                localization += ', ';
                            }
                            localization += suggestion[prop];
                        }
                    });

                    return localization;
                };

                $scope.getResultTitle = function(dataset, record) {
                    /*
                    Returns the value that should be displayed for a record.

                    It returns the first defined value in the following order:
                    - if a field is configured to be the title of tooltips, it is used
                    - the first "text" field in the dataset
                    - the first field
                    - the first defined value in the fields
                    - null
                     */
                    var value;
                    var configuredTitle = dataset.getExtraMeta('explore', 'map_tooltip_title');
                    if (configuredTitle && angular.isDefined(record.fields[configuredTitle])) {
                        return record.fields[configuredTitle];
                    } else {
                        var textFields = dataset.getFieldsForType('text');
                        if (textFields.length > 0 && angular.isDefined(record.fields[textFields[0].name])) {
                            return record.fields[textFields[0].name];
                        } else {
                            var i;
                            for (i=0; i<dataset.fields.length; i++) {
                                if (angular.isDefined(record.fields[dataset.fields[i]])) {
                                    return record.fields[dataset.fields[i]];
                                }
                            }
                            return null;
                        }
                    }
                };

                var resultPreviewTemplate = '' +
                    '<ul class="odswidget-map-search-box__data-search__result-preview">' +
                    '   <li ng-repeat="item in items" class="odswidget-map-search-box__data-search__result-preview-line">' +
                    '       <div class="odswidget-map-search-box__data-search__result-preview-label">{{item.label}}</div>' +
                    '       <div class="odswidget-map-search-box__data-search__result-preview-value">{{item.value}}</div>' +
                    '   </li>' +
                    '</ul>' +
                    '';
                $scope.getResultPreviewTemplate = function(dataset, record) {
                    var values = [];
                    dataset.fields.forEach(function(f) {
                        if (values.length < 3 && ['text', 'int', 'double', 'date', 'datetime'].indexOf(f.type) >= 0 && angular.isDefined(record.fields[f.name])) {
                            values.push({'label': f.label, 'value': record.fields[f.name]});
                        }
                    });
                    var localScope = $scope.$new(true);
                    localScope.items = values;
                    var compiledPreview = $compile(resultPreviewTemplate)(localScope);
                    // Make sure the elements are rendered
                    localScope.$apply();
                    return compiledPreview.html();
                };
            }]
        };
    }]);

    mod.service('AlgoliaPlaces', ['$http', 'ODSWidgetsConfig', function($http, ODSWidgetsConfig) {
        /*
            Documentation: https://community.algolia.com/places/rest.html
         */
        var options = {};
        if (ODSWidgetsConfig.algoliaPlacesApplicationId) {
            options.headers = {
                'X-Algolia-Application-Id': ODSWidgetsConfig.algoliaPlacesApplicationId,
                'X-Algolia-API-Key': ODSWidgetsConfig.algoliaPlacesAPIKey
            };
        }
        return function(query, aroundLatLng) {
            var queryOptions = angular.extend({}, options);
            queryOptions.params = {
                'query': query,
                'aroundLatLngViaIP': false,
                'language': ODSWidgetsConfig.language || 'en',
                'hitsPerPage': 5
            };
            if (aroundLatLng) {
                queryOptions.params.aroundLatLng = aroundLatLng;
            }
            return $http.get('https://places-dsn.algolia.net/1/places/query', queryOptions);
        };
    }]);

}());
