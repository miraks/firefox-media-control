/* eslint import/no-extraneous-dependencies: ["error", { devDependencies: true }] */

const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const ZipPlugin = require('./plugins/zip')

const extractSass = new ExtractTextPlugin({ filename: '[name].css' })

module.exports = {
  entry: {
    background: './src/background/index.js',
    content: './src/content/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          plugins: [['transform-object-rest-spread', { useBuiltIns: true }], ['transform-class-properties']]
        }
      },
      {
        test: /\.sass$/,
        use: extractSass.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader']
        })
      }
    ]
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
    extractSass,
    new CopyPlugin([{ from: 'manifest.json' }, { from: 'icons', to: 'icons' }]),
    new ZipPlugin({ path: 'mediacontrol@vldkn.net.xpi' })
  ]
}
