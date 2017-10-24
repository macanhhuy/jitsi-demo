/* global __dirname */

const process = require('process');
const webpack = require('webpack');

const minimize
    = process.argv.indexOf('-p') !== -1
        || process.argv.indexOf('--optimize-minimize') !== -1;
const plugins = [
    new webpack.LoaderOptionsPlugin({
        debug: !minimize,
        minimize
    })
];

if (minimize) {
    plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
    plugins.push(new webpack.optimize.UglifyJsPlugin({
        compress: {
            warnings: true
        },
        extractComments: true,
        sourceMap: true
    }));
}

module.exports = {
    devtool: 'source-map',
    entry: {
        'lib-jitsi-meet': './index.js'
    },
    module: {
        rules: []
    },
    node: {
        // Allow the use of the real filename of the module being executed. By
        // default Webpack does not leak path-related information and provides a
        // value that is a mock (/index.js).
        __filename: true
    },
    output: {
        filename: `[name]${minimize ? '.min' : ''}.js`,
        library: 'JitsiMeetJS',
        libraryTarget: 'umd',
        sourceMapFilename: `[name].${minimize ? 'min' : 'js'}.map`
    },
    plugins
};