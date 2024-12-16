import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';
import { Wallet } from "ethers";
import { WalletHelper } from "./WalletHelper";

export class CacheManager {
  // contract address of the demo DVN Coordinator
  static readonly KEY_DEMO_DVN_COORDINATOR = 'DEMO_DVN_COORDINATOR';
  
  // provate key of the owner of the demo DVN
  static readonly KEY_DEMO_DVN_OWNER_PRIVATE_KEY = 'DEMO_DVN_OWNER_PRIVATE_KEY';

  /**
   * 
   * @returns 
   */
  static getCacheDir(): string {
    return path.dirname(fileURLToPath(import.meta.url)) + '/../cache';
  }

  /**
   * 
   * @returns 
   */
  static getCommonCacheFile(): string {
    return CacheManager.getCacheDir() + '/data.json';
  }

  /**
   * 
   */
  static createCacheFileIfNotExisting() {
    const cacheFile = CacheManager.getCommonCacheFile();

    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, JSON.stringify({}));
    }
  }

  /**
   * 
   */
  static readCacheFile(): any {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();
    
    const data = fs.readFileSync(cacheFile, 'utf-8');
    return data ? JSON.parse(data) : {};
  }
  
  /**
   * 
   * @param key 
   * @param value 
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
      }, 100)
    });
  }
  
  /**
   * 
   * @param key 
   * @param value 
   */
  static getValueInSharedCache(key: string): string | undefined {
    CacheManager.createCacheFileIfNotExisting();
    
    const data = CacheManager.readCacheFile();
    return data[key];
  }
  
  /**
   * 
   * @param data 
   */
  private static writeDataInSharedCache(data: any) {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();

    // Save data to the file
    fs.writeFile(cacheFile, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            throw Error('Error writing to file', err);
        }
    });
  }
  
  /**
   * 
   * @param data 
   */
  static erasedDataInSharedCache() {
    CacheManager.createCacheFileIfNotExisting();
    const cacheFile = CacheManager.getCommonCacheFile();

    fs.writeFile(cacheFile, JSON.stringify({}, null, 2), (err) => {
      if (err) {
        throw Error('Error erasing the file', err);
      }
    });
  }
  
  /**
   * 
   * @param data 
   */
  static eraseTransactionLocks() {
    const cacheDir = CacheManager.getCacheDir();
    const files = fs.readdirSync(cacheDir);

    files.forEach(file => {
      if (file.endsWith('.lock')) {
        fs.unlinkSync(path.join(cacheDir, file));
      }
    });
  }
  
  /**
   * 
   */
  static async acquireTransactionLock(wallet: Wallet) {
    const lockFile = CacheManager.getTransactionLockFilenameForWallet(wallet);
    
    while (fs.existsSync(lockFile)) {
        console.log('Waiting for Transaction lock...');
        
        // random time between min ms and max ms
        const min = 800;
        const max = 2000;
        const rand = Math.floor(Math.random() * max) + min;

        await new Promise((resolve) => setTimeout(resolve, rand));
    }

    fs.writeFileSync(lockFile, 'locked');
  };

  /**
   * 
   */
  static releaseTransactionLock(wallet: Wallet) {
    const lockFile = CacheManager.getTransactionLockFilenameForWallet(wallet);
    
    if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
    }
  };

  /**
   * 
   */
  private static getTransactionLockFilenameForWallet(wallet: Wallet): string {
    const publicKey = WalletHelper.derivePublicKeyFromWallet(wallet);
    const lockFile = `${CacheManager.getCacheDir()}/lockfile-${publicKey}.lock`
    
    return lockFile;
  };
}
