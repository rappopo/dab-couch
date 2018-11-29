'use strict'

const chai = require('chai')
const chaiSubset = require('chai-subset')
const expect = chai.expect

chai.use(chaiSubset)

const Cls = require('../index')
const lib = require('./_lib')

describe('find', function () {
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
        return cls.find({ collection: 'none' })
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
        return cls.find({ collection: 'test', query: { _id: 'no-agent' } })
      })
      .then(result => {
        expect(result.data).to.be.a('array').and.have.length(0)
        done()
      })
  })

  it('should return all values', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.find({ collection: 'test' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        expect(result.data).to.be.a('array').and.containSubset(lib.docs)
        done()
      })
  })

  it('should return filtered values', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.find({ collection: 'test', query: { _id: 'jack-bauer' } })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(1)
        expect(result.data).to.be.a('array').and.containSubset([lib.docs[0]])
        done()
      })
  })

  it('should return 2nd page', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.find({ collection: 'test', page: 2, limit: 1, sort: [{ name: 'asc' }] })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        expect(result.data).to.be.a('array').that.have.length(1)
        expect(result.data[0]).to.include(lib.docs[2])
        done()
      })
  })

  it('should sort in descending order', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.find({ collection: 'test', sort: [{ name: 'desc' }] })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        let keys = lib._.map(result.data, 'name')
        expect(keys).to.eql(['Johnny English', 'Jane Boo', 'Jack Bauer'])
        done()
      })
  })

  it('should return enforced values according to its definitions', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaFull)
      .then(result => {
        return cls.find({ collection: 'full' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        expect(result.data).to.containSubset([{ _id: 'jack-bauer', name: 'Jack Bauer', age: null }])
        expect(result.data).to.containSubset([{ _id: 'johnny-english', name: 'Johnny English', age: null }])
        expect(result.data).to.containSubset([{ name: 'Jane Boo', age: 20 }])
        done()
      })
  })

  it('should return enforced values with hidden columns', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaHidden)
      .then(result => {
        return cls.find({ collection: 'hidden' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        expect(result.data).to.containSubset([{ _id: 'jack-bauer', age: null }])
        expect(result.data).to.containSubset([{ _id: 'johnny-english', age: null }])
        expect(result.data).to.containSubset([{ age: 20 }])
        done()
      })
  })

  it('should return enforced values with masks', function (done) {
    const cls = new Cls(lib.options)
    cls.createCollection(lib.schemaMask)
      .then(result => {
        return cls.find({ collection: 'mask' })
      })
      .then(result => {
        expect(result.success).to.equal(true)
        // expect(result.total).to.equal(3)
        expect(result.data).to.containSubset([{ id: 'jack-bauer', fullname: 'Jack Bauer', age: null }])
        expect(result.data).to.containSubset([{ id: 'johnny-english', fullname: 'Johnny English', age: null }])
        expect(result.data).to.containSubset([{ fullname: 'Jane Boo', age: 20 }])
        done()
      })
  })
})
