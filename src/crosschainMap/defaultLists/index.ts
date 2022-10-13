import { CrosschainMappingList } from '../../types'
import { getSocketTokens } from './socket'

export const defaultLists: CrosschainMappingList[] = [getSocketTokens]
