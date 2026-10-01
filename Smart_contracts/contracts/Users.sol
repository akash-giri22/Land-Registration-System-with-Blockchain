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
        string memory _dateOfBirth,
        string memory _aadharNumber
    ) public {
        require(!registeredUsers[msg.sender], "User already registered");
        require(bytes(_aadharNumber).length == 12, "Aadhar must contain 12 digits");

        bytes memory aadharBytes = bytes(_aadharNumber);
        for (uint256 i = 0; i < aadharBytes.length; i++) {
            require(
                aadharBytes[i] >= 0x30 && aadharBytes[i] <= 0x39,
                "Aadhar must contain only digits"
            );
        }

        bytes32 aadharHash = keccak256(abi.encodePacked(_aadharNumber));
        require(!aadharHashes[aadharHash], "Aadhar number already registered");

        User memory newUser = User({
            userID: msg.sender,
            firstName: _firstName,
            lastName: _lastName,
            dateOfBirthHash: keccak256(abi.encodePacked(_dateOfBirth)),
            aadharHash: aadharHash,
            accountCreatedDateTime: block.timestamp
        });

        users[msg.sender] = newUser;
        registeredUsers[msg.sender] = true;
        aadharHashes[aadharHash] = true;

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
