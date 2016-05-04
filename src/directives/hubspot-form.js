(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsHubspotForm', function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsHubspotForm
         * @restrict E
         * @scope
         * @param {string} portalId The portal ID
         * @param {string} formId The form ID
         * @description
         * Integrates a Hubspot form given a portal ID and the form ID.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-hubspot-form portal-id="1234567" form-id="d1234564-987987987-4564654-7897-456465465"></ods-hubspot-form>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-hubspot-form"></div>',
            scope: {
                'portalId': '@',
                'formId': '@'
            },
            link: function(scope, element, attrs) {
                LazyLoad.js('//js.hsforms.net/forms/v2.js', function() {
                    hbspt.forms.create({ portalId: attrs.portalId ,formId: attrs.formId, target:'.odswidget-hubspot-form' });
                });
            }
        };
    });
}());