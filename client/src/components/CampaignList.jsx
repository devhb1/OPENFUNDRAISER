import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Alert } from './alert';

const CampaignList = ({ campaigns, contract, account, onCampaignUpdate }) => {
    const [expandedCampaign, setExpandedCampaign] = useState(null);
    const [donorsList, setDonorsList] = useState({});
    const [ethPrice, setEthPrice] = useState(null);
    const [error, setError] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState({});
    const [activeCampaigns, setActiveCampaigns] = useState([]);
    const [endedCampaigns, setEndedCampaigns] = useState([]);

    useEffect(() => {
        fetchEthPrice();
        const timer = setInterval(updateTimeRemaining, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        updateCampaignCategories();
    }, [campaigns, timeRemaining]);

    const updateTimeRemaining = () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const updatedTime = {};
        
        campaigns.forEach(campaign => {
            const deadline = Number(campaign.deadline);
            const remaining = deadline - currentTime;
            updatedTime[campaign.id] = remaining > 0 ? remaining : 0;
        });
        
        setTimeRemaining(updatedTime);
    };

    const updateCampaignCategories = () => {
        const active = [];
        const ended = [];
        
        campaigns.forEach(campaign => {
            const remaining = timeRemaining[campaign.id];
            if (remaining > 0 && campaign.status.isActive) {
                active.push(campaign);
            } else {
                ended.push(campaign);
            }
        });

        setActiveCampaigns(active);
        setEndedCampaigns(ended);
    };

    const formatTimeRemaining = (seconds) => {
        if (seconds <= 0) return 'Ended';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
        return `${remainingSeconds}s`;
    };

    const toggleCampaignDetails = (campaignId) => {
        setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
    };

    const donate = async (campaignId, goal) => {
        try {
            if (!contract) {
                throw new Error("Contract not initialized. Please connect your wallet.");
            }

            const donationAmount = prompt(`Enter donation amount (ETH). 
Campaign goal is ${ethers.formatEther(goal)} ETH 
${ethPrice ? `(Current ETH Price: $${ethPrice.toFixed(2)})` : ''}`);
            
            if (!donationAmount) return;

            const parsedAmount = ethers.parseEther(donationAmount);
            
            if (parsedAmount <= 0) {
                throw new Error("Donation amount must be greater than 0");
            }

            if (parsedAmount > goal) {
                throw new Error("Donation amount cannot exceed campaign goal");
            }

            const tx = await contract.donate(campaignId, {
                value: parsedAmount
            });
            await tx.wait();
            onCampaignUpdate();
        } catch (error) {
            console.error("Donation error:", error);
            setError(error.message || "Donation failed");
        }
    };

    const fetchDonors = async (campaignId) => {
        try {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const donors = await contract.getCampaignDonors(campaignId);
            const donorDetails = await Promise.all(donors.map(async (donor) => {
                const donationAmount = await contract.donations(campaignId, donor);
                return {
                    address: donor,
                    amount: donationAmount
                };
            }));

            setDonorsList(prev => ({
                ...prev,
                [campaignId]: donorDetails
            }));
        } catch (error) {
            console.error("Get donors error:", error);
            setError(error.message || "Failed to fetch donors");
        }
    };

    const fetchEthPrice = async () => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            setEthPrice(data.ethereum.usd);
        } catch (error) {
            console.error("Failed to fetch ETH price", error);
            setError("Could not fetch current ETH price");
        }
    };

    const withdrawFunds = async (campaignId) => {
        try {
            if (!contract) {
                throw new Error("Contract not initialized. Please connect your wallet.");
            }

            const tx = await contract.withdrawFunds(campaignId);
            await tx.wait();
            onCampaignUpdate();
        } catch (error) {
            console.error("Withdraw error:", error);
            setError(error.message || "Failed to withdraw funds");
        }
    };

    const calculateUsdValue = (ethAmount) => {
        if (!ethPrice || !ethAmount) return '0.00';
        try {
            const ethValue = Number(ethers.formatEther(ethAmount));
            return (ethValue * ethPrice).toFixed(2);
        } catch (error) {
            console.error("Error calculating USD value:", error);
            return '0.00';
        }
    };

    const calculateProgressPercentage = (raised, goal) => {
        try {
            const raisedValue = Number(ethers.formatEther(raised));
            const goalValue = Number(ethers.formatEther(goal));
            return Math.min((raisedValue / goalValue) * 100, 100).toFixed(2);
        } catch (error) {
            console.error("Error calculating progress:", error);
            return '0';
        }
    };

    const getDefaultImage = () => '/placeholder-image.jpg';

    const renderCampaignCard = (campaign) => {
        const isActive = timeRemaining[campaign.id] > 0 && campaign.status.isActive;
        
        return (
            <div 
                key={campaign.id} 
                className={`bg-white rounded-xl shadow-lg p-6 ${
                    isActive ? 'border-green-500 border-2' : 'border-red-500 border-2'
                }`}
            >
                <img 
                    src={campaign.imageUrl || campaign.backupImageUrl || getDefaultImage()} 
                    alt={campaign.title} 
                    className="w-full h-48 object-cover rounded-md mb-4"
                    onError={(e) => {
                        e.target.src = getDefaultImage();
                    }}
                />

                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold">{campaign.title}</h3>
                    <span className={`text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {formatTimeRemaining(timeRemaining[campaign.id])}
                    </span>
                </div>

                <p className="text-gray-600 mb-2">
                    {campaign.story.length > 100 
                        ? `${campaign.story.slice(0, 100)}...` 
                        : campaign.story}
                </p>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div 
                        className={`h-2.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-red-600'}`}
                        style={{
                            width: `${calculateProgressPercentage(campaign.raisedAmount, campaign.goal)}%`
                        }}
                    ></div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className="font-semibold">
                            {ethers.formatEther(campaign.raisedAmount)} / {ethers.formatEther(campaign.goal)} ETH
                        </span>
                        {ethPrice && (
                            <p className="text-sm text-gray-500">
                                (${calculateUsdValue(campaign.raisedAmount)} USD)
                            </p>
                        )}
                    </div>
                    <span className={`px-2 py-1 rounded ${
                        isActive
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {isActive ? 'Active' : 'Ended'}
                    </span>
                </div>

                <div className="space-y-2">
                    {isActive && (
                        <button 
                            onClick={() => donate(campaign.id, campaign.goal)}
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                        >
                            Donate
                        </button>
                    )}

                    {!isActive && 
                     account && 
                     campaign.fundraiser.toLowerCase() === account.toLowerCase() && 
                     !campaign.status.fundsWithdrawn && (
                        <button 
                            onClick={() => withdrawFunds(campaign.id)}
                            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
                        >
                            Withdraw Funds
                        </button>
                    )}

                    <button 
                        onClick={() => {
                            toggleCampaignDetails(campaign.id);
                            fetchDonors(campaign.id);
                        }}
                        className="w-full bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors"
                    >
                        {expandedCampaign === campaign.id ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>

                {expandedCampaign === campaign.id && donorsList[campaign.id] && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                        <h4 className="text-lg font-semibold mb-2">Donors:</h4>
                        {donorsList[campaign.id].length > 0 
                            ? donorsList[campaign.id].map((donor, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-gray-700">{donor.address}</span>
                                    <span className="text-gray-500">
                                        {ethers.formatEther(donor.amount)} ETH (${calculateUsdValue(donor.amount)} USD)
                                    </span>
                                </div>
                              ))
                            : <p className="text-gray-500">No donors yet</p>
                        }
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {error && <Alert message={error} />}
            
            {activeCampaigns.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Active Campaigns</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {activeCampaigns.map(renderCampaignCard)}
                    </div>
                </section>
            )}

            {endedCampaigns.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mt-8 mb-4">Ended Campaigns</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {endedCampaigns.map(renderCampaignCard)}
                    </div>
                </section>
            )}
        </div>
    );
};

export default CampaignList;""