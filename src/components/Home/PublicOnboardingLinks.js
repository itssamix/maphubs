var React = require('react');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../../stores/LocaleStore');
var Locales = require('../../services/locales');

var PublicOnboardingLinks = React.createClass({

  mixins:[StateMixin.connect(LocaleStore)],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

render(){
  return (
    <div className="row no-margin">
        <div className="col s12 m3 l3 home-onboarding-icon-wrapper" style={{margin: 'auto'}}>
          <a href="/maps" style={{margin: 'auto'}}>
            <div className="valign-wrapper" style={{height: '125px', position: 'relative', margin: 'auto'}}>
              <i className="material-icons valign center-align" style={{fontSize: '80px', margin: 'auto'}}>map</i>
            </div>
            <h5 className="center-align">{this.__('Maps')}</h5>
          </a>
          <div className="flow-text center-align">Interactive maps you’ve made</div>
        </div>
        <div className="col s12 m3 l3 home-onboarding-icon-wrapper" style={{margin: 'auto'}}>
          <a href="/stories" style={{margin: 'auto'}}>
            <div className="valign-wrapper" style={{height: '125px', position: 'relative', margin: 'auto'}}>
                <i className="material-icons valign center-align" style={{fontSize: '80px', margin: 'auto'}}>library_books</i>
            </div>
            <h5 className="center-align">{this.__('Stories')}</h5>
          </a>
          <div className="flow-text center-align">Use your interactive maps with images and text to make stories or blog posts</div>
        </div>
        <div className="col s12 m3 l3 home-onboarding-icon-wrapper" style={{margin: 'auto'}}>
          <a href="/hubs" style={{margin: 'auto'}}>
            <div className="valign-wrapper" style={{height: '125px', position: 'relative', margin: 'auto'}}>
              <i className="material-icons valign center-align" style={{fontSize: '80px', margin: 'auto'}}>web</i>
            </div>
            <h5 className="center-align">{this.__('Hubs')}</h5>
          </a>
          <div className="flow-text center-align">Create mini project sites with your maps and stories</div>
        </div>
        <div className="col s12 m3 l3 home-onboarding-icon-wrapper" style={{margin: 'auto'}}>
          <a href="/search" style={{margin: 'auto'}}>
            <div className="valign-wrapper" style={{height: '125px', position: 'relative', margin: 'auto'}}>
              <i className="material-icons valign center-align" style={{fontSize: '80px', margin: 'auto'}}>search</i>
            </div>
            <h5 className="center-align">{this.__('Search')}</h5>
          </a>
          <div className="flow-text center-align">Search your content by keyword</div>
        </div>
      </div>
  );
}

});

module.exports = PublicOnboardingLinks;