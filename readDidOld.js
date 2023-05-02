import { createStorageKeys, generateKeyPair, makePalletQuery } from "./utils.js";
import pkg from 'peaq-did-proto-js';
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { hexToU8a } from "@polkadot/util";
const { Document } = pkg;

const seed =
  "credit tell tooth equip extend dinosaur shrug deny spray clerk misery erase";
const name = "Tom-1";

export const getDIDDocument = async () => {
    await cryptoWaitReady();

    const keyPair = generateKeyPair(seed);
    const { hashed_key } = createStorageKeys([
      {
        value: keyPair.address,
        type: 0,
      },
      { value: name, type: 1 },
    ]);
  
    const did = await makePalletQuery(
      "peaqDid",
      "attributeStore",
      [hashed_key]
    );
    const doc = Document.deserializeBinary(hexToU8a(did.value));
  
    const didDocument = doc.toObject();
    console.log("DID Document", didDocument);
  };

getDIDDocument();