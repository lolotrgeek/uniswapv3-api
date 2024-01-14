import { ethers } from "ethers"
import config from "./config.js"
import { TickMath, encodeSqrtRatioX96, nearestUsableTick } from '@uniswap/v3-sdk'
import debounce from './src/lib/debounce'
import { uint256Max, feeToSpacing } from './src/lib/constants'
import computePoolAddress from './src/lib/computePoolAddress'
import PathFinder from './src/lib/pathFinder'

// Account
const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const pk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const wallet = new ethers.Wallet(pk)
const rpc = "http://localhost:8545/"

// async function main() {
//     const provider = new ethers.JsonRpcProvider()
//     const signer = provider.getSigner()

//     const block = await provider.getBlockNumber()
//     console.log(block)

//     let balance = await provider.getBalance(address)
//     console.log(balance.toString())

//     const weth_contract = new ethers.Contract(WETH, TokenABI, provider)
//     const sym = await weth_contract.symbol()
//     console.log(sym)
//     const decimals = await contract.decimals()
//     console.log(decimals)


// }
const q96 = 2 ** 96

const countPathTokens = path => (path.length - 1) / 2 + 1
const priceToSqrtP = price => encodeSqrtRatioX96(price, 1)
const priceToTick = price => TickMath.getTickAtSqrtRatio(priceToSqrtP(price))
const pathToTypes = path => (["address"].concat(new Array(countPathTokens(path) - 1).fill(["uint24", "address"]).flat()))
const tokenByAddress = async (address, tokens) => tokens.filter(t => t.address === address)[0]
const sqrtPriceToPrice = sqrtp => (sqrtp / q96) ** 2

/**
* Load pairs from a Factory address by scanning for 'PoolCreated' events.
* 
* @returns array of 'pair' objects.
*/
const loadPairs = async () => {
    const provider = new ethers.JsonRpcProvider()
    const factory = new ethers.Contract(config.factoryAddress, config.ABIs.Factory, provider)

    let events = await factory.queryFilter("PoolCreated", "earliest", "latest")
    const pairs = events.map(event => {
        return {
            token0: {
                address: event.args.token0,
                symbol: config.tokens[event.args.token0].symbol
            },
            token1: {
                address: event.args.token1,
                symbol: config.tokens[event.args.token1].symbol
            },
            fee: event.args.fee,
            address: event.args.pool
        }
    })
    return pairs
}

/**
 * Converts an array of pairs to an array of tokens.
 * @param {*} pairs 
 * @returns 
 */
const pairsToTokens = async pairs => {
    const tokens = pairs.reduce((acc, pair) => {
        acc[pair.token0.address] = {
            symbol: pair.token0.symbol,
            address: pair.token0.address,
            selected: false
        }
        acc[pair.token1.address] = {
            symbol: pair.token1.symbol,
            address: pair.token1.address,
            selected: false
        }

        return acc
    }, {})

    return Object.keys(tokens).map(k => tokens[k])
}

/**
 * Calculates output amount by querying Quoter contract. Sets 'priceAfter' and 'amountOut'.
 * 
 * @param {*} token0 address
 * @param {*} token1 address
 * @param {*} amount string
 */
const updateAmountOut = async (token0, token1, amount) => {
    if (amount === 0 || amount === "0") return
    const pairs = await loadPairs()
    const pathFinder = new PathFinder(pairs)
    const path = pathFinder.findPath(token0, token1)
    const provider = new ethers.getDefaultProvider(rpc)
    let walletConnected = wallet.connect(provider)

    const quoter = new ethers.Contract(config.quoterAddress, config.ABIs.Quoter, walletConnected)
    const packedPath = ethers.solidityPacked(pathToTypes(path), path)
    const amountIn = ethers.parseEther(amount)
    const quote = await quoter.quote.staticCall(packedPath, amountIn)
    const amountOut = ethers.formatEther(quote[0])
    return amountOut
}

const setTransactionFee = async () => {
    const provider = new ethers.getDefaultProvider(rpc)
    const feeData = await provider.getFeeData()
    return feeData
}

const getPools = async () => {
    const provider = new ethers.getDefaultProvider(rpc)
    let walletConnected = wallet.connect(provider)
    const pairs = await loadPairs()
    const pools = pairs.map(pair => new ethers.Contract(pair.address, config.ABIs.Pool, walletConnected))
    return pools
}

const getPool = async (token0, token1, fee) => {
    if (!token0 || !token1) return
    // const poolAddress = computePoolAddress(config.factoryAddress, token0, token1, fee)
    const poolAddress = "0x0787a9981bfDEBe5730DF0Ce71A181F50d178fc9" 
    const provider = new ethers.getDefaultProvider(rpc)
    let walletConnected = wallet.connect(provider)
    const pool = new ethers.Contract(poolAddress, config.ABIs.Pool, walletConnected)
    // console.log(pool.interface.fragments)
    return pool
}

