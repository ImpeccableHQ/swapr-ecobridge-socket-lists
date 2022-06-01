import { CrosschainMap } from './crosschainMap'
import { CrosschainToken, SupportedChains, Token } from '../types'

const tokenPreset: Record<'USDC' | 'AAVE' | 'USDT', Token> = {
  USDC: {
    chainId: SupportedChains.MAINNET,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    name: 'USD Coin USDC',
    symbol: 'USDC',
    decimals: 6
  },
  AAVE: {
    name: 'Aave',
    address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    symbol: 'AAVE',
    decimals: 18,
    chainId: SupportedChains.POLYGON
  },
  USDT: {
    name: 'Tether USD',
    address: '0x3813e82e6f7098b9583FC0F33a962D02018B6803',
    symbol: 'USDT',
    decimals: 6,
    chainId: SupportedChains.GNOSIS
  }
}

const createToken = (preset: keyof typeof tokenPreset, overrides?: Partial<Token>): Token => {
  const mockToken = tokenPreset[preset]

  return {
    ...mockToken,
    ...overrides
  }
}

const createCrosschainToken = (
  id: string,
  preset: keyof typeof tokenPreset,
  overrides?: Partial<CrosschainToken>
): CrosschainToken => {
  const { address, chainId, decimals, name, symbol } = tokenPreset[preset]

  const mockCrosschainToken: CrosschainToken = {
    id,
    name,
    decimals,
    symbol,
    addresses: {
      [chainId]: address
    }
  }

  return {
    ...mockCrosschainToken,
    ...overrides
  }
}

describe('CrosschainMap', () => {
  let crosschainMap: CrosschainMap
  let tokenMainnet: Token, tokenGnosis: Token, tokenPolygon: Token

  beforeEach(() => {
    crosschainMap = new CrosschainMap()
    tokenMainnet = createToken('USDC', { chainId: SupportedChains.MAINNET })
    tokenGnosis = createToken('USDC', { chainId: SupportedChains.GNOSIS })
    tokenPolygon = createToken('USDC', { chainId: SupportedChains.POLYGON })
  })

  describe('addPairing', () => {
    it('creates new crosschainToken for both tokens', () => {
      expect(crosschainMap.getTokenIDByAddress(tokenMainnet)).toBeUndefined()
      expect(crosschainMap.getTokenIDByAddress(tokenPolygon)).toBeUndefined()

      const id = crosschainMap.addPair(tokenMainnet, tokenPolygon)

      expect(id).toBeDefined()

      expect(crosschainMap.crosschainMap[id]).toEqual(
        createCrosschainToken(id, 'USDC', {
          addresses: {
            [tokenMainnet.chainId]: tokenMainnet.address.toLowerCase(),
            [tokenPolygon.chainId]: tokenPolygon.address.toLowerCase()
          }
        })
      )

      expect(crosschainMap.tokenMapByChain[tokenMainnet.chainId][tokenMainnet.address.toLowerCase()]).toEqual({
        id,
        ...tokenMainnet,
        address: tokenMainnet.address.toLowerCase()
      })

      expect(crosschainMap.tokenMapByChain[tokenPolygon.chainId][tokenPolygon.address.toLowerCase()]).toEqual({
        id,
        ...tokenPolygon,
        address: tokenPolygon.address.toLowerCase()
      })
    })

    it('creates new crosschainToken when tokenA is mapped', () => {
      const id = crosschainMap.addPair(tokenMainnet, tokenPolygon)

      expect(crosschainMap.getTokenIDByAddress(tokenGnosis)).toBeUndefined()

      crosschainMap.addPair(tokenMainnet, tokenGnosis)

      expect(crosschainMap.getTokenIDByAddress(tokenMainnet)).toBe(id)
      expect(crosschainMap.getTokenIDByAddress(tokenGnosis)).toBe(id)
      expect(crosschainMap.getTokenIDByAddress(tokenPolygon)).toBe(id)

      expect(Object.values(crosschainMap.tokenMapByChain[tokenMainnet.chainId]).length).toBe(1)
      expect(Object.values(crosschainMap.tokenMapByChain[tokenGnosis.chainId]).length).toBe(1)
      expect(Object.values(crosschainMap.tokenMapByChain[tokenPolygon.chainId]).length).toBe(1)

      expect(Object.keys(crosschainMap.crosschainMap).length).toBe(1)

      expect(crosschainMap.crosschainMap[id]).toEqual(
        createCrosschainToken(id, 'USDC', {
          addresses: {
            [tokenMainnet.chainId]: tokenMainnet.address.toLowerCase(),
            [tokenPolygon.chainId]: tokenPolygon.address.toLowerCase(),
            [tokenGnosis.chainId]: tokenGnosis.address.toLowerCase()
          }
        })
      )

      expect(crosschainMap.tokenMapByChain[tokenGnosis.chainId][tokenGnosis.address.toLowerCase()]).toEqual({
        id,
        ...tokenGnosis,
        address: tokenGnosis.address.toLowerCase()
      })
    })

    it('creates new crosschainToken when tokenB is mapped', () => {
      const id = crosschainMap.addPair(tokenMainnet, tokenPolygon)

      expect(crosschainMap.getTokenIDByAddress(tokenGnosis)).toBeUndefined()

      crosschainMap.addPair(tokenGnosis, tokenPolygon)

      expect(crosschainMap.getTokenIDByAddress(tokenMainnet)).toBe(id)
      expect(crosschainMap.getTokenIDByAddress(tokenGnosis)).toBe(id)
      expect(crosschainMap.getTokenIDByAddress(tokenPolygon)).toBe(id)

      expect(Object.values(crosschainMap.tokenMapByChain[tokenMainnet.chainId]).length).toBe(1)
      expect(Object.values(crosschainMap.tokenMapByChain[tokenGnosis.chainId]).length).toBe(1)
      expect(Object.values(crosschainMap.tokenMapByChain[tokenPolygon.chainId]).length).toBe(1)

      expect(Object.keys(crosschainMap.crosschainMap).length).toBe(1)

      expect(crosschainMap.crosschainMap[id]).toEqual(
        createCrosschainToken(id, 'USDC', {
          addresses: {
            [tokenMainnet.chainId]: tokenMainnet.address.toLowerCase(),
            [tokenPolygon.chainId]: tokenPolygon.address.toLowerCase(),
            [tokenGnosis.chainId]: tokenGnosis.address.toLowerCase()
          }
        })
      )

      expect(crosschainMap.tokenMapByChain[tokenGnosis.chainId][tokenGnosis.address.toLowerCase()]).toEqual({
        id,
        ...tokenGnosis,
        address: tokenGnosis.address.toLowerCase()
      })
    })
  })
})
