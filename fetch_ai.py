import os
import sys
import ssl

from uagents import Agent, Context
from substrateinterface import SubstrateInterface, Keypair

ssl._create_default_https_context = ssl._create_unverified_context

# Read the seed phrase from a file
seed_file = "seed.txt"
if not os.path.isfile(seed_file):
    print(f"Error: {seed_file} not found")
    sys.exit(1)
with open(seed_file, "r") as f:
    seed = f.read().strip()

# Create a key pair from the seed phrase
keypair = Keypair.create_from_mnemonic(seed)

# Connect to a Substrate-based blockchain
substrate = SubstrateInterface(
    url="wss://wsspc1-qa.agung.peaq.network",
    # ss58_format=42,  # Replace with the SS58 format of your chain
    type_registry_preset="substrate-node-template",
    )

# Query the balance of the corresponding address
# result = substrate.query('System', 'Account', [keypair.ss58_address])
# print(f"Address: {keypair.ss58_address}")
# print(f"Balance: {result.value['data']['free']} units")

alice = Agent(name="alice", seed=seed)

@alice.on_interval(period=2.0)
async def get_balance(ctx: Context):
    ctx.logger.info(f'hello, my name is {ctx.address}')
    result = substrate.query('System', 'Account', [keypair.ss58_address])
    ctx.logger.info(f"Address: {keypair.ss58_address}")
    ctx.logger.info(f"Balance: {result.value['data']['free'] / 10 ** substrate.token_decimals} {substrate.token_symbol}")

if __name__ == "__main__":
    alice.run()

