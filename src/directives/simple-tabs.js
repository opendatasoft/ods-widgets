(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsSimpleTabs', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSimpleTabs
         * @scope
         * @restrict E
         * @description
         * Generate a tabbed interface that allows you to switch between separate views.
         *
         * @param {string} [syncToScope='simpleTabActive'] Name of parent scope variable to sync the current active tab.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                syncToScope: '@?',
            },
            bindToController: true,
            controllerAs: 'odsSimpleTabs',
            template: ''+
            '<div class="ods-simple-tabs-container">' +
            '   <ul class="ods-simple-tabs-nav" role="tablist">' +
            '       <li class="ods-simple-tabs-nav-item"' +
            '           ng-repeat="tab in tabs">' +
            '           <a href=""' +
            '              class="ods-simple-tabs-nav-link"' +
            '              ng-click="select(tab)"' +
            '              ng-class="{ \'ods-simple-tabs-nav-link-active\' : tab.selected }"' +
            '              id="{{ tab.tabConfig.slug }}-tab"' +
            '              role="tab"' +
            '              aria-controls="{{ tab.tabConfig.slug }}"' +
            '              aria-selected="{{ tab.selected }}"' +
            '              >' +
            '               <i ng-if="tab.tabConfig.fontawesomeClass" ' +
            '                  class="ods-simple-tabs-icon fa fa-fw fa-{{ tab.fontawesomeClass }}"' +
            '                  aria-hidden="true"></i>' +
            '               {{ tab.tabConfig.label }}' +
            '           </a>' +
            '       </li>' +
            '   </ul>' +
            '   <div class="ods-simple-tabs-content"' +
            '        ng-transclude>' +
            '   </div>' +
            '</div>',

            controller: ['$scope', '$attrs', function($scope, $attrs) {
                var tabs = $scope.tabs = [];
                var currentState = $attrs.syncToScope || 'simpleTabActive';

                $scope.select = function(tab) {
                    angular.forEach(tabs, function(tab) {
                        tab.selected = false;
                    });
                    $scope.$parent[currentState] = tab.tabConfig.slug;
                    tab.selected = true;
                };

                this.addTab = function(tab) {
                    if (tabs.length === 0) {
                        $scope.select(tab);
                    }
                    tabs.push(tab);
                }
            }],
        }
    });


    mod.directive('odsSimpleTab',['$filter', function($filter) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSimpleTab
         * @restrict E
         * @requires odsSimpleTabs
         *
         * @param {string} label The label that will be displayed in the tab
         * @param {string} fontawesomeClass The font-awesome icon name used for the tab, without the 'fa-' prefix.
         * @param {boolean} [keepContent=false] Whether to destroy and rebuild the pane content at deselection/selection (acts as if using an ng-if when panel is selected/deselected).
         */
        return {
            require: '^odsSimpleTabs',
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                label: '@?',
                fontawesomeClass: '@?',
                keepContent: '=?'
             },
            template: '' +
                '<div class="ods-simple-tab-content"' +
                '   ng-class="{ \'ods-simple-tab-content-active\' : selected }"' +
                '   role="tabpanel"' +
                '   id="{{ slug }}"' +
                '   aria-labelledby="{{ slug }}-tab">' +
                '       <div ng-if="visible || tabConfig.keepContent == true" ng-transclude></div>' +
                '</div>',
            link: function(scope, element, attrs, tabsetCtrl) {
                var keepContentBoolean = !!scope.keepContent;
                scope.tabConfig = {
                    label: attrs.label,
                    slug: attrs.slug || $filter('slugify')(attrs.label),
                    keepContent: angular.isDefined(attrs.keepContent) ? keepContentBoolean : false,
                    fontawesomeClass: attrs.fontawesomeClass
                };
                tabsetCtrl.addTab(scope);

                /*
                We need to have a digest cycle between the selection and the moment we truly display the content, because
                the selection triggers the display: block in the CSS; if we run the content at the same time, it may be
                run before it is truly displayed in the page, which can cause issues with Leaflet for example (it needs to know
                where it is in the page when it is initialized).
                 */
                scope.$watch('selected', function(nv) {
                    if (nv) {
                        scope.$applyAsync(function() {
                            scope.visible = true;
                        });
                    } else {
                        scope.visible = false;
                    }
                });
            }
        };
    }]);
}());
