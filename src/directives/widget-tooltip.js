(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsWidgetTooltip', ['$rootScope', '$compile', function($rootScope, $compile) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsWidgetTooltip
         * @restrict A
         * @transclude
         *
         * @description
         * This directive is a helper for displaying custom tooltip.
         * It allows to configure the usable fields in the tooltip and the template and does the html rendering giving
         * back the compiled html to the calling widget.
         * By default the template for the custom tooltip can access the record and a `displayedFields` array that lists
         * the record fields that should appear in the tooltip.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="affiches"
         *                               affiches-domain="https://widgets-examples.opendatasoft.com/"
         *                               affiches-dataset="affiches-anciennes">
         *              <ods-media-gallery context="affiches" ods-auto-resize ods-widget-tooltip>
         *                  <h3>My custom tooltip</h3>
         *                  {{ getRecordTitle(record) }}
         *              </ods-media-gallery>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'A',
            priority: 100,
            transclude: true,
            controller: ['$scope', '$element', '$attrs', '$transclude', 'ODSWidgetsConfig', function($scope, $element, $attrs, $transclude, ODSWidgetsConfig) {
                var template,
                    displayedFields,
                    fields,
                    context,
                    that = this;

                this.configure = function(options) {
                    template = options.defaultTemplate || '';
                    displayedFields = options.displayedFields || [];
                    fields = options.fields || [];
                    context = options.context || {};
                };

                this.render = function(record, scopeCustomAttributes, currentField) {
                    var compiledTemplate,
                        newScope = $rootScope.$new(true);

                    newScope.record = angular.copy(record);
                    newScope.displayedFields = angular.copy(displayedFields);
                    newScope.fields = angular.copy(fields);
                    newScope.context = angular.copy(context);
    
                    newScope.domain = {
                        current_language: ODSWidgetsConfig.language
                    };

                    if (currentField) {
                        newScope.displayedFields =  newScope.displayedFields.filter(function(field) {
                            return currentField !== field.name;
                        });
                    }

                    angular.merge(newScope, scopeCustomAttributes || {});

                    if (!template) {
                        $transclude($rootScope.$new(true), function(clone, scope) {
                            if (clone.length > 0) {
                                template = clone;
                            } else {
                                template = that.defaultTemplate;
                            }
                        });
                    }

                    compiledTemplate = $compile(template);

                    return compiledTemplate(newScope);
                };
            }]
        };
    }]);
}());
