const os = require('os');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// LAN IPv4 addresses of the dev machine. The mobile app fetches this so it can
// reach the API over the network without depending on `adb reverse` for the API
// port (which is easily lost). Only reachable in development while Metro runs.
function getLanIPv4s() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

const config = {
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        if (req.url === '/__host_ips') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ips: getLanIPv4s() }));
          return;
        }
        // Allow connections from any device on the network
        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
