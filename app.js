(function() {
  'use strict';

  // Prepare the 'users' module for subsequent registration of controllers and delegates
  angular
      .module('mosaic', [ 'ngMaterial' ])
      .constant('TileDimension', {
        'width': 5,
        'height': 5
      })
      .service('svgService',
          ['$window', 'TileDimension', function($window, TileDimension) {
        var WIDTH  = TileDimension.width,
            HEIGHT = TileDimension.height,
            DOMURL = $window.URL || $window.webkitURL;
        var svgTemplate = [
            '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"',
            ' width="',
            '" height="',
            '">',
            '<ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="#',
            '"></ellipse>',
            '</svg>'
        ];

        function createSVGUrl(svg) {
          var svgBlob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
          return DOMURL.createObjectURL(svgBlob);
        };

        return {
          getSvg: function(tile) {
            var svg = svgTemplate.slice(0);
            svg.splice(2, 0, WIDTH);
            svg.splice(4, 0, HEIGHT);
            svg.splice(7, 0, tile.hex);
            return {svg: svg.join(''), x: tile.x, y: tile.y};
          },
          createSVGUrl: createSVGUrl
        };
      }]);
})();
