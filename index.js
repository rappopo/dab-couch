'use strict'

const nano = require('nano')
const Dab = require('@rappopo/dab').Dab

class DabCouch extends Dab {
  constructor (options) {
    super(options)
    this.client = {}
  }

  setOptions (options) {
    super.setOptions(this._.merge(this.options, {
      url: options.url || 'http://localhost:5984',
      retainOnRemove: options.retainOnRemove || []
    }))
    this.nano = nano(this.options.url)
  }

  setClient (params) {
    params = params || {}
    if (this.client[params.collection]) return
    if (this._.keys(this.collection).indexOf(params.collection) === -1) return new Error('Collection not found')
    this.client[params.collection] = this.nano.use(params.collection)
  }

  _rebuildSchema (coll) {
    return new Promise((resolve, reject) => {
      let rebuild = !this._.isEmpty(this.collection[coll].attributes)
      if (!rebuild) return resolve(true)
      this._dropDb(coll)
        .then(result => {
          return this.nano.db.create(coll)
        })
        .then(result => {
          return this._rebuildIndex(coll)
        })
        .then(result => {
          resolve(true)
        })
        .catch(reject)
    })
  }

  _rebuildIndex (coll) {
    return new Promise((resolve, reject) => {
      let rebuild = !this._.isEmpty(this.collection[coll].indexes)
      if (!rebuild) return resolve(true)
      let indexes
      this.nano.db.get(coll)
        .then(result => {
          return this.nano.request({
            db: coll,
            doc: '_index',
            method: 'get'
          })
        })
        .then(result => {
          indexes = this._.filter(result.indexes, i => {
            return i.name !== '_all_docs'
          })
          if (indexes.length === 0) return true
          let proms = []
          this._.each(indexes, i => {
            proms.push(this.nano.request({
              db: coll,
              path: '/_index/' + i.ddoc + '/json/' + i.name,
              method: 'delete'
            }))
          })
          return Promise.all(proms)
        })
        .then(result => {
          let proms = []
          this._.forOwn(this.collection[coll].indexes, (v, k) => {
            proms.push(this.nano.use(coll).createIndex({
              name: k,
              index: { fields: v.column }
            }))
          })
          return Promise.all(proms)
        })
        .then(result => {
          resolve(true)
        })
        .catch(reject)
    })
  }

  _dropDb (coll) {
    return new Promise((resolve, reject) => {
      this.nano.db.get(coll, (e, i) => {
        if (e && e.statusCode !== 404) return reject(e)
        Promise.resolve(true)
          .then(_ => {
            if (i) return this.nano.db.destroy(coll)
            return true
          })
          .then(result => {
            resolve(true)
          })
          .catch(reject)
      })
    })
  }

  createCollection (coll, params) {
    params = params || {}
    return new Promise((resolve, reject) => {
      super.createCollection(coll)
        .then(result => {
          if (params.rebuild) return this._rebuildSchema(coll.name)
          return true
        })
        .then(result => {
          let e = this.setClient({ collection: coll.name })
          if (e instanceof Error) return reject(e)
          resolve(result)
        })
        .catch(reject)
    })
  }

  renameCollection (oldName, newName, params) {
    params = params || {}
    return Promise.reject(new Error('Not implemented'))
  }

  removeCollection (name, params) {
    params = params || {}
    let drop = params.drop && this.collection[name]
    return new Promise((resolve, reject) => {
      super.removeCollection(name)
        .then(result => {
          if (!drop) return true
          return this._dropDb(name)
        })
        .then(result => {
          delete this.client[name]
          resolve(true)
        })
        .catch(reject)
    })
  }

  find (params) {
    [params] = this.sanitize(params)
    let limit = params.limit || this.options.limit
    let skip = ((params.page || 1) - 1) * limit
    let query = params.query || {}

    let sortKeys = this._.keys(params.sort) || []
    if (sortKeys.length > 0) {
      let qidx = {}
      this._.each(sortKeys, k => {
        qidx[k] = { $gte: null }
      })
      query = this._.merge(query, qidx)
    }

    return new Promise((resolve, reject) => {
      let e = this.setClient(params)
      if (e instanceof Error) return reject(e)
      let q = {
        selector: query,
        limit: limit,
        skip: skip,
        execution_stats: true
      }
      if (params.sort) {
        let sort = []
        this._.forOwn(params.sort, (v, k) => {
          let o = {}
          o[k] = v === -1 ? 'desc' : 'asc'
          sort.push(o)
        })
        q.sort = sort
      }
      this.client[params.collection].find(q)
        .then(result => {
          let data = { success: true, data: [] }
          result.docs.forEach((d, i) => {
            data.data.push(this.convert(d, { collection: params.collection }))
          })
          resolve(data)
        })
        .catch(reject)
    })
  }

  _findOne (id, params, callback) {
    let e = this.setClient(params)
    if (e instanceof Error) {
      return callback(null, {
        success: false,
        err: e
      })
    }
    this.client[params.collection].get(id, params.options || {}, (err, result) => {
      if (err) {
        return callback(null, {
          success: false,
          err: err.statusCode === 404 ? new Error('Document not found') : err
        })
      }
      callback(null, {
        success: true,
        data: result
      })
    })
  }

