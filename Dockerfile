FROM ubuntu:16.04

ENV DEBIAN_FRONTEND noninteractive

#MapHubs Web Server
MAINTAINER Kristofor Carle - MapHubs <kris@maphubs.com>

#update and install basics
RUN apt-get update && \
apt-get install -y wget git curl libssl-dev openssl nano unzip python build-essential g++ gdal-bin zip imagemagick libpq-dev && \
apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

#install node
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash
RUN apt-get install -y nodejs && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN npm install -g yarnpkg/yarn#6e6b613cb592d861e28fd07744252bc780536080

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock
RUN yarn install

#install iD
RUN git clone -b maphubs-dev --single-branch https://github.com/openmaphub/iD.git

COPY . /app
RUN chmod +x /app/docker-entrypoint.sh

#copy environment specific config file
COPY env/deploy_local.js  /app/local.js

#create temp folders
RUN mkdir -p public && mkdir -p temp/uploads  && mkdir -p temp/logs

#rebuild client files
RUN node node_modules/webpack/bin/webpack.js --config webpack.config.min.js

VOLUME ["/app/temp/uploads"]
VOLUME ["/app/logs"]

EXPOSE 4000
ENV NODE_ENV production

ENV DEBUG maphubs:*
CMD /app/docker-entrypoint.sh
