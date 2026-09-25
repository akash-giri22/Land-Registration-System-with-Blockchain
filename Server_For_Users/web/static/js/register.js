async function checkConnection()
{
  if (!window.ethereum) {
    alert("Please add MetaMask extension for your browser.");
    return;
  }

  try {
    window.web3 = new Web3(window.ethereum);

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];

    console.log("Connected To MetaMask:", account);
    console.log("Account Used To Register:", window.localStorage["userAddress"]);

    // Keep the selected MetaMask account in sync.
    window.localStorage.setItem("userAddress", account);

    const contractABI = JSON.parse(window.localStorage.Users_ContractABI);
    const contractAddress = window.localStorage.Users_ContractAddress;
    const contract = new window.web3.eth.Contract(contractABI, contractAddress);

    // If this wallet is already registered, do NOT send another transaction.
    // The smart contract correctly rejects duplicate registration.
    const userDetails = await contract.methods.users(account).call();

    if (userDetails && userDetails.userID &&
        userDetails.userID.toLowerCase() === account.toLowerCase()) {
      alertUser(
        `This wallet is already registered. Redirecting to your dashboard...`,
        "alert-info",
        "block"
      );

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);
      return;
    }

    alertUser(
      `Wallet Connected : <span id="connectedAccount">${account.slice(0,6)}...${account.slice(-4)}</span>`,
      "alert-success",
      "block"
    );

  } catch (error) {
    console.error("Wallet/registration check failed:", error);
    alertUser(showError(error), "alert-danger", "block");
  }
}


async function registerUser(event)
{
  event.preventDefault();

  alertUser("", "alert-info", "none");

  const fname = document.getElementById("firstName").value.trim();
  const lname = document.getElementById("lastName").value.trim();
  const dob = document.getElementById("dob").value;
  const aadharNo = document.getElementById("aadharNo").value.trim();

  if (!/^[0-9]{12}$/.test(aadharNo)) {
    alertUser("Aadhar number must contain exactly 12 digits.", "alert-danger", "block");
    return;
  }

  const contractABI = JSON.parse(window.localStorage.Users_ContractABI);
  const contractAddress = window.localStorage.Users_ContractAddress;
  const contract = new window.web3.eth.Contract(contractABI, contractAddress);

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const connectedAccount = accounts[0];

    // Always use the currently connected wallet.
    window.localStorage.setItem("userAddress", connectedAccount);

    // IMPORTANT: Check first, before opening a MetaMask transaction.
    const existingUser = await contract.methods.users(connectedAccount).call();

    if (existingUser && existingUser.userID &&
        existingUser.userID.toLowerCase() === connectedAccount.toLowerCase()) {
      closeTransactionLoading();
      alertUser(
        "This wallet is already registered. Redirecting to your dashboard...",
        "alert-info",
        "block"
      );

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);
      return;
    }

    showTransactionLoading("Registering User...");

    await contract.methods
      .registerUser(fname, lname, dob, aadharNo)
      .send({ from: connectedAccount });

    const userDetails = await contract.methods.users(connectedAccount).call();

    if (userDetails && userDetails.userID &&
        userDetails.userID.toLowerCase() === connectedAccount.toLowerCase()) {
      showTransactionLoading("Registered Successfully<br>Redirecting to Dashboard");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 700);
    } else {
      closeTransactionLoading();
      alertUser("Registration failed. Please try again.", "alert-danger", "block");
    }

  } catch (error) {
    console.error("Registration failed:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}


function showTransactionLoading(msg) {
  const loadingDiv = document.getElementById("loadingDiv");

  loadingDiv.children[0].innerHTML = msg || "Processing...";
  loadingDiv.style.display = "block";
}


function closeTransactionLoading() {
  const loadingDiv = document.getElementById("loadingDiv");
  loadingDiv.style.display = "none";
}


function showError(errorOnTransaction) {
  if (!errorOnTransaction) {
    return "Registration failed. Please try again.";
  }

  if (errorOnTransaction.code === 4001) {
    return "Transaction rejected in MetaMask.";
  }

  const message = String(errorOnTransaction.message || errorOnTransaction);

  // Web3/MetaMask error formats vary. Try to extract the Solidity revert reason.
  const knownReasons = [
    "User already registered",
    "Aadhar number already registered",
    "User does not exist"
  ];

  for (const reason of knownReasons) {
    if (message.includes(reason)) {
      return reason;
    }
  }

  return message.length > 300
    ? message.slice(0, 300) + "..."
    : message;
}


function alertUser(msg, msgType, display) {
  console.log(msg, display);

  const notifyUser = document.getElementById("notifyUser");

  notifyUser.classList = [];
  notifyUser.classList.add("alert");
  notifyUser.classList.add(msgType);
  notifyUser.innerHTML = msg;
  notifyUser.style.display = display;
}
