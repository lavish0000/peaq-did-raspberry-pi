import Web3 from 'web3';
import fs from 'fs';
import { hexToNumberString, fromWei } from 'web3-utils';

// Set the same RPC URL used in the Web3 constructor
const PEAQ_RPC = 'https://node-7305048623144648704.hk.onfinality.io/jsonrpc?apikey=1d23238e-8893-44d1-afeb-b69ec4dcc818';
const web3 = new Web3(PEAQ_RPC);  // Peaq RPC connection

// Additional variables for chunk processing
const CHUNK_SIZE = 1000; // Smaller, consistent chunk size

const START_BLOCK = 1599333;
const PRECOMPILE_ADDR = '0x0000000000000000000000000000000000000809';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';  // Approval event topic

// File to store block ranges with no logs
const SKIP_BLOCKS_FILE = 'skip_blocks.json';
// File to store last processed block
const LAST_BLOCK_FILE = 'last_processed_block.json';
// File to store results
const RESULTS_FILE = 'results.json';

// Load skip blocks from file or initialize empty array
function loadSkipBlocks() {
  try {
    if (fs.existsSync(SKIP_BLOCKS_FILE)) {
      const data = fs.readFileSync(SKIP_BLOCKS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`[ERROR] Error loading skip blocks file: ${error.message}`);
  }
  return [];
}

// Find gaps between skip blocks (these are the blocks we need to scan)
function findBlocksToScan(skipBlocks, startBlock, endBlock) {
  // Convert to numbers for comparison
  startBlock = Number(startBlock);
  endBlock = Number(endBlock);
  
  // Sort skip blocks by fromBlock
  skipBlocks.sort((a, b) => Number(a.fromBlock) - Number(b.fromBlock));
  
  const blocksToScan = [];
  let currentStart = startBlock;
  
  // Find gaps between skip blocks
  for (const range of skipBlocks) {
    const rangeStart = Number(range.fromBlock);
    const rangeEnd = Number(range.toBlock);
    
    // If there's a gap before this range, add it to blocks to scan
    if (currentStart < rangeStart) {
      blocksToScan.push({
        fromBlock: String(currentStart),
        toBlock: String(rangeStart - 1)
      });
    }
    
    // Move current position to after this range
    currentStart = Math.max(currentStart, rangeEnd + 1);
  }
  
  // Add any remaining blocks after the last skip range
  if (currentStart <= endBlock) {
    blocksToScan.push({
      fromBlock: String(currentStart),
      toBlock: String(endBlock)
    });
  }
  
  return blocksToScan;
}

// Load last processed block
function loadLastProcessedBlock() {
  try {
    if (fs.existsSync(LAST_BLOCK_FILE)) {
      const data = fs.readFileSync(LAST_BLOCK_FILE, 'utf8');
      const lastBlock = JSON.parse(data).lastBlock;
      return Number(lastBlock);
    }
  } catch (error) {
    console.log(`[ERROR] Error loading last block file: ${error.message}`);
  }
  return START_BLOCK;
}

// Save last processed block
function saveLastProcessedBlock(block) {
  try {
    fs.writeFileSync(LAST_BLOCK_FILE, JSON.stringify({ lastBlock: String(block) }, null, 2));
  } catch (error) {
    console.log(`[ERROR] Error saving last processed block: ${error.message}`);
  }
}

// Load existing results if any
function loadResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const data = fs.readFileSync(RESULTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`[ERROR] Error loading results file: ${error.message}`);
  }
  return [];
}

// Save results
function saveResults(results) {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  } catch (error) {
    console.log(`[ERROR] Error saving results: ${error.message}`);
  }
}

