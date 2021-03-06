// @flow
import React from 'react'
import {withFormsy} from 'formsy-react'
import classNames from 'classnames'
import MapHubsPureComponent from '../MapHubsPureComponent'

type Props = {
  className: string,
  dataTooltip: string,
  dataDelay: number,
  dataPosition: string,
  defaultValue: string,
  label: string,
  name: string,
  onChange: Function,
  options: Array<{value: string, label: string}>,
  setValue: Function,
  getValue: Function
}

class Radio extends MapHubsPureComponent<Props, void> {
  props: Props

  static defaultProps = {
    options: {},
    defaultValue: null,
    dataDelay: 100
  }

  componentWillMount () {
    super.componentWillMount()
    this.props.setValue(this.props.defaultValue)
  }

  changeValue = (event) => {
    this.props.setValue(event.target.id)
    this.setState({value: event.target.id})
    if (this.props.onChange) {
      this.props.onChange(event.target.id)
    }
  }

  render () {
    const className = classNames(this.props.className, {tooltipped: !!this.props.dataTooltip})
    const value = this.props.getValue()
    const name = this.props.name
    const _this = this

    return (
      <div className={className} data-delay={this.props.dataDelay} data-position={this.props.dataPosition}
        data-tooltip={this.props.dataTooltip}>

        <label>{this.props.label}</label>
        {this.props.options.map((option) => {
          let checked = false
          if (option.value === value) {
            checked = true
          }
          return (<p key={option.value}>
            <input name={name} type='radio' id={option.value} onChange={_this.changeValue} checked={checked} />
            <label htmlFor={option.value}>{option.label}</label>
          </p>)
        })}
      </div>
    )
  }
}
export default withFormsy(Radio)
