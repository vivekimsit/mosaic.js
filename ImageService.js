(function(){
  'use strict';

  angular.module('mosaic')
         .service(
             'imageService',
             ['$q', '$window', 'TileDimension', 'svgService', ImageService]);

  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  function rgbToHex(rgb) {
    return componentToHex(rgb[0]) + componentToHex(rgb[1]) +
        componentToHex(rgb[2]);
  };

  function Tile(rgb, x, y) {
    this.hex = rgbToHex(rgb);
    this.x = x;
    this.y = y;
  };

  /**
   * @constructor
   */
  function ImageService($q, $window, TileDimension, svgService){

    var DOMURL = $window.URL || $window.webkitURL,
        TILE_WIDTH  = TileDimension.width,
        TILE_HEIGHT = TileDimension.height,
        TIMEOUT = 200;

    function renderTile(ctx, svg, pos) {
      var img = new Image();
      var url = svgService.createSVGUrl(svg);
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

    /**
     * Draws PhotoMosaic on screen.
     */
    function drawMosiac(image) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;

      function renderRow(promises) {
        // Base case.
        if (promises.length === 0) return;
        promises.shift().then(function(results) {
          results.forEach(function(result) {
            renderTile(ctx, result.svg, {x: result.x, y: result.y});
          });
          // Timeout gives some relief to browser to finish some other tasks
          // and not hang the browser with this CPU intensive task.
          $window.setTimeout(function() {
            // Resolve the remaining promises.
            renderRow(promises);
          }, TIMEOUT);
        });
      };

      var chunkSize = image.width / TILE_WIDTH,
          tilesMetadata = getTilesMetaData(image),
          chunks = tilesMetadata.splice(0, chunkSize),
          promises = [];
      while (chunks.length > 0) {
        promises.push(
            Promise.resolve(chunks.map(function(tile) {
              return svgService.getSvg(tile);
            })));
        chunks = tilesMetadata.splice(0, chunkSize);
      }
      renderRow(promises);
      return $q.when(canvas);
    };

    /**
     * Draws a offscreen canvas to get averaged rgb per tile.
     * see http://stackoverflow.com/a/17862644/4260745
     */
    function getAverageRgb(image) {
      var canvas = document.createElement('canvas'),
          ctx    = canvas.getContext('2d');
      canvas.width = image.width / TILE_WIDTH;
      canvas.height = image.height / TILE_HEIGHT;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return ctx;
    };

    function getTilesMetaData(sourceImage) {
      var res = [],
          context = getAverageRgb(sourceImage),
          tilesX  = Math.floor(sourceImage.width / TILE_WIDTH),
          tilesY  = Math.floor(sourceImage.height / TILE_HEIGHT),
          averageData = context.getImageData(0, 0, tilesX, tilesY).data,
          i = 0;
      function createTile(data, col, row) {
        return new Tile(
            data.subarray(i * 4, i * 4 + 3), col * TILE_WIDTH, row * TILE_HEIGHT);
      };
      for (var row = 0; row < tilesY; row++) {
        for (var col = 0; col < tilesX; col++) {
          res.push(createTile(averageData, col, row));
          i++;
        }
      }
      return res;
    };

    // Promise-based API
    return {
      drawMosiac: drawMosiac
    };
  }
})();
