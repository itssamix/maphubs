// @flow
import React from 'react'
import _map from 'lodash.map'
import MapHubsComponent from '../MapHubsComponent'
import EditAttributesModal from './EditAttributesModal'
import CheckboxFormatter from './CheckboxFormatter'
import _assignIn from 'lodash.assignin'
import type {MapHubsField} from '../../types/maphubs-field'
import GetNameField from '../../services/get-name-field'

type Props = {
  geoJSON: Object,
  presets: Object,
  gridHeight: number,
  onRowSelected: Function,
  layer_id: number,
  dataLoadingMsg: string,
  canEdit: boolean,
  onSave?: Function,
  presets: Array<MapHubsField>
}

type DefaultProps = {
  dataLoadingMsg: string
}

type Column = {
  key: string,
  name: string,
  width : number,
  resizable: boolean,
  sortable : boolean,
  filterable: boolean
}

type State = {
  geoJSON: ?Object,
  gridHeight: number,
  gridWidth: number,
  gridHeightOffset: number,
  rows: Array<Object>,
  selectedIndexes: Array<number>,
  columns: Array<Column>,
  filters: Object,
  rowKey: ?string,
  sortColumn: ?string,
  sortDirection: ?string,
  selectedFeature?: Object
}

export default class LayerDataGrid extends MapHubsComponent<Props, State> {
  Selectors: null

  props: Props

  static defaultProps: DefaultProps = {
    dataLoadingMsg: 'Data Loading'
  }

  state: State = {
    geoJSON: null,
    gridHeight: 100,
    gridWidth: 100,
    gridHeightOffset: 48,
    rows: [],
    selectedIndexes: [],
    columns: [],
    filters: {},
    rowKey: null,
    sortColumn: null,
    sortDirection: null
  }

  componentDidMount () {
    if (this.props.geoJSON) {
      this.processGeoJSON(this.props.geoJSON, this.props.presets)
    }
  }

  componentWillReceiveProps (nextProps: Props) {
    if (nextProps.geoJSON && !this.state.geoJSON) {
      this.processGeoJSON(nextProps.geoJSON, nextProps.presets)
    }
    if (nextProps.gridHeight && nextProps.gridHeight !== this.state.gridHeight) {
      this.setState({gridHeight: nextProps.gridHeight})
    }
  }

  processGeoJSON = (geoJSON: Object, presets:any = null) => {
    const _this = this
    // clone feature to avoid data grid attaching other values
    const features = JSON.parse(JSON.stringify(geoJSON.features))

    const originalRows = _map(features, 'properties')

    const firstRow = originalRows[0]

    let rowKey = 'mhid'
    if (!firstRow || firstRow.mhid) {
      rowKey = 'mhid'
    } else if (firstRow.objectid) {
      rowKey = 'objectid'
    } else if (firstRow.OBJECTID) {
      rowKey = 'OBJECTID'
    }

    const columns: Array<Column> = []
    columns.push(
      {
        key: rowKey,
        name: 'ID',
        width: 120,
        resizable: true,
        sortable: true,
        filterable: true
      }
    )
    if (presets) {
      presets.forEach((preset) => {
        if (preset.type === 'check') {
          columns.push(
            {
              key: preset.tag,
              name: _this._o_(preset.label),
              width: 120,
              formatter: CheckboxFormatter,
              resizable: true,
              sortable: true,
              filterable: true
            })
        } else {
          columns.push(
            {
              key: preset.tag,
              name: _this._o_(preset.label),
              width: 120,
              resizable: true,
              sortable: true,
              filterable: true
            }
          )
        }
      })
    } else {
      Object.keys(firstRow).forEach((key) => {
        columns.push(
          {
            key,
            name: key,
            width: 120,
            resizable: true,
            sortable: true,
            filterable: true
          }
        )
      })
    }

    const rows = originalRows.slice(0)

    _this.setState({geoJSON, columns, rowKey, rows, filters: {}})
  }

  handleGridSort = (sortColumn: string, sortDirection: string) => {
    this.setState({sortColumn, sortDirection})
  }

  getRows = (): Array<Object> => {
    if (this.Selectors) {
      return this.Selectors.getRows(this.state)
    } else {
      return []
    }
  }

  getSize = (): number => {
    return this.getRows().length
  }

  rowGetter = (rowIdx: number): Object => {
    const rows = this.getRows()
    return rows[rowIdx]
  }

  handleFilterChange = (filter: Object) => {
    const newFilters = Object.assign({}, this.state.filters)
    if (filter.filterTerm) {
      newFilters[filter.column.key] = filter
    } else {
      delete newFilters[filter.column.key]
    }
    this.setState({filters: newFilters})
  }

