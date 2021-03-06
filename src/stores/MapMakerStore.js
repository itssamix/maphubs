// @flow
import Reflux from 'reflux'
import Actions from '../actions/MapMakerActions'
const request = require('superagent')
const debug = require('../services/debug')('stores/MapMakerStore')
const _findIndex = require('lodash.findindex')
const _reject = require('lodash.reject')
const _find = require('lodash.find')
const MapStyles = require('../components/Map/Styles')
// var $ = require('jquery');
// var urlUtil = require('../services/url-util');
const checkClientError = require('../services/client-error-response').checkClientError
import type {Layer} from './layer-store'

export type MapMakerStoreState = {
   map_id?: number,
  title?: LocalizedString,
  mapLayers?: Array<Layer>,
  mapStyle?: Object,
  position?: Object,
  settings?: Object,
  isPrivate?: boolean,
  owned_by_group_id?: string,
  basemap?: string,
  editingLayer?: boolean
}

export default class MapMakerStore extends Reflux.Store {
  state: MapMakerStoreState

  constructor () {
    super()
    this.state = this.getDefaultState()
    this.listenables = Actions
  }

  getDefaultState (): MapMakerStoreState {
    return {
      map_id: -1,
      mapLayers: [],
      settings: {},
      mapStyle: {},
      position: {},
      isPrivate: false,
      basemap: 'default',
      editingLayer: false
    }
  }

  reset () {
    this.setState(this.getDefaultState())
    if (this.state.mapLayers) {
      this.updateMap(this.state.mapLayers)
    }
  }

  storeDidUpdate () {
    debug.log('store updated')
  }

  // listeners

  setMapLayers (mapLayers: Array<Layer>, update: boolean = true) {
    if (update) {
      this.updateMap(mapLayers)
    } else {
      // treat as immutable and clone
      mapLayers = JSON.parse(JSON.stringify(mapLayers))
      this.setState({mapLayers})
    }
  }

  setMapId (map_id: number) {
    this.setState({map_id})
  }

  setMapTitle (title: LocalizedString) {
    Object.keys(title).forEach(key => {
      title[key] = title[key].trim()
    })
    this.setState({title})
  }

  setPrivate (isPrivate: boolean) {
    this.setState({isPrivate})
  }

  setOwnedByGroupId (group_id: string) {
    this.setState({owned_by_group_id: group_id})
  }

  setMapPosition (position: Object) {
    // treat as immutable and clone
    position = JSON.parse(JSON.stringify(position))
    this.setState({position})
  }

  setMapBasemap (basemap: string) {
    this.setState({basemap})
  }

  setSettings (settings: Object) {
    // treat as immutable and clone
    settings = JSON.parse(JSON.stringify(settings))
    this.setState({settings})
  }

  addToMap (layer: Layer, cb: Function) {
    // check if the map already has this layer
    if (_find(this.state.mapLayers, {layer_id: layer.layer_id})) {
      cb(true)
    } else {
      // tell the map to make this layer visible
      layer.style = MapStyles.settings.set(layer.style, 'active', true)

      const layers = this.state.mapLayers
      if (layers) {
        layers.unshift(layer)
        this.updateMap(layers)
      }
      cb()
    }
  }

  removeFromMap (layer: Layer) {
    const layers = _reject(this.state.mapLayers, {'layer_id': layer.layer_id})
    this.updateMap(layers)
  }

  toggleVisibility (layer_id: number, cb: Function) {
    const mapLayers = this.state.mapLayers
    const index = _findIndex(mapLayers, {layer_id})
    if (mapLayers) {
      const layer = mapLayers[index]
      let active = MapStyles.settings.get(layer.style, 'active')

      if (active) {
        layer.style = MapStyles.settings.set(layer.style, 'active', false)
        active = false
      } else {
        layer.style = MapStyles.settings.set(layer.style, 'active', true)
        active = true
      }

      if (layer && layer.style && layer.style.layers) {
        layer.style.layers.forEach((styleLayer) => {
          if (!styleLayer.layout) {
            styleLayer.layout = {}
          }
          if (active) {
            styleLayer.layout.visibility = 'visible'
          } else {
            styleLayer.layout.visibility = 'none'
          }
        })
      }

      this.updateMap(mapLayers)
    }
    cb()
  }

