export default {
    async debit(userId: string, amount: number): Promise<boolean> {
        // call external casino API
        // simulate success for demo
        console.log(`Debit ${amount} from ${userId}`);
        return true;
    },
    async credit(userId: string, amount: number): Promise<boolean> {
        console.log(`Credit ${amount} to ${userId}`);
        return true;
    }
};