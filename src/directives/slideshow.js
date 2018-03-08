(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsSlideshow', ['ODSAPI', '$timeout', function (ODSAPI, $timeout) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSlideshow
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} imageField The name of the field containing the image.
         * @param {string} [titleFields] A comma-separated list of field names to display as comma-separated values in the title.
         * @param {string} [domainUrl] The URL of the domain
         *
         * @description
         * This widget displays an image slideshow of a dataset containing media with thumbnails (images, pdf files...).
         * You will need to set a height for the .ods-slideshow class for it to work correctly or set the height
         * through the style attribute.
         * You can also include a tooltip that can access the image's record through the 'record' variable.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="streetart"
         *                               streetart-domain="https://data.opendatasoft.com"
         *                               streetart-dataset="liste-fresques-urbaines-roubaix@ville-de-roubaix">
         *              <ods-slideshow context="streetart"
         *                             image-field="photo"
         *                             title-fields="nom_graffeur"
         *                             style="height: 300px">
         *                  <strong>{{ record.fields.nom_graffeur }}</strong> <br>
         *                  Location:
         *                  <ods-geotooltip coords="record.fields.geo">{{ record.fields.adresse }}</ods-geotooltip>
         *              </ods-slideshow>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                context: '=',
                imageField: '@?',
                titleFields: '@',
                domainUrl: '@?'
            },
            template: '' +
            '<div class="ods-slideshow" ' +
            '     ng-keydown="onKeyDown($event)" ' +
            '     tabindex="0" ' +
            '     aria-label="Slideshow"' +
            '     translate="aria-label">' +
            '    <div class="ods-slideshow__image-wrapper">' +
            '        <button class="ods-slideshow__previous-button"' +
            '                ng-click="loadPreviousImage()"' +
            '                ng-disabled="currentIndex <= 1"' +
            '                aria-label="View previous image"' +
            '                translate="aria-label">' +
            '            <i class="fa fa-angle-left ods-slideshow__previous-icon" aria-hidden="true"></i>' +
            '        </button>' +
            '        <ods-spinner ng-show="loading"></ods-spinner>' +
            '        <img src="{{ imageUrl}}" ' +
            '             alt="{{ imageTitle }}" ' +
            '             class="ods-slideshow__image"' +
            '             width="{{ imageWidth }}"' +
            '             height="{{ imageHeight }}"' +
            '             ng-show="imageThumbnail"  >' +
            '        <div class="ods-slideshow__tooltip-wrapper"' +
            '             ng-if="tooltip">' +
            '            <div class="ods-slideshow__tooltip" ' +
            '                 inject>' +
            '                <dl>' +
            '                   <dt ng-repeat-start="field in context.dataset.fields"' +
            '                           ng-if="record.fields[field.name]|isDefined">' +
            '                       {{ field.label }}' +
            '                   </dt>' +
            '                   <dd ng-repeat-end ng-switch="field.type"' +
            '                           ng-if="record.fields[field.name]|isDefined">' +
            '                        <span ng-switch-when="geo_point_2d">' +
            '                           <ods-geotooltip width="300" height="300"' +
            '                                   coords="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
            '                        </span>' +
            '                        <span ng-switch-when="geo_shape">' +
            '                            <ods-geotooltip width="300" height="300"' +
            '                                   geojson="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
            '                        </span>' +
            '                        <span ng-switch-when="double">{{ record.fields|formatFieldValue:field:context }}</span>' +
            '                        <span ng-switch-when="int">{{ record.fields|formatFieldValue:field:context }}</span>' +
            '                        <span ng-switch-when="date">{{ record.fields|formatFieldValue:field:context }}</span>' +
            '                        <span ng-switch-when="datetime">{{ record.fields|formatFieldValue:field:context }}</span>' +
            '                        <span ng-switch-when="file">' +
            '                            <div ng-bind-html="record.fields|formatFieldValue:field:context"></div>' +
            '                        </span>' +
            '                       <span ng-switch-default ng-bind-html="record.fields[field.name]|prettyText|nofollow|safenewlines"></span>' +
            '                   </dd>' +
            '                </dl>' +
            '            </div>' +
            '        </div>' +
            '        <div class="ods-slideshow__cannot-display" ' +
            '             ng-hide="imageThumbnail">' +
            '            <i class="fa fa-eye-slash ods-slideshow__cannot-display-icon"></i>' +
            '            <div class="ods-slideshow__cannot-display-message" translate>Sorry, this file cannot be displayed</div>' +
            '        </div>' +
            '        <button class="ods-slideshow__next-button"' +
            '                ng-click="loadNextImage()"' +
            '                aria-label="View next image"' +
            '                translate="aria-label"' +
            '                ng-disabled="currentIndex >= lastIndex">' +
            '            <i class="fa fa-angle-right ods-slideshow__next-icon" aria-hidden="true"></i>' +
            '        </button>' +
            '    </div>' +
            '    <div class="ods-slideshow__image-legend">' +
            '        <div class="ods-slideshow__image-index">{{ currentIndex|number:0 }}/{{ lastIndex|number:0 }}</div>' +
            '        <div class="ods-slideshow__image-title" title="{{ imageTitle }}" ng-bind="imageTitle"></div>' +
            '        <div class="ods-slideshow__toggles">' +
            '            <button class="ods-slideshow__tooltip-toggle"' +
            '                    aria-label="Toggle tooltip"' +
            '                    translate="aria-label"' +
            '                    ng-click="toggleTooltip()">' +
            '                <i class="fa fa-question-circle" aria-hidden="true"></i>' +
            '            </button>' +
            '            <button class="ods-slideshow__fullscreen-toggle"' +
            '                    aria-label="Toggle fullscreen"' +
            '                    translate="aria-label"' +
            '                    ng-click="toggleFullscreen()">' +
            '                <i class="fa fa-arrows-alt" ng-hide="fullscreen" aria-hidden="true"></i>' +
            '                <i class="fa fa-compress" ng-show="fullscreen" aria-hidden="true"></i>' +
            '            </button>' +
            '        </div>' +
            '    </div>' +
            '</div>',
            link: function (scope, element) {
                // pagination
                scope.loading = false;
                scope.currentIndex = 0;
                scope.lastIndex = 0;
                // image properties
                scope.imageUrl = '';
                scope.imageTitle = '';
                scope.imageWidth = 0;
                scope.imageHeight = 0;
                scope.imageThumbnail = true;
                // toggles
                scope.fullscreen = false;
                scope.tooltip = false;

                var titleFields;
                if (angular.isDefined(scope.titleFields)) {
                    titleFields = scope.titleFields.split(',');
                }
                var imageWrapperElement = $(element).children('.ods-slideshow__image-wrapper');
                var $imageIndex = $(element).find('.ods-slideshow__image-index');
                var $image = $(element).find('.ods-slideshow__image');
                var image;

                var resizeImage = function () {
                    if (image) {
                        var ratio = Math.min(imageWrapperElement.width() / image.width, imageWrapperElement.height() / image.height, 1);
                        scope.imageWidth = ratio * image.width;
                        scope.imageHeight = ratio * image.height;
                        scope.$apply();
                    }
                };

                var loadImage = function (index) {
                    var searchParameters = angular.extend({}, scope.context.parameters, {
                        rows: 1,
                        start: index - 1,
                        q: 'NOT #null(' + scope.imageField + ')'
                    });
                    scope.loading = true;
                    ODSAPI.records.search(scope.context, searchParameters)
                        .success(function (response) {
                            // update index
                            if (!scope.lastIndex) {
                                scope.currentIndex = response.nhits;
                                scope.lastIndex = response.nhits;
                                $timeout(function () {
                                    $imageIndex.css({width: 'auto'});
                                    $timeout(function () {
                                        $imageIndex.css({width: $imageIndex.outerWidth()});
                                        scope.lastIndex = response.nhits;
                                        scope.currentIndex = index;
                                    });
                                });
                            } else {
                                scope.lastIndex = response.nhits;
                                scope.currentIndex = index;
                            }
                            if (response.records.length) {
                                var record = response.records[0];
                                image = record.fields[scope.imageField];
                                // thumbnail
                                scope.imageThumbnail = image.thumbnail;
                                // URL
                                if (image.thumbnail) {
                                    scope.imageUrl = ODS.Record.getImageUrl(record, scope.imageField, scope.context.domainUrl);
                                } else {
                                    scope.imageUrl = '';
                                }
                                // Legend
                                if (titleFields.length) {
                                    scope.imageTitle = titleFields
                                        .filter(function (field) {
                                            return record.fields[field];
                                        })
                                        .map(function (field) {
                                            return record.fields[field];
                                        })
                                        .join(', ');
                                }
                                // save into scope for the tooltip
                                scope.record = record;
                            }
                            scope.loading = false;
                        })
                        .error(function () {
                            scope.loading = false;
                        });
                };

                scope.loadPreviousImage = function () {
                    if (scope.currentIndex > 1) {
                        loadImage(scope.currentIndex - 1);
                    }
                };

                scope.loadNextImage = function () {
                    if (scope.currentIndex < scope.lastIndex) {
                        loadImage(scope.currentIndex + 1);
                    }
                };

                scope.toggleFullscreen = function () {
                    // Taken from https://developer.mozilla.org/fr/docs/Web/Guide/DOM/Using_full_screen_mode
                    var target = element[0];
                    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
                        if (target.requestFullscreen) {
                            target.requestFullscreen();
                        } else if (target.mozRequestFullScreen) {
                            target.mozRequestFullScreen();
                        } else if (target.webkitRequestFullscreen) {
                            target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                        }
                    } else {
                        if (document.cancelFullScreen) {
                            document.cancelFullScreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        } else if (document.webkitCancelFullScreen) {
                            document.webkitCancelFullScreen();
                        }
                    }
                };

                scope.toggleTooltip = function () {
                    scope.tooltip = !scope.tooltip;
                };

                scope.onKeyDown = function ($event) {
                    if (scope.loading) {
                        return;
                    }
                    // right arrow: load next image
                    if ($event.keyCode == 39) {
                        scope.loadNextImage();
                        return;
                    }
                    // left arrow: load previous image
                    if ($event.keyCode == 37) {
                        scope.loadPreviousImage();
                        return;
                    }
                };

                $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function (event) {
                    if (event.target == element[0]) {
                        scope.fullscreen = !scope.fullscreen;
                        $timeout(resizeImage);
                    }
                });

                $image.on('load', resizeImage);

                // find
                var unwatch = scope.$watch('context.dataset', function (nv) {
                    if (nv) {
                        var i, field;
                        if (!titleFields) {
                            for (i = 0; i < scope.context.dataset.fields.length; i++) {
                                field = scope.context.dataset.fields[i];
                                if (field.type === 'text') {
                                    titleFields = [field.name];
                                    break;
                                }
                            }
                        }
                        if (!scope.imageField) {
                            for (i = 0; i < scope.context.dataset.fields.length; i++) {
                                field = scope.context.dataset.fields[i];
                                if (field.type === 'file') {
                                    scope.imageField = field.name;
                                    break;
                                }
                            }
                        }
                        loadImage(1);
                        unwatch();

                        scope.$watch('context.parameters', function (nv, ov) {
                            if (!angular.equals(nv, ov)) {
                                scope.currentIndex = 0;
                                scope.lastIndex = 0;
                                loadImage(1);
                            }
                        }, true);
                    }
                }, true);
            }
        };
    }]);
}());
