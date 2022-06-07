import { v4 as uuidv4 } from 'uuid'
import { exportToJSON } from '../utils'
import {
  CrosschainMapContainer,
  CrosschainMappingList,
  CrosschainToken,
  LogEntry,
  TokenBaseParams,
  Token,
  TokenMapByChain,
  FileNames,
  Folders
} from '../types'

export class CrosschainMap {
  // Classic token map however each token keeps id to ecoToken
  public tokenMapByChain: TokenMapByChain = {
    1: {},
    4: {},
    100: {},
    137: {},
    42161: {},
    421611: {}
  }

  public crosschainMap: CrosschainMapContainer = {}
  public log: LogEntry[] = []

  public populateWith = async (lists: CrosschainMappingList[], debug = false) => {
    if (lists.length === 0) {
      console.log('No lists to load')
      return
    }

    for (const list of lists) {
      await list(this, debug)
    }
  }

  private addLog = (error: LogEntry) => {
    if (error.type === 'error') {
      console.log(error)
    }
    this.log.push(error)
  }

  public getTokenIDByAddress = ({ address, chainId }: TokenBaseParams) =>
    this.tokenMapByChain[chainId][address.toLowerCase()]?.id

  public getCrosschainTokenByAddress = ({ address, chainId }: TokenBaseParams) => {
    const id = this.getTokenIDByAddress({ address, chainId })
    if (!id) return undefined
    return this.crosschainMap[id]
  }

  private updateCrosschainToken = (id: string, tokenToAdd: Token) => {
    const crosschainToken = this.crosschainMap[id]

    if (!crosschainToken) {
      this.addLog({
        id,
        message: 'CrosschainToken not found',
        method: 'updateCrosschainToken',
        tokenA: tokenToAdd,
        type: 'error'
      })

      return
    }
    const chainId = tokenToAdd.chainId

    // Run some diagnostics
    if (
      crosschainToken.addresses[chainId] &&
      crosschainToken.addresses[chainId] !== tokenToAdd.address.toLowerCase() &&
      crosschainToken.decimals !== tokenToAdd.decimals
    ) {
      this.addLog({
        id,
        message: "Addresses/decimals doesn't match, something is wrong",
        method: 'updateCrosschainToken',
        tokenA: tokenToAdd,
        crosschainToken,
        type: 'error'
      })

      return
    }

    crosschainToken.addresses[chainId] = tokenToAdd.address.toLowerCase()
  }

  private updateTokenMap = (id: string, token: Token) => {
    const mappedToken = this.tokenMapByChain[token.chainId][token.address.toLowerCase()]

    if (mappedToken && mappedToken.id === id) {
      this.addLog({
        id,
        message: 'Token already added',
        method: 'updateTokenMap',
        tokenA: token,
        crosschainToken: this.crosschainMap[id],
        type: 'warn'
      })

      return
    }

    // Token can have more props, so let's limit it
    const { address, chainId, decimals, name, symbol } = token
    this.tokenMapByChain[token.chainId][address.toLowerCase()] = {
      id,
      address: address.toLowerCase(),
      chainId,
      decimals,
      name,
      symbol
    }
  }

  private addCrosschainToken = (token: Token) => {
    const id = uuidv4()
    const { address, chainId, decimals, name, symbol } = token

    const crosschainToken: CrosschainToken = {
      id,
      decimals,
      name,
      symbol,
      addresses: {
        [chainId]: address.toLowerCase()
      }
    }

    this.crosschainMap[id] = crosschainToken

    return id
  }

  // Updates or creates new crosschainToken basing on provided token pair.
  // It checks if any of provided tokens are associated (has id) with crosschainToken.

  // If any of them is associated then existing crosschainToken is retrieved
  // and updated with other token data. Token is then added to tokenMapByChain.

  // If none of them are mapped then crosschainToken is created, filled with both tokens data
  // and tokens are added to tokenMapByChain.

