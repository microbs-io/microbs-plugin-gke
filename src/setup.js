// Third-party packages
const quote = require('shell-quote').quote

// Main packages
const { config, context, logger, utils } = require('@microbs.io/core')

// Plugin packages
const probe = require('./probe.js')

/**
 * Validation for setting up GKE
 */
const validate = () => {
  const requiredFields = [
    'deployment.name',
    'plugins.gke.project_name',
    'plugins.gke.region_name',
    'plugins.gke.network_name',
    'plugins.gke.subnetwork_name',
    'plugins.gke.service_account_name',
  ]
  if (!utils.configHas(requiredFields)) {
    logger.error()
    logger.error(`You must set these variables in ${context.get('path.config')} to setup GKE:`)
    logger.error()
    logger.error(requiredFields)
    process.exit(1)
  }
}


module.exports = async () => {
  validate()
  logger.info('')
  logger.info(`Creating GKE cluster 'microbs-${config.get('deployment.name')}'...`)

  // Check if the GKE cluster exists
  if (await probe.status() === 'RUNNING')
    return logger.info(`...skipping. GKE cluster already exists.`)

  // Create GKE cluster
  const deploymentName = config.get('deployment.name')
  const projectName = config.get('plugins.gke.project_name')
  const regionName = config.get('plugins.gke.region_name')
  const networkName = config.get('plugins.gke.network_name')
  const subnetworkName = config.get('plugins.gke.subnetwork_name')
  const serviceAccountName = config.get('plugins.gke.service_account_name')
  const command = `
  gcloud container clusters create 'microbs-${utils.sanitize(deploymentName)}' \\
      --project "${utils.sanitize(projectName)}" \\
      --region "${utils.sanitize(regionName)}" \\
      --network "projects/${utils.sanitize(projectName)}/global/networks/${utils.sanitize(networkName)}" \\
      --subnetwork "projects/${utils.sanitize(projectName)}/regions/${utils.sanitize(regionName)}/subnetworks/${utils.sanitize(subnetworkName)}" \\
      --service-account "${utils.sanitize(serviceAccountName).replace('\\@', '@')}" \\
      --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \\
      --default-max-pods-per-node "110" \\
      --disk-size "32" \\
      --disk-type "pd-ssd" \\
      --enable-autorepair \\
      --enable-autoupgrade \\
      --enable-ip-alias \\
      --image-type "COS_CONTAINERD" \\
      --machine-type "e2-highcpu-8" \\
      --max-pods-per-node "110" \\
      --max-surge-upgrade 1 \\
      --max-unavailable-upgrade 0 \\
      --metadata disable-legacy-endpoints=true \\
      --no-enable-basic-auth \\
      --no-enable-intra-node-visibility \\
      --no-enable-master-authorized-networks \\
      --no-shielded-integrity-monitoring \\
      --no-shielded-secure-boot \\
      --num-nodes "1" \\
      --release-channel "regular"
  `
  const result = utils.exec(command, true)
  const exists = result.stderr ? result.stderr.includes('Already exists:') : false
  if (result.stderr)
    logger.warn(result.stderr)

  // Exit if there was an issue creating the cluster
  if (result.stderr && result.stderr.includes('ERROR:') && !exists)
    process.exit(1)

  // Verify that the GKE cluster was created
  if (await probe.status() === 'RUNNING') {
    logger.info('...acknowledged. GKE cluster created.')
    logger.info('')
    logger.info('Finished setting up GKE.')
  }
}
