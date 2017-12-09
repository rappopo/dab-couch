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

  bulkCreate (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))
      this._.each(body, (b, i) => {
        if (!b[this.options.idSrc])
          b[this.options.idSrc] = this.uuid()
        body[i] = this._.omit(b, ['_rev', '_deleted'])
      })
      const keys = this._(body).map(this.options.idSrc).value()


      this.client.fetch({
        keys: keys
      }, (err, result) => {
        if (err)
          return reject(err)
        let info = result.rows
        this.client.bulk({ docs: body }, (err, result) => {
          if (err)
            return reject(err)
          let ok = 0, status = []
          this._.each(result, (r, i) => {
            let stat = { success: r.ok ? true : false }
            stat[this.options.idDest] = r.id
            if (!stat.success)
              stat.message = info[i] && info[i].value ? 'Exists' : this._.upperFirst(r.name)
            else
              ok++
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
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })    
      })
    })
  }

  bulkUpdate (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))
      this._.each(body, (b, i) => {
        if (!b[this.options.idSrc])
          b[this.options.idSrc] = this.uuid() // will likely to introduce 'not-found'
        body[i] = this._.omit(b, ['_rev', '_deleted'])
      })
      const keys = this._(body).map(this.options.idSrc).value()
      this.client.fetch({
        keys: keys
      }, (err, result) => {
        if (err)
          return reject(err)
        let info = result.rows
        // add rev for known doc
        this._.each(body, (b, i) => {
          if (info[i] && info[i].value) 
            body[i]._rev = info[i].value.rev
          else
            body[i]._rev = '1-' + this.uuid() // will introduce purposed conflict
        })
        this.client.bulk({ docs: body }, (err, result) => {
          if (err)
            return reject(err)
          let ok = 0, status = []
          this._.each(result, (r, i) => {
            let stat = { success: r.ok ? true : false }
            stat[this.options.idDest] = r.id
            if (!stat.success)
              stat.message = info[i] && info[i].error === 'not_found' ? 'Not found' : this._.upperFirst(r.name)
            else
              ok++
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
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })    
      })
    })
  }

  bulkRemove (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))
      this._.each(body, (b, i) => {
        body[i] = b || this.uuid()
      })
      this.client.fetch({
        keys: body
      }, {
        include_docs: true
      }, (err, result) => {
        if (err)
          return reject(err)
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
        this.client.bulk({ docs: body }, (err, result) => {
          if (err)
            return reject(err)
          let ok = 0, status = []
          this._.each(result, (r, i) => {
            let stat = { success: r.ok ? true : false }
            stat[this.options.idDest] = r.id
            if (!stat.success)
              stat.message = info[i] && info[i].error === 'not_found' ? 'Not found' : this._.upperFirst(r.name)
            else
              ok++
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
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })    
      })
    })
  }


}

module.exports = DabCouch