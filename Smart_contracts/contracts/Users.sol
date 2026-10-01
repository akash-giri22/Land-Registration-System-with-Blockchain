// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Users {
  
    struct User {
        address userID;
        string firstName;
        string lastName;
        bytes32 dateOfBirthHash;
        bytes32 aadharHash;
        uint256 accountCreatedDateTime;
    }

    mapping(address => bool) private registeredUsers;
    mapping(address => User) public users;
    mapping(bytes32 => bool) private aadharHashes;
    
    event UserRegistered(address indexed userID, uint256 indexed accountCreatedDateTime);

    function registerUser(
        string memory _firstName,
        string memory _lastName,
        bytes32 _dateOfBirthHash,
        bytes32 _aadharHash
    ) public {
        require(!registeredUsers[msg.sender], "User already registered");
        require(_dateOfBirthHash != bytes32(0), "Invalid date-of-birth hash");
        require(_aadharHash != bytes32(0), "Invalid Aadhar hash");
        require(!aadharHashes[_aadharHash], "Aadhar number already registered");

        User memory newUser = User({
            userID: msg.sender,
            firstName: _firstName,
            lastName: _lastName,
            dateOfBirthHash: _dateOfBirthHash,
            aadharHash: _aadharHash,
            accountCreatedDateTime: block.timestamp
        });

        users[msg.sender] = newUser;
        registeredUsers[msg.sender] = true;
        aadharHashes[_aadharHash] = true;

        emit UserRegistered(msg.sender, block.timestamp);
    }


    function getUserDetails(
        address _userId
    ) public view returns (
        string memory firstName, 
        string memory lastName, 
        bytes32 dateOfBirthHash,
        bytes32 aadharHash,
        uint256 accountCreated
    ) {
        require(users[_userId].userID != address(0), "User does not exist");

        User storage user = users[_userId];

        return (
            user.firstName,
            user.lastName,
            user.dateOfBirthHash,
            user.aadharHash,
            user.accountCreatedDateTime
        );
    }
}
