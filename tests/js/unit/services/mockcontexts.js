(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory('MockContextHelper', ['ContextHelper', function (ContextHelper) {
        return {
            getDatasetContext: function(contextName, domainId, datasetId, contextParameters, source, apikey, schema) {
                var context = ContextHelper.getDatasetContext(contextName, domainId, datasetId, contextParameters, source, apikey, schema);
                context.domainUrl = '';
                context.wait = function() { return { then: function(fn){fn();} } };

                return context;
            }
        };
    }]);
}());
