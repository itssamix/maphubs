// @flow
const knex = require('../connection.js')
const dbgeo = require('dbgeo')
const Promise = require('bluebird')
const log = require('../services/log.js')
const _find = require('lodash.find')
const Presets = require('./presets')
const DataLoadUtils = require('../services/data-load-utils')
const Group = require('./group')
const Map = require('./map')
const debug = require('../services/debug')('model/layers')
const ScreenshotUtils = require('../services/screenshot-utils')
const geojsonUtils = require('../services/geojson-utils')
const PhotoAttachment = require('./photo-attachment')
const MapStyles = require('../components/Map/Styles')
const shortid = require('shortid')

module.exports = {

  /**
   * Can include private?: No
   */
  getAllLayers (includeMapInfo: boolean, trx: any) {
    let db = knex
    if (trx) { db = trx }
    if (includeMapInfo) {
      return db.select('layer_id', 'shortid', 'name', 'description', 'data_type',
        'remote', 'remote_host', 'remote_layer_id',
        'status', 'source', 'license', 'presets',
        'allow_public_submit',
        'is_external', 'external_layer_type', 'external_layer_config', 'disable_export',
        'owned_by_group_id', db.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views',
        'style', 'legend_html', 'labels', 'settings', 'extent_bbox', 'preview_position')
        .table('omh.layers').where({private: false, status: 'published'}).orderBy(db.raw(`name -> 'en'`))
    } else {
      return db.select('layer_id', 'shortid', 'name', 'description', 'data_type',
        'remote', 'remote_host', 'remote_layer_id',
        'status', 'source', 'license', 'presets',
        'is_external', 'external_layer_type', 'external_layer_config', 'disable_export', 'owned_by_group_id',
        db.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
        .table('omh.layers').where({private: false, status: 'published'}).orderBy(db.raw(`name -> 'en'`))
    }
  },

  /**
   * Can include private?: No
   */
  getRecentLayers (number: number = 15) {
    return knex.select('layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'source', 'license', 'presets',
      'allow_public_submit',
      'is_external', 'external_layer_type', 'external_layer_config',
      'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .table('omh.layers')
      .where({private: false, status: 'published'})
      .orderBy('last_updated', 'desc')
      .limit(number)
  },

  /**
   * Can include private?: No
   */
  getPopularLayers (number: number = 15) {
    return knex.select('layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'source', 'license', 'presets',
      'is_external', 'external_layer_type', 'external_layer_config',
      'allow_public_submit',
      'style', 'legend_html', 'labels', 'settings', 'extent_bbox', 'preview_position',
      'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .table('omh.layers')
      .where({private: false, status: 'published'})
      .whereNotNull('views')
      .orderBy('views', 'desc')
      .limit(number)
  },

  /**
   * Can include private?: No
   */
  getFeaturedLayers (number: number = 15) {
    return knex.select('layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'source', 'license', 'presets',
      'is_external', 'external_layer_type', 'external_layer_config',
      'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .table('omh.layers')
      .where({private: false, status: 'published', featured: true})
      .orderBy(knex.raw(`name -> 'en'`))
      .limit(number)
  },

  /**
   * Can include private?: If Requested
   */
  async getLayerInfo (layer_id: number) {
    const result = await knex('omh.layers')
      .select('layer_id', 'shortid', 'name', 'description', 'owned_by_group_id', 'presets')
      .where({layer_id})

    if (result && result.length === 1) {
      return result[0]
    }
    return null
  },

  /**
   * Can include private?: If Requested
   */
  async getLayerFeatureCount (layer_id: number) {
    const result = await knex(`layers.data_${layer_id}`).count('mhid')
    if (result && Array.isArray(result) && result.length === 1) {
      return result[0].count
    } else {
      return null
    }
  },

  /**
   * Can include private?: No
   */
  getSearchSuggestions (input: string) {
    input = input.toLowerCase()
    const query = knex.select('name', 'layer_id').table('omh.layers')
      .where(knex.raw(`
      private = false AND status = 'published'
      AND (
      to_tsvector('english', COALESCE((name -> 'en')::text, '')
      || ' ' || COALESCE((description -> 'en')::text, '')
      || ' ' || COALESCE((source -> 'en')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('spanish', COALESCE((name -> 'es')::text, '')
      || ' ' || COALESCE((description -> 'es')::text, '')
      || ' ' || COALESCE((source -> 'es')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('french', COALESCE((name -> 'fr')::text, '')
      || ' ' || COALESCE((description -> 'fr')::text, '')
      || ' ' || COALESCE((source -> 'fr')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('italian', COALESCE((name -> 'it')::text, '')
      || ' ' || COALESCE((description -> 'it')::text, '')
      || ' ' || COALESCE((source -> 'it')::text, '')) @@ plainto_tsquery(:input)
      )
      `, {input}))
      .orderByRaw(`name -> 'en'`)

    return query
  },

  /**
   * Can include private?: No
   */
  getSearchResults (input: string) {
    input = input.toLowerCase()
    const query = knex('omh.layers')
      .select('layer_id', 'shortid', 'name', 'description', 'data_type',
        'remote', 'remote_host', 'remote_layer_id',
        'status', 'source', 'license', 'presets', 'style', 'legend_html', 'labels', 'settings',
        'extent_bbox',
        'is_external', 'external_layer_type', 'external_layer_config', 'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .where(knex.raw(`
      private = false AND status = 'published'
      AND (
      to_tsvector('english',  COALESCE((name -> 'en')::text, '')
      || ' ' || COALESCE((description -> 'en')::text, '')
      || ' ' || COALESCE((source -> 'en')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('spanish',  COALESCE((name -> 'es')::text, '')
      || ' ' || COALESCE((description -> 'es')::text, '')
      || ' ' || COALESCE((source -> 'es')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('french',  COALESCE((name -> 'fr')::text, '')
      || ' ' || COALESCE((description -> 'fr')::text, '')
      || ' ' || COALESCE((source -> 'fr')::text, '')) @@ plainto_tsquery(:input)
      OR
      to_tsvector('italian',  COALESCE((name -> 'it')::text, '')
      || ' ' || COALESCE((description -> 'it')::text, '')
      || ' ' || COALESCE((source -> 'it')::text, '')) @@ plainto_tsquery(:input)
      )
      `, {input}))
      .orderByRaw(`name -> 'en'`)

    return query
  },

  /**
   * Can include private?: If Requested
   */
  getGroupLayers (group_id: string, includePrivate: boolean = false): Bluebird$Promise<Array<Object>> {
    const query: knex = knex.select('layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'private', 'source', 'license', 'presets',
      'allow_public_submit',
      'is_external', 'external_layer_type', 'external_layer_config', 'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .table('omh.layers').orderBy(knex.raw(`name -> 'en'`))

    if (includePrivate) {
      query.where({
        status: 'published',
        'owned_by_group_id': group_id
      })
    } else {
      query.where({
        'private': false,
        status: 'published',
        'owned_by_group_id': group_id
      })
    }

    return query
  },

  /**
   * Can include private?: If Requested
   */
  async getLayerForPhotoAttachment (photo_id: number, trx: any = null) {
    const _this = this
    let db = trx || knex
    if (trx) { db = trx }
    const results = await db('omh.feature_photo_attachments').select('layer_id').where({photo_id})

    if (results && results.length > 0 && results[0].layer_id) {
      const layer_id = results[0].layer_id
      return _this.getLayerByID(layer_id, trx)
    } else {
      throw new Error('Not a layer photo')
    }
  },

  /**
   * Can include private?: If Requested
   */
  getUserLayers (user_id: number, number: number, includePrivate: boolean = false): Bluebird$Promise<Array<Object>> {
    const subquery = knex.select().distinct('group_id').from('omh.group_memberships').where({user_id})

    const query = knex.select('layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'private', 'source', 'license', 'presets',
      'style', 'legend_html', 'labels', 'settings', 'extent_bbox', 'preview_position',
      'is_external', 'external_layer_type', 'external_layer_config',
      'allow_public_submit',
      'owned_by_group_id', knex.raw('timezone(\'UTC\', last_updated) as last_updated'), 'views')
      .table('omh.layers')
      .whereIn('owned_by_group_id', subquery)
      .where({status: 'published'})
      .orderBy('last_updated', 'desc')
      .limit(number)

    if (!includePrivate) {
      query.where({private: false, status: 'published'})
    }

    return query
  },

  /**
   * Can include private?: If Requested
   */
  async getLayerByID (layer_id: number, trx: any = null) {
    debug.log('getting layer: ' + layer_id)
    let db = knex
    if (trx) { db = trx }
    const result = await db.select(
      'layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'private', 'source', 'license', 'presets',
      'is_external', 'external_layer_type', 'external_layer_config', 'disable_export', 'is_empty',
      'allow_public_submit',
      'owned_by_group_id',
      knex.raw('timezone(\'UTC\', last_updated) as last_updated'),
      knex.raw('timezone(\'UTC\', creation_time) as creation_time'),
      'views',
      'style', 'labels', 'settings', 'legend_html', 'extent_bbox', 'preview_position', 'updated_by_user_id', 'created_by_user_id'
    ).table('omh.layers').where('layer_id', layer_id)
    if (result && result.length === 1) {
      return result[0]
    }
    // else
    return null
  },

  /**
   * Can include private?: If Requested
   */
  async getLayerByShortID (shortid: string, trx: any = null) {
    debug.log('getting layer shortid: ' + shortid)
    let db = knex
    if (trx) { db = trx }
    const result = await db.select(
      'layer_id', 'shortid', 'name', 'description', 'data_type',
      'remote', 'remote_host', 'remote_layer_id',
      'status', 'private', 'source', 'license', 'presets',
      'is_external', 'external_layer_type', 'external_layer_config', 'disable_export', 'is_empty',
      'allow_public_submit',
      'owned_by_group_id',
      knex.raw('timezone(\'UTC\', last_updated) as last_updated'),
      knex.raw('timezone(\'UTC\', creation_time) as creation_time'),
      'views',
      'style', 'labels', 'settings', 'legend_html', 'extent_bbox', 'preview_position', 'updated_by_user_id', 'created_by_user_id'
    ).table('omh.layers')
      .whereRaw('trim(shortid) = trim(?)', [shortid])
    if (result && result.length === 1) {
      return result[0]
    }
    // else
    return null
  },

  async isSharedInPublicMap (shortid: string) {
    const result = await knex.count('omh.layers.layer_id')
      .from('omh.layers')
      .leftJoin('omh.map_layers', 'omh.layers.layer_id', 'omh.map_layers.layer_id')
      .leftJoin('omh.maps', 'omh.map_layers.map_id', 'omh.maps.map_id')
      .whereNotNull('omh.maps.share_id')
      .where('omh.layers.shortid', shortid)
    if (result[0] && result[0].count && result[0].count > 0) {
      return true
    }
    return false
  },

  /**
     * Can include private?: If Requested
     */
  async getLayerNotes (layer_id: number) {
    const result = await knex('omh.layer_notes').select('notes').where({layer_id})
    if (result && result.length === 1) {
      return result[0]
    }
    return null
  },

  async getGeoJSON (layer_id: number) {
    const layerTable = 'layers.data_' + layer_id
    const data = await knex.raw('select mhid, ST_AsGeoJSON(wkb_geometry) as geom, tags from :layerTable:', {layerTable})
    const bbox = await knex.raw("select '[' || ST_XMin(bbox)::float || ',' || ST_YMin(bbox)::float || ',' || ST_XMax(bbox)::float || ',' || ST_YMax(bbox)::float || ']' as bbox from (select ST_Extent(wkb_geometry) as bbox from :layerTable:) a", {layerTable})

    return new Promise((resolve, reject) => {
      dbgeo.parse(data.rows, {
        'outputFormat': 'geojson',
        'geometryColumn': 'geom',
        'geometryType': 'geojson'
      }, (error, result) => {
        if (error) {
          log.error(error)
          reject(error)
        }
        // convert tags to properties
        if (result.features) {
          result.features = geojsonUtils.convertTagsToProps(result.features)
        }
        result.bbox = JSON.parse(bbox.rows[0].bbox)
        resolve(result)
      })
    })
  },

  // Layer Security

  async isPrivate (layer_id: number) {
    const result = await knex.select('private').from('omh.layers').where({layer_id})
    if (result && result.length === 1) {
      return result[0].private
    }
    return true // if we don't find the layer, assume it should be private
  },

  async attachPermissionsToLayers (layers: Array<Object>, user_id: number) {
    const _this = this
    return Promise.all(layers.map(async (layer) => {
      const allowed = await _this.allowedToModify(layer.layer_id, user_id)
      layer.canEdit = allowed
      return layer
    }))
  },

  /**
   * Can include private?: Yes
   */
  async allowedToModify (layer_id: number, user_id: number, trx: knex.transtion = null): Bluebird$Promise<boolean> | any {
    if (!layer_id || user_id <= 0) {
      return false
    }
    const layer = await this.getLayerByID(layer_id, trx)
    if (layer) {
      // if the layer has not yet been assigned to a group (still in progress in the wizard) then only the creating user can modify
      if (layer.status === 'incomplete' && layer.created_by_user_id === user_id) {
        return true
      }
      const users = await Group.getGroupMembers(layer.owned_by_group_id)
      if (_find(users, {id: user_id}) !== undefined) {
        return true
      }
      return false
    } else {
      return false
    }
  },

  // Layer creation/modification

  /**
   * Can include private?: Yes
   */
  async createLayer (user_id: number, trx:any) {
    let layer_id = await trx('omh.layers')
      .insert({
        status: 'incomplete',
        created_by_user_id: user_id,
        creation_time: knex.raw('now()'),
        updated_by_user_id: user_id,
        extent_bbox: '[-175,-85,175,85]', // make sure we always init a default for this
        last_updated: knex.raw('now()')
      }).returning('layer_id')
    layer_id = parseInt(layer_id)
    await trx('omh.layers').update({shortid: shortid.generate()}).where({layer_id})
    return layer_id
  },

  /**
     * Can include private?:Yes, however the remote layer must be public
     */
  // TODO: implement private remote layers
  createRemoteLayer (group_id: string, layer: any, host: string, user_id: number) {
    layer.remote = true
    layer.remote_host = host
    layer.remote_layer_id = layer.layer_id
    delete layer.layer_id
    layer.owned_by_group_id = group_id
    layer.created_by_user_id = user_id
    layer.updated_by_user_id = user_id
    layer.last_updated = knex.raw('now()')

    // stringify objects before inserting
    layer.presets = JSON.stringify(layer.presets)
    layer.style = JSON.stringify(layer.style)
    layer.external_layer_config = JSON.stringify(layer.external_layer_config)
    layer.labels = JSON.stringify(layer.labels)

    layer.extent_bbox = JSON.stringify(layer.extent_bbox)
    layer.preview_position = JSON.stringify(layer.preview_position)

    // convert older external layers to new format
    // TODO: include explict version # with remote layers for API compatibility checking
    if (typeof layer.name === 'string') {
      layer.name = {en: layer.name, fr: '', es: '', it: ''}
    }
    if (typeof layer.description === 'string') {
      layer.description = {en: layer.description, fr: '', es: '', it: ''}
    }
    if (typeof layer.source === 'string') {
      layer.source = {en: layer.source, fr: '', es: '', it: ''}
    }

    return knex('omh.layers').returning('layer_id')
      .insert(layer)
  },

  /**
     * Can include private?:Yes, however the remote layer must be public
     */
  updateRemoteLayer (layer_id: number, group_id: string, layer: Object, host: string, user_id: number) {
    layer.remote = true
    layer.remote_host = host
    layer.remote_layer_id = layer.layer_id
    delete layer.layer_id
    layer.owned_by_group_id = group_id
    layer.created_by_user_id = user_id
    layer.updated_by_user_id = user_id
    layer.last_updated = knex.raw('now()')

    // stringify objects before inserting
    layer.presets = JSON.stringify(layer.presets)
    layer.style = JSON.stringify(layer.style)
    layer.external_layer_config = JSON.stringify(layer.external_layer_config)
    layer.labels = JSON.stringify(layer.labels)

    layer.extent_bbox = JSON.stringify(layer.extent_bbox)
    layer.preview_position = JSON.stringify(layer.preview_position)

    if (typeof layer.name === 'string') {
      layer.name = {en: layer.name, fr: '', es: '', it: ''}
    }
    if (typeof layer.description === 'string') {
      layer.description = {en: layer.description, fr: '', es: '', it: ''}
    }
    if (typeof layer.source === 'string') {
      layer.source = {en: layer.source, fr: '', es: '', it: ''}
    }

    return knex('omh.layers').where({layer_id})
      .update(layer)
  },

  /*
    Used by delete
    */
  async removeLayerFromMaps (layer_id: number, trx: any) {
    // get maps that use this layer
    const db = trx || knex

    // get a list of maps that contain the layer
    const maps = await db.select('map_id').from('omh.map_layers').where({layer_id})

    // remove layers from maps
    await db('omh.map_layers').where({layer_id}).del()

    // rebuild map styles
    return Promise.map(maps, async (map) => {
      const map_id = map.map_id
      debug.log('removing layer: ' + layer_id + ' from map: ' + map_id)
      // get the remaining map layers
      const layers = await Map.getMapLayers(map_id, db)
      const style = MapStyles.style.buildMapStyle(layers)
      // also clear screenshot & thumbnail images so they will be recreated
      return db('omh.maps').where({map_id}).update({style, screenshot: null, thumbnail: null})
      // TODO: initial rebuild of thumbnail
    })
  },

  async setComplete (layer_id: number, trx: any) {
    const db = trx || knex
    return db('omh.layers').update({status: 'published'}).where({layer_id})
  },

  async transferLayerToGroup (layer_id: number, group_id: string, user_id: number) {
    return knex('omh.layers')
      .update({
        owned_by_group_id: group_id,
        updated_by_user_id: user_id,
        last_updated: knex.raw('now()')
      })
      .where({layer_id})
  },

  async delete (layer_id: number) {
    const _this = this
    return knex.transaction(async (trx) => {
      const layer = await _this.getLayerByID(layer_id, trx)
      if (!layer.remote && !layer.is_external) {
        await DataLoadUtils.removeLayerData(layer_id, trx)
      }
      await trx('omh.layer_views').where({layer_id}).del()
      await _this.removeLayerFromMaps(layer_id, trx)
      await trx('omh.layer_notes').where({layer_id}).del()
      await PhotoAttachment.removeAllLayerAttachments(layer_id, trx)
      await trx('omh.layers').where({layer_id}).del()

      // TODO: notify group owners that a layer has been removed
      // TODO: notify map owners that a layer has been removed
      return true
    })
  },

  async removePrivateLayerFromMaps (layer: Object, trx: any) {
    const db = trx || knex

    const layer_id = layer.layer_id
    const mapLayers = await db.select('map_id').from('omh.map_layers').where({layer_id})

    if (mapLayers && mapLayers.length > 0) {
      return Promise.map(mapLayers, async (mapLayer) => {
        const map = await Map.getMap(mapLayer.map_id, trx)
        if (!map.private || map.owned_by_group_id !== layer.owned_by_group_id) {
          // delete layer from this map
          await db('omh.map_layers').where({layer_id}).del()
          const layers = await Map.getMapLayers(map.map_id, trx)
          const style = MapStyles.style.buildMapStyle(layers)
          return db('omh.maps').where({map_id: map.map_id}).update({style, screenshot: null, thumbnail: null})
        }
      })
    }
  },

  async saveSettings (layer_id: number, name: string, description: string, group_id: string, isPrivate: boolean, source: any, license: any, user_id: number) {
    const _this = this
    return knex.transaction(async (trx) => {
      const layer = await _this.getLayerByID(layer_id, trx)
      // don't change privacy if request is missing the value
      if (isPrivate === undefined) {
        isPrivate = layer.private
      }
      let owned_by_group_id = layer.owned_by_group_id
      if (!owned_by_group_id) {
        // set for the first time
        owned_by_group_id = group_id
      } else if (group_id !== layer.owned_by_group_id) {
        log.warn('transfering layer ownership not implemented in this method: ' + layer_id)
      }

      const update = trx('omh.layers')
        .update({
          name,
          description,
          private: isPrivate,
          source,
          license,
          owned_by_group_id,
          updated_by_user_id: user_id,
          last_updated: knex.raw('now()')
        }).where({layer_id})

      if (!layer.private && isPrivate) {
        // public layer is switching to private
        log.info('Public layer switching to private: ' + layer_id)
        await _this.removePrivateLayerFromMaps(layer_id, trx)
      }
      return update
    })
  },

  async saveAdminSettings (layer_id: number, group_id: string, disable_export: boolean, allow_public_submit: boolean, user_id: number) {
    return knex.transaction(async (trx) => {
      const update = trx('omh.layers')
        .update({
          owned_by_group_id: group_id,
          disable_export,
          allow_public_submit,
          updated_by_user_id: user_id,
          last_updated: knex.raw('now()')
        }).where({layer_id})
      return update
    })
  },

  setUpdated (layer_id: number, user_id: number, trx: any = null) {
    let db = knex
    if (trx) { db = trx }
    return db('omh.layers')
      .update({
        updated_by_user_id: user_id,
        last_updated: db.raw('now()')
      }).where({layer_id})
  },

  saveDataSettings (layer_id: number, is_empty: boolean, empty_data_type: string, is_external: boolean, external_layer_type: string, external_layer_config: any, user_id: number) {
    if (is_external) {
      return knex('omh.layers').where({
        layer_id
      })
        .update({
          is_external,
          external_layer_type,
          external_layer_config: JSON.stringify(external_layer_config),
          updated_by_user_id: user_id,
          last_updated: knex.raw('now()')
        })
    } else {
      return knex('omh.layers').where({
        layer_id
      })
        .update({
          is_empty,
          data_type: empty_data_type,
          is_external,
          external_layer_type,
          external_layer_config: JSON.stringify(external_layer_config),
          updated_by_user_id: user_id,
          last_updated: knex.raw('now()')
        })
    }
  },

  async saveStyle (layer_id: number, style: any, labels: any, legend_html: any, settings: any, preview_position: any, user_id: number) {
    await knex('omh.layers').where({
      layer_id
    })
      .update({
        style: JSON.stringify(style),
        labels: JSON.stringify(labels),
        settings: JSON.stringify(settings),
        legend_html,
        preview_position,
        updated_by_user_id: user_id,
        last_updated: knex.raw('now()')
      })
    // update the thumbnail
    await ScreenshotUtils.reloadLayerThumbnail(layer_id)
    return ScreenshotUtils.reloadLayerImage(layer_id)
  },

  async savePresets (layer_id: number, presets: any, style: any, user_id: number, create: boolean, trx: any) {
    return Presets.savePresets(layer_id, presets, style, user_id, create, trx)
  },

  async saveLayerNote (layer_id: number, user_id: number, notes: string) {
    const result = await knex('omh.layer_notes').select('layer_id').where({layer_id})
    if (result && result.length === 1) {
      return knex('omh.layer_notes')
        .update({
          notes,
          updated_by: user_id,
          updated_at: knex.raw('now()')
        })
        .where({layer_id})
    } else {
      return knex('omh.layer_notes')
        .insert({
          layer_id,
          notes,
          created_by: user_id,
          created_at: knex.raw('now()'),
          updated_by: user_id,
          updated_at: knex.raw('now()')
        })
    }
  },

  async importLayer (layer: Object, group_id: string, user_id: number, trx: any) {
    delete layer.layer_id // get a new id from this instance

    layer.owned_by_group_id = group_id
    layer.created_by_user_id = user_id
    layer.updated_by_user_id = user_id
    layer.last_updated = knex.raw('now()')

    const style = layer.style

    layer.description = JSON.stringify(layer.description)
    layer.settings = JSON.stringify(layer.settings)
    layer.extent_bbox = JSON.stringify(layer.extent_bbox)
    layer.external_layer_config = JSON.stringify(layer.external_layer_config)
    layer.name = JSON.stringify(layer.name)
    layer.presets = JSON.stringify(layer.presets)
    layer.preview_position = JSON.stringify(layer.preview_position)
    layer.source = JSON.stringify(layer.source)
    layer.style = JSON.stringify(layer.style)

    // TODO: overwrite shortid so it doesn't conflict with remote layers if added to same map

    const result = await trx('omh.layers').insert(layer).returning('layer_id')
    let layer_id
    if (result && result.length > 0) {
      layer_id = result[0]
    } else {
      throw new Error('layer insert failed')
    }

    let styleUpdated = false
    style.layers.forEach((layer) => {
      if (layer.metadata && layer.metadata['maphubs:layer_id']) {
        layer.metadata['maphubs:layer_id'] = layer_id
        styleUpdated = true
      }
    })
    if (styleUpdated) {
      await trx('omh.layers').update({
        style: JSON.stringify(style)
      }).where({layer_id})
    }
    return layer_id
  }

}
