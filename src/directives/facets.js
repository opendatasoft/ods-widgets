(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacets', function($compile, translate) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFacets
         * @scope
         * @restrict E
         * @param {DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @description
         * This widget displays filters (facets) for a dataset or a domain's catalog of datasets, allowing the users
         * to dynamically "refine" on one or more categories for the context, typically to restrict the data displayed
         * by another widget such as {@link ods-widgets.directive:odsTable odsTable}.
         *
         * Used alone without any configuration, the widget will display by default filters from all the "facet" fields
         * of a dataset if it is used with a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, or based on
         * typical metadata from a dataset catalog if used with a {@link ods-widgets.directive:odsCatalogContext Catalog Context}.
         *
         * <pre>
         *     <ods-facets context="mycontext"></ods-facets>
         * </pre>
         *
         * To configure which facets are displayed, you can use the odsFacet directive within the odsFacets widget. You can also
         * use regular HTML within the odsFacets widget:
         * <pre>
         *     <ods-facets context="mycontext">
         *         <h3>First field</h3>
         *         <ods-facet name="myfield"></ods-facet>
         *
         *         <h3>Second field</h3>
         *         <ods-facet name="mysecondfield"></ods-facet>
         *     </ods-facets>
         * </pre>
         *
         *
         * The odsFacet directive supports the following parameters:
         *
         * - **`name`** {@type string} the name of the field to display the filter on
         *
         * - **`title`** {@type string} (optional) a title to display above the filters
         *
         * - **`sort`** {@type string} (optional, default is count) How to sort the categories: either `count`, `-count` (sort by number of items in each category),
         * `num`, `-num` (sort by the name of category if it is a number), `alphanum`, `-alphanum` (sort by the name of the category).
         *
         * - **`visible-items`** {@type number} (optional, default 6) the number of categories to show; if there are more,
         * they are collapsed and can be expanded by clicking on a "more" link.
         *
         * - **`hide-if-single-category`** {@type boolean} (optional) if 'true', don't show the filter for that facet if there is
         * only one available category to refine on.
         *
         * - **`hide-category-if`** {@type string} (optional) an AngularJS expression to evaluate; if it evaluates to true, then
         * the category is displayed. You can use `category.name` (the value of the category), `category.path` (the complete path
         * to the category, including hierarchical levels) and `category.state` (refined, excluded, or displayed) in the expression.
         *
         * <pre>
         *     <ods-facets context="mycontext">
         *         <ods-facet name="myfield" sort="-num" visible-items="10"></ods-facet>
         *         <ods-facet name="mysecondfield" hide-if-single-category="true" hide-category-if="category.name == 'hiddencategory'"></ods-facet>
         *     </ods-facets>
         * </pre>
         *
         * You can write HTML within the odsFacet tag to change the display template of each category. The available variables
         * within the template are `facetName` (the name of the field that the filter is based on), `category.name`
         * (the value of the category), `category.path` (the complete path to the category, including hierarchical levels)
         * and `category.state` (refined, excluded, or displayed).
         *
         * <pre>
         *     <ods-facets context="mycontext">
         *         <ods-facet name="myfield">
         *             {{category.name}} @ {{category.state}}
         *         </ods-facet>
         *     </ods-facets>
         * </pre>
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="events"
         *                               events-domain="public.opendatasoft.com"
         *                               events-dataset="evenements-publics-cibul">
         *              <div class="row-fluid">
         *                  <div class="span4">
         *                      <ods-facets context="events">
         *                          <ods-facet name="updated_at" title="Date"></ods-facet>
         *
         *                          <h3>
         *                              <i class="icon-tags"></i> Tags
         *                          </h3>
         *                          <ods-facet name="tags">
         *                              <i class="icon-tag"></i> {{category.name}}
         *                          </ods-facet>
         *                      </ods-facets>
         *                  </div>
         *                  <div class="span8">
         *                      <ods-map context="events"></ods-map>
         *                  </div>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        var buildFacetTagsHTML = function(scope, element, facets) {
            var html = '';

            angular.forEach(facets, function(facet) {
                html += '<ods-facet ' +
                    'name="'+facet.name+'" ' +
                    'title="'+(facet.title || facet.name)+'" ' +
                    'sort="'+(facet.sort || '')+'" ' +
                    'hide-if-single-category="'+(facet.hideIfSingleCategory ? 'true' : 'false')+'" ' +
                    'hide-category-if="'+(facet.hideCategoryIf || '')+'"' +
                    '>'+(facet.template || '')+'</ods-facet>';
            });
            var tags = angular.element(html);
            element.append(tags);
            $compile(tags)(scope);

        };
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                facetsConfig: '='
            },
            compile: function(tElement) {
                var childrenCount = tElement.children().length;
                return function(scope, element) {
                    if (scope.facetsConfig) {
                        buildFacetTagsHTML(scope, element, scope.facetsConfig);
                        scope.init();
                    } else if (childrenCount === 0) {
                        // By default, we add all the available facets
                        var facets;

                        var unwatchContext = scope.$watch('context', function() {
                            if (scope.context) {
                                unwatchContext();
                                if (scope.context.type === 'catalog') {
                                    facets = [
                                        {name: 'modified', title: translate('Modified')},
                                        {name: 'publisher', title: translate('Publisher')},
                                        {name: 'keyword', title: translate('Keyword')},
                                        {name: 'theme', title: translate('Theme')}
                                    ];
                                    buildFacetTagsHTML(scope, element, facets);
                                    scope.init();
                                } else {
                                    var unwatch = scope.$watch('context.dataset', function(nv) {
                                        if (nv) {
                                            unwatch();
                                            facets = angular.copy(scope.context.dataset.getFacets());
                                            angular.forEach(facets, function(f) {
                                                f.title = f.label;
                                                delete f.label;
                                            });
                                            buildFacetTagsHTML(scope, element, facets);
                                            scope.init();
                                        }
                                    }, true);
                                }
                            }
                        }, true);
                    } else {
                    // We're starting the queries from here because at that time we are sure the children (odsFacets tags)
                    // are ready and have registered themselves.
                        scope.init();
                    }
                };
            },
            controller: ['$scope', 'ODSAPI', function($scope, ODSAPI) {
                $scope.facets = [];
                $scope.init = function() {
                    // Commented until we no longer need the call to refresh the nhits on the context
//                    if ($scope.facets.length === 0) {
//                        return;
//                    }
                    $scope.$watch(function() {
                        // FIXME: Generalize this and use a whitelist https://github.com/opendatasoft/ods-widgets/issues/13
                        var params = angular.copy($scope.context.parameters);
                        if (params.sort) {
                            delete params.sort;
                        }
                        if (params.start) {
                            delete params.start;
                        }
                        if (params.tab) {
                            delete params.tab;
                        }
                        if (params.dataChart) {
                            delete params.dataChart;
                        }
                        if ($scope.context.type === 'dataset') {
                            return [params, $scope.context.dataset];
                        } else {
                            return params;
                        }
                    }, function() {
                        if ($scope.context.type === 'catalog' || $scope.context.dataset) {
                            if (angular.isDefined($scope.context.parameters.start)) {
                                delete $scope.context.parameters.start;
                            }
                            $scope.refreshData();
                        }
                    }, true);
                };

                $scope.refreshData = function() {
                    var params = angular.extend({}, $scope.context.parameters, {
                        rows: 0,
                        facet: $scope.facets.map(function(facetInfo) { return facetInfo.name; })
                    });
                    $scope.facets.map(function(facetInfo) {
                        if (facetInfo.sort) {
                            params['facetsort.'+facetInfo.name] = facetInfo.sort;
                        }
                    });

                    var req;
                    if ($scope.context.type === 'dataset') {
                        req = ODSAPI.records.search($scope.context, params);
                    } else {
                        req = ODSAPI.datasets.search($scope.context, params);
                    }

                    req.success(function(data) {
                        $scope.context.nhits = data.nhits;
                        var facetGroup, categories, facetItem;
                        angular.forEach($scope.facets, function(facet) {
                            facet.categories.splice(0, facet.categories.length);
                        });
                        if (data.facet_groups) {
                            for (var i=0; i<data.facet_groups.length; i++) {
                                facetGroup = data.facet_groups[i];
                                facetItem = $scope.facets.filter(function(f) { return f.name === facetGroup.name; });
                                if (facetItem.length > 0) {
                                    categories = facetItem[0].categories;
                                    // Add all the categories in the array
                                    Array.prototype.push.apply(categories, facetGroup.facets);
                                }
                            }
                        }
                    });
                };

                this.registerFacet = function(name, sort) {
                    var categories = [];
                    $scope.facets.push({'name': name, 'categories': categories, 'sort': sort});
                    return categories;
                };

                this.toggleRefinement = function(facetName, path) {
                    var refineKey = 'refine.'+facetName;
                    if (angular.isDefined($scope.context.parameters[refineKey])) {
                        // There is at least one refine already
                        var refines = angular.copy($scope.context.parameters[refineKey]);
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
                            refines.push(path);
                        }

                        if (refines.length === 0) {
                            delete $scope.context.parameters[refineKey];
                        } else {
                            $scope.context.parameters[refineKey] = refines;
                        }
                    } else {
                        $scope.context.parameters[refineKey] = path;
                    }
                };
            }]
        };
    });

    mod.directive('odsFacet', function() {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                name: '@',
                title: '@',
                visibleItems: '@',
                hideIfSingleCategory: '@',
                hideCategoryIf: '@',
                sort: '@'
            },
            template: function(tElement) {
                tElement.data('facet-template', tElement.html());
                return '<div class="odswidget odswidget-facet">' +
                '<h3 class="facet-title" ng-if="title && categories.length && visible()">{{title}}</h3>' +
                '<ods-facet-category-list ng-if="visible()" facet-name="{{ name }}" hide-category-if="{{ hideCategoryIf }}" categories="categories" template="{{ customTemplate }}"></ods-facet-category-list>' +
                '</div>';
            },
            require: '^odsFacets',
            link: function(scope, element, attrs, facetsCtrl) {
                if (angular.isUndefined(facetsCtrl)) {
                    console.log('ERROR : odsFacet must be used within an odsFacets tag.');
                }
                scope.categories = facetsCtrl.registerFacet(scope.name, scope.sort);
                scope.facetsCtrl = facetsCtrl;

            },
            controller: ['$scope', '$element', function($scope, $element) {
                $scope.visibleItemsNumber = $scope.visibleItems || 6;
                this.toggleRefinement = function(path) {
                    $scope.facetsCtrl.toggleRefinement($scope.name, path);
                };
                this.getVisibleItemsNumber = function() {
                    return $scope.visibleItemsNumber;
                };
                $scope.visible = function() {
                    return !(angular.isString($scope.hideIfSingleCategory) && $scope.hideIfSingleCategory.toLowerCase() === 'true' && $scope.categories.length === 1 && $scope.categories[0].state !== 'refined');
                };
                // Is there a custom template into the directive's tag?
                $scope.customTemplate = $element.data('facet-template');
            }]
        };
    });

    mod.directive('odsFacetCategoryList', function() {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                categories: '=',
                template: '@',
                facetName: '@',
                hideCategoryIf: '@'
            },
            require: '^odsFacet',
            template: '<ul class="category-list">' +
                '<li ng-repeat="category in categories">' +
                '<ods-facet-category ng-if="!categoryIsHidden(category)" facet-name="{{ facetName }}" category="category" template="{{template}}" ng-show="visible($index)"></ods-facet-category>' +
                '</li>' +
                '<li ng-if="visibleItems < categories.length" class="expansion-control">' +
                '<a ng-hide="expanded" href="#" ng-click="toggle($event)" translate>More</a>' +
                '<a ng-show="expanded" href="#" ng-click="toggle($event)" translate>Less</a>' +
                '</li>' +
                '</ul>',
            link: function(scope, element, attrs, facetCtrl) {
                scope.expanded = false;
                scope.visibleItems = facetCtrl.getVisibleItemsNumber();
                scope.visible = function(index) {
                    return scope.expanded || index < scope.visibleItems;
                };
                scope.toggle = function(event) {
                    event.preventDefault();
                    scope.expanded = !scope.expanded;
                };
                scope.categoryIsHidden = function(category) {
                    if (!scope.hideCategoryIf) {
                        return false;
                    }
                    var testScope = scope.$new(false);
                    testScope.category = category;
                    return testScope.$eval(scope.hideCategoryIf);
                };
            }
        };
    });

    mod.directive('odsFacetCategory', function($compile) {
        return {
            restrict: 'E',
            replace: true,
            require: '^odsFacet',
            scope: {
                category: '=',
                facetName: '@',
                template: '@'
            },
            template: '<div class="odswidget odswidget-facet-category">' +
                '   <a href="#" ng-click="toggleRefinement($event, category.path)" ng-class="{\'refined\': category.state === \'refined\'}">' +
                '   </a>' +
                '</div>',
            link: function(scope, element, attrs, facetCtrl) {
                scope.toggleRefinement = function($event, path) {
                    $event.preventDefault();
                    facetCtrl.toggleRefinement(path);
                };
                var template = scope.template || '<span class="category-name">{{ category.name }}</span> <span class="category-count">{{ category.count|number }}</span>';
                element.find('a').append($compile('<div>'+template+'</div>')(scope)[0]);

                if (scope.category.facets) {
                    var sublist = angular.element('<ods-facet-category-list categories="category.facets" template="{{template}}"></ods-facet-category-list>');
                    element.find('a').after(sublist);
                    $compile(sublist)(scope);
                }

            },
            controller: ['$scope', function($scope) {

            }]
        };
    });

}());
