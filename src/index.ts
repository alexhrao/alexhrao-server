import express from 'express';
import staticServer from 'serve-static';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import querystring from 'querystring';
import bodyParser from 'body-parser';
import { SlackCredentials } from './SlackTypes';
import { join } from 'path';
import { LoginPayload, TranscriptPayload } from './User';
import { checkSession, authenticate, createNewUser } from './authentication';
import { ddb, userTableName } from './dynamo';

interface TranscriptPayload1 {
    meetingName: string;
    transcript: string;
    passcode?: string;
};

interface TranscriptResponse {
    meetingName: string;
    transcript: string;
    unlocked: boolean;
};

const app = express();
const saltRounds = 10;

async function saveTranscript(payload: TranscriptPayload): Promise<void> {
    return new Promise((res, rej) => {
        ddb.updateItem({
            TableName: userTableName,
            Key: {
                'userID': {
                    S: payload.userID,
                },
            },
            AttributeUpdates: {
                'transcripts': {
                    Action: 'ADD',
                    Value: {
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
                                                S: te.body,
                                            },
                                        }
                                    };
                                }),
                            },
                        },
                    }
                }
            }
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
/*
async function fetchTranscript(meeting: string, passcode?: string): Promise<TranscriptResponse> {
    return new Promise((res, rej) => {
        ddb.getItem({
            TableName: ddbTableName,
            Key: {
                'meetingId': {
                    S: meeting,
                }
            }
        }, (err, data) => {
            if (err || data.Item === undefined) {
                rej('None found');
                return;
            }
            const { Item: item } = data;
            if (item['passcode'] !== undefined && passcode !== undefined) {
                compare(passcode, item['passcode'].S as string).then(tf => {
                    if (tf) {
                        res({
                            meetingName: item['meetingId'].S!,
                            unlocked: false,
                            transcript: item['transcript'].S!,
                        });
                    } else {
                        rej('Invalid Passcode');
                    }
                });
            } else {
                res({
                    meetingName: item['meetingId'].S!,
                    unlocked: true,
                    transcript: item['transcript'].S!,
                });
            }
        });
    });
}
*/
app.use('/resources', staticServer(join(__dirname, './resources/')));
app.use('/slack/events', bodyParser.json());
app.use('/transcripts', bodyParser.json());
app.use('/login', bodyParser.json());
app.use('/create', bodyParser.json());

const slackCredentials: Promise<SlackCredentials> = fs.readFile(join(__dirname, 'slack_credentials.json'))
    .then(b => b.toString())
    .then(s => JSON.parse(s));

app.get('/', (_, res) => {
    // send basic
    fs.readFile(join(__dirname, 'resources/html/index.html'))
        .then(b => b.toString())
        .then(html => {
            res
            .status(200)
            .contentType('html')
            .send(html)
            .end();
        });
});

app.get('/resume.html', (_, res) => {
    fs.readFile(join(__dirname, 'resources/html/resume.html'))
        .then(b => b.toString())
        .then(html => {
            res
            .status(200)
            .contentType('html')
            .send(html)
            .end();
        });
});

app.get('/.well-known/microsoft-identity-association.json', (_, res) => {
    fs.readFile(join(__dirname, 'azure_credentials.json'))
        .then(b => b.toString())
        .then(json => {
            // Stupid M$ Can't even accept an errant charset in their
            // stupid domain stupid verification
            // You really need a content length? get lost kid (only bytes and we know IN THIS CASE byte=char)
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': `${json.length}`,
            });
            res.write(json);
            res.end();
        });
});

app.get('/slack/oauth', (req, res) => {
    const code = req.query['code'] as string;
    const state = req.query['state'] as string;
    if (code === undefined || state === undefined) {
        fs.readFile(join(__dirname, 'resources/html/slack_oauth.html'))
        .then(b => b.toString())
        .then(html => {
            res.status(200)
                .contentType('html')
                .send(html);
        });
        return;
    }
    // Redirect!
    slackCredentials.then(async slack => {
            const payload = querystring.stringify({
                code,
                client_id: slack['client_id'],
                client_secret: slack['client_secret'],
            });
            return fetch('https://slack.com/api/oauth.v2.access', {
                method: 'POST',
                body: payload,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': `${payload.length}`,
                }
            })
        })
        .then(resp => resp.json())
        .then(json => {
            console.log(json);
            /*
            pool[json.team_id] = {
                token: json.access_token,
                webClient: new WebClient(json.access_token),
                conn: [],
            };
            */
            res.redirect(`http://localhost:60000?nonce=${state}&token=${json.access_token}&team_id=${json.team.id}`);
            /*
            res.status(200)
                .send(`<!DOCTYPE html><head></head><body><a href="http://localhost:60000?nonce=${state}&token=${json.access_token}&team_id=${json.team.id}">Click Here</a></body>`);
            */
            
        });
});

