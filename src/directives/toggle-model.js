(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsToggleModel', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsToggleModel
         * @restrict A
         * @scope
         * @param {Object} odsToggleModel Object to apply the toggle on
         * @param {string} odsToggleKey The key that holds the toggled value
         * @param {string} odsTogglValue The toggled value
         * @param {string} [odsStoreAs=array] The type of the resulting variable. Either 'array' or 'csv'.
         * @description
         * This widget, when used on a checkbox, allows the checkbox to be used to "toggle" a value in an object, in other words to add it or remove when the checkbox
         * is respectively checked and unchecked. Multiple checkboxes can be used on the same model and key, in which case if two or more are toggled, an array
         * will be created to hold the values.
         *
         * @example
         *  <pre>
         *      <ods-catalog-context context="catalog" catalog-domain="public.opendatasoft.com">
         *
         *          <input type="checkbox" ods-toggle-model="catalog.parameters" ods-toggle-key="refine.publisher" ods-toggle-value="Government">
         *          <input type="checkbox" ods-toggle-model="catalog.parameters" ods-toggle-key="refine.publisher" ods-toggle-value="World Bank">
         *
         *      </ods-catalog-context>
         *  </pre>
         *
         */

        var enable = function(obj, key, value) {
            if (obj[key]) {
                if (angular.isArray(obj[key])) {
                    if (obj[key].indexOf(value) < 0) {
                        obj[key].push(value);
                    }
                } else {
                    if (!angular.equals(obj[key], value)) {
                        obj[key] = [obj[key], value];
                    }
                }
            } else {
                obj[key] = value;
            }
        };

        var disable = function(obj, key, value) {
            if (obj[key]) {
                if (angular.isArray(obj[key])) {
                    if (obj[key].indexOf(value) >= 0) {
                        if (obj[key].length === 1) {
                            delete obj[key];
                        } else {
                            obj[key].splice(obj[key].indexOf(value), 1);
                        }
                    }
                } else {
                    if (angular.equals(obj[key], value)) {
                        delete obj[key];
                    }
                }
            }
        };

        var convertModelToArray = function (obj, key) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].split(',');
            }
        };

        var convertModelToStorageFormat = function (obj, key, storeAs) {
            if (storeAs == 'csv' && angular.isArray(obj[key])) {
                obj[key] = obj[key].join(',');
            }
        };

        return {
            restrict: 'A',
            scope: {
                odsToggleModel: '=',
                odsToggleKey: '@',
                odsToggleValue: '@',
                odsStoreAs: '@?'
            },
            link: function(scope, element, attrs) {
                if (!angular.isDefined(scope.odsStoreAs) || ['array', 'csv'].indexOf(scope.odsStoreAs) == -1) {
                    scope.odsStoreAs = 'array';
                }
                element.on('change', function(e) {
                    var checked = e.currentTarget.checked;
                    if (checked) {
                        // Toggle ON
                        scope.$apply(function() {
                            convertModelToArray(scope.odsToggleModel, scope.odsToggleKey);
                            enable(scope.odsToggleModel, scope.odsToggleKey, scope.odsToggleValue);
                            convertModelToStorageFormat(scope.odsToggleModel, scope.odsToggleKey, scope.odsStoreAs);
                        });
                    } else {
                        // Toggle OFF
                        scope.$apply(function() {
                            convertModelToArray(scope.odsToggleModel, scope.odsToggleKey);
                            disable(scope.odsToggleModel, scope.odsToggleKey, scope.odsToggleValue);
                            convertModelToStorageFormat(scope.odsToggleModel, scope.odsToggleKey, scope.odsStoreAs);
                        });
                    }
                });

                scope.$watch('odsToggleModel[odsToggleKey]', function(nv) {
                    if (nv) {
                        if ((angular.isArray(nv) && nv.indexOf(scope.odsToggleValue) >= 0)
                            || (!angular.isArray(nv) && nv.split(',').indexOf(scope.odsToggleValue)>=0)) {
                            // Check
                            element.prop('checked', true);
                        } else if (angular.equals(nv, scope.odsToggleValue)) {
                            // Check
                            element.prop('checked', true);
                        } else {
                            // Uncheck
                            element.prop('checked', false);
                        }
                    } else {
                        // Uncheck
                        element.prop('checked', false);
                    }
                }, true);
            }
        };
    });
}());