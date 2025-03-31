import { createStorageKeys, generateKeyPair, makePalletQuery } from "./utils.js";
import pkg from 'peaq-did-proto-js';
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { hexToU8a, u8aToHex, } from "@polkadot/util";
const { Document } = pkg;

const seed =
  "credit tell tooth equip extend dinosaur shrug deny spray clerk misery erase";
const name = "Tom-1";

export const getDIDDocument = async () => {
    await cryptoWaitReady();

    const keyPair = generateKeyPair(seed);
    console.log("publicKey", u8aToHex(keyPair.publicKey));
    const { hashed_key } = createStorageKeys([
      {
        value: "5GZ7f6de6HdPGrFpzAac3HDSB6bJHBvwUDqUPjBiG7dq2bTm",
        type: 0,
      },
      { value: name, type: 1 },
    ]);
  
    const did = await makePalletQuery(
      "peaqDid",
      "attributeStore",
      [hashed_key]
    );
    console.log("DID", did.isStorageFallback);
    const doc = Document.deserializeBinary(did.value);
  
    const didDocument = doc.toObject();
    console.log("DID Document", didDocument);
  };

getDIDDocument();