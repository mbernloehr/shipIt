/**
 * Created by wallace on 10/06/2016.
 */
(function () {
  'use strict';

  angular.module('gentelellaAngularApp')
    .config(stateConfig)
    .controller('initController', initController);

  function stateConfig($stateProvider) {
    $stateProvider.state('init', {
      templateUrl: 'views/init/init.html',
      controller:'initController',
      controllerAs: 'vm',
      data: {
      }
    });
  }

  function initController($timeout) {
    var vm = this;

    vm.totalPredictions = 1337;
    vm.totalGreenLight = 1333;
    vm.totalMaintenance = 4;

    liveData();
      
    

    function liveData() {
      $timeout(function() {
        if(vm.totalPredictions%500 == 0) {
          vm.totalMaintenance++;
        } else {
          vm.totalGreenLight++
        }

        vm.totalPredictions++;
        

        liveData();
      }, 2);
    }


  }

  

})();
