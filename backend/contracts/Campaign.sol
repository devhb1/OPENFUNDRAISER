// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CampaignNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _tokenCounter;
    mapping(uint256 => string) private _campaignTokenURIs;

    constructor() ERC721("CampaignParticipationNFT", "CPNFT") Ownable(msg.sender) {}

    function mintNFT(address recipient, string memory campaignTokenURI) public returns (uint256) {
        _tokenCounter++;
        uint256 newItemId = _tokenCounter;
        _safeMint(recipient, newItemId);
        _setCampaignTokenURI(newItemId, campaignTokenURI);
        return newItemId;
    }

    function _setCampaignTokenURI(uint256 tokenId, string memory campaignTokenURI) internal {
        _campaignTokenURIs[tokenId] = campaignTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return _campaignTokenURIs[tokenId];
    }

    function getDonorNFTs(address donor) public view returns (uint256[] memory) {
        uint256[] memory ownedTokens = new uint256[](_tokenCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= _tokenCounter; i++) {
            if (_ownerOf(i) == donor) {
                ownedTokens[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = ownedTokens[i];
        }

        return result;
    }

    function manualMintNFT(address _recipient, string memory _campaignDetails) public onlyOwner returns (uint256) {
        string memory nftURI = string(abi.encodePacked(
            "Campaign NFT: ", 
            _campaignDetails
        ));
        
        return mintNFT(_recipient, nftURI);
    }
}

contract Campaign is CampaignNFT {
    struct CampaignData {
        string title;
        address payable fundraiser;
        uint256 goal;
        uint256 raisedAmount;
        uint256 deadline;
        string story;
        string imageUrl;
        bool isActive;
        bool isWithdrawn;
        address[] donors;
    }

    struct CampaignStatus {
        bool isActive;
        bool goalReached;
        bool fundsWithdrawn;
        uint256 timeRemaining;
    }

    mapping(uint256 => CampaignData) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    mapping(uint256 => mapping(address => bool)) public hasMintedNFT;

    uint256 public campaignCount;
    uint256 public totalFundsRaised;

    uint256[] public availableDurations = [2 minutes, 5 minutes, 15 minutes, 1 hours, 1 days, 7 days, 30 days];

    event CampaignCreated(uint256 campaignId, address fundraiser);
    event DonationReceived(uint256 campaignId, address donor, uint256 amount);
    event FundsWithdrawn(uint256 campaignId, address fundraiser, uint256 amount);
    event NFTMinted(uint256 campaignId, address donor, uint256 tokenId);
    event CampaignStatusChanged(uint256 campaignId, bool isActive);

    constructor() CampaignNFT() {}

    function createCampaign(
        string memory _title, 
        uint256 _goal, 
        uint256 _duration, 
        string memory _story, 
        string memory _imageUrl
    ) public {
        require(_goal > 0, "Goal must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        
        bool validDuration = false;
        for(uint256 i = 0; i < availableDurations.length; i++) {
            if(_duration == availableDurations[i]) {
                validDuration = true;
                break;
            }
        }
        require(validDuration, "Invalid duration selected");
        
        campaignCount++;
        campaigns[campaignCount].title = _title;
        campaigns[campaignCount].fundraiser = payable(msg.sender);
        campaigns[campaignCount].goal = _goal;
        campaigns[campaignCount].raisedAmount = 0;
        campaigns[campaignCount].deadline = block.timestamp + _duration;
        campaigns[campaignCount].story = _story;
        campaigns[campaignCount].imageUrl = _imageUrl;
        campaigns[campaignCount].isActive = true;

        emit CampaignCreated(campaignCount, msg.sender);
    }

    function getCampaignStatus(uint256 _campaignId) public view returns (CampaignStatus memory) {
        CampaignData storage campaign = campaigns[_campaignId];
        
        bool isActive = campaign.isActive && block.timestamp < campaign.deadline;
        bool goalReached = campaign.raisedAmount >= campaign.goal;
        uint256 timeRemaining = campaign.deadline > block.timestamp ? 
            campaign.deadline - block.timestamp : 0;

        return CampaignStatus({
            isActive: isActive,
            goalReached: goalReached,
            fundsWithdrawn: campaign.isWithdrawn,
            timeRemaining: timeRemaining
        });
    }

    function donate(uint256 _campaignId) public payable {
        require(campaigns[_campaignId].isActive, "Campaign is not active");
        require(block.timestamp < campaigns[_campaignId].deadline, "Campaign has ended");
        require(msg.value > 0, "Must send ether to donate");
        require(campaigns[_campaignId].raisedAmount + msg.value <= campaigns[_campaignId].goal, "Donation would exceed campaign goal");
        
        if(donations[_campaignId][msg.sender] == 0) {
            campaigns[_campaignId].donors.push(msg.sender);
        }
        
        donations[_campaignId][msg.sender] += msg.value;
        campaigns[_campaignId].raisedAmount += msg.value;
        totalFundsRaised += msg.value;
        
        emit DonationReceived(_campaignId, msg.sender, msg.value);

        // Mint NFT for donor if not already minted
        if (!hasMintedNFT[_campaignId][msg.sender]) {
            string memory asciiNFT = generateAsciiNFT(_campaignId, msg.sender);
            uint256 tokenId = mintNFT(msg.sender, asciiNFT);
            hasMintedNFT[_campaignId][msg.sender] = true;
            emit NFTMinted(_campaignId, msg.sender, tokenId);
        }

        if (campaigns[_campaignId].raisedAmount >= campaigns[_campaignId].goal) {
            campaigns[_campaignId].isActive = false;
            emit CampaignStatusChanged(_campaignId, false);
        }
    }

    function mintParticipationNFT(uint256 _campaignId) public {
        require(donations[_campaignId][msg.sender] > 0, "No donation made to this campaign");
        require(!hasMintedNFT[_campaignId][msg.sender], "NFT already minted");

        string memory asciiNFT = generateAsciiNFT(_campaignId, msg.sender);
        uint256 tokenId = mintNFT(msg.sender, asciiNFT);
        hasMintedNFT[_campaignId][msg.sender] = true;
        
        emit NFTMinted(_campaignId, msg.sender, tokenId);
    }

    function generateAsciiNFT(uint256 _campaignId, address _donor) private view returns (string memory) {
        uint256 randomness = uint256(keccak256(abi.encodePacked(block.timestamp, _donor, _campaignId)));
        string[5] memory asciiChars = [
            unicode"🌈", 
            unicode"🚀", 
            unicode"🌟", 
            unicode"🌍", 
            unicode"❤️"
        ];
        return string(abi.encodePacked(
            campaigns[_campaignId].title, 
            " - Campaign NFT #", 
            Strings.toString(_campaignId), 
            ": ", 
            asciiChars[randomness % 5]
        ));
    }

    function withdrawFunds(uint256 _campaignId) public {
        require(msg.sender == campaigns[_campaignId].fundraiser, "Only fundraiser can withdraw");
        require(campaigns[_campaignId].raisedAmount >= campaigns[_campaignId].goal, "Goal not reached");
        require(!campaigns[_campaignId].isWithdrawn, "Funds already withdrawn");
        require(block.timestamp >= campaigns[_campaignId].deadline, "Campaign not ended");

        uint256 amountToWithdraw = campaigns[_campaignId].raisedAmount;
        campaigns[_campaignId].isWithdrawn = true;

        (bool success, ) = campaigns[_campaignId].fundraiser.call{value: amountToWithdraw}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_campaignId, msg.sender, amountToWithdraw);
    }

    function refundDonation(uint256 _campaignId) public {
        require(!campaigns[_campaignId].isActive, "Campaign is still active");
        require(block.timestamp >= campaigns[_campaignId].deadline, "Campaign not ended");
        require(campaigns[_campaignId].raisedAmount < campaigns[_campaignId].goal, "Goal reached");
        
        uint256 donationAmount = donations[_campaignId][msg.sender];
        require(donationAmount > 0, "No donation to refund");

        donations[_campaignId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: donationAmount}("");
        require(success, "Refund transfer failed");
    }

    function getCampaignDonors(uint256 _campaignId) public view returns (address[] memory) {
        return campaigns[_campaignId].donors;
    }
}