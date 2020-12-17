export interface SlackToken {
    name: string;
    id: string;
    token: string;
}

export interface MicrosoftToken {
    accountName: string;
    token: string;
}

export interface SessionToken {
    token: string;
    ttl: number;
    mac?: string;
    createdAt: number;
}

export type Token = SlackToken | MicrosoftToken;

export enum EventType {
    Chat = "chat",
    Join = "join",
    Leave = "left",
    HandRaise = "handraise",
    HandLower = "handlower",
}

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
}

export interface User {
    userID: string;
    passHash: string;
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
export interface TranscriptPayload {
    auth: AuthPayload;
    meetingName: string;
    events: TranscriptEvent[];
    meetingInfo: MeetingInfo;
}

export interface TokenPayload {
    auth: AuthPayload;
    slack?: SlackToken[];
    outlook?: MicrosoftToken[];
}