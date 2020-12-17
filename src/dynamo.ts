import AWS, { DynamoDB } from 'aws-sdk';

AWS.config.region = 'us-east-1';
export const ddb = new DynamoDB();
export const doc = new DynamoDB.DocumentClient();
export const userTableName = process.env.USER_TABLE ?? 'users';

