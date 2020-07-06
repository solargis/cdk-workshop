const { path: rootPath } = require('app-root-path')
const { resolve } = require('path')

const awsModules = ['aws-sdk', 'aws-sdk/clients/dynamodb', 'aws-sdk/clients/s3']
const layerModules = ['sharp']

const config = {
  mode: 'none',
  context: resolve(rootPath),
  entry: {
    'hello-lambda': './lib/api/hello-lambda.ts',
    'pin-lambda': './lib/api/pin-lambda.ts',
    'pin-socket-lambda': './lib/api/pin-socket-lambda.ts',
    'thumbnail-lambda': './lib/api/thumbnail-lambda.ts'
  },
  externals: [...awsModules, ...layerModules],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.api.json' }
          }
        ]
      }
    ]
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: resolve(rootPath, 'dist/api')
  },
  target: 'node',
  devtool: 'cheap-source-map'
}

module.exports = config
