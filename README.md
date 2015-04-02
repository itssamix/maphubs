# OpenRoads API
[![Build Status](https://magnum.travis-ci.com/developmentseed/openroads-api.svg?token=d4tUG3NhuWNZYSxWndVL&branch=develop)](https://magnum.travis-ci.com/developmentseed/openroads-api)

The OpenRoads API is part of the [OpenRoads project](https://github.com/developmentseed/openroads).

## Contributing

### Installing dependencies
```sh
git clone git@github.com:developmentseed/openroads-api.git
cd openroads
npm install
```

### Local configuration

Before running the server, you will need to create `local.js` in your root directory to include directions to the postgresql database. You'll want to include the following:


```javascript
module.exports.connections = {
  osmPostgreSQL: {
    adapter: 'sails-postgresql',
    url: 'postgres://USER:PASSWORD@HOST:POST/DATABASE',
    pool: false,
    ssl: false
  }
}
```

### Installing a database with docker

The `db-server` directory contains instructions on running your own postgresql database with the appropriate table schema using Docker. For Mac OS X users you might need [docker-machine](https://github.com/docker/machine) or [Kitematic](https://kitematic.com/)


### Running

To run the server, run the following command:

```sh
npm start
```

To test the bounding box query:

```sh
curl http://localhost:1337/xml/map?bbox=123.81042480468751,9.584500864717155,123.81591796875,9.58991730708743
```