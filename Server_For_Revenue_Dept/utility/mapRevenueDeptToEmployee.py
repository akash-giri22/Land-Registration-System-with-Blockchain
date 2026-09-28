from web3 import Web3
import os
import json


def mapRevenueDeptIdToEmployee(revenueDeptId, employeeId):
    config = {}
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)

    config["Ganache_Url"] = os.environ.get(
        "GANACHE_URL", config.get("Ganache_Url", "http://127.0.0.1:8545")
    )
    config["Address_Used_To_Deploy_Contract"] = os.environ.get(
        "ADDRESS_USED_TO_DEPLOY_CONTRACT",
        config.get("Address_Used_To_Deploy_Contract", ""),
    )
    config["NETWORK_CHAIN_ID"] = os.environ.get(
        "NETWORK_CHAIN_ID", config.get("NETWORK_CHAIN_ID", "31337")
    )

    web3 = Web3(Web3.HTTPProvider(config["Ganache_Url"]))
    web3.eth.default_account = config["Address_Used_To_Deploy_Contract"]

    network_chain_id = str(config["NETWORK_CHAIN_ID"])

    land_registry_contract = json.loads(
        open(
            os.getcwd()
            + "/../"
            + "Smart_contracts/build/contracts/"
            + "LandRegistry.json"
        ).read()
    )

    contract = web3.eth.contract(
        abi=land_registry_contract["abi"],
        address=land_registry_contract["networks"][network_chain_id]["address"],
    )

    # The Solidity function expects (uint256, address).
    # Form values arrive as strings, and Web3.py v5 requires the wallet
    # address to be normalized to a valid Ethereum address type.
    revenue_dept_id = int(revenueDeptId)
    employee_address = Web3.toChecksumAddress(employeeId.strip())

    txn_hash = contract.functions.mapRevenueDeptIdToEmployee(
        revenue_dept_id, employee_address
    ).transact({"from": config["Address_Used_To_Deploy_Contract"]})

    receipt = web3.eth.waitForTransactionReceipt(txn_hash)

    return receipt["status"] == 1
