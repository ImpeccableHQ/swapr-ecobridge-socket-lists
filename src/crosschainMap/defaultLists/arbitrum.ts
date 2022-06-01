import { ethers } from 'ethers'
import { CallInput, getL2Network, MultiCaller, Erc20Bridger } from '@arbitrum/sdk'
import { L1GatewayRouter } from '@arbitrum/sdk/dist/lib/abi/L1GatewayRouter'
import { L1GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory'

import { CrosschainMap } from '../crosschainMap'
import { SupportedChains, Token } from '../../types'

const MAINNET_RPC = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'
const MULTICALL_V2_ADDRESS = '0x5ba1e12693dc8f9c48aad8770482f4739beed696'
const MAINNET_PROVIDER = new ethers.providers.JsonRpcProvider(MAINNET_RPC, SupportedChains.MAINNET)
const ARBITRUM_PROVIDER = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC, SupportedChains.ARBITRUM)

const getL1Addresses = async (l2Addresses: string[]) => {
  const l2Network = await getL2Network(SupportedChains.ARBITRUM)
  const bridge = new Erc20Bridger(l2Network)
  const promises = l2Addresses.map((address) => bridge.getL1ERC20Address(address, ARBITRUM_PROVIDER))
  const l1AddressesResponse = await Promise.allSettled<string>(promises)
  const l1Addresses = l1AddressesResponse.map((res) => {
    if (res.status === 'fulfilled') {
      return res.value
    } else {
      return undefined
    }
  })

  return l1Addresses
}

export const getL1ArbitrumTokens = async (l2Tokens: Token[]) => {
  console.log('ARBITRUM: Fetching L1 Addresses')

  const l1Addresses = await getL1Addresses(l2Tokens.map((token) => token.address))

  const pairs = l1Addresses.reduce<{ tokenA: Token; tokenB: Token }[]>((total, l1Address, index) => {
    if (l1Address) {
      const tokenB = l2Tokens[index]
      const tokenA: Token = {
        ...tokenB,
        chainId: SupportedChains.MAINNET,
        address: l1Address
      }
      total.push({ tokenA, tokenB })
    }

    return total
  }, [])

  return pairs
}

const getL2Addresses = async (l1Addresses: string[]) => {
  const l2Network = await getL2Network(SupportedChains.ARBITRUM)
  const routerFactory = L1GatewayRouter__factory.connect(l2Network.tokenBridge.l1GatewayRouter, MAINNET_PROVIDER)
  const l1MultiCaller = new MultiCaller(MAINNET_PROVIDER, MULTICALL_V2_ADDRESS)

  const inputs: CallInput<Awaited<ReturnType<L1GatewayRouter['functions']['calculateL2TokenAddress']>>[0]>[] =
    l1Addresses.map((address) => ({
      targetAddr: routerFactory.address,
      encoder: () => routerFactory.interface.encodeFunctionData('calculateL2TokenAddress', [address]),
      decoder: (returnData: string) =>
        routerFactory.interface.decodeFunctionResult('calculateL2TokenAddress', returnData)[0]
    }))

  const l2Addresses = await l1MultiCaller.multiCall(inputs)

  return l2Addresses
}

export const getL2ArbitrumTokens = async (l1Tokens: Token[]) => {
  const l2Addresses = await getL2Addresses(l1Tokens.map((token) => token.address))

  const pairs = l2Addresses.reduce<{ tokenA: Token; tokenB: Token }[]>((total, l2Address, index) => {
    if (l2Address) {
      const tokenA = l1Tokens[index]
      const tokenB: Token = {
        ...tokenA,
        chainId: SupportedChains.ARBITRUM,
        address: l2Address
      }
      total.push({ tokenA, tokenB })
    }

    return total
  }, [])

  return pairs
}

export const getArbitrumTokens = async (crosschainMap: CrosschainMap) => {
  const l1Tokens = Object.values(crosschainMap.tokenMapByChain[SupportedChains.MAINNET]).filter(
    (l1Token) => !crosschainMap.crosschainMap[l1Token.id].addresses[SupportedChains.ARBITRUM]
  )

  if (l1Tokens.length === 0) {
    console.log('ARBITRUM: All L1 tokens are paired with L2')
  } else {
    console.log('ARBITRUM: Fetching L2 Addresses')
    const L1L2Pairs = await getL2ArbitrumTokens(l1Tokens)
    console.log('ARBITRUM: Adding L2 Addresses')
    L1L2Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
  }

  const l2Tokens = Object.values(crosschainMap.tokenMapByChain[SupportedChains.ARBITRUM]).filter(
    (l2Token) => !crosschainMap.crosschainMap[l2Token.id].addresses[SupportedChains.MAINNET]
  )

  if (l2Tokens.length === 0) {
    console.log('ARBITRUM: All L2 tokens are paired with L1')
  } else {
    console.log('ARBITRUM: Fetching L1 Addresses')
    const L2L1Pairs = await getL1ArbitrumTokens(l2Tokens)
    console.log('ARBITRUM: Adding L2 Addresses')
    L2L1Pairs.forEach(({ tokenA, tokenB }) => crosschainMap.addPair(tokenA, tokenB))
  }
}
