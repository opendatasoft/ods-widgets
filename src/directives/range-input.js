(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsRangeInput', ['$timeout', 'translate', '$compile', function ($timeout, translate, $compile) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsRangeInput
         * @scope
         * @restrict E
         * @param {any} ng-model Assignable angular expression to data-bind to the input
         * @param {number} min Minimum value of the range input.
         * @param {number} max Maximum value of the range input.
         * @param {number} step Sets the value's granularity. By default the granularity is 1
         * @param {number} selectableMin Limits the minimum value of the range input. Used mainly for two-way data binding
         * with a second range-input component. Unlike the two parameters listed below, This one modified the "min" of the
         * range input directly. The two below limit the value of the input.
         * @param {number} minValuePosition Used mainly for double sliders that depend on each other to set a range between 2 values.
         * If one slider has been moved beyond the value of the other slider, update the other slider value so that both "balls" are aligned.
         * This means that the value of the other slider can never be less than the value of the first, forcing a range.
         * @param {number} maxValuePosition Used mainly for double sliders that depend on each other to set a range between 2 values.
         * If one slider has been moved beyond the value of the other slider, update the other slider value so that both "balls" are aligned.
         * This means that the value of the slider can never be more than the value of the other slider, forcing a range.
         * @param {boolean} [editableValue=false] If enabled, an input type="number" will show to the right of the range
         * input with the current range value which can be modified directly in this input.
         * @param {string} iconMin Used to display an icon to the left of the range slider. FontAwesome or Opendatasoft
         * icon classes should be used here.
         * @param {string} iconMax Used to display an icon to the right of the range slider. FontAwesome or Opendatasoft
         * icon classes should be used here.
         * @param {string} iconMinTitle Adds a title attr to the min side of the input.
         * @param {string} iconMaxTitle Adds a title attr to the max side of the input.
         * @param {string} ariaLabelText Adds an aria-label attribute to the inputs
         * @description
         * This widget displays an input of type range that allows the user to select a numeric value which must
         * be no less than a given value, and no more than another given value.
         *
         * @example
         * <example module="ods-widgets">
         *     <file name="index.html">
         *         <div ng-init="values = {minvalue: 10, maxvalue: 30, currentvalue: 15}">
         *             <ods-range-input ng-model="values.currentvalue"
         *                  ng-model-options="{ debounce: 300 }"
         *                  min="values.minvalue"
         *                  max="values.maxvalue"
         *                  step="1"
         *                  icon-min="fa fa-globe"
         *                  icon-max="fa fa-tree"
         *                  icon-min-title="{{ 'World view'| translate }}"
         *                  icon-max-title="{{ 'Street level' | translate }}"
         *                  aria-label-text="Set layer visibility"></ods-range-input>
         *              {{ values.currentvalue }}
         *          </div>
         *     </file>
         * </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                ngModel: '=',
                min: '=',
                max: '=',
                step: '=',
                selectableMin: '=',
                minValuePosition: '=?',
                maxValuePosition: '=?',
                editableValue: '=',
                iconMin: '@',
                iconMax: '@',
                iconMinTitle: '@?',
                iconMaxTitle: '@?',
                ariaLabelText: '@'
            },
            require: 'ngModel',
            link: function (scope, element, attrs, ngModelCtrl) {

                var template =  '<div class="ods-range-input">' +
                                '    <i class="ods-range-input__icon ods-range-input__icon--min" ng-if="iconMin" title="{{ iconMinTitle }}" ng-class="iconMin"></i>' +
                                '    <input type="range"' +
                                '           min="{{ actualMin }}"' +
                                '           max="{{ max }}"' +
                                '           step="{{ step }}"' +
                                '           class="ods-range-input__range-input"' +
                                '           ng-change="onRangeChange()"' +
                                '           ng-model-options="{ debounce: 0 }"' +
                                '           ng-model="values.internalRange"' +
                                '           aria-label="{{rangeLabel}}"' +
                                '           title="{{ values.internalRange }}">' +
                                '    <i class="ods-range-input__icon ods-range-input__icon--max" ng-if="iconMax" title="{{ iconMaxTitle }}" ng-class="iconMax"></i>' +
                                '    <input class="ods-range-input__value-input" ' +
                                '          ng-change="onValueChange()" ' +
                                '          ng-if="editableValue" ' +
                                '          type="number" ' +
                                '          ng-model="values.internalValue"' +
                                '          ng-model-options="{ debounce: 0 }"' +
                                '          ng-blur="onValueBlur()"' +
                                '          min="{{ actualMin }}" ' +
                                '          max="{{ max }}" ' +
                                '          step="{{ step }}"' +
                                '          aria-label="{{inputLabel}}">' +
                                '</div>';



                var newElement = angular.element(template);
                element.replaceWith(newElement);
                $compile(newElement)(scope);

                var inputElement = element.find('.ods-range-input__input');
                scope.values = {};
                if (angular.isDefined(scope.selectableMin)) {
                    scope.actualMin = scope.selectableMin;
                } else {
                    scope.actualMin = scope.min;
                }

                scope.rangeLabel = format_string(translate('{label} slider'), {label: scope.ariaLabelText});
                scope.inputLabel = format_string(translate('{label} input'), {label: scope.ariaLabelText});

                var isValueInvalid = function () {
                    return isNaN(scope.values.internalValue) || scope.values.internalValue < scope.actualMin || scope.values.internalValue > scope.max;
                };

                scope.onRangeChange = function() {
                    var num = parseFloat(scope.values.internalRange, 10);
                    scope.values.internalValue = num;
                    ngModelCtrl.$setViewValue(num);
                };

                scope.onValueChange = function() {
                    if (isValueInvalid()) {
                        return;
                    }

                    scope.values.internalRange = scope.values.internalValue.toString();
                    ngModelCtrl.$setViewValue(scope.values.internalValue);
                };

                scope.onValueBlur = function () {
                    if (isValueInvalid()) {
                        scope.onRangeChange();
                    }
                };

                ngModelCtrl.$render = function() {
                    scope.values.internalValue = ngModelCtrl.$modelValue;
                    scope.values.internalRange = ngModelCtrl.$modelValue.toString();
                };

                scope.$watch('selectableMin', function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        inputElement.css({width: ((scope.max - newValue) / (scope.max - scope.min) * 100) + '%'});
                        scope.actualMin = newValue;
                        if (newValue >= scope.ngModel) {
                            scope.ngModel = newValue;
                        }
                    }
                });

                // Used mainly for double sliders that depend on each other to set a range between 2 values.
                // If one slider has been moved beyond the value of the other slider, update the other slider value so that both "balls" are aligned.
                // This means that the value of the other slider can never be less than the value of the first, forcing a range.
                scope.$watch('minValuePosition', function(newValue, oldValue) {
                    if(newValue !== oldValue) {
                        if (newValue >= scope.ngModel) {
                            scope.ngModel = newValue;
                        }

                    }
                });
                // If one slider has been moved beyond the value of the other slider, update the other slider value so that both "balls" are aligned.
                // This means that the value of the slider can never be more than the value of the other slider, forcing a range.
                scope.$watch('maxValuePosition', function(newValue, oldValue) {
                    if(newValue !== oldValue) {
                        if (newValue <= scope.ngModel) {
                            scope.ngModel = newValue;
                        }
                    }
                });

                // Workaround for the lousy AngularJS support of input[range]
                $timeout(function() {
                    newElement.find('.ods-range-input__range-input').val(scope.values.internalRange);
                });
            }
        };
    }]);
})();
