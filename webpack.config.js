/* eslint import/no-extraneous-dependencies: ["error", { devDependencies: true }] */

const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const ZipPlugin = require('./plugins/zip')

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    background: './src/background/index.js',
    content: './src/content/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  devtool: false,
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new CopyPlugin([
      { from: 'manifest.json' },
      { from: 'icons', to: 'icons' }
    ]),
    new ZipPlugin({ path: 'mediacontrol@vldkn.net.xpi' })
  ]
}
