'use strict'

const Store = require('electron-store')

class DataStore extends Store {

  constructor (settings) {
    super(settings)
    this.name=settings.name;
    // initialize with items or empty array
    this.items = this.get(this.name) || []
  }

  getall(){
    return this.items
  }
  clear(){
    this.set(this.name,[])
  }
  saveitems () {
    // save items to JSON file
    this.set(this.name, this.items)

    // returning 'this' allows method chaining
    return this
  }

  getitems (key) {
    // set object's items to items in JSON file
    return this.items.find(t => t.hash == key)
  }

  additem (item) {
    // merge the existing items with the new item
    this.items.push(item)

    return this.saveitems()
  }

  deleteitem (item) {
    // filter out the target item
    this.items = this.items.filter(t => t !== item)

    return this.saveitems()
  }
}

module.exports = DataStore
