(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTagCloud', ['ODSAPI', '$location', function (ODSAPI, $location) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTagCloud
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context
         *     {@link ods-widgets.directive:odsCatalogContext Catalog Context} or
         *     {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} facetName Name of the facet to build the tag cloud from
         * @param {number} [max=all] Maximum number of tags to show in the cloud
         * @param {string} [redirectTo=none] URL.
         * If specified, a click on any tag will redirect to the given URL and apply the filter there.
         * @param {CatalogContext|DatasetContext} [contextToRefine=current context] Specifies the context that will be
         * refined. If not specified at all, the refined context will be the one defined through the `context` parameter.
         *
         * @description
         * The odsTagCloud widget displays a "tag cloud" of the values available in a facet.
         * This facet can be the facet of a dataset or a facet from the dataset catalog.
         * The "weight" (size) of a tag depends on the number of occurrences (count) for this tag.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="catalog" catalog-domain="data.opendatasoft.com">
         *              <ods-tag-cloud context="catalog" facet-name="keyword"></ods-tag-cloud>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        function median(facets) {
            var half = Math.floor(facets.length / 2);
            if (facets.length % 2) return facets[half].count;
            else return (facets[half - 1].count + facets[half].count) / 2.0;
        }

        function aggregateArrays(facets, median) {
            var array1 = jQuery.grep(facets, function (value) {
                return value.count >= median;
            });
            var array2 = jQuery.grep(facets, function (value) {
                return value.count <= median;
            });
            var obj = [
                {count: array1.length, min: array1[array1.length - 1].count, max: array1[0].count},
                {count: array2.length, min: array2[array2.length - 1].count, max: array2[0].count}
            ];
            obj[0].delta = obj[0].max - obj[0].min;
            obj[1].delta = obj[1].max - obj[1].min;
            return obj;
        }

        function getFacet(facet, median, aggregateArrays, domainUrl) {
            var delta = (facet.count >= median ? aggregateArrays[0].delta : aggregateArrays[1].delta) / 2;
            var weight;

            if (facet.count >= 2 * delta) {
                weight = 1;
            } else if (facet.count >= delta && facet.count < 2 * delta) {
                weight = 2;
            } else {
                weight = 3;
            }
            weight = facet.count >= median ? weight : weight + 3;

            facet = {
                count: facet.count,
                name: facet.name,
                opacity: ((((7 - weight) + 4) / 10) + 0.05).toFixed(2),
                size: ((7 - weight) / 3).toFixed(1),
                weight: weight
            };
            facet.size = weight !== 6 ? facet.size : parseFloat(facet.size) + 0.3;
            return facet;
        }

        function isContextRefined(context, facetName, tagName) {
            var refines = context.parameters['refine.' + facetName];
            return (angular.isDefined(refines) && (angular.isArray(refines) && refines.indexOf(tagName) > -1 || refines === tagName));
        }

        function shuffle(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        }

        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-tag-cloud">' +
            '    <ul class="odswidget-tag-cloud__tag-list">' +
            '        <li class="odswidget-tag-cloud__no-data-label" ng-hide="tags" translate>No data available yet</li>' +
            '        <li ng-repeat="tag in tags" ' +
            '            class="odswidget-tag-cloud__tag" ' +
            '            ng-class="{\'odswidget-tag-cloud__tag--selected\': tag.selected}"'+
            '            ng-style="{\'font-size\': tag.size + \'em\', \'opacity\': tag.opacity}">' +
            '            <a ng-click="refine(tag.name)" href="">' +
            '                {{ tag.name }}' +
            '            </a>' +
            '        </li>' +
            '    </ul>' +
            '</div>',
            scope: {
                context: '=',
                facetName: '@',
                max: '@?',
                redirectTo: '@?',
                contextToRefine: '=?'
            },
            controller: ['$scope', function ($scope) {
                var dataset_search = ODSAPI.uniqueCall(ODSAPI.records.search),
                    catalog_search = ODSAPI.uniqueCall(ODSAPI.datasets.search);

                $scope.refine = function (tagName) {
                    if ($scope.redirectTo) {
                        var refine_param = 'refine.' + $scope.facetName + '=' + tagName;
                        var join = $scope.redirectTo.indexOf('?') > -1 ? '&' : '?';
                        window.location = $scope.redirectTo + join + refine_param;
                    } else if ($scope.contextToRefine) {
                        $scope.contextToRefine.toggleRefine($scope.facetName, tagName);
                    } else {
                        $scope.context.toggleRefine($scope.facetName, tagName);
                    }
                };

                var refresh = function () {
                    var query;
                    var queryParams = {
                        'rows': 0,
                        'facet': $scope.facetName
                    };
                    if ($scope.context.type === 'catalog') {
                        query = catalog_search($scope.context, queryParams);
                    } else {
                        queryParams = jQuery.extend({}, $scope.context.parameters, queryParams);
                        query = dataset_search($scope.context, queryParams);
                    }
                    query.then(function (response) {
                        var data = response.data;
                        if (data.facet_groups) {
                            $scope.tags = data.facet_groups[0].facets;
                            if ($scope.max) {
                                $scope.tags = $scope.tags.slice(0, $scope.max);
                            }
                            var m = median($scope.tags);
                            for (var i = 0; i < $scope.tags.length; i++) {
                                $scope.tags[i] = getFacet($scope.tags[i], m, aggregateArrays($scope.tags, m), $scope.context.domainUrl);
                                $scope.tags[i].selected = isContextRefined(
                                    $scope.contextToRefine ? $scope.contextToRefine : $scope.context,
                                    $scope.facetName,
                                    $scope.tags[i].name
                                );
                            }
                            $scope.tags = shuffle($scope.tags);
                        }
                    });
                };

                $scope.$watch('context', function (nv, ov) {
                    if ($scope.context.type === 'catalog' || $scope.context.type === 'dataset' && $scope.context.dataset) {
                        refresh();
                    }
                }, true);
            }]
        };
    }]);

}());
