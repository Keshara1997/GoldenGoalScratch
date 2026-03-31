import '../bootstrapEnv';
import { generateBatch } from '../services/TicketGenerator';
import { MAX_TICKET_COUNT } from '../services/TicketGenerator';

// const BET_TIERS = [1, 2, 4, 8, 10, 20, 40, 80, 100, 200, 400, 800, 1000];
const BET_TIERS = [1];

async function run() {
    console.log('Starting initial batch generation...');
    for (const bet of BET_TIERS) {
        console.log(`Generating ${MAX_TICKET_COUNT.toLocaleString()} tickets for bet ${bet}...`);
        await generateBatch(bet, MAX_TICKET_COUNT);
        console.log(`Done for bet ${bet}`);
    }
    console.log('All batches generated.');
    process.exit(0);
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});