async function scanBlockRange(fromBlock, toBlock, results) {
  // Convert to numbers
  fromBlock = Number(fromBlock);
  toBlock = Number(toBlock);
  
  console.log(`\n[INFO] Scanning blocks [${fromBlock}..${toBlock}]...`);
  
  try {
    // Use smaller chunks to prevent RPC errors
    const chunkSize = CHUNK_SIZE;
    
    for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += chunkSize) {
      let chunkEnd = Math.min(chunkStart + chunkSize - 1, toBlock);
      
      console.log(`[DEBUG] Fetching logs for chunk [${chunkStart}..${chunkEnd}]...`);
      
      try {
        // Fetch Approval logs for this chunk
        const logs = await web3.eth.getPastLogs({
          fromBlock: web3.utils.toHex(chunkStart),
          toBlock: web3.utils.toHex(chunkEnd),
          topics: [APPROVAL_TOPIC],
        });
        
        console.log(`[DEBUG] Found ${logs.length} logs in this chunk.`);
        
        // Process logs and add to results
        for (const log of logs) {
          // Decode indexed params from topics (topics[1] = owner, topics[2] = spender)
          const owner = '0x' + log.topics[1].slice(26);
          const spender = '0x' + log.topics[2].slice(26);
          
          // Skip if data field is empty
          if (!log.data || log.data === '0x') {
            console.log(`[DEBUG] Empty data field found in log at block ${log.blockNumber}, txHash: ${log.transactionHash}`);
            continue;
          }
          
          // Decode value from data field
          const value = hexToNumberString(log.data);
          
          // Determine if delegatecall was used
          const viaDelegate = log.address.toLowerCase() !== PRECOMPILE_ADDR.toLowerCase();
          
          // Log details
          console.log(`[INFO] Found Approval at block ${log.blockNumber}, txHash: ${log.transactionHash}`);
          console.log(`[DEBUG] Owner: ${owner}, Spender: ${spender}, Value: ${fromWei(value, 'ether')}, viaDelegatecall: ${viaDelegate}`);
          
          // Add to results
          results.push({
            block: log.blockNumber.toString(),
            txHash: log.transactionHash,
            owner: owner,
            spender: spender,
            value: fromWei(value, 'ether'),
            viaDelegatecall: viaDelegate,
            emitter: log.address
          });
          
          // Save results periodically to prevent data loss
          if (results.length % 10 === 0) {
            saveResults(results);
          }
        }
      } catch (chunkError) {
        console.error(`[ERROR] Error scanning chunk ${chunkStart}-${chunkEnd}: ${chunkError.message}`);
        
        // If chunk is too large, split it and retry
        if (chunkSize > 100 && (chunkEnd - chunkStart) > 100) {
          console.log(`[DEBUG] Retrying with smaller chunks...`);
          const midBlock = Math.floor((chunkStart + chunkEnd) / 2);
          
          // Process first half
          await scanBlockRange(chunkStart, midBlock, results);
          
          // Process second half
          await scanBlockRange(midBlock + 1, chunkEnd, results);
        }
      }
      
      // Save progress
      saveLastProcessedBlock(chunkEnd);
    }
    
    return results;
  } catch (error) {
    console.error(`[ERROR] Error in scanBlockRange: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log(`[INFO] Starting block scanning script...`);
  
  try {
    // Load skip blocks
    const skipBlocks = loadSkipBlocks();
    console.log(`[INFO] Loaded ${skipBlocks.length} skip block ranges`);
    
    // Load last processed block
    const startFromBlock = loadLastProcessedBlock();
    
    // Load existing results
    const results = loadResults();
    console.log(`[INFO] Loaded ${results.length} existing results`);
    
    // Check connectivity
    console.log(`[DEBUG] Connecting to Peaq node: ${PEAQ_RPC}`);
    const latestBlock = await web3.eth.getBlockNumber();
    console.log(`[INFO] Connected successfully. Latest block: ${latestBlock}`);
    
    // Find blocks to scan (gaps between skip blocks)
    const blocksToScan = findBlocksToScan(skipBlocks, startFromBlock, latestBlock);
    console.log(`[INFO] Found ${blocksToScan.length} block ranges to scan`);
    
    // Scan each block range
    for (const range of blocksToScan) {
      await scanBlockRange(range.fromBlock, range.toBlock, results);
    }
    
    // Final save of results
    saveResults(results);
    
    console.log(`\n[INFO] Scan complete! Found ${results.length} approval events.`);
    console.log(`[INFO] Results saved to ${RESULTS_FILE}`);
  } catch (error) {
    console.error(`[ERROR] Fatal error in main: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the script
main().catch((err) => {
  console.error('[ERROR] Unhandled error:', err);
  process.exit(1);
});
