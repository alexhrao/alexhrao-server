import { AuthPayload } from './User';
import { doc, transcriptTableName, userTableName } from './dynamo';
import { hash } from 'bcrypt';

async function generateToken(payload: unknown): Promise<string> {
    return (await hash(JSON.stringify(payload), 0)).replace(/[$./]/g, '_').substring(7);
}

export enum EventType {
    Chat = "chat",
    Join = "join",
    Leave = "left",
    HandRaise = "handraise",
    HandLower = "handlower",
}

export interface LockedTranscriptPayload {
    auth: AuthPayload;
    meetingName: string;
    events: TranscriptEvent[];
    meetingInfo: MeetingInfo;
    unlocked?: false;
}
export interface UnlockedTranscriptPayload {
    auth: AuthPayload;
    meetingName: string;
    events: TranscriptEvent[];
    meetingInfo: MeetingInfo;
    unlocked: true;
}
export type TranscriptPayload = LockedTranscriptPayload | UnlockedTranscriptPayload;

export interface TranscriptEvent {
    type: EventType;
    participantName: string;
    timestamp: number;
    body?: string;
}

export interface MeetingInfo {
    name: string;
    timeZone: string;
    meetingID: string;
    startTime: number;
    endTime: number;
}

export interface Transcript {
    meetingName: string;
    events: TranscriptEvent[];
    meetingInfo: MeetingInfo;
    token: string;
}
export interface UnlockedTranscript {
    token: string;
    email: string;
    transcriptName: string;
}

export async function saveTranscript(payload: LockedTranscriptPayload): Promise<void>;
export async function saveTranscript(payload: UnlockedTranscriptPayload): Promise<string>;
export async function saveTranscript(payload: TranscriptPayload): Promise<string | void> {
    const token = await generateToken(payload);
    // if it already exists... kill it first
    try {
        const transcript = await fetchTranscript(payload.auth.email, payload.meetingName);
        // It exists! delete it
        await deleteTranscript(payload.auth.email, transcript.meetingName);
    } catch {}
    
    const saver = new Promise<void>((res, rej) => {
        doc.update({
            TableName: userTableName,
            Key: {
                'userID': payload.auth.email,
            },
            UpdateExpression: 'SET #ts = list_append(#ts, :vals)',
            ExpressionAttributeNames: {
                '#ts': 'transcripts',
            },
            ExpressionAttributeValues: {
                ':vals': [{
                    'meetingName': payload.meetingName,
                    'events': payload.events.map(te => {
                        return {
                            ...te,
                            body: te.body ?? ''
                        };
                    }),
                    'meetingInfo': payload.meetingInfo,
                    'token': payload.unlocked ? token : '',
                }],
            },
        }, (err, data) => {
            if (err) {
                rej('Invalid');
                return;
            } else {
                res();
            }
        });
    });
    if (!(payload.unlocked ?? false)) {
        return saver;
    }
    // generate string, just hash it
    return saver.then(() => {
        return new Promise<string>(async (res, rej) => {
            
            doc.put({
                TableName: transcriptTableName,
                Item: {
                    'token': token,
                    'email': payload.auth.email,
                    'transcriptName': payload.meetingName,
                },
            }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(token);
                }
            });
        });
    });
}

export async function fetchTranscript(email: string, meetingName: string): Promise<Transcript>;
export async function fetchTranscript(email: string): Promise<Transcript[]>;
export async function fetchTranscript(unlock: UnlockedTranscript): Promise<Transcript>;
export async function fetchTranscript(email: string | UnlockedTranscript, meetingName?: string): Promise<Transcript | Transcript[]> {
    if (typeof email !== 'string') {
        return fetchTranscript(email.email, email.transcriptName);
    }
    return new Promise<Transcript | Transcript[]>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            ProjectionExpression: 'transcripts',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej('Invalid email');
                return;
            }
            const transcripts = data.Item.transcripts as Transcript[];
            if (meetingName !== undefined) {
                const t = transcripts.find(t => t.meetingName === meetingName);
                if (t === undefined) {
                    rej('No Meeting Found');
                } else {
                    res(t);
                }
            } else {
                res(transcripts);
            }
        });
    });
}

export async function fetchUnlocked(token: string): Promise<UnlockedTranscript> {
    return new Promise<UnlockedTranscript>((res, rej) => {
        doc.get({
            TableName: transcriptTableName,
            Key: {
                'token': token,
            },
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej();
                return;
            }
            res(data.Item as UnlockedTranscript);
        });
    });
}

export async function generateTranscriptFile(email: string, meetingName: string): Promise<string>;
export function generateTranscriptFile(transcript: Transcript): string;
export function generateTranscriptFile(emailOrTranscript: string | Transcript, meetingName?: string): string | Promise<string> {
    if (typeof emailOrTranscript === 'string') {
        if (meetingName === undefined) {
            throw new Error('Invalid call');
        }
        return fetchTranscript(emailOrTranscript, meetingName).then(t => transFile(t));
    } else {
        return transFile(emailOrTranscript);
    }
}

