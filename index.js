'use strict'

const nano = require('nano'),
  Dab = require('@rappopo/dab')

class DabCouch extends Dab {
  constructor (options) {
    super(options)
  }

  setOptions (options) {
    super.setOptions(this._.merge(this.options, {
      idSrc: '_id',
      idDest: options.idDest || options.idSrc || '_id',
      url: options.url || 'http://localhost:5984',
      dbName: options.dbName || 'test',
      retainOnRemove: options.retainOnRemove || [],
    }))
  }

  setClient (params) {
    if (!this.client) {
      this.nano = nano(this.options.url)
      this.client = this.nano.use(this.options.dbName)
    }
  }

  find (params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    let limit = params.limit || this.options.limit,
      skip = ((params.page || 1) - 1) * limit,
      sort = params.sort,
      query = params.query || {}
    return new Promise((resolve, reject) => {
      this.nano.request({
        db: this.options.dbName,
        method: 'POST',
        path: '_find',
        body: {
          selector: params.query || {},
          limit: limit,
          skip: skip,
          sort: sort
        }
      }, (err, result) => {
        if (err) {
          if (err.error === 'bad_request' && err.reason === 'Referer header required.')
            err = new Error('Unsupported')
          return reject(err)
        }
        let data = { success: true, data: [] }
        result.docs.forEach((d, i) => {
          data.data.push(this.convertDoc(this._.merge(d, { _id: d._id })))
        })
        resolve(data)
      })
    })
  }

  _findOne (id, params, callback) {
    this.client.get(id, params.options || {}, (err, result) => {
      if (err) {
        if (err.statusCode === 404)
          err = new Error('Not found')
        return callback({
          success: false,
          err: err
        })
      }
      callback({
        success: true,
        data: result
      })
    })
  }

  findOne (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params.options || {}, result => {
        if (!result.success)
          return reject(result.err)
        let data = {
          success: true,
          data: this.convertDoc(result.data)
        }
        resolve(data)
      })
    })
  }

  _create (body, params, callback) {
    this.client.insert(body, params.options || {}, (err, result) => {
      if (err)
        return callback({
          success: false,
          err: err
        })
      this._findOne(result.id, params, callback)
    })
  }

  create (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      let id
      [body, id] = this.delFakeGetReal(body)
      if (id) {
        this._findOne(id, params, result => {
          if (result.success) 
            return reject(new Error('Exists'))
          this._create(body, params, result => {
            if (!result.success)
              return reject(result.err)
            result.data = this.convertDoc(result.data)
            resolve(result)
          })
        })
      } else {
        this._create(body, params, result => {
          if (!result.success)
            return reject(result.err)
          result.data = this.convertDoc(result.data)
          resolve(result)
        })        
      }
    })
  }

  update (id, body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    body = this._.omit(body, [this.options.idDest || this.options.idSrc])
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let source = result.data
        if (params.fullReplace) {
          body[this.options.idSrc] = id
          body._rev = result.data._rev
        } else {
          body = this._.merge(result.data, body)
        }
        this._create(body, params, result => {
          if (!result.success)
            return reject(result.err)
          result.data = this.convertDoc(result.data)
          if (params.withSource)
            result.source = this.convertDoc(source)
          resolve(result)
        })
      })
    })
  }

  remove (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let source = result.data,
          newBody = {
            _id: id,
            _rev: source._rev,
            _deleted: true
          }
        this._.each(this.options.retainOnRemove, r => {
          if (_.has(source, r))
            newBody[r] = source[r]
        })
        this.client.insert(newBody, params.options || {}, (err, result) => {
          if (err)
            return callback(result.err)
          let data = {
            success: true
          }
          if (params.withSource)
            data.source = this.convertDoc(source)
          resolve(data)
        })
      })
    })
  }

}

module.exports = DabCouch