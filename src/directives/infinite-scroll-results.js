(function() {
    "use strict";

    var mod = angular.module('ods-widgets');

    var getScrollParent = function (element, $window) {
        // This code is copied from ng-infinite-scroll.js so the scrollParent is the same in both our and their directives
        var $scrollParent;
        $scrollParent = element.parents().filter(function() {
            return /(auto|scroll)/.test(jQuery.css(this, 'overflow') + jQuery.css(this, 'overflow-y'));
        }).eq(0);

        if ($scrollParent.length === 0) {
            $scrollParent = angular.element($window);
        }
        return $scrollParent;
    };

    mod.directive('odsInfiniteScrollResults', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsInfiniteScrollResults
         * @scope
         * @restrict A
         * @param {CatalogContext|DatasetContext} odsResultsContext {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {boolean} [scrollTopWhenRefresh=false] If the context parameters change (which will probably change the results), scroll to the top of the window.
         * @param {string} [listClass=none] A class (or classes) that will be applied to the list of result.
         * @param {string} [resultClass=none] A class (or classes) that will be applied to each result.
         * @param {string} [noResultsMessage] A sentence that will be displayed if there are no results.
         * @param {string} [noMoreResultsMessage] A sentence that will be displayed if there are no more results to fetch.
         * @param {string} [noDataMessage] A sentence that will be displayed if the context has no content at all.
         * @description
         * This widget displays the results of a query inside an infinite scroll list. It uses the HTML template inside the widget tag,
         * and repeats it for each result.
         *
         * If used with a {@link ods-widgets.directive:odsCatalogContext Catalog Context}, for each result, the following AngularJS variables are available:
         *
         *  * item.datasetid: Dataset identifier of the dataset
         *  * item.metas: An object holding the key/values of metadata for this dataset
         *
         * If used with a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, for each result, the following AngularJS variables are available:
         *
         *  * item.datasetid: Dataset identifier of the dataset this record belongs to
         *  * item.fields: an object hold all the key/values for the record
         *  * item.geometry: if the record contains geometrical information, this object is present and holds its GeoJSON representation
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="example"
         *                               example-domain="https://data.opendatasoft.com/">
         *              <ul>
         *                  <ods-infinite-scroll-results context="example">
         *                      <li>
         *                          <strong>{{item.metas.title}}</strong>
         *                          (<a ng-href="{{context.domainUrl + '/explore/dataset/' + item.datasetid + '/'}}" target="_blank">{{item.datasetid}}</a>)
         *                      </li>
         *                  </ods-infinite-scroll-results>
         *              </ul>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            template: '' +
                '<div class="{{listClass}} odswidget-infinite-scroll-results" infinite-scroll="loadMore()" infinite-scroll-distance="2" infinite-scroll-disabled="fetching">' +
                '   <div class="{{resultClass}}" ng-repeat="item in results" inject>' +
                '   </div>' +
                '   <div class="odswidget-infinite-scroll-results__message-container">' +
                '       <ods-spinner class="odswidget-infinite-scroll-results__spinner" ng-if="fetching"></ods-spinner>'+
                '       <div class="odswidget-infinite-scroll-results__no-more-results-message" ng-if="!fetching && results.length > 0">{{ noMoreResultsMessage }}</div>'+
                '       <div class="odswidget-infinite-scroll-results__no-results-message ng-cloak" ng-if="!fetching && results.length == 0 && context.getActiveFilters().length > 0"">{{ noResultsMessage }}</div>' +
                '       <div class="odswidget-infinite-scroll-results__no-results-message ng-cloak" ng-if="!fetching && results.length == 0 && context.getActiveFilters().length == 0" ng-bind-html="noDataMessage"></div>' +
                '   </div>' +
                '</div>',
            scope: {
                context: '=',
                resultClass: '@',
                listClass: '@',
                noMoreResultsMessage: '@',
                noResultsMessage: '@',
                noDataMessage: '@',
                scrollTopWhenRefresh: '='
            },
            transclude: true,
            controller: ['$scope', '$window', '$q', 'ODSAPI', '$element', function($scope, $window, $q, ODSAPI, $element) {
                var page = 0;
                var noMoreResults = false;
                $scope.fetching = false;
                $scope.results = [];
                var initialRequest = $q.defer();
                var $scrollParent = getScrollParent($element, $window);
                var dataset_search = ODSAPI.uniqueCall(ODSAPI.records.search),
                    catalog_search = ODSAPI.uniqueCall(ODSAPI.datasets.search);

                var fetchResults = function(init) {
                    if (noMoreResults) {
                        return;
                    }
                    if (init) {
                        page = 0;
                    } else {
                        page += 1;
                    }
                    var start = page * 10;
                    var func;

                    $scope.fetching = true;
                    if ($scope.context.type === 'catalog') {
                        // FIXME: the extrametas parameter has been added here because the only place we use this directive
                        // requires it, and we can't pre-set the context parameters since it is urlsync'd,
                        // but we may be able to find something less "hardcoded".
                        catalog_search($scope.context, {rows: 10, start: start, extrametas: true, interopmetas: true}).success(function(data) {
                            noMoreResults = data.datasets.length === 0;
                            renderResults(data.datasets, init);
                        });
                    } else {
                        var params = angular.extend({}, $scope.context.parameters, {rows: 10, start: start});
                        dataset_search($scope.context, params).success(function(data) {
                            noMoreResults = data.records.length === 0;
                            renderResults(data.records, init);
                            initialRequest.resolve();
                        });
                    }
                };

                var renderResults = function(results, init) {
                    if (init) {
                        $scope.results = [];
                    }
                    $scope.results = $scope.results.concat(results);
                    $scope.fetching = false;
                    if (init && $scope.scrollTopWhenRefresh) {
                        $scrollParent[0].scrollTo(0, 0);
                    }
                    if (init) {
                        $scrollParent.trigger('scroll');
                    }

                    // trigger window resize event
                    try {
                        window.dispatchEvent(new Event('resize'));
                    } catch (error) {
                        jQuery(window).trigger('resize');
                    }
                };

                $scope.loadMore = function() {
                    if ($scope.context.type === 'dataset') {
                        initialRequest.promise.then(function() {
                            fetchResults(false);
                        });
                    } else {
                        fetchResults(false);
                    }
                };

                $scope.$watch('context.parameters', function(nv, ov) {
                    if (nv !== ov) {
                        noMoreResults = false;
                        fetchResults(true);
                    }
                }, true);

                if ($scope.context.type === 'dataset') {
                    $scope.context.wait().then(function() {
                        fetchResults(true);
                    });
                } else {
                    fetchResults(true);
                }
            }]
        };
    });
}());
