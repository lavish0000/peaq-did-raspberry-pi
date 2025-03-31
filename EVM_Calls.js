// Import ethers.js
import Web3 from 'web3';
import vestingabi from './abi/staking.json' with { type: "json" };
import { BN } from '@polkadot/util';

// RPC URL
const RPC_URL = "https://peaq.api.onfinality.io/public";

// Create a web3 instance
const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));

// Your private key
const privateKey = "0x50ba2df73c926d4f3107b25c198535c2db20eb3a0ecc60c7879ec46813da162d";

// "9f6223cd0d6336b344f57e8f9d3eef51d30ea1f35ce3e9dae7231f92397a69a1";

// Address from the private key
const address = "0x0370e8a96b1151B90a40cFEea4E45e974b751651"; // address from the above private key -> "0x724Ae99e05e5AAdc8aADa043F540dEbab05AFb26";

// "0x0370e8a96b1151B90a40cFEea4E45e974b751651";

// Vesting contract address
const VESTING_ADDRESS = "0x0000000000000000000000000000000000000807";
const PARACHAIN_STAKING_ADDRESS = '0x0000000000000000000000000000000000000807';

// Vesting contract ABI
const vestingAbi = vestingabi;

// Create a contract instance
const contract = new web3.eth.Contract(vestingAbi, VESTING_ADDRESS);

// Function to calculate gas price
async function calculateGasPrice() {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        console.log(`Current gas price: ${gasPrice} wei`);
        return gasPrice;
    } catch (error) {
        console.error('Error fetching gas price:', error);
        throw error;
    }
}

// Function to estimate gas for a transaction
async function estimateGas(transactionObject) {
    try {
        web3.eth.base
        const gasEstimate = await web3.eth.estimateGas(transactionObject);
        console.log(`Estimated gas: ${gasEstimate}`);
        return gasEstimate;
    } catch (error) {
        console.error('Error estimating gas:', error);
        throw error;
    }
}

// Function to calculate gas cost in Ether
async function calculateGasCost(gasPrice, gasEstimate) {
    const gasCostInWei = BigInt(gasPrice) * BigInt(gasEstimate);
    const gasCostInEther = web3.utils.fromWei(gasCostInWei.toString(), "ether");
    console.log(`Estimated gas cost: ${gasCostInEther} ETH`);
    return gasCostInEther;
}

async function joinDelegators(collator, stake, fromAddress) {
    const transactionObject = {
        to: "0x724Ae99e05e5AAdc8aADa043F540dEbab05AFb26",//PARACHAIN_STAKING_ADDRESS,
        // data: contract.methods.leaveDelegators().encodeABI(),
        from: fromAddress,
        value: web3.utils.toWei(`${stake}`, "ether")
    };

    try {
        const gasPrice = await calculateGasPrice();
        const gasEstimate = await estimateGas(transactionObject);
        const gasCostInEther = await calculateGasCost(gasPrice, gasEstimate);
        console.log("gas priceeeeeeeeee", gasCostInEther);
        const tx = {
            ...transactionObject,
            gasPrice,
            gas: gasEstimate
        };

        // Here you would send the transaction, e.g., using web3.eth.sendTransaction(tx)
        console.log('Transaction object:', tx);
        return tx;
    } catch (error) {
        console.error('Error preparing transaction:', error);
        throw error;
    }
}

// joinDelegators();

// Example usage
(async () => {
    const collator = '0x40f3c17445622c23298720a311a49e71cb5c2a825b8b0f7409d3d0094c09c047'; // Replace with actual collator
    const stake = "1000000000000000000000"; // Replace with actual stake amount
    const fromAddress = address; // Replace with actual sender address

    await joinDelegators(collator, stake, fromAddress);
})();

// Function to call vestedTransfer
async function callVestedTransfer() {
    const target = "0x724Ae99e05e5AAdc8aADa043F540dEbab05AFb26";
    const locked = "1000000000000000000000";
    const perBlock = "10000000000000000000";
    const startingBlock = 136;

    // Encode the transaction data
    console.log("tsetsetestse",JSON.stringify(vestingContract.methods.vestedTransfer));
    const data = contract.methods.vestedTransfer(target, locked, perBlock, startingBlock).encodeABI();

    // Get the gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log("test gassssss");
    // Create the transaction object
    const tx = {
        from: address,
        to: VESTING_ADDRESS,
        gas: 2000000, // Adjust gas limit as needed
        gasPrice: gasPrice,
        data: data
    };

    try {
        // Sign the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        console.log("Texxxxxxxn");
        // Send the transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction Hash:", receipt.transactionHash);
        console.log("Transaction was mined in block:", receipt.blockNumber);
    } catch (error) {
        console.error("Error calling vestedTransfer:", error);
    }
}

// callVestedTransfer();

const message = "[Etherscan.io 21/06/2024 09:51:54] I, hereby verify that I am the owner/creator of the address [0x6e642B4dfE787b8f101d1FB66C2Ef56e2b4C6c52]";

// Function to sign the message
async function signMessage() {
    try {
        // Hash the message
        const messageHash = web3.utils.sha3(message);

        // Sign the hashed message with the private key
        const signatureObject = web3.eth.accounts.sign(message, privateKey);

        console.log(`Message: ${message}`);
        console.log(`Message Hash: ${messageHash}`);
        console.log(`Signature: ${signatureObject.signature}`);
        console.log(`Signer Address: ${JSON.stringify(signatureObject)}`);
    } catch (error) {
        console.error("Error signing message:", error);
    }
}

// Call the function to sign the message
// signMessage();

async function getContractCode (contract) {
    const contract1 = await web3.eth.getCode(contract);
    console.log({contract1});
}

// getContractCode('0x3d4BA2E0884aa488718476ca2FB8Efc291A46199');

// "0x608060405234801561001057600080fd5b506004361061002b5760003560e01c80631c5fb21114610030575b600080fd5b6100de6004803603608081101561004657600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291908035906020019064010000000081111561008d57600080fd5b82018360208201111561009f57600080fd5b803590602001918460018302840111640100000000831117156100c157600080fd5b9091929391929390803560ff169060200190929190505050610169565b60405180848152602001831515815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561012c578082015181840152602081019050610111565b50505050905090810190601f1680156101595780820380516001836020036101000a031916815260200191505b5094505050505060405180910390f35b60008060607f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163073ffffffffffffffffffffffffffffffffffffffff161415610213576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260398152602001806102e46039913960400191505060405180910390fd5b60005a9050610269898989898080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050885a610297565b92505a8103935060405160203d0181016040523d81523d6000602083013e8092505050955095509592505050565b60006001808111156102a557fe5b8360018111156102b157fe5b14156102ca576000808551602087018986f490506102da565b600080855160208701888a87f190505b9594505050505056fe53696d756c61746554784163636573736f722073686f756c64206f6e6c792062652063616c6c6564207669612064656c656761746563616c6ca264697066735822122066ec514c62d72e456c1ac0997627506854acd03fceabe3c0532054bd50122c9064736f6c63430007060033"