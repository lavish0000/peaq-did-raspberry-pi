import { Sdk } from "@peaq-network/sdk";
import { ApiPromise, WsProvider } from "@polkadot/api";
import Keyring from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { getNetworkApi } from "./utils.js";
import { networks } from "./constants.js";

const seed =
  "put impulse gadget fence humble soup mother card yard renew chat quiz";
const name = "Test DID depin 1d339989";

const createDid = async () => {
  const sdkInstance = await Sdk.createInstance({
    baseUrl: "wss://wss-async.agung.peaq.network",
    seed,
  });

  // for (let i = 0; i < 500; i++) {
  // dids added 2400
  // const mnemonicSeed = mnemonicGenerate();
  const keyring = new Keyring({ type: "sr25519" });
  const pair = keyring.addFromUri(seed);
  console.log("DID...");
  const did = await sdkInstance.did.create(
    {
      name,
      address: pair.address,
      customDocumentFields: {
        services: [
          {
            id: "#metadata",
            type: "metadata",
            data: JSON.stringify({ combiner: "foo bar" }),
          },
        ],
        signature: {
          type: "ED25519VERIFICATIONKEY2020",
          hash: "<signature of the users address created using DePIn private key>",
          issuer: "<address of DePIn>",
        },
      },
    },
    async (result) => {
      console.log(JSON.stringify(result));
      const dispatchError = result.dispatchError;
      console.log("dispatch", dispatchError);
      if (dispatchError?.isModule) {
        //   var wsp = new WsProvider("wss://wsspc1-qa.agung.peaq.network");
        //   var api = await (await ApiPromise.create({
        //  provider: wsp})).isReady;
        const decoded = sdkInstance._api.registry.findMetaError(
          dispatchError.asModule
        );
        const { docs, name, section } = decoded;

        console.log(`${section}.${name}: ${docs.join(" ")}`);
      }

      const isFinalized = !!JSON.parse(JSON.stringify(result.status))
        ?.finalized;

      console.log("isFinalized", isFinalized);

      if (result.status.isFinalized) {
        console.error("Condition result.status?.finalized is true");
      } else {
        console.error("Condition result.status?.finalized is false");
      }

      const status = result.status;
      const hash = status;
      console.log(`hash from callback: ${hash}`);
      // waitObj.completed = true;
      console.log(Date.now().toLocaleString());
    }
  );
  // did.unsubscribe();

  console.log("DID", JSON.stringify(did));
  // }
};
// getting collator address as well in the reset account list - 5Dkig9S4A4KFEmfD8VTuQ6ezPuciYm3vhceP1yjwEjgpRWsG
createDid();
