const React  = require('react');
const ReactDOM = require('react-dom');

const Maps = require('../views/maps');

require('jquery');
require("materialize-css");
require("materialize-css/dist/css/materialize.min.css");
require('../css/app.css');
require('../node_modules/slick-carousel/slick/slick.css');
require('../node_modules/slick-carousel/slick/slick-theme.css');

document.addEventListener('DOMContentLoaded', () => {
  let data = window.__appData;

  ReactDOM.render(
    <Maps featuredMaps={data.featuredMaps} recentMaps={data.recentMaps} popularMaps={data.popularMaps} locale={data.locale} version={data.version}/>,
    document.querySelector('#app')
  );
});