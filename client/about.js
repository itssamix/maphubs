const React  = require('react');
const ReactDOM = require('react-dom');

const About = require('../views/about');

require('jquery');
require("materialize-css");
require("materialize-css/dist/css/materialize.min.css");
require('../css/app.css');

document.addEventListener('DOMContentLoaded', () => {
  let data = window.__appData;

  ReactDOM.render(
    <About locale={data.locale}/>,
    document.querySelector('#app')
  );

});