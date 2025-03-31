// // Import the API and utils from @polkadot/api
// import { ApiPromise, WsProvider } from '@polkadot/api';

// // Set up the provider to connect to the parachain
// const provider = new WsProvider('wss://wsspc1-qa.agung.peaq.network');

// // Create the API instance with the provider
// const api = new ApiPromise({ provider });

// // Wait until the API is ready
// await api.isReady;

// // Get totalCollatorStaking from parachainstaking pallet
// const totalCollatorStaking = await api.query.parachainStaking.totalCollatorStake();

// console.log(`Total collator staking is ${totalCollatorStaking}`);

import axios from "axios";
import { Sdk } from "@peaq-network/sdk";
import Keyring from "@polkadot/keyring";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { getNetworkApi } from "./utils.js";
import { networks } from "./constants.js";


// Constants for demonstration purposes - replace these with actual values
const DID_NAME = "<NAME_OF_THE_DID>";
const DEPIN_SEED = "<DEPIN_SEED>"; // The seed phrase for DePin, used for signing
const DID_SUBJECT_SEED = "<DID_SUBJECT_SEED>"; // The seed phrase for the subject of the DID
const ENCRYPTION_SERVICE_URL = "<ENCRYPTION_SERVICE_URL>"; // URL to your encryption service
const METADATA = { email: "<EMAIL>" }; // Example metadata to be encrypted

// Function to encrypt metadata
const encryptMetadata = async (metadata) => {
  try {
    const response = await axios.post(ENCRYPTION_SERVICE_URL, metadata);
    return response.data.encryptedMetadata; // Need to adjusted based on actual response structure
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
    // seed: DID_SUBJECT_SEED, // Using DIDSubjectSeed for SDK instance creation
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

// createDid().catch(console.error);

const getBlockNumber = async (number) => {
  const api = await getNetworkApi(networks.PEAQ_ARC)
// returns Hash
const blockHash = await api.rpc.chain.getBlockHash(number);
// returns SignedBlock
const signedBlock = await api.rpc.chain.getBlock(blockHash);

// the hash for the block, always via header (Hash -> toHex()) - will be
// the same as blockHash above (also available on any header retrieved,
// subscription or once-off)
console.log(signedBlock.block.hash);

// the hash for each extrinsic in the block
signedBlock.block.extrinsics.forEach((ex, index) => {
  console.log(index, ex.method.args);
});
}

getBlockNumber(1)
