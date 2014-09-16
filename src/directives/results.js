(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsResults', ['ODSAPI', function(ODSAPI) {
        return {
            restrict: 'A',
            scope: true,
            priority: 1001, // ng-repeat need to be executed when the results is in the scope.
            controller: function($scope, $attrs) {
                var init = $scope.$watch($attrs['odsResultsContext'], function(nv) {
                    var options = angular.extend({}, nv.parameters, {'rows': $attrs['odsResultsMax']});
                    var variable = $attrs['odsResults'] || 'results';
                    if (nv.type === 'catalog') {
                        ODSAPI.datasets.search(nv, options).success(function(data) {
                            $scope[variable] = data.datasets;
                        });
                    } else if (nv.type === 'dataset' && nv.dataset) {
                        ODSAPI.records.search(nv, options).success(function(data) {
                            $scope[variable] = data.records;
                        });
                    } else {
                        return;
                    }
                    init();
                }, true);
            }
        };
    }]);

}());
