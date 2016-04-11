(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsRecordImage', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsRecordImage
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {Object} record Record to take the image from
         * @param {string} [field=none] Field to use. By default, the first `file` field will be used, but you can specify the field name if there are more than one.
         * @param {string} [domainUrl=none] the base url of the domain where the dataset can be record. By default, it uses the current.
         * @description
         * Displays an image from a record
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<div class="odswidget odswidget-record-image">' +
                '   <img class="odswidget-record-image__image" ng-if="imageUrl" ng-src="{{ imageUrl }}">' +
                '   <div class="odswidget-record-image__image odswidget-record-image__image--placeholder" ng-if="placeholder">' +
                '</div>',
            scope: {
                record: '=',
                field: '@',
                domainUrl: '@?'
            },
            controller: ['$scope', function($scope) {
                $scope.imageUrl = null;

                var render = function() {
                    var image = $scope.record.fields[$scope.field];
                    if (image.url) {
                        $scope.imageUrl = image.url;
                        $scope.placeholder = false;
                    } else if (image.placeholder) {
                        $scope.imageUrl = null;
                        $scope.placeholder = true;
                    } else {
                        $scope.imageUrl = ($scope.domainUrl || '') + '/explore/dataset/' + $scope.record.datasetid + '/files/' + image.id + '/300/';
                        $scope.placeholder = false;
                    }
                };

                $scope.$watch('[record, field]', function() {
                    render();
                }, true);
            }]
        };
    });
}());