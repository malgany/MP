const path = require('path');

module.exports = {
    ...require('./core'),
    ...require('./renderer'),
    bundleDir: path.join(__dirname, 'bundle'),
    chunkFiles: ['index-chunk-1.js', 'index-chunk-2.js', 'index-chunk-3.js'],
};
