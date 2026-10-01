from flask import Flask, jsonify,render_template,request,Response,redirect, session
from pymongo import MongoClient
import gridfs
from web3 import Web3, HTTPProvider
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import secrets
from pathlib import Path 

# our own module
from utility.mapRevenueDeptToEmployee import mapRevenueDeptIdToEmployee

# Get configuration info

config = {}
config_path = os.path.join(os.path.dirname(__file__), "config.json")
if os.path.exists(config_path):
    with open(config_path, "r") as f:
        config = json.load(f)

config["Address_Used_To_Deploy_Contract"] = os.environ.get("ADDRESS_USED_TO_DEPLOY_CONTRACT", config.get("Address_Used_To_Deploy_Contract", ""))
config["Admin_Password"] = os.environ.get("ADMIN_PASSWORD", config.get("Admin_Password", ""))
config["NETWORK_CHAIN_ID"] = os.environ.get("NETWORK_CHAIN_ID", config.get("NETWORK_CHAIN_ID", "31337"))
config["Mongo_Db_Url"] = os.environ.get("MONGO_DB_URL", config.get("Mongo_Db_Url", "mongodb://localhost:27017"))
config["Secret_Key"] = os.environ.get("SECRET_KEY") or config.get("Secret_Key") or secrets.token_hex(32)
config["Ganache_Url"] = os.environ.get("GANACHE_URL", config.get("Ganache_Url", "http://127.0.0.1:8545"))

adminAddress = config["Address_Used_To_Deploy_Contract"]
adminPassword = config["Admin_Password"]
NETWORK_CHAIN_ID = str(config["NETWORK_CHAIN_ID"])

client = MongoClient(config["Mongo_Db_Url"], serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)
LandRegistryDB = client.LandRegistry
fs = gridfs.GridFS(LandRegistryDB)
propertyDocsTable = LandRegistryDB.Property_Docs
employeesTable = client.Revenue_Dept.Employees

app = Flask(__name__)
app.secret_key = config["Secret_Key"]
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
    SESSION_COOKIE_SAMESITE="Lax",
)

@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/login", methods=['POST'])
def login():
    if request.method == 'POST':
        employeeId = request.form['employeeId']
        password = request.form['password']

        if employeeId == adminAddress and adminPassword and password == adminPassword:
            session['user_id'] = 'render-admin'
            return jsonify({'status':1, "msg":'Login Success', "revenueDepartmentId":"101", "empName":"Revenue Department Admin"})

        employee_store = os.path.join(os.path.dirname(__file__), "employee_store.json")
        user = None
        if os.path.exists(employee_store):
            try:
                with open(employee_store, "r") as f:
                    employees = json.load(f)
                user = employees.get(employeeId.lower())
            except Exception:
                user = None

        if user and check_password_hash(user['password'], password):
            session['user_id'] = "employee-" + employeeId.lower()
            return jsonify({'status':1, "msg":'Login Success', "revenueDepartmentId":user.get('revenueDeptId', 'ADMIN'), "empName":user.get('fname', 'Revenue Department Employee')})

        try:
            user = employeesTable.find_one({"employeeId":employeeId})
            if user and check_password_hash(user['password'], password):
                session['user_id'] = str(user['_id'])
                return jsonify({'status':1, "msg":'Login Success', "revenueDepartmentId":user.get('revenueDeptId', 'ADMIN'), "empName":user.get('fname', 'Revenue Department Employee')})
        except Exception:
            pass

        return jsonify({'status':0,"msg":'Invalid Wallet or password'})
    return jsonify({'status':0,"msg":'GET Not allowed'})

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/')

@app.route('/dashboard')
def dashboard():
    if 'user_id' in session:
        return render_template('dashboard.html')
    return redirect('/')

@app.route('/propertiesDocs/pdf/<propertyId>')
def get_pdf(propertyId):
    try:
        propertyDetails = propertyDocsTable.find_one({"Property_Id": str(propertyId)})

        if not propertyDetails:
            return jsonify({"status":0, "Reason":"No Property Matched With Id"})

        fileName = "%s_%s.pdf" % (propertyDetails.get('Owner', ''), propertyDetails.get('Property_Id', propertyId))

        # Prefer the legacy Property_Docs reference when present.
        file_id = propertyDetails.get(fileName)

        # If the reference field is missing, find the migrated GridFS file directly.
        if not file_id:
            migrated_filename = "Blockchain_Land_Record_%s.pdf" % propertyId
            grid_file = fs.find_one({"filename": migrated_filename})
            if grid_file:
                file_id = grid_file._id

        if not file_id:
            # Last fallback: locate the expected owner/property PDF by filename.
            grid_file = fs.find_one({"filename": fileName})
            if grid_file:
                file_id = grid_file._id

        if not file_id:
            return jsonify({"status":0, "Reason":"PDF file not found in GridFS"})

        file = fs.get(file_id)
        response = Response(file, content_type='application/pdf')
        response.headers['Content-Disposition'] = f'inline; filename="{file.filename}"'
        return response

    except Exception as e:
        return jsonify({"status":0, "Reason":str(e)})

