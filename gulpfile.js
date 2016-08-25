/* Main gulpfile */

'use strict';

/* imports */
var wrench = require('wrench');

var gulp = require('gulp');

// import all tasks defined in `gulp/`
wrench.readdirSyncRecursive('./gulp')
  .filter(file => (/\.js$/i).test(file))
  .forEach(file => require('./gulp/' + file));


// default task
gulp.task('default', function() {
  return;
});
