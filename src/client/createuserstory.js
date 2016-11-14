const React  = require('react');
const ReactDOM = require('react-dom');

const CreateUserStory = require('../views/createuserstory');

require('jquery');
require("materialize-css");

require('../../node_modules/react-colorpickr/dist/colorpickr.css');


require('./story.css');
require('../../assets/js/mapbox-gl/mapbox-gl.css');
require('medium-editor/dist/css/medium-editor.css');
require('medium-editor/dist/css/themes/flat.css');
require("cropperjs/dist/cropper.css");
require('../../node_modules/slick-carousel/slick/slick.css');
require('../../node_modules/slick-carousel/slick/slick-theme.css');

document.addEventListener('DOMContentLoaded', () => {
  let data = window.__appData;

  ReactDOM.render(
    <CreateUserStory {...data}/>,
    document.querySelector('#app')
  );
});