@app.route('/fetchContractDetails')
def fetchContractDetails():
    usersContract = json.loads((Path(__file__).resolve().parent.parent / "Smart_contracts" / "build" / "contracts" / "Users.json").read_text())
    landRegistryContract = json.loads((Path(__file__).resolve().parent.parent / "Smart_contracts" / "build" / "contracts" / "LandRegistry.json").read_text())
    transferOwnerShip = json.loads((Path(__file__).resolve().parent.parent / "Smart_contracts" / "build" / "contracts" / "TransferOwnerShip.json").read_text())

    response = {}
    response["Users"] = {"address": usersContract["networks"][NETWORK_CHAIN_ID]["address"], "abi": usersContract["abi"]}
    response["LandRegistry"] = {"address": landRegistryContract["networks"][NETWORK_CHAIN_ID]["address"], "abi": landRegistryContract["abi"]}
    response["TransferOwnership"] = {"address": transferOwnerShip["networks"][NETWORK_CHAIN_ID]["address"], "abi": transferOwnerShip["abi"]}
    return response

@app.route('/admin')
def adminIndexPage():
    return render_template('admin.html')

@app.route("/adminLogin", methods=['POST'])
def adminLogin():
    if request.method == 'POST':
        adminAddressForm = request.form['adminAddress']
        password = request.form['password']

        if adminAddressForm == adminAddress and adminPassword and password == adminPassword:
            session['user_id'] = 'render-admin'
            return jsonify({'status':1, "msg":'Admin Login Success'})

        admin = employeesTable.find_one({'adminAddress': adminAddressForm})
        if admin and check_password_hash(admin['password'], password):
            session['user_id'] = str(admin['_id'])
            return jsonify({'status':1, "msg":'Admin Login Success'})
        return jsonify({'status':0,"msg":'Invalid Wallet or password'})
    return jsonify({'status':0,"msg":'GET Not allowed'})

@app.route("/addEmployee", methods=['POST'])
def addEmployee():
    if 'user_id' not in session:
        return jsonify({'status':0,"msg":'Login Required'})

    if request.method == 'POST':
        employeeId = request.form['empAddress']
        password = request.form['password']
        fname = request.form['fname']
        lname = request.form['lname']
        revenueDeptId = request.form['revenueDeptId']

        try:
            res = mapRevenueDeptIdToEmployee(revenueDeptId, employeeId)
            if not res:
                return jsonify({'status':0, "msg":"Blockchain mapping transaction failed"})

            employee_store = os.path.join(os.path.dirname(__file__), "employee_store.json")
            employees = {}
            if os.path.exists(employee_store):
                try:
                    with open(employee_store, "r") as f:
                        employees = json.load(f)
                except Exception:
                    employees = {}

            employees[employeeId.lower()] = {
                "employeeId": employeeId,
                "password": generate_password_hash(password),
                "fname": fname,
                "lname": lname,
                "revenueDeptId": revenueDeptId
            }

            with open(employee_store, "w") as f:
                json.dump(employees, f, indent=2)

            try:
                employeesTable.insert_one({
                    "employeeId":employeeId,
                    "password":generate_password_hash(password),
                    "fname":fname,
                    "lname":lname,
                    "revenueDeptId":revenueDeptId
                })
            except Exception:
                pass

            return jsonify({'status':1, "msg":f"Employee '{fname}' Added Successfully"})
        except Exception as e:
            return jsonify({'status':0, "msg":str(e)})

    return jsonify({'status':0,"msg":'GET Not allowed'})

if __name__ == '__main__':
    if((adminAddress is not None) and (adminPassword is not None)):
        admin = employeesTable.find_one({'adminAddress': adminAddress})
        if admin is None:
            print("\nAdding Admin Details To Database")
            admin = {"adminAddress":adminAddress, "password":generate_password_hash(adminPassword)}
            adminId = employeesTable.insert_one(admin).inserted_id
            if adminId is not None:
                print("Added Successfully")
            else:
                print("Failed to add Details")
                exit(0)
        app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))
    else:
        print("Admin Address Details Not found in Configuration file")
