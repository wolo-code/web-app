'use strict';

const encode = require('./encode');
const decode = require('./decode');
const city = require('./city');

exports.encode = encode.encode;
exports.decode = decode.decode;
exports.emailOnCitySubmit = city.emailOnCitySubmit;
exports.add_city = city.add_city;
