import './bootstrapEnv';
import app from './app';
import { checkAndReplenish } from './jobs/ReplenishmentJob';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // start background replenishment check
    setInterval(checkAndReplenish, 30* 1000); // every 30 seconds
});