  findOne (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, (e, result) => {
        if (!result.success) return reject(result.err)
        let data = {
          success: true,
          data: this.convert(result.data, { collection: params.collection })
        }
        resolve(data)
      })
    })
  }

  _create (body, params, callback) {
    let e = this.setClient(params)
    if (e instanceof Error) {
      return callback(null, {
        success: false,
        err: e
      })
    }
    this.client[params.collection].insert(body, params.options || {}, (err, result) => {
      if (err) {
        return callback(null, {
          success: false,
          err: err
        })
      }
      this._findOne(result.id, params, callback)
    })
  }

  create (body, params) {
    [params, body] = this.sanitize(params, body)
    return new Promise((resolve, reject) => {
      if (body._id) {
        this._findOne(body._id, params, (e, result) => {
          if (result.success) return reject(new Error('Document already exists'))
          this._create(body, params, (e, result) => {
            if (!result.success) return reject(result.err)
            result.data = this.convert(result.data, { collection: params.collection })
            resolve(result)
          })
        })
      } else {
        this._create(body, params, (e, result) => {
          if (!result.success) return reject(result.err)
          result.data = this.convert(result.data, { collection: params.collection })
          resolve(result)
        })
      }
    })
  }

  update (id, body, params) {
    [params, body] = this.sanitize(params, body)
    body = this._.omit(body, ['_id'])
    return new Promise((resolve, reject) => {
      this._findOne(id, params, (e, result) => {
        if (!result.success) return reject(result.err)
        let source = result.data
        if (params.fullReplace) {
          body._id = id
          body._rev = result.data._rev
        } else {
          body = this._.merge(result.data, body)
        }
        this._create(body, params, (e, result) => {
          if (!result.success) return reject(result.err)
          result.data = this.convert(result.data, { collection: params.collection })
          if (params.withSource) result.source = this.convert(source, { collection: params.collection })
          resolve(result)
        })
      })
    })
  }

  remove (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      let e = this.setClient(params)
      if (e instanceof Error) return reject(e)
      this._findOne(id, params, (e, result) => {
        if (!result.success) return reject(result.err)
        let source = result.data
        let newBody = {
          _id: id,
          _rev: source._rev,
          _deleted: true
        }
        this._.each(this.options.retainOnRemove, r => {
          if (this._.has(source, r)) newBody[r] = source[r]
        })
        this.client[params.collection].insert(newBody, params.options || {}, (err, result) => {
          if (err) return reject(result.err)
          let data = {
            success: true
          }
          if (params.withSource) data.source = this.convert(source, { collection: params.collection })
          resolve(data)
        })
      })
    })
  }

  bulkCreate (body, params) {
    [params, body] = this.sanitize(params, body)
    return new Promise((resolve, reject) => {
      let e = this.setClient(params)
      if (e instanceof Error) return reject(e)
      if (!this._.isArray(body)) return reject(new Error('Requires an array'))
      this._.each(body, (b, i) => {
        if (!b._id) b._id = this.uuid()
        body[i] = this._.omit(b, ['_rev', '_deleted'])
      })
      const keys = this._(body).map('_id').value()
      this.client[params.collection].fetch({
        keys: keys
      }, (err, result) => {
        if (err) return reject(err)
        let info = result.rows
        this.client[params.collection].bulk({ docs: body }, (err, result) => {
          if (err) return reject(err)
          let ok = 0
          let status = []
          this._.each(result, (r, i) => {
            let stat = { success: Boolean(r.ok) }
            stat._id = r.id
            if (!stat.success) stat.message = info[i] && info[i].value ? 'Document already exists' : this._.upperFirst(r.name)
            else ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail) data.detail = status
          resolve(data)
        })
      })
    })
  }

  bulkUpdate (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      let e = this.setClient(params)
      if (e instanceof Error) return reject(e)
      if (!this._.isArray(body)) return reject(new Error('Requires an array'))
      this._.each(body, (b, i) => {
        if (!b._id) b._id = this.uuid() // will likely to introduce 'not-found'
        body[i] = this._.omit(b, ['_rev', '_deleted'])
      })
      const keys = this._(body).map('_id').value()
      this.client[params.collection].fetch({
        keys: keys
      }, (err, result) => {
        if (err) return reject(err)
        let info = result.rows
        // add rev for known doc
        this._.each(body, (b, i) => {
          if (info[i] && info[i].value) body[i]._rev = info[i].value.rev
          else body[i]._rev = '1-' + this.uuid() // will introduce purposed conflict
        })
        this.client[params.collection].bulk({ docs: body }, (err, result) => {
          if (err) return reject(err)
          let ok = 0
          let status = []
          this._.each(result, (r, i) => {
            let stat = { success: Boolean(r.ok) }
            stat._id = r.id
            if (!stat.success) stat.message = info[i] && info[i].error === 'not_found' ? 'Document not found' : this._.upperFirst(r.name)
            else ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail) data.detail = status
          resolve(data)
        })
      })
    })
  }

  bulkRemove (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      let e = this.setClient(params)
      if (e instanceof Error) return reject(e)
      if (!this._.isArray(body)) return reject(new Error('Requires an array'))
      this._.each(body, (b, i) => {
        body[i] = b || this.uuid()
      })
      this.client[params.collection].fetch({
        keys: body
      }, (err, result) => {
        if (err) return reject(err)
        let info = result.rows
        // add rev for known doc
        this._.each(body, (b, i) => {
          let newB = {
            _deleted: true,
            _id: b
          }
          if (info[i] && info[i].value) {
            newB._rev = info[i].value.rev
            newB = this._.merge(newB, this._.pick(info[i].value.doc, this.options.retainOnRemove))
          } else {
            newB._rev = '1-' + this.uuid() // will introduce purposed conflict
          }
          body[i] = newB
        })
        this.client[params.collection].bulk({ docs: body }, (err, result) => {
          if (err) return reject(err)
          let ok = 0
          let status = []
          this._.each(result, (r, i) => {
            let stat = { success: Boolean(r.ok) }
            stat._id = r.id
            if (!stat.success) stat.message = info[i] && info[i].error === 'not_found' ? 'Document not found' : this._.upperFirst(r.name)
            else ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail) data.detail = status
          resolve(data)
        })
      })
    })
  }
}

module.exports = DabCouch
