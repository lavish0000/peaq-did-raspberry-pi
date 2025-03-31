import fs from "fs";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { cryptoWaitReady, evmToAddress } from "@polkadot/util-crypto";
import { BN, isFunction } from '@polkadot/util';
const wsProvider = new WsProvider("wss://peaq.api.onfinality.io/public-ws");

const months = "3";
async function main() {
  await cryptoWaitReady();
  const api = await ApiPromise.create({ provider: wsProvider });
  const accounts = JSON.parse(fs.readFileSync("accounts.json"));
  // const accounts = JSON.parse(fs.readFileSync("crowdloan.json"));
  const progress = fs.existsSync("progress.json")
    ? JSON.parse(fs.readFileSync("progress.json"))
    : {};

  const transferExtrinsics = [];

  for (const account of accounts) {
    if (!progress[account.evm]) {
      progress[account.evm] = "0";
    }
    console.log(`Processing account`, account);
    const amountToTransfer = new BN(account.token).mul(
      new BN("10").pow(new BN("18"))
    ).div(new BN(months));
    const previousAmount = new BN(progress[account.evm]);
    const totalAmount = new BN(account.token).mul(
      new BN("10").pow(new BN("18"))
    );
    console.log(`Amount to transfer: ${amountToTransfer.toString()}`);
    console.log(`Previous amount: ${previousAmount.toString()}`);
    console.log(`Total amount: ${totalAmount.toString()}`);
    if (previousAmount.lt(totalAmount)) {
      const transferExtrinsic = api.tx.balances.transfer(
        evmToAddress(account.evm),
        amountToTransfer
      );
      transferExtrinsics.push(transferExtrinsic);
      progress[account.evm] = new BN(progress[account.evm]).add(amountToTransfer).toString();
      console.log(
        `Created extrinsic to transfer 3 tokens to ${
          account.evm
        }, total transfers done: ${progress[account.evm]}`
      );
    }
  }

  // Create batchAll extrinsic
  const batchAllExtrinsic = api.tx.utility.batchAll(transferExtrinsics);
  console.log(`BatchAll Extrinsic hex: ${batchAllExtrinsic.toHex()}`);
  console.log(`BatchAll Extrinsic length:`, batchAllExtrinsic.toPrimitive());
  console.log(`BatchAll Extrinsic length: ${batchAllExtrinsic.encodedLength}`);
  console.log(`BatchAll Extrinsic length: ${batchAllExtrinsic.callIndex}`);
  console.log(`BatchAll Extrinsic length: ${batchAllExtrinsic.toRawType()}`);

  fs.writeFileSync("progress.json", JSON.stringify(progress));
  const test = isFunction((api.tx.multiSig || api.tx.utility)?.approveAsMulti)
  console.log(api.tx.multiSig);
  console.log("test", test);
}

// main()
//   .catch(console.error)
//   .finally(() => process.exit());


const startAccount = '5GGkfFzRctse5eXmZ99ic9XPaCw6zjd985fVYkg3hcSDSZMx';
const sudoAccount = '5GLWXiETENCdieTVpFYfsSAqZzUseMoAEPMEofnTaoVuymtS';
let allAccounts = new Set();
let visitedAccounts = new Set();

// Initialize the API and keyring
async function mainreset() {
    const api = await ApiPromise.create({ provider: wsProvider });
    
    // Initialize keyring (use Sudo key for resetting balances)
    const keyring = new Keyring({ type: 'sr25519' });
    const sudo = keyring.addFromUri('//Sudo');

    // Step 1: Get all accounts
    const allAccountsResponse = await api.query.system.account.keys();
    allAccounts = new Set(allAccountsResponse.map(key => key.toHuman()[0]));

    // Step 2: Traverse from the start account
    const skipAccounts = await findConnectedAccounts(api, startAccount);
    skipAccounts.add(sudoAccount); // Add sudo account to the set of accounts to skip
    
    
    // Step 3: Filter accounts that need reset and check balances
    const accountsToReset = await filterAccountsByBalance(api, allAccounts, skipAccounts);

    saveAccountsToFile(accountsToReset, "accounts_to_reset.json")

    console.log('Accounts to reset:', accountsToReset);

    // Step 4: Create a batch transaction to reset balances
    const txs = accountsToReset.map(account => api.tx.balances.forceSetBalance(account, 0));

    // Step 5: Execute the batch transaction with sudo
    const tx = api.tx.sudo.sudo(api.tx.utility.batch(txs));
    // const unsub = await tx.signAndSend(sudo, (result) => {
    //     if (result.status.isInBlock) {
    //         console.log('Transaction included in block:', result.status.asInBlock.toHex());
    //     } else if (result.status.isFinalized) {
    //         console.log('Transaction finalized:', result.status.asFinalized.toHex());
    //         unsub();
    //     }
    // });
    console.log(tx.toHex());
    
}

// Recursive function to find all connected accounts
async function findConnectedAccounts(api, account) {
    if (visitedAccounts.has(account)) {
        return visitedAccounts;
    }
    
    visitedAccounts.add(account);
    const transfers = await api.query.system.account(account);

    const allTransfers = await api.query.system.events((events) => {
        events.forEach(({ event }) => {
            if (event.method === 'Transfer') {
                const [from, to] = event.data.map(accountId => accountId.toString());
                if (from === account) {
                    visitedAccounts.add(to);
                    findConnectedAccounts(api, to);
                }
            }
        });
    });

    return visitedAccounts;
}

mainreset().catch(console.error);

// Function to save accounts to a JSON file
function saveAccountsToFile(accounts, filename) {
  const jsonContent = JSON.stringify(accounts, null, 2);

  fs.writeFile(filename, jsonContent, 'utf8', function (err) {
      if (err) {
          console.log('An error occurred while writing JSON to file.', err);
      } else {
          console.log('Accounts have been saved to', filename);
      }
  });
}


// Function to filter accounts that have a non-zero balance and are not in the skip list
async function filterAccountsByBalance(api, allAccounts, skipAccounts) {
  const accountsToReset = [];

  for (const account of allAccounts) {
      if (!skipAccounts.has(account)) {
          const { data: { free: balance } } = await api.query.system.account(account);
          if (balance.gt(new BN(0))) {
              accountsToReset.push(account);
          }
      }
  }

  return accountsToReset;
}
