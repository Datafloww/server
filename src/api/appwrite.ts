import { Client, Account } from "node-appwrite";
import dotenv from "dotenv";
dotenv.config();
const client = new Client()
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
const account = new Account(client);
export default account;
