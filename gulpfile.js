
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sass = require('gulp-sass');
const zip = require('gulp-zip');

sass.compiler = require('node-sass');
const tsProject = ts.createProject('tsconfig.json');
const resourceTS = ts.createProject('resources/ts/tsconfig.json');

gulp.task('sass', () => {
    return gulp.src('./resources/scss/*.scss')
        .pipe(sass()).on('error', sass.logError)
        .pipe(gulp.dest('dist/resources/css'));
});

gulp.task('app-ts', () => {
    return tsProject
        .src().pipe(tsProject())
        .js.pipe(gulp.dest('dist'));
});

gulp.task('resource-ts', () => {
    return resourceTS
        .src().pipe(resourceTS())
        .js.pipe(gulp.dest('dist/resources/js'));
});

gulp.task('img', () => {
    return gulp.src(['./resources/img/*.png', './resources/img/*.jpg'])
        .pipe(gulp.dest('dist/resources/img'));
});

gulp.task('typescript', gulp.series('app-ts', 'resource-ts'));

gulp.task('html', () => {
    return gulp.src('./resources/html/*.html')
        .pipe(gulp.dest('dist/resources/html'));
});

gulp.task('credentials', () => {
    return gulp.src([
        './slack_credentials.json',
        './azure_credentials.json',
    ]).pipe(gulp.dest('dist'));
});

gulp.task('aws', () => {
    return gulp.src(['./aws/.**/*', './aws/.npmrc', './package.json'])
        .pipe(gulp.dest('dist'));
});

gulp.task('aws-build', () => {
    return gulp.src(['dist/**/*', 'dist/**/.*', 'dist/.**/*', 'dist/.**/.*'])
        .pipe(zip('aws.zip'))
        .pipe(gulp.dest('./'));
});

gulp.task('resource-watch', () => {
    return gulp.watch('./resources/**/*.*', gulp.parallel('html', 'resource-ts', 'sass'));
});

gulp.task('watch', gulp.series(
    gulp.parallel('sass', 'typescript', 'html', 'img', 'credentials', 'aws'),
    'aws-build',
    'resource-watch')
);

gulp.task('default', gulp.series(
    gulp.parallel('sass', 'typescript', 'html', 'img', 'credentials', 'aws'),
    'aws-build')
);