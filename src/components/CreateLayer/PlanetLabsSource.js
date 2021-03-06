// @flow
import React from 'react'
import Formsy from 'formsy-react'
import TextArea from '../forms/textArea'
import LayerActions from '../../actions/LayerActions'
import NotificationActions from '../../actions/NotificationActions'
import MessageActions from '../../actions/MessageActions'
import LayerStore from '../../stores/layer-store'
import MapHubsComponent from '../MapHubsComponent'

import type {LocaleStoreState} from '../../stores/LocaleStore'
import type {LayerStoreState} from '../../stores/layer-store'

type Props = {|
  onSubmit: Function
|}

type State = {
  canSubmit: boolean,
  selectedOption: string,
  selectedSceneOption: string
} & LocaleStoreState & LayerStoreState;

export default class PlanetLabsSource extends MapHubsComponent<Props, State> {
  props: Props

  state: State = {
    canSubmit: false,
    selectedOption: 'scene',
    selectedSceneOption: 'ortho'
  }

  constructor (props: Props) {
    super(props)
    this.stores.push(LayerStore)
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

  getAPIUrl = (selected: string) => {
    const selectedArr = selected.split(':')
    const selectedType = selectedArr[0].trim()
    const selectedScene = selectedArr[1].trim()

    // build planet labs API URL
    // v1 https://tiles.planet.com/data/v1/PSScene3Band/20161221_024131_0e19/14/12915/8124.png?api_key=your-api-key
    const url = `https://tiles.planet.com/data/v1/${selectedType}/${selectedScene}/{z}/{x}/{y}.png?api_key=${MAPHUBS_CONFIG.PLANET_LABS_API_KEY}`
    return url
  }

  submit = (model: Object) => {
    const _this = this
    const layers = []

    const selectedIDs = model.selectedIDs

    const selectedIDArr = selectedIDs.split(',')

    selectedIDArr.forEach(selected => {
      const url = _this.getAPIUrl(selected)
      layers.push({
        planet_labs_scene: selected,
        tiles: [url]
      })
    })

    LayerActions.saveDataSettings({
      is_external: true,
      external_layer_type: 'Planet',
      external_layer_config: {
        type: 'multiraster',
        layers
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

  optionChange = (value: string) => {
    this.setState({selectedOption: value})
  }

  sceneOptionChange = (value: string) => {
    this.setState({selectedSceneOption: value})
  }

  render () {
    return (
      <div className='row'>
        <Formsy onValidSubmit={this.submit} onValid={this.enableButton} onInvalid={this.disableButton}>
          <div>
            <p>{this.__('Paste the selected IDs from the Planet Explorer API box')}</p>
            <div className='row'>
              <TextArea name='selectedIDs' label={this.__('Planet Explorer Selected IDs')}
                length={2000}
                icon='info' className='col s12'required />
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
