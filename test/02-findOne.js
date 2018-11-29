'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

describe('findOne', function () {
  before(function (done) {
    this.timeout(lib.timeout)
    lib.resetDb(function (err) {
      if (err) throw err
      done()
    })
  })

  it('should return error if collection doesn\'t exist', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.findOne('id', { collection: 'none' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Collection not found')
        done()
      })
  })

  it('should return empty value', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.findOne('wrong-id', { collection: 'test' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Document not found')
        done()
      })
  })

  it('should return the correct value', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.findOne('jack-bauer', { collection: 'test' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.data).to.have.property('_id', 'jack-bauer')
        expect(result.data).to.have.property('name', 'Jack Bauer')
        done()
      })
  })

  it('should return enforced values according to its definitions', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaFull)
      .then(result => {
        return cls.findOne('jack-bauer', { collection: 'full' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.data).to.have.property('_id', 'jack-bauer')
        expect(result.data).to.have.property('name', 'Jack Bauer')
        expect(result.data).to.have.property('age', null)
        done()
      })
  })

  it('should return enforced values with hidden columns', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaHidden)
      .then(result => {
        return cls.findOne('jack-bauer', { collection: 'hidden' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.data).to.have.property('_id', 'jack-bauer')
        expect(result.data).to.not.have.property('name')
        expect(result.data).to.have.property('age', null)
        done()
      })
  })

  it('should return enforced values with masks', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaMask)
      .then(result => {
        return cls.findOne('jack-bauer', { collection: 'mask' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.data).to.have.property('id', 'jack-bauer')
        expect(result.data).to.have.property('fullname', 'Jack Bauer')
        expect(result.data).to.have.property('age', null)
        done()
      })
  })
})
