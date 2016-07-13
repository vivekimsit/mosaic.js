(function(window, document, app) {
  'use strict';

  var DOMURL = window.URL || window.webkitURL,
      TILE_WIDTH  = 8,
      TILE_HEIGHT = 8;

  // classy, since V8 prefers predictable objects.
  function Tile(rgb, x, y) {
    this.hex = Tile.rgbToHex(rgb);
    this.x = x * TILE_WIDTH;
    this.y = y * TILE_HEIGHT;
  };

  // classy, since V8 prefers predictable objects.
  function SVGTile(svg, x, y) {
    this.svgURL = SVGTile.createSVGUrl(svg);
    this.x = x;
    this.y = y;
    this.width  = TILE_WIDTH;
    this.height = TILE_HEIGHT;
  };

  SVGTile.createSVGUrl = function(svg) {
    var svgBlob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
    return DOMURL.createObjectURL(svgBlob);
  };

  Tile.componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  Tile.rgbToHex = function(rgb) {
    return Tile.componentToHex(rgb[0]) + Tile.componentToHex(rgb[1]) +
        Tile.componentToHex(rgb[2]);
  };

  /**
   * Draws a offscreen canvas to get averaged rgb per tile.
   * see http://stackoverflow.com/a/17862644/4260745
   */
  function getOffScreenContext(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    return canvas.getContext('2d');
  };

  /**
   * Gets tiles data from the source image.
   * @param {HTMLElement} sourceImage
   * @return {!Array<!Tile>}
   */
  function getTiles(sourceImage, tilesX, tilesY) {
    var res = [];
    var context = getOffScreenContext(tilesX, tilesY);
    // see http://stackoverflow.com/a/17862644/4260745
    context.drawImage(sourceImage, 0, 0, tilesX, tilesY);
    var data = context.getImageData(0, 0, tilesX, tilesY).data;
    var i = 0;
    for (var row = 0; row < tilesY; row++) {
      for (var col = 0; col < tilesX; col++) {
        res.push(new Tile(data.subarray(i * 4, i * 4 + 3), col, row));
        i++;
      }
    }
    return res;
  };

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {!Array<!SVGTile>} tiles
   */
  function drawTiles(ctx, tiles) {
    var context = getOffScreenContext(tiles.length * TILE_WIDTH, TILE_HEIGHT);
    tiles.forEach(function(tile, index) {
      renderTile(context, tile, function() {
        if (tiles.length === index + 1) {
          ctx.drawImage(context.canvas, 0, tiles[0].y);
        }
      });
    });
  };

  /**
   * Draws PhotoMosaic on screen.
   * @param {HTMLElement} image The source image from file input.
   */
  function drawMosiac(image, ctx, url) {
    var rowData = {};
    function renderRow(i) {
      if (!rowData[i]) return i;
      var tiles = [];
      rowData[i].forEach(function(data) {
        var tile = new SVGTile(data.svg, data.x, data.y);
        tiles.push(tile);
      });
      drawTiles(ctx, tiles);
      return renderRow(++i);
    };
    var tilesX = Math.floor(image.width / TILE_WIDTH);
    var tilesY = Math.floor(image.height / TILE_HEIGHT);

    var tiles = getTiles(image, tilesX, tilesY);
    var i = 0;
    var maxWorkers = navigator.hardwareConcurrency || 4;
    function runWorker(worker) {
      worker.onmessage = function(e) {
        var row = e.data[0].y / TILE_HEIGHT;
        rowData[row] = e.data;
        if (row === i) {
          i = renderRow(i);
        }
        if (tiles.length) {
          runWorker(worker)
        } else {
          worker.terminate();
        };
      }
      worker.postMessage(tiles.splice(0, tilesX));
    }
    if (tiles.length) {
      for(var x = maxWorkers; x--; ) runWorker(new Worker(url));
    }
  };

  /**
   * Renders svg tile on the given context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {!Tile} tile The tile to render.
   * @param {function()} callback To be called after image is loaded.
   * @throws Error
   */
  function renderTile(ctx, tile, callback) {
    var img = new Image();
    img.onload = function() {
      try {
        ctx.drawImage(this, tile.x, 0, tile.width, tile.height);
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        DOMURL.revokeObjectURL(tile.svgURL);
        callback();
      } catch (e) {
        throw new Error('Could not render image' + e);
      }
    };
    img.src = tile.svgURL;
  };

  function handleFileUpload(callback) {
    var img = new Image();
    img.src = window.URL.createObjectURL(this);
    img.onload = function() { callback(this); }
  };

  /**
   * Main function which starts the rendering process.
   * @throws RangeError
   */
  app.run = function run(url) {
    var inputElement  = document.getElementById('input');
    var outputElement = document.getElementById('output');
    inputElement.addEventListener('change', function() {
      handleFileUpload.call(this.files[0], function(image) {
        if (image.width < TILE_WIDTH || image.height < TILE_HEIGHT) {
          console.log(TILE_WIDTH, TILE_HEIGHT);
          throw new RangeError(
              'Tile dimension cannot be greater than source image.');
        }
        var canvas  = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        drawMosiac(image, context, url);
        outputElement.appendChild(canvas);
      });
    }, false);
  };
})(window, document, window.app || (window.app = {}));
