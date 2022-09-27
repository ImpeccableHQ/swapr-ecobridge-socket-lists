import { getPolygonTokens } from './polygon'
import { getArbitrumTokens } from './arbitrum'
import { getOmnibridgeTokens } from './omnibridge'
import { CrosschainMappingList } from '../../types'
import { getOptimismTokens } from './optimism'
// import { getSushiswapTokens } from './sushiswap'

export const defaultLists: CrosschainMappingList[] = [
  getOmnibridgeTokens,
  getPolygonTokens,
  getArbitrumTokens,
  getOptimismTokens
  //  getSushiswapTokens
]
