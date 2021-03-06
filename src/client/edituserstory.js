import React from 'react';
import ReactDOM from 'react-dom';

import EditUserStory from '../views/edituserstory';

require('jquery');
require("materialize-css");

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

require('medium-editor/dist/css/medium-editor.css');
require('medium-editor/dist/css/themes/flat.css');
require('../../node_modules/slick-carousel/slick/slick.css');
require('../../node_modules/slick-carousel/slick/slick-theme.css');


require('./story.css');
require('../../node_modules/mapbox-gl/dist/mapbox-gl.css');
require('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css');

require("cropperjs/dist/cropper.css");

document.addEventListener('DOMContentLoaded', () => {
  const data = window.__appData;

  ReactDOM.hydrate(
    <EditUserStory {...data}/>,
    document.querySelector('#app')
  );
});
