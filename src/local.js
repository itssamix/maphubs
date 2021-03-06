var path = require('path')
require('dotenv').config()
var getenv = require('getenv')
getenv.disableErrors()

var tempPath = getenv('OMH_TEMP_FILE_PATH')
if (!tempPath || tempPath === 'undefined') {
  tempPath = path.join(__dirname, '../temp')
}

var local = {
  connection: {
    url: `postgres://${getenv('DB_USER')}:${getenv('DB_PASS')}@${getenv('DB_HOST')}:${getenv('DB_PORT')}/${getenv('DB_DATABASE')}`
  },
  host: getenv('OMH_HOST'),
  host_internal: getenv('OMH_HOST_INTERNAL'),
  port: getenv.int('OMH_PORT'),
  https: getenv.bool('OMH_HTTPS', true),
  internal_port: getenv.int('OMH_INTERNAL_PORT'),
  publicFilePath: path.join(__dirname, '../assets/public'),
  tempFilePath: tempPath,
  productName: getenv('OMH_PRODUCT_NAME'),
  logo: getenv('OMH_LOGO'),
  logoSmall: getenv('OMH_LOGO_SMALL'),
  logoWidth: getenv.int('OMH_LOGO_WIDTH'),
  logoHeight: getenv.int('OMH_LOGO_HEIGHT'),
  logoSmallWidth: getenv.int('OMH_LOGO_WIDTH_SMALL'),
  logoSmallHeight: getenv.int('OMH_LOGO_HEIGHT_SMALL'),
  primaryColor: getenv('OMH_PRIMARY_COLOR'),
  betaText: getenv('OMH_BETA_TEXT'),
  twitter: getenv('OMH_TWITTER'),
  contactEmail: getenv('OMH_CONTACT_EMAIL'),
  enableComments: getenv.bool('OMH_ENABLE_COMMENTS', false),
  CORAL_TALK_ID: getenv('OMH_CORAL_TALK_ID'),
  CORAL_TALK_HOST: getenv('OMH_CORAL_TALK_HOST'),
  FR_ENABLE: getenv.bool('FR_ENABLE', false),
  FR_API: getenv('FR_API'),
  FR_API_KEY: getenv('FR_API_KEY'),
  PLANET_LABS_API_KEY: getenv('PLANET_LABS_API_KEY'),
  DG_WMS_CONNECT_ID: getenv('DG_WMS_CONNECT_ID'),
  BING_KEY: getenv('BING_API_KEY'),
  SENTRY_DSN_PUBLIC: getenv('OMH_SENTRY_DSN_PUBLIC'),
  theme: getenv('OMH_THEME'),
  themeUrl: getenv('OMH_THEME_URL', ''),
  enableUserExport: getenv.bool('OMH_ENABLE_USER_EXPORT', false),
  manetUrl: getenv('OMH_MANET_URL'),
  tileServiceUrl: getenv('OMH_TILESERVICE_URL'),
  tileServiceInternalUrl: getenv('OMH_TILESERVICE_INTERNAL_URL'),
  MAPBOX_ACCESS_TOKEN: getenv('OMH_MAPBOX_TOKEN'),
  TILEHOSTING_GEOCODING_API_KEY: getenv('TILEHOSTING_GEOCODING_API_KEY'),
  TILEHOSTING_MAPS_API_KEY: getenv('TILEHOSTING_MAPS_API_KEY'),
  SENTRY_DSN: getenv('OMH_SENTRY_DSN'),
  MAILCHIMP_LIST_ID: getenv('OMH_MAILCHIMP_LIST_ID'),
  MAILCHIMP_API_KEY: getenv('OMH_MAILCHIMP_API_KEY'),
  useLocalAuth: getenv.bool('OMH_USE_LOCAL_AUTH', false),
  AUTH0_CLIENT_ID: getenv('AUTH0_CLIENT_ID'),
  AUTH0_CLIENT_SECRET: getenv('AUTH0_CLIENT_SECRET'),
  AUTH0_DOMAIN: getenv('AUTH0_DOMAIN'),
  AUTH0_CALLBACK_URL: getenv('AUTH0_CALLBACK_URL'),
  GOOGLE_ANALYTICS_ID: getenv('OMH_GOOGLE_ANALYTICS_ID'),
  FACEBOOK_APP_ID: getenv('OMH_FACEBOOK_APP_ID'),
  ENV_TAG: getenv('OMH_ENV_TAG'),
  SESSION_SECRET: getenv('OMH_SESSION_SECRET'),
  disableTracking: getenv.bool('OMH_DISABLE_TRACKING', false),
  mapHubsPro: getenv.bool('OMH_MAPHUBS_PRO', false),
  fromEmail: getenv('OMH_FROM_EMAIL'),
  adminEmail: getenv('OMH_ADMIN_EMAIL'),
  database: {
    host: getenv('DB_HOST'),
    user: getenv('DB_USER'),
    database: getenv('DB_DATABASE'),
    password: getenv('DB_PASS'),
    port: getenv('DB_PORT')
  },
  writeDebugData: getenv.bool('OMH_WRITEDEBUGDATA', false),
  requireLogin: getenv.bool('OMH_REQUIRE_LOGIN', false),
  requireInvite: getenv.bool('OMH_REQUIRE_INVITE', false),
  manetAPIKey: getenv('OMH_MANET_API_KEY'),
  useLocalAssets: getenv.bool('OMH_USE_LOCAL_ASSETS', false),
  elasticSearchIndexName: getenv('OMH_ELASTICSEARCH_INDEXNAME'),
  elasticSearchHost: getenv('OMH_ELASTICSEARCH_HOST'),
  elasticSearchPort: getenv('OMH_ELASTICSEARCH_PORT'),
  elasticSearchUser: getenv('OMH_ELASTICSEARCH_USER'),
  elasticSearchPass: getenv('OMH_ELASTICSEARCH_PASS')
}

module.exports = local
