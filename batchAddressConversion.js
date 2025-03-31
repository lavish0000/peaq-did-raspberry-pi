import fs from 'fs';
import csv from 'csv-parser';
import { cryptoWaitReady, evmToAddress } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';

// Define input and output file paths
const inputFilePath = './H160-to-transform.csv';
const outputFilePath = './H160-to-transform-result.csv';

// Create a write stream for the output file
const output = fs.createWriteStream(outputFilePath);

// Write the header for the output CSV
output.write('Index,EVMAddress,SubstrateAddress,Balance\n');

// Set to track processed EVM addresses
const processedAddresses = new Set();

// Variable to accumulate total balance
let totalBalance = 0;

// Counter to track pending balance fetch operations
let pendingOperations = 0;

// Function to get balance and format it
async function getBalance(api, address) {
  try {
    const { data: { free: balance } } = await api.query.system.account(address);
    // Convert balance to human-readable format with 4 decimal places
    const humanReadableBalance = parseInt(balance.toString()) / Math.pow(10, 18);
    return humanReadableBalance.toFixed(4);
  } catch (error) {
    console.error(`Error fetching balance for address ${address}:`, error);
    return 'Error';
  }
}

async function connectToApi() {
  const wsProvider = new WsProvider('wss://peaq.api.onfinality.io/public-ws', 30000);
  const api = await ApiPromise.create({ provider: wsProvider });
  await cryptoWaitReady();

  wsProvider.on('disconnected', () => {
    console.warn('Disconnected from the node, attempting to reconnect...');
    setTimeout(() => connectToApi(), 5000); // Attempt to reconnect after 5 seconds
  });

  return api;
}

// Main function to process CSV and fetch balances
async function processCSV() {
  try {
    const api = await connectToApi();

    // Read the input CSV file
    fs.createReadStream(inputFilePath)
      .pipe(csv({ headers: ['Index', 'EVMAddress'] }))
      .on('data', (row) => {
        const index = row['Index'];
        const evmAddress = row['EVMAddress'];

        if (evmAddress && !processedAddresses.has(evmAddress)) {
          processedAddresses.add(evmAddress); // Mark this address as processed
          pendingOperations++; // Increment pending operations counter

          (async () => {
            const substrateAddress = evmToAddress(evmAddress);
            const balance = await getBalance(api, substrateAddress);
            if (balance !== 'Error') {
              totalBalance += parseFloat(balance);
            }
            output.write(`${index},${evmAddress},${substrateAddress},${balance}\n`);
            pendingOperations--; // Decrement pending operations counter

            // Check if all operations are complete
            if (pendingOperations === 0) {
              console.log('CSV file successfully processed and converted.');
              console.log(`Total Balance: ${totalBalance.toFixed(4)}`);
              api.disconnect();
            }
          })();
        } else if (!evmAddress) {
          console.error(`Missing or invalid EVM address for index ${index}`);
        } else {
          console.log(`Duplicate EVM address found for index ${index}, skipping.`);
        }
      })
      .on('end', () => {
        // Check if all operations are complete
        if (pendingOperations === 0) {
          console.log('CSV file successfully processed and converted.');
          console.log(`Total Balance: ${totalBalance.toFixed(4)}`);
          api.disconnect();
        }
      });
  } catch (error) {
    console.error('Error during CSV processing:', error);
  }
}

// Execute the main function
processCSV().catch(console.error);
