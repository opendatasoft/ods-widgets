(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    var MAX_RECORDS = 10000; // Maximum reachable record via the search endpoint

    mod.directive('odsPaginationBlock', ['$location', function ($location) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPaginationBlock
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} [perPage=10] Controls the number of results per page.
         * @param {boolean} [nofollow=false] When set to `true`, all links within the widget (used to change page) will contain a `rel="nofollow"` attribute.
         * It should be used if you don't want search engines to crawl all the pages of your widget.
         * @param {string} [containerIdentifier] By default, changing the page will trigger a scroll to the top of the window.
         * You can use this parameter to specify the ID of the element that will contain the results (e.g., "my-results")
         * so that the behavior is more precise:
         * - If your results are inside a container that is used to vertically scroll the results, the container's scroll
         * will be set at the start.
         * - If your results are inside a container that doesn't have a scrollbar, the page itself will scroll to the start of the container.
         * Note: In the second situation, some CSS properties may prevent the widget from understanding that it doesn't have a scrollbar. As a result, the widget won't be able to scroll scrolling to the top of the container.
         * This issue may be caused by the odsPaginationBlock widget slightly overflowing its container, typically because of large fonts or higher line-height settings.
         * In this situation, forcing a height on the widget may fix the issue.
         * @description
         * The odsPaginationBlock widget displays a pagination control that you can use to make the context "scroll" through a list of results.
         *
         * The widget doesn't display results. Therefore, it should be paired with another widget.
         * The widget doesn't control the number of results fetched by the context. The `perPage` parameter should be the same as the `rows` parameter on the context.
         *
         * If you just want to display results with a pagination system, you can use {@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}, which already includes this directive (if the relevant parameter is active on the widget).
         */

        /*
        This directive builds a pagination block.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<nav role="navigation" aria-label="Pagination navigation" translate="aria-label" class="odswidget odswidget-pagination" ng-show="pages.length > 1">' +
                '    <ul class="odswidget-pagination__page-list">' +
                '        <li class="odswidget-pagination__page" ng-repeat="page in pages">' +
                '            <a class="odswidget-pagination__page-link" ' +
                '               ng-class="{\'odswidget-pagination__page-link--active\': page.start == (context.parameters.start||0)}" ' +
                '               ng-attr-rel="{{nofollow?\'nofollow\':undefined}}"' +
                '               ng-attr-aria-label="{{page.ariaLabel?page.ariaLabel:undefined}}"' +
                '               ng-attr-aria-current="{{(page.start == (context.parameters.start||0))}}" ' +
                '               ng-click="click($event, page.start)" ' +
                '               href="?start={{ page.start }}" ' +
                '               rel="nofollow">{{ page.label }}</a>' +
                '        </li>' +
                '    </ul>' +
                '</nav>',
            scope: {
                context: '=',
                perPage: '@',
                nofollow: '@',
                containerIdentifier: '@'
            },
            controller: ['$scope', '$anchorScroll', 'translate', function ($scope, $anchorScroll, translate) {
                $scope.location = $location;
                $scope.pages = [];
                $scope.perPage = $scope.perPage || 10;

                $scope.click = function (e, start) {
                    e.preventDefault();
                    $scope.context.parameters.start = start;
                };
                var buildPages = function () {
                    if ($scope.context.nhits === 0) {
                        $scope.pages = [];
                        return;
                    }
                    var maxHits = Math.min(MAX_RECORDS, $scope.context.nhits);
                    var pagesCount = Math.max(1, Math.floor((maxHits - 1) / $scope.perPage) + 1);
                    var pages = [];
                    var pageNum;
                    if (pagesCount <= 8) {
                        for (pageNum = 1; pageNum <= pagesCount; pageNum++) {
                            pages.push({ 'label': pageNum, 'start': (pageNum - 1) * $scope.perPage });
                        }
                    } else {
                        // If too many items, cut them : "first", the 3 before the current page,
                        // the current page, the 3 after, and "last"
                        var currentPage;
                        if (!$scope.context.parameters.start) {
                            currentPage = 1;
                        } else {
                            currentPage = Math.floor($scope.context.parameters.start / $scope.perPage) + 1;
                        }
                        if (currentPage <= 5) {
                            for (pageNum = 1; pageNum <= 8; pageNum++) {
                                pages.push({ 'label': pageNum, 'start': (pageNum - 1) * $scope.perPage });
                            }
                            pages.push({ 'label': '>>', 'ariaLabel': translate('Last page'), 'start': (pagesCount - 1) * $scope.perPage });
                        } else if (currentPage >= (pagesCount - 4)) {
                            pages.push({ 'label': '<<', 'ariaLabel': translate('First page'), 'start': 0 });
                            for (pageNum = (pagesCount - 7); pageNum <= pagesCount; pageNum++) {
                                pages.push({ 'label': pageNum, 'start': (pageNum - 1) * $scope.perPage });
                            }
                        } else {
                            pages.push({ 'label': '<<', 'ariaLabel': translate('First page'), 'start': 0 });
                            for (pageNum = (currentPage - 3); pageNum <= (currentPage + 3); pageNum++) {
                                pages.push({ 'label': pageNum, 'start': (pageNum - 1) * $scope.perPage });
                            }
                            pages.push({ 'label': '>>', 'ariaLabel': translate('Last page'), 'start': (pagesCount - 1) * $scope.perPage });
                        }
                    }
                    $scope.pages = pages;
                };

                var unwatch = $scope.$watch('context', function (nv, ov) {
                    if (nv) {
                        $scope.$watch('context.nhits', function (newValue, oldValue) {
                            if ($scope.context.nhits !== undefined && $scope.perPage)
                                buildPages();
                        });
                        $scope.$watch('perPage', function (newValue, oldValue) {
                            $scope.perPage = $scope.perPage || 10;
                            if ($scope.context.nhits && $scope.perPage)
                                buildPages();
                        });
                        $scope.$watch('context.parameters.start', function (newValue, oldValue) {
                            if ($scope.context.nhits && $scope.perPage)
                                buildPages();
                            if (angular.isDefined(newValue) || angular.isDefined(oldValue)) {
                                var containerElement;
                                if ($scope.containerIdentifier) {
                                    containerElement = document.getElementById($scope.containerIdentifier);
                                }

                                if (containerElement) {
                                    if (containerElement.scrollHeight === containerElement.clientHeight) {
                                        // This is "flat" container with no scrollbar, we just want to move the page's
                                        // entire scroll there.
                                        $anchorScroll($scope.containerIdentifier);
                                    } else {
                                        // The container contains a scrollbar, we just want to get the top of that scroll
                                        containerElement.scrollTop = 0;
                                    }
                                } else {
                                    $anchorScroll();
                                }
                            }
                        });
                        unwatch();
                    }
                });

            }]
        };
    }]);

}());
