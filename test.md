# Creating a DID on Peaq Network with Encrypted Metadata

This streamlined guide is designed to assist you in creating a Decentralized Identifier (DID) on the Peaq Network using encrypted metadata. The process involves encrypting the metadata, generating a signature with DePin's seed, and finally creating the DID. The example below is structured for ease of understanding and execution, requiring minimal adjustments to run.

## Required Installation

Before proceeding, ensure you have the necessary tools and packages installed in your project. You will need Axios for making HTTP requests, along with several packages from the Polkadot.js suite for cryptographic operations and interacting with the Peaq Network SDK. Install the following packages using npm:

```bash
npm install axios @peaq-network/types @peaq-network/sdk @polkadot/api @polkadot/keyring @polkadot/util-crypto
```

## Script for Creating a DID

Below is the complete script to guide you through the process of creating a DID on the Peaq Network. This includes steps to encrypt metadata before DID creation, and to generate a signature to authenticate the request.

```javascript
import axios from "axios";
import { Sdk } from "@peaq-network/sdk";
import Keyring from "@polkadot/keyring";
import { stringToU8a, u8aToHex } from "@polkadot/util";

// Constants - These will need to be replaced with actual values
const DID_NAME = "<NAME_OF_THE_DID>";
const DEPIN_SEED = "<DEPIN_SEED>"; // The seed phrase for DePin, used for signing
const DID_SUBJECT_SEED = "<DID_SUBJECT_SEED>"; // The seed phrase for the subject of the DID
const ENCRYPTION_SERVICE_URL = "<ENCRYPTION_SERVICE_URL>"; // URL to the encryption service will be provided later
const METADATA = { email: "<EMAIL>" }; // Metadata to be encrypted

// Function to encrypt metadata
const encryptMetadata = async (metadata) => {
  try {
    const response = await axios.post(ENCRYPTION_SERVICE_URL, metadata);
    // Note: You may need to adjust the response handling based on your encryption service's response structure
    return response.data.encryptedMetadata; 
  } catch (error) {
    console.error("Error encrypting metadata:", error);
    throw error;
  }
};

// Callback function to handle the create DID result
const handleCreateDidResult = (result) => {
    const dispatchError = result.dispatchError;
    if (dispatchError?.isModule) {
      const decoded = result._api.registry.findMetaError(
        dispatchError.asModule
      );
      const { docs, name, section } = decoded;
  
      console.log(`${section}.${name}: ${docs.join(" ")}`);
    }
  
    console.log(`Hash from callback: ${result.status}`);
    console.log("Use this hash to check the DID on the network.");
};

// Main function to create DID
const createDid = async () => {
    const encryptedMetadata = await encryptMetadata(METADATA); // Encrypting the metadata

    // Initializing SDK instance with DIDSubjectSeed
    const sdkInstance = await Sdk.createInstance({
      baseUrl: "wss://mpfn1.peaq.network",
      seed: DID_SUBJECT_SEED, // Using DIDSubjectSeed for SDK instance creation
    });
  
    const keyring = new Keyring({ type: "sr25519" });
    const DIDSubjectPair = keyring.addFromUri(DID_SUBJECT_SEED); // Creating key pair for the subject of the DID from seed
    const DePinPair = keyring.addFromUri(DEPIN_SEED); // Creating key pair for the DePin from seed
  
    // Generating signature using DePinSeed and DIDSubjectPair's address as data
    const signature = u8aToHex(DePinPair.sign(stringToU8a(DIDSubjectPair.address)));
  
    try {
      await sdkInstance.did.create(
        {
          name: DID_NAME,
          address: DIDSubjectPair.address, // Address derived from DIDSubjectPair
          customDocumentFields: {
            services: [
              {
                id: "#metadata",
                type: "metadata",
                data: encryptedMetadata,
              },
            ],
            signature: {
              type: "ED25519VERIFICATIONKEY2020",
              hash: signature,
              issuer: DePinPair.address, // The issuer is DePin
            },
          },
        },
        handleCreateDidResult // Passing callback function
      );
    } catch (error) {
      console.error("DID Creation Error:", error);
    }
};

createDid().catch(console.error);
```

### Important Notes

- **DID_NAME, DEPIN_SEED, and DID_SUBJECT_SEED**: Replace placeholders with the actual values. Use your own seed phrases for DePin and the subject of the DID.
- **ENCRYPTION_SERVICE_URL**: The URL for the encryption service will be provided to you later. Once available, replace `<ENCRYPTION_SERVICE_URL>` in the script. You might need to adjust the handling of the encrypted metadata response based on the service's specifics.
- **METADATA**: Replace `<EMAIL>` with the actual email address you wish to encrypt and include in the DID's metadata.

This guide is structured to provide a straightforward path to creating a DID with encrypted metadata on the Peaq Network. By following the steps and replacing the placeholders with your actual data, you'll be able to execute the DID creation process with minimal adjustments