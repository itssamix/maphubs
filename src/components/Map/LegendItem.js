// @flow
import React from 'react'
import Marker from './Marker'
import MapHubsComponent from '../MapHubsComponent'
import _isequal from 'lodash.isequal'
import type {Layer} from '../../stores/layer-store'
import type {LocaleStoreState} from '../../stores/LocaleStore'

type Props = {
  layer: Layer,
  style: Object
}

type DefaultProps = {
  style: Object
}

type State = LocaleStoreState;

export default class LegendItem extends MapHubsComponent<Props, State> {
  props: Props

  static defaultProps: DefaultProps = {
    style: {padding: '2px', width: '100%', margin: 'auto', position: 'relative', minHeight: '25px', borderBottom: '1px solid #F1F1F1'}
  }

  shouldComponentUpdate (nextProps: Props, nextState: State) {
    // only update if something changes
    if (!_isequal(this.props, nextProps)) {
      return true
    }
    if (this.state.locale !== nextState.locale) {
      return true
    }
    return false
  }

  htmlEncode = (str: string) => {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  render () {
    const _this = this
    if (this.props.layer === undefined) return (<div />)

    if (!this.props.layer || !this.props.layer.layer_id) {
      return (
        <div />
      )
    }
    const name = this.htmlEncode(this._o_(this.props.layer.name))
    const source = this.htmlEncode(this._o_(this.props.layer.source))

    let html = ''
    if (this.props.layer.legend_html) {
      html = this.props.layer.legend_html.replace(/\{NAME\}/i, name)
    }

    let legendItem = (
      <div style={this.props.style}>
        <span className='no-margin no-padding valign' dangerouslySetInnerHTML={{__html: html}} />
        <span className='grey-text right right-align truncate no-padding' style={{margin: 0, fontSize: '6px', lineHeight: '6px', position: 'absolute', bottom: 0, right: 0}}>{source}</span>
      </div>
    )
    const style = this.props.layer.style
    if (style && style.layers && Array.isArray(style.layers) && style.layers.length > 0) {
      style.layers.forEach((layer) => {
        if (layer.id.startsWith('omh-data-point')) {
          if (layer.metadata && layer.metadata['maphubs:markers'] && layer.metadata['maphubs:markers'].enabled) {
            // clone object to avoid changing size of real markers
            const markerConfig = JSON.parse(JSON.stringify(layer.metadata['maphubs:markers']))
            markerConfig.width = 18
            markerConfig.height = 18
            legendItem = (
              <div className='omh-legend valign-wrapper' style={_this.props.style}>
                <div className='valign' style={{float: 'left'}}>
                  <Marker {...markerConfig} />
                </div>
                <h3 className='valign' style={{paddingLeft: '5px', paddingTop: '0px', paddingBottom: '5px'}}>{name}</h3>
                <span className='grey-text left left-align truncate no-padding' style={{margin: 0, fontSize: '6px', lineHeight: '6px', position: 'absolute', bottom: 0, right: 0}}>{source}</span>
              </div>

            )
          }
        }
      })
    }
    return legendItem
  }
}
