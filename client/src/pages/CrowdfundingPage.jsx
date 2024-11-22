import React, { useEffect, useState } from 'react';
import CampaignList from '../components/CampaignList';
import CreateCampaign from '../components/CreateCampaign';
import WalletConnect from '../components/WalletConnect';
import { ethers } from 'ethers';
import { getEnvVar } from '../config/env';
import { Alert, AlertDescription } from '../components/alert';

// Importing ABIs
import CampaignABI from '../contracts/Campaign.json';
import CampaignNFTABI from '../contracts/CampaignNFT.json';

const CrowdfundingPage = () => {
    const [account, setAccount] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [contract, setContract] = useState(null);
    const [nftContract, setNFTContract] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);
    const [totalFundsRaised, setTotalFundsRaised] = useState(0);
    const [userNFTs, setUserNFTs] = useState([]);

    useEffect(() => {
        const loadBlockchainData = async () => {
            try {
                // Validate environment configuration
                const requiredEnvVars = [
                    'VITE_CONTRACT_ADDRESS', 
                    'VITE_NFT_CONTRACT_ADDRESS', 
                    'VITE_RPC_URL',
                    'VITE_PINATA_API_KEY'
                ];

                requiredEnvVars.forEach(key => {
                    if (!import.meta.env[key]) {
                        throw new Error(`Environment variable ${key} is not configured`);
                    }
                });

                // Get contract addresses and RPC URL
                const campaignAddress = getEnvVar('VITE_CONTRACT_ADDRESS');
                const nftAddress = getEnvVar('VITE_NFT_CONTRACT_ADDRESS');
                const rpcUrl = getEnvVar('VITE_RPC_URL');

                // Check for MetaMask
                if (!window.ethereum) {
                    throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
                }

                // Set up the provider
                const provider = new ethers.BrowserProvider(window.ethereum);

                // If account exists, get signer
                let signer = null;
                if (account) {
                    try {
                        signer = await provider.getSigner();
                    } catch (signerError) {
                        console.error('Error getting signer:', signerError);
                        setAccount(null);
                        throw new Error('Could not get wallet signer');
                    }
                }

                const campaignContract = new ethers.Contract(
                    campaignAddress,
                    CampaignABI.abi,
                    signer || provider
                );

                const campaignNFTContract = new ethers.Contract(
                    nftAddress,
                    CampaignNFTABI.abi,
                    signer || provider
                );

                setContract(campaignContract);
                setNFTContract(campaignNFTContract);

                // Fetch total funds raised
                const totalRaised = await campaignContract.totalFundsRaised();
                setTotalFundsRaised(ethers.formatEther(totalRaised));

                // Fetch user-specific data only if account exists
                if (account) {
                    try {
                        const userNFTs = await campaignNFTContract.getDonorNFTs(account);
                        setUserNFTs(userNFTs);
                    } catch (nftError) {
                        console.error('Error fetching user NFTs:', nftError);
                        setUserNFTs([]);
                    }
                }

                await fetchCampaigns(campaignContract);
                setIsLoading(false);
                setError(null);
            } catch (err) {
                console.error('Error loading blockchain data:', err);
                setError(err.message || 'An unexpected error occurred');
                setIsLoading(false);
            }
        };

        // Only load blockchain data if environment is set up
        if (import.meta.env.VITE_CONTRACT_ADDRESS) {
            loadBlockchainData();
        }

        const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
            } else {
                setAccount(null);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [account]);

    const fetchCampaigns = async (campaignContract) => {
        try {
            const totalCampaigns = await campaignContract.campaignCount();
            const loadedCampaigns = [];

            for (let i = 1; i <= totalCampaigns; i++) {
                try {
                    const campaignData = await campaignContract.campaigns(i);
                    const status = await campaignContract.getCampaignStatus(i);

                    loadedCampaigns.push({
                        id: i,
                        title: campaignData.title,
                        fundraiser: campaignData.fundraiser,
                        goal: campaignData.goal,
                        raisedAmount: campaignData.raisedAmount,
                        deadline: campaignData.deadline,
                        story: campaignData.story,
                        imageUrl: campaignData.imageUrl,
                        backupImageUrl: '/placeholder-image.jpg',
                        status: {
                            isActive: status.isActive,
                            goalReached: status.goalReached,
                            fundsWithdrawn: status.fundsWithdrawn,
                            timeRemaining: status.timeRemaining
                        }
                    });
                } catch (campaignError) {
                    console.error(`Error fetching campaign ${i}:`, campaignError);
                }
            }
            setCampaigns(loadedCampaigns.reverse()); // Show newest campaigns first
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setError('Failed to load campaigns');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">
                        Open Fundraiser: Web3 Crowdfunding Platform
                    </h1>
                    {!account ? (
                        <WalletConnect setAccount={setAccount} />
                    ) : (
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                                {account.slice(0, 6)}...{account.slice(-4)}
                            </span>
                            <button
                                onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-300"
                            >
                                {showCreateCampaign ? 'Hide Form' : 'Create Campaign'}
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : account ? (
                    <div className="space-y-8">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-4">Total Funds Raised</h2>
                            <p className="text-2xl font-bold text-green-600">{totalFundsRaised} ETH</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-4">My Campaign NFTs</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {userNFTs.map((nftId, index) => (
                                    <div key={index} className="bg-gray-100 p-4 rounded-lg">
                                        NFT #{nftId.toString()}
                                    </div>
                                ))}
                                {userNFTs.length === 0 && (
                                    <p className="text-gray-500">No NFTs found</p>
                                )}
                            </div>
                        </div>
                        {showCreateCampaign && (
                            <CreateCampaign 
                                contract={contract} 
                                onSuccess={() => {
                                    fetchCampaigns(contract);
                                    setShowCreateCampaign(false);
                                }} 
                            />
                        )}
                        <CampaignList 
                            campaigns={campaigns} 
                            contract={contract}
                            account={account}
                            onCampaignUpdate={() => fetchCampaigns(contract)}
                        />
                    </div>
                ) : (
                    <p className="text-center text-gray-600">Connect your wallet to get started!</p>
                )}
            </main>
        </div>
    );
};

export default CrowdfundingPage;