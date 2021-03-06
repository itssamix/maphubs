// @flow
import React from 'react'
import Formsy, {addValidationRule} from 'formsy-react'
import TextInput from '../forms/textInput'
import LayerActions from '../../actions/LayerActions'
import NotificationActions from '../../actions/NotificationActions'
import MessageActions from '../../actions/MessageActions'
import LayerStore from '../../stores/layer-store'
import MapHubsComponent from '../MapHubsComponent'

import type {LocaleStoreState} from '../../stores/LocaleStore'
import type {LayerStoreState} from '../../stores/layer-store'

type Props = {
  onSubmit: Function
}

type State = {
  canSubmit: boolean,
  selectedSource?: string
} & LocaleStoreState & LayerStoreState;

export default class RasterTileSource extends MapHubsComponent<Props, State> {
  props: Props

  state: State = {
    canSubmit: false
  }

  constructor (props: Props) {
    super(props)
    this.stores.push(LayerStore)
  }

  componentWillMount () {
    super.componentWillMount()
    addValidationRule('isHttps', (values, value) => {
      if (value) {
        return value.startsWith('https://')
      } else {
        return false
      }
    })
  }

  enableButton = () => {
    this.setState({
      canSubmit: true
    })
  }

  disableButton = () => {
    this.setState({
      canSubmit: false
    })
  }

  submit = (model: Object) => {
    const _this = this
    let boundsArr
    if (model.bounds) {
      boundsArr = model.bounds.split(',')
      boundsArr = boundsArr.map((item) => {
        return item.trim()
      })
    }

    LayerActions.saveDataSettings({
      is_external: true,
      external_layer_type: 'Raster Tile Service',
      external_layer_config: {
        type: 'raster',
        minzoom: model.minzoom,
        maxzoom: model.maxzoom,
        bounds: boundsArr,
        tiles: [model.rasterTileUrl]
      }
    }, _this.state._csrf, (err) => {
      if (err) {
        MessageActions.showMessage({title: _this.__('Error'), message: err})
      } else {
        NotificationActions.showNotification({
          message: _this.__('Layer Saved'),
          dismissAfter: 1000,
          onDismiss () {
            // reset style to load correct source
            LayerActions.resetStyle()
            // tell the map that the data is initialized
            LayerActions.tileServiceInitialized()
            _this.props.onSubmit()
          }
        })
      }
    })
  }

  sourceChange = (value: string) => {
    this.setState({selectedSource: value})
  }

  render () {
    return (
      <div className='row'>
        <Formsy onValidSubmit={this.submit} onValid={this.enableButton} onInvalid={this.disableButton}>
          <div>
            <p>Raster Tile Source</p>
            <div className='row'>
              <TextInput
                name='rasterTileUrl' label={this.__('Raster Tile URL')} icon='info' className='col s12' validations='maxLength:500,isHttps' validationErrors={{
                  maxLength: this.__('Must be 500 characters or less.'),
                  isHttps: this.__('SSL required for external links, URLs must start with https://')
                }} length={500}
                dataPosition='top' dataTooltip={this.__('Raster URL for example:') + 'http://myserver/tiles/{z}/{x}/{y}.png'}
                required />
            </div>
            <div className='row'>
              <TextInput name='minzoom' label={this.__('MinZoom (Optional)')} icon='info' className='col s12'
                dataPosition='top' dataTooltip={this.__('Lowest tile zoom level available in data')}
              />
            </div>
            <div className='row'>
              <TextInput name='maxzoom' label={this.__('MaxZoom (Optional)')} icon='info' className='col s12'
                dataPosition='top' dataTooltip={this.__('Highest tile zoom level available in data')}
              />
            </div>
            <div className='row'>
              <TextInput name='bounds' label={this.__('Bounds (Optional)')} icon='info' className='col s12'
                dataPosition='top' dataTooltip={this.__('Comma delimited WGS84 coordinates for extent of the data: minx, miny, maxx, maxy')}
              />
            </div>
          </div>
          <div className='right'>
            <button type='submit' className='waves-effect waves-light btn' disabled={!this.state.canSubmit}><i className='material-icons right'>arrow_forward</i>{this.__('Save and Continue')}</button>
          </div>
        </Formsy>
      </div>
    )
  }
}
