// @flow
import React from 'react'
import MapHubsPureComponent from '../../MapHubsPureComponent'
import Formsy from 'formsy-react'
import Toggle from '../../forms/toggle'

type Props = {|
  enableMeasurementTools: boolean,
  closePanel: Function,
  toggleMeasurementTools: Function
|}

export default class MeasurementToolPanel extends MapHubsPureComponent<Props, void> {
  props: Props

  toggleMeasurementTools = (model: {enableMeasurementTools: boolean}) => {
    if (model.enableMeasurementTools) this.props.closePanel()
    this.props.toggleMeasurementTools(model.enableMeasurementTools)
  }

  render () {
    return (
      <Formsy onChange={this.toggleMeasurementTools}>
        <b>{this.__('Show Measurement Tools')}</b>
        <Toggle name='enableMeasurementTools'
          labelOff={this.__('Off')} labelOn={this.__('On')}
          className='col s12'
          checked={this.props.enableMeasurementTools}
        />
      </Formsy>
    )
  }
}
