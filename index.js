import { mnemonicGenerate, cryptoWaitReady, base58Encode, base64Decode, base64Encode } from "@polkadot/util-crypto";
import { Keyring, encodeAddress } from "@polkadot/keyring";
import fs from "fs";
import { generateDidDocument } from "./generate-did.js";
import { getNetworkApi, getPeaqKeyPair } from "./utils.js";
import { networks } from "./constants.js";
import os from "os";
import { Client } from "ssh2";
import { u8aToHex, u8aToString } from "@polkadot/util";
import pkg from 'peaq-did-proto-js';
const { Document } = pkg;

const controller = "5EsRqVnHsJLMGZMExqZ3QmBdQG4xQ2oUtnVh7in6CHcE51KE";

const generateKeyPair = (mnemonic) => {
  const keyring = new Keyring({ type: "sr25519" });
  const pair = keyring.addFromUri(mnemonic);
  return pair;
};

const getMachineKeyPair = async () => {
  console.log("Fetching machine key pair from seed.txt...");
  if (fs.existsSync("seed.txt")) {
    const seed = fs.readFileSync("seed.txt", "utf8");
    if (seed) return generateKeyPair(seed);
  }

  console.log("No seed found, generating new key pair...");
  const mnemonic = mnemonicGenerate();

  const pair = generateKeyPair(mnemonic);
  fs.writeFileSync("seed.txt", mnemonic);
  console.log("New key pair generated and saved to seed.txt");
  return pair;
};

const callDIDPallet = async (address, didDocumentHash) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);

    const data = api.tx.peaqDid
      .addAttribute(address, os.hostname(), didDocumentHash, "")

      data.signAndSend(getPeaqKeyPair(), {nonce: -1}, ({ status, events, dispatchError, filterRecords, txHash,  }) => {
        // status would still be set, but in the case of error we can shortcut
        // to just check it (so an error would indicate InBlock or Finalized)
        // console.log(
        //   `Included at blockHash ${status.asInBlock.toString()}`,
        // );
        console.log('status', status.type);
        console.log('value', status.value.toHex());
        console.log('txhash', txHash.toHex());
        // console.log('hex encoded call', base64Encode(data.data));
        console.log('hex encoded call 256', u8aToHex(data.data, 512));
        console.log('hex encoded call 64', data.toHex());
        if (status.isInBlock) {
        }
        if (dispatchError) {
          if (dispatchError.isModule) {
            // for module errors, we have the section indexed, lookup
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;

            console.log(`${section}.${name}: ${docs.join(" ")}`);
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            console.log(dispatchError.toString());
            // toast.error(dispatchError.toString())
          }
          console.log(
            "---------DID document failed to save to network!----------"
          );
          // process.exit(1);
        }
        console.log("---------DID document saved to network!----------");

        // process.exit(0);
      });

    return data;
  } catch (error) {
    console.log("===await SUB_API.tx.peaqDid.addAttribute==error===", error);
  }
};

const main = async () => {
  await cryptoWaitReady();
  // const api = await getNetworkApi(networks.PEAQ);
  // const dids = await api.query.peaqDid.attributeStore.entries();

  // const totalDids = dids.filter((did) => {
  //  const doc = Document.deserializeBinary(did[1].value);
  //   const {id, controller} = doc.toObject();
  //   const didAddress = id.split(":")[2];
  //   const controllerAddress = controller.split(":")[2];
  //   return u8aToString(did[1].name) === "peaq-console" && didAddress !== controllerAddress;
  // });
  // console.log("totalDids", totalDids.length);
  const pair = await getMachineKeyPair();
  console.log("Machine address:", pair.address);

  console.log("Generating DID document...");
  const did = generateDidDocument(controller, pair.address);

  console.log("DID document generated:", did);

  console.log("Calling DID pallet...");
  await callDIDPallet(pair.address, did);
  console.log("---------Network call complete!----------");
};

// main();

const getEvents = async () => {
  await cryptoWaitReady();
  const peaqKeyPair = getPeaqKeyPair();

console.log("peaq key pair", u8aToHex(peaqKeyPair.sign("l")).length)

  const api = await getNetworkApi(networks.PEAQ);
  // Subscribe to system events
api.query.system.events((events) => {
  // Loop through each event
  events.forEach((record) => {
    // Destructure the event data
    const { event } = record;
    console.log("Pallet", event.section);
    console.log("Ex", event.method);
    // Check if the event is a transfer event
    if (event.section === 'balances' && event.method === 'Transfer') {
      // Log the details of the transfer event
      console.log(`Transfer of ${event.data[1]} from ${event.data[0]} to ${event.data[2]}`);
    }
  });
});
}

// getEvents();

// const testSsh = async () => {
//   const conn = new Client();
// conn.on('ready', () => {
//   console.log('Client :: ready');
//   conn.exec('git clone https://github.com/peaqnetwork/peaq-did-raspberry-pi.git', (err, stream) => {
//     if (err) throw err;
//     stream.on('close', (code, signal) => {
//       console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
//       conn.end();
//     }).on('data', (data) => {
//       console.log('STDOUT: ' + data);
//     }).stderr.on('data', (data) => {
//       console.log('STDERR: ' + data);
//     });
//   });
// }).connect({
//   host: 'lovish.local',
//   port: 22,
//   username: 'pi',
//   password: 'password' 
// });
// };

// (async () => {
//   async function getAllTypes(api) {

//     const types = api.registry.getModuleTypes('peaqDid');

//   console.log(types);
//     const metadata = await api.rpc.state.getMetadata();
//     const allTypes = {};

//     console.log('metadata', metadata.asLatest);
  
//     metadata.asLatest.modules.forEach((moduleMetadata) => {
//       const moduleName = moduleMetadata.name.toString();
//       allTypes[moduleName] = moduleMetadata.types;
//     });
  
//     return allTypes;
//   }
  
//   // usage
//   const api = await getNetworkApi(networks.PEAQ);
//   const allTypes = await getAllTypes(api);
//   console.log(allTypes);
//   // const moduleMetadata = metadata.asLatest.modules.find(({ name }) => name === 'peaqDid');
//   // moduleMetadata.types;
//   })();

// testSsh();

const enaddress = encodeAddress('0x7369626cc50b0000000000000000000000000000000000000000000000000000', 42);
console.log("Enaddress", enaddress);

// getEvents();

// 5Eg2fntFpTmjt1oL6rFmLWTtLpQdtnS4dautKNcMH1cR3tXY
// 5Ec4AhPSjjaqkR5BYrJgDs856LjLBNNxZwGT4R5rQHarCHHz

import {SubstrateBatchProcessor} from '@subsquid/substrate-processor';
import {TypeormDatabase} from '@subsquid/typeorm-store';
import {lookupArchive} from '@subsquid/archive-registry';

const processor = new SubstrateBatchProcessor()
  .setGateway(lookupArchive('peaq-parachain', {release: 'ArrowSquid'}))
  .setRpcEndpoint('https://mpfn1.peaq.network')
  // .setBlockRange({from: 19_600_000})
  .addCall({
    name: ['Balances.transfer_all'],
  })
  .setFields({
    call: {
      origin: true,
      success: true 
    }
  }) 

processor.run(new TypeormDatabase(), async ctx => {
  for (let block of ctx.blocks) {
    for (let call of block.calls) {
      ctx.log.info(call, `Call:`)
    }
  }
})