// Import the necessary modules
import { create } from 'ipfs-http-client';
import { readFile } from 'fs/promises';

// Function to upload a file to IPFS
async function uploadToIPFS(filePath) {
  try {
    // Create an IPFS client instance
    const ipfs = create({
      host: 'ipfs.eth.aragon.network',
      protocol: 'https'
    });

    // Read the file content
    const fileContent = await readFile(filePath);

    // Add the file to IPFS
    const result = await ipfs.add(fileContent);

    // Log the IPFS hash (CID)
    console.log('File uploaded to IPFS with CID:', result.path);
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
  }
}

// File path to be uploaded
const filePath = './peaq-token-brand-icon-256x256.png'; // Replace with your image file path

// Call the upload function
uploadToIPFS(filePath);