const getLiquidity = async (token0, token1, fee) => {
    const pool = await getPool(token0, token1, fee)
    const liquidity = await pool.positions()
    return liquidity
}

/**
 * 
 * @param {*} token0 
 * @param {*} token1 
 * @param {*} fee 
 * @docs https://uniswapv3book.com/milestone_1/deployment.html?highlight=current%20price#current-tick-and-price
 * @returns 
 */
const getPrice = async (token0, token1, fee) => {
    try {
        if (!token0 || !token1) return
        const pool = await getPool(token0, token1, fee)
        const has_slot0 = pool.interface.fragments.find(f => f.name === 'slot0')
        if (!has_slot0) return { "error": "Pool does not have slot0" }
        const quote = await pool.slot0()
        console.log(quote)
        let sqrtPriceX96 = Number(quote[0])
        let tickSpacing = 60
        let tick = Number(quote[1])
        let nearest_tick = Math.round(tick / tickSpacing) * tickSpacing
        let tickedsqrtP = Math.floor((1.0001 ** (nearest_tick / 2)) * q96)
        let tickedPrice = sqrtPriceToPrice(tickedsqrtP)
        let price = sqrtPriceToPrice(sqrtPriceX96) 
        console.log('price', price, tickedPrice )
        // return price - tickedPrice + price
        return price
    } catch (err) {
        console.error(err)
        return { "error": err }
    }
}

/**
 * 
 * @param {*} token0 
 * @param {*} token1 
 * @param {*} fee 
 * @docs https://uniswapv3book.com/milestone_1/deployment.html?highlight=current%20price#current-tick-and-price
 * @returns 
 */
const getTickSpacing = async (token0, token1, fee) => {
    try {
        if (!token0 || !token1) return
        const pool = await getPool(token0, token1, fee)
        console.log(pool)
        const has_tickSpacing = pool.interface.fragments.find(f => f.name === 'tickSpacing')
        if (!has_tickSpacing) return { "error": "Pool does not have tickSpacing" }
        const quote = await pool.tickSpacing()
        let tick = Number(quote)
        console.log(tick)
        return tick
    } catch (err) {
        console.error(err)
        return { "error": err }
    }
}



/**
 * Adds liquidity to a pool. Asks user to allow spending of tokens.
 * 
 * @param {*} token0 address
 * @param {*} token1 address
 * @param {*} amount0 string
 * @param {*} fee number the fee level for the pool: `500`, `3000`, or `10000`
 * @param {*} lowerPrice string the lower price for the liquidity range
 * @param {*} upperPrice string the upper price for the liquidity range
 * @param {*} slippage number
 * 
 */
