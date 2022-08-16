import { CrosschainMap } from './crosschainMap'

export enum SupportedChains {
  MAINNET = 1,
  RINKEBY = 4,
  OPTIMISM_MAINNET = 10,
  GNOSIS = 100,
  POLYGON = 137,
  ARBITRUM = 42161,
  ARBITRUM_RINKEBY = 421611
}

export enum Folders {
  DEBUG = 'debug',
  LISTS = 'lists'
}

export enum FileNames {
  CROSSCHAIN_MAP = 'crosschainMap',
  SOCKET_LIST = 'socketList',
  TOKEN_MAP = `tokenMap`,
  LOG = 'debugLog',
  STATS = 'stats'
}

export const PRODUCTION_CHAINS = [
  SupportedChains.MAINNET,
  SupportedChains.ARBITRUM,
  SupportedChains.GNOSIS,
  SupportedChains.POLYGON,
  SupportedChains.OPTIMISM_MAINNET
]

export type Meta = {
  id: string
  creationDate: string
}

export type CommonTokenProps = {
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

export type Token = CommonTokenProps & {
  chainId: SupportedChains
  address: string
}

export type MappedToken = Token & {
  id: string
}

export type TokenMap = {
  [address: string]: MappedToken
}

export type TokenMapByChain = {
  [chain in SupportedChains]: TokenMap
}

export type CrosschainToken = CommonTokenProps & {
  id: string
  logoURI?: string
  addresses: { [chain in SupportedChains]?: string }
}

export type CrosschainMapContainer = {
  [id: string]: CrosschainToken
}

export type CrosschainMappingList = (crosschainMap: CrosschainMap, printJSON?: boolean) => Promise<void>

export interface PolygonToken {
  chainId: number
  child_address_passed_by_user: boolean
  child_token: string // polygon
  count: number
  created_at: string
  decimals: number
  deleted: boolean
  id: number
  map_type: string
  mintable: boolean
  name: string
  new_child_token: string
  new_mintable: boolean
  owner: string
  reason: string
  reason_for_remapping: string
  remapping_allowed: boolean
  remapping_request_submitted: boolean
  remapping_verified: boolean
  root_token: string // mainnet
  status: number
  symbol: string
  token_type: string
  updated_at: string
  uri: string
}

export interface PolygonMapperResponse {
  data: {
    has_next_page: boolean
    limit: number
    mapping: PolygonToken[]
    offset: number
  }
  mappedCount: number
  message: string
  requestsCount: number
}

export type TokenBaseParams = {
  chainId: SupportedChains
  address: string
}

export interface LogEntry {
  id?: string
  tokenA?: Token
  tokenB?: Token
  method: string
  message: string
  crosschainToken?: CrosschainToken
  type: 'warn' | 'error'
}

export interface OmnibridgeToken {
  homeChainId: number | null
  foreignChainId: number
  homeAddress: string | null
  foreignAddress: string
  homeName: string | null
  foreignName: string
  symbol: string
  decimals: number
}

export interface OmnibridgeList {
  tokens: OmnibridgeToken[]
}

export interface SocketBaseResponse<ResBody> {
  success: boolean
  result: ResBody
}

export interface SocketToken {
  address: string
  chainId: number
  decimals: number
  icon: string
  name: string
  symbol: string
}

export interface Version {
  readonly major: number
  readonly minor: number
  readonly patch: number
}

export interface Tags {
  readonly [tagId: string]: {
    readonly name: string
    readonly description: string
  }
}

export interface TokenInfo {
  readonly chainId: number
  readonly address: string
  readonly name: string
  readonly decimals: number
  readonly symbol: string
  readonly logoURI?: string
  readonly tags?: string[]
  readonly extensions?: {
    readonly [key: string]: string | number | boolean | null
  }
}

export interface TokenList {
  readonly name: string
  readonly timestamp: string
  readonly version: Version
  readonly tokens: TokenInfo[]
  readonly keywords?: string[]
  readonly tags?: Tags
  readonly logoURI?: string
}
