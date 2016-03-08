var React = require('react');

var Map = require('../components/Map/Map');
var Header = require('../components/header');
var slug = require('slug');
var styles = require('../components/Map/styles');
var $ = require('jquery');
var _map = require('lodash.map');
var ReactDisqusThread = require('react-disqus-thread');
var config = require('../clientconfig');
var urlUtil = require('../services/url-util');
var TerraformerGL = require('../services/terraformerGL.js');
var GroupTag = require('../components/Groups/GroupTag');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');

//var debug = require('../services/debug')('layerinfo');

var request = require('superagent');
var checkClientError = require('../services/client-error-response').checkClientError;

var LayerInfo = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
		layer: React.PropTypes.object.isRequired,
    stats: React.PropTypes.object,
    canEdit: React.PropTypes.bool,
    locale: React.PropTypes.string.isRequired
  },

  getDefaultProps(){
    return {
      stats: {maps: 0, stories: 0, hubs: 0},
      canEdit: false
    };
  },

  getInitialState(){
    return {
      geoJSON: null,
      dataMsg: '',
      gridHeight: 100,
      gridWidth: 100,
      gridHeightOffset: 48
    };
  },

  getGeoJSON(cb){
    var _this = this;
    var baseUrl = urlUtil.getBaseUrl(config.host, config.port);
    request.get(baseUrl + '/api/layer/' + this.props.layer.layer_id +'/export/json/data.geojson')
    .type('json').accept('json')
    .end(function(err, res){
      checkClientError(res, err, cb, function(cb){
        var geoJSON = res.body;
        request.get(baseUrl + '/api/layer/presets/' + _this.props.layer.layer_id)
        .type('json').accept('json')
        .end(function(err, res){
          checkClientError(res, err, cb, function(cb){
            var presets = res.body;
            _this.processGeoJSON(geoJSON, presets);
              cb();
          });
        });
        cb();
      });
    });
  },

  processGeoJSON(geoJSON, presets){
    var _this = this;
    var originalRows = _map(geoJSON.features, 'properties');

    var firstRow = originalRows[0];

    var rowKey = 'osm_id';
    if(firstRow.osm_id){
      rowKey = 'osm_id';
    }
    else if(firstRow.objectid){
      rowKey = 'objectid';

    } else if(firstRow.OBJECTID){
      rowKey = 'OBJECTID';
    }

    var columns = [];
    columns.push(
      {
        key: rowKey,
        name: 'MapHubs ID',
        width : 120,
        resizable: true,
        sortable : true,
        filterable: true
      }
    );

    Object.keys(presets.fields).forEach(function(fieldsKey){
      var field = presets.fields[fieldsKey];

      columns.push(
        {
          key: field.key,
          name: field.label,
          width : 120,
          resizable: true,
          sortable : true,
          filterable: true
        }
      );
    });

    var rows = originalRows.slice(0);

    _this.setState({geoJSON, originalRows, columns, rowKey, rows, filters : {}});
  },


  componentDidMount(){
    var _this = this;
    $('ul.tabs').tabs();
    $('.layer-info-tooltip').tooltip();

    if(this.props.layer.is_external){
      //retreive geoJSON data for layers
      if(this.props.layer.external_layer_config.type === 'ags'){
        TerraformerGL.getArcGISGeoJSON(this.props.layer.external_layer_config.url)
        .then(function(geoJSON){
          _this.processGeoJSON(geoJSON);
        });
          _this.setState({dataMsg: _this.__('Data Loading')});
      }else{
        _this.setState({dataMsg: _this.__('Data table not support for this layer.')});
      }

    }else{
      this.getGeoJSON(function(){});
      _this.setState({dataMsg: _this.__('Data Loading')});
    }
  },

  componentDidUpdate(){

    if(!this.state.userResize){
      window.dispatchEvent(new Event('resize'));
    }

  },

  onTabSelect(){
    var _this = this;

    var gridHeight = $(this.refs.dataTabContent).height() - _this.state.gridHeightOffset;
    this.setState({gridHeight});

   $(window).resize(function(){
      var gridHeight = $(_this.refs.dataTabContent).height() - _this.state.gridHeightOffset;
      _this.setState({gridHeight, userResize: true});
    });

  },

  onToggleFilter(){
    //var _this = this;
    //var gridHeight = $(this.refs.dataTabContent).height() - _this.state.gridHeightOffset - 45;
    //this.setState({gridHeight, userResize: false});
  },

  //Build iD edit link
  getEditLink(){
    //get map position
    var position = this.refs.map.getPosition();
    var zoom = Math.ceil(position.zoom);
    if(zoom < 10) zoom = 10;
    //http://localhost:4000/edit/?way=12440#background=Bing&layer_id=1&map=11.00/23.5005/1.0733
    //http://localhost:4000/edit/?way=12240#background=Bing&id=w12440&layer_id=1&map=11.00/23.5005/1.0733
    return '/edit#background=Bing&layer_id=' + this.props.layer.layer_id + '&map=' + zoom + '/' + position.lng + '/' + position.lat;
  },

  openEditor(){
    var editLink = this.getEditLink();
    window.location = editLink;
  },

  onRowSelect(rows){
    var _this = this;
    if(!rows || rows.length == 0){
      return;
    }
    var row = rows[0];
    var idField = this.state.rowKey;
    var idVal = row[idField];

    if(this.state.geoJSON){
      this.state.geoJSON.features.forEach(function(feature){
        if(idVal === feature.properties[idField]){
          var extent = require('turf-extent')(feature);
          _this.refs.map.fitBounds(extent, 16, 25);
          return;
        }
      });
    }
  },

  rowGetter(rowIdx){
    return this.state.rows[rowIdx];
  },

  handleGridSort(sortColumn, sortDirection){

    var comparer = function(a, b) {
      if(sortDirection === 'ASC'){
        return (a[sortColumn] > b[sortColumn]) ? 1 : -1;
      }else if(sortDirection === 'DESC'){
        return (a[sortColumn] < b[sortColumn]) ? 1 : -1;
      }
    };

    var rows;

    if (sortDirection === 'NONE') {
      var originalRows = this.state.originalRows;
      rows = this.filterRows(originalRows, this.state.filters);
    } else {
      rows = this.state.rows.sort(comparer);
    }

    this.setState({rows});
  },

  filterRows(originalRows, filters) {
    var rows = originalRows.filter(function(r){
      var include = true;
      for (var columnKey in filters) {
        if(filters.hasOwnProperty(columnKey)) {
          var rowValue = null;
          if(r[columnKey]){
            rowValue = r[columnKey].toString().toLowerCase();
            if(rowValue.indexOf(filters[columnKey].toLowerCase()) === -1) {
              include = false;
            }
          }
        }
      }
      return include;
    });
    return rows;
  },

  handleFilterChange(filter){
    this.setState(function(currentState) {
      if (filter.filterTerm) {
        currentState.filters[filter.columnKey] = filter.filterTerm;
      } else {
        delete currentState.filters[filter.columnKey];
      }
      currentState.rows = this.filterRows(currentState.originalRows, currentState.filters);
      return currentState;
    });
  },

	render() {
    var _this = this;
    var glStyle = this.props.layer.style ? this.props.layer.style : styles[this.props.layer.data_type];
    //var baseUrl = urlUtil.getBaseUrl(config.host, config.port);

    var dataTabContent = '';
    if(this.state.originalRows && typeof window !== 'undefined'){
      var ReactDataGrid = require('react-data-grid/addons');
      var Toolbar = require('../components/DataGrid/Toolbar');

       dataTabContent = (
         <ReactDataGrid
           ref="grid"
           columns={this.state.columns}
           rowKey={this.state.rowKey}
            rowGetter={this.rowGetter}
            rowsCount={this.state.rows.length}
            minHeight={this.state.gridHeight}
            onGridSort={this.handleGridSort}
            enableRowSelect="single"
            onRowSelect={this.onRowSelect}
            toolbar={<Toolbar enableFilter={true} filterButtonText={this.__('Filter Data')} onToggleFilterCallback={_this.onToggleFilter}/>}
            onAddFilter={this.handleFilterChange}
            />
       );

    }else {
      dataTabContent = (
        <div><h5>{this.state.dataMsg}</h5></div>
      );
    }

    var mapContent = '';
    var exportTabContent = '';

    if(this.props.layer.is_external){
      mapContent = (
        <Map ref="map" className="map-absolute map-with-header width-50" glStyle={glStyle} />
      );
      exportTabContent = (
        <div>
          <p>{this.__('This is an external data layer. For exports please see the data source at:')} {this.props.layer.source}</p>
        </div>
      );
    }else {
      mapContent = (
        <Map ref="map" className="map-absolute map-with-header width-50" glStyle={glStyle} />
      );
      var geoJSONURL = '/api/layer/' + this.props.layer.layer_id + '/export/json/' + slug(this.props.layer.name) + '.geojson';
      var shpURL = '/api/layer/' + this.props.layer.layer_id + '/export/shp/' + slug(this.props.layer.name) + '.zip';
      var kmlURL = '/api/layer/' + this.props.layer.layer_id + '/export/kml/' + slug(this.props.layer.name) + '.kml';
      var csvURL = '/api/layer/' + this.props.layer.layer_id + '/export/csv/' + slug(this.props.layer.name) + '.csv';

      var bounds = '';
      if(this.props.layer.extent_bbox){
        bounds = this.props.layer.extent_bbox.toString();
      }
      var osmURL = '/xml/map/'  + this.props.layer.layer_id + '?bbox=' + bounds;

      //http://dev.localhost:4000/xml/map/44?bbox=

      exportTabContent = (
        <div>
          <ul className="collection with-header">
           <li className="collection-header"><h5>{this.__('Export Data')}</h5></li>
           <li className="collection-item">{this.__('Shapefile:')} <a href={shpURL}>{shpURL}</a></li>
           <li className="collection-item">{this.__('GeoJSON:')} <a href={geoJSONURL}>{geoJSONURL}</a></li>
           <li className="collection-item">{this.__('KML:')} <a href={kmlURL}>{kmlURL}</a></li>
           <li className="collection-item">{this.__('CSV:')} <a href={csvURL}>{csvURL}</a></li>
          </ul>
         <ul className="collection with-header">
          <li className="collection-header"><h5>{this.__('Services')}</h5></li>
          <li className="collection-item">{this.__('Feature Service (ArcGIS compatible):')} Coming Soon</li>
          <li className="collection-item">{this.__('API (OpenStreetMap compatible):')} <a href={osmURL}>{osmURL}/</a></li>
         </ul>
        </div>
      );
    }

    var tabContentDisplay = 'none';
    if (typeof window !== 'undefined') {
      tabContentDisplay = 'inherit';
    }

    var editButton = '';

    if(this.props.canEdit){
      editButton = (
        <div className="fixed-action-btn action-button-bottom-right">
          <a className="btn-floating btn-large red">
            <i className="large material-icons">more_vert</i>
          </a>
          <ul>
            <li>
              <a className="btn-floating layer-info-tooltip red" data-delay="50" data-position="left" data-tooltip={this.__('View Full Screen Map')}
                  href={'/layer/map/' + this.props.layer.layer_id + '/' + slug(this.props.layer.name)}>
                <i className="material-icons">map</i>
              </a>
            </li>
            <li>
              <a onClick={this.openEditor} className="btn-floating layer-info-tooltip blue darken-1" data-delay="50" data-position="left" data-tooltip={this.__('Edit Map')}>
                <i className="material-icons">mode_edit</i>
              </a>
            </li>
            <li>
              <a className="btn-floating layer-info-tooltip yellow" href={'/layer/admin/' + this.props.layer.layer_id + '/' + slug(this.props.layer.name)}data-delay="50" data-position="left" data-tooltip={this.__('Manage Layer')}>
                <i className="material-icons">settings</i>
              </a>
            </li>
          </ul>
        </div>
      );
    }else {
      editButton = (
        <div className="fixed-action-btn action-button-bottom-right">
          <a className="btn-floating btn-large layer-info-tooltip red" data-delay="50" data-position="left" data-tooltip={this.__('View Full Screen Map')}
              href={'/layer/map/' + this.props.layer.layer_id + '/' + slug(this.props.layer.name)}>
            <i className="material-icons">map</i>
          </a>
        </div>
      );
    }

		return (
      <div>
        <Header />
        <main style={{height: 'calc(100% - 50px)', marginTop: 0}}>
        <div className="row" style={{height: '100%', margin: 0}}>
          <div className="col s12 m6 l6 no-padding" style={{height: '100%'}}>
            <div style={{margin: '10px'}}>
              <h5>{this.props.layer.name}</h5>

            </div>


            <div className="row no-margin" style={{height: 'calc(100% - 50px)'}}>
              <ul className="tabs">
                <li className="tab col s4"><a className="active" href="#info">{this.__('Info')}</a></li>
                <li className="tab col s4"><a href="#discuss">{this.__('Discuss')}</a></li>
                <li className="tab col s4"><a href="#data" onClick={this.onTabSelect}>{this.__('Data')}</a></li>
                <li className="tab col s4"><a href="#export">{this.__('Export')}</a></li>


              </ul>
              <div id="info" className="col s12" style={{marginLeft:'10px', marginRight: '10px', display: tabContentDisplay}}>
                <p style={{fontSize: '16px'}}><b>Description:</b> {this.props.layer.description}</p>
                <p style={{fontSize: '16px'}}><b>Last Update:</b> {this.props.layer.last_updated.toString()}</p>
                <GroupTag group={this.props.layer.owned_by_group_id} size={25} fontSize={12} />
                <p style={{fontSize: '16px'}}><b>Data Source:</b> {this.props.layer.source}</p>
                <p style={{fontSize: '16px'}}><b>License:</b> {this.props.layer.license}</p>
                <p style={{fontSize: '16px'}}><b>Stats:</b></p>
                <p>Layer viewed {this.props.layer.views} times</p>
                <p>Layer used in {this.props.stats.maps} maps, {this.props.stats.stories} stories, and {this.props.stats.hubs} hubs</p>
              </div>
              <div id="discuss" className="col s12" style={{display: tabContentDisplay}}>
                <ReactDisqusThread
                      shortname="openmaphub"
                      identifier={'maphubs-layer-' + this.props.layer.layer_id}
                      title={this.props.layer.name}
                      />
              </div>
              <div id="data" ref="dataTabContent" className="col s12 no-padding" style={{height: 'calc(100% - 47px)', display: tabContentDisplay}}>
                <div className="row no-margin">
                  {dataTabContent}
                </div>


              </div>
              <div id="export" className="col s12" style={{display: tabContentDisplay}}>
                {exportTabContent}
              </div>
            </div>

          </div>
            <div className="col hide-on-small-only m6 l6 no-padding">
              {mapContent}
            </div>
          </div>
          {editButton}
        </main>
			</div>
		);
	}
});

module.exports = LayerInfo;