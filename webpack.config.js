var path = require('path');
var webpack = require('webpack');
var autoprefixer = require('autoprefixer');

module.exports = [{
    devtool: 'eval',
    entry: {
        'react-dragarea': './modules/index',
        'examples': './examples/src/index',
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'var',
        library: 'ReactDragarea',
    },
    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'react-dragarea': 'ReactDragarea',
    },
    module: {
        loaders: [{
            test: /\.scss$/,
            loaders: ['style', 'css?-minimize', 'postcss', 'sass'],
        }, {
            test: /\.css$/,
            loaders: ['style', 'css?-minimize', 'postcss'],
        }, {
            test: /\.js$/,
            loaders: ['babel'],
        }],
    },
    postcss: () => [autoprefixer],
}];
