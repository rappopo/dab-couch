# @rappopo/dab-couch

A [Rappopo DAB](https://github.com/rappopo/dab) implementation for CouchDB 2.0 and above.

## Installation

Simply invoke this command in your project folder:

```
$ npm install --save @rappopo/dab-couch
```

And within your script:

```javascript
const DabCouch = require('@rappopo/dab-couch')
const dab = new DabCouch({
  url: 'http://localhost:5984',
  dbName: 'mydb'
})
...
dab.findOne('my-doc').then(function(doc) { ... })
```

## Options

`url`: your CouchDB url endpoint. If it not provided, it defauts to: *http://localhost:5984*

`dbName`: the database name to connect to. Defaults to *test*

`retainOnRemove`: array of columns to retain when a document is deleted. Default: []. 

When CouchDB delete a document, it actually PUTs a document with content like this:

```javascript
{
  "_id": "<doc_id>",
  "_rev": "<rev_id>",
  "_deleted": true
}
```

But sometimes you want to also have some columns to be put on that deleted document. The `retainOnRemove` simply left those columns intact, e.g:

```javascript
{
  "_id": "<doc_id>",
  "_rev": "<rev_id>",   
  "_deleted": true,
  "type": "ADDRESS"
}
```

## Features

* [x] [find](https://docs.rappopo.com/dab/method/find/)
* [x] [findOne](https://docs.rappopo.com/dab/method/find-one/)
* [x] [create](https://docs.rappopo.com/dab/method/create/)
* [x] [update](https://docs.rappopo.com/dab/method/update/)
* [x] [remove](https://docs.rappopo.com/dab/method/remove/)
* [x] [bulkCreate](https://docs.rappopo.com/dab/method/bulk-create/)
* [x] [bulkUpdate](https://docs.rappopo.com/dab/method/bulk-update/)
* [x] [bulkRemove](https://docs.rappopo.com/dab/method/bulk-remove/)
* [x] [copyFrom](https://docs.rappopo.com/dab/method/copy-from/)
* [x] [copyTo](https://docs.rappopo.com/dab/method/copy-to/)

## Misc

* [ChangeLog](CHANGELOG.md)
* Donation: Bitcoin **16HVCkdaNMvw3YdBYGHbtt3K5bmpRmH74Y**

## License

(The MIT License)

Copyright © 2017 Ardhi Lukianto <ardhi@lukianto.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.