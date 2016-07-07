(function() {
	'use strict';

	var mod = angular.module('ods-widgets');

	mod.directive('odsBreezometer', function() {
		/**
		 * @ngdoc directive
         * @name ods-widgets.directive:odsBreezometer
         * @restrict E
         * @scope
         * @param {string} key The Breezometer Widget Key. See http://breezometer.com
         * @param {string} location The city name.
         * @description
         * Integrates a Breezometer "widget" using the widget key provided by Breezometer
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-breezometer key="045042544641" location="paris"></ods-breezometer>
         *      </file>
         *  </example>
		 */
		return {
			restrict: 'E',
			replace: true,
			template: '<div class="ods-widgets"><div class="breezometer_widget"></div></div>',
			scope: {
				'key': '@',
				'location': '@'
			},
			link : function(scope, element, attrs) {
				function loadGMaps(next) {
					LazyLoad.js('https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=places&weather', next);
				}
				function loadBreezometer(next) {
					LazyLoad.css('https://static.breezometer.com/widget/css/breezometer.plugin.min.css');
					LazyLoad.js('https://static.breezometer.com/widget/breezometer.plugin.min.js', next);
				}
				function initWidget() {
					if (angular.isDefined($(document).breezometer)) {
						$(element).find('.breezometer_widget').breezometer({
							lang: "en",
							key: attrs.key,
							vertical: false,
							location:attrs.location
						});
					}
				}

				function checkBreezometer() {
					if (!$.breezometer) {
						loadBreezometer(initWidget);
					} else {
						initWidget();
					}
				}

				// Start loading the scripts
				if (!window.google || !window.google.maps) {
					loadGMaps(checkBreezometer);
				} else {
					checkBreezometer();
				}

			}
		}
	});
}());