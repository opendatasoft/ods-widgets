(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('APIParamsV1ToV2', function () {
        return function(paramsV1) {
            var paramsV2 = {};
            if (!paramsV1) {
                return paramsV2;
            }


            var qClauses = [];
            angular.forEach(paramsV1, function (paramValue, paramName) {
                if (paramValue === null || typeof(paramValue) === "undefined") {
                    // Not a real value to translate
                    return;
                }

                // We can have `q`, and `q.<text>` parameters.
                if ((paramName === 'q' || paramName.startsWith('q.')) && paramValue) {
                    qClauses.push(paramValue);
                }

                /*
                Refine and exclude parameters are direct mirrors of each others.
                However, disjunctive is different: in V1, it was a specific parameter (`disjunctive.<name>=true`),
                but in V2, the disjunctive behavior is triggered by the `disjunctive` annotation on the field itself,
                configured by the publisher in the Back-office.
                This means that currently, a facet will always be disjunctive or not, based on its dataset configuration,
                and there is no way to change that in a query.
                 */

                if (paramName.startsWith('refine.')) {
                    paramsV2.refine = paramsV2.refine || [];
                    if (!angular.isArray(paramValue)) {
                        paramValue = [paramValue];
                    }
                    angular.forEach(paramValue, function(value) {
                        paramsV2.refine.push(paramName.substring(7) + ':' + value);
                    });
                }

                if (paramName.startsWith('exclude.')) {
                    paramsV2.exclude = paramsV2.exclude || [];
                    if (!angular.isArray(paramValue)) {
                        paramValue = [paramValue];
                    }
                    angular.forEach(paramValue, function(value) {
                        paramsV2.exclude.push(paramName.substring(8) + ':' + value);
                    });
                }

            });

            if (qClauses.length) {
                paramsV2.qv1 = '(' + qClauses.join(') AND (') + ')';
            }

            return paramsV2;
        }
    });
}());