const addLiquidity = async (token0, token1, amount0, fee, lowerPrice, upperPrice, slippage) => {
    try {
        if (!token0 || !token1) return
        const provider = new ethers.getDefaultProvider(rpc)
        let walletConnected = wallet.connect(provider)
        const manager = new ethers.Contract(config.managerAddress, config.ABIs.Manager, walletConnected)
        const Token0 = new ethers.Contract(token0, config.ABIs.ERC20, walletConnected)
        const Token1 = new ethers.Contract(token1, config.ABIs.ERC20, walletConnected)        

        const pairs = await loadPairs()
        const pathFinder = new PathFinder(pairs)
        const path = pathFinder.findPath(token0, token1)

        const price = await getPrice(token0, token1, fee)

        const median_amount1 = (Math.sqrt(price/amount0)+price).toString()
        const low_amount1 = (Math.sqrt(lowerPrice/amount0)+(price*amount0)).toString()
        console.log(low_amount1)
        const amount0Desired = ethers.parseEther(amount0)
        const amount1Desired = ethers.parseEther(low_amount1)

        console.log(typeof amount1Desired, amount1Desired)
        if (amount1Desired < 0) return 'Invalid amount!'
        if (amount1Desired === amount0Desired) return 'Same amount!'

        const _min = (100 - slippage) * 100
        console.log("min:", _min)

        const amount0Min = ethers.parseEther((amount0 * _min / 10000).toString())
        const amount1Min = ethers.parseEther((low_amount1 * _min / 10000).toString())

        console.log(amount0Min, amount1Min)

        // check if amount0Min and amount1Min are smaller than uint256
        if (amount0Min > uint256Max ) return 'Amoun0tMin too large!'
        if (amount1Min > uint256Max) return 'Amount1Min too large!'
        // check if amount0Min and amount1Min are greater that uint256
        if (amount0Min < -uint256Max) return 'Amount0Min too small!'
        if ( amount1Min < -uint256Max) return 'Amount1Min too small!'

        // check if amount0Desired and amount1Desired are larger than uint256
        if (amount0Desired > uint256Max || amount1Desired > uint256Max) return 'Amount too large!'
        // check if amount0Desired and amount1Desired are smaller than uint256
        if (amount0Desired < -uint256Max || amount1Desired < -uint256Max) return 'Amount too small!'

        if (amount1Desired < amount1Min) return `Will Slip! Amount1 ${amount1Desired.toString()} smaller than ${amount1Min.toString()}!`
        if (amount0Desired < amount0Min) return 'Will Slip! Amount0 too small!'

        // const fee = path[1]
        if (fee !== 500 && fee !== 3000 && fee !== 10000) return 'Invalid fee!'
        console.log('fee', fee)

        const lowerPriceTick = priceToTick(lowerPrice)
        const upperPriceTick = priceToTick(upperPrice)

        const lowerTick = nearestUsableTick(lowerPriceTick, feeToSpacing[fee])
        const upperTick = nearestUsableTick(upperPriceTick, feeToSpacing[fee])

        const int24Max = 2 ** 23 - 1

        if (lowerTick > int24Max || upperTick > int24Max) return 'Ticks too large!'
        if (lowerTick < -int24Max || upperTick < -int24Max) return 'Ticks too small!'


        const mintParams = {
            tokenA: token0,
            tokenB: token1,
            fee,
            lowerTick,
            upperTick,
            amount0Desired, 
            amount1Desired, 
            amount0Min, 
            amount1Min
        }

        console.log(mintParams)

        const allowance0 = await Token0.allowance(address, config.managerAddress)
        const allowance1 = await Token1.allowance(address, config.managerAddress)
        // console.log(allowance0, allowance1)

        if (allowance0 < amount0Desired) {
            const approve0 = await Token0.approve(config.managerAddress, uint256Max)
            console.log('approve0', approve0)
        }
        if (allowance1 < amount1Desired) {
            const approve1 = await Token1.approve(config.managerAddress, uint256Max)
            console.log('approve1', approve1)
        }
        console.log('minting...')
        const tx = await manager.mint(mintParams)
        const liquidityNFT = tx.wait()
        // add gas price and sign...
        console.log(liquidityNFT)
        return liquidityNFT
    } catch (err) {
        const provider = new ethers.getDefaultProvider(rpc)
        let walletConnected = wallet.connect(provider)
        const manager = new ethers.Contract(config.managerAddress, config.ABIs.Manager, walletConnected)
        let error
        
        if (err && err.info && err.info.error && err.info.error.data) {

            try {
                error = manager.interface.parseError(err.info.error.data)
            } catch (e) {
                if (e.message.includes('no matching error')) {
                    error = poolInterface.parseError(err.info.error.data)
                }
            }
            switch (error.name) {
                case "SlippageCheckFailed":
                    return (`Slippage check failed (amount0: ${ethers.formatUnits(error.args.amount0)}, amount1: ${ethers.formatUnits(error.args.amount1)})`)
                case "ZeroLiquidity":
                    return ('Zero liquidity!')
                case "Panic":
                    console.error(error)
                    return (`Panic! ${error.args[0]} ${JSON.stringify(error.fragment.inputs[0])}`)
                default:
                    console.error(error)
                    return ('Unknown error!')
            }
        }
        else error = err

        console.error(err)
    }
}


/**
 * Swaps tokens by calling Manager contract. Before swapping, asks users to approve spending of tokens.
 */
const swap = async (token0, token1, amount0, amount1) => {
    try {
        const pairs = await loadPairs()
        const pathFinder = new PathFinder(pairs)
        const path = pathFinder.findPath(token0, token1)
        const amountIn = ethers.parseEther(amount0)
        const amountOut = ethers.parseEther(amount1)
        const minAmountOut = amountOut.mul((100 - parseFloat(slippage)) * 100).div(10000)
        const packedPath = ethers.solidityPack(pathToTypes(path), path)
        const params = {
            path: packedPath,
            recipient: account,
            amountIn: amountIn,
            minAmountOut: minAmountOut
        }
        const token = tokenIn.attach(path[0])
        const allowance = await token.allowance(account, config.managerAddress)
        if (allowance.lt(amountIn)) return token.approve(config.managerAddress, uint256Max).then(tx => tx.wait())
        return manager.swap(params).then(tx => tx.wait())
    } catch (err) {
        console.error(err)
    }
}



/**
 * Fetches available liquidity from a position.
 */
const getAvailableLiquidity = debounce((amount, isLower) => {
    const lowerTick = priceToTick(isLower ? amount : lowerPrice)
    const upperTick = priceToTick(isLower ? upperPrice : amount)

    const params = {
        tokenA: token0.address,
        tokenB: token1.address,
        fee: fee,
        owner: account,
        lowerTick: nearestUsableTick(lowerTick, feeToSpacing[fee]),
        upperTick: nearestUsableTick(upperTick, feeToSpacing[fee]),
    }

    manager.getPosition(params)
        .then(position => setAvailableAmount(position.liquidity.toString()))
        .catch(err => console.error(err))
}, 500)

export { loadPairs, pairsToTokens, updateAmountOut, setTransactionFee, getPools, getPool, getPrice, getTickSpacing, getLiquidity, addLiquidity }