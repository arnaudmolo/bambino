'use strict'

describe 'Service: smoothScroll', () ->

  # load the service's module
  beforeEach module 'bambinoApp'

  # instantiate service
  smoothScroll = {}
  beforeEach inject (_smoothScroll_) ->
    smoothScroll = _smoothScroll_

  it 'should do something', () ->
    expect(!!smoothScroll).toBe true
