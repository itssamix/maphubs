// @flow
const Layer = require('../../models/layer')
const Group = require('../../models/group')
const Hub = require('../../models/hub')
const Map = require('../../models/map')
const Page = require('../../models/page')
const Story = require('../../models/story')
const nextError = require('../../services/error-response').nextError
const csrfProtection = require('csurf')({cookie: false})
const renderCMSPage = require('../../services/render-cms-page')

module.exports = function (app: any) {
  app.get('/', csrfProtection, async (req, res, next) => {
    try {
      const {home} = await Page.getPageConfigs(['home'])
      await renderCMSPage(home, req, res)
    } catch (err) { nextError(next)(err) }
  })

  app.get('/explore', csrfProtection, async (req, res, next) => {
    try {
      res.render('explore', {
        title: req.__('Explore') + ' - ' + MAPHUBS_CONFIG.productName,
        props: {
          featuredLayers: await Layer.getFeaturedLayers(10),
          featuredGroups: await Group.getFeaturedGroups(10),
          featuredHubs: await Hub.getFeaturedHubs(10),
          featuredMaps: await Map.getFeaturedMaps(10),
          featuredStories: await Story.getFeaturedStories(10),
          popularLayers: await Layer.getPopularLayers(10),
          popularGroups: await Group.getPopularGroups(10),
          popularHubs: await Hub.getPopularHubs(10),
          popularMaps: await Map.getPopularMaps(10),
          popularStories: await Story.getPopularStories(10),
          recentLayers: await Layer.getRecentLayers(10),
          recentGroups: await Group.getRecentGroups(10),
          recentHubs: await Hub.getRecentHubs(10),
          recentMaps: await Map.getRecentMaps(10),
          recentStories: await Story.getRecentStories(10)
        },
        req
      })
    } catch (err) { nextError(next)(err) }
  })

  app.get('/terms', csrfProtection, (req, res) => {
    return res.render('terms', {
      title: req.__('Terms') + ' - ' + MAPHUBS_CONFIG.productName,
      props: {},
      req
    })
  })

  app.get('/privacy', csrfProtection, (req, res) => {
    return res.render('privacy', {
      title: req.__('Privacy') + ' - ' + MAPHUBS_CONFIG.productName,
      props: {},
      req
    })
  })
}
