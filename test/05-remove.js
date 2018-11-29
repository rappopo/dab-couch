'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

describe('remove', function () {
  beforeEach(function (done) {
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
        return cls.remove('no-agent', { collection: 'none' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Collection not found')
        done()
      })
  })

  it('should return error if doc doesn\'t exist', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.remove('no-agent', { collection: 'test' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Document not found')
        done()
      })
  })

  it('should return success', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.remove('jack-bauer', { collection: 'test' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        done()
      })
  })

  it('should return the value before removed', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.remove('jack-bauer', { collection: 'test', withSource: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result).to.have.property('source').that.include(lib.docs[0])
        done()
      })
  })

  it('should return the value before removed enforced according to its definitions', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaFull)
      .then(result => {
        return cls.remove('jack-bauer', { collection: 'full', withSource: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.source).to.have.property('_id', 'jack-bauer')
        expect(result.source).to.have.property('name', 'Jack Bauer')
        expect(result.source).to.have.property('age', null)
        done()
      })
  })

  it('should return the value before removed enforced with hidden columns', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaHidden)
      .then(result => {
        return cls.remove('jack-bauer', { collection: 'hidden', withSource: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.source).to.have.property('_id', 'jack-bauer')
        expect(result.source).to.not.have.property('name')
        expect(result.source).to.have.property('age', null)
        done()
      })
  })

  it('should return the value before removed enforced with masks', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaMask)
      .then(result => {
        return cls.remove('jack-bauer', { collection: 'mask', withSource: true })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        expect(result.source).to.have.property('id', 'jack-bauer')
        expect(result.source).to.have.property('fullname', 'Jack Bauer')
        expect(result.source).to.have.property('age', null)
        done()
      })
  })
})
