// TODO: Generate minified unique JS file
// TODO: Generate .css file

var JS_FILES = [
    'libs/included/*.js',
    'ods-widgets.js',
    'filters.js',
    'functions.js',
    'directives/*.js'
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
                    'dist/ods-widgets.min.js': JS_FILES
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
                    "dist/ods-widgets.css": "ods-widgets.less"
                }
            },
            dist: {
                options: {
                    compress: true,
                    cleancss: true
                },
                files: {
                    "dist/ods-widgets.css": "ods-widgets.less"
                }
            }
        },
        watch: {
            styles: {
                files: ['*.less'], // which files to watch
                tasks: ['less'],
                options: {
                    spawn: false
                }
            },
            scripts: {
                files: [JS_FILES],
                tasks: ['uglify'],
                options: {
                    spawn: false
                }
            },
            docs: {
                files: [JS_FILES],
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
		// copies logo.png to be used in the doc website header
		// must be run before 'ngdocs'
		copy: {
			main: {
				expand: true,
				cwd: '../ods/img/',
				src: 'logo.png',
				dest: 'assets/'
			}
		},
		ngdocs: {
			options: {
				dest: 'docs',
				html5Mode: false,
				image: 'assets/logo.png',
				title: "ODS",
				bestMatch: true,
                startPage: '/api/ods-widgets'
			},
			all: {
				src: [
                    'directives/**/*.js',
                    'filters.js',
                    'ods-widgets.js',
                    '*.ngdoc'
                ],
				title: 'Widgets',
			}
		},
		// serves the documentation server
		connect: {
			options: {
                port: 9001
            },
//			server: {
//                keepalive: true
//            },
            docs: {
                options: {
                    base: 'docs'
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
    grunt.registerTask('default', ['uglify:dist', 'less:dist', 'ngdocs']);
    grunt.registerTask('dev', ['concat', 'less:dev']);
    grunt.registerTask('docs', ['clean', 'copy', 'ngdocs']);
    grunt.registerTask('watchdocs', ['docs', 'connect:docs', 'watch:docs']);

};
