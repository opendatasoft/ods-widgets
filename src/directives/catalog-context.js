(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCatalogContext', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCatalogContext
         * @scope
         * @restrict AE
         */

        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            link: function(scope, element, attrs) {
                var contextNames = attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // Do we have a domain ID?
                    var domain = attrs[contextName+'Domain'];

                    scope[contextName] = {
                        'name': contextName,
                        'type': 'catalog',
                        'domain': domain,
                        'domainUrl': ODSAPI.getDomainURL(domain),
                        'apikey': attrs[contextName+'Apikey'],
                        'parameters': scope.$eval(attrs[contextName+'Parameters']) || {}
                    };
                }
            }
        };
    }]);
}());