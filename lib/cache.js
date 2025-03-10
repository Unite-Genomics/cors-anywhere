const FileSystemCache = require('file-system-cache').default || require('file-system-cache');

// Initialize cache (cache folder: `.cache/`)
// eslint-disable-next-line new-cap
const cache = FileSystemCache({
  basePath: './.cache', // Where cached files are stored
  ns: 'providers', // Namespace to avoid conflicts
});

// Function to save the provider list to cache
const saveProvidersToCache = async (providers) => {
  await cache.set('whitelistEndpoints', providers);
};

// Function to load the provider list from cache
const loadProvidersFromCache = async () => {
  return (await cache.get('whitelistEndpoints')) || [];
};

module.exports = {saveProvidersToCache, loadProvidersFromCache};
