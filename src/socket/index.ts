import fetch from 'node-fetch'
import { clearFolders, exportToJSON, parseResponse } from '../utils'
import { CrosschainMap, defaultLists } from '../crosschainMap'
import { crosschainTokenListToTokenList } from '../crosschainMap/converter'
import { CrosschainToken, SupportedChains, SocketBaseResponse, SocketToken, Folders, Token } from '../types'

const SOCKET_BASE_URL = 'https://backend.movr.network/v2/'
const SOCKET_PUBLIC_API_KEY = '645b2c8c-5825-4930-baf3-d9b997fcd88c'

const SOCKET_ENDPOINTS = {
  FETCH_FROM_TOKENS: `${SOCKET_BASE_URL}token-lists/from-token-list`,
  FETCH_TO_TOKENS: `${SOCKET_BASE_URL}token-lists/to-token-list`
}
const headers: HeadersInit = { 'API-KEY': SOCKET_PUBLIC_API_KEY }

const fetchSocketTokenLists = async ({
  fromChainId,
  toChainId,
  debug = false,
  shortList = true
}: {
  fromChainId: string
  toChainId: string
  debug?: boolean
  shortList?: boolean
}) => {
  const urlWithParams = (url: string) =>
    `${url}?${new URLSearchParams({
      fromChainId,
      toChainId,
      singleTxOnly: 'true',
      ...(shortList && { isShortList: 'true' })
    })}`

  const fromTokenListPromise = parseResponse<SocketBaseResponse<SocketToken[]>>(
    fetch(urlWithParams(SOCKET_ENDPOINTS.FETCH_FROM_TOKENS), {
      headers
    })
  )

  const toTokenListPromise = parseResponse<SocketBaseResponse<SocketToken[]>>(
    fetch(urlWithParams(SOCKET_ENDPOINTS.FETCH_TO_TOKENS), {
      headers
    })
  )

  const [fromTokenList, toTokenList] = await Promise.all([fromTokenListPromise, toTokenListPromise])

  if (debug) {
    exportToJSON(`${fromChainId}-${toChainId}-from`, fromTokenList)
    exportToJSON(`${toChainId}-${fromChainId}-to`, toTokenList)
  }

  return {
    fromTokenList: fromTokenList.result,
    toTokenList: toTokenList.result
  }
}

const getListsIntersection = (fromList: SocketToken[], toList: SocketToken[], crosschainMap: CrosschainMap) => {
  const fromChainId = fromList[0].chainId as SupportedChains

  if (!fromChainId) return []

  return toList.reduce<CrosschainToken[]>((total, token) => {
    const crosschainToken = crosschainMap.getCrosschainTokenByAddress(token)

    const fromTokenAddress = crosschainToken?.addresses[fromChainId]

    if (!fromTokenAddress) return total // no pair has been mapped

    const fromToken = fromList.find((fromToken) => fromToken.address.toLowerCase() === fromTokenAddress.toLowerCase())

    if (!fromToken) return total // we got the address of pair token but it's not present on toList so it can't be bridged 1:1

    // add icon and return crosschainToken for further mappigns
    const pairedToken: CrosschainToken = { ...crosschainToken, logoURI: token.icon }

    total.push(pairedToken)

    return total
  }, [])
}

const getBidirectionalList = (listA: CrosschainToken[], listB: CrosschainToken[]) => {
  const cache = new Map()

  const bidirectionalList = [...listA, ...listB].reduce<CrosschainToken[]>((total, token) => {
    if (cache.has(token.id)) {
      total.push(token)
    } else {
      cache.set(token.id, null)
    }
    return total
  }, [])

  return bidirectionalList
}

const createSocketList = async ({
  chainA,
  chainB,
  crosschainMap,
  debug = false,
  shortList = false,
  bidirectional = false
}: Record<'chainA' | 'chainB', SupportedChains> & {
  crosschainMap: CrosschainMap
  debug?: boolean
  shortList?: boolean
  bidirectional?: boolean
}) => {
  // Fetch tokens from socket API both ways

  const { fromTokenList: fromChainA, toTokenList: toChainB } = await fetchSocketTokenLists({
    fromChainId: chainA.toString(),
    toChainId: chainB.toString(),
    debug,
    shortList
  })

  const { fromTokenList: fromChainB, toTokenList: toChainA } = await fetchSocketTokenLists({
    fromChainId: chainB.toString(),
    toChainId: chainA.toString(),
    debug,
    shortList
  })

  const ABCrosschainList = getListsIntersection(fromChainA, toChainB, crosschainMap)
  const BACrosschainList = getListsIntersection(fromChainB, toChainA, crosschainMap)

  const ABList = crosschainTokenListToTokenList(chainA, chainB, ABCrosschainList)
  const BAList = crosschainTokenListToTokenList(chainA, chainB, BACrosschainList)

  if (bidirectional) {
    const bidirectionalCrosschainList = getBidirectionalList(ABCrosschainList, BACrosschainList)
    const bidirectionalList = crosschainTokenListToTokenList(chainA, chainB, bidirectionalCrosschainList)
    return [bidirectionalList]
  }

  return [ABList, BAList]
}

const createPairs = (arr: SupportedChains[]) => arr.map((v, i) => arr.slice(i + 1).map((w) => [v, w])).flat()

export const createEcoBridgeCompliantSocketList = async (
  debug: boolean,
  bidirectional: boolean,
  shortList: boolean
) => {
  // clear folders
  await clearFolders()

  const crosschainMap = new CrosschainMap()
  await crosschainMap.populateWith(defaultLists)

  const productionChains = [
    SupportedChains.MAINNET,
    SupportedChains.ARBITRUM,
    SupportedChains.GNOSIS,
    SupportedChains.POLYGON
  ]

  const chainPairs = createPairs(productionChains)

  const listToExport: { [k: string]: Token[] } = {}

  for (const pair of chainPairs) {
    const [chainA, chainB] = pair

    if (bidirectional) {
      const [bidirectionalList] = await createSocketList({
        chainA,
        chainB,
        crosschainMap,
        debug,
        shortList,
        bidirectional
      })

      const key = `${Math.min(chainA, chainB)}-${Math.max(chainA, chainB)}`

      if (debug) await exportToJSON(key, bidirectionalList)

      listToExport[key] = bidirectionalList
    } else {
      const [ABList, BAList] = await createSocketList({
        chainA,
        chainB,
        crosschainMap,
        debug,
        shortList,
        bidirectional
      })

      const keyAB = `${chainA}-${chainB}`
      const keyBA = `${chainB}-${chainA}`

      if (debug) {
        await exportToJSON(keyAB, ABList)
        await exportToJSON(keyBA, BAList)
      }

      listToExport[keyAB] = ABList
      listToExport[keyBA] = BAList
    }
  }

  if (debug) {
    crosschainMap.toJSON()
  }

  exportToJSON('SocketList', listToExport, Folders.LISTS)
}
