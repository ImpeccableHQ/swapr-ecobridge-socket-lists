# EcoBridge Socket List Creator


## TL;DR
### How to use
To keep things easy to manage output is kept under `/lists` of this repo. To download it use `https://raw.githubusercontent.com/...`

### How to update
`$ yarn && yarn createList`, commit and push to `master`

### How to verify
`$ yarn && yarn createList:debug` and feel free to see source files, results of mapping and logs (all kept under `/debug`)
## Motivation
Socket API operates on output and input token lists. If user wants to bridge USDC on chainA to USDC on chainB then he needs to pick both tokens (if they're present on fromTokenList & toTokenList) by himself. EcoBridge doesn't have possibility to select output token and assumption is that input USDC token on chainA will be bridged to same token on chainB, however Socket API doesn't offer such pairing and it needs to be done by us. 

## Methodology

Following token lists are used as default lists: 
- Arbitrum One API (Mainnet-Arbitrum One)
- Omnibridge (Mainnet-Gnosis)
- Polygon Token Mapper (Mainnet-Polygon) (with one manual tweak which is `WETH`)

Using these lists we are able to identify addresses under which token of same quality is on different chains.

To make lookup efficient and easy mapping consists of two elements - `tokenMapByChain` and `crosschainMap`.

```ts
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
```

After first occurance of token from any source `crosschainMap` creates new `crosschainToken` which is representation of token of the same quality across chains.
Tokens are added in pairs, where token from mainnet serves are primary key and paired chain of same token address is added to DB. To avoid duplication tokens are then added to helper `tokenMapByChain`.

### Example

```ts
const omnibridgeUSDC = {
    homeChainId: 1,
    foreignChainId: 100,
    homeAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    foreignAddress: "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
    homeName: "USD//C",
    foreignName: "USD//C on xDai",
    symbol: "USDC",
    decimals: 6
}

// We split it into two tokens:
const omni_mainnetUSDC = {
    chainId: 1,
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    name: "USD//C",
    symbol: "USDC",
    decimals: 6
}

const omni_gnosisUSDC = {
    chainId: 100,
    address: "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"
    name: "USD//C",
    symbol: "USDC",
    decimals: 6
}

crosschainMap.addPair(omni_mainnetUSDC, omni_gnosisUSDC)

// Under the hood:
// - new crosschain token is added with addresses[1] = mainnetUSDC.address
// - mainnetUSDC is added to tokenMapByChain[1][mainnetUSDC.address] = mainnetUSDC along with id of crosschainToken
// - crosschainToken is updated: addresses[100] = gnosisUSDC.address
// - gnosisUSDC is added to tokenMapByChain[100][gnosisUSDC.address] = gnosisUSDC along with id of crosschainToken

const polygonMapperToken = {
      root_token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // address on mainnet
      child_token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", //address on polygon
      decimals: 6,
      name: "USD Coin",
      symbol: "USDC",
      // and many other props...
    }

// We split it into two tokens:
const polyMapper_mainnetUSDC = {
    chainId: 1,
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
}

const polyMapper_polygonUSDC = {
    chainId: 100,
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
}

crosschainMap.addPair(polyMapper_mainnetUSDC, polyMapper_polygonUSDC)

// Under the hood:
// - crosschain token is found because of USDC Mainnet address
// - mainnetUSDC has been already added to tokenMapByChain and is ignored
// - crosschainToken is updated: addresses[137] = polygonUSDC.address
// - polygonUSDC is added to tokenMapByChain[137][polygonUSDC.address] = polygonUSDC along with id of crosschainToken
```

## Socket lists
Socket offers fromTokenList (input) and toTokenList (output). To be able to bridge token of same quality we need to find tokens that are on both lists (intersection).
This is where `crosschainMap` becomes handy - tokens are matched against addresses that are added to `crosschainTokens`.

### Direction matters

Socket lists are unidirectional - fromTokenList & toTokenList for 1-100 are different that fromTokenList & toTokenList for 100-1 therefore we got two options:
- create lists for every chain pair in every combination
- create lists that are bidirectional (tokens that appear on both intersections)

Currently both options are produced as output of this script.

### Length also matters
Call to Socket API that fetches fromTokenList & toTokenList can be made with `shortList` param. If it's present then only most popular tokens will be returned.

Currently both options are produced as output of this script.

### Native & wrapped currencies
Due to address substitutions that are made in `ecoBridge`:
- native currencies are cut off (they are added on SWAPR FE),
- some tokens are present only on one chain of pair (eg. DAI will be present on Mainnet list but not on gnosis list. When user selects Mainnet DAI he/she will receive native XDAI on Gnosis)