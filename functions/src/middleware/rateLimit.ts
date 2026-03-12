import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

/**
 * Checks if the given identifier (e.g. IP address) has exceeded the rate limit.
 * Uses Firestore transactions for atomicity.
 * 
 * @param identifier - Key to rate limit by (e.g. IP address)
 * @throws HttpsError - If rate limit is exceeded
 */
export async function checkRateLimit(identifier: string): Promise<void> {
    const db = getFirestore();
    const key = `ratelimit_${identifier}`;
    const ref = db.collection("_ratelimits").doc(key);
    const now = Date.now();

    try {
        const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);

            if (!doc.exists) {
                transaction.set(ref, {
                    count: 1,
                    resetTime: now + RATE_LIMIT_WINDOW
                });
                return true;
            }

            const data = doc.data()!;
            if (now > data.resetTime) {
                // Window expired, reset counter
                transaction.set(ref, {
                    count: 1,
                    resetTime: now + RATE_LIMIT_WINDOW
                });
                return true;
            }

            if (data.count >= MAX_REQUESTS) {
                return false; // Limit exceeded
            }

            transaction.update(ref, {
                count: data.count + 1
            });
            return true;
        });

        if (!result) {
            throw new HttpsError(
                "resource-exhausted",
                `Príliš veľa rezervácií z vašej adresy. Skúste to prosím o minútu (max ${MAX_REQUESTS} za minútu).`
            );
        }
    } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.error("Rate limit check error:", err);
        // Fail open in case of Firestore issues to not block legitimate users
    }
}
