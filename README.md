# EcoBridge Socket List Creator

## Motivation
Socket API operates on output and input token lists. If user wants to bridge USDC on chainA to USDC on chainB then he needs to pick both tokens (if they're present on fromTokenList & toTokenList) by himself. EcoBridge doesn't have possibility to select output token and assumption is that input USDC token on chainA will be bridged to same token on chainB, however Socket API doesn't offer such pairing and it needs to be done by us. 

## Methodology

To make lookup efficient and easy mapping consists of two elements - `tokenMapByChain` and `crosschainMap`.

'''ts
type CrosschainMapContainer = {
    [id: string]: CrosschainToken
}

type CrosschainToken = {
    id: string //uuid-4
    name: string
    symbol: string
    decimals: number
    logoURI?: string 
    addresses: { 
        [chain in SupportedChains]?: string 
    }  
}
'''

After first occurance of token from any source `crosschainMap` creates new `crosschainToken` which is 




## Ethereum - Arbitrum One
This one is easy - thanks to how arbitrum works there is a way to pair token between L1 - L2 through sdk. 

## Ethereum - Gnosis
Official omnibridge subgraph is used for this pairing.

## Ethereum - Polygon (PoS)
https://mapper.polygon.technology/ is used for this pairing
