import { TranscriptPayload, Transcript, EventType, User } from './User';
import { ddb, doc, userTableName } from './dynamo';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export async function saveTranscript(payload: TranscriptPayload): Promise<void> {
    return new Promise((res, rej) => {
        ddb.updateItem({
            TableName: userTableName,
            Key: {
                'userID': {
                    S: payload.auth.email,
                },
            },
            UpdateExpression: 'SET #ts = list_append(#ts, :vals)',
            ExpressionAttributeNames: {
                '#ts': 'transcripts',
            },
            ExpressionAttributeValues: {
                ':vals': {
                    L: [
                        {
                            M: {
                                'meetingName': {
                                    S: payload.meetingName,
                                },
                                'events': {
                                    L: payload.events.map(te => {
                                        return {
                                            M: {
                                                'type': {
                                                    S: te.type,
                                                },
                                                'participantName': {
                                                    S: te.participantName,
                                                },
                                                'timestamp': {
                                                    N: `${te.timestamp}`,
                                                },
                                                'body': {
                                                    S: te.body ?? '',
                                                },
                                            }
                                        };
                                    }),
                                },
                                'meetingInfo': {
                                    M: {
                                        'id': {
                                            S: payload.meetingInfo.meetingID,
                                        },
                                        'startTime': {
                                            N: `${payload.meetingInfo.startTime}`,
                                        },
                                        'endTime': {
                                            N: `${payload.meetingInfo.endTime}`,
                                        },
                                        'timeZone': {
                                            S: payload.meetingInfo.timeZone,
                                        },
                                        'trueName': {
                                            S: payload.meetingInfo.name
                                        },
                                    }
                                }
                            }
                        }
                    ]
                }
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
}

export async function fetchTranscript(email: string, meetingName: string): Promise<Transcript> {
    return new Promise<Transcript>((res, rej) => {
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
            console.log(data.Item);
            const transcripts = data.Item.transcripts as Transcript[];
            const t = transcripts.find(t => t.meetingName === meetingName);
            if (t === undefined) {
                rej('No Meeting Found');
            } else {
                res(t);
            }
        });
    });
}

export async function generateTranscriptFile(email: string, meetingName: string): Promise<string>;
export async function generateTranscriptFile(transcript: Transcript): Promise<string>;
export async function generateTranscriptFile(emailOrTranscript: string|Transcript, meetingName?: string): Promise<string> {
    let transcript: Transcript;
    if (typeof emailOrTranscript === 'string') {
        if (meetingName === undefined) {
            throw new Error('Invalid call');
        }
        console.log('AWAIT TRANSCRIPT');
        transcript = await fetchTranscript(emailOrTranscript, meetingName);
        console.log('FINISH TRANSCRIPT');
    } else {
        transcript = emailOrTranscript;
    }
    return `Connected At ${new Date(transcript.meetingInfo.startTime).toLocaleString()}` + transcript.events
        .map(e => {
            switch (e.type) {
                case EventType.Chat:
                    return `${e.participantName} (${new Date(e.timestamp).toLocaleString()}):\n${e.body}\n\n`;
                case EventType.HandLower:
                    return `${e.participantName} (${new Date(e.timestamp).toLocaleString()}): lowered their hand\n`;
                case EventType.HandRaise:
                    return `${e.participantName} (${new Date(e.timestamp).toLocaleString()}): raised their hand\n`;
                case EventType.Join:
                    return `${e.participantName} (${new Date(e.timestamp).toLocaleString()}): joined the meeting\n`;
                case EventType.Leave:
                    return `${e.participantName} (${new Date(e.timestamp).toLocaleString()}): left the meeting\n`;
            }
    }).join('') + `\nDisconnected at ${new Date(transcript.meetingInfo.endTime).toLocaleString()}`;
}