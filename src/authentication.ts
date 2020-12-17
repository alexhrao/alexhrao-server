import { ddb, doc, userTableName } from './dynamo';
import { AuthPayload, MicrosoftToken, SessionToken, SlackToken, User } from './User';
import { hash, compare } from 'bcrypt';

export const SALT_ROUNDS = 10;
export const TTL = 24*60*60*1000; // One day
export async function authenticate(email: string, password: string, mac?: string): Promise<SessionToken> {
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
                // create a cryptographically strong token
                const token = await hash(`${email} ${Date.now()}`, 0);
                // if we're given a mac address, infinite longevity, but include the MAC address!
                const payload: SessionToken = {
                    mac,
                    token,
                    ttl: TTL,
                    createdAt: Date.now(),
                };
                if (mac !== undefined) {
                    payload.ttl = 0;
                }
                res(payload);
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
                                    'createdAt': {
                                        N: `${token.createdAt}`,
                                    },
                                    'mac': {
                                        S: token.mac ?? '',
                                    }
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
            });
        });
    });
}

export async function checkSession(auth: AuthPayload): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
        ddb.getItem({
            TableName: userTableName,
            Key: {
                'userID': {
                    S: auth.email,
                }
            },
            ProjectionExpression: 'applicationTokens',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                res(false);
                return;
            }
            if (data.Item['applicationTokens'].L === undefined) {
                res(false);
                return;
            }
            const raw = data.Item['applicationTokens'].L;
            const tokens = raw.map((t): SessionToken|undefined => {
                const token = t.M?.['token'].S;
                const ttl = t.M?.['ttl'].N;
                const createdAt = t.M?.['createdAt'].N;
                const mac = t.M?.['mac'].S;
                if (token === undefined || ttl === undefined || createdAt === undefined) {
                    return;
                }
                return {
                    token,
                    ttl: parseInt(ttl),
                    createdAt: parseInt(createdAt),
                    mac,
                };
            });
            // filter it out
            const toKill: number[] = [];
            const remaining = tokens.filter((st, i) => {
                if (st === undefined) {
                    toKill.push(i);
                    return false;
                }
                if (st.ttl === 0) {
                    return true;
                }
                if (st.ttl + st.createdAt < Date.now()) {
                    toKill.push(i);
                    return false;
                }
                return true;
            });
            if (toKill.length !== 0) {
                // ddb it!
                const killer = toKill.map(i => `applicationTokens[${i}]`)
                    .join(', ');
                ddb.updateItem({
                    TableName: userTableName,
                    Key: {
                        'userID': {
                            S: auth.email,
                        }
                    },
                    UpdateExpression: `REMOVE ${killer}`,
                })
            }
            res(remaining.find(st => st?.token === auth.token && ((auth.mac ?? '') === (st.mac ?? ''))) !== undefined);
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

export async function getUser(email: string): Promise<User> {
    return new Promise<User>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            }
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej('Invalid email');
                return;
            }
            res(data.Item as User);
        });
    });
}

export interface TokenCollection {
    slack?: SlackToken[];
    outlook?: MicrosoftToken[];
}

export async function addTokens(email: string, tokens: TokenCollection): Promise<void> {
    if (tokens.slack !== undefined && tokens.slack.length > 0) {
        await new Promise<void>((res, rej) => {
            doc.update({
                TableName: userTableName,
                Key: {
                    'userID': email,
                },
                UpdateExpression: 'SET #tok.#st = list_append(#tok.#st, :slacks)',
                ExpressionAttributeNames: {
                    '#tok': 'tokens',
                    '#st': 'slack',
                },
                ExpressionAttributeValues: {
                    ':slacks': tokens.slack,
                },
            }, (err, data) => {
                if (err) {
                    rej();
                } else {
                    res();
                }
            });
        });
    }
    if (tokens.outlook !== undefined && tokens.outlook.length > 0) {
        await new Promise<void>((res, rej) => {
            doc.update({
                TableName: userTableName,
                Key: {
                    'userID': email,
                },
                UpdateExpression: 'SET #tok.#ot = list_append(#tok.#ot, :azures)',
                ExpressionAttributeNames: {
                    '#tok': 'tokens',
                    '#ot': 'outlook',
                },
                ExpressionAttributeValues: {
                    ':azures': tokens.outlook,
                }
            }, (err, data) => {
                if (err) {
                    rej();
                } else {
                    res();
                }
            });
        });
    }
}