import request, { gql } from 'graphql-request'
import { CrosschainMap } from '../crosschainMap'
import { Token, OmnibridgeList, OmnibridgeToken } from '../../types'
import { exportToJSON } from '../../utils'

// Taken from git@github.com:omni/omnibridge-ui.git
const ETH_XDAI_BRIDGE_CONFIG = {
  label: 'eth⥊gc',
  homeChainId: 100,
  foreignChainId: 1,
  enableForeignCurrencyBridge: true,
  foreignMediatorAddress: '0x88ad09518695c6c3712AC10a214bE5109a655671'.toLowerCase(),
  homeMediatorAddress: '0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d'.toLowerCase(),
  foreignAmbAddress: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e'.toLowerCase(),
  homeAmbAddress: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59'.toLowerCase(),
  foreignGraphName: 'raid-guild/mainnet-omnibridge',
  homeGraphName: 'raid-guild/xdai-omnibridge',
  ambLiveMonitorPrefix: 'https://alm-xdai.herokuapp.com',
  claimDisabled: false,
  tokensClaimDisabled: []
}

const SUBGRAPH_BASE_URL = 'https://api.thegraph.com/subgraphs/name/'

// To avoid implementation details prop names were changed to keep convention from-home, to-foreign
const homeTokensQuery = gql`
  query homeTokens {
    tokens(where: { homeAddress_contains: "0x" }, first: 1000) {
      homeChainId: foreignChainId
      foreignChainId: homeChainId
      homeAddress: foreignAddress
      foreignAddress: homeAddress
      homeName: foreignName
      foreignName: homeName
      symbol
      decimals
    }
  }
`

const fetchTokensFromSubgraph = async (debug = false) => {
  const homeData = await request<OmnibridgeList>(
    `${SUBGRAPH_BASE_URL}${ETH_XDAI_BRIDGE_CONFIG.homeGraphName}`,
    homeTokensQuery
  )

  if (debug) {
    await exportToJSON('_omnibridgeTokens', homeData.tokens)
  }

  return homeData.tokens
}

export const getOmnibridgeTokens = async (crosschainMap: CrosschainMap, debug = false) => {
  console.log('OMNIBRIDGE: Fetching tokens')
  const omnibridgeList = await fetchTokensFromSubgraph(debug)

  const brokenTokens: OmnibridgeToken[] = []

  console.log('OMNIBRIDGE: Adding tokens')

  omnibridgeList.forEach((token) => {
    if (
      !token.homeAddress ||
      !token.homeChainId ||
      !token.homeName ||
      !token.foreignName ||
      !token.foreignAddress ||
      !token.foreignChainId
    ) {
      brokenTokens.push(token)
      return
    }

    const homeToken: Token = {
      name: token.homeName.replace(/ from|on .*$/gi, '').replace(/USD\/\/C/gi, 'USD Coin'),
      decimals: token.decimals,
      symbol: token.symbol,
      address: token.homeAddress,
      chainId: token.homeChainId
    }

    const foreignToken: Token = {
      name: token.foreignName,
      decimals: token.decimals,
      symbol: token.symbol,
      address: token.foreignAddress,
      chainId: token.foreignChainId
    }

    crosschainMap.addPair(homeToken, foreignToken)
  })
}
