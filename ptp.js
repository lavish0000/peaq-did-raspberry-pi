import { Sdk } from "./../peaq-network/dist/packages/sdk/src/index.js";

const MASTER_URL = 'https://ptp.peaq.network';

// Subscribe to PTP updates
const unsubscribe = Sdk.subscribeToPtp(
  { masterUrl: MASTER_URL },
  ({ offset, synchronizedTime }) => {
    console.log(`\x1b[36m====================\x1b[0m`);
    console.log(`\x1b[32mClock Offset:\x1b[0m \x1b[33m${offset} ns\x1b[0m`);
    console.log(`\x1b[32mSynchronized Time:\x1b[0m \x1b[33m${synchronizedTime} ns\x1b[0m`);
    console.log(`\x1b[36m====================\x1b[0m`);
  }
);

// Later, when you want to stop receiving updates
// unsubscribe();