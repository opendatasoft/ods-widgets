(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacets', ['ODSWidgetsConfig', '$compile', 'translate', '$q', '$filter', function(ODSWidgetsConfig, $compile, translate, $q, $filter) {
        /**
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsFacets
         *  @scope
         *  @restrict E
         *  @param {DatasetContext} context <i>(mandatory)</i> {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use.
         *  @param {string} name <i>(mandatory)</i> Name of the field the filter is based on.
         *  @param {string} [title=none] Title to display above the filter
         *  @param {string} [sort=-count] Sorting method used on the categories:
         *
         *  - `count` or `-count` to sort by number of items in each category
         *  - `num` or `-num` to sort by the name of category, if it is a number
         *  - `alphanum` or `-alphanum` to sort by the name of the category
         *
         *  Note that `-` before the name of the sorting method indicates that the sorting will be descending instead of ascending.
         *
         *  Configuring a specific order is also possible, by setting a list of value: `['value1', 'value2']`.
         *
         *  @param {number} [visibleItems=6] Number of categories to show. If there are more categories for the filter, they are collapsed by default, but can be expanded by clicking on a "more" link.
         *  @param {boolean} [hideIfSingleCategory=false] If `true`, hides filters if only one category to refine on is available.
         *  @param {string} [hideCategoryIf=none] AngularJS expression to evaluate: if it evaluates to `true`, the category is displayed. In the expression, the following elements can be used:
         *
         *  - `category.name` (value of the category)
         *  - `category.path` (complete path to the category, including hierarchical levels)
         *  - `category.state` (refined, excluded, or displayed)
         *
         *  @param {boolean} [disjunctive=false] If `true`, the filter is in disjunctive mode, which means that after a first value is selected, other available values can also be selected. All selected values are combined as "or". E.g. after clicking "red", "green" and "blue" can also be clicked, and the resulting values can be either green, red, or blue.
         *
         *  Note that this parameter is directly related to the schema of the dataset: for this parameter to function, the field must allow multiple selection in filters (see {@link https://help.opendatasoft.com/platform/en/publishing_data/05_processing_data/defining_a_dataset_schema.html#configuration-options-for-facets Defining a dataset schema}).
         *  @param {boolean} [timerangeFilter=false] If `true`, an option to filter using a time range is displayed above the categories. This parameter only works for date and datetime fields, and must be used with a context (see **context** parameter).
         *  @param {string} [context=none] Name of the context to refine on. This parameter is mandatory for the **timerangeFilter** parameter.
         *  @param {string} [valueSearch=none] If `true`, a search box is displayed above the categories, to search within the available categories. If `suggest`, the matching categories are not displayed until there is at least one character typed into the search box, effectively making it into a suggest-like search box.
         *  @param {DatasetContext|CatalogContext|DatasetContext[]|CatalogContext[]} [refineAlso=none] Enables the widget to apply its refinements on other contexts, e.g. for contexts which share common date. The value of this parameter should be the name of another context, or a list of contexts.
         *  @param {string} [[contextname]FacetName=Current facet's name] Name of the facet in one of the other contexts, defined through the **refineAlso** parameter, that the original facet should be mapped on. `[contextname]` must be replaced with the name of that other context.
         *
         *  @description
         *
         *  The odsFacets widget displays filters based on a dataset or a domain's catalog of datasets, allowing the users to dynamically refine on one or more categories for the defined context (i.e. each filter being composed of several categories, which are values of the field the filter is based on).
         *
         *  For instance, odsFacet could be used to refine the data displayed in a table ({@link ods-widgets.directive:odsTable odsTable}), to see only the specific data one is interested in.
         *
         *  Used alone without any configuration, the widget will display by default filters from all the "facet" fields of a dataset if it is used with a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, or based on typical metadata from a dataset catalog if used with a {@link ods-widgets.directive:odsCatalogContext Catalog Context}.
         *
         * <pre>
         *     <ods-facets context="mycontext"></ods-facets>
         * </pre>
         *
         * <b>odsFacet</b>
         *
         * The odsFacet widget is a widget that can only be used based on odsFacets. It is used to configure which facets should be displayed by odsFacets, since odsFacets used alone does not allow to display only specific facets among all the default ones of the dataset. odsFacet supports the following parameters:
         *
         * - name
         * - sort
         * - visibleItems
         * - hideIfSingleCategory
         * - hideCategoryIf
         *
         * Note: these parameters are the same as some used for odsFacets, refer to the odsFacets parameters table below for more information on how to configure them.
         *
         * odsFacet allows to configure which facets are displayed, using the **name** parameter.
         *
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
         * Regular HTML is supported within the odsFacet tag to change the display template of each category. The available variables within the template are:
         *
         * - `facetName`: name of the field that the filter is based on
         * - `category.name`: value of the category
         * - `category.path`: complete path to the category, including hierarchical levels
         * - `category.state`: refined, excluded, or displayed
         *
         * An `ng-non-bindable` wrapper element must be used around the display template for it to work properly.
         * Note: There must not be any space character between the odsFacet tag and the span element, as it may prevent the widget from working properly.
         *
         * <pre>
         *     <ods-facets context="mycontext">
         *         <ods-facet name="myfield"><span ng-non-bindable>
         *             {{category.name}} @ {{category.state}}
         *         </span></ods-facet>
         *     </ods-facets>
         * </pre>
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="odsFacets_with_odsFacet.html">
         *          <ods-dataset-context context="events"
         *                               events-domain="https://widgets-examples.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract">
         *              <div class="row-fluid">
         *                  <div class="span4">
         *                      <ods-facets context="events">
         *                          <ods-facet name="date_mise_a_jour" title="Date"></ods-facet>
         *                          <h3>
         *                              <i class="icon-tags"></i> Tags
         *                          </h3>
         *                          <ods-facet name="mots_cles">
         *                              <div ng-non-bindable>
         *                                  {{category.name}}
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
         *
         *  <example module="ods-widgets">
         *      <file name="refineAlso_parameter.html">
         *          <ods-dataset-context context="volcaniceruption, countries"
         *                               volcaniceruption-domain="https://widgets-examples.opendatasoft.com/"
         *                               volcaniceruption-dataset="significant-volcanic-eruption-database"
         *                               countries-domain="https://widgets-examples.opendatasoft.com/"
         *                               countries-dataset="natural-earth-countries-150m">
         *              <ods-facets context="volcaniceruption">
         *                    <ods-facet name="country"
         *                               refine-also="[countries]"
         *                               countries-facet-name="sovereignt"></ods-facet>
         *              </ods-facets>
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
            html = html.replace(/{{(.*?)}}/g, "\\{\\{$1\\}\\}");
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
                                        facets = $filter('fieldsForLanguageDisplay')(angular.copy(scope.context.dataset.getFacets()), ODSWidgetsConfig.language);
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
                var dataset_search = ODSAPI.uniqueCall(ODSAPI.records.search),
                    catalog_search = ODSAPI.uniqueCall(ODSAPI.datasets.search);

                $scope.facets = [];
                $scope.init = function() {
                    // NOTE: Commented until we no longer need the call to refresh the nhits on the context
                    // if ($scope.facets.length === 0) {
                    //     return;
                    // }
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
                        req = dataset_search($scope.context, params);
                    } else {
                        req = catalog_search($scope.context, params);
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

                            // The following check only makes sense if both contexts are dataset contexts
                            if (context.type !== 'dataset' || $scope.context.type !== 'dataset') {
                                return;
                            }

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
            transclude: true,
            scope: {
                name: '@',
                title: '@',
                visibleItems: '@',
                hideIfSingleCategory: '@',
                hideCategoryIf: '@',
                sort: '@',
                disjunctive: '=?',
                timerangeFilter: '=?',
                valueSearch: '@',
                valueFormatter: '@',
                refineAlso: '=?',
                context: '=?'
            },
            template:  '' +
                    '<div ng-class="{\'odswidget\': true, \'odswidget-facet\': true, \'odswidget-facet--disjunctive\': disjunctive}">' +
                    '    <h3 class="odswidget-facet__facet-title" ' +
                    '        ng-if="title && ((categories.length && visible()) || displayTimerange())">' +
                    '        {{ title }}' +
                    '    </h3>' +
                    '    <div class="odswidget-facet__date-range" ng-if="displayTimerange()">' +
                    '        <ods-timerange context="context" ' +
                    '                       time-field="{{ name }}" ' +
                    '                       display-time="false" ' +
                    '                       suffix="{{ name }}"></ods-timerange>' +
                    '    </div>'+
                    '    <ods-facet-category-list ng-if="visible()" ' +
                    '                             facet-name="{{ name }}" ' +
                    '                             value-search="{{ valueSearch }}" ' +
                    '                             hide-category-if="{{ hideCategoryIf }}" ' +
                    '                             categories="categories" ' +
                    '                             template="{{ customTemplate }}" ' +
                    '                             value-formatter="{{valueFormatter}}"></ods-facet-category-list>' +
                    '</div>',
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

                scope.displayTimerange = function () {
                    // do not display unless the option is activated
                    if (!scope.timerangeFilter) {
                        return false;
                    }

                    // display if there is a value set through timerange control
                    if (scope.context.parameters && (scope.context.parameters['q.from_date.' + scope.name] || scope.context.parameters['q.timerange.'+scope.name])) {
                        return true;
                    }

                    // display if there are categories
                    return !!scope.categories.length;
                }

            },
            controller: ['$scope', '$element', '$transclude', function($scope, $element, $transclude) {
                $scope.visibleItemsNumber = angular.isDefined($scope.visibleItems) ? $scope.visibleItems : 6;

                this.toggleRefinement = function(path) {
                    $scope.facetsCtrl.toggleRefinement($scope.name, path);
                };
                this.getVisibleItemsNumber = function() {
                    return $scope.visibleItemsNumber;
                };
                $scope.visible = function() {
                    return !(angular.isString($scope.hideIfSingleCategory) && $scope.hideIfSingleCategory.toLowerCase() === 'true' && $scope.categories.length === 1 && $scope.categories[0].state !== 'refined');
                };
                // $$boundTransclude is clearly angular black magic but hopefully it will get us what we want in
                // any situation: the uncompiled content of the template
                var customTemplate = $transclude.$$boundTransclude().html();
                // Is there a custom template into the directive's tag?
                if (customTemplate) {
                    $scope.customTemplate = customTemplate.trim();
                }
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
                var isExpanded = function (categories) {
                    if (categories.some(function(category) { return category.state === 'refined' })) {
                        return true;
                    }
                    return categories.some(function(category) {
                        if (category.facets && category.facets.length) {
                            return isExpanded(category.facets);
                        }
                    })
                };
                // Make sure parent categories are always expanded initially if any of its children is refined
                scope.expanded = isExpanded(scope.categories);
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
                var template = scope.template || defaultTemplate;
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
