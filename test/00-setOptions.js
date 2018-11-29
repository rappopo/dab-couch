'use strict'

const chai = require('chai')
const expect = chai.expect
const chaiSubset = require('chai-subset')

chai.use(chaiSubset)

const Cls = require('../index')

describe('setOptions', function () {
  it('should return the default options', function () {
    const cls = new Cls()
    expect(cls.options).to.include({
      url: 'http://localhost:5984'
    })
  })

  it('should return options with custom path', function () {
    const cls = new Cls({
      url: 'http://admin:admin@remote:5984'
    })
    expect(cls.options).to.include({
      url: 'http://admin:admin@remote:5984'
    })
  })
})
