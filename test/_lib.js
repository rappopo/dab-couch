'use strict'

const _ = require('lodash')
const async = require('async')

module.exports = {
  _: _,
  options: {
    url: 'http://admin:admin@localhost:5984'
  },
  schema: {
    name: 'test'
  },
  schemaDummy: {
    name: 'test1'
  },
  schemaFull: {
    name: 'full',
    attributes: {
      _id: 'string',
      name: 'string',
      age: 'integer'
    }
  },
  schemaHidden: {
    name: 'hidden',
    attributes: {
      _id: 'string',
      name: { type: 'string', hidden: true },
      age: 'integer'
    }
  },
  schemaMask: {
    name: 'mask',
    attributes: {
      _id: { type: 'string', mask: 'id' },
      name: { type: 'string', mask: 'fullname' },
      age: { type: 'integer' }
    }
  },
  schemaMaskDummy: {
    name: 'mask1',
    attributes: {
      _id: { type: 'string', mask: 'id' },
      name: { type: 'string', mask: 'fullname' },
      age: { type: 'integer' }
    }
  },
  schemaBulk: {
    name: 'test1'
  },
  docs: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'johnny-english', name: 'Johnny English' },
    { name: 'Jane Boo', age: 20 }
  ],
  docsMask: [
    { id: 'jack-bauer', fullname: 'Jack Bauer' },
    { id: 'johnny-english', fullname: 'Johnny English' },
    { fullname: 'Jane Boo', age: 20 }
  ],
  timeout: 5000,
  resetDb: function (callback, fillIn = true) {
    let me = this
    const nano = require('nano')(me.options.url)
    async.mapSeries(['schema', 'schemaFull', 'schemaHidden', 'schemaMask', 'schemaBulk',
      'schemaDummy', 'schemaMaskDummy'], function (s, callb) {
      nano.db.destroy(me[s].name, function (err, body) {
        if (err && err.statusCode !== 404) return callb(err)
        nano.db.create(me[s].name, function (err, body) {
          if (err) return callb(err)
          let db = nano.db.use(me[s].name)
          if (['test1', 'mask1'].indexOf(me[s].name) > -1 || !fillIn) return callb(null, null)
          db.bulk({ docs: me.docs }, function (err, results) {
            if (err) return callb(err)
            async.mapSeries(['name', 'age'], function (i, cb) {
              db.createIndex({
                index: { fields: [i] },
                name: i
              }, function (e) {
                cb(null)
              })
            }, function () {
              callb()
            })
          })
        })
      })
    }, callback)
  }
}
