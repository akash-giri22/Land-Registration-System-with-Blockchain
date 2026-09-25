async function connectToBlockchain()
{
  const notifyUser = document.getElementById("notifyUser");

  if (!window.ethereum) {
    notifyUser.classList.add("alert-danger");
    notifyUser.style.display = "block";
    notifyUser.innerText = "Please Add MetaMask extension for your browser !!";
    return;
  }

  try {
    window.web3 = new Web3(window.ethereum);
    showTransactionLoading();

    // Request the currently selected MetaMask account.
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No MetaMask account selected.");
    }

    const account = accounts[0];
    window.localStorage.setItem("userAddress", account);
    window.userAddress = account;

    const contractABI = JSON.parse(window.localStorage.Users_ContractABI);
    const contractAddress = window.localStorage.Users_ContractAddress;
    const contract = new window.web3.eth.Contract(contractABI, contractAddress);

    const userDetails = await contract.methods.users(account).call();

    loadingDiv = document.getElementById("loadingDiv");
    loadingDiv.style.color = "green";

    // Wallet already registered -> dashboard.
    if (
      userDetails &&
      userDetails.userID &&
      userDetails.userID.toLowerCase() === account.toLowerCase()
    ) {
      loadingDiv.innerHTML = `Connected with : ${account}
                              <br>
                              Account already registered. Redirecting to Dashboard...
                              `;

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
    // New wallet -> registration page.
    else {
      loadingDiv.innerHTML = `Connected with : ${account}
                              <br>
                              New account detected. Redirecting to Register...
                              `;

      setTimeout(() => {
        window.location.href = "/register";
      }, 500);
    }

  } catch (error) {
    console.log(error);
    closeTransactionLoading();
    notifyUser.innerText = error.message || "Unable to connect MetaMask.";
    notifyUser.classList.add("alert-danger");
    notifyUser.style.display = "block";
  }
}


// Detect MetaMask account changes immediately.
if (window.ethereum) {
  window.ethereum.on("accountsChanged", function(accounts) {
    if (!accounts || accounts.length === 0) {
      localStorage.removeItem("userAddress");
      window.location.href = "/";
      return;
    }

    const newAccount = accounts[0];
    const oldAccount = localStorage.getItem("userAddress");

    if (oldAccount && oldAccount.toLowerCase() !== newAccount.toLowerCase()) {
      localStorage.setItem("userAddress", newAccount);
      window.location.href = "/";
    }
  });
}


function showTransactionLoading(){
  loadingDiv = document.getElementById("loadingDiv");
  loadingDiv.style.display = "block";
}

function closeTransactionLoading(){
  loadingDiv = document.getElementById("loadingDiv");
  loadingDiv.style.display = "none";
}
