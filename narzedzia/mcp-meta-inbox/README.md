# mcp-meta-inbox

MCP server that wraps the Meta [Messenger Platform](https://developers.facebook.com/docs/messenger-platform/), [Instagram Messaging](https://developers.facebook.com/docs/messenger-platform/instagram/) and comment moderation APIs (Graph API v25.0) as semantic tools for LLM agents.

Read your Page inbox, reply to students, and moderate comments on Facebook posts and Instagram media — from natural language.

Works with **Claude Code**, **Codex**, **Claude Desktop**, **Cursor**, **VS Code**, **Windsurf**, and any MCP-compatible client.

Companion to [mcp-meta-marketing](https://github.com/pauloFroes/mcp-meta-marketing), which covers ads. **They do not share a token** — see [Why not the Marketing API token](#why-not-the-marketing-api-token).

---

## Quick Start

```bash
claude mcp add meta-inbox -s user \
  -e META_PAGE_ACCESS_TOKEN=your-page-token \
  -e META_PAGE_ID=your-page-id \
  -- npx -y github:pauloFroes/mcp-meta-inbox
```

Then just ask in natural language:

> Don't have a Page token yet? See [How to get your Page Access Token](#how-to-get-your-page-access-token) below.

## What you can do

**Work the inbox:**
```
"Who messaged the Page today and what did they ask?"
"Summarize the last 20 conversations and flag the ones still unanswered"
"Read thread t_1997631717587281 and draft a reply about the course schedule"
"Mark Sandro's conversation as seen"
```

**Moderate comments:**
```
"List the comments on my latest Instagram post"
"Which comments are questions nobody answered?"
"Reply to that comment asking about the price"
"Hide the spam comment on last week's Facebook post"
"Answer that public question privately instead"
```

## Availability at a glance

| Surface | Read | Write | Requirement |
| --- | --- | --- | --- |
| Messenger inbox | ✅ | ✅ | Page token |
| Facebook comments | ✅ | ✅ | Page token |
| Instagram comments | ✅ | ✅ | Page token |
| Instagram Direct | ⛔ | ⛔ | **Advanced Access** to `instagram_manage_messages` (App Review) |

Instagram Direct is gated by Meta, not by this server. Without Advanced Access the API answers a `/conversations?platform=instagram` call with a ~27s timeout (`error_subcode: 2534084`) explaining that too many threads belong to people with no role on the app. **Instagram comments are unaffected and work today.** The tools are shipped anyway so they start working the moment App Review clears — and `check_access` tells you where you stand.

## Available Tools

### Diagnostics

| Tool | Description |
| --- | --- |
| `check_access` | Report token type, expiry, messaging scopes, and which capabilities actually answer right now |

### Inbox

| Tool | Description |
| --- | --- |
| `list_conversations` | List inbox threads with participants, unread count and last-message snippet |
| `get_conversation` | Read one thread in full — participants plus recent messages |
| `list_messages` | List messages inside a thread |
| `get_message` | Read a single message, including attachments |
| `send_message` | Send a DM as the Page (text or image) |
| `send_sender_action` | Mark seen, or toggle the typing indicator |

### Posts and comments

| Tool | Description |
| --- | --- |
| `list_posts` | List Facebook Page posts or Instagram media |
| `list_comments` | List comments on a post/media, or replies to a comment |
| `get_comment` | Read one comment with its moderation flags |
| `create_comment` | Post a top-level comment (Facebook only) |
| `reply_to_comment` | Reply publicly as the Page (routes Facebook vs Instagram automatically) |
| `update_comment` | Edit a comment the Page authored (**Facebook only**) |
| `hide_comment` | Hide/unhide a comment — reversible moderation |
| `delete_comment` | Delete a comment permanently (irreversible) |
| `private_reply` | Answer a public comment with a private DM to its author |

### Platform asymmetries worth knowing

These are Meta's limits, surfaced as clear tool errors rather than opaque failures:

| Operation | Facebook | Instagram |
| --- | --- | --- |
| Reply to a comment | `POST /{id}/comments` | `POST /{id}/replies` |
| Edit your own comment | ✅ | ⛔ not supported by the API — delete and re-post |
| New top-level comment | ✅ | ⛔ replies only |
| Hide a comment | `is_hidden` | `hide` |

### Messaging windows

The two ways to DM someone have different clocks, and confusing them is how a stale inbox comes to look like a work queue right up until every send fails.

| | Clock starts at | Window |
| --- | --- | --- |
| `send_message`, no tag | the person's last message | **24 hours** |
| `send_message`, `tag: HUMAN_AGENT` | the person's last message | **7 days** |
| `private_reply` | the **comment** | **7 days**, once per comment |

The 24-hour limit is Meta's standard messaging window — *"Businesses have up to 24 hours to respond to a user"* ([Messenger Platform policy](https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/)). It is not a WhatsApp-only rule.

Pass `tag` only when it honestly describes the message: `HUMAN_AGENT` (a human answering the person's own question), `ACCOUNT_UPDATE`, `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`. Sending off-purpose is a policy violation, and `HUMAN_AGENT` also needs the Human Agent feature approved for the app — without it Meta rejects the call.

Because `private_reply` is measured from the comment rather than from a message, it is usually the only live channel: a comment posted this morning is reachable for a week, while an inbox thread that went quiet yesterday is already closed.

## Installation

You need two environment variables (a third is optional):

| Variable | Required | Description |
| --- | --- | --- |
| `META_PAGE_ACCESS_TOKEN` | yes | Page token issued to a **person** who administers the Page ([how to get one](#how-to-get-your-page-access-token)) |
| `META_PAGE_ID` | yes | Numeric Page ID — Meta Business Suite → Page → About |
| `META_IG_USER_ID` | no | Instagram Business account ID. Auto-discovered from the Page when omitted |

### Claude Code

Three installation scopes are available:

| Scope | Flag | Config file | Use case |
|-------|------|-------------|----------|
| **local** | `-s local` | `.mcp.json` | This project only (default) |
| **project** | `-s project` | `.claude/mcp.json` | Shared with team via git |
| **user** | `-s user` | `~/.claude/mcp.json` | All your projects |

**Quick setup (inline env vars):**

```bash
claude mcp add meta-inbox -s user \
  -e META_PAGE_ACCESS_TOKEN=your-page-token \
  -e META_PAGE_ID=your-page-id \
  -- npx -y github:pauloFroes/mcp-meta-inbox
```

**Persistent setup (.env file):**

Add to your `.mcp.json`:

```json
{
  "meta-inbox": {
    "command": "npx",
    "args": ["-y", "github:pauloFroes/mcp-meta-inbox"],
    "env": {
      "META_PAGE_ACCESS_TOKEN": "${META_PAGE_ACCESS_TOKEN}",
      "META_PAGE_ID": "${META_PAGE_ID}",
      "META_IG_USER_ID": "${META_IG_USER_ID}"
    }
  }
}
```

Then define the values in your `.env` file. See `.env.example`.

### Codex

```toml
[mcp_servers.meta-inbox]
command = "npx"
args = ["-y", "github:pauloFroes/mcp-meta-inbox"]
env_vars = ["META_PAGE_ACCESS_TOKEN", "META_PAGE_ID", "META_IG_USER_ID"]
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "meta-inbox": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-meta-inbox"],
      "env": {
        "META_PAGE_ACCESS_TOKEN": "your-page-token",
        "META_PAGE_ID": "your-page-id"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "meta-inbox": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-meta-inbox"],
      "env": {
        "META_PAGE_ACCESS_TOKEN": "your-page-token",
        "META_PAGE_ID": "your-page-id"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "meta-inbox": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-meta-inbox"],
      "env": {
        "META_PAGE_ACCESS_TOKEN": "your-page-token",
        "META_PAGE_ID": "your-page-id"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "meta-inbox": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-meta-inbox"],
      "env": {
        "META_PAGE_ACCESS_TOKEN": "your-page-token",
        "META_PAGE_ID": "your-page-id"
      }
    }
  }
}
```

## Why not the Marketing API token

If you already run [mcp-meta-marketing](https://github.com/pauloFroes/mcp-meta-marketing), the obvious move is to reuse its `META_ACCESS_TOKEN`. **It does not work here.**

That token is normally a **System User** token. The Conversations API rejects System User tokens — but it does not say so. It answers:

```json
{"error":{"message":"An unexpected error has occurred. Please retry your request later.",
          "type":"OAuthException","code":2,"is_transient":true}}
```

…which reads like a transient server fault and is identical across API versions. Retrying never helps. The inbox needs a Page token that was requested by a **person** with the `MODERATE` task on the Page.

This server refuses to start if it finds `META_ACCESS_TOKEN` but no `META_PAGE_ACCESS_TOKEN`, and prints how to fix it. Run `check_access` any time you're unsure which kind of token you're holding.

> Instagram *comments* happen to work with either token. Everything else needs the Page token, so this server standardizes on it.

## How to get your Page Access Token

Requires an existing Meta App with the **Messenger** and **Instagram** use cases added, and a Business Portfolio that owns the Page.

1. Go to [developers.facebook.com](https://developers.facebook.com/) → your app → **Use cases**
2. Open **"Interact with customers on Messenger from Meta"** → **Customize**
3. In the left menu, pick **Messenger API settings**
4. Under **2. Generate access tokens**, connect your Page if it isn't listed
5. Click **Generate** on the Page row → tick the acknowledgement → **Copy**

The token is shown **only once**. It **never expires** (`expires_at: 0` in the Access Token Debugger) unless you revoke it or lose the admin role.

> Do **not** generate this from **business.facebook.com → System Users** — that produces a System User token, which the inbox rejects. See the section above.

Verify what you got:

```bash
curl -s "https://graph.facebook.com/v25.0/debug_token?input_token=$TOKEN&access_token=$TOKEN"
```

You want `"type": "PAGE"`, `"expires_at": 0`, and a `user_id` that is your personal profile — not a System User.

### Instagram Direct: requesting Advanced Access

Reading Instagram DMs from people who have no role on your app requires **Advanced Access** to `instagram_manage_messages`, which only App Review grants. In your app → **Use cases** → the Instagram or Messenger use case → **Permissions and features** → the permission row → **Actions** → **Add to app review**. Expect to supply a working prototype and a screencast.

Nothing else in this server depends on it.

## Safety notes

Six tools write to the outside world. `send_message` and `private_reply` message a real person; `create_comment`, `reply_to_comment` and `update_comment` publish publicly under the Page's name; `delete_comment` is irreversible. They are annotated (`readOnlyHint` / `destructiveHint`) so MCP clients can gate them, but you should still confirm the recipient and the exact text with a human before firing them.

`hide_comment` is the reversible alternative to `delete_comment` for moderation.

## License

MIT
