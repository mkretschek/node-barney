'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var argv = require('yargs').argv;

gulp.task('test', function () {
  return gulp.src('test.js', {read: false})
    .pipe(mocha(argv));
});