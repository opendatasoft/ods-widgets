(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTextSearch', ['QueryParameters', function (QueryParameters) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTextSearch
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context <i>(mandatory)</i> {@link ods-widgets.directive:odsCatalogContext Catalog Context}, {@link ods-widgets.directive:odsDatasetContext Dataset Context}, or array of context to use
         * @param {string} [placeholder=none] Text to display as a placeholder when the search box is empty
         * @param {string} [field=none] Name of a field the search will be restricted on (i.e., the widget will only allow to search on the textual content of the chosen field).
         * If more than one context is declared, it is possible to specify different fields depending on these contexts, using the following syntax: mycontext-field. If a specific field is not set for a context, the value of the field parameter will be used by default. The search will be a simple text search that won't support query languages and operators.
         * @param {string} [suffix=none] Changes the default `q` query parameter into `q.suffixValue`. This parameter prevents widgets from overriding one another, for instance when multiple odsTextSearch widgets are used on the same page.
         * @param {string} autofocus Makes the search box automatically selected at loading of the page to start typing the search without selecting the search box manually beforehand. No value is required for this parameter to function.
         * @param {string} id Adds an `id` attribute to the search's text box, for example, to integrate the widget to a clickable label.
         *
         * @description
         * The odsTextSearch widget displays a search box to perform a full-text search in a context.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="simple_text_search.html">
         *          <ods-dataset-context context="events"
         *                               events-domain="https://documentation-resources.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract">
         *              <ods-text-search context="events" field="titre"></ods-text-search>
         *              <ods-table context="events"></ods-table>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         *
         *  <example module="ods-widgets">
         *      <file name="text_search_with_multiple_contexts.html">
         *          <ods-dataset-context context="events,trees"
         *                               events-domain="https://documentation-resources.opendatasoft.com/"
         *                               events-dataset="evenements-publics-openagenda-extract"
         *                               trees-domain="https://documentation-resources.opendatasoft.com/"
         *                               trees-dataset="les-arbres-remarquables-de-paris">
         *              <ods-text-search context="[events,trees]"
         *                               events-field="titre"
         *                               trees-field="libellefrancais"></ods-text-search>
         *              <ods-table context="events"></ods-table>
         *              <ods-table context="trees"></ods-table>
         *          </ods-dataset-context>
         *      </file>
         * </example>
         *
         */

        var suffixBlacklist = QueryParameters;

        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-text-search">' +
            '   <form ng-submit="applySearch()" class="odswidget-text-search__form">' +
            '       <input class="odswidget-text-search__search-box" name="q" type="text" id="{{id}}"' +
            '               ng-model="searchExpression" ' +
            '               aria-label="{{ translatedPlaceholder || \'Search\'|translate }}" ' +
            '               title="{{ translatedPlaceholder || \'Search\'|translate }}" ' +
            '               placeholder="{{ translatedPlaceholder }}"> ' +
            '       <button type="reset" class="odswidget-text-search__reset" ng-show="searchExpression" ng-click="resetSearch()" aria-label="Reset search" translate="aria-label">' +
            '           <span class="ods-aria-instructions" translate>Reset</span>' +
            '           <i class="fa fa-times-circle" aria-hidden="true"></i>' +
            '       </button>' +
            '       <button type="submit" class="odswidget-text-search__submit" aria-label="Search in catalog" translate="aria-label">' +
            '           <span class="ods-aria-instructions" translate>Submit</span>' +
            '           <i class="fa fa-search" aria-hidden="true"></i>' +
            '       </button>' +
            '    </form>' +
            '</div>',

            scope: {
                placeholder: '@?',
                button: '@?',
                context: '=',
                field: '@?',
                suffix: '@?',
                id: '@?',
            },


            link: function (scope, element, attrs) {
                if ('autofocus' in attrs) {
                    jQuery(element).find('input').focus();
                }
                element.removeAttr('id');
            },


            controller: ['$scope', '$attrs', 'translate', function ($scope, $attrs, translate) {
                var contexts = [];
                var config = {};

                // Set contexts variable
                if (!angular.isArray($scope.context)) {
                    contexts.push($scope.context);
                } else {
                    contexts = $scope.context;
                }

                if ($scope.suffix && suffixBlacklist.indexOf('q.' + $scope.suffix) !== -1) {
                    throw "The " + $scope.suffix + " suffix is reserved and cannot be used for text-search";
                }

                // Check if the received parameter is in format fieldName:inputValue or just the value of the input, in both instances returns the content of the input
                var parseParameter = function (context, returnOriginalValue) {
                    var contextConfig = getContextConfig(context);
                    var queryKey = getQueryParameter(contextConfig);
                    var parameterValue = context.parameters[queryKey];

                    if (!parameterValue) {
                        return;
                    }

                    var pattern = /([\w-_]+):\s?"(.*)"/;
                    var matches = parameterValue.match(pattern);

                    if (matches && contextConfig['field'] === matches[1]) {
                        return matches[2];
                    } else if (returnOriginalValue) {
                        return parameterValue;
                    }
                };

                // If a "-field" parameter is declared in HTML
                var getField = function(context) {
                    return $attrs[context.name + 'Field'] || $scope.field;
                };

                // Get the figuration for a context
                var getContextConfig = function(context) {
                    return config[context.name];
                };

                // Get the queryKey. If the widget has a suffix parameter, the queryKey will include this value (e.g: q.title)
                var getQueryParameter = function(config) {
                    return config['parameter'];
                };


                var unwatch = $scope.$watch('context', function (newContext, oldContext) {
                    if (newContext) {
                        if (!angular.isArray(newContext)) {
                            newContext = [newContext];
                        }

                        // For every content generate a config object
                        angular.forEach(contexts, function (context) {
                            var fieldValue = getField(context);
                            var queryParameter = 'q';
                            // If a suffix has been defined in scope, the queryKey will work on that value.
                            if ($scope.suffix) {
                                queryParameter += '.' + $scope.suffix;
                            }
                            config[context.name] = {
                                field: fieldValue,
                                parameter: queryParameter
                            };
                        });

                        // Parse parameters. When widget is initialized
                        angular.forEach(newContext, function (context) {
                            $scope.searchExpression = $scope.searchExpression || parseParameter(context);
                        });

                        // Only when widget is initialised
                        if (!$scope.searchExpression) {
                            angular.forEach(newContext, function (context) {
                                var contextConfig = getContextConfig(context);
                                var queryParameter = getQueryParameter(contextConfig);
                                $scope.searchExpression = $scope.searchExpression || context.parameters[queryParameter];
                            });
                        }

                        unwatch();

                        // Setup watch for future updates.
                        // The watch should reset the searchExpression only if ALL contexts share the same value
                        $scope.$watch(
                            function () {
                                return contexts.map(function (context) {
                                    var contextConfig = getContextConfig(context);
                                    var queryParameter = getQueryParameter(contextConfig);
                                    return context.parameters[queryParameter];
                                });
                            },

                            function (nv, ov) {
                                // If the search term changed
                                if (!angular.equals(nv, ov)) {
                                    var allInSync = true;
                                    var searchExpression = parseParameter(contexts[0], true);
                                    for (var i = 1; i < contexts.length; i++) {
                                        var contextSearchExpression = parseParameter(contexts[i], true);
                                        if (searchExpression != contextSearchExpression) {
                                            allInSync = false;
                                            break;
                                        }
                                    }
                                    if (allInSync) {
                                        $scope.searchExpression = searchExpression;
                                    }
                                }
                        }, true);
                    }
                });

                var placeholderUnwatcher = $scope.$watch('placeholder', function (nv, ov) {
                    if (nv) {
                        $scope.translatedPlaceholder = translate($scope.placeholder);
                        placeholderUnwatcher();
                    }
                });

                $scope.resetSearch = function () {
                    angular.forEach(contexts, function (context) {
                        var contextConfig = getContextConfig(context);
                        var queryParameter = getQueryParameter(contextConfig);
                        delete context.parameters[queryParameter];
                    });
                };

                // Called when the form is submitted. Generates a change in context which calls the watcher
                $scope.applySearch = function () {
                    angular.forEach(contexts, function (context) {
                        var contextConfig = getContextConfig(context);
                        var queryParameter = getQueryParameter(contextConfig);

                        if (contextConfig['field'] && $scope.searchExpression) {
                            // Updates context and start search. The search query will have format fieldName:"searchExpression"
                            context.parameters[queryParameter] = contextConfig['field'] + ':"' + $scope.searchExpression + '"';
                        } else {
                            // Used when no field is defined. Updates context and start search
                            context.parameters[queryParameter] =  $scope.searchExpression;
                        }
                    });
                };

            }]
        };
    }]);
}());