  updateLayerStyle (layer_id: number, style: Object, labels: Object, legend: string, cb: Function) {
    // treat as immutable and clone
    style = JSON.parse(JSON.stringify(style))
    labels = JSON.parse(JSON.stringify(labels))
    const layers = JSON.parse(JSON.stringify(this.state.mapLayers))
    const index = _findIndex(this.state.mapLayers, {layer_id})
    if (layers) {
      layers[index].style = style
      layers[index].labels = labels
      layers[index].legend_html = legend
      this.updateMap(layers)
      cb(layers[index])
    }
  }

  saveMap (title: LocalizedString, position: Object, basemap: string, _csrf: string, cb: Function) {
    // treat as immutable and clone
    title = JSON.parse(JSON.stringify(title))
    position = JSON.parse(JSON.stringify(position))
    const _this = this
    // resave an existing map
    Object.keys(title).forEach(key => {
      title[key] = title[key].trim()
    })
    request.post('/api/map/save')
      .type('json').accept('json')
      .send({
        map_id: this.state.map_id,
        layers: this.state.mapLayers,
        style: this.state.mapStyle,
        settings: this.state.settings,
        title,
        position,
        basemap,
        _csrf
      })
      .end((err, res) => {
        checkClientError(res, err, cb, (cb) => {
          _this.setState({title, position, basemap})
          cb()
        })
      })
  }

  createMap (title: LocalizedString, position: Object, basemap: string, group_id: string, isPrivate: boolean, _csrf: string, cb: Function) {
    // treat as immutable and clone
    title = JSON.parse(JSON.stringify(title))
    position = JSON.parse(JSON.stringify(position))
    const _this = this
    Object.keys(title).forEach(key => {
      title[key] = title[key].trim()
    })
    request.post('/api/map/create')
      .type('json').accept('json')
      .send({
        layers: this.state.mapLayers,
        style: this.state.mapStyle,
        settings: this.state.settings,
        title,
        group_id,
        position,
        basemap,
        private: isPrivate,
        _csrf
      })
      .end((err, res) => {
        checkClientError(res, err, cb, (cb) => {
          const map_id = res.body.map_id
          _this.setState({title, map_id, position, basemap, owned_by_group_id: group_id, isPrivate})
          cb()
        })
      })
  }
  // not used?
  /*
  savePrivate(isPrivate: boolean, _csrf: string, cb: Function){
    var _this = this;
    request.post('/api/map/privacy')
    .type('json').accept('json')
    .send({
        map_id: this.state.map_id,
        private: isPrivate,
        _csrf
    })
    .end((err, res) => {
      checkClientError(res, err, cb, (cb) => {
        _this.setState({isPrivate});
        cb();
      });
    });
  }
  */

  setPublic (map_id: number, isPublic: boolean, _csrf: string, cb: Function) {
    request.post('/api/map/public')
      .type('json').accept('json')
      .send({
        map_id,
        isPublic,
        _csrf
      })
      .end((err, res) => {
        checkClientError(res, err, cb, (cb) => {
          const share_id = res.body.share_id
          cb(share_id)
        })
      })
  }

  // helpers
  updateMap (mapLayers: Array<Layer>, rebuild: boolean = true) {
    // treat as immutable and clone
    mapLayers = JSON.parse(JSON.stringify(mapLayers))
    let mapStyle
    if (rebuild) {
      mapStyle = this.buildMapStyle(mapLayers)
    } else {
      mapStyle = this.state.mapStyle
    }
    this.setState({mapLayers, mapStyle})
  }

  buildMapStyle (layers: Array<Layer>) {
    return MapStyles.style.buildMapStyle(layers)
  }

  startEditing () {
    this.setState({editingLayer: true})
  }

  stopEditing () {
    this.setState({editingLayer: false})
  }

  deleteMap (map_id: number, _csrf: string, cb: Function) {
    request.post('/api/map/delete')
      .type('json').accept('json')
      .send({map_id, _csrf})
      .end((err, res) => {
        checkClientError(res, err, cb, (cb) => {
          cb()
        })
      })
  }
}
