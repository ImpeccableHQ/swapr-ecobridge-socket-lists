import { getPolygonTokens } from './polygon'
import { getArbitrumTokens } from './arbitrum'
import { getOmnibridgeTokens } from './omnibridge'
import { CrosschainMappingList } from '../../types'
import { getOptimismTokens } from './optimism'
import { getSocketTokens } from './socket'

export const defaultLists: CrosschainMappingList[] = [getSocketTokens]
