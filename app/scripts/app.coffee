'use strict'

angular.module('bambinoApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute'
])
  .config ($routeProvider) ->
    routeManager = (route) ->
      console.log "route", route
      ["navigationService", "smoothScroll", (navigationService, smoothScroll) ->
        navigationService.getRoute(route).then (route) ->
          navigationService.current_url = route
          smoothScroll.$goTo route.element
      ]
    $routeProvider
    .when '/',
      resolve:
        route: routeManager ''
    .when '/film',
      resolve:
        route: routeManager '/film'
    .when '/casting',
      resolve:
        route: routeManager '/casting'
    .when '/making-of',
      resolve:
        route: routeManager '/making-of'
    .when '/credits',
      resolve:
        route: routeManager '/credits'
