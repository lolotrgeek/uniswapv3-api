# uniswapv3-api

Runs a uniswap clone locally and connects to it via python.

## Steps
1. install uniswapv3-code
1. install [uniswap-python](https://uniswap-python.com/getting-started.html)
1. update `constants.py` in uniswap-python: add chain id in dict named `_netid_to_name `
    ```
    _netid_to_name = {
        1: "mainnet",
        ...,
        31337: "localhost", # <-- add this line
    }
    ```

1. update `uniswap.py` in uniswap-python: set quoter address to the following
    ```
    quoter_addr = _str_to_addr("0xa513E6E4b8f2a923D98304ec87F64353C4D5C853")
    ```


## Versions
uniswap-python 0.7.1

# Uniswap V3 Built From Scratch

A Uniswap V3 clone built from scratch for educational purposes. Part of free and open-source [Uniswap V3 Development Book](https://uniswapv3book.com).

![Front-end application screenshot](/screenshot.png)

## Questions?

Each milestone has its own section in [the GitHub Discussions](https://github.com/Jeiwan/uniswapv3-book/discussions).
Don't hesitate to ask questions about anything that's not clear in the book!

## How to Run
1. Ensure you have [Foundry](https://github.com/foundry-rs/foundry) installed.

    ```
    NOTE: If on windows will need to run with WSL or Git Bash
    ```

1. Install the dependencies:
    ```shell
    $ forge install
    $ cd ui && yarn
    ```
1. Run Anvil:
    ```shell
    $ make anvil
    ```
1. Set environment variables and deploy contracts:
    ```shell
    $ source .envrc
    $ make deploy
    ```
1. Start the UI:
    ```shell
    $ cd ui && yarn start
    ```
1. In Metamask, import this private key and connect to `localhost:8545`:
    ```
    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    ```

![Metamask Setup screenshot](/metamask.png)

<em>Import Erc20 tokens into metamask by copying the printed addresses from anvil project `make deploy` shell above in step 4.</em>

## Versions
Anvil / Forge - 0.2.0

Node - 16.10.0

GNU Make 4.4.1