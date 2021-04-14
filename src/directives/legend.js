(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsLegend', ['translate', 'AnalysisHelper', '$filter', function (translate, AnalysisHelper, $filter) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsLegend
         * @scope
         * @restrict E
         *
         * @param {object} colorGradient An object providing colors, values, and a range of value. It also provides the number of classes for the `steps` display mode.
         * @param {string} title Legend title
         * @param {string} [subtitle='']  Legend sub-title
         * @param {string} [noValueColor=undefined] Displays another step or square with the provided default color. The authorized values are any HTML color code.
         * @param {integer} [decimalPrecision=0] Sets the decimal values precision.
         * @param {string} [display=linear] Display mode. The authorized values are 'steps' and 'linear'.
         *
         * @description
         * The odsLegend widget displays a map legend computed with the color gradient structure from the odsColorGradient widget.
         * The `steps` display mode is a legend with different steps based on the range of values. Each step has its own color and value range.
         * The `linear` display mode is a single color gradient from the minimum to the maximum value.
         *
         * Note: You can use the `steps` display mode only if the ods-color-gradient-nb-classes option has been provided to the odsColorGradient widget.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="legend.html">
         *          <ods-dataset-context context="regions,population"
         *                               regions-dataset="regions-et-collectivites-doutre-mer-france"
         *                               regions-domain="https://documentation-resources.opendatasoft.com/"
         *                               regions-parameters="{'q':'NOT (guadeloupe OR mayotte OR guyane OR martinique OR reunion)',
         *                                                   'disjunctive.reg_name':true}"
         *                               population-dataset="populations-legales-communes-et-arrondissements-municipaux-france"
         *                               population-parameters="{'disjunctive.reg_name':true}"
         *                               population-domain="https://documentation-resources.opendatasoft.com/">
         *
         *              <div ods-color-gradient="colorgradient"
         *                   ods-color-gradient-context="population"
         *                   ods-color-gradient-x="reg_name"
         *                   ods-color-gradient-serie="SUM(com_arm_pop_tot)"
         *                   ods-color-gradient-high="rgb(20, 33, 96)"
         *                   ods-color-gradient-low="rgb(180, 197, 241)"
         *                   ods-color-gradient-nb-classes="4">
         *
         *                  <ods-map location="5,46.50595,3.40576">
         *                      <ods-map-layer context="regions"
         *                                     color-categories="colorgradient['colors']"
         *                                     color-by-field="reg_name"
         *                                     color-categories-other="lightgrey"
         *                                     display="categories"
         *                                     shape-opacity="0.85"
         *                                     title="Sum of cities population">
         *                      </ods-map-layer>
         *                  </ods-map>
         *
         *                  <ods-legend title="Population by region"
         *                              color-gradient="colorgradient"
         *                              display="steps"
         *                              decimal-precision="0"
         *                              subtitle="Cities population dataset - 2019"></ods-legend>
         *                  <ods-legend title="A linear alternative"
         *                              color-gradient="colorgradient"
         *                              display="linear"
         *                              no-value-color="lightgrey"
         *                              subtitle="With default color"></ods-legend>
         *              </div>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */

        var compare = function( a, b ) {
            if ( a.start < b.start){
                return -1;
            }
            if ( a.start > b.start ){
                return 1;
            }
            return 0;
        }

        return {
            restrict: 'E',
            replace: true,
            template:
                '<div class="odswidget odswidget-legend">' +
                '<div class="odswidget-legend__title" ng-bind="title" ng-if="title"></div>' +
                '<div class="odswidget-legend__subtitle" ng-bind="subtitle" ng-if="subtitle"></div>' +
                '<ul class="odswidget-legend__indexes odswidget-legend__steps_style"' +
                '    ng-if="style == \'steps\' && indexes">' +
                '   <li class="no-value" ng-hide="indexes" translate>No value available</li>' +
                '   <li class="odswidget-legend__index" ' +
                '       ng-repeat="i in (indexes | orderBy : \'value\')">' +
                '       <div class="odswidget-legend__index-circle"' +
                '            style="background-color: {{ i .color }}">' +
                '       </div>' +
                '       <div class="odswidget-legend__index-label" ng-if="(i.start | isDefined) && (i.end | isDefined)">' +
                '           {{ i.start | number : decimalPrecision }} - {{ i.end | number : decimalPrecision }}' +
                '       </div>' +
                '       <div class="odswidget-legend__index-label" ng-if="i.text">' +
                '           {{ i.text }}' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '<div ng-if="style == \'linear\' && indexes">' +
                '       <div class="odswidget-legend__inline_style">' +
                '           <div class="odswidget-legend__inline_style__column"' +
                '                ng-class="{\'odswidget-legend__inline_style__column__single-value\': indexes[0].color == indexes[1].color}"' +
                '                style="{{ \'background: linear-gradient(\' + indexes[0].color + \', \' + indexes[1].color + \')\' }}">' +
                '           </div>' +
                '           <div class="odswidget-legend__inline_style__labels">' +
                '               <div class="odswidget-legend__inline_style__first">{{ indexes[0].value | number : decimalPrecision }}</div>' +
                '               <div class="odswidget-legend__inline_style__last"' +
                '                    ng-if="indexes[0].value != indexes[1].value">{{ indexes[1].value | number : decimalPrecision }}</div>' +
                '           </div>' +
                '       </div>' +
                '       <div class="odswidget-legend__inline_style odswidget-legend__inline_style__novalue" ng-if="indexes[2].color">' +
                '           <div class="odswidget-legend__inline_style__novalue__color"' +
                '                style="background-color: {{ indexes[2].color }}">' +
                '           </div>' +
                '           <div class="odswidget-legend__inline_style__novalue__label">' +
                '                   {{ indexes[2].text }}' +
                '           </div>' +
                '       </div>' +
                '</div>' +
                '</div>' +
                '</div>',
            scope: {
                title: '@',
                subtitle: '@',
                noValueColor: '@',
                display: '@',
                decimalPrecision: '@',
                colorGradient: '='
            },
            link: function (scope) {
                scope.decimalPrecision = scope.decimalPrecision || 0;

                scope.$watch('colorGradient', function (nv, ov) {
                    if (angular.isUndefined(nv.range.min) || nv.range.min === null) {
                        return;
                    }

                    scope.indexes = [];
                    scope.style = scope.display || 'linear';

                    if (scope.style === 'steps') {
                        if (typeof scope.colorGradient.range.classes === "undefined") {
                            console.error('The classes must be defined in the color gradient structure to use display "steps".');
                            return;
                        }

                        scope.colorGradient.range.classes.sort(compare).forEach(function (obj) {
                            scope.indexes.push({
                                'color': obj.color,
                                'start': obj.start,
                                'end': obj.end
                            });
                        })

                        if (scope.noValueColor) {
                            scope.indexes.push({'color': scope.noValueColor, 'text': translate('No value')});
                        }
                    } else {
                        var mincolor = scope.colorGradient.range['low-color'];
                        var maxcolor = scope.colorGradient.range['high-color'];

                        scope.indexes.push({'color': mincolor, 'value': scope.colorGradient.range.min});
                        scope.indexes.push({'color': maxcolor, 'value': scope.colorGradient.range.max});
                        scope.indexes.push({'color': scope.noValueColor, 'text': translate('No value')});
                    }
                }, true);
            }
        };
    }]);

}());
