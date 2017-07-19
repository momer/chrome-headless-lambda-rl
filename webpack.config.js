const path = require('path')
const webpack = require('webpack')
 
const webpackDir = path.join(__dirname, '.webpack/')

module.exports = {
  entry: {
		requestLogger: './src/requestLogger.js',
	},
  target: 'node',
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: __dirname,
        exclude: /node_modules/
      },
      { test: /\.json$/, loader: 'json-loader' },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: webpackDir,
    filename: '[name].js'
  },
  externals: ['aws-sdk'],
}
