import { ddb, userTableName } from './dynamo';
import { SessionToken } from './User';
import { hash, compare } from 'bcrypt';

export const SALT_ROUNDS = 10;
export async function authenticate(email: string, password: string): Promise<SessionToken> {
    return new Promise<SessionToken>((res, rej) => {
        ddb.getItem({
            TableName: userTableName,
            Key: {
                'userID': {
                    S: email,
                },
            },
        }, async (err, data) => {
            if (err || data.Item === undefined) {
                rej('Invalid');
                return;
            }
            const { Item: user } = data;
            // bcrypt and engage
            if (await compare(password, user['passHash'].S as string)) {
                // create a cryptographically strong, 1024-bit token
                const token = await hash(`${email} ${Date.now()}`, 0);
                res({ token, ttl: 0 });
                return;
            } else {
                rej('Invalid');
                return;
            }
        });
    }).then(token => {
        return new Promise<SessionToken>((res, rej) => {
            ddb.updateItem({
                TableName: userTableName,
                Key: {
                    'userID': {
                        S: email,
                    }
                },
                UpdateExpression: 'SET #st = list_append(#st, :vals)',
                ExpressionAttributeNames: {
                    '#st': 'applicationTokens',
                },
                ExpressionAttributeValues: {
                    ':vals': {
                        L: [
                            {
                                M: {
                                    'token': {
                                        S: token.token,
                                    },
                                    'ttl': {
                                        N: `${token.ttl}`,
                                    },
                                },
                            },
                        ],
                    },
                },
            }, (err, data) => {
                if (err) {
                    rej('Invalid');
                    return;
                }
                res(token);
                return;
            })
        });
    });
}

export async function checkSession(userID: string, token: string): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
        ddb.getItem({
            TableName: userTableName,
            Key: {
                'userID': {
                    S: userID,
                }
            },
            ProjectionExpression: 'applicationTokens',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                res(false);
                return;
            }
            if (data.Item['applicationTokens'].SS === undefined) {
                res(false);
                return;
            }
            const tokens = data.Item['applicationTokens'].SS;
            res(tokens.includes(token));
        });
    });
}

export async function createNewUser(email: string, password: string): Promise<SessionToken> {
    const hashed = await hash(password, SALT_ROUNDS);
    await new Promise<void>((res, rej) => {
        ddb.putItem({
            TableName: userTableName,
            Item: {
                'userID': {
                    S: email,
                },
                'passHash': {
                    S: hashed,
                },
                'tokens': {
                    M: {
                        'slack': {
                            L: [],
                        },
                        'outlook': {
                            L: [],
                        }
                    }
                },
                'applicationTokens': {
                    L: [],
                },
                'transcripts': {
                    L: [],
                },
            }
        }, (err, data) => {
            if (err) {
                rej();
            } else {
                res();
            }
        });
    });
    return authenticate(email, password);
}