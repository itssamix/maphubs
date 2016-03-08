var React = require('react');

var Header = require('../components/header');
var MessageActions = require('../actions/MessageActions');
var NotificationActions = require('../actions/NotificationActions');
var UserActions = require('../actions/UserActions');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');

var PendingConfirmation = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
    user: React.PropTypes.string.isRequired,
    locale: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      canSubmit: false
    };
  },

  onResend(){
    UserActions.resendConfirmation(function(err){
      if(err){
          MessageActions.showMessage({title: 'Error', message: err.error});
      }else {
        NotificationActions.showNotification(
          {
            message: this.__('Confirmation email sent. Please check your email.'),
            position: 'bottomright'
        });
      }
    });
  },

  render() {
    if(this.props.user.email_valid){
      return (
        <div>
          <Header />
          <main className="container">
            <div className="row valign-wrapper">
              <div className="col s12 m8 l8 valign" style={{margin: 'auto'}}>
                <h4 className="center">{this.__('Confirmed')}</h4>
                <p>{this.__('Your account is confirmed')}</p>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div>
        <Header />
        <main className="container">
          <div className="row valign-wrapper">
            <div className="col s12 m8 l8 valign" style={{margin: 'auto'}}>
              <h4 className="center">{this.__('Please Confirm Your Email Address')}</h4>
              <p>{this.__('We sent you an email at')} {this.props.user.email}</p>
              <p>{this.__('Please click the link in the email to confirm your account')}</p>
              <button
                onClick={this.onResend}
                className="waves-effect waves-light btn valign center"
                style={{marginTop: '25px', marginLeft: 'auto', marginRight: 'auto'}}>
                {this.__('Resend Email')}
              </button>
            </div>
          </div>
      </main>
      </div>
    );
  }
});

module.exports = PendingConfirmation;