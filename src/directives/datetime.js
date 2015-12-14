(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDatetime', function() {
        /**
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsDatetime
         *  @restrict A
         *  @scope
         *  @description
         *  Get the ISO local datetime and store it into a variable (into the scope).
         *  Equivalent to moment().format() javascript call.
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ANY ods-datetime="datetime">
         *              {{ datetime|moment:'YYYY-MM-DD HH:mm:ss' }}
         *          </ANY>
         *     </file>
         * </example>
         */
        return {
            restrict: 'A',
            controller: ['$scope', '$attrs', '$q', function($scope, $attrs, $q) {
                var variable = $attrs.odsDatetime || 'datetime';
                $scope[variable] = moment().format()
            }]
        };
    });

}());
