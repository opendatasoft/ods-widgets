module.exports = function(config) {
    var reporters = typeof process.env.JENKINS_HOME !== 'undefined' ? ['progress', 'junit'] : ['spec'];

    config.set({
        basePath: '.',
        frameworks: ['jasmine'],
        files: [
            'core/static/vendor/jquery/jquery-2.1.4.js',
            'core/static/vendor/angular-1.4.7/angular.js',
            'core/static/vendor/angular-1.4.7/angular-*.js',

            'core/static/vendor/leaflet/leaflet-src.js',
            'core/static/vendor/leaflet-locatecontrol/*.js',

            // ODS-Widgets modules
            'core/static/ods-widgets/libs-included/modernizr.custombuild.js',
            'core/static/ods-widgets/libs-included/ng-infinite-scroll.js',
            'core/static/ods-widgets/libs-included/moment-2.22.2.js',
            'core/static/ods-widgets/libs-included/chroma.js',
            'core/static/ods-widgets/libs-included/angular-gettext.js',
            'core/static/ods-widgets/libs-included/lazyload.js',
            'core/static/ods-widgets/libs-included/jstimezonedetect.js',
            'core/static/ods-widgets/libs/leaflet-draw/*.js',
            'core/static/ods-widgets/libs/leaflet-heat/*.js',
            'core/static/ods-widgets/libs/leaflet-label/*.js',
            'core/static/ods-widgets/libs/ods-clustermarker/*.js',
            'core/static/ods-widgets/libs/ods-map/*.js',
            'core/static/ods-widgets/libs/ods-vectormarker/*.js',
            'core/static/ods-widgets/src/polyfills.js',
            'core/static/ods-widgets/src/ods-widgets.js',
            'core/static/ods-widgets/src/filters.js',
            'core/static/ods-widgets/src/functions.js',
            'core/static/ods-widgets/src/directives/*.js',
            'core/static/ods-widgets/src/services/*.js',

            // Tests
            '*/tests/js/unit/*.js',
            'core/static/ods-widgets/tests/js/unit/*.js',
            'core/static/ods-widgets/tests/js/unit/directives/*.js',
            '*/tests/js/unit/*/*.js'
        ],
        browsers: ['ChromeHeadless'],
        reporters: reporters,
        junitReporter: {
          outputDir: '../../reports/karma',
          outputFile: 'test-report.xml',
          useBrowserName: false
        },
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
    });
};
