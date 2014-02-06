'use strict'

$ () ->
  $.scrollTo "#" + location.hash.split("/")[1], 500
  $(".intro .menu a").on 'click', () -> $.scrollTo "##{$(@).attr 'data-url'}", 500