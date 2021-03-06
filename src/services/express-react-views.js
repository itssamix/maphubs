// @flow
/*
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

/*
 Modified to support isomorphic JS
 1) Assumes there is a client js file with the same name as the view in for examples client/login.js
 2) Assumes that the client will load its data out of window.__appData and use the query selector id="app"
 */
import React from 'react'
import {renderToString} from 'react-dom/server'
const Page = require('../models/page')
const assign = require('object-assign')
const log = require('./log')
const version = require('../../package.json').version
const local = require('../local')
const urlUtil = require('./url-util')
const Raven = require('raven')
const webpackAssets = require('../webpack-assets.json')
const DEFAULT_OPTIONS = {
  doctype: '<!DOCTYPE html>'
}

type ViewOptions = {
  title: string,
  description: string,
  props: Object,
  req: {
    session: Object,
    setLocale: Function,
    __: Function,
    locale: string,
    csrfToken: Function,
    url: string
  },
  materialicons: boolean,
  settings: {
    views: any
  },
  twitterCard: Object

}

function createEngine (engineOptions) {
  let registered = false
  let moduleDetectRegEx

  engineOptions = assign({}, DEFAULT_OPTIONS, engineOptions || {})

  async function renderFile (filename: string, options: ViewOptions, cb: Function) {
    const materialicons = options.materialicons ? options.materialicons : true
    // Defer babel registration until the first request so we can grab the view path.
    if (!registered) {
      moduleDetectRegEx = new RegExp('^' + options.settings.views)
      registered = true
    }
    let markup: string = ''
    try {
      markup = engineOptions.doctype
      let component = require(filename)
      // Transpiled ES6 may export components as { default: Component }
      component = component.default || component

      if (!options.props) {
        options.props = {}
      }
      let locale = 'en'
      let req
      if (options.req) {
        req = options.req
        // var browserLocale = req.acceptsLanguages('en', 'fr', 'es', 'it');
        if (req.session && req.session.locale) {
          // the user has specified a language from the options on the website
          locale = req.session.locale
          req.setLocale(locale)
        } else {
          // use local from i18n parsing of http accept-language
          locale = req.locale
        }
        if (options.req.csrfToken) {
          options.props._csrf = req.csrfToken()
        }
      } else {
        log.error('req object not found when rendering view: ' + filename)
      }
      options.props.locale = locale

      // include version number in all pages for debugging
      options.props.version = version

      if (!options.props.error) { // don't hit the database on error and 404 pages
        try {
          const pageConfigs = await Page.getPageConfigs(['footer', 'header', 'map'])
          options.props.headerConfig = pageConfigs.header
          options.props.footerConfig = pageConfigs.footer
          options.props.mapConfig = pageConfigs.map
        } catch (err) {
          log.error(err)
          Raven.captureException(err)
        }
      }

      const reactMarkup = renderToString(React.createElement(component, options.props))

      // assume that there is always client file with the same name as the view
      const clientFileName = this.name
      let title: string = this.name
      if (options.title) {
        title = options.title
      }

      const getAssets = function (entryName) {
        if (process.env.NODE_ENV === 'production') {
          return webpackAssets[entryName]
        } else {
          return {
            js: '/public/' + entryName + '.js',
            css: '/public/' + entryName + '.css'
          }
        }
      }

      let assetHost = ''
      if (process.env.NODE_ENV === 'production' && !local.useLocalAssets) {
        assetHost = 'https://cdn.maphubs.com'
      }

      markup += `
      <html lang="${locale}">
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        `

      if (options.description) {
        markup += `
            <meta name="description" content="${options.description}"/>
          `
      }

      let iconFolder = local.theme
      if (local.theme === 'maphubs-pro') {
        iconFolder = 'maphubs'
      }

      let themeUrl = ''
      if (local.themeUrl) {
        themeUrl = local.themeUrl + iconFolder
      } else {
        themeUrl = `${assetHost}/assets/themes/${iconFolder}`
      }

      // icons
      markup += `
        <link rel="apple-touch-icon-precomposed" sizes="57x57" href="${themeUrl}/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon-precomposed" sizes="114x114" href="${themeUrl}/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon-precomposed" sizes="72x72" href="${themeUrl}/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon-precomposed" sizes="144x144" href="${themeUrl}/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon-precomposed" sizes="60x60" href="${themeUrl}/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon-precomposed" sizes="120x120" href="${themeUrl}/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon-precomposed" sizes="76x76" href="${themeUrl}/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon-precomposed" sizes="152x152" href="${themeUrl}/apple-touch-icon-152x152.png" />
        <link rel="icon" type="image/png" href="${themeUrl}/favicon-196x196.png" sizes="196x196" />
        <link rel="icon" type="image/png" href="${themeUrl}/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/png" href="${themeUrl}/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="${themeUrl}/favicon-16x16.png" sizes="16x16" />
        <link rel="icon" type="image/png" href="${themeUrl}/favicon-128.png" sizes="128x128" />
        <meta name="application-name" content="${local.productName}"/>
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="msapplication-TileImage" content="${themeUrl}/mstile-144x144.png" />
        <meta name="msapplication-square70x70logo" content="${themeUrl}/mstile-70x70.png" />
        <meta name="msapplication-square150x150logo" content="${themeUrl}/mstile-150x150.png" />
        <meta name="msapplication-wide310x150logo" content="${themeUrl}/mstile-310x150.png" />
        <meta name="msapplication-square310x310logo" content="${themeUrl}/mstile-310x310.png" />
        `

      const baseUrl = urlUtil.getBaseUrl()
      let reqUrl = ''
      if (req && req.url) {
        reqUrl = req.url
      }
      if (options.oembed) {
        if (options.oembed === 'map') {
          const oembedUrl = baseUrl + '/api/oembed/' + options.oembed + '?url=' + baseUrl + reqUrl
          markup += `
            <link rel="alternate" type="application/json+oembed" href="${oembedUrl}&format=json" title="Maphubs Map" />
            <link rel="alternate" type="text/xml+oembed" href="${oembedUrl}&format=xml" title="Maphubs Map" />
            `
        } else if (options.oembed === 'layer') {
          const oembedUrl = baseUrl + '/api/oembed/' + options.oembed + '?url=' + baseUrl + reqUrl
          markup += `
            <link rel="alternate" type="application/json+oembed" href="${oembedUrl}&format=json" title="Maphubs Layer" />
            <link rel="alternate" type="text/xml+oembed" href="${oembedUrl}&format=xml" title="Maphubs Layer" />
            `
        }
      }

      if (options.twitterCard) {
        if (options.twitterCard.card) {
          markup += `
            <meta name="twitter:card" content="${options.twitterCard.card}">
            `
        } else {
          markup += `
            <meta name="twitter:card" content="summary_large_image">
            `
        }
        markup += `
          <meta name="twitter:site" content="@${local.twitter}">
          <meta name="twitter:title" content="${options.twitterCard.title}">
          `
        if (options.twitterCard.description) {
          markup += `
              <meta name="twitter:description" content="${options.twitterCard.description}">
              `
        }
        if (options.twitterCard.image) {
          markup += `
          <meta name="twitter:image" content="${options.twitterCard.image}">
          `
        }

        if (local.FACEBOOK_APP_ID) {
          markup += `<meta property="fb:app_id" content="${local.FACEBOOK_APP_ID}" />`
        }

        markup += `<meta property="og:title" content="${options.twitterCard.title}" />`
        if (options.twitterCard.description) {
          markup += `<meta property="og:description" content="${options.twitterCard.description}" />`
        }
        const openGraphUrl = baseUrl + reqUrl
        markup += `
            <meta property="og:type" content="website" />
            <meta property="og:url" content="${openGraphUrl}" />
            `
        if (options.twitterCard.image) {
          markup += `
            <meta property="og:image" content="${options.twitterCard.image}" />
            `
          if (options.twitterCard.imageType) {
            markup += `<meta property="og:image:type" content="${options.twitterCard.imageType}" />`
          } else {
            markup += `<meta property="og:image:type" content="image/png" />`
          }
          if (options.twitterCard.imageWidth) {
            markup += `<meta property="og:image:width" content="${options.twitterCard.imageWidth}" />`
          }
          if (options.twitterCard.imageHeight) {
            markup += `<meta property="og:image:height" content="${options.twitterCard.imageHeight}" />`
          }
        }
      }

      if (materialicons) {
        // https://fonts.googleapis.com/icon?family=Material+Icons
        markup += `<link href="${assetHost}/assets/css/material-icons.css" rel="stylesheet">\n`
      }

      markup +=
      //  '<link rel="stylesheet" type="text/css" href="/public/vendor.css">' +
        '<link rel="stylesheet" type="text/css" href="/css/maphubs.css">'

        // some endpoints don't generate css
      const cssFile = assetHost + getAssets(clientFileName).css
      if (cssFile) {
        markup += `<link rel="stylesheet" type="text/css" href="${cssFile}">`
      }

      if (options.talkComments) {
        markup += `
            <script type="text/javascript" src="https://talk.maphubs.com/embed.js"></script>
          `
      }

      let ravenConfig
      if (process.env.NODE_ENV === 'production' && !local.disableTracking) {
        ravenConfig = local.SENTRY_DSN_PUBLIC
      }

      markup += `
          </head>
          <body>
          <div id="app">${reactMarkup}</div>
         
          <script src="https://cdn.ravenjs.com/3.20.1/raven.min.js" crossorigin="anonymous"></script>
          <script type="text/javascript">
             Raven.config('${ravenConfig}', {
                release: '${version}',
                environment: '${local.ENV_TAG}',
                tags: {host: '${local.host}'}
              }).install();
          </script>
          <script type="text/javascript" src="${assetHost + getAssets('vendor').js}"></script>
          <script type="text/javascript" src="${assetHost + getAssets('locales').js}"></script>
          <script type="text/javascript">
              var MAPHUBS_CONFIG = {
                host: "${local.host}",
                port: ${local.port},
                https: ${local.https},
                productName: "${local.productName}",
                logo: "${local.logo}",
                logoSmall: "${local.logoSmall}",
                logoWidth: ${local.logoWidth},
                logoHeight: ${local.logoHeight},
                logoSmallWidth: ${local.logoSmallWidth},
                logoSmallHeight: ${local.logoSmallHeight},
                primaryColor: "${local.primaryColor}",
                betaText: "${local.betaText}",
                twitter: "${local.twitter}",
                contactEmail: "${local.contactEmail}",
                mapHubsPro: ${local.mapHubsPro},
                enableComments: ${local.enableComments},
                CORAL_TALK_ID: "${!options.login ? local.CORAL_TALK_ID : ''}",
                CORAL_TALK_HOST: "${local.CORAL_TALK_HOST}",
                FR_ENABLE: ${local.FR_ENABLE},
                FR_API: "${local.FR_API}",
                FR_API_KEY: "${(!options.login || !options.publicShare) ? local.FR_API_KEY : ''}",
                tileServiceUrl: "${local.tileServiceUrl}",
                MAPBOX_ACCESS_TOKEN: "${!options.login ? local.MAPBOX_ACCESS_TOKEN : ''}",
                TILEHOSTING_GEOCODING_API_KEY: "${!options.login ? local.TILEHOSTING_GEOCODING_API_KEY : ''}",
                TILEHOSTING_MAPS_API_KEY: "${!options.login ? local.TILEHOSTING_MAPS_API_KEY : ''}",
                PLANET_LABS_API_KEY: "${(!options.login  || !options.publicShare) ? local.PLANET_LABS_API_KEY : ''}",
                DG_WMS_CONNECT_ID: "${(!options.login || !options.publicShare) ? local.DG_WMS_CONNECT_ID : ''}",
                BING_KEY:  "${!options.login ? local.BING_KEY : ''}",
                SENTRY_DSN_PUBLIC:  "${local.SENTRY_DSN_PUBLIC}",
                theme: "${local.theme}",
                themeUrl: "${local.themeUrl}",
                enableUserExport: "${local.enableUserExport}"
              }
          </script>
          <script type="text/javascript" src="${assetHost + getAssets(clientFileName).js}"></script>
        `

      if (options.rangy) {
        markup += `
          <script src="${assetHost}/assets/js/rangy-core.js"></script>
          <script src="${assetHost}/assets/js/rangy-cssclassapplier.js"></script>
          `
      }

      if (options.fontawesome) {
        // https://netdna.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.css
        markup += `<link href="${assetHost}/assets/css/font-awesome.css" rel="stylesheet">\n`
      }
      // https://fonts.googleapis.com/css?family=Raleway|Merriweather:400,700,400italic
      markup += `<link href="${assetHost}/assets/css/raleway.css" rel="stylesheet" type="text/css">\n`
      // https://fonts.googleapis.com/css?family=Open+Sans
      markup += `<link href="${assetHost}/assets/css/opensans.css" rel="stylesheet" type="text/css">\n`

      if (!options.hideFeedback && req && req.__) {
        let email = '', user_id = '', display_name = ''
        if (req.session && req.session.user) {
          //  username = req.session.user.display_name;
          email = req.session.user.email || req.session.user.maphubsUser.email
          user_id = req.session.user.maphubsUser.id
          display_name = req.session.user.maphubsUser.display_name
        }

        markup += `

            <script>
            Userback = window.Userback || {};
            Userback.access_token = '1543|2037|tb9c1TOxoFcMIA834eVabMRUqZaUgieJunWvgL3Fqfr9PAcTO8';
        
            Userback.email = "${email}";
            Userback.custom_data = {
              account_id: '${user_id}',
              name: '${display_name}'
            };

            Userback.widget_settings = {
                language: '${locale}',
                style: 'circle',
                position: 'se',
                main_button_background_colour : "${local.primaryColor}", 
                main_button_text_colour       : "#FFFFFF", 
                send_button_background_colour : "${local.primaryColor}", 
                send_button_text_colour       : "#FFFFFF"  
            };
            Userback.after_send = function() {
                // alert("after send");
            };
        
            (function(id) {
                if (document.getElementById(id)) {return;}
                var s = document.createElement('script');
                s.id = id;
                s.src = 'https://static.userback.io/widget/v1.js';
                var parent_node = document.head || document.body;
                parent_node.appendChild(s);
            })('userback-sdk');
        </script> 
            
            `
      }
      if (process.env.NODE_ENV === 'production' && !local.disableTracking && !options.disableGoogleAnalytics) {
        markup += `
        <script>
          (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
          })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

          ga('create', '${local.GOOGLE_ANALYTICS_ID}', 'auto');
          ga('send', 'pageview');

        </script>
        `
      }
    } catch (err) {
      return cb(err)
    }

    if (process.env.NODE_ENV === 'development') {
      // Remove all files from the module cache that are in the view folder.
      Object.keys(require.cache).forEach((module) => {
        if (moduleDetectRegEx.test(require.cache[module].filename)) {
          delete require.cache[module]
        }
      })
    }

    const appData: string = JSON.stringify(options.props, null, 2)
    markup += `
       <script>window.__appData = ${appData}; </script>
      </body>
      </html>
      `
    cb(null, markup)
  }
  return renderFile
}

exports.createEngine = createEngine
