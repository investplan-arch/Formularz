import { z } from "zod";
import { PAGE_ID } from "../auth.js";
import { apiRequest, apiRequestAllPages, detectPlatform, getIgUserId, toolResult, toolError, } from "../client.js";
const PLATFORM_HINT = 'Leave unset to auto-detect from the ID shape: Facebook IDs are compound ("{page}_{object}"), Instagram IDs are a flat run of digits.';
const platformParam = z
    .enum(["facebook", "instagram"])
    .optional()
    .describe(`Which platform the ID belongs to. ${PLATFORM_HINT}`);
const FB_COMMENT_FIELDS = "id,message,created_time,from,like_count,comment_count,is_hidden,can_hide,can_remove,can_comment,parent";
const IG_COMMENT_FIELDS = "id,text,timestamp,username,from,like_count,hidden,replies{id,text,timestamp,username}";
/**
 * Instagram exposes `replies` only on top-level comments: asking for it on a
 * reply fails the whole request with "#100 Field is only available for top-level
 * comments". Since a reply ID is indistinguishable from a top-level one, ask for
 * the rich shape first and fall back to the flat one.
 */
const IG_COMMENT_FIELDS_FLAT = "id,text,timestamp,username,from,like_count,hidden";
function isTopLevelOnlyFieldError(error) {
    return /only available for top-level comments/i.test(error.message);
}
function isMissingEdgeError(error, edge) {
    return new RegExp(`nonexisting field \\(${edge}\\)`, "i").test(error.message);
}
export function registerCommentTools(server) {
    server.registerTool("list_posts", {
        title: "List Posts",
        description: "List published posts on the Facebook Page, or media on the linked Instagram " +
            "account. Returns each post's ID, caption/message, timestamp and engagement " +
            "counts. Use the returned ID with list_comments to moderate its comment thread.",
        inputSchema: {
            platform: z
                .enum(["facebook", "instagram"])
                .default("facebook")
                .describe("Which surface to list."),
            fields: z
                .string()
                .optional()
                .describe("Comma-separated fields. Defaults differ per platform: Facebook uses " +
                "id,message,created_time,permalink_url,comments.summary(true); Instagram uses " +
                "id,caption,timestamp,permalink,media_type,comments_count,like_count."),
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
            const isIg = args.platform === "instagram";
            const endpoint = isIg ? `/${await getIgUserId()}/media` : `/${PAGE_ID}/posts`;
            const fields = args.fields ||
                (isIg
                    ? "id,caption,timestamp,permalink,media_type,comments_count,like_count"
                    : "id,message,created_time,permalink_url,comments.summary(true).limit(0)");
            const data = await apiRequestAllPages(endpoint, { fields, limit: args.limit || "25" }, Number(args.max_pages ?? "1"));
            return toolResult({ platform: args.platform, data, total: data.length });
        }
        catch (error) {
            return toolError(`Failed to list posts: ${error.message}`);
        }
    });
    server.registerTool("list_comments", {
        title: "List Comments",
        description: "List comments on a post (Facebook) or media (Instagram), including each " +
            "author's ID — which doubles as the DM recipient ID for send_message or " +
            "private_reply. Instagram results nest their replies; Facebook top-level " +
            "comments carry a comment_count you can drill into by passing the comment ID " +
            "back in as object_id. Passing a comment ID works on Instagram too — the tool " +
            "falls back to the /replies edge and reports which edge answered. Works on " +
            "both platforms with a plain Page token.",
        inputSchema: {
            object_id: z
                .string()
                .describe("Post ID, media ID, or a comment ID to read its replies."),
            platform: platformParam,
            fields: z.string().optional().describe("Comma-separated fields. Platform-specific default."),
            limit: z.string().optional().describe("Items per page (default: 25)"),
            max_pages: z.string().optional().describe("Pages to auto-follow (default: 1)"),
            order: z
                .enum(["chronological", "reverse_chronological"])
                .optional()
                .describe("Facebook only. Default is chronological."),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const platform = detectPlatform(args.object_id, args.platform);
            const params = {
                fields: args.fields || (platform === "instagram" ? IG_COMMENT_FIELDS : FB_COMMENT_FIELDS),
                limit: args.limit || "25",
            };
            if (platform === "facebook" && args.order)
                params.order = args.order;
            const maxPages = Number(args.max_pages ?? "1");
            let edge = "comments";
            let data;
            try {
                data = await apiRequestAllPages(`/${args.object_id}/comments`, params, maxPages);
            }
            catch (error) {
                // On Instagram a comment's children live on /replies, not /comments,
                // and a reply ID is shaped exactly like a media ID — so the only way
                // to tell them apart is to try.
                if (platform !== "instagram" || !isMissingEdgeError(error, "comments"))
                    throw error;
                edge = "replies";
                params.fields = args.fields || IG_COMMENT_FIELDS_FLAT;
                data = await apiRequestAllPages(`/${args.object_id}/replies`, params, maxPages);
            }
            return toolResult({ platform, edge, data, total: data.length });
        }
        catch (error) {
            return toolError(`Failed to list comments: ${error.message}`);
        }
    });
    server.registerTool("get_comment", {
        title: "Get Comment",
        description: "Read a single comment by ID, with its author, timestamp and moderation flags " +
            "(can_hide / can_remove on Facebook, hidden on Instagram). Call this before " +
            "hiding or deleting so the decision is made on the real text.",
        inputSchema: {
            comment_id: z.string().describe("Comment ID."),
            platform: platformParam,
            fields: z.string().optional().describe("Comma-separated fields. Platform-specific default."),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const platform = detectPlatform(args.comment_id, args.platform);
            const fields = args.fields || (platform === "instagram" ? IG_COMMENT_FIELDS : FB_COMMENT_FIELDS);
            let data;
            try {
                data = await apiRequest(`/${args.comment_id}`, "GET", undefined, { fields });
            }
            catch (error) {
                if (args.fields || !isTopLevelOnlyFieldError(error))
                    throw error;
                data = await apiRequest(`/${args.comment_id}`, "GET", undefined, {
                    fields: IG_COMMENT_FIELDS_FLAT,
                });
            }
            return toolResult({ platform, ...data });
        }
        catch (error) {
            return toolError(`Failed to get comment: ${error.message}`);
        }
    });
    server.registerTool("create_comment", {
        title: "Create Comment",
        description: "Post a new top-level comment on your own Facebook post. This publishes " +
            "publicly under the Page's name — confirm the text with a human first. " +
            "Instagram does not allow creating top-level comments via the API; use " +
            "reply_to_comment there.",
        inputSchema: {
            object_id: z.string().describe("Facebook post ID to comment on."),
            message: z.string().describe("Comment text."),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            if (detectPlatform(args.object_id) === "instagram") {
                return toolError("Instagram does not support creating top-level comments through the API. " +
                    "You can only reply to an existing comment — use reply_to_comment.");
            }
            const data = await apiRequest(`/${args.object_id}/comments`, "POST", {
                message: args.message,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to create comment: ${error.message}`);
        }
    });
    server.registerTool("reply_to_comment", {
        title: "Reply to Comment",
        description: "Reply publicly to a comment, as the Page. Facebook and Instagram use " +
            "different endpoints for this and the tool routes automatically. This " +
            "publishes publicly — confirm the text with a human first. To answer someone " +
            "privately instead, use private_reply.",
        inputSchema: {
            comment_id: z.string().describe("Comment ID to reply to."),
            message: z.string().describe("Reply text."),
            platform: platformParam,
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const platform = detectPlatform(args.comment_id, args.platform);
            // Facebook nests replies on the /comments edge of the parent comment;
            // Instagram exposes a dedicated /replies edge instead.
            const endpoint = platform === "instagram"
                ? `/${args.comment_id}/replies`
                : `/${args.comment_id}/comments`;
            const data = await apiRequest(endpoint, "POST", { message: args.message });
            return toolResult({ platform, ...data });
        }
        catch (error) {
            return toolError(`Failed to reply to comment: ${error.message}`);
        }
    });
    server.registerTool("update_comment", {
        title: "Update Comment",
        description: "Edit the text of a comment the Page authored. FACEBOOK ONLY — the Instagram " +
            "Graph API has no edit operation for comments, so an Instagram reply can only " +
            "be deleted and re-posted. This tool rejects Instagram IDs rather than failing " +
            "opaquely.",
        inputSchema: {
            comment_id: z.string().describe("Facebook comment ID authored by the Page."),
            message: z.string().describe("New comment text, replacing the old one."),
            platform: platformParam,
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            if (detectPlatform(args.comment_id, args.platform) === "instagram") {
                return toolError("Instagram comments cannot be edited — the Graph API exposes no edit " +
                    "operation for them. Delete the reply with delete_comment and post a new " +
                    "one with reply_to_comment instead.");
            }
            const data = await apiRequest(`/${args.comment_id}`, "POST", {
                message: args.message,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to update comment: ${error.message}`);
        }
    });
    server.registerTool("hide_comment", {
        title: "Hide Comment",
        description: "Hide or unhide someone else's comment. A hidden comment stays visible to its " +
            "author and their friends but disappears for everyone else — the reversible " +
            "alternative to delete_comment for spam or abuse.",
        inputSchema: {
            comment_id: z.string().describe("Comment ID to hide or unhide."),
            hide: z.boolean().default(true).describe("true hides the comment, false unhides it."),
            platform: platformParam,
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const platform = detectPlatform(args.comment_id, args.platform);
            const body = platform === "instagram" ? { hide: args.hide } : { is_hidden: args.hide };
            const data = await apiRequest(`/${args.comment_id}`, "POST", body);
            return toolResult({ platform, ...data });
        }
        catch (error) {
            return toolError(`Failed to hide comment: ${error.message}`);
        }
    });
    server.registerTool("delete_comment", {
        title: "Delete Comment",
        description: "Permanently delete a comment. IRREVERSIBLE — the comment cannot be restored. " +
            "Confirm with a human before calling. Prefer hide_comment when the intent is " +
            "moderation rather than removal.",
        inputSchema: {
            comment_id: z.string().describe("Comment ID to delete."),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequest(`/${args.comment_id}`, "DELETE");
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to delete comment: ${error.message}`);
        }
    });
    server.registerTool("private_reply", {
        title: "Private Reply to Comment",
        description: "Answer a public comment with a private direct message to its author. Meta " +
            "allows exactly one private reply per comment, and only within 7 days of the " +
            "comment. This is the supported way to move a public question into the inbox. " +
            "It messages a real person — confirm with a human first. Instagram private " +
            "replies need the same Advanced Access as Instagram Direct.",
        inputSchema: {
            comment_id: z.string().describe("Comment ID whose author should receive the DM."),
            message: z.string().describe("Private message text."),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const data = await apiRequest(`/${args.comment_id}/private_replies`, "POST", {
                message: args.message,
            });
            return toolResult(data);
        }
        catch (error) {
            return toolError(`Failed to send private reply: ${error.message}`);
        }
    });
}
