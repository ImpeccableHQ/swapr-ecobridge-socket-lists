import fetch from 'node-fetch'
import { exportToJSON } from '../../utils'
import { CrosschainMap } from '../crosschainMap'
import { PolygonMapperResponse, PolygonToken, SupportedChains, Token } from '../../types'

const POLYGON_MAPPER_URL = 'https://tokenmapper.api.matic.today/api/v1/mapping'

const fetchPolygonTokens = async (debug = false) => {
  const url = POLYGON_MAPPER_URL
  const offsetSize = 200

  const baseSearchParams = {
    map_type: '["POS"]',
    chain_id: '137',
    limit: offsetSize.toString()
  }

  const urlWithParams = (offset = 0) =>
    `${url}?${new URLSearchParams({
      ...baseSearchParams,
      offset: offset.toString()
    })}`

  let nextPage = true
  let offset = 0

  const tokens: PolygonToken[] = []

  while (nextPage) {
    const response = await fetch(urlWithParams(offset))
    const responseJson: PolygonMapperResponse = await response.json()

    tokens.push(...responseJson.data.mapping)

    offset += offsetSize
    nextPage = responseJson.data.has_next_page
  }

  if (debug) {
    await exportToJSON('_polygonTokens', tokens)
  }

  return tokens
}

export const getPolygonTokens = async (crosschainMap: CrosschainMap, debug = false) => {
  console.log('POLYGON: Fetching tokens')
  const polygonTokens = await fetchPolygonTokens(debug)
  const brokenWETH = ['0xa45b966996374E9e65ab991C6FE4Bfce3a56DDe8', '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE']
  const brokenTokens: PolygonToken[] = []

  console.log('POLYGON: Adding tokens')

  polygonTokens.forEach((token) => {
    // Someone put WETH under this address
    if (!token.name || brokenWETH.includes(token.root_token)) {
      brokenTokens.push(token)
      return
    }

    const normalizedName = token.name.replace(/ \(POS\)/gi, '')

    const mainnetToken: Token = {
      name: normalizedName,
      decimals: token.decimals,
      symbol: token.symbol,
      address: token.root_token,
      chainId: SupportedChains.MAINNET
    }

    const polygonToken: Token = {
      name: normalizedName,
      decimals: token.decimals,
      symbol: token.symbol,
      address: token.child_token,
      chainId: SupportedChains.POLYGON
    }

    crosschainMap.addPair(mainnetToken, polygonToken)
  })

  // Add WETH

  const WETHMainnet: Token = {
    decimals: 18,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    chainId: 1,
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  }

  const WETHPolygon = {
    ...WETHMainnet,
    chainId: 137,
    address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
  }

  crosschainMap.addPair(WETHMainnet, WETHPolygon)
}
