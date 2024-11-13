'use strict';

const fs = require('fs');
const providerJSONFileExists = fs.existsSync(process.env.PROVIDER_JSON_FILE);

let whitelistEndpoints = [];
const cacheWhitelistEndpoints = {};

let client = null;

if (providerJSONFileExists) {
  console.log(`Reading providers JSON from ${process.env.PROVIDER_JSON_FILE} file.`);

  try {
    whitelistEndpoints = JSON.parse(fs.readFileSync(process.env.PROVIDER_JSON_FILE, 'utf8'));
    whitelistEndpoints.sort();
  } catch (e) {
    console.error(`Error reading providers JSON: ${e}`);
  }
} else {
  const pg = require('pg');

  client = new pg.Client({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    database: process.env.POSTGRES_DB,
  });

  client.connect().then(() => {
    console.log('Connected to PostgreSQL database');

    const query = {
      name: 'fetch-providers',
      text: 'SELECT "FHIR_api_base_uri" FROM core_provider where use_proxy = true',
    };

    client.query(query).then((result) => {
      result.rows?.forEach(row => {
        whitelistEndpoints.push(row['FHIR_api_base_uri']);
      });
      whitelistEndpoints.sort();
    }).catch((err) => {
      console.error(err);
    });

  }).catch((err) => {
    console.error('Error connecting to PostgreSQL database', err);
  });
}


function binarySearchClosest(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  let insertIndex = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < target) {
      left = mid + 1;
      insertIndex = mid; // potential match that's less than target
    } else {
      right = mid - 1;
    }
  }

  return insertIndex;
}


function matchEndpoint(testEndpoint) {

  // Find the closest index with a binary search
  const closestIndex = binarySearchClosest(whitelistEndpoints, testEndpoint);

  // If no valid match found, return false
  if (closestIndex === -1) {return false;}

  // Check if the closest endpoint is a substring of the testEndpoint
  const closestEndpoint = whitelistEndpoints[closestIndex];
  return testEndpoint.includes(closestEndpoint);
}


const isProviderAllowed = (providerEndpoint) => {
  if (cacheWhitelistEndpoints[providerEndpoint]) {
    return true;
  }

  if (matchEndpoint(providerEndpoint)) {
    cacheWhitelistEndpoints[providerEndpoint] = true;
    return true;
  }
  return false;
};

module.exports = isProviderAllowed;

