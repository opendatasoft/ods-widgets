(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacets', ['$compile', 'translate', '$q', function($compile, translate, $q) {
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
         * It is also possible to configure a specific order by setting a list of values: `['value1', 'value2']`.
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
         * - **`disjunctive`** {@type boolean} (optional) if 'true', then the facet is in "disjunctive" mode, which means that after a first value selected,
         * you can select other possibles values that are all combined as "or". For example, if you click "red", then you can also click "green" and "blue",
         * and the resulting values can be green, red, or blue.
         *
         * - **`timerangeFilter`** {@type boolean} (optional) if 'true', then an option to filter with on a time range is displayed above the facets categories.
         * Only works for date and datetime fields. Must be used with a context (see below).
         *
         * - **`context`** {@type string} (optional) name of the context to refine on. Mandatory with timerange filter.
         *
         * - **`valueSearch`** {@type string} (optional) if 'true', then a search box is displayed above the categories, so that you can search within them easily.
         * If 'suggest', then the matching categories are not displayed until there is at least one character typed into the search box, effectively making it
         * into a suggest-like search box.
         *
         * - **`refineAlso`** {@type DatasetContext|CatalogContext|DatasetContext[]|CatalogContext[]} (optional) An
         * other context (or a list of contexts) that you want to filter based on your primary context's facets. This
         * is especially usefull for contexts who share common data.
         *
         * - **`mysecondarycontextFacetName`** {@type string} (optional) The name of the facet in one of your secondary
         * contexts (defined through the `refineAlso` parameter) that you want to map your original's facet on. You can
         * see an example below of such a behaviour.
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
         * You can filter multiple contexts through this widget. To illustrate how this works, we'll consider 3 datasets
         * containing information relative to zipcodes: one containing the geo-shape of each zipcode (the zipcode being
         * stored in the column `zipcode`), one containing the population (again, the zipcode is stored in the `zipcode`
         * column) and a last one containing the name of the area (the zipcode being this time stored in the
         * `code_postal` column because this is a french dataset). In order to have a single zipcode facet that will
         * refine all 3 contexts simultaneously, we need to write the following.
         *
         * <pre>
         *     <ods-facets context="shapes">
         *         <ods-facet name="zipcode"
         *                    refine-also="[population,areanames]"
         *                    areanames-facet-name="code_postal"></ods-facet>
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
         *                          <h3>
         *                              <i class="icon-tags"></i> Tags
         *                          </h3>
         *                          <ods-facet name="tags">
         *                              <div>
         *                                  <i class="icon-tag"></i> {{category.name}}
         *                              </div>
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
                    // We need to escape double quotes when building an attribute value (issue platform#3789)
                    'title="'+(facet.title && facet.title.replace(/"/g, '&quot;') || facet.name)+'" ' +
                    'sort="'+(facet.sort || '')+'" ' +
                    'disjunctive="'+(facet.disjunctive || '')+'" ' +
                    'timerange-filter="'+(facet.timerangeFilter || '')+'" ' +
                    'hide-if-single-category="'+(facet.hideIfSingleCategory ? 'true' : 'false')+'" ' +
                    'hide-category-if="'+(facet.hideCategoryIf || '')+'"' +
                    'value-formatter="'+(facet.valueFormatter || '')+'"' +
                    'context="'+(scope.context.name || '')+'"' +
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
                    var unwatchContext, delayedInit;

                    delayedInit = function() {
                        var unwatchContext = scope.$watch('context', function() {
                            if (scope.context) {
                                if (scope.context.type === 'dataset') {
                                    scope.context.wait().then(function () {
                                        scope.init();
                                    });
                                } else {
                                    scope.init();
                                }
                                unwatchContext();
                            }
                        });
                    };

                    if (scope.facetsConfig) {
                        buildFacetTagsHTML(scope, element, scope.facetsConfig);
                        delayedInit();
                    } else if (childrenCount === 0) {
                        // By default, we add all the available facets
                        var facets;

                        unwatchContext = scope.$watch('context', function() {
                            if (scope.context) {
                                unwatchContext();
                                if (scope.context.type === 'catalog') {
                                    facets = [
                                        {name: 'modified', title: translate('Modified'), valueFormatter: 'date'},
                                        {name: 'publisher', title: translate('Publisher')},
                                        {name: 'keyword', title: translate('Keyword')},
                                        {name: 'theme', title: translate('Theme')}
                                    ];
                                    buildFacetTagsHTML(scope, element, facets);
                                    scope.init();
                                } else {
                                    scope.context.wait().then(function(){
                                        facets = angular.copy(scope.context.dataset.getFacets());
                                        angular.forEach(facets, function(f) {
                                            f.title = f.label;
                                            delete f.label;
                                            angular.forEach(f.annotations, function(annotation) {
                                                if (annotation.name === 'facetsort' && annotation.args.length > 0) {
                                                    f.sort = annotation.args[0];
                                                }
                                                if (annotation.name === 'disjunctive') {
                                                    f.disjunctive = true;
                                                }
                                                if (annotation.name === 'timerangeFilter') {
                                                    f.timerangeFilter = true;
                                                }
                                            });
                                            if (f.type == 'datetime' || f.type == 'date') {
                                                f.valueFormatter = 'date';
                                            }
                                        });
                                        buildFacetTagsHTML(scope, element, facets);
                                        scope.init();
                                    });
                                }
                            }
                        }, true);
                    } else {
                    // We're starting the queries from here because at that time we are sure the children (odsFacets tags)
                    // are ready and have registered themselves.
                        delayedInit();
                    }
                };
            },
            controller: ['$scope', 'ODSAPI', function($scope, ODSAPI) {
                var facetsMapping = {};

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
                        if (facetInfo.sort && facetInfo.sort.length && facetInfo.sort[0] !== '[') {
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
                        var categories, facetItem, addedCategories;
                        angular.forEach($scope.facets, function(facet) {
                            facet.categories.splice(0, facet.categories.length);
                        });
                        if (data.facet_groups) {
                            angular.forEach(data.facet_groups, function(facetGroup) {
                                facetItem = $scope.facets.filter(function(f) { return f.name === facetGroup.name; });
                                if (facetItem.length > 0) {
                                    categories = facetItem[0].categories;
                                    // Add all the categories in the array
                                    addedCategories = [];
                                    if (facetItem[0].sort && facetItem[0].sort.length && facetItem[0].sort[0] === '[') {
                                        // This is an explicit order
                                        var explicitOrder = $scope.$eval(facetItem[0].sort);
                                        angular.forEach(explicitOrder, function(value) {
                                            var j, cat;
                                            for (j=0; j<facetGroup.facets.length; j++) {
                                                cat = facetGroup.facets[j];
                                                if (cat.path === value) {
                                                    addedCategories.push(cat);
                                                    facetGroup.facets.splice(j, 1);
                                                    break;
                                                }
                                            }
                                        });
                                        // Append the rest, as is
                                        Array.prototype.push.apply(addedCategories, facetGroup.facets);
                                    } else {
                                        addedCategories = facetGroup.facets;
                                    }
                                    Array.prototype.push.apply(categories, addedCategories);
                                }
                            });
                        }
                    });
                };

                this.registerFacet = function(name, sort, secondaryContexts, facetAttrs) {
                    var categories = [];
                    $scope.facets.push({'name': name, 'categories': categories, 'sort': sort});

                    // build mapping
                    facetsMapping[name] = [];
                    if (secondaryContexts) {
                        secondaryContexts = angular.isArray(secondaryContexts) ? secondaryContexts : [secondaryContexts];
                        angular.forEach(secondaryContexts, function (context) {
                            var contextFacetName = facetAttrs[context.name + 'FacetName'];
                            facetsMapping[name].push({
                                context: context,
                                facetName: contextFacetName ? contextFacetName : name
                            });
                            // check that mapping is correct
                            var checkMappingType = function (originalContext, secondaryContext) {
                                angular.forEach(originalContext.dataset.fields, function (originalField) {
                                    angular.forEach(secondaryContext.dataset.fields, function (secondaryField) {
                                        if (originalField.name === name &&
                                            secondaryField.name === contextFacetName &&
                                            originalField.type != secondaryField.type) {
                                            console.warn(
                                                'Error: mapping ' +
                                                originalContext.name + '\'s ' + '"' + originalField.name + '" (type ' + originalField.type + ') on ' +
                                                secondaryContext.name + '\'s ' + '"' + secondaryField.name + '" (type ' + secondaryField.type + ').'
                                            );
                                        }
                                    });
                                });
                            };
                            if (context.type === 'dataset') {
                                $q.all([$scope.context.wait(), context.wait()]).then(function() {
                                    checkMappingType($scope.context, context);
                                });
                            } else {
                                checkMappingType($scope.context, context);
                            }
                        });
                    }
                    return categories;
                };

                this.setDisjunctive = function(name) {
                    $scope.context.parameters['disjunctive.'+name] = true;
                };

                this.toggleRefinement = function(facetName, path) {
                    $scope.context.toggleRefine(facetName, path);

                    angular.forEach(facetsMapping[facetName], function (mapping) {
                        mapping.context.toggleRefine(mapping.facetName, path);
                    });
                };

                this.context = $scope.context;
            }]
        };
    }]);

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
                sort: '@',
                disjunctive: '=',
                timerangeFilter: '=',
                valueSearch: '@',
                valueFormatter: '@',
                refineAlso: '=?',
                context: '='
            },
            template: function(tElement) {
                tElement.data('facet-template', tElement.html().trim());
                return '' +
                    '<div ng-class="{\'odswidget\': true, \'odswidget-facet\': true, \'odswidget-facet--disjunctive\': disjunctive}">' +
                    '    <h3 class="odswidget-facet__facet-title" ' +
                    '        ng-if="(title && categories.length && visible()) || hasTimerangeFilter()  ">' +
                    '        {{ title }}' +
                    '    </h3>' +
                    '    <div class="odswidget-facet__date-range" ng-if="timerangeFilter">' +
                    '        <ods-timerange context="context" time-field="{{ name }}" display-time="false" suffix="{{ name }}"></ods-timerange>' +
                    '    </div>'+
                    '    <ods-facet-category-list ng-if="visible()" ' +
                    '                             facet-name="{{ name }}" ' +
                    '                             value-search="{{ valueSearch }}" ' +
                    '                             hide-category-if="{{ hideCategoryIf }}" ' +
                    '                             categories="categories" ' +
                    '                             template="{{ customTemplate }}" ' +
                    '                             value-formatter="{{valueFormatter}}"></ods-facet-category-list>' +
                    '</div>';
            },
            require: '^odsFacets',
            link: function(scope, element, attrs, facetsCtrl) {
                if (angular.isUndefined(facetsCtrl)) {
                    console.log('ERROR : odsFacet must be used within an odsFacets tag.');
                }
                scope.categories = facetsCtrl.registerFacet(scope.name, scope.sort, scope.refineAlso, attrs);
                scope.facetsCtrl = facetsCtrl;
                if (scope.disjunctive) {
                    facetsCtrl.setDisjunctive(scope.name);
                }

                scope.context =  scope.context || facetsCtrl.context;

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
                hideCategoryIf: '@',
                valueSearch: '@',
                valueFormatter: '@',
                context: '='
            },
            require: '^odsFacet',
            template: '' +
            '<ul class="odswidget-facet__category-list">' +
            '   <li class="odswidget-facet__value-search" ng-show="valueSearchEnabled">' +
            '       <input class="odswidget-facet__value-search-input" ng-model="valueFilter" aria-label="Search in {{facetName}}" translate="aria-label">' +
            '       <i ng-show="!!valueFilter" class="odswidget-facet__value-search-cancel fa fa-times" ng-click="valueFilter=\'\'"></i>' +
            '   </li>' +
            '   <li ng-repeat="category in categories|filter:searchValue(valueFilter)" class="odswidget-facet__category-container">' +
            '       <ods-facet-category ng-if="!categoryIsHidden(category)" facet-name="{{ facetName }}" category="category" template="{{template}}" value-formatter="{{valueFormatter}}" ng-show="visible($index)"></ods-facet-category>' +
            '   </li>' +
            '   <li ng-if="!suggestMode && visibleItems < (filterInvisibleCategories(categories)|filter:searchValue(valueFilter)).length" ' +
            '       class="odswidget-facet__expansion-control">' +
            '       <a ng-hide="expanded" href="#" ng-click="toggle($event)" class="odswidget-facet__expansion-control-link">' +
            '           <i class="fa fa-angle-right" aria-hidden="true"></i>' +
            '           <span translate>More</span>' +
            '       </a>' +
            '       <a ng-show="expanded" href="#" ng-click="toggle($event)" class="odswidget-facet__expansion-control-link">' +
            '           <i class="fa fa-angle-right" aria-hidden="true"></i>' +
            '           <span translate>Less</span>' +
            '       </a>' +
            '   </li>' +
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
                    if (scope.suggestMode && scope.valueFilter === '') {
                        return true;
                    }
                    if (!scope.hideCategoryIf) {
                        return false;
                    }
                    var testScope = scope.$new(false);
                    testScope.category = category;
                    return testScope.$eval(scope.hideCategoryIf);
                };
                scope.filterInvisibleCategories = function(categories) {
                    return categories.filter(function(category) { return !scope.categoryIsHidden(category); });
                };
            },
            controller: ['$scope', '$filter', function($scope, $filter) {
                $scope.valueFilter = '';
                $scope.valueSearchEnabled = false;
                $scope.suggestMode = false;
                if (angular.isString($scope.valueSearch)) {
                    if ($scope.valueSearch.toLowerCase() === 'true') {
                        $scope.valueSearchEnabled = true;
                    } else if ($scope.valueSearch.toLowerCase() === 'suggest') {
                        $scope.valueSearchEnabled = true;
                        $scope.suggestMode = true;
                    }
                }
                $scope.searchValue = function(search) {
                    if (!search) { return function() { return true; }; }
                    search = $filter('normalize')(search).toLowerCase();
                    return function(searchedCategory) {
                        var categoryName = $filter('normalize')(searchedCategory.name).toLowerCase();
                        return categoryName.indexOf(search) > -1;
                    };
                };
                this.emptySearch = function() {
                    $scope.valueFilter = '';
                };
            }]
        };
    });

    mod.directive('odsFacetCategory', ['$compile', function($compile) {
        return {
            restrict: 'E',
            replace: true,
            require: ['^odsFacet', '^?odsFacetCategoryList'],
            scope: {
                category: '=',
                facetName: '@',
                template: '@',
                valueFormatter: '@'
            },
            template: '<div class="odswidget odswidget-facet-category"></div>',
            link: function(scope, element, attrs, ctrls) {
                var facetCtrl = ctrls[0];
                var categoryList = ctrls[1];
                scope.toggleRefinement = function($event, path) {
                    $event.preventDefault();
                    facetCtrl.toggleRefinement(path);
                    categoryList.emptySearch();
                };
                var defaultTemplate = '' +
                    '<span class="odswidget-facet__category-count">{{ category.count|number }}</span> ' +
                    '<span class="odswidget-facet__category-name" ng-bind-html="formatCategory(category.name, category.path)"></span>';
                var template = scope.template || defaultTemplate;
                template = '' +
                    '<a class="odswidget-facet__category" ' +
                    '   href="#" ' +
                    '   ng-click="toggleRefinement($event, category.path)" ' +
                    '   ng-class="{\'odswidget-facet__category--refined\': category.state === \'refined\'}" ' +
                    '   title="{{ category.name }}">' + template + '</a>';
                element.append($compile(template)(scope));

                if (scope.category.facets) {
                    var sublist = angular.element('<ods-facet-category-list categories="category.facets" template="{{template}}" value-formatter="{{valueFormatter}}"></ods-facet-category-list>');
                    element.find('a').after(sublist);
                    $compile(sublist)(scope);
                }

            },
            controller: ['$scope', 'ValueDisplay', function($scope, ValueDisplay) {
                $scope.formatCategory = function(value) {
                    value = ODS.StringUtils.escapeHTML(value);
                    if ($scope.valueFormatter) {
                        return ValueDisplay.format(value, $scope.valueFormatter, $scope.category.path);
                    } else {
                        return value;
                    }
                };
            }]
        };
    }]);

}());
