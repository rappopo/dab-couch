'use strict'

const chai = require('chai'),
  expect = chai.expect,
  chaiSubset = require('chai-subset')

chai.use(chaiSubset)

const Cls = require('../index'),
  lib = require('./_lib')

describe('setOptions', function () {
  it('should return the default options', function () {
    const cls = new Cls()
    expect(cls.options).to.include({
      url: 'http://localhost:5984',
      dbName: 'test'
    })
  })

  it('should return options with custom url', function () {
    const cls = new Cls({ 
      url: 'http://localhost:5984',
    })
    expect(cls.options).to.include({
      url: 'http://localhost:5984',
    })
  })

  it('should return options with custom dbName', function () {
    const cls = new Cls({ 
      dbName: 'mydb'
    })
    expect(cls.options).to.include({
      dbName: 'mydb'
    })
  })

})


