import { Sdk } from "@peaq-network/sdk";
import Keyring from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";

const seed = "put impulse gadget fence humble soup mother card yard renew chat quiz";
const name = "peaq-console";

const main = async () => {
  const sdkInstance = await Sdk.createInstance({ baseUrl: "wss://wsspc1-qa.agung.peaq.network", seed });
  const mnemonicSeed = mnemonicGenerate();
  const keyring = new Keyring({ type: "sr25519" });
  const pair = keyring.addFromUri(mnemonicSeed);
  console.log("DID...");

  const did = await sdkInstance.did.create({ name, address: pair.address });

  console.log("DID", did);
};

main();