  // If both tokens are mapped nothing happends
  public addPair = (tokenA: Token, tokenB: Token) => {
    const tokenAId = this.getTokenIDByAddress(tokenA)
    const tokenBId = this.getTokenIDByAddress(tokenB)

    if (tokenAId && tokenBId) {
      this.addLog({
        message: 'Both addresses are already mapped',
        method: 'addPair',
        type: 'warn',
        crosschainToken: this.crosschainMap[tokenAId],
        id: tokenAId,
        tokenA,
        tokenB
      })
      return tokenAId
    }

    let id = tokenAId || tokenBId

    if (!id) {
      id = this.addCrosschainToken(tokenA)
    } else {
      this.updateCrosschainToken(id, tokenA)
    }

    this.updateTokenMap(id, tokenA)
    this.updateCrosschainToken(id, tokenB)
    this.updateTokenMap(id, tokenB)

    return id
  }

  public addPairs = (tokens: { tokenA: Token; tokenB: Token }[]) => {
    tokens.forEach(({ tokenA, tokenB }) => {
      this.addPair(tokenA, tokenB)
    })
  }

  private createStats = () => {
    // Logs
    const logCt = this.log.length
    const errorsCt = this.log.filter(({ type }) => type === 'error').length

    // EcoMap
    const tokens = Object.values(this.crosschainMap)
    const tokensCt = tokens.length

    const mappedTokens = tokens.reduce<{
      mappedTokensCt: number
      mappedTokensCtByCt: { [key: number]: number }
      mappedTokensCtByChain: { [key: string]: number }
      orphanTokensCtByChain: { [key: string]: number }
    }>(
      (total, token) => {
        const mappedChains = Object.keys(token.addresses)
        const mappedAddressesCt = mappedChains.length

        if (!total.mappedTokensCtByCt[mappedAddressesCt]) {
          total.mappedTokensCtByCt[mappedAddressesCt] = mappedAddressesCt
        } else {
          total.mappedTokensCtByCt[mappedAddressesCt]++
        }

        if (mappedAddressesCt < 2) {
          const unpairedChainId = mappedChains[0]

          if (!total.orphanTokensCtByChain[unpairedChainId]) {
            total.orphanTokensCtByChain[mappedChains[0]] = 1
          } else {
            total.orphanTokensCtByChain[mappedChains[0]]++
          }

          return total
        }

        total.mappedTokensCt++

        mappedChains.forEach((chain) => {
          if (!total.mappedTokensCtByChain[chain]) {
            total.mappedTokensCtByChain[chain] = 1
          } else {
            total.mappedTokensCtByChain[chain]++
          }
        })

        return total
      },
      { mappedTokensCtByCt: {}, mappedTokensCtByChain: {}, orphanTokensCtByChain: {}, mappedTokensCt: 0 }
    )

    const orphanTokensCt = tokensCt - mappedTokens.mappedTokensCt

    const stats = {
      logCt,
      errorsCt,
      tokensCt,
      orphanTokensCt,
      ...mappedTokens
    }

    return stats
  }

  public toJSON = async (debug = false) => {
    const tokenMaps = Object.entries(this.tokenMapByChain).reduce<Promise<void>[]>((total, [chainId, map]) => {
      if (Object.keys(map).length > 0) {
        total.push(exportToJSON(`${FileNames.TOKEN_MAP}-${chainId}`, map, Folders.LISTS))
      }

      return total
    }, [])

    const exports = [
      ...tokenMaps,
      exportToJSON(FileNames.CROSSCHAIN_MAP, this.crosschainMap, Folders.LISTS),
      exportToJSON(FileNames.TOKEN_MAP, this.tokenMapByChain, Folders.LISTS)
    ]

    if (debug) {
      const stats = this.createStats()

      exports.push(exportToJSON(FileNames.LOG, this.log), exportToJSON(FileNames.STATS, stats))

      console.log(stats)
    }

    await Promise.all(exports)
  }
}
