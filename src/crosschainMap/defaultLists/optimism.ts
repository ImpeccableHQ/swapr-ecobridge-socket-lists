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
  const L1L2Pairs = await getTokenPair()
  L1L2Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
}

async function getTokenPair(): Promise<
  {
    tokenA: Token
    tokenB: Token
  }[]
> {
  console.log('OPTIMISM: get Token Pairs')
  const optimismLists = getTokens().then((tokens) => groupBy(tokens, 'symbol'))
  const filteredTokens = await optimismLists.then((tokens) => {
    for (const tokenKey in tokens) {
      tokens[tokenKey] = tokens[tokenKey]
        .filter((token) => [SupportedChains.MAINNET, SupportedChains.OPTIMISM_MAINNET].includes(token.chainId))
        .sort((tokenA, tokenB) => tokenA.chainId - tokenB.chainId)
    }
    return tokens
  })

  const l2Addresses = Object.values(filteredTokens)
    .filter((v) => v.length === 2)
    .map((TokenList) => TokenList[1].address)
  const l1Tokens = Object.values(filteredTokens)
    .filter((v) => v.length === 2)
    .map((TokenList) => TokenList[0])

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
