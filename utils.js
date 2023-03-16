import { Keyring } from "@polkadot/keyring";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { PEAQ_MNEMONIC } from "./constants.js";

let peaqKeyPair = "";
const peaqMnemonic = PEAQ_MNEMONIC;

export const getPeaqKeyPair = () => {
  if (peaqKeyPair) return peaqKeyPair;
  const keyPair = new Keyring({ type: "sr25519" }).addFromUri(peaqMnemonic);
  peaqKeyPair = keyPair;
  return keyPair;
};

export const getNetworkApi = async (network) => {
  try {
    // if (global[network.name]) return global[network.name];
    const api = new ApiPromise({
      provider: new WsProvider(network.ws),
    });
    await api.isReadyOrError;
    global[`${network.name}`] = api;
    return api;
  } catch (error) {
    console.error("getNetworkApi error", error);
    throw error;
  }
};
