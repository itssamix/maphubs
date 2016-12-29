// @flow
var Promise = require('bluebird');
var User = require('../../models/user');
var Map = require('../../models/map');
var Layer = require('../../models/layer');
var Stats = require('../../models/stats');
var debug = require('../../services/debug')('routes/map');
//var log = require('../../services/log');
var MapUtils = require('../../services/map-utils');
var nextError = require('../../services/error-response').nextError;
var apiDataError = require('../../services/error-response').apiDataError;

var csrfProtection = require('csurf')({cookie: false});

module.exports = function(app: any) {

  var recordMapView = function(session: Object, map_id: number, user_id: number,  next: any){
    if(!session.mapviews){
      session.mapviews = {};
    }
    if(!session.mapviews[map_id]){
      session.mapviews[map_id] = 1;
      Stats.addMapView(map_id, user_id).catch(nextError(next));
    }else{
      var views = session.mapviews[map_id];

      session.mapviews[map_id] = views + 1;
    }

    session.views = (session.views || 0) + 1;
  };


  app.get('/map/new', csrfProtection, function(req, res, next) {

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
            Layer.getPopularLayers()
            .then(function(popularLayers){
              res.render('map', {title: 'New Map ', props:{popularLayers}, mapboxgl:true, req});
            }).catch(nextError(next));
    } else {
      //get user id
      var user_id = req.session.user.id;

      Promise.all([
        Layer.getPopularLayers(),
        Layer.getUserLayers(user_id, 15)
      ])
        .then(function(results){
          var popularLayers = results[0];
          var myLayers = results[1];
          res.render('map', {title: 'New Map ', props:{popularLayers, myLayers}, mapboxgl:true, req});
        }).catch(nextError(next));
    }

  });

  app.get('/maps', csrfProtection, function(req, res, next) {

    Promise.all([
      Map.getFeaturedMaps(),
      Map.getRecentMaps(),
      Map.getPopularMaps()
    ])
      .then(function(results){
        var featuredMaps = results[0];
        var recentMaps = results[1];
        var popularMaps = results[2];
        res.render('maps', {title: req.__('Maps') + ' - ' + MAPHUBS_CONFIG.productName, props: {featuredMaps, recentMaps, popularMaps}, req});
      }).catch(nextError(next));
  });

  app.get('/user/:username/maps', csrfProtection, function(req, res, next) {

    var username = req.params.username;
    debug(username);
    if(!username){apiDataError(res);}
    var myMaps = false;

    function completeRequest(){
      User.getUserByName(username)
      .then(function(user){
        if(user){
          return Map.getUserMaps(user.id)
          .then(function(maps){
            res.render('usermaps', {title: 'Maps - ' + username, props:{user, maps, myMaps}, req});
          });
        }else{
          res.redirect('/notfound?path='+req.path);
        }
      }).catch(nextError(next));
    }

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
          completeRequest();
    } else {
      //get user id
      var user_id = req.session.user.id;

      //get user for logged in user
      User.getUser(user_id)
      .then(function(user){
        //flag if requested user is logged in user
        if(user.display_name === username){
          myMaps = true;
        }
        completeRequest();
      }).catch(nextError(next));
    }
  });

  app.get('/map/view/:map_id/*', csrfProtection, function(req, res, next) {
    var map_id = req.params.map_id;
    if(!map_id){
      apiDataError(res);
    }

    var user_id = -1;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    recordMapView(req.session, map_id, user_id, next);


    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
        MapUtils.completeUserMapRequest(req, res, next, map_id, false);
    } else {
      //get user id
      Map.allowedToModify(map_id, user_id)
      .then(function(allowed){
        MapUtils.completeUserMapRequest(req, res, next, map_id, allowed);
      });
    }
  });

  app.get('/user/:username/map/:map_id', csrfProtection, function(req, res, next) {
    var map_id = req.params.map_id;
    if(!map_id){
      apiDataError(res);
    }

    var user_id = -1;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    recordMapView(req.session, map_id, user_id, next);


    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
        MapUtils.completeUserMapRequest(req, res, next, map_id, false);
    } else {
      //get user id
      Map.allowedToModify(map_id, user_id)
      .then(function(allowed){
        MapUtils.completeUserMapRequest(req, res, next, map_id, allowed);
      });
    }
  });

  app.get('/map/edit/:map_id', csrfProtection, function(req, res, next) {
    var map_id = req.params.map_id;
    if(!map_id){
      apiDataError(res);
    }

    var user_id = -1;
    if(req.session.user){
      user_id = req.session.user.id;
    }

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
        //need to be logged in
        res.redirect('/unauthorized');
    } else {
      //get user id
      Map.allowedToModify(map_id, user_id)
      .then(function(allowed){
        if(allowed){
          return Promise.all([
          Map.getMap(map_id),
          Map.getMapLayers(map_id),
          Layer.getPopularLayers(),
          Layer.getUserLayers(user_id, 15)
          ])
          .then(function(results){
            var map = results[0];
            var layers = results[1];
            var popularLayers = results[2];
            var myLayers = results[3];
            var title = 'Map';
            if(map.title){
              title = map.title;
            }
            title += ' - ' + MAPHUBS_CONFIG.productName;
              res.render('mapedit',
               {
                 title,
                 props:{map, layers, popularLayers, myLayers},
                 hideFeedback: true,
                 mapboxgl:true,
                 req
               }
             );
          }).catch(nextError(next));
        }else{
          res.redirect('/unauthorized');
        }
      });
    }
  });

  app.get('/map/embed/:map_id', csrfProtection, function(req, res, next) {
    var map_id = req.params.map_id;
    if(!map_id){
      apiDataError(res);
    }

    var user_id = -1;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    recordMapView(req.session, map_id, user_id, next);

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
          MapUtils.completeEmbedMapRequest(req, res, next, map_id, false, false);
    } else {
      Map.allowedToModify(map_id, user_id)
      .then(function(allowed){
        MapUtils.completeEmbedMapRequest(req, res, next, map_id, false, allowed);
      });
    }
  });

  app.get('/map/embed/:map_id/static', csrfProtection, function(req, res, next) {
    var map_id = req.params.map_id;
    if(!map_id){
      apiDataError(res);
    }

    var user_id = -1;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    recordMapView(req.session, map_id, user_id, next);

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
          MapUtils.completeEmbedMapRequest(req, res, next, map_id, true, false);
    } else {
      Map.allowedToModify(map_id, user_id)
      .then(function(allowed){
        MapUtils.completeEmbedMapRequest(req, res, next, map_id, true, allowed);
      });
    }
  });
};