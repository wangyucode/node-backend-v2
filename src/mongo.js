import { MongoClient } from 'mongodb';
import { sleep } from './utils.js';

const DB_NAME = 'wycode';
export let db;
let retry = 0;

export const COLLECTIONS = {
  USER: 'user',
  COMMENT_APP: 'mongoCommentApp',
  CONFIG: 'config',
  CLIPBOARD: 'clipboard',
  COMMENT: 'comments',
  WECHAT_APP: 'wechatApp',
  VENDING_BANNER: 'vendingBanner',
  VENDING_GOODS: 'vendingGoods',
  VENDING_ORDER: 'vendingOrder',
  VENDING_CODE: 'vendingCode',
};

export const CONFIG_KEYS = {
  CONFIG_NOTIFICATION_CLIPBOARD: 'CONFIG_NOTIFICATION_CLIPBOARD',
  CONFIG_PATCH_RECORD: 'CONFIG_PATCH_RECORD',
};

export async function connectToMongo() {
  try {
    console.info('Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);

    // Connect the client to the server
    await client.connect();
    db = client.db(DB_NAME);

    // Establish and verify connection
    await db.command({ ping: 1 });
    console.info('Connected successfully to MongoDB');
  } catch (error) {
    if (retry < 10) {
      retry++;
      await sleep(5000);
      await connectToMongo();
    } else {
      throw new Error('Error connecting to MongoDB');
    }
  }
}