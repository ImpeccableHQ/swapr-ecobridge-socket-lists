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

  const l1Tokens = Object.values(crosschainMap.tokenMapByChain[SupportedChains.MAINNET]).filter(
    (l1Token) => !crosschainMap.crosschainMap[l1Token.id].addresses[SupportedChains.OPTIMISM_MAINNET]
  )

  if (l1Tokens.length === 0) {
    console.log('OPTIMISM: All L1 tokens are paired with L2')
  } else {
    console.log('OPTIMISM: Fetching L2 Addresses')
    const L1L2Pairs = await getTokenPair(l1Tokens)
    console.log('OPTIMISM: Adding L2 Addresses')
    //console.log(L1L2Pairs)
    L1L2Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
  }
}

async function getTokenPair(l1Tokens: MappedToken[]): Promise<
  {
    tokenA: Token
    tokenB: Token
  }[]
> {
  console.log('OPTIMISM: get Token Pairs')
  const optimismLists = getTokens().then((tokens) => groupBy(tokens, 'symbol'))
  const filteredTokens = await optimismLists.then((tokens) => {
    for (const tokenKey in tokens) {
      tokens[tokenKey] = tokens[tokenKey].filter((token) =>
        [SupportedChains.MAINNET, SupportedChains.OPTIMISM_MAINNET].includes(token.chainId)
      )
    }
    return tokens
  })
  const l2Addresses = getL2Addresses(
    l1Tokens.map((token) => token.address),
    filteredTokens
  )

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

function getL2Addresses(l1Addresses: string[], optimismLists: { [key: string]: Token[] }) {
  console.log('OPTIMISM: getL2Addresses')
  const l2Addresses = l1Addresses.map((address) => {
    for (const tokensPair of Object.values(optimismLists)) {
      if (tokensPair.some((token) => token.address === address)) return tokensPair[1].address
    }
  })
  return l2Addresses
}
