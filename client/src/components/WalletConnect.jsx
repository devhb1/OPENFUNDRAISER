import React from 'react';
import { ethers } from 'ethers';

const WalletConnect = ({ account, setAccount }) => {
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
            } catch (error) {
                console.error("Wallet connection error:", error);
                alert("Failed to connect wallet. " + error.message);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
    };

    return (
        <div className="flex space-x-4">
            {!account ? (
                <button 
                    onClick={connectWallet} 
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                    <button 
                        onClick={disconnectWallet}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
};

export default WalletConnect;