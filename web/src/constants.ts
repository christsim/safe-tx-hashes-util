// ============================================================================
// Safe Multisig Transaction Hashes - Constants
// ============================================================================

// ---------------------------------------------------------------------------
// Type Hashes (EIP-712)
// ---------------------------------------------------------------------------

/** keccak256("EIP712Domain(uint256 chainId,address verifyingContract)") */
export const DOMAIN_SEPARATOR_TYPEHASH =
  "0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218";

/** keccak256("EIP712Domain(address verifyingContract)") — used for Safe versions <= 1.2.0 */
export const DOMAIN_SEPARATOR_TYPEHASH_OLD =
  "0x035aff83d86937d35b32e04f0ddc6ff469290eef2f1b692d8a815c89404d4749";

/** keccak256("SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)") */
export const SAFE_TX_TYPEHASH =
  "0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8";

/** keccak256("SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 dataGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)") — used for Safe versions < 1.0.0 */
export const SAFE_TX_TYPEHASH_OLD =
  "0x14d461bc7412367e924637b363c7bf29b8f47e2f84869f4426e5633d8af47b20";

/** keccak256("SafeMessage(bytes message)") */
export const SAFE_MSG_TYPEHASH =
  "0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca";

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEFAULT_SAFE_VERSION = "1.3.0";

// ---------------------------------------------------------------------------
// Network Definitions
// ---------------------------------------------------------------------------

export interface Network {
  id: string;
  name: string;
  chainId: number;
  apiUrl: string;
}

export const NETWORKS: Network[] = [
  { id: "arbitrum", name: "Arbitrum", chainId: 42161, apiUrl: "https://safe-transaction-arbitrum.safe.global" },
  { id: "aurora", name: "Aurora", chainId: 1313161554, apiUrl: "https://safe-transaction-aurora.safe.global" },
  { id: "avalanche", name: "Avalanche", chainId: 43114, apiUrl: "https://safe-transaction-avalanche.safe.global" },
  { id: "base", name: "Base", chainId: 8453, apiUrl: "https://safe-transaction-base.safe.global" },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532, apiUrl: "https://safe-transaction-base-sepolia.safe.global" },
  { id: "blast", name: "Blast", chainId: 81457, apiUrl: "https://safe-transaction-blast.safe.global" },
  { id: "bsc", name: "BSC (BNB Smart Chain)", chainId: 56, apiUrl: "https://safe-transaction-bsc.safe.global" },
  { id: "celo", name: "Celo", chainId: 42220, apiUrl: "https://safe-transaction-celo.safe.global" },
  { id: "ethereum", name: "Ethereum", chainId: 1, apiUrl: "https://safe-transaction-mainnet.safe.global" },
  { id: "gnosis", name: "Gnosis", chainId: 100, apiUrl: "https://safe-transaction-gnosis-chain.safe.global" },
  { id: "gnosis-chiado", name: "Gnosis Chiado", chainId: 10200, apiUrl: "https://safe-transaction-chiado.safe.global" },
  { id: "linea", name: "Linea", chainId: 59144, apiUrl: "https://safe-transaction-linea.safe.global" },
  { id: "mantle", name: "Mantle", chainId: 5000, apiUrl: "https://safe-transaction-mantle.safe.global" },
  { id: "optimism", name: "OP (Optimism)", chainId: 10, apiUrl: "https://safe-transaction-optimism.safe.global" },
  { id: "polygon", name: "Polygon", chainId: 137, apiUrl: "https://safe-transaction-polygon.safe.global" },
  { id: "polygon-zkevm", name: "Polygon zkEVM", chainId: 1101, apiUrl: "https://safe-transaction-zkevm.safe.global" },
  { id: "scroll", name: "Scroll", chainId: 534352, apiUrl: "https://safe-transaction-scroll.safe.global" },
  { id: "sepolia", name: "Sepolia", chainId: 11155111, apiUrl: "https://safe-transaction-sepolia.safe.global" },
  { id: "worldchain", name: "World Chain", chainId: 480, apiUrl: "https://safe-transaction-worldchain.safe.global" },
  { id: "xlayer", name: "X Layer", chainId: 196, apiUrl: "https://safe-transaction-xlayer.safe.global" },
  { id: "zksync", name: "ZKsync Era", chainId: 324, apiUrl: "https://safe-transaction-zksync.safe.global" },
];

/** Lookup a network by its string identifier. */
export function getNetwork(id: string): Network | undefined {
  return NETWORKS.find((n) => n.id === id);
}

// ---------------------------------------------------------------------------
// ERC-20 Token Definitions
// ---------------------------------------------------------------------------

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  /** Mapping of network id -> contract address on that network. */
  addresses: Record<string, string>;
}

