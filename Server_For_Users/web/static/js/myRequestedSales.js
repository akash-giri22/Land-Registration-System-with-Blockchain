



async function checkConnection()
{
  if (!window.ethereum) {
    alert("Please Add MetaMask extension to your browser !!");
    return;
  }

  try {
    window.web3 = new Web3(window.ethereum);

    // Get the account currently selected in MetaMask.
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      localStorage.removeItem("userAddress");
      window.location.href = "/";
      return;
    }

    const connectedAccount = accounts[0];
    const loggedInAccount = localStorage.getItem("userAddress");

    console.log("Account Connected to MetaMask:", connectedAccount);
    console.log("Account used to login:", loggedInAccount);

    // Ethereum addresses are case-insensitive. MetaMask/Web3 can return the
    // same address with different checksum casing, so always compare lowercase.
    if (!loggedInAccount || connectedAccount.toLowerCase() !== loggedInAccount.toLowerCase()) {
      alert("Mismatch in account used to login and connected to MetaMask. Please login again.");
      localStorage.removeItem("userAddress");
      window.location.href = "/";
      return;
    }

    // Keep one normalized value for the rest of this page.
    localStorage.setItem("userAddress", connectedAccount);
    window.userAddress = connectedAccount;

    console.log("Wallet verified successfully.");

    fetchUserDetails();
    fetchMyRequestedSales();
  } catch (error) {
    console.error("Wallet connection failed:", error);
    alert(error.message || error);
  }
}

async function fetchUserDetails() {

  let contractABI = JSON.parse(window.localStorage.Users_ContractABI);
  let contractAddress = window.localStorage.Users_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  userDetails = await contract.methods.users(accountUsedToLogin)
    .call()
    .then(
      function (value) {
        return value;
      });


  if (
    userDetails &&
    userDetails["userID"] &&
    accountUsedToLogin &&
    userDetails["userID"].toLowerCase() === accountUsedToLogin.toLowerCase()
  ) {

    document.getElementById("nameOfUser").innerText = userDetails["firstName"];

    // document.getElementById("lname").innerText = userDetails["lastName"];

    // document.getElementById("account").innerText = userDetails["userID"];

    // document.getElementById("dob").innerText = userDetails["dateOfBirth"];

    // document.getElementById("aadharNumber").innerText = userDetails["aadharNumber"];
  }
  else {
    alert("Account Not Found !! Please Login again")
  }

}



async function getStatusOfPurchseRequest(saleId){

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI,contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try{

    requestedUsersForASale = await contract.methods.getRequestedUsers(
                                                saleId
                                                ).call()
                                                .then(function(value){
                                                  return value;
                                                });
  

    for(let i=0;i<requestedUsersForASale.length;i++)
    {

      buyer = requestedUsersForASale[i]["user"];

      if (buyer && accountUsedToLogin && buyer.toLowerCase() === accountUsedToLogin.toLowerCase()){
        // covert price to ethers
        price = web3.utils.fromWei(requestedUsersForASale[i]["priceOffered"]);
        state = requestedUsersForASale[i]["state"];

        return {
          buyerAddress : buyer,
          priceOffered : price,
          state : state
        };
      }

    }
  
  }
  catch(error)
  {
    console.log(error);
    showError(error);
  }

}



async function fetchMyRequestedSales(){

    
  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI,contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try{

    myRequestedSales = await contract.methods.getRequestedSales(
                                                accountUsedToLogin
                                                ).call()
                                                .then(function(value){
                                                  return value;
                                                });
    
    console.log(myRequestedSales);

    
    let tableBody = document.getElementById("salesTableBody");

    let tableBodyCode = "";
    let tableRow = "";

    let saleId = "";

    for(let i=0;i<myRequestedSales.length;i++)
    {
      
      saleId = myRequestedSales[i]["saleId"];

      statusOfPurchseRequestSent = await getStatusOfPurchseRequest(saleId);

      tableRow = "<tr>";


      tableRow += `<td></td>`;
      tableRow += "<td>"+ saleId + "</td>";
      tableRow += "<td>"+myRequestedSales[i]["propertyId"]+ "</td>";
      tableRow += "<td>"+  web3.utils.fromWei(myRequestedSales[i]["price"])+ "</td>";
      tableRow += "<td>"+  statusOfPurchseRequestSent.priceOffered + "</td>";
     
    
      tableRow += "<td>"+ handleStateOfPurchaseRequestSent( statusOfPurchseRequestSent.state )+ "</td>";


      // add options 
      tableRow += `<td ${addOptionsBasedOnState(
                            statusOfPurchseRequestSent,
                            myRequestedSales[i]
                          )} 
                   </td>`;
                        
      tableRow += "</tr>";

      tableBodyCode += tableRow;
    }

    tableBody.innerHTML = tableBodyCode;

   
  }
  catch(error)
  {
    console.log(error);
    showError(error);
  }
}



