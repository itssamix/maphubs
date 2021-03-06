/* eslint-disable no-console*/
/* eslint-disable unicorn/no-process-exit*/
let babelConfig = {
  "presets": [
    ["env", {
      "targets": {
        "node": true,
    }
    }],
    "react",
    "stage-0"
  ],
  ignore: /assets.*|node_modules\/(?!(medium-editor|mapbox-gl)).*/
};

if(process.env.NODE_ENV !== 'production'){
  babelConfig.sourceMaps = true;
  babelConfig.retainLines = true;
}
require('babel-core/register')(babelConfig);

var Layer = require('../src/models/layer');
var LayerViews = require('../src/services/layer-views');
var knex = require('../src/connection');

if(process.argv.length !== 3){
  console.log('Please provide the layer_id to recreate');
  process.exit(1);
}else{
  try{
    let layer_id = parseInt(process.argv[2]);
  
    console.log(`Recreating views for layer: ${layer_id}`);

    knex.transaction( async (trx) => {
      const layer = await Layer.getLayerByID(layer_id, trx);
      await LayerViews.replaceViews(layer_id, layer.presets, trx);
      await Layer.setUpdated(layer_id, 1, trx);
      console.log('SUCCESS!');
      return;
    })
    .then(()=>{
      return process.exit();
    })
    .catch(err=>{
      console.log(err);
      process.exit(1);
    });
  }catch(err){
    console.log(err);
    process.exit(1);
  }
}