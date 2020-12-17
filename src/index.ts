import express from 'express';
import staticServer from 'serve-static';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import querystring from 'querystring';
import bodyParser from 'body-parser';
import { SlackCredentials } from './SlackTypes';
import { join } from 'path';
import { AuthPayload, LoginPayload, TokenPayload, TranscriptPayload } from './User';
import { checkSession, authenticate, createNewUser, addTokens } from './authentication';
import { saveTranscript, fetchTranscript, generateTranscriptFile } from './transcript';

const app = express();

app.use('/resources', staticServer(join(__dirname, './resources/')));
app.use('/slack/events', bodyParser.json());
app.use('/transcripts', bodyParser.json());
app.use('/tokens', bodyParser.json());
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
            });
        })
        .then(resp => resp.json())
        .then(json => res.redirect(`http://localhost:60000?nonce=${state}&token=${json.access_token}&team_id=${json.team.id}`));
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

app.post('/tokens', async (req, res) => {
    if (req.body.auth === undefined || (req.body.slack === undefined && req.body.outlook === undefined)) {
        // get sad
        res.sendStatus(400);
        return;
    }
    const payload = req.body as TokenPayload;
    // check our session
    const tf = await checkSession(payload.auth);
    if (tf) {
        await addTokens(payload.auth.email, {
            outlook: payload.outlook,
            slack: payload.slack,
        });
        res.sendStatus(201);
    } else {
        res.sendStatus(403);
    }
})

app.post('/transcripts', async (req, res) => {
    //
    const body = req.body;
    if (body.auth === undefined || body.meetingName === undefined || body.events === undefined || body.meetingInfo === undefined) {
        res.sendStatus(400);
        return;
    }
    const payload = body as TranscriptPayload;
    if (!(await checkSession(payload.auth))) {
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

app.get('/transcripts', async (req, res) => {
    // no auth... so send the HTML. It'll be responsible for requesting
    if (req.headers['authorization'] === undefined || req.headers['x-user-email'] === undefined) {
        res.sendFile('./resources/html/transcript.html');
        return;
    }
    const bearer = /(?<=Bearer ).+/;
    if (!bearer.test(req.headers['authorization'])) {
        res.sendStatus(401);
        return;
    }
    const token = bearer.exec(req.headers['authorization'])?.[0];
    if (token === undefined) {
        res.sendStatus(400);
        return;
    }
    const transcriptName = req.query['meeting'];
    if (transcriptName === undefined) {
        res.sendStatus(400);
        return;
    }
    const auth: AuthPayload = {
        email: req.headers['x-user-email'] as string,
        token,
        mac: req.headers['x-mac-address'] as string|undefined,
    }
    const tf = await checkSession(auth);
    if (tf) {
        // we know we're good... now look for that meeting
        // if download, just sent the file...
        try {
            const file = await generateTranscriptFile(req.headers['x-user-email'] as string, transcriptName as string);
            res.status(200)
                .contentType('text/plain')
                .send(file);
        } catch {
            res.sendStatus(404);
        }
        return;
    } else {
        res.sendStatus(403);
        return;
    }
})

app.get('/login', (req, res) => {
    res.sendFile(join(__dirname, 'resources/html/login.html'));
});

app.get('/account_overview', (req, res) => {
    res.sendFile(join(__dirname, 'resources/html/account_overview.html'));
})

app.post('/login', async (req, res) => {
    // give back a token...
    if (req.body.password === undefined || req.body.email === undefined) {
        // get screwed
        res.sendStatus(400);
        return;
    }
    const payload = req.body as LoginPayload;
    try {
        const token = await authenticate(payload.email, payload.password, payload.mac);
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