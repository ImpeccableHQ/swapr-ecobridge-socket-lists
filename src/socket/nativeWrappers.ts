import { CrosschainMap } from '../crosschainMap'
import { SocketToken, SupportedChains, Token } from '../types'

const SOCKET_NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const WETH_MAINNET_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const DAI_MAINNET_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'
const MATIC_MAINNET_ADDRESS = '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'
const BNB_MAINNET_ADDRESS = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52'

export const getUnidirectionalNativeWrappers = ({
  fromTokenList,
  toTokenList,
  crosschainMap,
  tokenList
}: {
  fromTokenList: SocketToken[]
  toTokenList: SocketToken[]
  crosschainMap: CrosschainMap
  tokenList: Token[]
}) => {
  const nativeWrappers: Token[] = []

  const WETH = crosschainMap.getCrosschainTokenByAddress({
    address: WETH_MAINNET_ADDRESS,
    chainId: SupportedChains.MAINNET
  })
  const MATIC = crosschainMap.getCrosschainTokenByAddress({
    address: MATIC_MAINNET_ADDRESS,
    chainId: SupportedChains.MAINNET
  })
  const DAI = crosschainMap.getCrosschainTokenByAddress({
    address: DAI_MAINNET_ADDRESS,
    chainId: SupportedChains.MAINNET
  })
  const BNB = crosschainMap.getCrosschainTokenByAddress({
    address: BNB_MAINNET_ADDRESS,
    chainId: SupportedChains.MAINNET
  })

  if (!WETH || !MATIC || !DAI || !BNB) {
    throw new Error('Native Wrappers not found!')
  }

  const wrappedCurrencyMapping = {
    [SupportedChains.MAINNET]: WETH,
    [SupportedChains.ARBITRUM]: WETH,
    [SupportedChains.OPTIMISM_MAINNET]: WETH,
    [SupportedChains.GNOSIS]: DAI,
    [SupportedChains.POLYGON]: MATIC,
    [SupportedChains.BSC_MAINNET]: BNB
  }

  const fromChainId: keyof typeof wrappedCurrencyMapping = fromTokenList[0].chainId
  const toChainId: keyof typeof wrappedCurrencyMapping = toTokenList[0].chainId

  const fromWrappedCurrency = wrappedCurrencyMapping[fromChainId]
  const toWrappedCurrency = wrappedCurrencyMapping[toChainId]

  // from native currency on from list
  const fromNativeSupported = fromTokenList.find((token) => token.address === SOCKET_NATIVE_ADDRESS)

  // to native currency on to list
  const toNativeSupported = toTokenList.find((token) => token.address === SOCKET_NATIVE_ADDRESS)

  // from native wrapper currency on to list // eg. Mainnet-Gnosis, Gnosis WETH
  const fromWrappedSupportedOnTo = toTokenList.find(
    (token) => token.address.toLowerCase() === fromWrappedCurrency.addresses[toChainId]
  )

  // to native wrapper currency on from list // eg. Mainnet-Gnosis, Mainnet DAI
  const toWrappedSupportedOnFrom = fromTokenList.find((token) => {
    return token.address.toLowerCase() === toWrappedCurrency.addresses[fromChainId]
  })

  // eg. Mainnet ETH => WETH Gnosis
  // from native is present & from wrapper is present on to list, add wrapped to to list if it's not already there
  if (
    fromNativeSupported &&
    fromWrappedSupportedOnTo &&
    !tokenList.find((token) => token.address === fromWrappedSupportedOnTo.address.toLowerCase())
  ) {
    const fromWrappedDecimals = fromWrappedCurrency.decimals[toChainId]
    const fromWrappedAddress = fromWrappedCurrency.addresses[toChainId]

    if (fromWrappedDecimals === undefined || fromWrappedAddress === undefined) {
      throw new Error('Addresses not found, this shouldnt happen')
    }

    const token: Token = {
      name: fromWrappedCurrency.name,
      symbol: fromWrappedCurrency.symbol,
      chainId: toChainId,
      decimals: fromWrappedDecimals,
      logoURI: fromWrappedSupportedOnTo.icon,
      address: fromWrappedAddress
    }
    nativeWrappers.push(token)
  }

  // eg. Mainnet DAI => XDAI Gnosis
  // to native is present & to wrapper is present on from list, add wrapped to from list if it's not already there
  if (
    toNativeSupported &&
    toWrappedSupportedOnFrom &&
    !tokenList.find((token) => token.address === toWrappedSupportedOnFrom.address.toLowerCase())
  ) {
    const toWrappedDecimals = toWrappedCurrency.decimals[fromChainId]
    const toWrappedAddress = toWrappedCurrency.addresses[fromChainId]

    if (toWrappedDecimals === undefined || toWrappedAddress === undefined) {
      throw new Error('Addresses not found, this shouldnt happen')
    }
    const token: Token = {
      name: toWrappedCurrency.name,
      symbol: toWrappedCurrency.symbol,
      chainId: fromChainId,
      decimals: toWrappedDecimals,
      logoURI: toWrappedSupportedOnFrom.icon,
      address: toWrappedAddress
    }
    nativeWrappers.push(token)
  }

  return nativeWrappers
}
