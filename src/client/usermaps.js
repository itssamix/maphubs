import React from 'react';
import ReactDOM from 'react-dom';

import UserMaps from '../views/usermaps';

require('jquery');
require('../../node_modules/slick-carousel/slick/slick.css');
require('../../node_modules/slick-carousel/slick/slick-theme.css');
require("materialize-css");

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

document.addEventListener('DOMContentLoaded', () => {
  const data = window.__appData;

  ReactDOM.hydrate(
    <UserMaps {...data}/>,
    document.querySelector('#app')
  );
});
