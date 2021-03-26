import express, { json } from 'express';
import multer from 'multer';
import staticServer from 'serve-static';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import querystring from 'querystring';
import { join } from 'path';
import {
    AuthPayload,
    LoginPayload,
    TokenPayload,
    LockPayload,
    UnlockPayload,
    ResetPayload,
    ResetTokenPayload
} from './User';

import {
    checkSession,
    authenticate,
    createNewUser,
    addTokens,
    getUser,
    removeToken,
    resetPassword,
    fetchReset,
    getAccount,
    generateReset
} from './authentication';

import {
    saveTranscript,
    fetchTranscript,
    generateTranscriptFile,
    fetchUnlocked,
    unlockTranscript,
    lockTranscript,
    deleteTranscript,
    TranscriptPayload
} from './transcript';

import { getBooks, addSnap } from './books';

import { createTransport} from 'nodemailer';

const transport = getAccount('aws')
    .then(aws => {
        return createTransport({
            host: aws.server,
            port: aws.port,
            secure: aws.port === 465,
            auth: {
                user: aws.username,
                pass: aws.password,
            },
        });
    });

const app = express();

app.use('/resources', staticServer(join(__dirname, './resources/')));
app.use('/slack/events', json());
app.use('/transcripts', json());
app.use('/tokens', json());
app.use('/login', json());
app.use('/create', json());
app.use('/reset', json());
const memStorage = multer.memoryStorage();
const fileManager = multer({
    storage: memStorage,
});

const slackCredentials = getAccount('slack');

app.get('/', (_, res) => {
    // send basic
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/index.html'));
});

app.get('/readflix', async (req, res) => {
    if (req.query['paid'] !== undefined) {
        const sender = await transport;

        const html = `<!DOCTYPE html><html><head></head><body><h1>READFLIX ${req.query['paid'] === 'true' ? 'PAID' : 'FREE'}</h1></body></html>`;
        const text = `Got a READFLIX Hit! ${req.query['paid'] === 'true' ? 'PAID' : 'FREE'}`;
        res.sendStatus(200);
        await sender.sendMail({
            from: 'Password Manager <alexhrao@alexhrao.com>',
            to: ['alexhrao@gmail.com', 'salonioswal98@gmail.com'],
            subject: 'READFLIX HIT',
            html, text
        });
    } else {
        res.status(200)
            .contentType('html')
            .sendFile(join(__dirname, 'resources/html/readflix.html'));
    }
})

app.get(['/resume.html', '/resume'], (_, res) => {
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/resume.html'));
});

app.get('/autograder', (_, res) => {
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/autograder.html'));
});

app.get('/favicon.ico', (_, res) => {
    res.status(200)
        .contentType('image/x-icon')
        .sendFile(join(__dirname, 'resources/img/favicon.ico'));
});

app.get('/blog', (_, res) => {
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/blog.html'));
});

app.get('/blog/:post', async (req, res) => {
    const post = req.params.post;
    try {
        await fs.access(join(__dirname, `resources/html/posts/${post}.html`));
    } catch {
        res.sendStatus(404);
        return;
    }
    res.status(200)
        .sendFile(join(__dirname, `resources/html/posts/${post}.html`));
});

app.get('/crossword', (_, res) => {
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/crossword.html'));
})

app.get('/crossword/:game', async (req, res) => {
    try {
        await fs.access(join(__dirname, `resources/json/${req.params.game}.json`));
    } catch {
        res.sendStatus(404);
        return;
    }
    res.status(200)
        .contentType('json')
        .sendFile(join(__dirname, `resources/json/${req.params.game}.json`))
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
        res.sendStatus(400);
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
            outlook: payload.outlook ?? [],
            slack: payload.slack ?? [],
        });
        res.sendStatus(201);
    } else {
        res.sendStatus(403);
    }
});

app.delete('/tokens', async (req, res) => {
    if (req.headers['authorization'] === undefined || req.headers['x-user-email'] === undefined || req.query['acct_type'] === undefined || req.query['acct_name'] === undefined) {
        res.sendStatus(400);
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
    const auth: AuthPayload = {
        email: req.headers['x-user-email'] as string,
        token,
        mac: req.headers['x-user-mac'] as string|undefined,
    };
    const tf = await checkSession(auth);

    if (!tf) {
        res.sendStatus(403);
        return;
    }
    if (req.query['acct_type'] === 'outlook') {
        await removeToken(req.headers['x-user-email'] as string, 'outlook', req.query['acct_name'] as string);
    } else if (req.query['acct_type'] === 'slack') {
        await removeToken(req.headers['x-user-email'] as string, 'slack', req.query['acct_name'] as string);
    } else {
        res.sendStatus(400);
        return;
    }
    res.sendStatus(204);
});

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
        if (payload.unlocked !== undefined && payload.unlocked) {
            const token = await saveTranscript({
                ...payload,
                unlocked: true,
            });
            res.status(201)
                .json({ token });
            return;
        } else {
            await saveTranscript({
                ...payload,
            });
            res.sendStatus(201);
            return;
        }
    } catch (e) {
        res.sendStatus(500);
        return;
    }
});

