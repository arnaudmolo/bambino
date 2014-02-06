"use strict"

angular.module("bambinoApp")
  .factory "navigationService", ["$rootScope", "$q", ($rootScope, $q) ->

    Navigation = do $rootScope.$new

    Navigation.routes = routes = []

    Navigation.addRoute = (route) -> routes.push route

    Navigation.getRoute = (route) ->
      defer = do $q.defer
      unregister = Navigation.$watchCollection "routes", (new_val, old_val) ->
        route_index = _.findIndex routes, { "route": route }
        if route_index is -1 then return false else do unregister
        defer.resolve routes[route_index]
      defer.promise

    Navigation
  ]