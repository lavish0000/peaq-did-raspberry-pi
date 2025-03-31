import { cryptoWaitReady } from "@polkadot/util-crypto";
import { generateDidDocument } from "./generate-did.js";
import { generateKeyPair, getNetworkApi } from "./utils.js";
import { networks } from "./constants.js";
import { hexToString, hexToU8a, u8aToHex, u8aToString } from "@polkadot/util";

const generateRandomString = () => {
  const length = 10;
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

const seed =
  "credit tell tooth equip extend dinosaur shrug deny spray clerk misery erase";
const name = "Tom-1-" //+ generateRandomString();

const callDIDPallet = async (pair, didDocumentHash) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);

    const data = api.tx.peaqDid.addAttribute(
      pair.address,
      name,
      didDocumentHash,
      ""
    );

    // const testdata = hexToU8a("0x320200306721211d5404bd9da88e0204360a1a9ab8b87c66c1bc2fcdd37f3c2222cc20000010632d5ec76b05000000000000000000d01309468e1501000000000000004e0e0000");
    // console.log('testdata', u8aToString(testdata));
    // console.log("data", data.toHex());

    // const data = api.tx.parachainSystem.authorizeUpgrade('0x');

    data.signAndSend(pair, { nonce: -1 }, (result) => {
      const dispatchError = (result.dispatchError);
          console.log("dispatch", dispatchError);
          if (dispatchError?.isModule) {
            // var wsp = new WsProvider("wss://wsspc1-qa.agung.peaq.network");
            // var api = await (await ApiPromise.create({ 
          //  provider: wsp})).isReady;
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
  
          console.log(`${section}.${name}: ${docs.join(' ')}`);
          }
            const status = (result.status);
            const hash = status;
            console.log(`hash from callback: ${hash}`);
            // waitObj.completed = true;
      console.log(Date.now().toLocaleString())
    });

    return data;
  } catch (error) {
    console.log("===await SUB_API.tx.peaqDid.addAttribute==error===", error);
  }
};

const main = async () => {
  await cryptoWaitReady();

  const pair = generateKeyPair(seed);

  const sign = pair.sign("0x320200c69becbda076ed9e2e5dc434a9b58deae8a9f574842ffc1f78a4af4d1a69314100a0724e1809000000000000000000000000d01309468e150100000000000000050000000004000700000001000000bcd2999595e2a2eabbc39643b12271ae3bcb4c91ea3ff9ac4473e8dfe2ae1f04bcd2999595e2a2eabbc39643b12271ae3bcb4c91ea3ff9ac4473e8dfe2ae1f04");
  console.log('sign', u8aToHex(sign));

  const did = generateDidDocument(pair.address, pair.address);

  await callDIDPallet(pair, did);
  console.log("---------Network call complete!----------");
};

main();
