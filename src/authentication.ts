import { doc, resetTableName, userTableName } from './dynamo';
import { AuthPayload, ResetToken, SessionToken, User, ResetTokenPayload } from './User';
import { AzureCredentials, MicrosoftToken } from './AzureTypes';
import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SlackCredentials, SlackToken } from './SlackTypes';
import { AWSCredentials } from './AWSTypes';

export const SALT_ROUNDS = 10;
export const TTL = 24*60*60*1000; // One day

const RESET_TTL = 60*60*1000; // one hour
const RESET_LEN = 128;

async function hasher(pass: string): Promise<string> {
    return hash(pass, SALT_ROUNDS);
}

export type Credentials = SlackCredentials | AzureCredentials | AWSCredentials;
export async function getAccount(account: "slack"): Promise<SlackCredentials>;
export async function getAccount(account: "azure"): Promise<AzureCredentials>;
export async function getAccount(account: "aws"): Promise<AWSCredentials>;
export async function getAccount(account: "slack"|"azure"|"aws"): Promise<Credentials> {
    if (account === 'slack') {
        const creds = await fs.readFile(join(__dirname, 'slack_credentials.json')).then(b => b.toString());
        return JSON.parse(creds) as SlackCredentials;
    } else if (account === "azure") {
        const creds = await fs.readFile(join(__dirname, 'azure_credentials.json')).then(b => b.toString());
        return JSON.parse(creds) as AzureCredentials;
    } else if (account === 'aws') {
        const creds = await fs.readFile(join(__dirname, 'aws_credentials.json')).then(b => b.toString());
        return JSON.parse(creds) as AWSCredentials;
    } else {
        throw new Error(`Unknown Account Type ${account}`);
    }
}

export async function authenticate(email: string, password: string, mac?: string): Promise<SessionToken> {
    return new Promise<SessionToken>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
        }, async (err, data) => {
            if (err || data.Item === undefined) {
                rej('Invalid');
                return;
            }
            const { Item: user } = data;
            // bcrypt and engage
            if (await compare(password, user['passHash'])) {
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
    }).then(async token => {
        if (mac !== undefined) {
            const tokens = await new Promise<SessionToken[]>((res, rej) => {
                doc.get({
                    TableName: userTableName,
                    Key: {
                        'userID': email,
                    },
                    ProjectionExpression: 'applicationTokens',
                }, (err, data) => {
                    if (err || data.Item === undefined) {
                        rej('Invalid');
                        return;
                    }
                    res(data.Item.applicationTokens as SessionToken[]);
                });
            });
            // if any tokens have our mac address... kill it
            const ind = tokens.findIndex(st => st.mac === mac);
            if (ind !== -1) {
                // kill it
                await new Promise<void>((res, rej) => {
                    doc.update({
                        TableName: userTableName,
                        Key: {
                            'userID': email,
                        },
                        UpdateExpression: `REMOVE applicationTokens[${ind}]`,
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
        return new Promise<SessionToken>((res, rej) => {
            doc.update({
                TableName: userTableName,
                Key: {
                    'userID': email,
                },
                UpdateExpression: 'SET #st = list_append(#st, :vals)',
                ExpressionAttributeNames: {
                    '#st': 'applicationTokens',
                },
                ExpressionAttributeValues: {
                    ':vals': [{
                        'token': token.token,
                        'ttl': token.ttl,
                        'createdAt': token.createdAt,
                        'mac': token.mac ?? '',
                    }],
                },
            }, (err, data) => {
                if (err) {
                    rej('Invalid');
                } else {
                    res(token);
                }
            });
        });
    });
}

export async function checkSession(auth: AuthPayload): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': auth.email,
            },
            ProjectionExpression: 'applicationTokens',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                res(false);
                return;
            }
            const tokens = data.Item.applicationTokens as SessionToken[];
            // filter it out
            const toKill: number[] = [];
            const remaining = tokens.filter((st, i) => {
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
                const killer = toKill.map(i => `#ap[${i}]`)
                    .join(', ');
                doc.update({
                    TableName: userTableName,
                    Key: {
                        'userID': auth.email,
                    },
                    UpdateExpression: `REMOVE ${killer}`,
                    ExpressionAttributeNames: {
                        '#ap': 'applicationTokens',
                    },
                });
            }
            res(remaining.find(st => st.token === auth.token && ((auth.mac ?? '') === (st.mac ?? ''))) !== undefined);
        });
    });
}

