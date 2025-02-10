import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Wallet } from "ethers";
import { WalletHelper } from "./WalletHelper";

/**
 * The CacheManager class provides methods for managing a shared cache
 * It includes functionalities for reading, writing, and erasing cache data,
 * as well as acquiring and releasing transaction locks
 */
export class CacheManager {
  // Key for the demo DVNCoordinator address
  static readonly KEY_DEMO_DVN_COORDINATOR = "DEMO_DVN_COORDINATOR";

  // Key for the demo DVN owner private key
  static readonly KEY_DEMO_DVN_OWNER_PRIVATE_KEY = "DEMO_DVN_OWNER_PRIVATE_KEY";

  /**
   * Acquire a transaction lock for the given wallet
   */
  static async acquireTransactionLock(wallet: Wallet) {
    const lockFile = CacheManager.getTransactionLockFilenameForWallet(wallet);

    while (fs.existsSync(lockFile)) {
      console.log("Waiting for Transaction lock...");

      // random time between min ms and max ms
      const min = 800;
      const max = 2000;
      const rand = Math.floor(Math.random() * max) + min;

      await new Promise((resolve) => setTimeout(resolve, rand));
    }

    fs.writeFileSync(lockFile, "locked");
  }

  /**
   * Create the cache file if it does not exist
   */
  static createCacheFileIfNotExisting() {
    const cacheFile = CacheManager.getCommonCacheFile();

    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, JSON.stringify({}));
    }
  }

  /**
   * Erase all data in the shared cache
   */
  static erasedDataInSharedCache() {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();

    fs.writeFile(cacheFile, JSON.stringify({}, null, 2), (err) => {
      if (err) {
        throw Error("Error erasing the file", err);
      }
    });
  }

  /**
   * Write data to the shared cache file
   *
   * @param data The data to write to the cache file
   */
  static eraseTransactionLocks() {
    const cacheDir = CacheManager.getCacheDir();
    const files = fs.readdirSync(cacheDir);

    files.forEach((file) => {
      if (file.endsWith(".lock")) {
        fs.unlinkSync(path.join(cacheDir, file));
      }
    });
  }

  /**
   * Get the directory path for the cache files
   *
   * @returns {string} The cache directory path
   */
  static getCacheDir(): string {
    return path.dirname(fileURLToPath(import.meta.url)) + "/../cache";
  }

  /**
   * Get the common cache file path
   *
   * @returns {string} The common cache file path
   */
  static getCommonCacheFile(): string {
    return CacheManager.getCacheDir() + "/data.json";
  }

  /**
   * Get the transaction lock filename for the given wallet
   *
   * @param wallet The wallet for which to get the lock filename
   * @returns The lock filename for the given wallet
   */
  private static getTransactionLockFilenameForWallet(wallet: Wallet): string {
    const publicKey = WalletHelper.derivePublicKeyFromWallet(wallet);
    const lockFile = `${CacheManager.getCacheDir()}/lockfile-${publicKey}.lock`;

    return lockFile;
  }

  /**
   * Retrieve a value from the shared cache
   *
   * @param key The key of the value to retrieve
   * @returns The value associated with the key, or undefined if the key does not exist
   */
  static getValueInSharedCache(key: string): string | undefined {
    CacheManager.createCacheFileIfNotExisting();

    const data = CacheManager.readCacheFile();
    return data[key];
  }

  /**
   * Read the cache file and return its contents as a JSON object
   *
   * @returns {any} The contents of the cache file as a JSON object
   */
  static readCacheFile(): any {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();

    const data = fs.readFileSync(cacheFile, "utf-8");
    return data ? JSON.parse(data) : {};
  }

  /**
   * Release the transaction lock for the given wallet
   */
  static releaseTransactionLock(wallet: Wallet) {
    const lockFile = CacheManager.getTransactionLockFilenameForWallet(wallet);

    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  }

  /**
   * Write data to the shared cache file
   *
   * @param data The data to write to the cache file
   */
  private static writeDataInSharedCache(data: any) {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();

    // Save data to the file
    fs.writeFile(cacheFile, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        throw Error("Error writing to file", err);
      }
    });
  }

  /**
   * Write a value to the shared cache
   *
   * @param key The key under which the value should be stored
   * @param value The value to store in the cache
   */
  static writeValueInSharedCache(key: string, value: string): Promise<void> {
    return new Promise<void>((resolve) => {
      CacheManager.createCacheFileIfNotExisting();

      const data = CacheManager.readCacheFile();
      data[key] = value;

      CacheManager.writeDataInSharedCache(data);

      // set some timeout due to the I/O delay
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }
}
