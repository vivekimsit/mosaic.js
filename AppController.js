(function(){

  angular
      .module('mosaic')
      .controller('AppController', [
          'imageService', '$mdSidenav', '$mdBottomSheet', '$timeout', '$log',
          AppController
      ]);

  /**
   * Main Controller for the Angular Material Starter App
   * @param $scope
   * @param $mdSidenav
   * @constructor
   */
  function AppController(imageService, $mdSidenav) {
    var self = this;

    self.selected     = null;
    self.images       = [ ];
    self.handleFileUpload = handleFileUpload;
    self.loading = false;

    /**
     * Hide or Show the 'left' sideNav area
     */
    function toggleUsersList() {
      $mdSidenav('left').toggle();
    }

    function handleFileUpload(file) {
      var el = document.getElementById('output');
      self.loading = true;
      imageService
          .drawMosiac(file.image)
          .then(function(image) {
            //self.images.push(image);
            //var li = document.createElement('md-list-item');
            el.innerHTML = '';
            el.appendChild(image);
            self.loading = false;
            //el.appendChild(li);
            self.selected = self.images[0];
          });
    };
  }

})();
