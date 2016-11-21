(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsRangeInput', [function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                min: '=',
                selectableMin: '=',
                max: '=',
                step: '=',
                editableValue: '=',
                ngModel: '=',
                iconMin: '@',
                iconMax: '@'
            },
            require: 'ngModel',
            template: '' +
            '<div class="ods-range-input">' +
            '    <i class="ods-range-input__icon ods-range-input__icon--min" ng-if="iconMin" ng-class="iconMin"></i>' +
            '    <input type="range"' +
            '           min="{{ actualMin }}"' +
            '           max="{{ max }}"' +
            '           step="{{ step }}"' +
            '           class="ods-range-input__range-input"' +
            '           ng-change="onRangeChange()"' +
            '           ng-model="values.internalRange">' +
            '    <i class="ods-range-input__icon ods-range-input__icon--max" ng-if="iconMax" ng-class="iconMax"></i>' +
            '   <input class="ods-range-input__value-input" ng-change="onValueChange()" ng-if="editableValue" type="number" ng-model="values.internalValue" min="{{ actualMin }}" max="{{ max }}" step="{{ step }}">' +
            '</div>',
            link: function (scope, element, attrs, ngModelCtrl) {
                var inputElement = element.find('.ods-range-input__input');
                scope.values = {};
                if (angular.isDefined(scope.selectableMin)) {
                    scope.actualMin = scope.selectableMin;
                } else {
                    scope.actualMin = scope.min;
                }

                scope.onRangeChange = function() {
                    var num = parseFloat(scope.values.internalRange, 10);
                    scope.values.internalValue = num;
                    ngModelCtrl.$setViewValue(num);
                };
                scope.onValueChange = function() {
                    scope.values.internalRange = scope.values.internalValue.toString();
                    ngModelCtrl.$setViewValue(scope.values.internalValue);
                };
                ngModelCtrl.$render = function() {
                    scope.values.internalValue = ngModelCtrl.$modelValue;
                    scope.values.internalRange = ngModelCtrl.$modelValue.toString();
                };

                scope.$watch('selectableMin', function (nv, ov) {
                    if (nv != ov) {
                        inputElement.css({width: ((scope.max - nv) / (scope.max - scope.min) * 100) + '%'});
                        scope.actualMin = nv;
                        if (nv >= scope.ngModel) {
                            scope.ngModel = nv;
                        }
                    }
                });
            }
        }
    }]);
})();
