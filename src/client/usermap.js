import React from 'react';
import ReactDOM from 'react-dom';

require('jquery');
require("materialize-css");
require('medium-editor/dist/css/medium-editor.css');
import UserMap from '../views/usermap';

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

require('../../node_modules/mapbox-gl/dist/mapbox-gl.css');
require('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css');

document.addEventListener('DOMContentLoaded', () => {
  const data = window.__appData;

  ReactDOM.hydrate(
    <UserMap {...data}/>,
    document.querySelector('#app')
  );
});
