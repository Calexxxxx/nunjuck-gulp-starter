const gulp = require('gulp'),
	browserSync = require('browser-sync').create(),
	sass = require('gulp-sass'),
	sourcemap = require('gulp-sourcemaps'),
	babel = require('gulp-babel'),
	minify = require('gulp-minify'),
	webpack = require('webpack-stream'),
	postcss = require('gulp-postcss'),
	cssnano = require('cssnano'),
	size = require('gulp-size'),
	whitespace = require('postcss-normalize-whitespace'),
	cssDeclarationSorter = require('css-declaration-sorter'),
	prefix = require('autoprefixer'), 
	del = require('del'),
	uncss = require('postcss-uncss'),
	nunjucksRender = require('gulp-nunjucks-render'),
	data = require('gulp-data'),
	imagemin = require('gulp-imagemin'),
	cache = require('gulp-cache'),
	pngquant = require('imagemin-pngquant'),
	zopfli = require('imagemin-zopfli'),
	mozjpeg = require('imagemin-mozjpeg'),
	giflossy = require('imagemin-giflossy'),
	beautify = require('gulp-beautify');

const paths = {
	src: {
		html: ['./src/pages/**/*.njk', './src/templates/**/*.njk'],
		pages: './src/pages/**/*.+(html|nunjucks|njk)',
		scss: './src/assets/scss/**/*.scss',
		js: './src/assets/js/app.js',
		images: './src/assets/images/*.{gif,png,jpg,svg}',
		data: './src/data.json',
		vendor: './src/assets/vendor/**/*'
	},
	dist: {
		base: './dist',
		css: './dist/assets/css',
		js: './dist/assets/js',
		img: './dist/assets/img',
		vendor: './dist/assets/vendor/'
	}
}

function scss() {
	const plugins = [
		prefix({ browsers: ['last 2 versions'], cascade: false }),
		cssDeclarationSorter({order: 'concentric-css'}),
		cssnano(),
		whitespace()
	]

	return gulp
		.src(paths.src.scss)
		.pipe(sourcemap.init())
		.pipe(sass().on('error', sass.logError))
		.pipe(postcss(plugins))
		.pipe(beautify.css({ indent_size: 4 }))
		.pipe(sourcemap.write('.'))
		.pipe(size())
		.pipe(gulp.dest(paths.dist.css))
		.pipe(browserSync.stream());
}

function nunjucks() {
	return gulp.src(paths.src.pages)
	.pipe(data(function() {
		return require(paths.src.data)
	}))
	.pipe(nunjucksRender({
		path: ['./src/templates']
	}))
	.pipe(beautify.html({ indent_size: 4 }))
	.pipe(gulp.dest(paths.dist.base))
}

function images() {
	return gulp.src(paths.src.images)
	.pipe(cache(imagemin([
		pngquant({
			speed: 1,
			quality: [0.95, 1]
		}),
		zopfli({
			more: true
		}),
		giflossy({
			optimizationLevel: 3,
			optimize: 3,
			lossy: 2
		}),
		imagemin.svgo({
			plugins: [{
				removeViewBox: false
			}]
		}),
		imagemin.jpegtran({
			progressive: true
		}),
		mozjpeg({
			quality: 90
		})
	])))
	.pipe(gulp.dest(paths.dist.img))
}

function js() {
	return gulp
		.src(paths.src.js)
		.pipe(
			babel({
				presets: ['@babel/env']
			})
		)
		.pipe(webpack( {
			entry: paths.src.js,
			output: {
				filename: `[name].js`
			},
			mode: 'development'
		} ))
		.pipe(
			minify({
				ext: {
					src: '.js',
					min: '.min.js'
				},
				mangle: false
			})
		)
		.pipe(gulp.dest(paths.dist.js));
}

function copy() {
	return gulp.src(paths.src.vendor)
		.pipe(gulp.dest(paths.dist.vendor))
}

function watchFiles() {
	browserSync.init({
		server: {
			baseDir: paths.dist
		}
	});
	gulp.watch(paths.src.scss, scss).on('change', browserSync.reload);
	gulp.watch(paths.src.html, gulp.series(nunjucks, scss)).on('change', browserSync.reload);
	gulp.watch(paths.src.images, images).on('change', browserSync.reload);
	gulp.watch(paths.src.js, gulp.series(js, scss)).on('change', browserSync.reload);
}

const watch = gulp.series(watchFiles, nunjucks);

exports.copy = copy;
exports.images = images;

exports.watch = watch;
