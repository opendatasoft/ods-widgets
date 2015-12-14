(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsPlumeAirQuality', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsPlumeAirQuality
         * @restrict E
         * @scope
         * @param {string} city The name of the city you want to integrate. See http://www.plumelabs.com/embed/ for more information.
         * @param {string} lang fr_fr for the french version, en_us for the english one.
         * @description
         * Integrates a Plume Air Embed using a city name.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-plume-air-quality city="new-york"></ods-plume-air-quality>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget"></div>',
            scope: {
                'city': '@',
                'lang': '@'
            },
            link: function(scope, element, attrs) {
                var html = '' +
                    '<a id="plumelabs-wjs-cfg" data-w="320" data-h="200" data-city="'+attrs.city+'" data-lng="'+(attrs.lang || 'en_us')+'" data-type="l">Air Quality</a>' +
                    '<script>window.plmlbs=function(e,t,s){var l,m=e.getElementsByTagName(t)[0],n=window.plmlbs||{},a=/^http:/.test(e.location)?"http":"https";return e.getElementById(s)?n:(l=e.createElement(t),l.id=s,l.src=a+"://static.plumelabs.com/embed/embed.js",m.parentNode.insertBefore(l,m),n)}(document,"script","plumelabs-wjs");</script>';
                element.append(html);
            }
        };
    });
}());