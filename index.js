/**
 * Modules
 */
var gulp = require('gulp');
var path = require('path');
var fs = require('fs');

// gulp
var concat = require('gulp-concat');
var filter = require('gulp-filter');
var rework = require('rework');
var reworkURL = require('rework-plugin-url');
var es = require('event-stream');
var File = require('vinyl');
var errorHandler = require('gulp-error-handler');
var minifyCSS = require('gulp-minify-css');


var livereload = require('gulp-livereload');

/**
 * Exports
 */

module.exports = bowerCss;

/**
 * Build bower css
 */
function bowerCss(options) {
  var devMode = options.devMode || true;
  return function() {
    var cssFilter = filter('**/*.css');

    var stream = gulp.src('./bower.json')
      .pipe(es.through(pluckFilesFromJson('dependencies')))
      .pipe(es.mapSync(function(name) {
        return path.join('bower_components', name, '/bower.json');
      }))
      .pipe(vinylify())
      .pipe(es.through(pluckFilesFromJson('main')))
      .pipe(vinylify())
      .pipe(cssFilter)
      .pipe(es.mapSync(function(file) {
        var css = file.contents.toString('utf8')
          , res = rework(css)
          .use(urlRewriter(file))
          .toString({sourcemap: true});

        file.contents = new Buffer(res);
        return file;
      }))
      .on('error', errorHandler)
      .pipe(concat('bower.css'))

    if (!devMode) {
      stream = stream.pipe(minifyCSS(options.minifyCSS || {}));
    }

    stream = stream
      .pipe(gulp.dest('public'));

    if (devMode) {
      stream = stream.pipe(livereload());
    }

    return stream;
  }

  
}


function vinylify(base) {
  base = base || process.cwd();
  return es.through(function(file) {
    if(file[0] !== '/')
      file = path.join(base, file);

    fs.existsSync(file) && this.emit('data', new File({
      path: file,
      base: base,
      contents: fs.readFileSync(file)
    }));
  });
}

function pluckFilesFromJson(prop) {
  return function(file) {
    var self = this
      , json = JSON.parse(file.contents.toString('utf8'));

    if(Array.isArray(json[prop])) {
      json[prop].forEach(function(p) {
        self.emit('data', path.resolve(path.dirname(file.path), p));
      });
    } else if (typeof json[prop] === 'object') {
      Object.keys(json[prop]).forEach(function(name) {
        self.emit('data', name);
      });
    } else {
      self.emit('data', path.resolve(path.dirname(file.path), json[prop]));
    }
  };
}

function urlRewriter(file) {
  return reworkURL(function(url) {
    var abs = path.resolve(path.dirname(file.path), url);
    return abs.slice(process.cwd().length);
  });
}