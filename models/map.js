var knex = require('../connection');
var Promise = require('bluebird');
var debug = require('../services/debug')('models/map');
var find = require('lodash.find');
var forEachRight = require('lodash.foreachright');
var Group = require('../models/group');

module.exports = {

  getMap(map_id){
    return knex('omh.maps')
    .select(knex.raw(
      `map_id, title, position, style, created_by,
      created_at, updated_by, updated_at, views,
     CASE WHEN screenshot IS NULL THEN FALSE ELSE TRUE END as has_screenshot`
   ))
    .where({map_id})
    .then(function(result) {
      if (result && result.length == 1) {
        return result[0];
      }
      //else
      return null;
    });
  },

  getMapLayers(map_id, trx){
    let db = knex;
    if(trx){db = trx;}
    return db.select('omh.layers.*','omh.map_layers.style as map_style', 'omh.map_layers.position as position', 'omh.map_layers.legend_html as map_legend_html', 'omh.map_layers.map_id as map_id')
      .from('omh.maps')
      .leftJoin('omh.map_layers', 'omh.maps.map_id', 'omh.map_layers.map_id')
      .leftJoin('omh.layers', 'omh.map_layers.layer_id', 'omh.layers.layer_id')
      .where('omh.maps.map_id', map_id).orderBy('position');
  },

  allowedToModify(map_id, user_id){
    return this.getMap(map_id)
      .then(function(map){
           if(map.owned_by_group_id){
             return Group.getGroupMembers(map.owned_by_group_id)
            .then(function(users){
              if(find(users, {id: user_id}) !== undefined){
                return true;
              }
              return false;
            });
          } else {
            //FIXME: use the user_maps table instead
            if(map.created_by === user_id){
              return true;
            }
            return false;
          }
      });
    },

  getUserMaps(user_id){
    return knex.select('omh.maps.map_id', 'omh.maps.title', 'omh.maps.updated_at')
      .from('omh.maps')
      .leftJoin('omh.user_maps', 'omh.maps.map_id', 'omh.user_maps.map_id')
      .where('omh.user_maps.user_id', user_id);
  },

  getStoryMaps(story_id){
    return  knex.select('omh.maps.*')
      .from('omh.maps')
      .leftJoin('omh.user_maps', 'omh.maps.map_id', 'omh.user_maps.map_id')
      .where('omh.story_maps.story_id', story_id);
  },

  createMap(layers, style, position, title, user_id){
    return knex.transaction(function(trx) {
    return trx('omh.maps')
      .insert({
          position,
          style,
          title,
          created_by: user_id,
          created_at: knex.raw('now()'),
          updated_by: user_id,
          updated_at: knex.raw('now()')
      }).returning('map_id')
      .then(function(result){
        var map_id = result[0];
        debug('Created Map with ID: ' + map_id);
        //insert layers
        var mapLayers = [];
        layers.forEach(function(layer, i){
          var mapStyle = layer.map_style ? layer.map_style : layer.style;
          var mapLegend = layer.map_legend_html ? layer.map_legend_html : layer.legend_html;
          mapLayers.push({
            map_id,
            layer_id: layer.layer_id,
            style: mapStyle,
            legend_html: mapLegend,
            position: i
          });
        });
        return trx('omh.map_layers')
        .insert(mapLayers)
        .then(function(){
          return map_id;
        });
      });
    });
  },

  updateMap(map_id, layers, style, position, title, user_id){
    return knex.transaction(function(trx) {
      return trx('omh.maps')
        .update({position, style, title,
            updated_by: user_id,
            updated_at: knex.raw('now()'),
            screenshot: null,
            thumbnail: null
        }).where({map_id})
        .then(function(){
          debug('Updated Map with ID: ' + map_id);
          //remove previous layers
          return trx('omh.map_layers').where({map_id}).del()
          .then(function(){
            //insert layers
            var mapLayers = [];
            layers.forEach(function(layer, i){
              var mapStyle = layer.map_style ? layer.map_style : layer.style;
              var mapLegend = layer.map_legend_html ? layer.map_legend_html : layer.legend_html;
              mapLayers.push({
                map_id,
                layer_id: layer.layer_id,
                style: mapStyle,
                legend_html: mapLegend,
                position: i
              });
            });
            return trx('omh.map_layers').insert(mapLayers)
            .then(function(result){
              debug('Updated Map Layers with MapID: ' + map_id);
              return result;
            });
            });
          });
      });
  },

  deleteMap(map_id){
    return knex.transaction(function(trx) {
      return trx('omh.map_views').where({map_id}).del()
      .then(function(){
        return trx('omh.user_maps').where({map_id}).del()
        .then(function(){
          return trx('omh.story_maps').where({map_id}).del()
          .then(function(){
            return trx('omh.map_layers').where({map_id}).del()
            .then(function(){
              return trx('omh.maps').where({map_id}).del();
            });
          });
        });
      });
    });
  },

  createUserMap(layers, style, position, title, user_id){
    return this.createMap(layers, style, position, title, user_id)
    .then(function(result){
      debug(result);
      var map_id = result;
      debug('Saving User Map with ID: ' + map_id);
      return knex('omh.user_maps').insert({user_id, map_id}).returning('map_id');
    });
  },

  createStoryMap(layers, style, position, story_id, title, user_id){
    return this.createMap(layers, style, position, title, user_id)
    .then(function(result){
      var map_id = result;
      debug('Saving Story Map with ID: ' + map_id);
      return knex('omh.story_maps').insert({story_id, map_id}).returning('map_id');
    });
  },

  saveHubMap(layers, style, position, hub_id, user_id){
    return knex.transaction(function(trx) {
      return trx('omh.hubs')
      .update({
        map_style: style,
        map_position: position,
        updated_by: user_id,
        updated_at: knex.raw('now()')
      }).where({hub_id})
      .then(function(){
        return trx('omh.hub_layers').where({hub_id}).del()
        .then(function(){
          var commands = [];
          layers.forEach(function(layer, i){
            var mapStyle = layer.map_style ? layer.map_style : layer.style;
            var mapLegend = layer.map_legend_html ? layer.map_legend_html : layer.legend_html;
            commands.push(trx('omh.hub_layers')
            .insert({hub_id, layer_id: layer.layer_id, style: mapStyle, legend_html: mapLegend, active: layer.active, position: i}));
          });
          return Promise.all(commands);
        });
      });
    });
  },
  //TODO: this code is duplicated in MapStore, need to bring then back together
  buildMapStyle(layers){
    var mapStyle = {
      sources: {},
      layers: []
    };

    //reverse the order for the styles, since the map draws them in the order received
    forEachRight(layers, function(layer){
      if(layer.map_style && layer.map_style.sources && layer.map_style.layers){
        //check for active flag and update visibility in style
        if(layer.active != undefined && layer.active == false){
          //hide style layers for this layer
          layer.map_style.layers.forEach(function(styleLayer){
            styleLayer['layout'] = {
              "visibility": "none"
            };
          });
        } else {
          //reset all the style layers to visible
          layer.map_style.layers.forEach(function(styleLayer){
            styleLayer['layout'] = {
              "visibility": "visible"
            };
          });
        }
        //add source
        mapStyle.sources = Object.assign(mapStyle.sources, layer.map_style.sources);
        //add layers
        mapStyle.layers = mapStyle.layers.concat(layer.map_style.layers);
      } else {
        debug('Not added to map, incomplete style for layer: ' + layer.layer_id);
      }

    });

    return mapStyle;
  }

};