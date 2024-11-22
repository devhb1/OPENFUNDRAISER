import { getEnvVar } from '../config/env';

export const validateFile = (file) => {
    if (!file) {
        throw new Error('No file selected');
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSizeInBytes) {
        throw new Error('File size must be less than 5MB');
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    return true;
};

export const uploadToIPFS = async (file) => {
    if (!file) {
        throw new Error('No file provided');
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
        formData.append('pinataMetadata', JSON.stringify({ 
            name: file.name,
            keyvalues: {
                type: 'fundraiser-image'
            }
        }));

        // Retrieve Pinata API keys from environment variables
        const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
        const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

        if (!pinataApiKey || !pinataSecretKey) {
            throw new Error('Pinata API keys are not configured');
        }

        // Pinata upload endpoint
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretKey
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`IPFS upload failed: ${errorData}`);
        }

        const result = await response.json();
        
        if (!result || !result.IpfsHash) {
            throw new Error('IPFS upload failed - no valid response');
        }

        // Pinata IPFS gateways
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
        const backupUrl = `https://ipfs.io/ipfs/${result.IpfsHash}`;

        return { 
            ipfsUrl, 
            backupUrl, 
            path: result.IpfsHash 
        };
    } catch (error) {
        console.error('IPFS Upload Error:', error);
        throw new Error(error.message || 'Failed to upload to IPFS');
    }
};