(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsResultEnumerator', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsResultEnumerator
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} [max=10] Maximum number of results to show
         * @param {boolean} [showHitsCounter=false] Display the number of hits (search results). This is the number of results available on the API, not the number of results displayed in the widget.
         * @description
         * This widget enumerates the results of a search (records for a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, datasets for a {@link ods-widgets.directive:odsCatalogContext Catalog Context}) and repeats the template (the content of the directive element) for each of them.
         *
         * If used with a {@link ods-widgets.directive:odsCatalogContext Catalog Context}, for each result, the following AngularJS variables are available:
         *
         *  * item.datasetid: Dataset identifier of the dataset
         *  * item.metas: An object holding the key/values of metadata for this dataset
         *
         * If used with a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, for each result, the following AngularJS variables are available:
         *
         *  * item.datasetid: Dataset identifier of the dataset this record belongs to
         *  * item.fields: an object hold all the key/values for the record
         *  * item.geometry: if the record contains geometrical information, this object is present and holds its GeoJSON representation
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="public" public-domain="public.opendatasoft.com">
         *              <ul>
         *                  <ods-result-enumerator context="public">
         *                      <li>
         *                          <strong>{{item.metas.title}}</strong>
         *                          (<a ng-href="{{context.domainUrl + '/explore/dataset/' + item.datasetid + '/'}}" target="_blank">{{item.datasetid}}</a>)
         *                      </li>
         *                  </ods-result-enumerator>
         *              </ul>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                context: '=',
                max: '@?',
                showHitsCounter: '@?'
            },
            template: '<div class="odswidget odswidget-result-enumerator">' +
                '<div ods-results="items" ods-results-context="context" ods-results-max="{{max}}">' +
                '<div ng-if="!items.length" class="no-results" translate>No results</div>' +
                '<div ng-if="items.length && hitsCounter" class="results-count">{{items.length}} <translate>results</translate></div>' +
                '<div ng-repeat="item in items" inject class="item""></div>' +
                '</div>' +
                '</div>',
            controller: ['$scope', function($scope) {
                $scope.max = $scope.max || 10;
                $scope.hitsCounter = (angular.isString($scope.showHitsCounter) && $scope.showHitsCounter.toLowerCase() === 'true');
            }]
        };
    }]);

}());
