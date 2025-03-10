'use strict';

const fs = require('fs');
const pg = require('pg');
const {loadProvidersFromCache, saveProvidersToCache} = require('./cache');

let whitelistEndpoints = [];
const cacheWhitelistEndpoints = {};

// Load providers from cache on startup
(async () => {
  whitelistEndpoints = await loadProvidersFromCache();
})();

const basicAuth = (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.writeHead(401, {'WWW-Authenticate': 'Basic realm="Access to API"'});
    return res.end(JSON.stringify({message: 'Unauthorized: Missing Authorization Header'}));
  }

  const base64Credentials = authHeader.split(' ')[1];
  // eslint-disable-next-line no-undef
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.BASIC_AUTH_USER || 'admin';
  const validPassword = process.env.BASIC_AUTH_PASS || 'password123';

  if (username !== validUsername || password !== validPassword) {
    res.writeHead(401, {'WWW-Authenticate': 'Basic realm="Access to API"'});
    return res.end(JSON.stringify({message: 'Unauthorized: Invalid Credentials'}));
  }
};

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


/**
 * API Request Handler for `/providers` and `/refresh-providers`
 */
const requestHandler = (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // **Apply Basic Authentication for API Endpoints**
  if (req.url.startsWith('/providers') || req.url.startsWith('/refresh-providers')) {
    basicAuth(req, res);
    if (res.finished) {return;} // Stop if unauthorized
  }

  // **GET /providers - Retrieve the current provider list**
  if (req.method === 'GET' && req.url === '/providers') {
    res.writeHead(200);
    return res.end(JSON.stringify({message: 'Current providers', providers: whitelistEndpoints}));
  }

  // **POST /refresh-providers - Replace the whitelist**
  if (req.method === 'POST' && req.url === '/refresh-providers') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const {providers} = JSON.parse(body);
        if (!Array.isArray(providers) || providers.length === 0) {
          res.writeHead(400);
          return res.end(JSON.stringify({message: 'A list of providers is required'}));
        }

        whitelistEndpoints = [...new Set(providers)].sort();
        await saveProvidersToCache(whitelistEndpoints);

        res.writeHead(200);
        return res.end(JSON.stringify({message: 'Providers list refreshed successfully', providers: whitelistEndpoints}));
      } catch (error) {
        res.writeHead(400);
        return res.end(JSON.stringify({message: 'Invalid JSON data'}));
      }
    });
    return;
  }

  // **DELETE /refresh-providers - Remove providers from the list**
  if (req.method === 'DELETE' && req.url === '/refresh-providers') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const {providers} = JSON.parse(body);
        if (!Array.isArray(providers) || providers.length === 0) {
          res.writeHead(400);
          return res.end(JSON.stringify({message: 'A list of providers is required'}));
        }

        const initialLength = whitelistEndpoints.length;
        whitelistEndpoints = whitelistEndpoints.filter(endpoint => !providers.includes(endpoint));

        if (initialLength === whitelistEndpoints.length) {
          res.writeHead(404);
          return res.end(JSON.stringify({message: 'No matching providers found to delete'}));
        }

        await saveProvidersToCache(whitelistEndpoints);

        res.writeHead(200);
        return res.end(JSON.stringify({message: 'Providers deleted successfully', remainingProviders: whitelistEndpoints}));
      } catch (error) {
        res.writeHead(400);
        return res.end(JSON.stringify({message: 'Invalid JSON data'}));
      }
    });
    return;
  }

  // **If no matching route, return 404**
  res.writeHead(404);
  return res.end(JSON.stringify({message: 'Not Found'}));
};

module.exports = {
  isProviderAllowed,
  requestHandler, // **Export request handler**
};
