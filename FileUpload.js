(function(){
  'use strict';

  angular.module('mosaic')
         .directive('fileUpload', function fileUpload() {
    return {
      restrict: 'E',
      scope: {
        'onUpload': '&'
      },
      template: [
          '<input class="ng-hide" id="image-input" accept="image/*" type="file" />',
          '<label for="image-input" class="md-button md-raised md-primary">Upload Image</label>'].join(''),
      link: function($scope, element, attrs) {
        var _URL = window.URL || window.webkitURL;
        element.on('change', function() {
          var fileInput = element.find('input')[0];
          var file = fileInput.files[0];
          var img  = new Image();
          img.onload = function() {
            console.log(this.width, this.height);
            $scope.onUpload({file: {image: this}});
          };
          img.src = _URL.createObjectURL(file);
        });
      }
    };
  });
})();
