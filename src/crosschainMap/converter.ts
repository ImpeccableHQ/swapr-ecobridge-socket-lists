import { SupportedChains, CrosschainToken, Token } from '../types'

export const crosschainTokenListToTokenList = (
  chainA: SupportedChains,
  chainB: SupportedChains,
  crosschainTokenList: CrosschainToken[]
) => {
  const tokenList = crosschainTokenList.reduce<Token[]>((total, crosschainToken) => {
    const { addresses, decimals, id, ...commonProps } = crosschainToken

    const addressA = addresses[chainA]
    const addressB = addresses[chainB]
    const decimalsA = decimals[chainA]
    const decimalsB = decimals[chainB]

    if (!addressA || !addressB) {
      throw new Error('Addresses not found, this shouldnt happen')
    }

    if (decimalsA === undefined || decimalsB === undefined) {
      throw new Error('Decimals not found, this shouldnt happen')
    }

    const tokenA: Token = {
      ...commonProps,
      chainId: chainA,
      address: addressA,
      decimals: decimalsA
    }

    const tokenB: Token = {
      ...commonProps,
      chainId: chainB,
      address: addressB,
      decimals: decimalsB
    }

    total.push(tokenA, tokenB)

    return total
  }, [])

  return tokenList
}
