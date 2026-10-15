import cron from "node-cron";
import { userService } from "../services/user.service";

export async function startVerificationCleanupJob() {
    cron.schedule("*/10 * * * *", async () => {
        console.log("Running verification cleanup...");

        await userService.deleteExpiredUnverifiedUsers();
    });
}