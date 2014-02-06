'use strict'

describe 'Service: navigationService', () ->

  # load the service's module
  beforeEach module 'bambinoApp'

  # instantiate service
  navigationService = {}
  beforeEach inject (_navigationService_) ->
    navigationService = _navigationService_

  it 'should do something', () ->
    expect(!!navigationService).toBe true
