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

