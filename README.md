# whatspast

A local-first WhatsApp export viewer. Import ZIP archives, export folders or a text file alongside its attachments. Read conversations, revisit media, explore statistics and save favorite moments. Chat contents and media stay in IndexedDB in your browser.

## Getting started

Use Node.js 22.12 or later. `.nvmrc` selects Node 22.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Build and preview production:

```sh
npm test
npm run build
npm run preview
```

## Importing and updating chats

Export a chat from WhatsApp using **Export Chat → Attach Media**. Import its ZIP or select its complete folder. Choose the export date order if automatic detection cannot disambiguate it.

To add later messages to an existing archive, open its **… → Update from export** menu, or choose **Update: conversation name** in the import dialog. 

## Exploring your archive

- Virtualized message and media lists for large histories.
- Conversation search and phrase counts by participant.
- Photos, videos, WebP stickers, Opus voice notes, other audio and PDF attachments.
- Automatic previews near the viewport, with a maximum of three simultaneous reads and native audio/video controls. Codec support depends on the browser.
- Media filters for Photos, Videos, Stickers, Audio and Documents.
- Monthly calendar showing active days. The shared date filter scopes messages, media and insights to one local calendar day.
- Favorite days from the calendar, date bar, or chat date separators. Favorite media from the gallery or message attachments. The Favorites section collects saved days and media across all conversations.
- Emoji rankings for everyone or an individual participant, preserving emoji modifiers, flags, keycaps and joined sequences.
- Daily conversation starters: the first participant message of each local day, including media and excluding system/call events.
- Call record totals and explicitly attributed call initiators. Generic or missed call entries do not establish who initiated a call. unattributed entries are reported separately. 
- Participant shares, word rankings, hourly activity, active days and JSON insight exports. 
- Background workers for parsing, history merging and statistics, keeping interaction responsive.
- Responsive layout, visible keyboard focus, reduced-motion support and Cmd/Ctrl+I import shortcut.

## Offline use

The production build generates a versioned service worker and a full application precache, including lazy modules and analysis workers. After the first successful visit and cache installation, the app can reopen offline. The initial visit and each new build require connectivity.
