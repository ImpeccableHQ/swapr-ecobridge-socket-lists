import { CrosschainMap } from '..'
import { SocketToken, SupportedChains, Token } from '../../types'
import { fetchSocketTokenLists } from '../../socket'

const WETH_MAINNET_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

type TokenPair = {
  tokenA: Token
  tokenB: Token
}

function combinationOfTwo(arr1: any[], arr2: any[]) {
  const pairs = []
  for (let i = 0; i < arr1.length; i++) {
    for (let j = i + 1; j < arr2.length; j++) {
      pairs.push([arr1[i], arr2[j]])
    }
  }
  return pairs
}

export const getSocketTokens = async (crosschainMap: CrosschainMap) => {
  console.log('SOCKET_TOKENS: Get Tokens')
  const L1L2Pairs: TokenPair[] = await getTokenPair()
  console.log('SOCKET_TOKENS: Adding Tokens')

  console.log(
    L1L2Pairs.find(
      (pair) => pair['tokenA'].address === WETH_MAINNET_ADDRESS || pair['tokenB'].address === WETH_MAINNET_ADDRESS
    )
  )
  L1L2Pairs.forEach(({ tokenA, tokenB }) => {
    // console.log({ tokenA, tokenB })
    crosschainMap.addPair(tokenA, tokenB)
  })
}

async function getTokenPair(): Promise<TokenPair[]> {
  const chains = Object.values(SupportedChains).filter((item) => {
    return !isNaN(Number(item))
  }) as SupportedChains[]
  const chainComb = combinationOfTwo(chains, chains).filter((pair) => pair[0] !== pair[1])
  console.log(chainComb)

  const socketPairs = (
    await Promise.all(
      chainComb.map((pair) => {
        const [chainA, chainB] = pair
        return createSocketPairsList({
          chainA,
          chainB,
          debug: false,
          shortList: false
        })
      })
    )
  ).reduce((state, newValue) => state.concat(newValue), [])

  return socketPairs
}

async function createSocketPairsList({
  chainA,
  chainB,
  debug,
  shortList
}: Record<'chainA' | 'chainB', SupportedChains> & {
  debug?: boolean
  shortList?: boolean
}): Promise<TokenPair[]> {
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

  const ABChainList = getListsIntersection(fromChainA, toChainB)
  const BAChainList = getListsIntersection(fromChainB, toChainA)

  return createBidirectionalList(ABChainList, BAChainList)
}

const getListsIntersection = (fromList: SocketToken[], toList: SocketToken[]): TokenPair[] => {
  const fromChainId = fromList[0]?.chainId as SupportedChains

  if (!fromChainId) return []

  const fromTokens = Object.assign({}, ...fromList.map((x) => ({ [x.symbol]: x })))
  const tokens = toList
    .filter((toToken) => fromList.find((fromToken) => fromToken.symbol === toToken.symbol))
    .map((toToken) => {
      return {
        tokenA: socketTokenToToken(toToken),
        tokenB: socketTokenToToken(fromTokens[toToken.symbol])
      }
    })

  return tokens
}

const createBidirectionalList = (ABChainList: TokenPair[], BAChainList: TokenPair[]) => {
  return ABChainList.filter(
    (tokenPairAB) =>
      BAChainList.find((tokenPairBA) => tokenPairAB['tokenA'].symbol === tokenPairBA['tokenB'].symbol) &&
      BAChainList.find((tokenPairBA) => tokenPairAB['tokenB'].symbol === tokenPairBA['tokenA'].symbol)
  )
}

const socketTokenToToken = (token: SocketToken) => {
  const newToken = token as Token
  newToken['logoURI'] = token['icon']
  return newToken
}
