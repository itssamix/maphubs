// @flow
const Image = require('../../models/image')
const debug = require('../../services/debug')('routes/images')
const apiError = require('../../services/error-response').apiError
const nextError = require('../../services/error-response').nextError
const imageUtils = require('../../services/image-utils')
const log = require('../../services/log')

module.exports = function (app: any) {
  app.get('/image/:id.*', (req, res, next) => {
    const image_id = parseInt(req.params.id || '', 10)
    // var ext = req.params.ext;
    debug.log('getting image: ' + image_id)
    Image.getImageByID(image_id)
      .then((image) => {
        if (image) {
          const dataArr = image.split(',')
          const dataInfoArr = dataArr[0].split(':')[1].split(';')
          const dataType = dataInfoArr[0]
          const data = dataArr[1]
          const img = Buffer.from(data, 'base64')
          res.writeHead(200, {
            'Content-Type': dataType,
            'Content-Length': img.length,
            'ETag': require('crypto').createHash('md5').update(img).digest('hex')
          })
          return res.end(img)
        } else {
          res.status(404).send()
        }
      }).catch(nextError(next))
  })

  app.get('/group/:id/image', (req, res) => {
    const group_id = req.params.id
    Image.getGroupImage(group_id)
      .then((result) => {
        if (result && result.image) {
          return imageUtils.processImage(result.image, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch(apiError(res, 404))
  })

  app.get('/group/:id/thumbnail', (req, res) => {
    const group_id = req.params.id
    Image.getGroupThumbnail(group_id)
      .then((result) => {
        if (result && result.thumbnail) {
          return imageUtils.processImage(result.thumbnail, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch((err) => {
        log.error(err)
      })
  })

  app.get('/hub/:id/images/logo', (req, res) => {
    const hub_id = req.params.id
    Image.getHubImage(hub_id, 'logo')
      .then((result) => {
        return imageUtils.processImage(result.image, req, res)
      }).catch(apiError(res, 404))
  })

  app.get('/hub/:id/images/logo/thumbnail', (req, res) => {
    const hub_id = req.params.id
    Image.getHubThumbnail(hub_id, 'logo')
      .then((result) => {
        if (result && result.thumbnail) {
          return imageUtils.processImage(result.thumbnail, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch(apiError(res, 404))
  })

  app.get('/hub/:id/images/banner', (req, res) => {
    const hub_id = req.params.id
    Image.getHubImage(hub_id, 'banner')
      .then((result) => {
        return imageUtils.processImage(result.image, req, res)
      }).catch(apiError(res, 404))
  })

  app.get('/hub/:id/images/banner/thumbnail', (req, res) => {
    const hub_id = req.params.id
    Image.getHubThumbnail(hub_id, 'banner')
      .then((result) => {
        if (result && result.thumbnail) {
          return imageUtils.processImage(result.thumbnail, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch(apiError(res, 404))
  })

  app.get('/images/story/:storyid/image/:imageid.jpg', (req, res) => {
    const story_id = req.params.storyid
    const image_id = req.params.imageid
    Image.getStoryImage(story_id, image_id)
      .then((result) => {
        if (result && result.image) {
          return imageUtils.processImage(result.image, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch(apiError(res, 404))
  })

  app.get('/images/story/:storyid/thumbnail/:imageid.jpg', (req, res) => {
    const story_id = req.params.storyid
    const image_id = req.params.imageid
    Image.getStoryThumbnail(story_id, image_id)
      .then((result) => {
        if (result && result.thumbnail) {
          return imageUtils.processImage(result.thumbnail, req, res)
        } else {
          return res.status(404).send()
        }
      }).catch(apiError(res, 404))
  })
}
