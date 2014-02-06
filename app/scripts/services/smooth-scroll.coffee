"use strict"

angular.module("bambinoApp")
  .factory "smoothScroll", ["$q", ($q) ->

    getElementTop = (elem) ->
      yPos = elem.offsetTop
      tempEl = elem.offsetParent
      while tempEl?
        yPos += tempEl.offsetTop
        tempEl = tempEl.offsetParent
      yPos

    SmoothScroll = (start_y, stop_y, defer) ->
      distance = (if stop_y > start_y then stop_y - start_y else start_y - stop_y)
      if distance < 100
        scrollTo 0, stop_y
        defer.resolve leap_y
        return

      speed = Math.round distance / 100
      speed = 20  if speed >= 20
      step = Math.round distance / 25
      leap_y = (if stop_y > start_y then start_y + step else start_y - step)
      timer = 0

      descendant = (leap_y, timer, fin) ->
        setTimeout () ->
          scrollTo 0, leap_y
          defer.resolve leap_y if leap_y >= fin
        , timer * speed

      ascendant = (leap_y, timer, fin) ->
        setTimeout () ->
          scrollTo 0, leap_y
          defer.resolve leap_y if leap_y <= fin
        , timer * speed

      if stop_y > start_y
        i = start_y
        while i < stop_y
          descendant leap_y, timer, stop_y
          leap_y += step
          leap_y = stop_y if leap_y > stop_y
          timer++
          i += step
      i = start_y
      while i > stop_y
        ascendant leap_y, timer, stop_y
        leap_y -= step
        leap_y = stop_y  if leap_y < stop_y
        timer++
        i -= step

    {
      $goTo: (y, x = 1200) ->
        x = getElementTop y[0] if typeof y isnt Number
        defer = do $q.defer
        SmoothScroll window.pageYOffset, x, defer
        defer.promise.then (final_x = window.pageYOffset) ->
          window.onload = () -> scrollTo 0, final_x
    }
  ]