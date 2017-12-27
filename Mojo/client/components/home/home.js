homeApp.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/home',
        templateUrl: 'components/home/home.html',
        controller: 'HomeController',
        resolve: {
            authenticated: function($q, $location, $auth) {
                var deferred = $q.defer();

                if (!$auth.isAuthenticated()) {
                    $location.path('/login');
                } else {
                    deferred.resolve();
                }

                return deferred.promise;
            }
        }
    })
});

homeApp.controller('HomeController', function () {
});


homeApp.run(['Carousel', function (Carousel) {
    Carousel.setOptions({});
}]);

homeApp.controller('CarouselDemoCtrl', ['$scope', 'Carousel','$http', function ($scope, Carousel,$http) {
    'use strict';
    this.title = 'Here is your album carousels';
    $http.get('/api/users/albums').success(function(data) {
        $scope.albums = data;
    })
        .error(function(error) {
           console.log(error.message);
        });
    this.slides = [
    ];

    this.onCarouselInit = function () {
        console.log('carousel init');
    };
}]);


