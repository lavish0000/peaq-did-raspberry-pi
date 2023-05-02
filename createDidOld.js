import { cryptoWaitReady } from "@polkadot/util-crypto";
import { generateDidDocument } from "./generate-did.js";
import { generateKeyPair, getNetworkApi } from "./utils.js";
import { networks } from "./constants.js";

const seed =
  "credit tell tooth equip extend dinosaur shrug deny spray clerk misery erase";
const name = "Tom-1";

const callDIDPallet = async (pair, didDocumentHash) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);

    const data = api.tx.peaqDid.addAttribute(
      pair.address,
      name,
      didDocumentHash,
      ""
    );

    data.signAndSend(pair, { nonce: -1 });

    return data;
  } catch (error) {
    console.log("===await SUB_API.tx.peaqDid.addAttribute==error===", error);
  }
};

const main = async () => {
  await cryptoWaitReady();

  const pair = generateKeyPair(seed);

  const did = generateDidDocument(pair.address, pair.address);

  await callDIDPallet(pair, did);
  console.log("---------Network call complete!----------");
};

main();
