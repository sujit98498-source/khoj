// metro.config.js
// Enables monorepo path resolution so @khoj/shared and @khoj/firebase
// packages can be imported from apps/mobile without publishing to npm.

const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Project root is apps/mobile; repo root is two levels up
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

config.watchFolders = [workspaceRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = config
