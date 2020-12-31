import gulp from 'gulp';
import ts from 'gulp-typescript';
import sass from 'gulp-sass';
import zip from 'gulp-zip';
import autoprefix from 'gulp-autoprefixer';

const tsProject = ts.createProject('tsconfig.json');
const resourceTS = ts.createProject('resources/tsconfig.json');

gulp.task('sass', () => {
    return gulp.src('./resources/scss/*.scss')
        .pipe(sass()).on('error', sass.logError)
        .pipe(autoprefix())
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
    return gulp.src([
        './resources/img/*.png',
        './resources/img/*.jpg',
        './resources/img/*.ico'
    ]).pipe(gulp.dest('dist/resources/img'));
});

gulp.task('typescript', gulp.series('app-ts', 'resource-ts'));

gulp.task('html', () => {
    return gulp.src([
        './resources/html/*.html',
        './resources/html/*.txt',
    ]).pipe(gulp.dest('dist/resources/html'));
});

gulp.task('credentials', () => {
    return gulp.src([
        './slack_credentials.json',
        './azure_credentials.json',
        './aws_credentials.json',
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