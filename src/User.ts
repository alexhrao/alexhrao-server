export interface SlackToken {
    teamName: string;
    teamID: string;
    token: string;
    userID: string;
}

export interface MicrosoftToken {
    accountName: string;
    token: string;
}

export interface SessionToken {
    token: string;
    ttl: number;
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
    password: string;
}

export interface TranscriptPayload {
    userID: string;
    token: string;
    meetingName: string;
    passcode?: string;
    events: TranscriptEvent[];
    meetingInfo: MeetingInfo;
}