import { clearFolders } from './src/utils'
import { CrosschainMap, defaultLists } from './src/crosschainMap'
import { createEcoBridgeCompliantSocketList } from './src/socket'

const init = async () => {
  const debug = !!process.env.DEBUG ?? false

  await clearFolders()

  const crosschainMap = new CrosschainMap()
  await crosschainMap.populateWith(defaultLists, debug)
  crosschainMap.toJSON(debug)

  createEcoBridgeCompliantSocketList(crosschainMap, { debug, bidirectional: false, shortList: true })
  createEcoBridgeCompliantSocketList(crosschainMap, { debug, bidirectional: false, shortList: false })
  createEcoBridgeCompliantSocketList(crosschainMap, { debug, bidirectional: true, shortList: true })
  createEcoBridgeCompliantSocketList(crosschainMap, { debug, bidirectional: true, shortList: false })
}

init()
