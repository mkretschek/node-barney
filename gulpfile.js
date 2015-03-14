'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var argv = require('yargs').argv;

gulp.task('test', ['lint'], function () {
  return gulp.src('test.js', {read: false})
    .pipe(mocha(argv));
});

gulp.task('lint', function () {
  return gulp.src('*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});