import AWS, { DynamoDB } from 'aws-sdk';

AWS.config.region = 'us-east-1';
export const doc = new DynamoDB.DocumentClient();
export const userTableName = process.env.USER_TABLE ?? 'users';
export const transcriptTableName = process.env.TRANSCRIPT_TABLE ?? 'transcripts';
export const resetTableName = process.env.RESET_TABLE ?? 'resets';

