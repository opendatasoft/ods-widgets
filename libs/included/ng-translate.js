/**
 * Translation module for angularjs.
 * @version v0.0.2 - 2014-06-25
 * @author Stephan Hoyer
 * @link https://github.com/StephanHoyer/ng-translate
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
/**
 *
 */

(function (ng) {
    'use strict';


//   copied from angular
    var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
    var MOZ_HACK_REGEXP = /^moz([A-Z])/;

    function camelCase(name) {
        return name.
            replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
                return offset ? letter.toUpperCase() : letter;
            }).
            replace(MOZ_HACK_REGEXP, 'Moz$1');
    }



    /* Services */
    ng.module('translate', [], ['$provide', function ($provide) {
        $provide.factory('translate', ['$log', function($log) {
            var localizedStrings = {};
            var log = false;
            var translate = function translate(sourceString, language) {
                if (!sourceString) {
                    return '';
                }
                sourceString = $.trim(sourceString);
                // Angular will add these comments to fix IE8 behavior
                sourceString = sourceString.replace(/<!--IE fix-->/g, '');
                // Angular will add the ng-binding class to some elements at runtime
                sourceString = sourceString.replace(/ class="ng-binding"/g, '');
                if (localizedStrings[language || 'default'][sourceString]) {
                    return localizedStrings[language || 'default'][sourceString];
                } else {
                    if (log) $log.warn('Missing localisation for "' + sourceString + '"');
                    return sourceString;
                }
            };
            translate.add = function (translations, language) {
                if (ng.isUndefined(localizedStrings[language || 'default'])) {
                    localizedStrings[language || 'default'] = {};
                }
                ng.extend(localizedStrings[language || 'default'], translations);
            };
            translate.remove = function(key, language) {
                if (localizedStrings[language || 'default'][key]) {
                    delete localizedStrings[language || 'default'][key];
                    return true;
                }
                return false;
            };
            translate.set = function(translations, language) {
                localizedStrings[language || 'default'] = translations;
            };
            translate.logMissedHits = function(boolLog) {
                log = boolLog;
            };
            return translate;
        }]);
    }]);

    /* Directives */
    ng.module('translate.directives', ['translate'], function ($compileProvider) {
        $compileProvider.directive('translate', ['$compile', 'translate', function ($compile, translate) {
            return {
                priority: 10, //Should be evaluated befor e. G. pluralize
                restrict: 'ECMA',
                compile: function compile(el, attrs) {
                    var translateInnerHtml = false;
                    if (attrs.translate) {
                        var attrsToTranslate = attrs.translate.split(' ');
                        ng.forEach(attrsToTranslate , function(attrName) {
                            el.attr(attrName, translate(attrs[camelCase(attrName)]));
                        });
                        translateInnerHtml = attrsToTranslate.indexOf('innerHTML') >= 0;
                    } else {
                        translateInnerHtml = true;
                    }
                    return function preLink(scope, el, attrs) {
                        if (translateInnerHtml) {
                            el.html(translate(el.html()));
                        }
                        try{
                            $compile(el.contents())(scope);
                        }catch(e){
                        }
                    };
                }
            };
        }]);
    });

    ng.module('translate.filters', ['translate'])
        .filter('translate', ['translate', function(translate) {
            return function(input) {
                return translate(input);
            };
        }]);
}(angular));