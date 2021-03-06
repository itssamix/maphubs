// @flow
const knex = require('../connection.js')
const debug = require('../services/debug')('model/image')
const ImageUtils = require('../services/image-utils')
const Promise = require('bluebird')

module.exports = {

  async getImageByID (image_id: number) {
    const result = await knex('omh.images').select('image_id', 'image').where({image_id})
    if (result && result.length === 1) {
      return result[0]
    }
    return null
  },

  async getThumbnailImageByID (image_id: number) {
    const result = await knex('omh.images').select('image_id', 'thumbnail').where({image_id})
    if (result && result.length === 1) {
      return result[0]
    }
    // else
    return null
  },

  /// //////////
  // Groups
  /// /////////

  async getGroupImage (group_id: string) {
    debug.log('get image for group: ' + group_id)
    const _this = this
    const result = await knex('omh.group_images').select('image_id')
      .whereRaw('lower(group_id) = ?', group_id.toLowerCase())
    if (result.length === 1) {
      const id = result[0].image_id
      debug.log('image found: ' + id)
      return _this.getImageByID(parseInt(id))
    } else {
      // throw new Error('No Image Found for Group: '+ group_id);
    }
    return null
  },

  async getGroupThumbnail (group_id: string) {
    debug.log('get image for group: ' + group_id)
    const result = await knex('omh.group_images').select('image_id')
      .whereRaw('lower(group_id) = ?', group_id.toLowerCase())
    if (result.length === 1) {
      const id = result[0].image_id
      debug.log('image found: ' + id)
      return this.getThumbnailImageByID(parseInt(id))
    } else {
      // throw new Error('No Image Found for Group: '+ group_id);
    }
    return null
  },

  async insertGroupImage (group_id: string, image: any, info: any, trx: any) {
    const thumbnail = await ImageUtils.resizeBase64(image, 40, 40)
    let image_id = await trx('omh.images').insert({image, thumbnail, info}).returning('image_id')
    image_id = parseInt(image_id)
    return trx('omh.group_images').insert({group_id, image_id})
  },

  async setGroupImage (group_id: string, image: any, info: any) {
    const _this = this
    return knex.transaction(async (trx) => {
      const result = await trx('omh.group_images').select('image_id')
        .whereRaw('lower(group_id) = ?', group_id.toLowerCase())

      if (result && result.length > 0) {
        // delete the existing group image
        await trx('omh.group_images').where({image_id: result[0].image_id}).del()
        await trx('omh.images').where({image_id: result[0].image_id}).del()
      }
      return _this.insertGroupImage(group_id, image, info, trx)
    })
  },

  /// //////////
  // Hubs
  /// /////////

  async getHubImage (hub_id: string, type: string = 'logo') {
    debug.log('get image for hub: ' + hub_id)
    const _this = this
    const result = await knex('omh.hub_images').select('image_id')
      .whereRaw('lower(hub_id) = ? AND type = ?', [hub_id.toLowerCase(), type])

    if (result.length === 1) {
      var id = result[0].image_id
      debug.log('image found: ' + id)
      return _this.getImageByID(parseInt(id))
    } else if (result.length > 1) {
      id = result[0].image_id
      debug.log('multiple images found!')
      return _this.getImageByID(parseInt(id))
    } else {
      throw new Error('No Image Found for Hub: ' + hub_id)
    }
  },

  async getHubThumbnail (hub_id: string, type: string = 'logo') {
    debug.log('get image for hub: ' + hub_id)

    const result = await knex('omh.hub_images').select('image_id')
      .whereRaw('lower(hub_id) = ? AND type = ?', [hub_id.toLowerCase(), type])

    if (result.length === 1) {
      const id = result[0].image_id
      debug.log('image found: ' + id)
      return this.getThumbnailImageByID(parseInt(id))
    } else {
      throw new Error('No Image Found for Hub: ' + hub_id)
    }
  },

  async insertHubImage (hub_id: string, image: any, info: any, type: string, trx: any) {
    let thumbnail
    if (type === 'logo') {
      thumbnail = await ImageUtils.resizeBase64(image, 72, 72) // for @2x story logos shown at 36x36
    } else if (type === 'banner') {
      thumbnail = await ImageUtils.resizeBase64(image, 400, 300, true)
    }
    let image_id = await trx('omh.images').insert({image, thumbnail, info}).returning('image_id')
    image_id = parseInt(image_id)
    return trx('omh.hub_images').insert({hub_id, image_id, type})
  },

  // delete prev image if there is one, then insert
  async setHubImage (hub_id: string, image: any, info: any, type: string) {
    const _this = this
    return knex.transaction(async (trx) => {
      const result = await trx('omh.hub_images').select('image_id')
        .whereRaw('lower(hub_id) = ? AND type = ?', [hub_id.toLowerCase(), type])

      if (result && result.length > 0) {
        // only one hub image per type, delete the existing one
        await trx('omh.hub_images').where({image_id: result[0].image_id}).del()
        await trx('omh.images').where({image_id: result[0].image_id}).del()
      }
      return _this.insertHubImage(hub_id, image, info, type, trx)
    })
  },

  /// //////////
  // Stories
  /// /////////

  async getStoryImage (story_id: number, image_id: number) {
    debug.log('get image for story: ' + story_id)
    const result = await knex('omh.story_images').select('image_id').where({story_id, image_id})
    if (result.length === 1) {
      debug.log('image found: ' + image_id)
      return this.getImageByID(image_id)
    } else {
      throw new Error('No Image Found for Story: ' + story_id)
    }
  },

  async getStoryThumbnail (story_id: number, image_id: number) {
    debug.log('get image for story: ' + story_id)
    const result = await knex('omh.story_images').select('image_id').where({story_id, image_id})
    if (result.length === 1) {
      debug.log('image found: ' + image_id)
      return this.getThumbnailImageByID(image_id)
    } else {
      throw new Error('No Image Found for Story: ' + story_id)
    }
  },

  async addStoryImage (story_id: number, image: any, info: any) {
    return knex.transaction(async (trx) => {
      const thumbnail = await ImageUtils.resizeBase64(image, 800, 240, true)
      let image_id = await trx('omh.images').insert({image, thumbnail, info}).returning('image_id')
      image_id = parseInt(image_id)
      await trx('omh.story_images').insert({story_id, image_id})
      return image_id
    })
  },

  async removeStoryImage (story_id: number, image_id: number) {
    return knex.transaction(async (trx) => {
      await trx('omh.story_images').where({story_id, image_id}).del()
      return trx('omh.images').where({image_id}).del()
    })
  },

  async removeAllStoryImages (story_id: number, trx: any) {
    const results = await trx('omh.story_images').select('image_id').where({story_id})
    return Promise.map(results, async (result) => {
      await trx('omh.story_images').where({story_id, image_id: result.image_id}).del()
      return trx('omh.images').where({image_id: result.image_id}).del()
    })
  }
}
