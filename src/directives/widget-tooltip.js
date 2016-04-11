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
         *          <ods-dataset-context context="stations" stations-domain="public.opendatasoft.com" stations-dataset="jcdecaux_bike_data">
         *              <ods-media-gallery context="stations" ods-widget-tooltip>
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
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                var template,
                    displayedFields,
                    fields,
                    that = this;

                this.configure = function(options) {
                    template = options.defaultTemplate || '';
                    displayedFields = options.displayedFields || [];
                    fields = options.fields || [];
                };

                this.render = function(record, scopeCustomAttributes, currentField) {
                    var compiledTemplate,
                        newScope = $rootScope.$new(true);

                    newScope.record = angular.copy(record);
                    newScope.displayedFields = angular.copy(displayedFields);
                    newScope.fields = angular.copy(fields);

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
                }
            }]
        };
    }]);
}());
