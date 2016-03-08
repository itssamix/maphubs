var React = require('react');

var Header = require('../components/header');

var Formsy = require('formsy-react');
var TextInput = require('../components/forms/textInput');

var MessageActions = require('../actions/MessageActions');
var NotificationActions = require('../actions/NotificationActions');
var UserActions = require('../actions/UserActions');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');

var debug = require('../services/debug')('views/signup');
var $ = require('jquery');

var Signup = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
    locale: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
    };
  },

  getInitialState() {
    return {
      canSubmit: false
    };
  },

  componentWillMount() {
    var _this = this;
    Formsy.addValidationRule('isAvailable', function (values, value) {
      if(!this.usernameValue || value !== this.usernameValue){
        this.usernameValue = value;
        this.usernameAvailable = _this.checkUserNameAvailable(value);
      }
        return this.usernameAvailable;
    });

    Formsy.addValidationRule('validUserName', function (values, value) {
      var regexp = /^[A-Z0-9\u00C0-\u017F]+$/i;
      return !(value !== null && value !== undefined) || value === '' || regexp.test(value);
    });
  },

  checkUserNameAvailable(username){
      var _this = this;
      var result = false;
      if (username && typeof window !== 'undefined') {
          $.ajax({
           type: "POST",
           url: '/api/user/checkusernameavailable',
           contentType : 'application/json;charset=UTF-8',
           dataType: 'json',
           data: JSON.stringify({username}),
            async: false,
            success(msg){
              if(msg.success && msg.available){
                result = true;
              } else if(msg.sucess == false){
                _this.setState({
                  showError: true,
                  errorTitle: 'Error',
                  errorMessage: msg.error.toString()
                });
              }
            },
            error(msg){
              debug(msg.statusText +' - ' + msg.responseText);
              _this.setState({
                showError: true,
                errorTitle: 'Error',
                errorMessage: msg.statusText +' - ' + msg.responseText
              });
            },
            complete(){
            }
        });
      }

      return result;
  },

  onSave(model){
    var _this = this;
    UserActions.signup(model.username, model.email, model.password, function(err){
      if(err){
        MessageActions.showMessage({title: _this.__('Error'), message: err.error});
      }else {
        NotificationActions.showNotification(
          {
            message: _this.__('Account Created, confirmation email sent. Please check your email.'),
            position: 'bottomright',
            dismissAfter: 5000,
            onDismiss() {
              window.location = '/user/pendingconfirmation';
            }
        });
      }
    });
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

  render() {
    return (
      <div>
      <Header />
      <main>
      <div className="container">
        <h4 className="center" style={{margin: 'auto'}}>{this.__('Signup for MapHubs')}</h4>
        <Formsy.Form onValidSubmit={this.onSave} onValid={this.enableButton} onInvalid={this.disableButton}>
          <div className="row valign-wrapper" style={{paddingTop: '25px'}}>
            <TextInput name="username" label={this.__('User Name')} icon="perm_identity"
                className="col s12 m8 l8 valign" style={{margin: 'auto'}}
                disabled={this.state.created}
                validations={{validUserName:true, maxLength:25, minLength:4, isAvailable:true}} validationErrors={{
                   maxLength: this.__('Name must be 25 characters or less'),
                   minLength: this.__('Must be at least 4 characters'),
                   validUserName: this.__('Can only contain letters or numbers (no spaces or special characters)'),
                   isAvailable: this.__('Name already taken, please try another.')
               }} length={25}
               successText={this.__('Name is Available')}
               dataPosition="top" dataTooltip={this.__('Choose a unique user name for your account')}
             required/>
           </div>
           <div className="row valign-wrapper">
              <TextInput name="email" label={this.__('Email')} icon="email"
                className="col s12 m8 l8 valign" style={{margin: 'auto'}}
                validations={{isEmail:true}} validationErrors={{
                  isEmail: this.__('Not a valid email address.')
                }} length={50}
                dataPosition="top" dataTooltip={this.__('Please enter your email address')}
              required/>
          </div>
          <div className="row valign-wrapper">
             <TextInput name="password" label={this.__('Password')} icon="vpn_key"
                className="col s12 m8 l8 valign" style={{margin: 'auto'}}
                validations={{maxLength:25, minLength:8}} validationErrors={{
                 maxLength: this.__('Too Long. Please use no more than 25 characters.'),
                 minLength: this.__('Must be at least 8 characters')
                }} length={25}
               successText={this.__('Valid Password')}
               type="password"
             required/>
          </div>
          <div className="row valign-wrapper">
            <TextInput name="password_confirmation" label={this.__('Confirm Password')} icon="repeat"
                className="col s12 m8 l8 valign" style={{margin: 'auto'}}
                validations="equalsField:password" validationErrors={{
                  equalsField: this.__('Passwords do not match.')
                }} length={25}
               successText={this.__('Passwords Match')}
               type="password"
             required/>
          </div>
          <div className="row valign-wrapper">
            <div className="col s12 m8 l8 valign" style={{margin: 'auto'}}>
              <button type="submit"
                className="waves-effect waves-light btn valign center"
                style={{width: '75%', marginTop: '25px', marginLeft: 'auto', marginRight: 'auto'}}
                disabled={!this.state.canSubmit}>Signup</button>
            </div>
          </div>
        </Formsy.Form>
      </div>
      </main>
      </div>
    );
  }
});

module.exports = Signup;