function addOptionsBasedOnState(statusOfPurchseRequestSent,sale){

  res = null;

  state = statusOfPurchseRequestSent.state;

  saleId = sale["saleId"];
  saleState = sale["state"];

  priceOffered = statusOfPurchseRequestSent.priceOffered

  if (saleState == 2){
    res  = `class="saleTerminated"> Sale Terminated`;
  }
  else if (saleState == 3)
  {
    res = `class="saleClosed"> Sale Closed`;
  }
  else if(state == 0 || state == 6){
    res = `><button class="cancelPurchaseRequestSentToSellerButton" onclick="cancelPurchaseRequestSentToSeller(${saleId})"> Cancel Request </button>`;
  }
  else if(state == 1 || state == 3 || state == 4 || state == 5){
    if(saleState == 0) // sale is active
    {
      res = `><button class="rerequestPurchaseRequestButton" onclick="rerequestPurchaseRequest(${saleId})"> Re-Request </button>`;
    }
    else{
      res = `class="saleIsNotActive"> Currently Sale is Not Active`;
    }

    
  }
  else if(state == 2)
  {
    res = `><button onclick="makePayment(
                          ${saleId},
                          ${priceOffered}
                  )" class="makePaymentButton"> Make Payment 
          </button> 
          <button onclick="rejectingAcceptanceRequestByBuyer(${saleId})" class="rejectingAcceptanceRequestByBuyerButton">
              Cancel Payment
          </button>
          `;
  }
  else
  {
    res = "No Options";
  }

  return res;
 
}


function handleStateOfPurchaseRequestSent(state)
{
 

  if(state == 0){
    return "Sent Request";
  }
  else if(state == 1){
      return "Canceled Request Sent";
  }
  else if(state == 2)
  {
      return "Seller Accepted Purchase"
  }
  else if(state == 3)
  {
      return "Seller Rejected Purchase";
  }
  else if(state == 4)
  {
    return "Seller Rejected <br> Acceptance Permission"
  }
  else if(state == 5)
  {
    return "Canceled Acceptance Request";
  }
  else if(state == 6)
  {
    return "Re-Requested Purchase";
  }
  else if(state == 7)
  {
    return "Purchase Success";
  }
  else
  {
      return "Invalid";
  }
 

}



