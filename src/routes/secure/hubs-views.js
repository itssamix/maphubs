// @flow
var express = require('express');
var Layer = require('../../models/layer');
var Story = require('../../models/story');
var Hub = require('../../models/hub');
var User = require('../../models/user');
var Map = require('../../models/map');
var Stats = require('../../models/stats');
var login = require('connect-ensure-login');
//var log = require('../../services/log.js');
var debug = require('../../services/debug')('routes/hubs');
var Promise = require('bluebird');
var MapUtils = require('../../services/map-utils');
var urlUtil = require('../../services/url-util');
var baseUrl = urlUtil.getBaseUrl();
var apiError = require('../../services/error-response').apiError;
var nextError = require('../../services/error-response').nextError;
var apiDataError = require('../../services/error-response').apiDataError;
var csrfProtection = require('csurf')({cookie: false});

module.exports = function(app: any) {

 var recordHubView = function(session: any, hub_id: string, user_id: number, next: any){

   if(!session.hubviews){
     session.hubviews = {};
   }
   if(!session.hubviews[hub_id]){
     session.hubviews[hub_id] = 1;
     Stats.addHubView(hub_id, user_id).catch(nextError(next));
   }else{
     const views: number = session.hubviews[hub_id];
     session.hubviews[hub_id] = views + 1;
   }

   session.views = (session.views || 0) + 1;
 };

 var recordStoryView = function(session, story_id: number, user_id:number,  next){
   if(!session.storyviews){
     session.storyviews = {};
   }
   if(!session.storyviews[story_id]){
     session.storyviews[story_id] = 1;
     Stats.addStoryView(story_id, user_id).catch(nextError(next));
   }else{
     var views = session.storyviews[story_id];

     session.storyviews[story_id] = views + 1;
   }
   session.views = (session.views || 0) + 1;
 };

  //Views
  app.get('/hubs', csrfProtection, function(req, res, next) {

    Promise.all([
      Hub.getFeaturedHubs(),
      Hub.getPopularHubs(),
      Hub.getRecentHubs()
    ])
      .then(function(results) {
        var featuredHubs = results[0];
        var popularHubs = results[1];
        var recentHubs = results[2];
        res.render('hubs', {
          title: req.__('Hubs') + ' - ' + MAPHUBS_CONFIG.productName,
          props: {
            featuredHubs, popularHubs, recentHubs
          }, req
        });
      }).catch(nextError(next));
  });

  app.get('/user/:username/hubs', csrfProtection, function(req, res, next) {

    var username = req.params.username;
    debug(username);
    if(!username){nextError(next);}
    var canEdit = false;

    function completeRequest(userCanEdit){
      User.getUserByName(username)
      .then(function(user){
        if(user){
            return Promise.all([
              Hub.getPublishedHubsForUser(user.id),
              Hub.getDraftHubsForUser(user.id)
            ])
          .then(function(results){
            var publishedHubs = results[0];
            var draftHubs = [];
            if(userCanEdit){
              draftHubs = results[1];
            }
            res.render('userhubs', {title: 'Hubs - ' + username, props:{user, publishedHubs, draftHubs, canEdit: userCanEdit}, req});
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
          canEdit = true;
        }
        completeRequest(canEdit);
      }).catch(nextError(next));
    }
  });

  app.use('/hub/:hubid/assets/', express.static('assets'));


  var renderHubPage = function(hub, canEdit, req, res){
    debug('loading hub, canEdit: ' + canEdit);
    return Promise.all([
        Layer.getHubLayers(hub.hub_id),
        Hub.getHubStories(hub.hub_id, canEdit)
      ])
      .then(function(result) {
        var layers = result[0];
        var stories = result[1];
        res.render('hubinfo', {
          title: hub.name + ' - ' + MAPHUBS_CONFIG.productName,
          hideFeedback: !MAPHUBS_CONFIG.mapHubsPro,
          mapboxgl:true,
          fontawesome: true,
          addthis: true,
          props: {
            hub, layers, stories, canEdit
          }, req
        });
      });
  };

  app.get('/hub/:hubid', csrfProtection, function(req, res, next) {
    var hub_id: string = req.params.hubid;
    var user_id: number;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    Hub.getHubByID(hub_id)
      .then(function(hub) {
        if(hub == null){
          res.redirect(baseUrl + '/notfound?path='+req.path);
          return;
        }
        recordHubView(req.session, hub_id, user_id, next);
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return renderHubPage(hub, false, req, res);
        } else {
          return Hub.allowedToModify(hub_id, user_id)
          .then(function(allowed){
            if(allowed){
              return renderHubPage(hub, true, req, res);
            }else{
              return renderHubPage(hub, false, req, res);
            }
          });
        }
      }).catch(nextError(next));
  });

  var renderHubMapPage = function(hub, canEdit, req, res){
      return Promise.all([
        Layer.getHubLayers(hub.hub_id)
      ])
      .then(function(results) {
        var layers = results[0];
        res.render('hubmap', {
          title: hub.name + '|' + req.__('Map') + ' - ' + MAPHUBS_CONFIG.productName,
          hideFeedback: !MAPHUBS_CONFIG.mapHubsPro,
          mapboxgl:true,
          props: {
            hub, layers, canEdit
          }, req
        });
      });
  };

  app.get('/hub/:hubid/map', csrfProtection, function(req, res, next) {

    const hub_id: string = req.params.hubid;
    let user_id: number;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    Hub.getHubByID(hub_id)
      .then(function(hub) {
        if(hub == null){
          res.redirect(baseUrl + '/notfound?path='+req.path);
          return;
        }
        recordHubView(req.session, hub_id, user_id, next);

      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return renderHubMapPage(hub, false, req, res);
      } else {
        return Hub.allowedToModify(hub_id, user_id)
        .then(function(allowed){
          if(allowed){
            return renderHubMapPage(hub, true, req, res);
          }else{
            return renderHubMapPage(hub, false, req, res);
          }
        });
      }
    }).catch(nextError(next));
  });

  var renderHubStoryPage = function(hub, canEdit, req, res){
      return Hub.getHubStories(hub.hub_id, canEdit)
      .then(function(stories) {
        res.render('hubstories', {
          title: hub.name + '|' + req.__('Stories') + ' - ' + MAPHUBS_CONFIG.productName,
          hideFeedback: !MAPHUBS_CONFIG.mapHubsPro,
          addthis: true,
          props: {
            hub, stories, canEdit
          }, req
        });
      });
  };

  app.get('/hub/:hubid/stories', csrfProtection, function(req, res, next) {

    const hub_id: string = req.params.hubid;
    let user_id: number;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    Hub.getHubByID(hub_id)
      .then(function(hub) {
        if(hub == null){
          res.redirect(baseUrl + '/notfound?path='+req.path);
          return;
        }
        recordHubView(req.session, hub_id, user_id, next);
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return renderHubStoryPage(hub, false, req, res);
        } else {
          return Hub.allowedToModify(hub_id, user_id)
          .then(function(allowed){
            if(allowed){
              return renderHubStoryPage(hub, true, req, res);
            }else{
              return renderHubStoryPage(hub, false, req, res);
            }
          });
        }
      }).catch(nextError(next));
  });

  var renderHubResourcesPage = function(hub, canEdit, req, res){
      res.render('hubresources', {
        title: hub.name + '|' + req.__('Resources') + ' - ' + MAPHUBS_CONFIG.productName,
        hideFeedback: !MAPHUBS_CONFIG.mapHubsPro,
        fontawesome: true,
        rangy: true,
        props: {
          hub, canEdit
        }, req
      });
  };

  app.get('/hub/:hubid/resources', csrfProtection, function(req, res, next) {

    const hub_id: string = req.params.hubid;
    let user_id: number;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    Hub.getHubByID(hub_id)
      .then(function(hub) {
        if(hub == null){
          res.redirect(baseUrl + '/notfound?path='+req.path);
          return;
        }
        recordHubView(req.session, hub_id, user_id, next);

        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return renderHubResourcesPage(hub, false, req, res);
        } else {
          return Hub.allowedToModify(hub_id, user_id)
          .then(function(allowed){
            if(allowed){
              return renderHubResourcesPage(hub, true, req, res);
            }else{
              return renderHubResourcesPage(hub, false, req, res);
            }
          });
        }
    }).catch(nextError(next));
  });

  app.get('/hub/:hubid/story/create', login.ensureLoggedIn(), function(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.redirect(baseUrl + '/unauthorized?path='+req.path);
    }
    const user_id: number = req.session.user.id;
    const hub_id: string = req.params.hubid;
    Hub.allowedToModify(hub_id, user_id)
    .then(function(allowed: bool){
      if(allowed){
        Promise.all([
          Hub.getHubByID(hub_id),
          Map.getUserMaps(req.session.user.id),
          Map.getPopularMaps()
        ]).then(function(results: Array<any>) {
          var hub = results[0];
          var myMaps = results[1];
          var popularMaps = results[2];
          res.render('createhubstory', {
            title: 'Create Story',
            fontawesome: true,
            rangy: true,
            props: {
              hub, myMaps, popularMaps
            }, req
          });
        }).catch(nextError(next));
      }else{
        res.redirect(baseUrl + '/unauthorized?path='+req.path);
      }
    }).catch(nextError(next));
  });

  app.get('/hub/:hubid/story/:story_id/edit/*', csrfProtection, login.ensureLoggedIn(), function(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).send("Unauthorized, user not logged in");
      return;
    }
    var user_id = req.session.user.id;
    var hub_id = req.params.hubid;
    var story_id = parseInt(req.params.story_id || '', 10);
    Hub.allowedToModify(hub_id, user_id)
    .then(function(allowed){
      if(allowed){
        Promise.all([
          Hub.getHubByID(hub_id),
          Story.getStoryByID(story_id),
          Map.getUserMaps(req.session.user.id),
          Map.getPopularMaps()
        ]).then(function(results) {
          var hub = results[0];
          var story = results[1];
          var myMaps = results[2];
          var popularMaps = results[3];
            res.render('edithubstory', {
              title: 'Editing: ' + story.title,
              fontawesome: true,
              rangy: true,
              props: {
                story,
                hub, myMaps, popularMaps
              }, req
            });
          }).catch(nextError(next));
      }else{
        res.redirect(baseUrl + '/unauthorized?path='+req.path);
      }
    }).catch(nextError(next));
  });

  app.get('/hub/:hubid/story/:story_id/*', csrfProtection, function(req, res, next) {

    const hub_id: string = req.params.hubid;
    const story_id: number = parseInt(req.params.story_id || '', 10);
    let user_id: number;
    if(req.session.user){
      user_id = req.session.user.id;
    }
    recordStoryView(req.session, story_id, user_id, next);
    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
        Promise.all([
          Story.getStoryByID(story_id),
          Hub.getHubByID(hub_id)
        ])
          .then(function(results) {
            var story = results[0];
            var hub = results[1];
             var imageUrl = '';
            if(story.firstimage){
              imageUrl = story.firstimage;
            }
            res.render('hubstory', {
              title: story.title,
              addthis: true,
              props: {
                story, hub, canEdit: false
              },
              twitterCard: {
                title: story.title,
                description: story.firstline,
                image: imageUrl
              },
              req
            });
          }).catch(nextError(next));
    }else{
      Story.allowedToModify(story_id, user_id)
      .then(function(canEdit){      
        return Promise.all([
          Story.getStoryByID(story_id),
          Hub.getHubByID(hub_id)
        ])
          .then(function(results) {
            var story = results[0];
            var hub = results[1];
             var imageUrl = '';
            if(story.firstimage){
              imageUrl = story.firstimage;
            }
            res.render('hubstory', {
              title: story.title,
              addthis: true,
              props: {
                story, hub, canEdit
              },
              twitterCard: {
                title: story.title,
                description: story.firstline,
                image: imageUrl
              },
               req
            });
          });
      }).catch(nextError(next));
    }
  });

  app.get('/hub/:hub/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  app.get('/hub/:hub/map/embed/:map_id', function(req, res, next) {
    var map_id = req.params.map_id;
    var hub_id = req.params.hub;
    if(!map_id){
      apiDataError(res, 'Bad Request: MapId not found');
    }

    if (!req.isAuthenticated || !req.isAuthenticated()
        || !req.session || !req.session.user) {
          MapUtils.completeEmbedMapRequest(req, res, next, map_id, false, false);
    } else {
      //get user id
      var user_id = req.session.user.id;

      Hub.allowedToModify(hub_id, user_id)
      .then(function(allowed){
        MapUtils.completeEmbedMapRequest(req, res, next, map_id, false, allowed);
      }).catch(apiError(res, 500));
    }
  });

    app.get('/hub/:id/admin', csrfProtection, login.ensureLoggedIn(), function(req, res, next) {

      var user_id = req.session.user.id;
      var hub_id = req.params.id;

      //confirm that this user is allowed to administer this hub
      Hub.getHubRole(user_id, hub_id)
        .then(function(result) {
          if (result && result.length == 1 && result[0].role == 'Administrator') {
            Promise.all([
                Hub.getHubByID(hub_id),
                Layer.getHubLayers(hub_id),
                Hub.getHubMembers(hub_id)
              ])
              .then(function(result) {
                var hub = result[0];
                var layers = result[1];
                var members = result[2];
                res.render('hubadmin', {
                  title: hub.name + '|' + req.__('Settings') + ' - ' + MAPHUBS_CONFIG.productName,
                  props: {
                    hub, layers, members
                  }
                });
              }).catch(nextError(next));
          } else {
            res.redirect(baseUrl + '/unauthorized?path='+req.path);
          }
        }).catch(nextError(next));

    });

};