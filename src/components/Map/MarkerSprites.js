// @flow
var React = require('react');

//Attributions
//Palm Oil by Stephanie Wauters from the Noun Project CC-BY 3.0 https://thenounproject.com/search/?q=palm+oil&i=15487


var MarkerSprites = React.createClass({

  render(){     
    return (
      <svg xmlns="http://www.w3.org/2000/svg" style={{display: 'none'}}>
        <symbol id="maphubs-icon-palm-oil" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid meet">
          <path d="M89.664,31.345c-6.29-17.548-29.178-12.972-29.178-12.972C46.561-6.042,19.856,3.496,19.856,3.496  C39.884,8.265,46.371,22.19,46.371,22.19C8.988,11.318,4.599,44.887,4.599,44.887c15.991-11.152,30.594-9.213,36.499-7.724  l-1.595,1.427c0,0-24.412,14.116-32.995,55.313c0,0,1.051,4.178,7.584,4.378c6.528,0.199,6.528-3.423,6.528-3.423  s9.534-39.485,25.176-53.408L47.025,40c11.865,9.734,6.915,36.736,6.915,36.736c23.401-12.97,8.259-45.834,8.259-45.834  c23.433,4.327,25.365,29.242,25.365,29.242S95.961,48.889,89.664,31.345z"/><path d="M78.146,97.679c6.069,0,10.99-4.919,10.99-10.986c0-6.07-10.99-17.76-10.99-25.406h-0.381  c0,7.646-10.987,19.336-10.987,25.406c0,6.067,4.921,10.986,10.987,10.986H78.146z"/>
        </symbol>
      </svg>
    );
  }

});

module.exports = MarkerSprites;

