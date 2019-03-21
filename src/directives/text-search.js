(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTextSearch', ['QueryParameters', function (QueryParameters) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTextSearch
         * @scope
         * @restrict E
         * @param {string} placeholder the text to display as a placeholder when the searchbox is empty
         * @param {string} button the text to display in the "search" button
         * @param {string} [field=none] The name of a field you want to restrict the search on (i.e. only search on the
         * textual content of a specific field). If you want to specify different fields for each context, use the
         * syntax "mycontext-field". If you don't specify explicitely a field name for a context, it will default to the
         * value of the "field" parameter.
         * The search will be a simple text search and won't support any query language or operators.
         * @param {string} [suffix=none] Changes the query parameter ("q" by default) so that it works on "q.suffixValue". This prevents widgets from overriding each other (useful when you want multiple text-search widgets on the same page.
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use, or array of context to use.
         * @param {string} [autofocus] Add the autofocus attribute (no need for a value) to set the focus in the text
         * @param {string} [id] Add an id attribute to the inner input
         * search's input.
         *
         * @description
         * This widget displays a search box that can be used to do a full-text search on a context.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul"
         *                               cibul-domain="public.opendatasoft.com"
         *                               cibul-dataset="evenements-publics-cibul">
         *              <ods-text-search context="cibul" field="title"></ods-text-search>
         *              <ods-table context="cibul"></ods-table>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         *
         * Example with multiple text search widgets with suffix and field
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul"
         *                               cibul-domain="public.opendatasoft.com"
         *                               cibul-dataset="evenements-publics-cibul">
         *              <ods-text-search context="cibul" suffix="primary"></ods-text-search>
         *              <ods-text-search context="cibul" suffix="secondary"></ods-text-search>
         *              <ods-text-search context="cibul" field="title"></ods-text-search>
         *              <ods-table context="cibul"></ods-table>
         *          </ods-dataset-context>
         *     </file>
         * </example>
         *
         *
         * Example with multiple contexts.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="cibul,medecins"
         *                               cibul-domain="public.opendatasoft.com"
         *                               cibul-dataset="evenements-publics-cibul"
         *                               medecins-domain="public.opendatasoft.com"
         *                               medecins-dataset="donnees-sur-les-medecins-accredites">
         *              <ods-text-search context="[cibul,medecins]"
         *                               cibul-field="title"
         *                               medecins-field="libelle_long_de_la_specialite_du_medecin"></ods-text-search>
         *              <ods-table context="cibul"></ods-table>
         *              <ods-table context="medecins"></ods-table>
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
            '               aria-label="{{ translatedPlaceholder }}" ' +
            '               placeholder="{{ translatedPlaceholder }}"> ' +
            '       <button type="reset" class="odswidget-text-search__reset" ng-show="searchExpression" ng-click="resetSearch()" aria-label="Reset search" translate="aria-label">' +
            '           <i class="fa fa-times-circle" aria-hidden="true"></i>' +
            '       </button>' +
            '       <button type="submit" class="odswidget-text-search__submit" aria-label="Search in catalog" translate="aria-label">' +
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
                    $(element).find('input').focus();
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
