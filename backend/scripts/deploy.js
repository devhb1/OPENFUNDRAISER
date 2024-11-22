const hre = require("hardhat");

async function main() {
  // Deploy CampaignNFT Contract
  const CampaignNFT = await hre.ethers.getContractFactory("CampaignNFT");
  const campaignNFT = await CampaignNFT.deploy();
  await campaignNFT.waitForDeployment();
  const nftContractAddress = await campaignNFT.getAddress();
  console.log("CampaignNFT deployed to:", nftContractAddress);

  // Deploy Campaign Contract
  const Campaign = await hre.ethers.getContractFactory("Campaign");
  const campaign = await Campaign.deploy();
  await campaign.waitForDeployment();
  const campaignContractAddress = await campaign.getAddress();
  console.log("Campaign deployed to:", campaignContractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });