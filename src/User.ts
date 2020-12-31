import { SlackToken } from './SlackTypes';
import { MicrosoftToken } from './AzureTypes';
import { Transcript } from './transcript';
export interface SessionToken {
    token: string;
    ttl: number;
    mac?: string;
    createdAt: number;
}

export type Token = SlackToken | MicrosoftToken;

export interface ResetToken {
    token: string;
    email: string;
    expirationDate: number;
}

export interface ResetPayload {
    auth: AuthPayload;
    password: string;
}

export interface ResetTokenPayload {
    token: string;
    email: string;
    password: string;
}

export interface User {
    userID: string;
    passHash: string;
    joinDate: number;
    tokens: {
        slack: SlackToken[];
        outlook: MicrosoftToken[];
    };
    applicationTokens: SessionToken[];
    transcripts: Transcript[];
}

export interface LoginPayload {
    email: string;
    mac?: string;
    password: string;
}

export interface AuthPayload {
    token: string;
    email: string;
    mac?: string;
}
export interface TokenPayload {
    auth: AuthPayload;
    slack?: SlackToken[];
    outlook?: MicrosoftToken[];
}

export interface LockPayload {
    auth: AuthPayload;
    token: string;
}

export interface UnlockPayload {
    auth: AuthPayload;
    meetingName: string;
}