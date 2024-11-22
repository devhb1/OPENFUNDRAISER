import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Alert } from '../components/alert';

const CreateCampaign = ({ contract, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        goal: '',
        story: '',
        duration: '',
        imageUrl: '',
        backupImageUrl: ''
    });
    const [status, setStatus] = useState({
        isLoading: false,
        error: '',
        success: ''
    });
    const [ethPrice, setEthPrice] = useState(null);
    const durations = [
        { label: '2 Minutes', value: 120 },
        { label: '5 Minutes', value: 300 },
        { label: '15 Minutes', value: 900 },
        { label: '1 Hour', value: 3600 },
        { label: '1 Day', value: 86400 },
        { label: '7 Days', value: 604800 },
        { label: '30 Days', value: 2592000 }
    ];

    useEffect(() => {
        const fetchEthPrice = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
                const data = await response.json();
                setEthPrice(data.ethereum.usd);
            } catch (error) {
                console.error("Failed to fetch ETH price", error);
            }
        };
        fetchEthPrice();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ ...status, isLoading: true });

        try {
            if (!contract) throw new Error("Contract not initialized.");
            
            const goalInWei = ethers.parseEther(formData.goal);
            const durationInSeconds = parseInt(formData.duration);

            const tx = await contract.createCampaign(
                formData.title,
                goalInWei,
                durationInSeconds,
                formData.story,
                formData.imageUrl
            );

            await tx.wait();
            setStatus({ ...status, success: "Campaign created successfully!", error: '' });
            onSuccess();
        } catch (error) {
            console.error("Error creating campaign:", error);
            setStatus({ ...status, error: error.message || "Error creating campaign", success: '' });
        } finally {
            setStatus(prev => ({ ...prev, isLoading: false }));
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Create Campaign</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium">Title</label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md p-2"
                        placeholder="Enter campaign title"
                    />
                </div>
                <div>
                    <label htmlFor="goal" className="block text-sm font-medium">Goal (ETH)</label>
                    <input
                        type="number"
                        name="goal"
                        id="goal"
                        value={formData.goal}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md p-2"
                        placeholder="Enter funding goal in ETH"
                    />
                </div>
                <div>
                    <label htmlFor="story" className="block text-sm font-medium">Story</label>
                    <textarea
                        name="story"
                        id="story"
                        value={formData.story}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md p-2"
                        placeholder="Tell your story..."
                    />
                </div>
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium">Duration</label>
                    <select
                        name="duration"
                        id="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md p-2"
                    >
                        <option value="">Select Duration</option>
                        {durations.map(duration => (
                            <option key={duration.value} value={duration.value}>{duration.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium">Image URL</label>
                    <input
                        type="url"
                        name="imageUrl"
                        id="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md p-2"
                        placeholder="Enter image URL for your campaign"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={status.isLoading} 
                    className={`w-full py-2 rounded ${status.isLoading ? 'bg-gray-400' : 'bg-blue-500'} text-white`}
                >
                    {status.isLoading ? "Creating..." : "Create Campaign"}
                </button>

                {status.error && (
                    <Alert variant="destructive">
                        {status.error}
                        <button onClick={() => setStatus({ ...status, error: '' })} className="mt-2 text-sm underline">
                            Dismiss
                        </button>
                    </Alert>
                )}
                
                {status.success && (
                    <div className={`p-4 bg-green-100 border border-green-200 text-green-800 rounded`}>
                       {status.success}
                   </div>
               )}
           </form>
       </div>
   );
};

export default CreateCampaign;