export async function lockTranscript(lock: string): Promise<void>;
export async function lockTranscript(lock: UnlockedTranscript): Promise<void>;
export async function lockTranscript(lock: UnlockedTranscript|string): Promise<void> {
    // delete it from the transcripts table
    const unlocked = await new Promise<UnlockedTranscript>((res, rej) => {
        doc.delete({
            TableName: transcriptTableName,
            Key: {
                'token': typeof lock === 'string' ? lock : lock.token,
            },
            ReturnValues: 'ALL_OLD',
        }, (err, data) => {
            if (err || data.Attributes === undefined) {
                rej(err);
                return;
            }
            res(data.Attributes as UnlockedTranscript);
        });
    });
    const ind = await new Promise<number>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': unlocked.email
            },
            ProjectionExpression: 'transcripts',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej('Invalid email');
                return;
            }
            const transcripts = data.Item.transcripts as Transcript[];
            // get the transcript _and_ index
            const ind = transcripts.findIndex(t => t.token === unlocked.token);
            res(ind);
        });
    });
    if (ind === -1) {
        return Promise.resolve();
    }
    return new Promise<void>((res, rej) => {
        doc.update({
            TableName: userTableName,
            Key: {
                'userID': unlocked.email,
            },
            UpdateExpression: `SET #tr[${ind}].#tk = :empty`,
            ExpressionAttributeNames: {
                '#tr': 'transcripts',
                '#tk': 'token',
            },
            ExpressionAttributeValues: {
                ':empty': '',
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

export async function unlockTranscript(email: string, meetingName: string): Promise<string> {
    // add token, then new table
    const token = await generateToken({ email, meetingName });
    const ind = await new Promise<number>((res, rej) => {
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            ProjectionExpression: 'transcripts',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej(err);
                return;
            } else {
                const transcripts = data.Item.transcripts as Transcript[];
                const ind = transcripts.findIndex(t => t.meetingName === meetingName);
                if (ind === -1) {
                    rej(ind);
                } else {
                    res(ind);
                }
            }
        })
    });
    const user = new Promise<void>((res, rej) => {
        doc.update({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            UpdateExpression: `SET #tr[${ind}].#tk = :token`,
            ExpressionAttributeNames: {
                '#tr': 'transcripts',
                '#tk': 'token',
            },
            ExpressionAttributeValues: {
                ':token': token,
            },
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
    const shortcut = new Promise<void>((res, rej) => {
        doc.put({
            TableName: transcriptTableName,
            Item: {
                'token': token,
                'email': email,
                'transcriptName': meetingName,
            }
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
    await user;
    await shortcut;
    return token;
}

export async function deleteTranscript(email: string, meetingName: string): Promise<void> {
    const transcript = await fetchTranscript(email, meetingName);
    if (transcript.token !== undefined && transcript.token.length > 0) {
        // lock it down
        await lockTranscript(transcript.token)
    }
    const ind = await new Promise<number>((res, rej) => {
        // we have to fetch all the transcripts... then REMOVE the right index...
        doc.get({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            ProjectionExpression: 'transcripts',
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej(err);
                return;
            }
            const trans = data.Item.transcripts as Transcript[];
            res(trans.findIndex(t => t.meetingName === meetingName));
        })
    });
    if (ind === -1) {
        return Promise.resolve();
    }
    return new Promise<void>((res, rej) => {
        doc.update({
            TableName: userTableName,
            Key: {
                'userID': email,
            },
            UpdateExpression: `REMOVE transcripts[${ind}]`,
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

function transFile(transcript: Transcript): string {
    let dtStart: string;
    let dtEnd: string;
    try {
        dtStart = new Date(transcript.meetingInfo.startTime).toLocaleString('en-US', {
            timeZone: transcript.meetingInfo.timeZone,
        });
        dtEnd = new Date(transcript.meetingInfo.endTime).toLocaleString('en-US', {
            timeZone: transcript.meetingInfo.timeZone,
        });
    } catch {
        dtStart = new Date(transcript.meetingInfo.startTime).toLocaleString();
        dtEnd = new Date(transcript.meetingInfo.endTime).toLocaleString();
    }
    return `Connected: (${dtStart})\n` + transcript.events
        .map(e => {
            let dt: string;
            try {
                dt = new Date(e.timestamp).toLocaleString('en-US', {
                    timeZone: transcript.meetingInfo.timeZone,
                });
            } catch {
                dt = new Date(e.timestamp).toLocaleString();
            }
            switch (e.type) {
                case EventType.Chat:
                    return `${e.participantName} (${dt}):\n${e.body}\n\n`;
                case EventType.HandLower:
                    return `${e.participantName} (${dt}): lowered their hand\n`;
                case EventType.HandRaise:
                    return `${e.participantName} (${dt}): raised their hand\n`;
                case EventType.Join:
                    return `${e.participantName} (${dt}): joined the meeting\n`;
                case EventType.Leave:
                    return `${e.participantName} (${dt}): left the meeting\n`;
            }
        }).join('') + `\nDisconnected at ${new Date(dtEnd).toLocaleString()}`;
}