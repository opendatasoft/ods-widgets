(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    var renderCard = function(transcludeService, scope, elem) {
        var datasetItem = elem.find('.dataset-item').first();
        var cardContainer = elem.find('.card-container');
        var cardHeight = $(cardContainer).outerHeight();
        if (scope.position == "bottom") {
            $(datasetItem).css('top', 0);
            $(datasetItem).css('bottom', cardHeight);
        } else { // top
            $(datasetItem).css('top', cardHeight);
            $(datasetItem).css('bottom', 0);
        }
        transcludeService(function(clone) {
            $(datasetItem).html(clone);
        });
        scope.$apply();
    };

    mod.directive('odsDatasetCard', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDatasetCard
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @description
         * If you wrap this directive around an element or a set of element, it will display an expandable card above it to show the title and description of the dataset,
         * along with a link to the portal that shows the dataset, and the license attached to the data.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *              <ods-dataset-context context="stations" stations-domain="public.opendatasoft.com" stations-dataset="jcdecaux_bike_data">
         *                  <ods-dataset-card context="stations" style="height: 600px">
         *                      <ods-map context="stations"></ods-map>
         *                  </ods-dataset-card>
         *              </ods-dataset-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            scope: {
                context: '='
            },
            template: '<div class="odswidget odswidget-dataset-card">' +
                         '<div class="card-container" ng-class="{bottom: position == \'bottom\', expanded: expanded, expandable: isExpandable()}">' +
                            '<h2 class="dataset-title" ng-click="expanded = !expanded" ng-show="!expanded || (expanded && !context.dataset.metas.description)">{{context.dataset.metas.title}}</h2>' +
                            '<div ng-click="expanded = !expanded" class="expand-control"><span translate>Details</span> <i class="fa fa-chevron-down" ng-show="!expanded"></i><i class="fa fa-chevron-up" ng-hide="!expanded"></i></div>' +
                            '<div class="dataset-expanded" ng-click="expanded = !expanded"">'+
                                '<h2 class="dataset-title" ng-show="expanded">{{context.dataset.metas.title}}</h2>' +
                                '<p class="dataset-description" ng-if="expanded" ng-bind-html="safeHtml(context.dataset.metas.description)"></p>' +
                            '</div>' +
                         '<div class="dataset-infos"><span class="dataset-infos-text"><a ng-href="{{datasetUrl}}" target="_blank" ng-bind-html="websiteName"></a><span ng-show="context.dataset.metas.license"> - <span translate>License</span> {{context.dataset.metas.license}}</span></span></div>' +
                     '</div>' +
                    '<div class="dataset-item"></div>' +
                '</div>',
            replace: true,
            transclude: true,
            link: function(scope, elem, attrs) {
                scope.position = attrs.position || "top";
                // moves embedded item down so the card doesn't overlap when collapsed
                scope.renderContent = renderCard;
            },
            controller: ['$scope', '$element', 'ODSWidgetsConfig', '$transclude', '$sce', function($scope, $element, ODSWidgetsConfig, $transclude, $sce) {
                $scope.websiteName = ODSWidgetsConfig.websiteName;
                $scope.expanded = false;

                $scope.safeHtml = function(html) {
                    return $sce.trustAsHtml(html);
                };

                $scope.isExpandable = function() {
                    if (!$scope.context || !$scope.context.dataset || !$scope.context.dataset.datasetid) {
                        // No data yet
                        return false;
                    }

                    if (!$scope.context.dataset.metas.description) {
                        return false;
                    }

                    return true;
                };

                var unwatch = $scope.$watch('context', function(nv, ov) {
                    if (!nv || !nv.dataset) {
                        return;
                    }
                    // waiting for re-render
                    setTimeout(function() {
                        $scope.renderContent($transclude, $scope, $element);
                    }, 0);
                    $scope.expanded = false;
                    $scope.datasetUrl = $scope.context.domainUrl + '/explore/dataset/' + $scope.context.dataset.datasetid + '/';
                    if (!$scope.websiteName) {
                        $scope.websiteName = $scope.context.domainUrl;
                    }
                    unwatch();
                }, true);
            }]
        };
    });

    mod.directive('odsMultidatasetsCard', ['ODSWidgetsConfig',  function(ODSWidgetsConfig) {
        return {
            restrict: 'E',
            scope: {
                odsTitle: '=',
                datasets: '=',
                context: '='
            },
            template: '<div class="odswidget-multidatasets-card">' +
                      '  <div class="card-container multidatasets" ng-class="{bottom: (position == \'bottom\'), expanded: expanded, expandable: isExpandable()}">' +
                      '      <h2 ng-show="!expanded" ng-click="tryToggleExpand()">{{ odsTitle }}</h2>' +
                      '      <div ng-click="tryToggleExpand()" class="expand-control" ng-class="{expanded: expanded}"><span translate>Details</span> <i class="fa fa-chevron-down"></i></div>' +
                      '      <h3 class="datasets-counter" ng-click="tryToggleExpand()" ng-show="!expanded">' +
                      '          <span class="count-text" ng-hide="!datasetObjectKeys || datasetObjectKeys.length <= 1">' +
                      '               <span ng-pluralize count="datasetObjectKeys.length" translate="when" when="{\'0\': \'no datasets to display\', \'1\': \'{} dataset\', \'other\': \'{} datasets\'}"></span>' +
                      '          </span>' +
                      '      </h3>' +
                      '      <div class="datasets-expanded">' +
                      '          <h2 ng-show="expanded" ng-click="tryToggleExpand()">{{ odsTitle }}</h2>' +
                      '          <h3 class="datasets-counter" ng-click="tryToggleExpand()" ng-show="expanded">' +
                      '              <span class="count-text">' +
                      '                   <span ng-pluralize count="datasetObjectKeys.length" translate="when" when="{\'0\': \'no datasets to display\', \'1\': \'{} dataset\', \'other\': \'{} datasets\'}"></span>' +
                      '              </span>' +
                      '          </h3>' +
                      '          <ul class="dataset-list"' +
                      '              ng-show="(datasetObjectKeys && datasetObjectKeys.length === 1) || (isExpandable() && expanded)"' +
                      '              ng-class="{\'single-dataset\': datasetObjectKeys.length === 1}">' +
                      '              <li ng-repeat="(key, dataset) in datasets"> <a' +
                      '                  ng-href="{{context.domainUrl}}/explore/dataset/{{dataset.datasetid}}/"' +
                      '                  target="_blank">{{ dataset.metas.title }}</a>' +
                      '                  <span ng-show="dataset.metas.license">- <span translate>License</span> {{ dataset.metas.license }}</span></li>' +
                      '          </ul>' +
                      '      </div>' +
                      '      <div class="dataset-infos"><span class="dataset-infos-text"><a ng-href="/" target="_blank" ng-bind-html="websiteName"></a></span></div>' +
                      '  </div>' +
                      '  <!-- embedded content (chart, map etc.) -->' +
                      '  <div class="dataset-item" ng-transclude></div>' +
                    '</div>',
            replace: true,
            transclude: true,
            link: function(scope, elem, attrs) {
                scope.position = attrs.position || "top";
                // moves embedded item down so the card doesn't overlap when collapsed
                scope.renderContent = renderCard;
            },
            controller: ['$scope', '$element', 'ODSWidgetsConfig', '$transclude', '$sce', function($scope, $element, ODSWidgetsConfig, $transclude, $sce) {
                $scope.datasetObjectKeys = [];
                $scope.websiteName = ODSWidgetsConfig.websiteName;

                $scope.safeHtml = function(html) {
                    return $sce.trustAsHtml(html);
                };

                $scope.isExpandable = function() {
                    if (!$scope.datasetObjectKeys.length || ($scope.datasetObjectKeys.length === 1)) {
                        return false;
                    }
                    return true;
                };

                $scope.tryToggleExpand = function() {
                    if ($scope.isExpandable()) {
                        $scope.expanded = !$scope.expanded;
                    }
                };

                var unwatch = $scope.$watch('datasets', function(nv, ov) {
                    if (nv) {
                        var keys = Object.keys(nv);
                        if (keys.length === 0) {
                            return;
                        }
                        $scope.datasetObjectKeys = keys;

                        // waiting for re-render
                        setTimeout(function() {
                            $scope.renderContent($transclude, $scope, $element);
                        }, 0);
                        $scope.expanded = false;
                        unwatch();
                    }
                }, true);
            }]
        };
    }]);
})();
