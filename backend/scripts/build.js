const fs = require('fs');
const path = require('path');

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function extractABI() {
    try {
        // Path to artifacts
        const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
        // Output directory for ABIs
        const abiPath = path.join(__dirname, '..', 'abi');

        // Create abi directory if it doesn't exist
        if (!fs.existsSync(abiPath)) {
            fs.mkdirSync(abiPath, { recursive: true });
        }

        // Contracts we want to extract ABIs for
        const contracts = ['Campaign.sol/Campaign.json', 'Campaign.sol/CampaignNFT.json'];

        contracts.forEach(contractFile => {
            try {
                // Read the artifact JSON file
                const artifactPath = path.join(artifactsPath, contractFile);
                
                if (!fs.existsSync(artifactPath)) {
                    console.error(`Artifact file not found: ${artifactPath}`);
                    return;
                }

                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                
                // Extract the ABI
                const abiData = {
                    abi: artifact.abi,
                    networks: {}
                };

                // Create the output filename
                const outputFileName = contractFile.split('/')[1];
                const outputPath = path.join(abiPath, outputFileName);

                // Write the ABI to a new file
                fs.writeFileSync(
                    outputPath,
                    JSON.stringify(abiData, null, 2)
                );

                console.log(`Successfully extracted ABI for ${outputFileName}`);
            } catch (error) {
                console.error(`Error processing ${contractFile}:`, error);
            }
        });
    } catch (error) {
        console.error('Error in extractABI:', error);
    }
}

// Run the extraction
extractABI();