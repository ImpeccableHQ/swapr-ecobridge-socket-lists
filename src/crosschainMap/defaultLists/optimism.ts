import { CrosschainMap } from '..'
import { MappedToken, SupportedChains, Token } from '../../types'
import fetch from 'node-fetch'

async function getTokens() {
  const URL =
    'https://raw.githubusercontent.com/ethereum-optimism/ethereum-optimism.github.io/master/optimism.tokenlist.json'
  const data = await fetch(URL)
  const jsonData = await data.json()
  return jsonData.tokens as MappedToken[]
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

export const getOptimismTokens = async (crosschainMap: CrosschainMap) => {
  console.log('OPTIMISM: get Optimism Tokens')
  const L1L2Pairs = await getTokenPair(crosschainMap)
  L1L2Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
}

async function getTokenPair(crosschainMap: CrosschainMap): Promise<
  {
    tokenA: Token
    tokenB: Token
  }[]
> {
  console.log('OPTIMISM: get Token Pairs')
  const optimismLists = await getTokens().then((tokens) => groupBy(tokens, 'symbol'))
  const filteredTokens = optimismLists
  for (const tokenKey in optimismLists) {
    optimismLists[tokenKey] = optimismLists[tokenKey]
      .filter((token) => [SupportedChains.MAINNET, SupportedChains.OPTIMISM_MAINNET].includes(token.chainId))
      .sort((tokenA, tokenB) => tokenA.chainId - tokenB.chainId)
  }

  const pairs = getFromPairedTokens(filteredTokens, crosschainMap)
  return pairs
}

function getFromPairedTokens(filteredTokens: { [key: string]: Token[] }, crosschainMap: CrosschainMap) {
  const tokenPairs = Object.values(filteredTokens)
    .filter((v) => v !== undefined && v.length > 0)
    .map((tokenList) => {
      if (tokenList.length == 2) return tokenList
      tokenList = [
        crosschainMap.getCrosschainTokenBySymbol({
          chainId: SupportedChains.MAINNET,
          symbol: tokenList[0].symbol
        }) as Token,
        tokenList[0]
      ]
      return tokenList
    })
    .filter((tokenList) => !tokenList.some((token) => typeof token == 'undefined'))
  const l2Addresses = tokenPairs.map((token) => {
    return token[1].address
  })

  const l1Tokens = tokenPairs.map((tokens) => tokens[0])

  const pairs = l2Addresses.reduce<{ tokenA: Token; tokenB: Token }[]>((total, l2Address, index) => {
    if (l2Address) {
      const tokenA = l1Tokens[index]
      const tokenB: Token = {
        ...tokenA,
        chainId: SupportedChains.OPTIMISM_MAINNET,
        address: l2Address
      }
      total.push({ tokenA, tokenB })
    }

    return total
  }, [])
  return pairs
}
