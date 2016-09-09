(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsTextSearch', function () {
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
         * @param {CatalogContext|DatasetContext|CatalogContext[]|DatasetContext[]} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use, or array of context to use.
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
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-text-search">' +
            '    <form ng-submit="applySearch()" class="odswidget-text-search__form">' +
            '        <input class="odswidget-text-search__search-box" name="q" type="text" ng-model="searchExpression" placeholder="{{ translatedPlaceholder }}">' +
            '        <button type="submit" class="odswidget-text-search__submit" title="{{ translatedPlaceholder}}"><i class="fa fa-search" aria-hidden="true"></i></button>' +
            '    </form>' +
            '</div>',
            scope: {
                placeholder: '@?',
                button: '@?',
                context: '=',
                field: '@?'
            },
            controller: ['$scope', '$attrs', 'translate', function ($scope, $attrs, translate) {
                var contexts = [];
                var fields = {};

                if (!angular.isArray($scope.context)) {
                    contexts.push($scope.context);
                } else {
                    contexts = $scope.context;
                }

                var unwatch = $scope.$watch('context', function (nv, ov) {
 
                    var parseParameter = function (context, returnOriginalValue) {
                        var parameter = context.parameters.q;
                        if (!parameter) {
                            return;
                        }
 
                        var re = /([\w-_]+):"(.*)"/;
                        var matches = parameter.match(re);
                        if (matches && fields[context.name] === matches[1]) {
                            return matches[2];
                        } else if (returnOriginalValue) {
                            return parameter;
                        }
                    };

                    if (nv) {
                        if (!angular.isArray(nv)) {
                            nv = [nv];
                        }
                        // parse fields
                        angular.forEach(nv, function (context) {
                            fields[context.name] = $attrs[context.name + 'Field'] || $scope.field;
                        });
 
                        // parse parameters
                        angular.forEach(nv, function (context) {
                            $scope.searchExpression = $scope.searchExpression || parseParameter(context)
                        });
                        if (!$scope.searchExpression) {
                            angular.forEach(nv, function (context) {
                                $scope.searchExpression = $scope.searchExpression || context.parameters.q;
                            });
                        }
                        unwatch();
                        
                        // setup watch for future updates
                        // the watch should reset the searchExpression only if ALL contexts share the same value
                        $scope.$watch(
                            function () {return contexts.map(function (context) {return context.parameters.q;})},
                            function (nv, ov) {
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

                $scope.applySearch = function () {
                    angular.forEach(contexts, function (context) {
                        if (fields[context.name] && $scope.searchExpression) {
                            context.parameters.q = fields[context.name] + ':"' + $scope.searchExpression + '"';
                        } else {
                            context.parameters.q = $scope.searchExpression;
                        }
                    });
                };
            }]
        };
    });

}());
