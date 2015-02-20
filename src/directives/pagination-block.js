(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsPaginationBlock', ['$location', function($location) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPaginationBlock
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} perPage How many results should be contained per page.
         * @param {boolean} [nofollow=false] If true, all links within the widget (used to change page) will contain a `rel="nofollow"` attribute.
         * It should be used if you don't want search engines to crawl all the pages of your widget.
         * @description
         * This widget displays a pagination control that you can use to make the context "scroll" through a list of results. It doesn't display
         * results by itself, and therefore should be paired with another widget. Note that by itself it also doesn't control the number of results fetched by the context,
         * and the `perPage` parameter should be the same as the `rows` parameter on the context.
         *
         * If you just want to display results with a pagination system, you can have a look at {@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}
         * which already include this directive (if the relevant parameter is active on the widget).
         */

        /*
        This directive builds a pagination block.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-pagination" ng-show="pages.length > 1">' +
                    '<ul>' +
                    '    <li ng-repeat="page in pages" ng-class="{\'active\': page.start == (context.parameters.start||0)}">' +
                    '        <a ng-if="nofollow==\'true\'" ng-click="click($event, page.start)" href="?start={{ page.start }}" rel="nofollow">{{ page.label }}</a>' +
                    '        <a ng-if="nofollow!=\'true\'" ng-click="click($event, page.start)" href="?start={{ page.start }}">{{ page.label }}</a>' +
                    '    </li>' +
                    '</ul>' +
                    '</div>',
            scope: {
                context: '=',
                perPage: '@',
                nofollow: '@'
            },
            controller: ['$scope', '$anchorScroll', function($scope, $anchorScroll) {
                $scope.location = $location;
                $scope.pages = [];

                $scope.click = function(e, start) {
                    e.preventDefault();
                    $scope.context.parameters.start = start;
                };
                var buildPages = function() {
                    if ($scope.context.nhits === 0) {
                        $scope.pages = [];
                        return;
                    }
                    var pagesCount = Math.max(1, Math.floor(($scope.context.nhits-1) / $scope.perPage) + 1);
                    var pages = [];
                    var pageNum;
                    if (pagesCount <= 8) {
                        for (pageNum=1; pageNum<=pagesCount; pageNum++) {
                            pages.push({'label': pageNum, 'start': (pageNum-1)*$scope.perPage});
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
                            for (pageNum=1; pageNum<=8; pageNum++) {
                                pages.push({'label': pageNum, 'start': (pageNum-1)*$scope.perPage});
                            }
                            pages.push({'label': '>>', 'start': (pagesCount-1)*$scope.perPage});
                        } else if (currentPage >= (pagesCount-4)) {
                            pages.push({'label': '<<', 'start': 0});
                            for (pageNum=(pagesCount-7); pageNum<=pagesCount; pageNum++) {
                                pages.push({'label': pageNum, 'start': (pageNum-1)*$scope.perPage});
                            }
                        } else {
                            pages.push({'label': '<<', 'start': 0});
                            for (pageNum=(currentPage-3); pageNum<=(currentPage+3); pageNum++) {
                                pages.push({'label': pageNum, 'start': (pageNum-1)*$scope.perPage});
                            }
                            pages.push({'label': '>>', 'start': (pagesCount-1)*$scope.perPage});
                        }
                    }
                    $scope.pages = pages;
                };

                var unwatch = $scope.$watch('context', function(nv, ov) {
                    if (nv) {
                        $scope.$watch('context.nhits', function(newValue, oldValue) {
                            if ($scope.context.nhits !== undefined && $scope.perPage)
                                buildPages();
                        });
                        $scope.$watch('perPage', function(newValue, oldValue) {
                            if ($scope.context.nhits && $scope.perPage)
                                buildPages();
                        });
                        $scope.$watch('context.parameters.start', function(newValue, oldValue) {
                            if ($scope.context.nhits && $scope.perPage)
                                buildPages();
                            $anchorScroll();
                        });
                        unwatch();
                    }
                });

            }]
        };
    }]);

}());