import { z } from "zod";
import { PAGE_ID } from "../auth.js";
import { apiRequest, apiRequestAllPages, getIgUserId, toolResult, toolError, } from "../client.js";
// Meta's standard messaging window, quoted from the Messenger Platform policy:
// "Businesses have up to 24 hours to respond to a user." Outside it, a free-form
// reply is rejected — a message tag (HUMAN_AGENT gives 7 days) or the paid channel
// is the only way through. Worth stating plainly in the tool surface, because a
// stale inbox reads like a work queue right up until every send fails.
const MESSAGING_WINDOW = "Meta allows a free-form reply only within 24 hours of that person's last " +
    "message. Outside that window the call fails unless you pass a `tag` — " +
    "HUMAN_AGENT extends it to 7 days for a human answering the person's own question.";
const IG_DIRECT_GATE = "Instagram Direct additionally requires Advanced Access to " +
    "instagram_manage_messages (App Review). Without it Meta answers with a ~27s " +
    "timeout, subcode 2534084. Instagram comments are NOT affected.";
const platformParam = z
    .enum(["messenger", "instagram"])
    .default("messenger")
    .describe(`Inbox to read. "messenger" is Facebook Page messages. "instagram" is Instagram Direct. ${IG_DIRECT_GATE}`);
const DEFAULT_CONVERSATION_FIELDS = "id,updated_time,message_count,unread_count,snippet,participants";
const DEFAULT_MESSAGE_FIELDS = "id,created_time,from,to,message,attachments";
export function registerInboxTools(server) {
    server.registerTool("check_access", {
        title: "Check Access",
        description: "Diagnose the configured token: its type, whether it never expires, which " +
            "messaging scopes it carries, and which of the four capabilities (Messenger " +
            "inbox, Instagram Direct, Facebook comments, Instagram comments) actually " +
            "answer right now. Run this first when any other tool fails — it separates a " +
            "wrong token type from a missing Advanced Access grant.",
        inputSchema: {},
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async () => {
        try {
            const debug = await apiRequest("/debug_token", "GET", undefined, {
                input_token: process.env.META_PAGE_ACCESS_TOKEN,
            });
            const d = debug.data ?? {};
            const probe = async (label, endpoint, params) => {
                try {
                    await apiRequest(endpoint, "GET", undefined, params);
                    return { capability: label, ok: true };
                }
                catch (error) {
                    return { capability: label, ok: false, error: error.message };
                }
            };
            // Instagram Direct is reported statically: probing it costs a ~27s
            // server-side timeout when Advanced Access is missing, which is the very
            // case this tool exists to diagnose.
            const capabilities = [
                await probe("messenger_inbox", `/${PAGE_ID}/conversations`, {
                    platform: "messenger",
                    limit: "1",
                }),
                await probe("facebook_comments", `/${PAGE_ID}/posts`, {
                    fields: "id,comments.limit(1){id}",
                    limit: "1",
                }),
            ];
            try {
                const igUserId = await getIgUserId();
                capabilities.push(await probe("instagram_comments", `/${igUserId}/media`, {
                    fields: "id,comments.limit(1){id}",
                    limit: "1",
                }));
            }
            catch (error) {
                capabilities.push({
                    capability: "instagram_comments",
                    ok: false,
                    error: error.message,
                });
            }
            capabilities.push({
                capability: "instagram_direct",
                ok: false,
                not_probed: "Probing costs a ~27s timeout when Advanced Access is missing.",
                error: IG_DIRECT_GATE,
            });
            return toolResult({
                token: {
                    type: d.type,
                    app_id: d.app_id,
                    page_id: d.profile_id,
                    issued_to_user_id: d.user_id,
                    never_expires: d.expires_at === 0,
                    is_valid: d.is_valid,
                    messaging_scopes: (d.scopes ?? []).filter((s) => s.includes("messag")),
                },
                capabilities,
                notes: [
                    d.type === "PAGE"
                        ? "Token is a Page token — correct type."
                        : `Token type is ${d.type}. The inbox needs a PAGE token issued to a person who administers the Page.`,
                    IG_DIRECT_GATE,
                ],
            });
        }
        catch (error) {
            return toolError(`Failed to check access: ${error.message}`);
        }
    });
    server.registerTool("list_conversations", {
        title: "List Conversations",
        description: "List inbox threads for the Page, newest activity first. Returns thread ID, " +
            "participants, message count, unread count and a snippet of the last message. " +
            "Use the returned thread ID with get_conversation or list_messages. " +
            IG_DIRECT_GATE,
        inputSchema: {
            platform: platformParam,
            fields: z
                .string()
                .optional()
                .describe(`Comma-separated fields. Default: ${DEFAULT_CONVERSATION_FIELDS}`),
            limit: z.string().optional().describe("Items per page (default: 25)"),
            max_pages: z
                .string()
                .optional()
                .describe("How many pages to auto-follow (default: 1). Raise to sweep older threads."),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequestAllPages(`/${PAGE_ID}/conversations`, {
                platform: args.platform,
                fields: args.fields || DEFAULT_CONVERSATION_FIELDS,
                limit: args.limit || "25",
            }, Number(args.max_pages ?? "1"));
            return toolResult({ platform: args.platform, data, total: data.length });
        }
        catch (error) {
            return toolError(`Failed to list conversations: ${error.message}`);
        }
    });
    server.registerTool("get_conversation", {
        title: "Get Conversation",
        description: "Read one thread in full: participants plus the most recent messages with " +
            "sender, body text, attachments and timestamps. This is the tool to call " +
            "before replying to someone, so the reply has context.",
        inputSchema: {
            conversation_id: z
                .string()
                .describe('Thread ID from list_conversations (looks like "t_1234567890").'),
            message_limit: z
                .string()
                .optional()
                .describe("How many recent messages to include (default: 20)."),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const limit = args.message_limit || "20";
            const data = await apiRequest(`/${args.conversation_id}`, "GET", undefined, {
                fields: `id,updated_time,message_count,unread_count,participants,messages.limit(${limit}){${DEFAULT_MESSAGE_FIELDS}}`,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to get conversation: ${error.message}`);
        }
    });
    server.registerTool("list_messages", {
        title: "List Messages",
        description: "List messages inside a thread without the surrounding conversation metadata. " +
            "Use get_conversation instead when you also want the participant list.",
        inputSchema: {
            conversation_id: z.string().describe('Thread ID (looks like "t_1234567890").'),
            fields: z
                .string()
                .optional()
                .describe(`Comma-separated fields. Default: ${DEFAULT_MESSAGE_FIELDS}`),
            limit: z.string().optional().describe("Items per page (default: 25)"),
            max_pages: z.string().optional().describe("Pages to auto-follow (default: 1)"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequestAllPages(`/${args.conversation_id}/messages`, {
                fields: args.fields || DEFAULT_MESSAGE_FIELDS,
                limit: args.limit || "25",
            }, Number(args.max_pages ?? "1"));
            return toolResult({ data, total: data.length });
        }
        catch (error) {
            return toolError(`Failed to list messages: ${error.message}`);
        }
    });
    server.registerTool("get_message", {
        title: "Get Message",
        description: "Read a single message by ID, including attachments and shared media. Useful " +
            "when a thread listing shows an attachment you need the URL for.",
        inputSchema: {
            message_id: z.string().describe('Message ID (looks like "m_AbC123...").'),
            fields: z
                .string()
                .optional()
                .describe(`Comma-separated fields. Default: ${DEFAULT_MESSAGE_FIELDS},shares,sticker`),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequest(`/${args.message_id}`, "GET", undefined, {
                fields: args.fields || `${DEFAULT_MESSAGE_FIELDS},shares,sticker`,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to get message: ${error.message}`);
        }
    });
    server.registerTool("send_message", {
        title: "Send Message",
        description: "Send a direct message from the Page to a person, on Messenger or Instagram " +
            "Direct. This publishes to a real person's inbox — confirm the recipient and " +
            "the text with a human before calling it. " +
            MESSAGING_WINDOW +
            " " +
            IG_DIRECT_GATE,
        inputSchema: {
            recipient_id: z
                .string()
                .describe("The recipient's Page-scoped ID (PSID) on Messenger, or IGSID on Instagram. " +
                "Take it from the participant entry in get_conversation, or from the " +
                "comment author in list_comments."),
            text: z.string().describe("Message body to send."),
            image_url: z
                .string()
                .optional()
                .describe("Optional publicly reachable image URL to send instead of text."),
            tag: z
                .enum(["HUMAN_AGENT", "ACCOUNT_UPDATE", "CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE"])
                .optional()
                .describe("Message tag, to send OUTSIDE the 24-hour window. Omit for a normal reply " +
                "inside the window. Each tag has a narrow approved use and sending " +
                "off-purpose is a policy violation, so pick the one that actually " +
                "describes the message: HUMAN_AGENT — a human is answering the person's " +
                "own question, up to 7 days; ACCOUNT_UPDATE — a non-recurring change to " +
                "the person's account; CONFIRMED_EVENT_UPDATE — a reminder for something " +
                "the person signed up for; POST_PURCHASE_UPDATE — an update about a " +
                "purchase they made. HUMAN_AGENT additionally requires the Human Agent " +
                "feature approved for the app; without it Meta rejects the call."),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const message = args.image_url
                ? {
                    attachment: {
                        type: "image",
                        payload: { url: args.image_url, is_reusable: false },
                    },
                }
                : { text: args.text };
            // Without a tag this is RESPONSE, which Meta binds to the 24-hour window.
            // With a tag it becomes MESSAGE_TAG, the only supported way to answer later.
            const data = await apiRequest(`/${PAGE_ID}/messages`, "POST", {
                recipient: { id: args.recipient_id },
                ...(args.tag
                    ? { messaging_type: "MESSAGE_TAG", tag: args.tag }
                    : { messaging_type: "RESPONSE" }),
                message,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to send message: ${error.message}` +
                (args.tag
                    ? ` (sent with tag ${args.tag} — if Meta rejected it, the tag may not be approved for this app)`
                    : ` (sent without a tag, so it is bound to the 24-hour window; ${MESSAGING_WINDOW})`));
        }
    });
    server.registerTool("send_sender_action", {
        title: "Send Sender Action",
        description: "Mark a conversation as seen, or show/hide the typing indicator. Cosmetic and " +
            "safe: it posts no content. Useful before a slow reply so the person sees the " +
            "Page is responding.",
        inputSchema: {
            recipient_id: z.string().describe("Recipient PSID (Messenger) or IGSID (Instagram)."),
            action: z
                .enum(["mark_seen", "typing_on", "typing_off"])
                .describe("Which indicator to send."),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequest(`/${PAGE_ID}/messages`, "POST", {
                recipient: { id: args.recipient_id },
                sender_action: args.action,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to send sender action: ${error.message}`);
        }
    });
}