app.get('/transcripts', async (req, res) => {
    if (req.query['token'] !== undefined) {
        try {
            const unlocked = await fetchUnlocked(req.query['token'] as string);
            const transcript = await fetchTranscript(unlocked);
            res.status(200)
                .contentType('text/plain')
                .send(generateTranscriptFile(transcript))
                .end();
        } catch {
            res.sendStatus(404);
        }
        return;
    }
    // no auth... so send the HTML. It'll be responsible for requesting
    if (req.headers['authorization'] === undefined || req.headers['x-user-email'] === undefined) {
        res.sendFile(join(__dirname, 'resources/html/transcript.html'));
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
    const auth: AuthPayload = {
        email: req.headers['x-user-email'] as string,
        token,
        mac: req.headers['x-user-mac'] as string|undefined,
    };
    const tf = await checkSession(auth);
    if (!tf) {
        res.sendStatus(403);
        return;
    }
    const transcriptName = req.query['meeting'];
    const download = req.query['download'];
    if (transcriptName === undefined) {
        // asking for JSON of all transcripts for this user...
        const trans = await fetchTranscript(req.headers['x-user-email'] as string);
        const outbound = trans.map(t => {
            return {
                name: t.meetingName,
                startTime: t.meetingInfo.startTime,
                endTime: t.meetingInfo.endTime,
                timeZone: t.meetingInfo.timeZone,
            };
        });
        res.status(200).json(outbound);
        return;
    }
    if (download !== undefined) {
        try {
            const file = await generateTranscriptFile(req.headers['x-user-email'] as string, transcriptName as string);
            res.status(200)
                .contentType('text/plain')
                .send(file);
        } catch {
            res.sendStatus(404);
        }
        return;
    }
    try {
        const trans = await fetchTranscript(req.headers['x-user-email'] as string, transcriptName as string);

        res.status(200)
            .json({
                name: trans.meetingName,
                events: trans.events,
                info: trans.meetingInfo,
                token: trans.token
            });
    } catch {
        res.sendStatus(404);
    }
});

app.put('/transcripts', async (req, res) => {
    if (req.body.auth === undefined) {
        res.sendStatus(400);
        return;
    }
    if (req.body.meetingName !== undefined) {
        const payload = req.body as UnlockPayload;
        const out = await unlockTranscript(payload.auth.email, payload.meetingName);
        res.status(200).send(out);
        return;
    } else if (req.body.token !== undefined) {
        const payload = req.body as LockPayload;
        await lockTranscript(payload.token);
    } else {
        res.sendStatus(400);
        return;
    }
    res.sendStatus(201);
});

app.delete('/transcripts', async (req, res) => {
    if (req.headers['authorization'] === undefined || req.headers['x-user-email'] === undefined) {
        res.sendStatus(400);
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
        res.sendStatus(404);
        return;
    }
    const auth: AuthPayload = {
        email: req.headers['x-user-email'] as string,
        token,
        mac: req.headers['x-user-mac'] as string|undefined,
    };

    const tf = await checkSession(auth);
    if (!tf) {
        res.sendStatus(403);
        return;
    }
    await deleteTranscript(req.headers['x-user-email'] as string, transcriptName as string);
    res.sendStatus(204);
})

app.get('/login', (_, res) => {
    res.sendFile(join(__dirname, 'resources/html/login.html'));
});

app.get('/reset', async (req, res) => {
    // if I'm given a token, check if it's valid
    if (req.query['token'] === undefined) {
        res.status(200)
            .contentType('html')
            .sendFile(join(__dirname, 'resources/html/reset.html'));
    } else if (req.query['email'] !== undefined) {
        // check the token...
        const email = await fetchReset(req.query['token'] as string);
        res
            .status(200)
            .cookie('email', email, {
                sameSite: "strict",
            })
            .sendFile(join(__dirname, 'resources/html/reset.html'));
    } else {
        res.sendStatus(400);
    }
});

app.post('/reset', async (req, res) => {
    if (req.body.email !== undefined && req.body.password === undefined) {
        // generate the reset:
        // 1. Generate token
        // 2. Send it to the email
        // 3. Reply, say everything is ok (unless it isn't)
        try {
            const sender = await transport;
            const html = await fs.readFile(join(__dirname, 'resources/html/reset_email.html')).then(b => b.toString());
            const text = await fs.readFile(join(__dirname, 'resources/html/reset_email.txt')).then(b => b.toString());
            const token = await generateReset(req.body.email);
            const link = `https://alexhrao.com/reset?token=${token.token}&email=${token.email}`;
    
            await sender.sendMail({
                from: 'Password Manager <alexhrao@alexhrao.com>',
                to: req.body.email as string,
                subject: 'Password Reset for alexhrao.com',
                html: html.replace(/{{RESET_TOKEN}}/g, link),
                text: text.replace(/{{RESET_TOKEN}}/g, link),
            });
    
            res.sendStatus(204);
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    } else if (req.body.password === undefined) {
        res.sendStatus(400);
    } else if (req.body.auth !== undefined) {
        const payload = req.body as ResetPayload;
        const tf = await checkSession(payload.auth);
        if (!tf) {
            res.sendStatus(403);
        } else {
            // we're good!
            await resetPassword(payload.auth.email, payload.password);
            res.sendStatus(204);
        }
    } else if (req.body.token !== undefined) {
        const payload = req.body as ResetTokenPayload;
        await resetPassword(payload);
        res.sendStatus(204);
    } else {
        res.sendStatus(400);
    }
});

app.get('/account', async (req, res) => {
    if (req.headers['authorization'] === undefined || req.headers['x-user-email'] === undefined) {
        res.sendFile(join(__dirname, 'resources/html/account.html'));
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
    const auth: AuthPayload = {
        email: req.headers['x-user-email'] as string,
        token,
        mac: req.headers['x-user-mac'] as string|undefined,
    };
    const tf = await checkSession(auth);
    if (tf) {
        // send an account synopsis
        const user = await getUser(req.headers['x-user-email'] as string);
        res.status(200)
            .json({
                email: user.userID,
                createdDate: user.joinDate,
                slack: user.tokens.slack.map(st => {
                    return {
                        name: st.name,
                        id: st.id,
                    };
                }),
                outlook: user.tokens.outlook.map(mt => {
                    return {
                        name: mt.accountName,
                    };
                }),
                transcripts: user.transcripts
                    .sort((t1, t2) => t1.meetingInfo.startTime - t2.meetingInfo.startTime)
                    .reverse()
                    .slice(0, 10)
                    .map(t => {
                        return {
                            meetingInfo: t.meetingInfo,
                            name: t.meetingName,
                        };
                    }),
            });
    } else {
        res.sendStatus(403);
        return;
    }
});

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
});

app.get('/readflix/books', async (req, res) => {
    if (req.query['book'] !== undefined) {
        // if we have a start & end time... check it
        // if we have a recommended_from... check it
        if (req.query['duration'] !== undefined) {
            // send an email with the duration
            const text = `TIME SPENT: ${req.query['duration']}ms to choose ${req.query['book']}`;
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h1>${text}</h1></body></html>`;
            const sender = await transport;
            res.sendStatus(200);
            await sender.sendMail({
                from: 'READFLIX <alexhrao@alexhrao.com>',
                to: ['alexhrao@gmail.com', 'salonioswal98@gmail.com'],
                subject: 'READFLIX: TIME SPENT',
                html, text
            });
        }
        if (req.query['from'] !== undefined) {
            const text = `Recommend: ${req.query['from']} -> ${req.query['book']}`;
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h1>${text}</h1></body></html>`;
            const sender = await transport;
            res.sendStatus(200);
            await sender.sendMail({
                from: 'READFLIX <alexhrao@alexhrao.com>',
                to: ['alexhrao@gmail.com', 'salonioswal98@gmail.com'],
                subject: 'READFLIX: REC',
                html, text
            });
        }
        res.sendStatus(200);
    } else {
        getBooks().then(books => {
            res.status(200).json(books);
        });
    }
});

app.get('/writeflix', (req, res) => {
    res.status(200)
        .contentType('html')
        .sendFile(join(__dirname, 'resources/html/writeflix.html'));
})

app.patch('/readflix/books', async (req, res) => {
    if (req.query['book'] === undefined) {
        res.sendStatus(400);
    } else {
        await addSnap(req.query['book'] as string);
        res.sendStatus(200);
    }
});

app.post('/readflix/books', fileManager.single('pdf'), async (req, res) => {
    const text = `New Submission from ${req.body['email'] as string}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h1>${text}</h1></body></html>`;
    const sender = await transport;
    await sender.sendMail({
        from: 'READFLIX <alexhrao@alexhrao.com>',
        to: ['alexhrao@gmail.com', 'salonioswal98@gmail.com'],
        subject: 'READFLIX: SUB',
        html, text,
        attachments: [
            {
                filename: 'user_submission.pdf',
                content: req.file.buffer,
            }
        ]
    });
    res.sendStatus(200);
});


app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
});