export async function createNewUser(email: string, password: string): Promise<SessionToken> {
    const hashed = await hasher(password);
    await new Promise<void>((res, rej) => {
        doc.put({
            TableName: userTableName,
            Item: {
                'userID': email,
                'passHash': hashed,
                'tokens': {
                    'slack': [],
                    'outlook': [],
                },
                'applicationTokens': [],
                'transcripts': [],
                'creationDate': Date.now(),
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

export async function generateReset(email: string): Promise<ResetToken> {
    const token = randomBytes(RESET_LEN).toString('base64').replace(/[+/=]/g, '_');
    return new Promise<ResetToken>((res, rej) => {
        const payload: ResetToken = {
            email, token,
            expirationDate: Date.now() + RESET_TTL,
        };
        doc.put({
            TableName: resetTableName,
            Item: payload,
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res(payload);
            }
        });
    });
}

async function deleteReset(token: string): Promise<void> {
    return new Promise<void>((res, rej) => {
        doc.delete({
            TableName: resetTableName,
            Key: {
                'token': token,
            }
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

export async function fetchReset(token: string): Promise<string> {
    return new Promise<string>((res, rej) => {
        doc.get({
            TableName: resetTableName,
            Key: {
                'token': token,
            },
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej(err);
                return;
            }
            const payload = data.Item as ResetToken;
            if (Date.now() > payload.expirationDate) {
                rej('EXPIRATION');
                return;
            }
            res(payload.email);
        });
    });
}

export async function resetPassword(token: ResetTokenPayload): Promise<void>;
export async function resetPassword(email: string, password: string): Promise<void>;
export async function resetPassword(emailOrToken: string|ResetTokenPayload, password?: string): Promise<void> {
    if (typeof emailOrToken !== 'string') {
        // delete the reset token... ASSUME ALREADY CHECKED
        await deleteReset(emailOrToken.token);
    } else if (password === undefined) {
        throw new Error('Must provide password with email');
    }
    const email = typeof emailOrToken === 'string' ? emailOrToken : emailOrToken.email;
    const pass = typeof emailOrToken === 'string' ? password! : emailOrToken.password;
    const hashed = await hasher(pass);
    return new Promise<void>((res, rej) => {
        doc.update({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            UpdateExpression: 'SET #ph = :pass',
            ExpressionAttributeNames: {
                '#ph': 'passHash'
            },
            ExpressionAttributeValues: {
                ':pass': hashed,
            },
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

export interface TokenCollection {
    slack: SlackToken[];
    outlook: MicrosoftToken[];
}

export async function getTokens(email: string): Promise<TokenCollection> {
    return new Promise<TokenCollection>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            ProjectionExpression: 'tokens',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej(err);
                return;
            }
            res(data.Item.tokens as TokenCollection);
        });
    });
}

export async function removeToken(email: string, type: "slack", id: string): Promise<void>;
export async function removeToken(email: string, type: "outlook", accountName: string): Promise<void>;
export async function removeToken(email: string, type: "outlook"|"slack", id: string): Promise<void> {
    const tokens = await getTokens(email);
    let ind: number = -1;
    if (type === "slack") {
        ind = tokens.slack.findIndex(st => st.id === id);
    } else {
        ind = tokens.outlook.findIndex(mt => mt.accountName === id);
    }
    if (ind === -1) {
        return Promise.reject('Token not found');
    }

    if (type === "slack") {
        return new Promise<void>((res, rej) => {
            doc.update({
                TableName: userTableName,
                Key: {
                    'userID': email,
                },
                UpdateExpression: `REMOVE #tk.#sl[${ind}]`,
                ExpressionAttributeNames: {
                    '#tk': 'tokens',
                    '#sl': 'slack',
                },
            }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            })
        });
    } else {
        return new Promise<void>((res, rej) => {
            doc.update({
                TableName: userTableName,
                Key: {
                    'userID': email,
                },
                UpdateExpression: `REMOVE #tk.#ot[${ind}]`,
                ExpressionAttributeNames: {
                    '#tk': 'tokens',
                    '#sl': 'slack',
                }
            }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            })
        })
    }
}

export async function addTokens(email: string, tokens: TokenCollection): Promise<void> {
    const existing = await getTokens(email);
    const exSlack = existing.slack.map(st => st.id);
    const exAzure = existing.outlook.map(ot => ot.accountName);
    tokens.slack = tokens.slack.filter(s => !exSlack.includes(s.id));
    tokens.outlook = tokens.outlook.filter(a => !exAzure.includes(a.accountName));
    if (tokens.slack.length > 0) {
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
    if (tokens.outlook.length > 0) {
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