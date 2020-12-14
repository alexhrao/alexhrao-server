export interface SlackUserInfo {
    ok: true;
    user: {
        id: string;
        name: string;
        real_name: string;
    }
}

export interface SlackCredentials {
    app_id: string;
    client_id: string;
    client_secret: string;
    signing_secret: string;
    verification_token: string;
}

export enum SlackEventType {
    Message = "message",
}

export enum SlackMessageEventSubType {
    BotMessage = "bot_message",
    EKMAccessDenied = "ekm_access_denied",
    MeMessage = "me_message",
    MessageChanged = "message_changed",
    MessageDeleted = "message_deleted",
    MessageReplied = "message_replied",
    ReplyBroadcast = "reply_broadcast",
    ThreadBroadcast = "thread_broadcast",
}

export interface SlackReaction {
    name: string;
    count: number;
    users: string[];
}

export interface SlackMessageEvent {
    type: SlackEventType.Message;
    subtype?: SlackMessageEventSubType;
    hidden?: boolean;
    channel: string;
    user: string;
    text: string;
    ts: string;
    edited?: {
        user: string;
        ts: string;
    }
    is_pinned?: boolean;
    reactions?: SlackReaction[];
    pinned_to?: string[];
}

export type SlackEvent = SlackMessageEvent|SlackMessageEvent;

export interface SlackEventWrapper {
    token: string;
    team_id: string;
    api_app_id: string;
    type: 'event_callback';
    authed_users: string[];
    authorizations: {
        enterprise_id: string;
        team_id: string;
        user_id: string;
        is_bot: boolean;
    };
    event_id: string;
    event_context: string;
    event_time: number;
    event: SlackEvent;
}