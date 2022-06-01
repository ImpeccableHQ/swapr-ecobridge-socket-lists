import { createEcoBridgeCompliantSocketList } from './src/socket'

const debug = !!process.env.DEBUG ?? false
const bidirectional = !!process.env.BIDIRECTIONAL ?? true
const shortList = !!process.env.SHORT_LIST ?? true

createEcoBridgeCompliantSocketList(debug, bidirectional, shortList)
