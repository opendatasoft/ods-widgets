(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMediaGallery', ['$timeout', '$q', 'ODSAPI', function($timeout, $q, ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMediaGallery
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} [displayedFields=all] A comma-separated list of fields to display in the details for each thumbnail. If no value is specified, the options configured for the dataset are used or all fields if nothing configured.
         * @param {string} [imageFields=all] A comma-separated list of fields to display in the gallery as thumbnails. If no value is specified, the options configured for the dataset are used or all media fields if nothing configured.
         * @param {string} [odsWidgetTooltip] {@link ods-widgets.directive:odsWidgetTooltip Widget Tooltip}
         * @param {boolean} [odsAutoResize] see {@link ods-widgets.directive:odsAutoResize Auto Resize} for more informations
         * @param {boolean} [refineOnClick] see {@link ods-widgets.directive:refineOnClick Refine on click} for more informations. This option takes precedence over the widget tooltip.
         *
         * @description
         * This widget displays an image gallery of a dataset containing media with thumbnails (images, pdf files...) with infinite scroll.
         * You can use the {@link ods-widgets.directive:odsWidgetTooltip Widget Tooltip} directive to customize the detail view appearing when selecting a thumbnail.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-dataset-context context="stations" stations-domain="public.opendatasoft.com" stations-dataset="frenchcheese">
         *              <ods-media-gallery context="stations" ods-auto-resize ods-widget-tooltip>
         *                  <h3>My custom tooltip</h3>
         *                  {{ getRecordTitle(record) }}
         *              </ods-media-gallery>
         *          </ods-dataset-context>
         *      </file>
         *  </example>
         */
        var detailsTemplate,
            defaultDetailsTemplate = "" +
                '<div>' +
                    '<div class="ods-media-gallery__tooltip__image-container" width="{{ image.realwidth }}px" height="{{ image.realheight }}px">' +
                    '   <img class="ods-media-gallery__tooltip__image" ng-src="{{ image.thumbnail_url }}">' +
                    '</div>' +
                    '<div class="ods-media-gallery__tooltip__fields">' +
                        '<h2 ng-if="getRecordTitle(record)">' +
                        '   {{ getRecordTitle(record) }}' +
                        '</h2>' +
                        '<dl>' +
                        '   <dt ng-repeat-start="field in displayedFields"' +
                        '       ng-show="record.fields[field.name]|isDefined">' +
                        '       {{ field.label }}' +
                        '   </dt>' +
                        '   <dd ng-repeat-end ng-switch="field.type"' +
                        '           ng-show="record.fields[field.name]|isDefined">' +
                        '       <span ng-switch-when="geo_point_2d">' +
                        '           <ods-geotooltip width="300" height="300"' +
                        '                   coords="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
                        '       </span>' +
                        '       <span ng-switch-when="geo_shape">' +
                        '            <ods-geotooltip width="300" height="300"' +
                        '                   geojson="record.fields[field.name]">{{ record.fields|formatFieldValue:field:context }}</ods-geotooltip>' +
                        '        </span>' +
                        '        <span ng-switch-when="double">{{ record.fields|formatFieldValue:field:context }}</span>' +
                        '        <span ng-switch-when="int">{{ record.fields|formatFieldValue:field:context }}</span>' +
                        '        <span ng-switch-when="date">{{ record.fields|formatFieldValue:field:context }}</span>' +
                        '        <span ng-switch-when="datetime">{{ record.fields|formatFieldValue:field:context }}</span>' +
                        '        <span ng-switch-when="file">' +
                        '            <div ng-bind-html="record.fields|formatFieldValue:field:context"></div>' +
                        '        </span>' +
                        '       <span ng-switch-default ng-bind-html="record.fields[field.name]|prettyText|nofollow|safenewlines"></span>' +
                        '   </dd>' +
                        '</dl>' +

                        '<a href="{{ image.download_url }}"' +
                        '       target="_self"' +
                        '       ods-resource-download-conditions' +
                        '       aria-label="Download {{ getRecordTitle(image.record) }} - {{ image.index + 1 }} out of {{ images.length }}"' +
                        '       translate="aria-label"' +
                        '       class="ods-button">' +
                        '   <i class="fa fa-download" aria-hidden="true"></i>' +
                        '   <span translate>Download image</span>' +
                        '</a>' +
                    '</div>' +
                '</div>';

        return {
            restrict: 'E',
            scope: {
                context: '=',
                displayedFields: '@',
                imageFields: '@?'
            },
            replace: true,
            template: '' +
            '<div class="odswidget odswidget-media-gallery">' +
            '   <div class="ods-aria-instructions" translate>Use left and right arrow to navigate the images, up and down arrows to open close the image inspector</div>' +
            '   <div class="odswidget-media-gallery__container" >' +
            '       <div style="vertical-align: top;" ' +
            '            class="odswidget-images__internal-table" ' +
            '            infinite-scroll="loadMore()" ' +
            '            infinite-scroll-distance="1" ' +
            '            infinite-scroll-disabled="fetching">' +
            '           <div class="odswidget-media-gallery__media-line" ' +
            '                ng-repeat="line in lines track by $index">' +
            '               <div ng-class="{\'odswidget-media-gallery__media-container--selected\': image.selected}" ' +
            '                    class="odswidget-media-gallery__media-container" ' +
            '                    style="vertical-align: top; display: inline-block" ' +
            '                    ng-repeat="image in line.images track by $index" ' +
            '                    ng-click="onClick($event, image, line)"' +
            '                    ng-style="{width: image.width, height: image.height, marginTop: image.marginTop, marginBottom: image.marginBottom, marginRight: image.marginRight, marginLeft: image.marginLeft }"' +
            '                    data-index="{{ image.index + 1 }}">' +
            '                       <ods-record-image record="image.record" ' +
            '                                         ng-keydown="onKeyDown($event, image, line)"' +
            '                                         role="button"' +
            '                                         tabindex="0"' +
            '                                         aria-label="{{ getRecordTitle(image.record) }} - {{ image.index + 1 }} out of {{ images.length }}"' +
            '                                         translate="aria-label"' +
            '                                         field="{{ image.fieldname }}" ' +
            '                                         domain-url="{{context.domainUrl}}"></ods-record-image>' +
            '                       <div ng-if="getRecordTitle(image.record)" ' +
            '                            class="odswidget-media-gallery__media-container__title-container">{{ getRecordTitle(image.record) }}</div>' +
            '                       <ods-spinner ng-show="image.fetching" ' +
            '                                    class="ods-media-gallery__image-spinner-overlay"></ods-spinner>' +
            '               </div>' +
            '           </div>' +
            '       </div>' +
            '       <ods-spinner ng-if="!init && fetching"></ods-spinner>' +
            '   </div>' +
            '   <div class="odswidget-media-gallery__details"></div>' +
            '   <div class="odswidget-overlay" ng-if="done && !records"><span class="odswidget-overlay__message" translate>No results</span></div>' +
            '   <div class="odswidget-overlay" ng-if="fetching && !records"><ods-spinner></ods-spinner></div>' +
            '</div>',
            require: ['odsMediaGallery', '?odsWidgetTooltip', '?odsAutoResize', '?refineOnClick'],
            controller: ['$scope', '$element', '$window', 'DebugLogger', '$filter', function($scope, $element, $window, DebugLogger, $filter) {
                // Infinite scroll parameters
                $scope.page = 0;
                $scope.resultsPerPage = 40;
                $scope.fetching = true;

                $scope.staticSearchOptions = {
                    rows: $scope.resultsPerPage
                };

                // New records are appended to the end of this array
                $scope.records = [];
                $scope.images = [];

                $scope.done = false;
                $scope.init = true;
                $scope.nextImage = 0;

                if (typeof($scope.imageFields) == "undefined") {
                    $scope.imageFields = [];
                }

                var currentRequestsTimeouts = [];

                var refreshRecords = function () {
                    $scope.fetching = true;
                    var options = {}, start;

                    if ($scope.init) {
                        start = 0;
                        if (currentRequestsTimeouts.length) {
                            currentRequestsTimeouts.forEach(function (t) {
                                t.resolve();
                            });
                            currentRequestsTimeouts.splice(0, currentRequestsTimeouts.length);
                        }
                    } else {
                        $scope.page++;
                        start = $scope.page * $scope.resultsPerPage;
                    }
                    angular.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {start: start});

                    // Retrieve only the fields needed on image listing, not all fields
                    var fetchedFields = $scope.imageFields || [];
                    if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.image_title) {
                        fetchedFields = fetchedFields.concat($scope.context.dataset.extra_metas.visualization.image_title);
                    }
                    if (fetchedFields.length > 0) {
                        angular.extend(options, {fields: fetchedFields.join(',')});
                    }

                    var timeout = $q.defer();
                    currentRequestsTimeouts.push(timeout);

                    if (angular.isDefined(options.q)) {
                        options.q = [options.q];
                    } else {
                        options.q = [];
                    }
                    var restriction_query = [];
                    angular.forEach($scope.imageFields, function(field) {
                        restriction_query.push('NOT #null(' + field + ')');
                    });
                    options.q.push(restriction_query.join(" OR "));

                    ODSAPI.records.search($scope.context, options, timeout.promise).
                        success(function (data, status, headers, config) {
                            $scope.records = $scope.records.concat(data.records);

                            var i, j, url, image, placeholder;
                            for (i = 0; i < data.records.length; i++) {
                                for (j = 0; j < $scope.imageFields.length; j++) {
                                    if (data.records[i].fields[$scope.imageFields[j]]) {
                                        image = data.records[i].fields[$scope.imageFields[j]];
                                        if (image.thumbnail === false) {
                                            continue;
                                        }
                                        if (image.url) {
                                            url = image.url;
                                            placeholder = false;
                                        } else if (image.placeholder) {
                                            url = null;
                                            placeholder = true;
                                        } else {
                                            url = $scope.context.domainUrl + '/explore/dataset/' + data.records[i].datasetid + '/files/' + image.id + '/300/';
                                            placeholder = false;
                                        }

                                        $scope.images.push({
                                            'record': data.records[i],
                                            'fieldname': $scope.imageFields[j],
                                            'thumbnail_url': url,
                                            'download_url': url.replace('/300/', '/download/'),
                                            'id': image.id,
                                            'index': $scope.images.length,
                                            'placeholder': placeholder,
                                            'realwidth': image.width,
                                            'realheight': image.height,
                                            'allFieldsInitialized': false,
                                            'fetching': false
                                        });
                                    }
                                }
                            }
                            $scope.renderImages();
                            $scope.error = '';
                            $scope.fetching = false;
                            $scope.done = ($scope.page + 1) * $scope.resultsPerPage >= data.nhits;
                            $scope.init = false;

                            currentRequestsTimeouts.splice(currentRequestsTimeouts.indexOf(timeout), 1);
                        }).
                        error(function (data, status, headers, config) {
                            if (data) {
                                // Errors without data are cancelled requests
                                $scope.error = data.error;
                            }
                            currentRequestsTimeouts.splice(currentRequestsTimeouts.indexOf(timeout), 1);
                            $scope.fetching = false;
                        });
                };

                this.getDefaultsFromContext = function () {
                    var dataset = $scope.context.dataset,
                        validatedImageFields = [],
                        i,
                        j;


                    if ($scope.context.dataset.extra_metas.visualization &&
                        $scope.context.dataset.extra_metas.visualization.image_tooltip_html_enabled &&
                        $scope.context.dataset.extra_metas.visualization.image_tooltip_html) {
                        detailsTemplate = '<div>' + $scope.context.dataset.extra_metas.visualization.image_tooltip_html + '</div>';
                    } else {
                        detailsTemplate = defaultDetailsTemplate;
                    }

                    $scope.detailsTemplate = detailsTemplate;

                    if ($scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.media_gallery_fields) {
                        $scope.imageFields = $scope.context.dataset.extra_metas.visualization.media_gallery_fields;
                    } else {
                        for (i = 0; i < dataset.fields.length; i++) {
                            if (dataset.fields[i].type == "file") {
                                for (j = 0; j < dataset.fields[i].annotations.length; j++) {
                                    if (dataset.fields[i].annotations[j].name == "has_thumbnails" &&
                                        ($scope.imageFields.length === 0 || $scope.imageFields.indexOf(dataset.fields[i].name) > -1)) {
                                        validatedImageFields.push(dataset.fields[i].name);
                                    }
                                }
                            }
                        }
                        $scope.imageFields = validatedImageFields;
                    }

                    refreshRecords();
                };

                this.watchContext = function() {
                    $scope.$watch('context.parameters', function(nv, ov) {
                        if (nv !== ov) {
                            $scope.done = false;
                            $scope.lines.splice(0, $scope.lines.length);
                            $scope.images.splice(0, $scope.images.length);
                            $scope.records.splice(0, $scope.records.length);
                            $scope.nextImage = 0;
                            $scope.init = true;
                            $scope.page = 0;
                            $scope.layout.resetImages();
                            refreshRecords();
                        }
                    }, true);
                };

                // Automatically called by ng-infinite-scroll
                $scope.loadMore = function () {
                    if (!$scope.fetching && !$scope.done && $scope.staticSearchOptions) {
                        refreshRecords();
                    }
                };

                $scope.detailsDisplayed = false;

                $scope.getRecordTitle = function (record) {
                    if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.image_title) {
                        var titleField = $scope.context.dataset.extra_metas.visualization.image_title;
                        var field = $scope.context.dataset.getField(titleField);
                        if (angular.isDefined(record.fields[titleField]) && record.fields[titleField] !== '' && field.type !== 'file') {
                            return $filter('formatFieldValue')(record.fields, field, $scope.context);
                        } else {
                            return record.fields[titleField].filename;
                        }
                    }
                    return null;
                };
            }],
            link: function(scope, element, attrs, ctrl) {
                var controller = ctrl[0],
                    customTooltipCtrl = ctrl[1],
                    autoResizeCtrl = ctrl[2],
                    refineOnClickCtrl = ctrl[3];

                // resize
                if (autoResizeCtrl) {
                    autoResizeCtrl.onResize = function() {
                        scope.lines.splice(0, scope.lines.length);
                        scope.layout.reset();
                        scope.layout.render(scope.lines, element.children()[1].getBoundingClientRect().width, scope.images.length);
                    };
                }

                if (angular.isString(scope.displayedFields)) {
                    scope.displayedFields = scope.displayedFields.split(',');
                }

                scope.context.wait().then(function () {
                    controller.getDefaultsFromContext();
                    controller.watchContext();

                    if (customTooltipCtrl !== null) {
                        var displayed_fields;
                        if (scope.displayedFields) {
                            displayed_fields = scope.context.dataset.fields.filter(function(field) {
                                return scope.displayedFields.indexOf(field.name) !== -1;
                            });
                        } else if (scope.context.dataset.extra_metas.visualization && scope.context.dataset.extra_metas.visualization.image_fields) {
                            displayed_fields = scope.context.dataset.fields.filter(function(field) {
                                return scope.context.dataset.extra_metas.visualization.image_fields.indexOf(field.name) !== -1;
                            });
                        } else {
                            displayed_fields = scope.context.dataset.fields;
                        }

                        customTooltipCtrl.configure({
                            'defaultTemplate': scope.detailsTemplate,
                            'displayedFields': displayed_fields,
                            'fields': scope.context.dataset.fields,
                            'context': scope.context
                        });
                    }
                });

                var detailsContainer = element.find(".odswidget-media-gallery__details");

                scope.max_height = 400;
                var detailsScope, displayedImage;
                detailsContainer = detailsContainer.remove();
                scope.onClick = function($event, image, line) {
                    var loadPromise;

                    // Fetch all fields only on the first time
                    if (image.allFieldsInitialized) {
                        loadPromise = $q.resolve();
                    } else {
                        var options = angular.copy(scope.context.parameters);
                        jQuery.extend(options, {
                            q: ['recordid=' + image.record.recordid]
                        });

                        image.fetching = true;
                        loadPromise = ODSAPI.records.search(scope.context, options, $q.defer()).success(function (data, status, headers, config) {
                            image.record = data.records[0];
                            image.allFieldsInitialized = true;
                            image.fetching = false;
                        });
                    }

                    loadPromise.then(function () {
                        if (refineOnClickCtrl !== null) {
                            refineOnClickCtrl.refineOnRecord(image.record);
                        } else if (customTooltipCtrl !== null) {
                            if (detailsScope) {
                                detailsScope.$destroy();
                            }
                            if (displayedImage) {
                                displayedImage.selected = false;
                            }
                            if (displayedImage === image) {
                                displayedImage = null;
                                detailsContainer = detailsContainer.remove();
                                return;
                            } else {
                                displayedImage = image;
                            }

                            image.selected = true;
                            var renderHtml = customTooltipCtrl.render(image.record, {
                                'image': angular.copy(image),
                                'getRecordTitle': scope.getRecordTitle,
                                'images': scope.images,
                                'ctx': scope.context
                            }, image.fieldname);
                            detailsContainer = detailsContainer.remove();
                            detailsContainer.html(renderHtml);
                            detailsContainer.insertAfter(angular.element($event.currentTarget).parents('.odswidget-media-gallery__media-line'));
                        }
                    });
                };

                scope.onKeyDown = function ($event, image, line) {
                    // enter, up and down arrows
                    if ($event.keyCode === 13 || $event.keyCode === 38 || $event.keyCode === 40) {
                        scope.onClick($event, image, line);
                        if ($event.keyCode === 38 || $event.keyCode === 40) {
                            $event.preventDefault();
                        }
                    }

                    // left and right arrows
                    if ($event.keyCode === 37 || $event.keyCode === 39) {
                        var currentIndex = $event.target.parentNode.dataset.index;
                        var nextIndex = $event.keyCode === 37 ? --currentIndex : ++currentIndex;
                        nextIndex = Math.min(Math.max(nextIndex, 1),scope.images.length);
                        element.find('.odswidget-media-gallery__media-container[data-index='+nextIndex+'] .odswidget-record-image').focus();
                    }
                };

                scope.lines = [];
                scope.layout = buildLayout();
                scope.layout.resetImages();

                scope.renderImages = function() {
                    var i, image;
                    for (i = scope.nextImage; i < scope.images.length; i++) {
                        image = scope.images[i];
                        scope.layout.addImage(image, scope.images.length);
                    }
                    scope.nextImage = i;
                    scope.layout.render(scope.lines, element.children()[1].getBoundingClientRect().width, scope.images.length);
                };
            }
        };
    }]);


    var buildLayout = function() {
        var ratioSum = 0,
            MAX_HEIGHT = 250,
            MARGIN = 1,
            previousLineOffset = 0,
            images = [],
            lastRenderedImage = -1,
            rendering = false;

        return {
            reset: function() {
                ratioSum = 0;
                previousLineOffset = 0;
                lastRenderedImage = -1;
            },
            resetImages: function() {
                images.splice(0, images.length);
                this.reset();
            },
            addImage: function addImage(image) {
                var localImage = angular.copy(image);
                images.push(localImage);
            },
            render: function (lines, containerWidth, imagesCount) {
                if (rendering) {
                    return;
                }
                rendering = true;
                var i, image;
                if (lines.length === 0) {
                    lines.push({
                        'images': [],
                        'height': MAX_HEIGHT,
                        'offset': 0,
                        'max_height': 0
                    });
                }
                for (i = lastRenderedImage + 1; i < images.length; i++) {
                    image = images[i];
                    var ratio = image.realwidth / image.realheight;
                    var currentLine = lines[lines.length - 1];
                    currentLine.images.push(image);
                    currentLine.max_height = Math.min(MAX_HEIGHT, Math.max(currentLine.max_height, image.realheight));
                    ratioSum += ratio;
                    currentLine.height = Math.min(Math.floor((containerWidth - MARGIN * (currentLine.images.length - 1)) / ratioSum), currentLine.max_height);

                    if (currentLine.height < currentLine.max_height || image.index === imagesCount - 1) {
                        // this line is done
                        var lineWidth = 0;
                        $.each(currentLine.images, function (index, image) {
                            image.height = currentLine.height;
                            image.width = Math.floor(image.realwidth * image.height / image.realheight);
                            image.marginTop = image.marginBottom = image.marginRight = image.marginLeft = MARGIN + "px";
                            lineWidth += image.width + 2 * MARGIN;
                        });

                        currentLine.offset = previousLineOffset + currentLine.max_height;

                        while (lineWidth > containerWidth) {
                            angular.forEach(currentLine.images, function (image, index) {
                                if (lineWidth > containerWidth) {
                                    image.width -= 1;
                                    lineWidth -= 1;
                                }
                            });
                        }
                    }
                    if (currentLine.height < currentLine.max_height) {
                        previousLineOffset += currentLine.height;
                        lines.push({
                            'images': [],
                            'height': MAX_HEIGHT,
                            'offset': 0,
                            'max_height': 0
                        });
                        ratioSum = 0;
                    }
                    lastRenderedImage += 1;
                }
                rendering = false;
            }
        };
    };
}());
