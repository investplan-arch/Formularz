import { ACCESS_TOKEN, BASE_URL, IG_USER_ID_ENV, PAGE_ID } from "./auth.js";
const MAX_PAGES = 10;
export class MetaApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "MetaApiError";
    }
}
/**
 * Meta reports three distinct failures on the inbox endpoints with wildly
 * different fixes, and two of them arrive as opaque generic errors. Translate
 * them once, here, so every tool surfaces the actual remedy.
 */
function explain(code, subcode, userMsg) {
    if (code === 2) {
        return (" This is how the Conversations API rejects a System User token. " +
            "Generate a Page token as a Page admin (developers.facebook.com -> app -> " +
            "Use cases -> Messenger -> Messenger API settings -> Generate) and set it as " +
            "META_PAGE_ACCESS_TOKEN.");
    }
    if (subcode === 2534084 || subcode === 2534048) {
        return (" Instagram Direct requires Advanced Access to instagram_manage_messages, " +
            "granted only through App Review. Instagram *comments* are unaffected and " +
            "work today. " + (userMsg ? `Meta says: ${userMsg}` : ""));
    }
    return undefined;
}
export async function apiRequest(endpoint, method = "GET", body, queryParams) {
    const params = new URLSearchParams();
    params.set("access_token", ACCESS_TOKEN);
    if (method === "GET" && queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined && value !== "") {
                params.set(key, value);
            }
        }
    }
    const url = `${BASE_URL}${endpoint}?${params.toString()}`;
    const fetchBody = method !== "GET" && body
        ? JSON.stringify(body)
        : undefined;
    const response = await fetch(url, {
        method,
        headers: fetchBody ? { "Content-Type": "application/json" } : undefined,
        body: fetchBody,
    });
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({})));
        const msg = payload.error?.message || response.statusText;
        const code = payload.error?.code;
        const subcode = payload.error?.error_subcode;
        if (response.status === 429 || code === 32) {
            throw new MetaApiError(429, "Rate limit exceeded. Try again in a moment.");
        }
        if (code === 190) {
            throw new MetaApiError(401, `Authentication failed: ${msg}. The token is invalid, expired, or is not a ` +
                "Page token. Regenerate META_PAGE_ACCESS_TOKEN as a Page admin.");
        }
        const hint = explain(code, subcode, payload.error?.error_user_msg) ?? "";
        throw new MetaApiError(response.status, `Meta API error (${response.status}): ${msg}.${hint}`);
    }
    return (await response.json());
}
export async function apiRequestAllPages(endpoint, queryParams, maxPages = MAX_PAGES) {
    const all = [];
    let after;
    for (let page = 0; page < maxPages; page++) {
        const params = {
            ...queryParams,
            after,
        };
        const result = await apiRequest(endpoint, "GET", undefined, params);
        if (result.data) {
            all.push(...result.data);
        }
        if (!result.paging?.next)
            break;
        after = result.paging.cursors?.after;
        if (!after)
            break;
    }
    return all;
}
export function detectPlatform(id, explicit) {
    if (explicit)
        return explicit;
    return id.includes("_") ? "facebook" : "instagram";
}
let cachedIgUserId = IG_USER_ID_ENV;
export async function getIgUserId() {
    if (cachedIgUserId)
        return cachedIgUserId;
    const page = await apiRequest(`/${PAGE_ID}`, "GET", undefined, { fields: "instagram_business_account" });
    const id = page.instagram_business_account?.id;
    if (!id) {
        throw new MetaApiError(404, "No Instagram Business account is linked to this Page. Link one in Meta " +
            "Business Suite, or set META_IG_USER_ID explicitly.");
    }
    cachedIgUserId = id;
    return id;
}
export function toolResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
export function toolError(message) {
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
