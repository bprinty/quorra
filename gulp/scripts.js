/* Javascript-related tasks */

'use strict';

/* imports */
var path = require('path');

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var reporter = require('jshint-stylish');
var webpack = require('webpack-stream');

var conf = require('./conf');


/** Lint all source scripts. */
gulp.task('lint', function() {
  return gulp.src(path.join(conf.paths.src, '**/*.js'))
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

/** Concat source scripts. */
gulp.task('scripts', function() {
  return webpackWrapper(false);
});

/** Concat source scripts and apply a watcher. */
gulp.task('scripts:watch', ['scripts'], function (callback) {
  return webpackWrapper(true, callback);
});


/** A wrapper for webpack calls.
*
* The options specified to webpack will be largely the same across different
* calls, so we define a wrapper function taking arguments for those things
* which may be different.
* // TODO: Implement `watch` functionality
*/
function webpackWrapper(watch, callback) {
  // target sources
  var sources = path.join(conf.paths.src, 'entry.js');

  // jshint-loader lints before bundling
  // babel-loader converts ES6 to ES5
  var webpackOptions = {
    watch: watch,
    module: {
      preLoaders: [{test: /\.js$/, loader: 'jshint-loader'}],
      loaders: [{test: /\.js$/, loader: 'babel-loader'}]
    },
    output: {
      filename: 'app.js'
    }
  };


  // pack it!
  return gulp.src(sources)
    .pipe(webpack(webpackOptions, null))
    .pipe(gulp.dest('dist'));
}
