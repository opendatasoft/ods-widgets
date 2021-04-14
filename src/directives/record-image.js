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
         * @param {string} [field=none] Field to use. By default, the first `file` field is used, but you can specify the field name if there is more than one field.
         * @param {string} [domainUrl=none] The base URL of the domain where the dataset can be found. By default, the current domain is used.
         * @description
         * The odsRecordImage displays an image from a record.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '' +
                '<div class="odswidget odswidget-record-image">' +
                '   <img class="odswidget-record-image__image" ng-style="{ \'background-image\': prefetchBackground}" ng-if="imageUrl" ng-src="{{ imageUrl }}">' +
                '   <div class="odswidget-record-image__image odswidget-record-image__image--tiff-placeholder" ng-if="tiffPlaceholder">' +
                '   <div class="odswidget-record-image__image odswidget-record-image__image--placeholder" ng-if="placeholder">' +
                '</div>',
            scope: {
                record: '=',
                field: '@',
                domainUrl: '@?'
            },
            link: function(scope) {
                scope.imageUrl = null;
                scope.placeholder = false;
                scope.tiffPlaceholder = false;
                var render = function() {
                    var image = scope.record.fields[scope.field];
                    if (image && typeof image !== 'object') {
                        console.error('Widget <record-image> requires a file field type');
                    } else if (image && image.format.toLowerCase() === "tiff") {
                        scope.tiffPlaceholder = true;
                    } else if (image.url) {
                        scope.imageUrl = image.url;
                        scope.placeholder = false;
                    } else if (image.placeholder) {
                        scope.imageUrl = null;
                        scope.placeholder = true;
                    } else {
                        scope.imageUrl = ODS.Record.getImageUrl(scope.record, scope.field, scope.domainUrl);
                        scope.placeholder = false;
                    }
                    if (image.color_summary) {
                        scope.prefetchBackground = "linear-gradient(to bottom, " + image.color_summary.join(",") + ")";
                    }
                };

                scope.$watch('[record, field]', function(nv, ov) {
                    render();
                }, true);
            }
        };
    });
}());


