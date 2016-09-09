(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    var refineOnClickDirective = function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:refineOnClick
         * @restrict A
         * @scope
         * @description
         * This directive will refine the given context(s) for a click on an element representing a record.
         *
         * It works in conjunction with a finite set of other directives:
         * * {@link ods-widgets.directive:odsCalendar odsCalendar}
         * * {@link ods-widgets.directive:odsMediaGallery odsMediaGallery}
         * * {@link ods-widgets.directive:odsMap odsMap}
         * * {@link ods-widgets.directive:odsChart odsChart}
         * * {@link ods-widgets.directive:odsChartSerie odsChartSerie}
         *
         * In order for a widget to support refineOnClick, it must accept within it link function an optional
         * refineOnClickCtrl that exposes a method refineOnClickCtrl.refineContext(record) that must be called for
         * each relevant click.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <my-directive refine-on-click
         *                        refine-on-click-context="mycontext"
         *                        refine-on-click-record-field="field1"
         *                        refine-on-click-context-field="field2"></my-directive>
         *      </file>
         *  </example>
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <my-directive refine-on-click
         *                        refine-on-click-context="mycontext, mycontext2"
         *                        refine-on-click-mycontext-record-field="field1"
         *                        refine-on-click-mycontext-context-field="field2"
         *                        refine-on-click-mycontext2-record-field="field3"
         *                        refine-on-click-mycontext2-context-field="field4"></my-directive>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {
                var refineConfigurations = [];

                // the exposed methods

                this.refineOnRecord = function (record) {
                    angular.forEach(refineConfigurations, function (refineConf) {
                        refineConf.context.toggleRefine(refineConf.contextField, record.fields[refineConf.recordField]);
                    });
                };

                this.refineOnValue = function (value) {
                    angular.forEach(refineConfigurations, function (refineConf) {
                        refineConf.context.toggleRefine(refineConf.contextField, value);
                    });
                };

                // parse attributes and build conf
                var unwatchRefineOnClick = $scope.$watch(
                    function () {
                        return $attrs.refineOnClickContext
                    },
                    function (nv) {
                        // parse contexts
                        var contextNames = nv.split(',');
                        var contexts = [];
                        var allContextDefined = true;
                        angular.forEach(contextNames, function (contextName) {
                            var context = $scope[contextName];
                            allContextDefined = allContextDefined && angular.isDefined(context);
                            contexts.push(context);
                        });
                        if (!allContextDefined) {
                            return;
                        }

                        // parse refine options
                        angular.forEach(contexts, function (context) {
                            var attributeName = 'refineOnClick' + ODS.StringUtils.capitalize(context.name);
                            refineConfigurations.push({
                                context: context,
                                recordField: $attrs[attributeName + 'RecordField'] || $attrs['refineOnClickRecordField'],
                                contextField: $attrs[attributeName + 'ContextField'] || $attrs['refineOnClickContextField']
                            });
                            unwatchRefineOnClick();
                        });
                    }
                );
            }
        };
    };

    mod.directive('refineOnClick', refineOnClickDirective);
    // backward compatibility with previous implementations
    mod.directive('refineOnClickContext', refineOnClickDirective);
})();
