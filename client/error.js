const React  = require('react');
const ReactDOM = require('react-dom');

const Error = require('../views/error');

var $ = require('jquery');
require("materialize-css");
require("materialize-css/dist/css/materialize.min.css");
require('../css/app.css');
require('../css/feedback-right.css');

document.addEventListener('DOMContentLoaded', () => {
  let data = window.__appData;

  ReactDOM.render(
    <Error title={data.title} error={data.error} url={data.url} locale={data.locale}/>,
    document.querySelector('#app')
  );
  $( document ).ready(function(){
    $(".button-collapse").sideNav();
  });

});