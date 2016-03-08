var React = require('react');

var Header = require('../components/header');
var Password = require('../components/forms/Password');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');

var PasswordReset = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
    passreset: React.PropTypes.string.isRequired,
    locale: React.PropTypes.string.isRequired
  },

  onSave(){
    window.location = '/login';
  },

  render() {
    return (
      <div>
        <Header />
        <main className="container">
          <div className="row valign-wrapper">
            <div className="col s12 m8 l8 valign" style={{margin: 'auto'}}>
              <h4 className="center">{this.__('Please Enter a New Password')}</h4>
              <Password passreset={this.props.passreset} onSave={this.onSave}/>
            </div>
          </div>
      </main>
      </div>
    );
  }
});

module.exports = PasswordReset;