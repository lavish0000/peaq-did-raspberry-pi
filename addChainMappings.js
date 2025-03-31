import { cryptoWaitReady } from "@polkadot/util-crypto";
import { PEAQ_MNEMONIC, networks } from "./constants.js";
import { createStorageKeys, generateKeyPair, getNetworkApi } from "./utils.js";
import { u8aToHex, u8aToString } from "@polkadot/util";
import bip39 from "bip39"; 
import secp from "secp256k1";
import { randomBytes } from "crypto";
import hdkey from "hdkey";

const myseed = "panic pretty surge torch reunion uncle execute snack silver praise math midnight";

const chainsInfo = [
    {
        type: "binance",
        address: 'bnb1kgtjr4md5h66yf4zd07ql6j42zwywlg7txuqrx'
    },
    {
        type: "solana",
        address: '5CnhLnL4ou193YJYGaUrKergD9BUazJzMbVfeymyKV9a'
    },
    {
        type: "cosmos",
        address: 'cosmos1dmvq9kzgjf0yjjkldsyfh0rt9kl5tluwhf78ck'
    }
]

const main = async () => {
    try {

//         // const mnemonic = bip39.generateMnemonic();

//         const seed = bip39.mnemonicToSeedSync(PEAQ_MNEMONIC);

//         // Generate master HD wallet from seed
// const masterKey = hdkey.fromMasterSeed(seed);

// // Derive child private key using Binance Chain path 
// const childKey = masterKey.derive("m/44'/714'/0'/0/0"); 

// // Get Binance Chain key pair  
// const privateKey1 = childKey.privateKey; 
// const publicKey1 = childKey.publicKey;

// console.log('Private1 Key:', privateKey1.toString('hex'));
// console.log('Public1 Key:', publicKey1.toString('hex'));

//         // tbnb10al2hq38vjneduc9fagt22v298mhkuee00wzdr
//         // 0x242C49588083D98cda33aAB86698Bc4dD9E02fE1
//         const privateKey = Buffer.from(seed.slice(0, 32));

//         const verifypriv = secp.privateKeyVerify(privateKey)
        
//         // Use privateKeyImport instead  
//         // const privateKey = secp.privateKeyImport(seedUint8); 
        
//         const publicKey = secp.publicKeyCreate(privateKey);

//         console.log('Verify private key:', verifypriv);
//         console.log('Seed phrase:', PEAQ_MNEMONIC);
//         console.log('Private key:', privateKey); 
//         console.log('Public key:', u8aToHex(publicKey));
  
  

//     // compressed public key from X and Y
// function hashfn (x, y) {
//     const pubKey = new Uint8Array(33)
//     pubKey[0] = (y[31] & 1) === 0 ? 0x02 : 0x03
//     pubKey.set(x, 1)
//     return pubKey
//   }
  
//   // get X point of ecdh
//   const ecdhPointX = secp.ecdh(publicKey, privateKey, { hashfn }, Buffer.alloc(33))
//   console.log(ecdhPointX.toString('hex'))

        const chainsMapping = [];
        await cryptoWaitReady();
        // const solanaKeyPair = generateKeyPair(PEAQ_MNEMONIC, 'ed25519'); 
        // console.log('Solana key pair:', solanaKeyPair.address);
    
    const pair = generateKeyPair(myseed);
    
    const api = await getNetworkApi(networks.PEAQ);

    const storageExtrinsics = await Promise.all(chainsInfo.map(async (chainInfo) => {
        const { hashed_key } = createStorageKeys(
            [{
                value: pair.address,
                type: 0,
            },
            {
                value: chainInfo.type,
                type: 1,
            }]
        )
        const checkifExist = await api.query.peaqStorage.itemStore(hashed_key);
        const parsedValue = u8aToString(checkifExist);
        if (parsedValue || parsedValue?.isStorageFallback) {
            console.log(`Chain ${chainInfo.type} already exist for this address ${pair.address}`);
            chainsMapping.push({
                chain: chainInfo.type,
                address: parsedValue
            });
            return null;
        }

        const extrinsic = api.tx.peaqStorage.addItem(chainInfo.type, chainInfo.address);
        return extrinsic;
    }));
    console.log('chainsMapping', chainsMapping);
    const filteredStorageExtrinsics = storageExtrinsics.filter((extrinsic) => extrinsic !== null);
    console.log('filteredStorageExtrinsics', filteredStorageExtrinsics);
    if (!filteredStorageExtrinsics.length) return;
    const batchAllExtrinsic = api.tx.utility.batchAll(filteredStorageExtrinsics);
    await batchAllExtrinsic.signAndSend(pair, { nonce: -1 }, (result) => {

        const { status, events, dispatchError } = result;
        // log error
        if (status.isFinalized) {
            console.log('Finalized block hash', result.status.asFinalized.toHex());
        }

        if (status.isInBlock) {
            console.log('In block', result.status.asInBlock.toHex());
        }

        if (dispatchError) {
            if (dispatchError.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;
      
              console.log(`${section}.${name}: ${docs.join(' ')}`);
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              console.log(dispatchError.toString());
            }
          }
        
    });

    const batchAllExtrinsicHash = batchAllExtrinsic.toHex();
    console.log('batchAllExtrinsicHash', batchAllExtrinsicHash);

    console.log("---------Network call complete!----------");
    } catch (error) {
        console.log('error', error);
    }
};

main();


