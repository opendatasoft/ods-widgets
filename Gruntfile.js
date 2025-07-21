// TODO: Generate minified unique JS file
// TODO: Generate .css file

var JS_FILES = [
    'libs-included/*.js',
    'src/polyfills.js',
    'src/ods-widgets.js',
    'src/services/*.js',
    'src/filters.js',
    'src/functions.js',
    'src/directives/*.js',
    '!libs-included/jquery.rtl-scroll-type.js',
];

module.exports = function(grunt) {

    // Condition to switch resources files path (js, css) in dev or prod
    var distPath;
    if (process.env.TRAVIS) {
        distPath = 'dist/';
    } else {
        distPath = '../dist/';
    }

    // Project configuration.
    grunt.initConfig({
        uglify: {
            dist: {
                options: {
                    mangle: true,
                    report: 'gzip'
                },
                files: {
                    'dist/ods-widgets.min.js': JS_FILES,
                }
            },
            script: {
                files: [{
                    src : 'src-docs/templates/js/script.js', dest : 'docs/js/script.min.js'
                }]
            }
        },
        less: {
            dev: {
                options: {
                    compress: false,
                    cleancss: false
                },
                files: {
                    "dist/ods-widgets.css": "src/less/ods-widgets.less",
                    "docs/css/ods-theme.css": "src-docs/templates/less/ods-theme.less"
                }
            },
            dist: {
                options: {
                    compress: true,
                    cleancss: true
                },
                files: {
                    "dist/ods-widgets.min.css": "src/less/ods-widgets.less",
                    "docs/css/ods-theme.min.css": "src-docs/templates/less/ods-theme.less"
                }
            }
        },
        watch: {
            styles: {
                files: [
                    'src/less/**/*.less',
                    'src-docs/templates/less/*.less'
                ], // which files to watch
                tasks: ['less'],
                options: {
                    spawn: false
                }
            },
            scripts: {
                files: [JS_FILES],
                tasks: ['uglify', 'concat', 'copy:libs', 'ngdocs'],
                options: {
                    spawn: false
                }
            },
            ngdoc: {
                files: [
                    'src-docs/getting-started/*.ngdoc',
                    'src-docs/reference/*.ngdoc',
                    'src-docs/widgets/*.ngdoc'
                ],
                tasks: ['ngdocs'],
                options: {
                    spawn: false
                }
            }
        },
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: JS_FILES,
                dest: 'dist/ods-widgets.js'
            }
        },
        autoprefixer: {
            options: {
                browsers: ['> 1%', 'ie > 8']
            },
            "dist/ods-widgets.css": "dist/ods-widgets.css",
            "dist/ods-widgets.min.css": "dist/ods-widgets.min.css",
            "docs/css/ods-theme.css": "docs/css/ods-theme.css",
            "docs/css/ods-theme.min.css": "docs/css/ods-theme.min.css"
        },
		// copies logo.png to be used in the doc website header
		// must be run before 'ngdocs'
		copy: {
            docs: {
                expand: true,
                cwd: 'assets/',
                src: [
                    'ods-logo-noir.svg',
                    'menu-fill.svg',
                    'apps-custo.svg',
                    'ods-favicon.ico',
                    'widget_doc_schema.png'
                ],
                dest: 'docs/assets'
            },
            libs: {
                expand: true,
                src: ['libs/**'],
                dest: 'dist/'
            },
            'libs-docs': {
                expand: true,
                src: ['libs/**'],
                dest: 'docs/grunt-scripts/'
            },
            examples: {
                expand: true,
                cwd: 'src-docs/examples/',
                src: ['*.html', '*.css'],
                dest: 'docs/examples/'
            },
            ngdocsOverrides: {
                src: 'src-docs/templates/js/docs.js',
                dest: 'docs/js/docs.js'
            }
		},
		ngdocs: {
			options: {
				dest: 'docs',
                scripts: [
                    'https://code.jquery.com/jquery-3.7.0.min.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-animate.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-sanitize.js',
                    'dist/ods-widgets.js',
                    'docs-load-css.js'
                ],
                styles: [
                    'dist/ods-widgets.min.css',
                    'docs/css/ods-theme.min.css',
                    'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'
                ],
                template: 'src-docs/templates/index.tmpl',
                html5Mode: false,
                image: 'assets/ods-logo-noir.svg',
				title: "ODS-Widgets",
				bestMatch: false,
                startPage: '/introduction/'
			},
            introduction: {
                src: ['src-docs/widgets/*.ngdoc'],
                title: 'Introduction',
                api: false
            },
            "getting-started": {
			    src: ['src-docs/getting-started/*.ngdoc'],
                title: 'Getting started',
                api: false
            },
            api: {
			    src: [
			        'src/directives/*.js',
                    'src/filters.js',
                    'src/ods-widgets.js',
			        'src-docs/widgets/index.ngdoc'
                ],
                title: 'Widgets'
            }
		},
		// serves the documentation server
		connect: {
            options: {
                port: 9001
            },
            server: {
                options: {
                    keepalive: false,
                    middleware: function(connect, options, middlewares) {
                        middlewares.unshift(function(req, res, next) {
                            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                            res.setHeader('Access-Control-Allow-Methods', 'GET');
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            next();
                        });

                        return middlewares;
                    }
                }
            }
		},
		clean: ['docs']
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-ngdocs');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-autoprefixer');

    // Default task(s).
    grunt.registerTask('default', ['dist']);
    grunt.registerTask('dist', ['clean', 'uglify:dist', 'uglify:script', 'less:dist', 'less:dev', 'concat', 'autoprefixer', 'copy', 'ngdocs', 'copy:ngdocsOverrides']);
    grunt.registerTask('server', ['default', 'connect', 'watch']);
};
