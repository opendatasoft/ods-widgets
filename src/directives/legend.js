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
         * @param {object} colorGradient object that provides colors, values and range of value. Also number of classes for steps display mode.
         * @param {string} title Legend title
         * @param {string} [subtitle='']  Legend sub-title
         * @param {string} [noValueColor=undefined] Display another step or square with the provided default color, can be any HTML color code.
         * @param {integer} [decimalPrecision=0] Set the decimal values precision
         * @param {string} [display=linear] Display mode, can be 'steps' or 'linear'
         *
         * @description
         * This widget displays a map legend computed with the color gradient structure from odsColorGradient widget.
         * 'steps' display is a legend with different steps, based on the range of values. Each step has it's own color and value range.
         * 'linear' display is a single color gradient from the min to the max value.
         *
         * WARNING: 'steps' display mode is only possible if ods-color-gradient-nb-classes option has been provided on odsColorGradient widget !
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="legend.html">
         *          <ods-dataset-context context="regions,population"
         *                               regions-dataset="contours-geographiques-des-regions-2019-copy"
         *                               regions-domain="public"
         *                               regions-parameters="{'q':'NOT (guadeloupe OR mayotte OR guyane OR martinique OR reunion)',
         *                                                   'disjunctive.region':true}"
         *                               population-dataset="population-millesimee-communes-2016"
         *                               population-parameters="{'disjunctive.nom_reg':true}"
         *                               population-domain="public">
         *
         *              <div ods-color-gradient="colorgradient"
         *                   ods-color-gradient-context="population"
         *                   ods-color-gradient-x="nom_reg"
         *                   ods-color-gradient-serie="SUM(population_totale)"
         *                   ods-color-gradient-high="rgb(20, 33, 96)"
         *                   ods-color-gradient-low="rgb(180, 197, 241)"
         *                   ods-color-gradient-nb-classes="4">
         *
         *                  <ods-map>
         *                      <ods-map-layer context="regions"
         *                                     color-categories="colorgradient['colors']"
         *                                     color-by-field="region"
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
                    if (!nv.range.min) {
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
