var React = require('react');
var Formsy = require('formsy-react');
var slug = require('slug');
var request = require('superagent');
var $ = require('jquery');

var Header = require('../components/header');
var TextInput = require('../components/forms/textInput');
var Select = require('../components/forms/select');
var Map = require('../components/Map/Map');
var MiniLegend = require('../components/Map/MiniLegend');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');
var checkClientError = require('../services/client-error-response').checkClientError;

var CreateRemoteLayer = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale', '_csrf']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
		groups: React.PropTypes.array,
    locale: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      groups: []
    };
  },

  getInitialState() {
    return {
      canSubmit: false,
      layer: null,
      remote_host: null,
      group_id: null,
      complete: false
    };
  },

  componentWillMount(){
    Formsy.addValidationRule('isHttps', function (values, value) {
        return value.startsWith('https://');
    });

    Formsy.addValidationRule('validMapHubsLayerPath', function (values, value) {
      if(typeof window !== 'undefined'){
        var pathParts = $('<a>').prop('href', value).prop('pathname').split('/');
        if(pathParts[1] == 'layer'
        && (pathParts[2] == 'info' || pathParts[2] == 'map')
        && pathParts[3]){
          return true;
        }
      }
        return false;
    });
  },

  componentDidMount(){
    var _this = this;
    window.onbeforeunload = function(){
      if(_this.state.layer && !_this.state.complete){
        return _this.__('You have not finished creating your layer.');
      }
    };
  },

  enableButton () {
      this.setState({
        canSubmit: true
      });
    },
  disableButton () {
    this.setState({
      canSubmit: false
    });
  },

  loadRemoteUrl(model){
    var _this = this;
    var remoteLayerUrl = model.remoteLayerUrl;
    var group_id = model.group_id;

    var link = $('<a>').prop('href', remoteLayerUrl);

    var remote_host = link.prop('hostname');
    var pathParts = link.prop('pathname').split('/');
    if(pathParts[1] == 'layer'
    && (pathParts[2] == 'info' || pathParts[2] == 'map')
    && pathParts[3]){
      var remote_layer_id = pathParts[3];

      request.get('https://' + remote_host + '/api/layer/metadata/' + remote_layer_id)
      .type('json').accept('json').timeout(1200000)
      .end(function(err, res){
        checkClientError(res, err, function(){}, function(cb){
          _this.setState({remote_host, group_id, layer: res.body.layer});
          cb();
        });
      });
    }
  },

  saveLayer(){
    var _this = this;
    request.post('/api/layer/create/remote')
    .type('json').accept('json')
    .send({
      group_id: this.state.group_id,
      layer: this.state.layer,
      host: this.state.remote_host
    })
    .end(function(err, res){
      checkClientError(res, err, function(){}, function(cb){
        var layer_id = res.body.layer_id;
        _this.setState({complete: true});
        window.location = '/layer/info/' + layer_id + '/' + slug(_this.state.layer.name);
        cb();
      });
    });
  },

	render() {

    if(!this.props.groups || this.props.groups.length == 0){
      return (
        <div>
            <Header />
          <main>
        <div className="container">
          <div className="row">
            <h5>{this.__('Please Join a Group')}</h5>
            <p>{this.__('Please create or join a group before creating a layer.')}</p>
          </div>
        </div>
        </main>
        </div>
      );
    }

    var layerReview = '';

    if(this.state.layer){
      layerReview = (
        <div className="row">
          <div className="col s12">
            <div>
              <Map ref="map" style={{width: '100%', height: '400px'}}
                showFeatureInfoEditButtons={false}
                glStyle={this.state.layer.style}
                fitBounds={this.state.layer.preview_position.bbox}>
                <MiniLegend
                  style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    minWidth: '275px',
                    zIndex: '1',
                    width: '25%',
                    maxWidth: '325px',
                    maxHeight: 'calc(100% - 200px)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  collapsible={true} hideInactive={false} showLayersButton={false}
                  title={this.state.layer.name}
                    layers={[this.state.layer]}/>
                </Map>
            </div>
          </div>
          <div>
            <button className="btn right" style={{marginTop: '20px'}}
              onClick={this.saveLayer}>{this.__('Save Layer')}</button>
          </div>
        </div>
      );
    }
    var groups = '';
    if(this.props.groups.length > 1){
    var groupOptions = [];

    this.props.groups.map(function(group){
      groupOptions.push({
        value: group.group_id,
        label: group.name
      });
    });

    groups = (
      <div>
        <p>{this.__('Since you are in multiple groups, please select the group that should own this layer.')}</p>
        <Select name="group_id" id="layer-settings-select" label={this.__('Group')} startEmpty={true}
          emptyText={this.__('Choose a Group')} options={groupOptions} className="col s6"
            dataPosition="right" dataTooltip={this.__('Owned by Group')}
            required
            />
      </div>
      );

    }else{
      groups = (
        <div>
          <b>{this.__('Group:')} </b>{this.props.groups[0].name}
        </div>
      );
    }

		return (
      <div>
          <Header />
        <main>
          <h4>{this.__('Link to a Remote Layer')}</h4>
          <div className="container center">
            <p>{this.__('Please copy and paste a link to a remote MapHubs layer')}</p>
            <div className="row">
              <Formsy.Form onValidSubmit={this.loadRemoteUrl} onValid={this.enableButton} onInvalid={this.disableButton}>
              <TextInput name="remoteLayerUrl" label={this.__('Remote MapHubs URL')} icon="link" className="col s12" validations="maxLength:250,isHttps,validMapHubsLayerPath" validationErrors={{
                     maxLength: this.__('Must be 250 characters or less.'),
                     isHttps:  this.__('MapHubs requires encryption for external links, URLs must start with https://'),
                     validMapHubsLayerPath: this.__('Not a valid MapHubs Layer URL')
                 }} length={250}
                 dataPosition="top" dataTooltip={this.__('MapHubs Layer URL ex: https://maphubs.com/layer/info/123/my-layer')}
                 required/>
               {groups}
                 <div className="right">
                   <button type="submit" className="waves-effect waves-light btn" disabled={!this.state.canSubmit}><i className="material-icons right">arrow_forward</i>{this.__('Load Remote Layer')}</button>
                 </div>
               </Formsy.Form>
            </div>
            {layerReview}

          </div>

			</main>

      </div>
		);
	}
});

module.exports = CreateRemoteLayer;
