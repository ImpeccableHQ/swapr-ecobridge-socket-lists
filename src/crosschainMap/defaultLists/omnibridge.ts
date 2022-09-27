import request, { gql } from 'graphql-request'
import { CrosschainMap } from '../crosschainMap'
import { Token, OmnibridgeList, OmnibridgeToken } from '../../types'
import { exportToJSON } from '../../utils'

// Taken from git@github.com:omni/omnibridge-ui.git
const BRIDGE_CONFIG = [
  {
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
  },
  {
    label: 'eth⥊bsc',
    homeChainId: 56,
    foreignChainId: 1,
    enableForeignCurrencyBridge: false,
    homeWrappedForeignCurrencyAddress: null,
    wrappedForeignCurrencyAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase(),
    foreignMediatorAddress: '0x69c707d975e8d883920003CC357E556a4732CD03'.toLowerCase(),
    homeMediatorAddress: '0xD83893F31AA1B6B9D97C9c70D3492fe38D24d218'.toLowerCase(),
    foreignAmbAddress: '0x07955be2967B655Cf52751fCE7ccC8c61EA594e2'.toLowerCase(),
    homeAmbAddress: '0x6943A218d58135793F1FE619414eD476C37ad65a'.toLowerCase(),
    foreignGraphName: 'dan13ram/mainnet-to-bsc-omnibridge',
    homeGraphName: 'dan13ram/bsc-to-mainnet-omnibridge',
    ambLiveMonitorPrefix: 'http://alm-bsc.herokuapp.com',
    claimDisabled: false,
    tokensClaimDisabled: []
  },
  {
    label: 'bsc⥊gc',
    homeChainId: 100,
    foreignChainId: 56,
    enableForeignCurrencyBridge: true,
    homeWrappedForeignCurrencyAddress: '0xCa8d20f3e0144a72C6B5d576e9Bd3Fd8557E2B04'.toLowerCase(),
    wrappedForeignCurrencyAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase(),
    foreignMediatorAddress: '0xF0b456250DC9990662a6F25808cC74A6d1131Ea9'.toLowerCase(),
    homeMediatorAddress: '0x59447362798334d3485c64D1e4870Fde2DDC0d75'.toLowerCase(),
    foreignAmbAddress: '0x05185872898b6f94AA600177EF41B9334B1FA48B'.toLowerCase(),
    homeAmbAddress: '0x162E898bD0aacB578C8D5F8d6ca588c13d2A383F'.toLowerCase(),
    foreignGraphName: 'dan13ram/bsc-to-xdai-omnibridge',
    homeGraphName: 'dan13ram/xdai-to-bsc-omnibridge',
    ambLiveMonitorPrefix: 'https://alm-bsc-xdai.herokuapp.com',
    claimDisabled: false,
    tokensClaimDisabled: [
      '0xCa8d20f3e0144a72C6B5d576e9Bd3Fd8557E2B04'.toLowerCase() // Wrapped BNB from BSC
    ]
  }
]

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
  const homeData = await Promise.all(
    BRIDGE_CONFIG.map((config) =>
      request<OmnibridgeList>(`${SUBGRAPH_BASE_URL}${config.homeGraphName}`, homeTokensQuery)
    )
  )
  const tokens = homeData.map((data) => data.tokens).flat()

  if (debug) {
    await exportToJSON('_omnibridgeTokens', tokens)
  }

  return tokens
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
