from flask import Flask, jsonify,render_template,request,Response,redirect
from pymongo import MongoClient
import gridfs
from web3 import Web3, HTTPProvider
import json
import os

NETWORK_CHAIN_ID = "31337"

MONGO_DB_URL = os.environ.get("MONGO_DB_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_DB_URL, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)
LandRegistryDB = client.LandRegistry
fs = gridfs.GridFS(LandRegistryDB)
propertyDocsTable = LandRegistryDB.Property_Docs

app = Flask(
    __name__,
    static_url_path='',
    static_folder='web/static',
    template_folder='web/templates'
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html',add_property=True)

@app.route('/uploadPropertyDocs', methods=['POST'])
def upload():
    registraionDocs = request.files['propertyDocs']
    owner = request.form['owner']
    propertyId = request.form['propertyId']
    try:
        file_id = fs.put(registraionDocs, filename="%s_%s.pdf"%(owner,propertyId))
        propertyDocsTable.insert_one({
            "Owner":owner,
            "Property_Id":propertyId,
            "%s_%s.pdf"%(owner,propertyId):file_id
        })
    except Exception:
        return jsonify({'status': 'Failed Uploading Files','fileId':str(0)})
    return jsonify({'status': 'success','fileId':str(file_id)})

@app.route('/propertiesDocs/pdf/<propertyId>')
def get_pdf(propertyId):
    try:
        propertyDetails = propertyDocsTable.find_one({"Property_Id": str(propertyId)})

        if not propertyDetails:
            return jsonify({"status":0,"Reason":"No Property Matched With Id"})

        fileName = "%s_%s.pdf" % (
            propertyDetails.get("Owner", ""),
            propertyDetails.get("Property_Id", propertyId)
        )

        # Existing/legacy Property_Docs reference.
        file_id = propertyDetails.get(fileName)

        # Migrated records use Blockchain_Land_Record_<id>.pdf in GridFS.
        if not file_id:
            grid_file = fs.find_one({
                "filename": "Blockchain_Land_Record_%s.pdf" % propertyId
            })
            if grid_file:
                file_id = grid_file._id

        # Final fallback: look for the expected owner/property filename.
        if not file_id:
            grid_file = fs.find_one({"filename": fileName})
            if grid_file:
                file_id = grid_file._id

        if not file_id:
            return jsonify({"status":0,"Reason":"PDF file not found in GridFS"})

        file = fs.get(file_id)
        response = Response(file, content_type='application/pdf')
        response.headers['Content-Disposition'] = f'inline; filename="{file.filename}"'
        return response

    except Exception as e:
        return jsonify({"status":0,"Reason":str(e)})

@app.route('/fetchContractDetails')
def fetchContractDetails():
    usersContract = json.loads(open(
        os.getcwd()+"/../"+"Smart_contracts/build/contracts/"+"Users.json"
    ).read())
    landRegistryContract = json.loads(open(
        os.getcwd()+"/../"+"Smart_contracts/build/contracts/"+"LandRegistry.json"
    ).read())
    transferOwnerShip = json.loads(open(
        os.getcwd()+"/../"+"Smart_contracts/build/contracts/"+"TransferOwnerShip.json"
    ).read())

    response = {}
    response["Users"] = {
        "address": usersContract["networks"][NETWORK_CHAIN_ID]["address"],
        "abi": usersContract["abi"]
    }
    response["LandRegistry"] = {
        "address": landRegistryContract["networks"][NETWORK_CHAIN_ID]["address"],
        "abi": landRegistryContract["abi"]
    }
    response["TransferOwnership"] = {
        "address": transferOwnerShip["networks"][NETWORK_CHAIN_ID]["address"],
        "abi": transferOwnerShip["abi"]
    }
    return response

@app.route('/logout')
def logout():
    return redirect('/')

@app.route('/availableToBuy')
def availableToBuy():
    return render_template('availableToBuy.html')

@app.route('/MySales')
def MySales():
    return render_template('mySales.html')

@app.route('/myRequestedSales')
def myRequestedSales():
    return render_template('myRequestedSales.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
