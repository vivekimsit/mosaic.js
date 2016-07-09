(function(window, document, app) {
  'use strict';

  var DOMURL = window.URL || window.webkitURL,
      TILE_WIDTH  = 8,
      TILE_HEIGHT = 8;

  var svgTemplate = [
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"',
    ' width="',
    '" height="',
    '">',
    '<ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="',
    '"></ellipse>',
    '</svg>'
  ];

  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  function rgbToHex(rgb) {
    return componentToHex(rgb[0]) + componentToHex(rgb[1]) +
        componentToHex(rgb[2]);
  };

  function Tile(pixelData, x, y) {
    this.hex = rgbToHex(pixelData);
    this.x = x * TILE_WIDTH;
    this.y = y * TILE_HEIGHT; 
  };

  /**
   * Draws a offscreen canvas to get averaged rgb per tile.
   * see http://stackoverflow.com/a/17862644/4260745
   */
  function getAverageRgb(image) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = image.width / TILE_WIDTH;
    canvas.height = image.height / TILE_HEIGHT;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return ctx;
  };

  function getTilesMetaData(sourceImage) {
    var res = [];
    var context = getAverageRgb(sourceImage);
    var NUM_TILES_X = Math.floor(sourceImage.width / TILE_WIDTH);
    var NUM_TILES_Y = Math.floor(sourceImage.height / TILE_HEIGHT);
    var data = context.getImageData(0, 0, NUM_TILES_X, NUM_TILES_Y).data;
    var i = 0;
    for (var row = 0; row < NUM_TILES_Y; row++) {
      for (var col = 0; col < NUM_TILES_X; col++) {
        res.push(new Tile(data.subarray(i * 4, i * 4 + 3), col, row));
        i++;
      }
    }
    return res;
  };

  /**
   * Draws PhotoMosaic on screen.
   */
  function drawMosiac(image) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;

    var chunkSize = image.width / TILE_WIDTH;
    var tilesMetadata = getTilesMetaData(image);
    var chunks = tilesMetadata.splice(0, chunkSize);
    var promises = [];
    while (chunks.length > 0) {
      promises.push(
          Promise.resolve(chunks.map(function(data) {
            return getSvg(data);
          })));
      chunks = tilesMetadata.splice(0, chunkSize);
    }

    function renderRow(promises) {
      // Base case.
      if (promises.length === 0) return;
      promises.shift().then(function(results) {
        results.forEach(function(result) {
          renderSVGTile(ctx, result.svg, {x: result.x, y: result.y});
        });
        // Timeout gives some relief to browser to finish some other tasks
        // and not hang the browser with this CPU intensive task.
        window.setTimeout(function() {
          // Resolve the remaining promises.
          renderRow(promises);
        }, 500);
      });
    };
    renderRow(promises);
    return canvas;
  };

  function createSVGUrl(svg) {
    var svgBlob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
    return DOMURL.createObjectURL(svgBlob);
  };

  function renderSVGTile(ctx, svg, pos) {
    var img = new Image();
    var url = createSVGUrl(svg);
    img.onload = function() {
      try {
        ctx.drawImage(img, pos.x, pos.y);
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        DOMURL.revokeObjectURL(url);
      } catch(e) {
        throw new Error('Could not render image' + e);
      }
    };
    img.src = url;
  };

  function getSvg(data) {
    var svg = svgTemplate.slice(0);
    svg.splice(2, 0, TILE_WIDTH);
    svg.splice(4, 0, TILE_HEIGHT);
    svg.splice(7, 0, '#' + data.hex);
    return {svg: svg.join(''), x: data.x, y: data.y};
  };

  function handleFileUpload(callback) {
    var img = new Image();
    img.src = window.URL.createObjectURL(this);
    img.onload = function() { callback(this); }
  };

  app.run = function run() {
    var inputElement = document.getElementById('input');
    var ul = document.getElementById('image-list');
    var li = document.createElement('li');
    ul.appendChild(li);
    inputElement.addEventListener('change', function() {
      handleFileUpload.call(
          this.files[0], function(image) {
            var canvas = drawMosiac(image);
            li.appendChild(canvas);
          });
    }, false);
  };
})(window, document, window.app || (window.app = {}));
