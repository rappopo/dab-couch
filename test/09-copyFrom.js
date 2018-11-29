'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const chaiSubset = require('chai-subset')
const expect = chai.expect

chai.use(chaiSubset)
chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

describe('copyFrom', function () {
  beforeEach(function (done) {
    this.timeout(lib.timeout)
    lib.resetDb(function (err) {
      if (err) throw err
      done()
    })
  })

  it('should return error if collection doesn\'t exist', function (done) {
    const cls = new Cls(lib.options)
    const src = new Cls(lib.options)
    src.createCollection(lib.schema)
      .then(result => {
        return cls.createCollection({ name: 'test1' })
      })
      .then(result => {
        return cls.copyFrom(src, { collection: 'none' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Collection not found')
        done()
      })
  })

  it('should return all values correctly', function (done) {
    const cls = new Cls(lib.options)
    const src = new Cls(lib.options)
    src.createCollection(lib.schema)
      .then(result => {
        return cls.createCollection({ name: 'test1' })
      })
      .then(result => {
        return cls.copyFrom(src, { srcCollection: 'test', collection: 'test1', withDetail: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.stat).to.have.property('ok', 3)
        expect(result.stat).to.have.property('fail', 0)
        expect(result.stat).to.have.property('total', 3)
        done()
      })
  })

  it('should import all values from a file', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.copyFrom('test/_inOut.json', { collection: 'test', withDetail: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.stat).to.have.property('ok', 5)
        expect(result.stat).to.have.property('fail', 0)
        expect(result.stat).to.have.property('total', 5)
        done()
      })
  })

  it('should import all values from a file with masks', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaMask)
      .then(result => {
        return cls.copyFrom('test/_inOutMask.json', { collection: 'mask', withDetail: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.stat).to.have.property('ok', 5)
        expect(result.stat).to.have.property('fail', 0)
        expect(result.stat).to.have.property('total', 5)
        done()
      })
  })
})
