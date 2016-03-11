var React = require('react');

var Header = require('../components/header');
var Footer = require('../components/footer');

var Reflux = require('reflux');
var StateMixin = require('reflux-state-mixin')(Reflux);
var LocaleStore = require('../stores/LocaleStore');
var Locales = require('../services/locales');

var About = React.createClass({

  mixins:[StateMixin.connect(LocaleStore, {initWithProps: ['locale']})],

  __(text){
    return Locales.getLocaleString(this.state.locale, text);
  },

  propTypes: {
    locale: React.PropTypes.string.isRequired
  },

  render() {
      return (
        <div>
          <Header />
          <main className="container">
            <div className="row">
              <h4>{this.__('About')}</h4>
            </div>
            <div className="row">
                <div style={{margin: 'auto', display: 'block'}}>
                  <script async src="https://static.medium.com/embed.js"></script><a className="m-story" data-collapsed="true" data-width="100%" href="https://medium.com/@maphubs/why-we-are-building-maphubs-336f6c12a746">{this.__('Why we are building MapHubs')}</a>
                </div>
            </div>
            <div className="row">
                <div style={{margin: 'auto', display: 'block'}}>
                  <script async src="https://static.medium.com/embed.js"></script><a className="m-story" data-collapsed="true" data-width="100%" href="https://medium.com/@maphubs/maphubs-features-271396947d6e">{this.__('MapHubs Features')}</a>
                </div>
            </div>
          </main>
          <Footer />
        </div>
      );


  }
});

module.exports = About;