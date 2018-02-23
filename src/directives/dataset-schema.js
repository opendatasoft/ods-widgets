(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDatasetSchema', ['ODSAPI', function (ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDatasetSchema
         * @restrict E
         * @scope
         * @description
         * Display a table describing the schema of a dataset. For each field, it provides the label, name,
         * description, type and an example
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context}
         *
         * @example
         * <example module="ods-widgets">
         *     <file name="index.html">
         *         <ods-dataset-context context="tree" tree-dataset="arbresremarquablesparis2011" tree-domain="parisdata.opendatasoft.com">
         *             <ods-dataset-schema context="tree"></ods-dataset-schema>
         *         </ods-dataset-context>
         *    </file>
         * </example>
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                'context': '='
            },
            template: '' +
            '<div class="odswidget-dataset-schema">' +
            '   <div class="odswidget-dataset-schema__field" ' +
            '        ng-repeat="field in context.dataset.fields">' +
            '       <div class="odswidget-dataset-schema__field-label">{{ field.label }}</div>' +
            '       <div class="odswidget-dataset-schema__field-details">' +
            '           <div class="odswidget-dataset-schema__field-description-wrapper">' +
            '               <pre class="odswidget-dataset-schema__field-description"' +
            '                    ng-show="field.description">{{ field.description }}</pre>' +
            '               <p class="odswidget-dataset-schema__field-description odswidget-dataset-schema__field-description--empty"' +
            '                  ng-hide="field.description" translate>No description available for this field.</p>' +
            '           </div>' +
            '               <table class="odswidget-dataset-schema__field-properties">' +
            '                   <tr class="odswidget-dataset-schema__field-name">' +
            '                       <td class="odswidget-dataset-schema__field-properties-key">' +
            '                           <span translate>Name (identifier)</span>' +
            '                       </td>' +
            '                       <td class="odswidget-dataset-schema__field-properties-value">' +
            '                           <pre class="odswidget-dataset-schema__field-name-value">{{ field.name }}</pre>' +
            '                       </td>' +
            '                   </tr>' +
            '                   <tr class="odswidget-dataset-schema__field-type">' +
            '                       <td class="odswidget-dataset-schema__field-properties-key">' +
            '                           <span translate>Type</span>' +
            '                       </td>' +
            '                       <td class="odswidget-dataset-schema__field-properties-value">' +
            '                           <pre class="odswidget-dataset-schema__field-type-value">{{ field.type | translate }}</pre>' +
            '                       </td>' +
            '                   </tr>' +
            '                   <tr class="odswidget-dataset-schema__field-type"' +
            '                       ng-repeat="annotation in field.annotations|filter:{name: \'unit\'}:true">' +
            '                       <td class="odswidget-dataset-schema__field-properties-key">' +
            '                           <span translate>Unit</span>' +
            '                       </td>' +
            '                       <td class="odswidget-dataset-schema__field-properties-value">' +
            '                           <pre class="odswidget-dataset-schema__field-type-value">{{ annotation.args[0] }}</pre>' +
            '                       </td>' +
            '                   </tr>' +
            '                   <tr class="odswidget-dataset-schema__field-sample">' +
            '                       <td class="odswidget-dataset-schema__field-properties-key">' +
            '                           <span translate>Sample</span>' +
            '                       </td>' +
            '                       <td class="odswidget-dataset-schema__field-properties-value">' +
            '                           <pre class="odswidget-dataset-schema__field-sample-value">{{ sample.fields[field.name] }}</pre>' +
            '                       </td>' +
            '                   </tr>' +
            '               </table>' +
            '       </div>' +
            '   </div>' +
            '</div>',
            link: function (scope) {
                scope.sample = {};

                scope.context.wait().then(function () {
                    // retrieve sample
                    var options = {
                        rows: 1
                    };
                    if (scope.context.parameters.source) {
                        options.source = scope.context.parameters.source;
                    }
                    if (scope.context.dataset.data_visible) {
                        ODSAPI.records.search(scope.context, options)
                            .success(function (data) {
                                scope.sample = data.records[0];
                            });
                    }
                });

            }
        };
    }]);
}());
