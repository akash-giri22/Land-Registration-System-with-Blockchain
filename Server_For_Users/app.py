from flask import Flask, jsonify,render_template,request,Response,redirect
from pymongo import MongoClient
import gridfs
from web3 import Web3, HTTPProvider
import json
import os


# blockchain Network ID
NETWORK_CHAIN_ID = "31337"


# connect to mongo db
MONGO_DB_URL = os.environ.get("MONGO_DB_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_DB_URL)

# connect to database
LandRegistryDB = client.LandRegistry

# connect to file System
fs = gridfs.GridFS(LandRegistryDB)

# connect to collection
propertyDocsTable = LandRegistryDB.Property_Docs


app = Flask(
    __name__,
    static_url_path='',
    static_folder='web/static',
    template_folder='web/templates'
)
