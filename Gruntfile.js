/*
 * Gruntfile for quorra.js.
 *
 * @author <bprinty@gmail.com>
 * ----------------------------------------------- */

module.exports = function(grunt) {
    
    var _pkg = grunt.file.readJSON('bower.json');
    grunt.initConfig({
        pkg: _pkg,
        concat: {
            css: {
                options: {
                    separator: '\n',
                    banner: '/* quorra version ' + _pkg.version + ' (' + _pkg.homepage + ') */\n'
                },
                src: [
                    'src/css/*.css'
                ],
                dest: 'dist/quorra.css'
            },
            js: {
                options: {
                    separator: '',
                    banner: '/* quorra version ' + _pkg.version + ' (' + _pkg.homepage + ') */\n' + '(function(){\n',
                    footer: '\n\nquorra.version = "' + _pkg.version + '";\n\nwindow.quorra = quorra;\n\n})();'
                },
                src: [
                    'src/quorra.js',
                    'src/utils/*.js',
                    'src/ext/*.js',
                    'src/models/*.js'
                ],
                dest: 'dist/quorra.js'
            }
        },
        uglify: {
            js: {
                files: {
                    'dist/quorra.min.js': ['dist/quorra.js']
                }
            }
        },
        jshint: {
            foo: {
                src: "src/**/*.js"
            },
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            js: {
                files: ["src/**/*.js"],
                tasks: ['concat']
            }
        },
        copy: {
          css: {
            files: [
              { src: 'src/quorra.css', dest: 'dist/quorra.css' }
            ]
          }
        },
        cssmin: {
          dist: {
            files: {
                'dist/quorra.min.css' : ['dist/quorra.css']
            }
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-text-replace');

    grunt.registerTask('default', ['concat','copy', 'uglify']);
    grunt.registerTask('production', ['concat', 'uglify', 'copy', 'cssmin', 'replace']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
};