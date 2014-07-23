// TODO: Generate minified unique JS file
// TODO: Generate .css file

var JS_FILES = [
    'libs-included/*.js',
    'src/ods-widgets.js',
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
                tasks: ['uglify', 'concat', 'ngdocs'],
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
                    'src/directives/**/*.js',
                    'src/filters.js',
                    'src/ods-widgets.js',
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
            server: {
                options: {
                    keepalive: false
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
    grunt.registerTask('dist', ['uglify:dist', 'less:dist', 'less:dev', 'concat', 'copy:templates', 'copy:libs', 'ngdocs']);
    grunt.registerTask('server', ['default', 'connect', 'watch']);
};
