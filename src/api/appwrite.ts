import * as sdk from "node-appwrite";
import "dotenv/config";

const client = new sdk.Client()
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
export const account = new sdk.Account(client);
export const user = new sdk.Users(client);
export const query = sdk.Query;
