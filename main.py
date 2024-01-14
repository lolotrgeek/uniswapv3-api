from uniswap import Uniswap

address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"          # or None if you're not going to make transactions
private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # or None if you're not going to make transactions
version = 3                       # specify which version of Uniswap to use
provider = "http://127.0.0.1:8545"    # can also be set through the environment variable `PROVIDER`
factory = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' # Factory address
router = '0x0165878A594ca255338adfa4d48449f69242Eb8F' # Manager (router) address
uniswap = Uniswap(address=address, private_key=private_key, version=version, provider=provider, factory_contract_addr=factory)


WETH = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
UNI = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
USDC = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
USDT = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
WBTC = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"

USDTUSDC = "0x4c3FC63156Ae8130903504408182e8e89e220454"
WBTCUSDT = "0x553C26124DaD824aAB7C349ED2AA75899156a097"
WETHUNI  = "0xA912b16987066455170cd9Aea18130D0EEDbb12d"
WETHUSDC = "0x0787a9981bfDEBe5730DF0Ce71A181F50d178fc9"



balance = uniswap.get_eth_balance()
print(balance)
weth = uniswap.get_token(WETH)
print(weth)
uni = uniswap.get_token(UNI)
print(uni)
usdc = uniswap.get_token(USDC)
print(usdc)
usdt = uniswap.get_token(USDT)
print(usdt)
wbtc = uniswap.get_token(WBTC)
print(wbtc)

price = uniswap.get_price_input(WETH, UNI, 1*10**18, 3000)