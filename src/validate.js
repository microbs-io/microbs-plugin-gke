/*
 * validate.js
 */

// Third-party packages
const hasbin = require('hasbin')
const semver = require('semver')

// Main packages
const { config, logger, utils } = require('@microbs.io/core')

/**
 * Validate gcloud installation
 */
const validateGcloudInstallation = () => {
  if (hasbin.sync('gcloud'))
    return [{
      success: true,
      message: 'gcloud is installed'
    }]
  else
    return [{
      success: false,
      message: 'gcloud is not installed'
    }]
}

/**
 * Validate gcloud version
 */
const validateGcloudVersion = () => {
  const result = utils.exec('gcloud version', true)
  if (result.stdout) {
    try {
      versionActual = semver.clean(result.stdout.match(/Google Cloud SDK (.+)/)[1])
      versionRequired = semver.clean('372.0.0')
      if (semver.gte(versionActual, versionRequired))
        return [{
          success: true,
          message: `gcloud is correct version [using=${versionActual}, required>=${versionRequired}]`
        }]
      else
        return [{
          success: false,
          message: `gcloud is incorrect version [using=${versionActual}, required>=${versionRequired}]`
        }]
    } catch (e) {
      logger.error(e)
    }
  } else {
    logger.warn(result.stderr)
  }
}

/**
 * Validate the fields and values of the given config file.
 */
const validateConfig = () => {
  try {
    config.init()
  } catch (e) {
    logger.error(e)
    return [{
      success: false,
      message: 'failed to load config.'
    }]
  }

  // Validate required fields
  const requiredAlways = [
    'plugins.gke.project_name',
    'plugins.gke.region_name',
    'plugins.gke.network_name',
    'plugins.gke.subnetwork_name',
    'plugins.gke.service_account_name',
    'plugins.gke.service_account_key_path',
  ]
  const results = []
  var hasErrors = false
  for (var i in requiredAlways) {
    if (!config.get(requiredAlways[i])) {
      hasErrors = true
      results.push({
        success: false,
        message: `'${requiredAlways[i]}' is required but missing from gke plugin config.`
      })
    }
  }
  if (!hasErrors)
    results.push({
      success: true,
      message: 'no problems detected in gke plugin config.'
    })
  return results
}

module.exports = async () => {
  const results = []
  for (var result in validateGcloudInstallation())
    results.push(result)
  for (var result in validateGcloudVersion())
    results.push(result)
  for (var result in validateConfig())
    results.push(result)
  return results
}
