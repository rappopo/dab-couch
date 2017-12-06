'use strict'

const _ = require('lodash')

module.exports = {
  _: _,
  options: {
    url: 'http://localhost:5984',
    dbName: 'test'
  },
  dummyData: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'james-bond', name: 'James Bond' }
  ],
  bulkDocs: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'johnny-english', name: 'Johnny English' },
    { name: 'Jane Boo' }
  ],
  timeout: 5000,
  resetDb: function (callback) {
    let me = this,
      nano = require('nano')(me.options.url)
    nano.db.destroy(me.options.dbName, function (err, body) {
      if (err && err.statusCode !== 404) return callback(err)
      nano.db.create(me.options.dbName, function (err, body) {
        if (err) return callback(err)
        let db = nano.db.use(me.options.dbName)
        db.bulk({ docs: me.dummyData }, function (err, body) {
          if (err) return callback(err)
          callback()
        })
      })
    })
  }
}