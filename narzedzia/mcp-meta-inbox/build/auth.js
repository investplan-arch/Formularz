const GRAPH_API_VERSION = "v25.0";
export const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
function fail(message) {
    console.error(message);
    process.exit(1);
}
function getRequiredEnv(name, hint) {
    const value = process.env[name];
    if (!value) {
        fail(`Error: Missing required environment variable: ${name}\n  ${hint}`);
    }
    return value;
}
/**
 * The inbox and comment APIs need a Page access token that was requested by a
 * *person* who administers the Page. A System User token — the kind used by the
 * Marketing API — is silently rejected by the Conversations API with a generic
 * `code 2 / is_transient: true` error that looks like a server fault. Catch the
 * common mistake of reusing META_ACCESS_TOKEN here and say so explicitly.
 */
function resolveToken() {
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (pageToken)
        return pageToken;
    if (process.env.META_ACCESS_TOKEN) {
        fail("Error: Found META_ACCESS_TOKEN but not META_PAGE_ACCESS_TOKEN.\n" +
            "  META_ACCESS_TOKEN is the Marketing API token and is normally a System User token.\n" +
            "  The Messenger/Instagram inbox rejects System User tokens with an opaque\n" +
            '  "code 2 / is_transient" error, so this server refuses to start with it.\n' +
            "  Generate a Page token as a Page admin:\n" +
            "    developers.facebook.com -> your app -> Use cases -> Messenger\n" +
            "    -> Messenger API settings -> 2. Generate access tokens -> Generate\n" +
            "  That token never expires. Set it as META_PAGE_ACCESS_TOKEN.\n" +
            "  If you are certain your META_ACCESS_TOKEN is a Page token, copy it into\n" +
            "  META_PAGE_ACCESS_TOKEN as well.");
    }
    fail("Error: Missing required environment variable: META_PAGE_ACCESS_TOKEN\n" +
        "  Generate it at developers.facebook.com -> your app -> Use cases -> Messenger\n" +
        "  -> Messenger API settings -> 2. Generate access tokens -> Generate");
}
export const ACCESS_TOKEN = resolveToken();
export const PAGE_ID = getRequiredEnv("META_PAGE_ID", "Numeric ID of the Facebook Page. Find it in Meta Business Suite -> Page -> About.");
/**
 * Optional: only the Instagram tools need it, and they can discover it from the
 * Page when it is absent. Kept lazy so a Facebook-only setup never pays for it.
 */
export const IG_USER_ID_ENV = process.env.META_IG_USER_ID;