async function makePayment(saleId){ 
  alertUser("", "alert-info", "none");

  const contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);
  const contractAddress = window.localStorage.TransferOwnership_ContractAddress;
  const contract = new window.web3.eth.Contract(contractABI, contractAddress);
  const accountUsedToLogin = window.localStorage["userAddress"];

  try {
    const chainId = await window.web3.eth.getChainId();
    if (Number(chainId) !== 31337) {
      throw new Error("Wrong network. Please switch MetaMask to Ganache chain ID 31337.");
    }

    // Always read the accepted amount and deadline from the blockchain.
    // Never trust a UI-calculated price for a payable transaction.
    const requestedSales = await contract.methods
      .getRequestedSales(accountUsedToLogin)
      .call();

    const sale = requestedSales.find(
      item => String(item.saleId) === String(saleId)
    );

    if (!sale) {
      throw new Error("Sale request could not be found. Please refresh the page.");
    }

    if (String(sale.state) !== "1") {
      throw new Error("This sale is no longer waiting for payment.");
    }

    const deadline = Number(sale.deadlineForPayment);
    const now = Math.floor(Date.now() / 1000);
    if (!deadline || now >= deadline) {
      throw new Error("Payment deadline has expired. Please submit a new purchase request.");
    }

    const paymentWei = sale.acceptedPrice;
    if (!paymentWei || paymentWei === "0") {
      throw new Error("Accepted payment amount is invalid.");
    }

    const balance = await window.web3.eth.getBalance(accountUsedToLogin);
    if (window.web3.utils.toBN(balance).lt(window.web3.utils.toBN(paymentWei))) {
      throw new Error(
        "Insufficient ETH balance. Please add enough ETH for the property payment and gas."
      );
    }

    const minutesLeft = Math.ceil((deadline - now) / 60);
    showTransactionLoading(
      "Payment in progress...<br><small>" + minutesLeft + " minute(s) remaining</small>"
    );

    await contract.methods
      .transferOwnerShip(saleId)
      .send({
        from: accountUsedToLogin,
        value: paymentWei
      });

    closeTransactionLoading();
    alertUser(
      "Payment successful. Property ownership has been transferred.",
      "alert-success",
      "block"
    );
    fetchMyRequestedSales();
  } catch (error) {
    console.error("Payment failed:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}


// function: TO cancel the purchase request
async function cancelPurchaseRequestSentToSeller(saleId)
{

  alertUser("","alert-info","none");
     
  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI,contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try{
    showTransactionLoading("Canceling Purchase Request Sent..");

    await contract.methods.cancelPurchaseRequestSentToSeller(
                                                  saleId
                                                )
                                                .send({from:accountUsedToLogin});
     
    closeTransactionLoading()
    alertUser("Successfully Canceled Purchase Request","alert-success","block");
    fetchMyRequestedSales();
    
  }
  catch(error)
  {
    console.log(error);
    reason = showError(error);
    closeTransactionLoading();
    alertUser(reason,"alert-danger","block");
  }
  
}



async function rerequestPurchaseRequest(saleId)
{

  alertUser("","alert-info","none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI,contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  price =  await showPrompt().then((value) => {
    return value;
  });
  
  if(price!= null && price!=""){
  try{

   showTransactionLoading("Re-Requesting Purchase...");

   await contract.methods.rerequestPurchaseRequest(
                            saleId,
                            price
                          )
                          .send({
                            from:accountUsedToLogin
                          })
                          .on('transactionHash', function(hash) {
                            // console.log("Transaction hash:", hash);
                          })
                          .on('receipt', function(receipt) {
                              // console.log("Transaction receipt:", receipt);
                          })
                          .on('error', function(error, receipt) {
                              console.error("Transaction error:", error);
                          });

      closeTransactionLoading()
      alertUser("Request Sent Successfully","alert-success","block");
      fetchMyRequestedSales();
    }
    catch(error)
    {
      console.log(error);
      reason = showError(error);
      closeTransactionLoading();
      alertUser(reason,"alert-danger","block");

    }
  }else{
    alertUser("Please Enter Price",'alert-warning',"block");
  }

}


async function rejectingAcceptanceRequestByBuyer(saleId){


  alertUser("","alert-info","none");
  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI,contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try{

    showTransactionLoading("Rejecting Acceptance Request...");
    await contract.methods.rejectingAcceptanceRequestByBuyer(
                                                  saleId
                                                )
                                                .send({from:accountUsedToLogin});

    closeTransactionLoading()
    alertUser("Successfully Rejected Acceptance Request","alert-success","block");
    fetchMyRequestedSales();
    
  }
  catch(error)
  {
    console.log(error);
    reason = showError(error);
    closeTransactionLoading();
    alertUser(reason,"alert-danger","block");
  }
  

}







function showTransactionLoading(msg) {

  loadingDiv = document.getElementById("loadingDiv");

  loadingDiv.children[0].innerHTML = msg;

  loadingDiv.style.display = "block";
}

function closeTransactionLoading() {
  loadingDiv = document.getElementById("loadingDiv");

  loadingDiv.style.display = "none";
}


// show error reason to user
function showError(errorOnTransaction) {
  if (!errorOnTransaction) {
    return "Transaction failed. Please try again.";
  }

  const code = errorOnTransaction.code ?? errorOnTransaction.rpcCode;
  if (code === 4001 || code === 53) {
    return "Transaction rejected in MetaMask.";
  }

  const message = String(
    errorOnTransaction.reason ||
    errorOnTransaction.data?.message ||
    errorOnTransaction.error?.message ||
    errorOnTransaction.message ||
    errorOnTransaction
  );

  const knownReasons = [
    "Payment deadline has passed",
    "Payment amount must be equal to accepted price",
    "Only accepted buyer can complete the sale",
    "Sale is not accepted",
    "Payment already completed",
    "Buyer not found in requested list",
    "Insufficient funds",
    "Wrong network"
  ];

  for (const reason of knownReasons) {
    if (message.includes(reason)) {
      return reason;
    }
  }

  return message.length > 300 ? message.slice(0, 300) + "..." : message;
}


function alertUser(msg,msgType,display){

  console.log(msg,display);
  notifyUser = document.getElementById("notifyUser");

  notifyUser.classList = [];
  notifyUser.classList.add("alert");
  notifyUser.classList.add(msgType);
  notifyUser.innerText = msg;
  notifyUser.style.display = display;


  
}




function showPrompt() {
  // Get the necessary elements
  const containerBackCover = document.getElementById('prompt-container-backcover');
  const container = document.getElementById('prompt-container');
  const input = document.getElementById('prompt-input');
  const okButton = document.getElementById('prompt-ok');
  const cancelButton = document.getElementById('prompt-cancel');

  // Show the prompt container
  containerBackCover.style.display = 'block';

  // make input as empty
  input.value = "";

  // Return a Promise that resolves with the input value when "OK" is clicked, or null when "Cancel" is clicked
  return new Promise((resolve, reject) => {
    okButton.addEventListener('click', () => {
      containerBackCover.style.display = 'none';
      resolve(input.value);
    });
    cancelButton.addEventListener('click', () => {
      containerBackCover.style.display = 'none';
      resolve(null);
    });
  });
}