  onClearFilters = () => {
    // all filters removed
    this.setState({filters: {}})
  }

  onRowsSelected = (rows: Array<Object>) => {
    if (!rows || rows.length === 0) {
      return
    }
    const row = rows[0]
    const idField = this.state.rowKey
    const idVal = row.row[idField]

    this.props.onRowSelected(idVal, idField)
    this.setState({selectedIndexes: this.state.selectedIndexes.concat(rows.map(r => r.rowIdx))})
  }

  onRowsDeselected = (rows: Array<Object>) => {
    const rowIndexes = rows.map(r => r.rowIdx)
    this.setState({selectedIndexes: this.state.selectedIndexes.filter(i => rowIndexes.indexOf(i) === -1)})
  }

  onEditSelectedFeature = () => {
    this.setState({selectedFeature: this.getSelectedFeature()})
    this.refs.editAttributeModal.show()
  }

  onSaveEdits = (data: Object) => {
    // find row with this MHID and update it
    const idField = this.state.rowKey
    this.getRows().forEach((row) => {
      if (row[idField] === data[idField]) {
        _assignIn(row, data)
      }
    })

    if (this.props.onSave) {
      this.props.onSave(data)
    }
  }

  getSelectedFeature () {
    const row = this.rowGetter(this.state.selectedIndexes[this.state.selectedIndexes.length - 1])
    const idField = this.state.rowKey
    const idVal = row[idField]
    let selectedFeature
    if (this.state.geoJSON) {
      this.state.geoJSON.features.forEach((feature) => {
        if (feature.properties[idField] &&
        feature.properties[idField] === idVal) {
          selectedFeature = feature
        }
      })
    }
    return selectedFeature
  }

  onViewSelectedFeature = () => {
    if (!this.state.selectedIndexes || this.state.selectedIndexes.length === 0) {
      return
    }
    const row = this.state.rows[this.state.selectedIndexes[this.state.selectedIndexes.length - 1]]
    const idField = this.state.rowKey
    let idVal = row[idField]

    let featureName = 'unknown'
    const nameField = GetNameField.getNameField(row, this.props.presets)
    if (nameField) {
      featureName = row[nameField]
    }
    if (this.state.rowKey === 'mhid') {
      idVal = idVal.split(':')[1]
    }
    const url = '/feature/' + this.props.layer_id.toString() + '/' + idVal + '/' + featureName
    window.location = url
  }

  render () {
    const _this = this

    if (this.state.rows.length > 0 && typeof window !== 'undefined') {
      // temporaryHackForReactDataGrid.js: import this file before react-data-grid

      const PropTypes = require('prop-types')
      // next line is only required until ron-react-autocomplete is rebuilt and republished
      PropTypes.component = PropTypes.element
      require('react').PropTypes = PropTypes
      require('react').createClass = require('create-react-class')
      const ReactDataGrid = require('react-data-grid')
      const {Toolbar, Data: {Selectors}} = require('react-data-grid-addons')
      this.Selectors = Selectors

      let editButton = ''
      let editModal
      if (this.props.canEdit) {
        editButton = (
          <button type='button' style={{marginLeft: '5px'}} className='btn' onClick={this.onEditSelectedFeature}>
            {this.__('Edit Selected')}
          </button>
        )

        if (this.props.presets) {
          editModal = (
            <EditAttributesModal
              ref='editAttributeModal'
              feature={this.state.selectedFeature}
              presets={this.props.presets}
              onSave={this.onSaveEdits}
              layer_id={this.props.layer_id} />
          )
        }
      }

      return (
        <ReactDataGrid
          ref='grid'
          columns={this.state.columns}
          rowKey={this.state.rowKey}
          rowGetter={this.rowGetter}
          rowsCount={this.getSize()}
          minHeight={this.state.gridHeight}
          onGridSort={this.handleGridSort}
          rowSelection={{
            showCheckbox: true,
            enableShiftSelect: false,
            onRowsSelected: this.onRowsSelected,
            onRowsDeselected: this.onRowsDeselected,
            selectBy: {
              indexes: this.state.selectedIndexes
            }
          }}
          toolbar={<Toolbar
            enableFilter
            filterRowsButtonText={this.__('Filter Data')}
          >
            {editButton}
            <button type='button' style={{marginLeft: '5px'}} className='btn' onClick={_this.onViewSelectedFeature}>
              {this.__('View Selected')}
            </button>
            {editModal}
          </Toolbar>
          }
          onAddFilter={this.handleFilterChange}
          onClearFilters={this.onClearFilters}
        />
      )
    } else {
      return (
        <div><h5>{this.__(this.props.dataLoadingMsg)}</h5></div>
      )
    }
  }
}