app.post('/slack/events', (req, res) => {
    const { body: payload } = req;
    if (payload['challenge'] !== undefined) {
        res.status(200)
            .contentType('text/plain')
            .send(payload['challenge']);
        return;
    }
});
/*
app.get('/transcripts', (req, res) => {
    const meeting = req.query['meeting'] as string;
    fetchTranscript(meeting)
        .then(t => {
            res.status(200)
                .contentType('json')
                .json(t)
                .end();
        })
        .catch(() => {
            res.sendStatus(400).end();
        });
    return;
});
*/
app.post('/transcripts2', async (req, res) => {
    //
    const body = req.body;
    if (body.token === undefined || body.meetingName === undefined || body.events === undefined || body.meetingInfo === undefined) {
        res.sendStatus(400);
        return;
    }
    const payload = body as TranscriptPayload;
    if (!(await checkSession(payload.userID, payload.token))) {
        res.sendStatus(403);
        return;
    }
    try {
        await saveTranscript(payload);
    } catch {
        res.sendStatus(500);
        return;
    }
    res.sendStatus(201);
});

/*
app.post('/transcripts', (req, res) => {
    const { body: payload } = req;

    if (payload['meetingName'] === undefined) {
        res.sendStatus(400).end();
        return;
    }
    // if no transcript, then we're retrieving a meeting...
    if (payload['transcript'] === undefined) {
        fetchTranscript(payload['meetingName'], payload['passcode'])
            .then(t => {
                res.status(200)
                    .contentType('json')
                    .json(t)
                    .end();
            })
            .catch(() => {
                res.sendStatus(401).end();
            });
        return;
    }
    const transcript = payload as TranscriptPayload1;
    if (!/^[a-zA-Z0-9]*$/.test(transcript.meetingName)) {
        res.status(400).send(`Invalid meeting name: ${transcript.meetingName}`);
        return;
    }
    const item: DynamoDB.PutItemInputAttributeMap = {
        'meetingId': {
            S: transcript.meetingName,
        },
        'transcript': {
            S: transcript.transcript,
        },
    };
    let itemPromise: Promise<DynamoDB.PutItemInputAttributeMap>;
    if (transcript.passcode !== undefined) {
        itemPromise = hash(item['passcode'], saltRounds)
            .then(pass => {
                item['passcode'] = {
                    S: pass,
                };
                return item;
            });
    } else {
        itemPromise = Promise.resolve(item);
    }
    itemPromise.then(item => {
        ddb.putItem({
            TableName: ddbTableName,
            Item: item,
        }, (err, _) => {
            if (err) {
                res.status(500).send(err).end();
            } else {
                // respond with link? only if locked
                if (transcript.passcode === undefined) {
                    res.status(201).json({ 'link': `https://alexhrao.com/transcripts?meeting=${transcript.meetingName}`});
                } else {
                    res.sendStatus(201).end();
                }
            }
        });
    });
});
*/
app.get('/login', (req, res) => {
    res.sendFile(join(__dirname, 'resources/html/login.html'));
});

app.post('/login', async (req, res) => {
    console.log(req.body);
    // give back a token...
    if (req.body.password === undefined || req.body.email === undefined) {
        // get screwed
        res.sendStatus(400);
        return;
    }
    const payload = req.body as LoginPayload;
    try {
        const token = await authenticate(payload.email, payload.password);
        // send back the token
        res.status(200)
            .json(token);
        return;
    } catch (e) {
        res.sendStatus(401);
        return;
    }
});

app.post('/create', async (req, res) => {
    if (req.body.password === undefined || req.body.email === undefined) {
        res.sendStatus(400);
        return;
    }
    const payload = req.body as LoginPayload;
    try {
        createNewUser(payload.email, payload.password);
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
});