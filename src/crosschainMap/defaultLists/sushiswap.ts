import { CrosschainMap } from '..'
import { MappedToken, SupportedChains, Token } from '../../types'
import fetch from 'node-fetch'

async function getTokens() {
  const URL =
    'https://raw.githubusercontent.com/sushiswap/list/master/lists/token-lists/default-token-list/tokens/bsc.json'
  const data = await fetch(URL)
  const jsonData = await data.json()
  return jsonData as MappedToken[]
}

const groupBy = (array: any[], key: string): { [key: string]: Token[] } => {
  // Return the end result
  return array.reduce((result, currentValue) => {
    // If an array already present for key, push it to the array. Else create an array and push the object
    ;(result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue)
    // Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
    return result
  }, {}) // empty object is the initial value for result object
}

export const getSushiswapTokens = async (crosschainMap: CrosschainMap) => {
  console.log('SUSHISWAP: Get Tokens')
  const L1L2Pairs = await getTokenPair(crosschainMap)
  console.log('SUSHISWAP: Adding Tokens')
  L1L2Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
}

async function getTokenPair(crosschainMap: CrosschainMap): Promise<
  {
    tokenA: Token
    tokenB: Token
  }[]
> {
  const optimismLists = await getTokens().then((tokens) => groupBy(tokens, 'symbol'))
  const listPairs = (Object.values(SupportedChains) as SupportedChains[])
    .map((chain) => {
      if (chain === SupportedChains.BSC_MAINNET) return []
      for (const tokenKey in optimismLists) {
        optimismLists[tokenKey] = optimismLists[tokenKey]
          .filter((token) => [chain, SupportedChains.BSC_MAINNET].includes(token.chainId))
          .sort((tokenA, tokenB) => tokenA.chainId - tokenB.chainId)
      }

      const pairs = getFromPairedTokens(optimismLists, crosschainMap, chain)
      return pairs
    })
    .reduce((stateList, newList) => stateList.concat(newList), [])

  return listPairs
}

function getFromPairedTokens(
  filteredTokens: { [key: string]: Token[] },
  crosschainMap: CrosschainMap,
  chain: SupportedChains
): {
  tokenA: Token
  tokenB: Token
}[] {
  const tokenPairs = Object.values(filteredTokens)
    .filter((v) => v?.length > 0)
    .map((tokenList) => {
      if (tokenList.length === 2) return tokenList
      tokenList = [
        crosschainMap.getCrosschainTokenBySymbol({
          chainId: chain,
          symbol: tokenList[0].symbol
        }) as Token,
        tokenList[0]
      ]
      return tokenList
    })
    .filter((tokenList) => !tokenList.some((token) => !token))

  const l2Addresses: string[] = []
  const l1Tokens: Token[] = []
  tokenPairs.forEach((pairList) => {
    l2Addresses.push(pairList[1].address)
    l1Tokens.push(pairList[0])
  })

  const pairs = l2Addresses.reduce<{ tokenA: Token; tokenB: Token }[]>((total, l2Address, index) => {
    if (l2Address) {
      const tokenA = l1Tokens[index]
      const tokenB: Token = {
        ...tokenA,
        chainId: SupportedChains.BSC_MAINNET,
        address: l2Address
      }
      total.push({ tokenA, tokenB })
    }

    return total
  }, [])
  return pairs
}
