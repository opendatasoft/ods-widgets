(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsHubspotForm', function () {
        var alreadyCreated = [];
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsHubspotForm
         * @restrict E
         * @scope
         * @param {string} portalId The portal ID
         * @param {string} formId The form ID
         * @description
         * The odsHubspotForm widget integrates a HubSpot form given a portal ID and the form ID.
         *
         * @example
         *     <pre>
         *         <ods-hubspot-form portal-id="1234567" form-id="d1234564-987987987-4564654-7897-456465465"></ods-hubspot-form>
         *     </pre>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-hubspot-form" id="{{uniqueId}}"></div>',
            scope: {
                'portalId': '@',
                'formId': '@'
            },
            link: function(scope, element, attrs) {
                scope.uniqueId = 'hubspotform-' + Math.random().toString(36).substring(7);

                var onLoad = function() {
                    if (alreadyCreated.indexOf(scope.uniqueId) === -1) {
                        alreadyCreated.push(scope.uniqueId);
                        hbspt.forms.create({
                            portalId: attrs.portalId,
                            formId: attrs.formId,
                            target: '#' + scope.uniqueId
                        });
                    }
                };

                if (angular.isUndefined(window.hbspt)) {
                    LazyLoad.js('//js.hsforms.net/forms/v2.js', onLoad);
                } else {
                    onLoad();
                }


            }
        };
    });
}());