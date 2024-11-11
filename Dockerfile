FROM node:20.10.0

RUN apt-get install bash

RUN mkdir /code
WORKDIR /code

RUN mkdir /.yarn
RUN chmod 777 /.yarn
RUN touch /.yarnrc
RUN chmod 777 /.yarnrc
RUN mkdir -p /.cache/yarn
RUN chmod 777 /.cache/yarn

ENV HOME=/tmp

COPY ./ /code/

RUN yarn install
