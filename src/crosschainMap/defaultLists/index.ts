import { getPolygonTokens } from './polygon'
import { getArbitrumTokens } from './arbitrum'
import { getOmnibridgeTokens } from './omnibridge'
import { CrosschainMappingList } from '../../types'

export const defaultLists: CrosschainMappingList[] = [getOmnibridgeTokens, getPolygonTokens, getArbitrumTokens]
