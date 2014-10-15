// TODO: Generate minified unique JS file
// TODO: Generate .css file

var JS_FILES = [
    'libs-included/*.js',
    'src/polyfills.js',
    'src/ods-widgets.js',
    'src/services.js',
    'src/filters.js',
    'src/functions.js',
    'src/directives/*.js'
];

module.exports = function(grunt) {

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
                    'dist/ieshiv.min.js': 'src/ieshiv.js'
                }
            }
        },
        less: {
            dev: {
                options: {
                    compress: false,
                    cleancss: false
                },
                files: {
                    "dist/ods-widgets.css": "src/ods-widgets.less"
                }
            },
            dist: {
                options: {
                    compress: true,
                    cleancss: true
                },
                files: {
                    "dist/ods-widgets.min.css": "src/ods-widgets.less"
                }
            }
        },
        watch: {
            styles: {
                files: ['src/*.less'], // which files to watch
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
                    'src-docs/widgets/*.ngdoc',
                    'src-docs/tutorial/*.ngdoc'
                ],
                tasks: ['ngdocs'],
                options: {
                    spawn: false
                }
            },
            templates: {
                files: ['src/templates/*'],
                tasks: ['copy:templates'],
                options: {
                    spawn: false
                }
            },
            ieshiv: {
                files: {
                    'dist/ieshiv.min.js': 'src/ieshiv.js'
                },
                tasks: ['copy:ieshiv']
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
		// copies logo.png to be used in the doc website header
		// must be run before 'ngdocs'
		copy: {
			docs: {
				expand: true,
				cwd: '../ods/img/',
				src: 'logo.png',
				dest: 'assets/'
			},
            templates: {
                expand: true,
                flatten: true,
                src: ['templates/*'],
                dest: 'dist/templates/'
            },
            libs: {
                expand: true,
                src: ['libs/**'],
                dest: 'dist/'
            },
            ieshiv: {
                files: {
                    'dist/ieshiv.js': 'src/ieshiv.js'
                }
            }
		},
		ngdocs: {
			options: {
				dest: 'docs',
                scripts: [
                    'https://code.jquery.com/jquery-1.11.1.min.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.22/angular.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.22/angular-animate.js',
                    'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.22/angular-sanitize.js',
                    '../dist/ods-widgets.js',
                    '../docs-load-css.js'
                ],
                styles: ['../dist/ods-widgets.css'],
				html5Mode: false,
				image: 'assets/logo.png',
				title: "ODS Widgets",
				bestMatch: true,
                startPage: '/api',
                navTemplate: 'src-docs/navbar.html'
			},
			all: {
				src: [
                    'src/directives/**/*.js',
                    'src/filters.js',
                    'src/ods-widgets.js',
                    'src-docs/widgets/*.ngdoc'
                ],
				title: 'Reference Documentation'
			},
            tutorial: {
                src: ['src-docs/tutorial/*.ngdoc'],
                title: 'Tutorial',
                api: false
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

    // Default task(s).
    grunt.registerTask('default', ['dist']);
    grunt.registerTask('dist', ['uglify:dist', 'less:dist', 'less:dev', 'concat', 'copy:templates', 'copy:libs', 'copy:ieshiv', 'ngdocs']);
    grunt.registerTask('server', ['default', 'connect', 'watch']);
};
