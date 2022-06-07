import { clearFolders } from './src/utils'
import { CrosschainMap, defaultLists } from './src/crosschainMap'
import { createEcoBridgeCompliantSocketList } from './src/socket'

const init = async () => {
  const config = {
    debug: !!process.env.DEBUG ?? false,
    bidirectional: !!process.env.BIDIRECTIONAL ?? true
  }

  await clearFolders()

  const crosschainMap = new CrosschainMap()
  await crosschainMap.populateWith(defaultLists, config.debug)

  createEcoBridgeCompliantSocketList(crosschainMap, { ...config, shortList: true })
  createEcoBridgeCompliantSocketList(crosschainMap, { ...config, shortList: false })

  if (config.debug) {
    crosschainMap.toJSON()
  }
}

init()