export const TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    addresses: {
      ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      bsc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    },
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      base: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      bsc: "0x55d398326f99059fF775485246999027B3197955",
      avalanche: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    addresses: {
      ethereum: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      arbitrum: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      base: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      optimism: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      polygon: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      bsc: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      avalanche: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    },
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    addresses: {
      ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      arbitrum: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      base: "0x4200000000000000000000000000000000000006",
      optimism: "0x4200000000000000000000000000000000000006",
      polygon: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      bsc: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      avalanche: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    },
  },
  {
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    addresses: {
      ethereum: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      arbitrum: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      optimism: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      polygon: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      avalanche: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    },
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    decimals: 18,
    addresses: {
      ethereum: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      arbitrum: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      base: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
      optimism: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
      polygon: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
      bsc: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
      avalanche: "0x5947BB275c521040051D82396192181b413227A3",
    },
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18,
    addresses: {
      ethereum: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      arbitrum: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      base: "0xc3De830EA07524a0761646a6a4e4be0e114a3C83",
      optimism: "0x6fd9d7AD17242c41f7131d257212c54A0e816691",
      polygon: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
      bsc: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
      avalanche: "0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580",
    },
  },
  {
    symbol: "AAVE",
    name: "Aave",
    decimals: 18,
    addresses: {
      ethereum: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
      arbitrum: "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196",
      base: "0x63706e401c06ac8513145b7687A14804d17f814b",
      optimism: "0x76FB31fb4af56892A25e32cFC43De717950c9278",
      polygon: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
      avalanche: "0x63a72806098Bd3D9520cC43356dD78afe5D386D9",
    },
  },
  {
    symbol: "MKR",
    name: "Maker",
    decimals: 18,
    addresses: {
      ethereum: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
      arbitrum: "0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879",
      optimism: "0xab7bAdEF82E9Fe11f6f33f87BC9bC2AA27F2fCB5",
      polygon: "0x6f7C932e7684666C9fd1d44527765433e01fF61d",
    },
  },
  {
    symbol: "SNX",
    name: "Synthetix",
    decimals: 18,
    addresses: {
      ethereum: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
      arbitrum: "0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60",
      optimism: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4",
      polygon: "0x50B728D8D964fd00C2d0AAD81718b71311feF68a",
    },
  },
  {
    symbol: "COMP",
    name: "Compound",
    decimals: 18,
    addresses: {
      ethereum: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
      arbitrum: "0x354A6dA3fcde098F8389cad84b0182725c6C91dE",
      base: "0x9e1028F5F1D5eDE59748FFceE5532509976840E0",
      optimism: "0x7e7d4467112689329f7E06571eD0E8CbAd4910eE",
      polygon: "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c",
    },
  },
  {
    symbol: "CRV",
    name: "Curve DAO",
    decimals: 18,
    addresses: {
      ethereum: "0xD533a949740bb3306d119CC777fa900bA034cd52",
      arbitrum: "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
      optimism: "0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53",
      polygon: "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
      avalanche: "0x249848BeCA43aC405b8102Ec90Dd5F22CA513c06",
    },
  },
  {
    symbol: "LDO",
    name: "Lido DAO",
    decimals: 18,
    addresses: {
      ethereum: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
      arbitrum: "0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60",
      optimism: "0xFdb794692724153d1488CcdBE0C56c0045991c27",
      polygon: "0xC3C7d422809852031b44ab29EEC9F1EfF2A58756",
    },
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    decimals: 18,
    addresses: {
      ethereum: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
      arbitrum: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      base: "0x1DEBd73E752bEaF79865Fd6446b0c970EaE7732f",
      optimism: "0x00CBcF7B3d37844e44b888Bc747bDd75FCf4E555",
    },
  },
  {
    symbol: "OP",
    name: "Optimism",
    decimals: 18,
    addresses: {
      optimism: "0x4200000000000000000000000000000000000042",
    },
  },
  {
    symbol: "wstETH",
    name: "Wrapped stETH (Lido)",
    decimals: 18,
    addresses: {
      ethereum: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      arbitrum: "0x5979D7b546E38E414F7E9822514be443A4800529",
      base: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
      optimism: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
      polygon: "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD",
    },
  },
  {
    symbol: "rETH",
    name: "Rocket Pool ETH",
    decimals: 18,
    addresses: {
      ethereum: "0xae78736Cd615f374D3085123A210448E74Fc6393",
      arbitrum: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8",
      base: "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c",
      optimism: "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D",
      polygon: "0x0266F4F08D82372CF0FcbCCc0Ff74309089c74d1",
    },
  },
  {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18,
    addresses: {
      ethereum: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
      arbitrum: "0x1DEBd73E752bEaF79865Fd6446b0c970EaE7732f",
      base: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
      optimism: "0xadDb6A0412DE1BA0F936DCaeb8Aaa24578dcF3B2",
      polygon: "0x4b4327dB1600B8B1440163F667e199CEf35385f5",
    },
  },
  {
    symbol: "GRT",
    name: "The Graph",
    decimals: 18,
    addresses: {
      ethereum: "0xc944E90C64B2c07662A292be6244BDf05Cda44a7",
      arbitrum: "0x9623063377AD1B27544C965cCd7342f7EA7e88C7",
      polygon: "0x5fe2B58c013d7601147DcdD68C143A77499f5531",
    },
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    decimals: 18,
    addresses: {
      ethereum: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    },
  },
  {
    symbol: "XAUT",
    name: "Tether Gold",
    decimals: 6,
    addresses: {
      ethereum: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
    },
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
    addresses: {
      ethereum: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
      base: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
      avalanche: "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD",
    },
  },
];

/**
 * Get tokens available on a specific network.
 */
export function getTokensForNetwork(networkId: string): Token[] {
  return TOKENS.filter((t) => t.addresses[networkId] !== undefined);
}

/**
 * Reverse-lookup a token by its contract address on a specific network.
 * Returns the Token if found, or undefined if the address isn't a known token.
 */
export function findTokenByAddress(networkId: string, address: string): Token | undefined {
  const lower = address.toLowerCase();
  return TOKENS.find((t) => {
    const addr = t.addresses[networkId];
    return addr !== undefined && addr.toLowerCase() === lower;
  });
}
