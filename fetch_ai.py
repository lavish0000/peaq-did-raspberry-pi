import os
import sys
import ssl

from uagents.setup import fund_agent_if_low
from uagents import Agent, Context, Model, Bureau
from substrateinterface import SubstrateInterface, Keypair
from substrateinterface.exceptions import SubstrateRequestException

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
    # type_registry_preset="substrate-node-template",
)

minimum_balance = 5 * 10 ** substrate.token_decimals

async def transferBalance(address, amount, keypair):
    # Create a transfer extrinsic
    call = substrate.compose_call(
        call_module='Balances',
        call_function='transfer',
        call_params={
            'dest': address,
            'value': amount
        }
    )

    # Create a extrinsic
    extrinsic = substrate.create_signed_extrinsic(
        call=call,
        keypair=keypair,
    )
    # Submit the transaction
    try:
        receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
        print("Extrinsic '{}' sent and included in block '{}'".format(receipt.extrinsic_hash, receipt.block_hash))

    except SubstrateRequestException as e:
        print("Failed to send: {}".format(e))

async def formatBalance(balance):
    return balance / 10 ** substrate.token_decimals

async def getBalance(address):
    result = substrate.query('System', 'Account', [address])
    balance = result.value['data']['free']
    return balance

# Query the balance of the corresponding address
# result = substrate.query('System', 'Account', [keypair.ss58_address])
# print(f"Address: {keypair.ss58_address}")
# print(f"Balance: {result.value['data']['free']} units")

class Transfer(Model):
    address: str
    amount: int

bobAddress = "5FZpsT8LKCX7tMKNX7e24R1BgnMfzgSL1Y4V9enYFoYpSmft"
alice = Agent(name="alice", seed=seed, port=8000, endpoint=["http://127.0.0.1:8000/submit"])
bob = Agent(name="bob", seed="5FZpsT8LKCX7tMKNX7e24R1BgnMfzgSL1Y4V9enYFoYpSmft", port=8001, endpoint=["http://127.0.0.1:8001/submit"])

fund_agent_if_low(alice.wallet.address())
fund_agent_if_low(bob.wallet.address())


@bob.on_interval(period=2.0)
async def check_balance(ctx: Context):
    ctx.logger.info(f'hello, my name is {ctx.name}')
    balance = await getBalance(bobAddress)
    ctx.logger.info(f"Address: {bobAddress}")
    ctx.logger.info(
        f"Balance: {balance} {substrate.token_symbol}")
    if balance < minimum_balance:
        ctx.logger.info(f"Low balance, requesting {minimum_balance - balance} funds from {alice.name}")
        await ctx.send(alice.address, Transfer(address=bobAddress, amount=(minimum_balance - balance)))
        
    

# @alice.on_interval(period=2.0)
# async def send_message(ctx: Context):
#     msg = f'hello there {bob.name} my name is {alice.name}'
#     await ctx.send(bob.address, Transfer(address=bobAddress, amount=10 * 10 ** substrate.token_decimals))


@alice.on_message(model=Transfer)
async def message_handler(ctx: Context, sender: str, msg: Transfer):
    aliceBalance = await getBalance(keypair.ss58_address)
    ctx.logger.info(f"Received Transfer request from {msg.address}: {msg.amount}")
    if aliceBalance < msg.amount:
        ctx.logger.info(f"Insufficient balance to transfer {msg.amount} {substrate.token_symbol} to {msg.address}")
        return
    ctx.logger.info(f"Transferring {msg.amount} {substrate.token_symbol} to {msg.address}")
    result = await transferBalance(msg.address, msg.amount, keypair)
    ctx.logger.info(f"Transfer result: {result}")

bureau = Bureau()
bureau.add(alice)
bureau.add(bob)
# transferBalance(bobAddress, 1 * 10**18, keypair)

if __name__ == "__main__":
    bureau.run()
