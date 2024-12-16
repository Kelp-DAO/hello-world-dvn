import { DatabaseManager } from "../DatabaseManager";
import { CacheManager } from "../CacheManager";
import { logger } from "../Logger";

/**
 * Performs operations to prepare the context for the demo
 */
const main = async () => {
    await DatabaseManager.resetDatabase(logger);
    CacheManager.erasedDataInSharedCache();
    CacheManager.eraseTransactionLocks();
}

/**
 * 
 */
main().catch((error) => {
    logger.error("Error in main function:", error);
});