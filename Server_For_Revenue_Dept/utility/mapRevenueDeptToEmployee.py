
from web3 import Web3
import os
import json




def mapRevenueDeptIdToEmployee(revenueDeptId,employeeId):
    config = {}
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)

    config["Ganache_Url"] = os.environ.get("GANACHE_URL", config.get("Ganache_Url", "http://127.0.0.1:8545"))
    config["Address_Used_To_Deploy_Contract"] = os.environ.get("ADDRESS_USED_TO_DEPLOY_CONTRACT", config.get("Address_Used_To_Deploy_Contract", ""))
    config["NETWORK_CHAIN_ID"] = os.environ.get("NETWORK_CHAIN_ID", config.get("NETWORK_CHAIN_ID", "31337"))


    # Connect to the Ganache network using Web3.py
    ganache_url = config["Ganache_Url"]


    web3 = Web3(Web3.HTTPProvider(ganache_url))


    # Set the contract deployer address
    web3.eth.default_account = config["Address_Used_To_Deploy_Contract"]



    NETWORK_CHAIN_ID = str(config["NETWORK_CHAIN_ID"])

    landRegistryContract = json.loads(
                open(
                        os.getcwd()+
                        "/../"+"Smart_contracts/build/contracts/"+
                        "LandRegistry.json"
                        ).read()
            )
    


    # Load the contract ABI and address from the compiled contract artifacts
    contract_abi = landRegistryContract["abi"]  # Insert the ABI here

    contract_address = landRegistryContract["networks"][NETWORK_CHAIN_ID]["address"] # Insert the contract address here

    # Create a contract instance using the ABI and address
    contract = web3.eth.contract(abi=contract_abi, address=contract_address)


    # Call the mapRevenueDeptIdToEmployee function with the desired parameters
    revenue_dept_id = revenueDeptId
    employee_address = employeeId  # Insert the employee's Ethereum address here

   
    txn_hash = contract.functions.mapRevenueDeptIdToEmployee(int(revenue_dept_id), employee_address).transact({'from': config["Address_Used_To_Deploy_Contract"]})
   
    # Wait for the transaction to be mined
    receipt = web3.eth.waitForTransactionReceipt(txn_hash)


    # print(web3.toJSON(receipt))
    # successful transaction
    if receipt['status'] == 1:
        return True
    else:
        return False
