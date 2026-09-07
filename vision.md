# Vision: User Tools for Confluence

## One-liner

A Confluence Forge app that turns the @mentions on any page into a visual, actionable
set of user assets — high-quality avatars you can drop into Figma, and email addresses
you can paste anywhere.

## The problem

People are the subject of most Confluence pages: project teams, on-call rotations,
stakeholder lists, RACI tables, retro attendees. Today those people exist only as
inline @mention chips. If you want to *do* something with that group — build a team
slide, drop faces into a Figma org chart, email everyone — you have to click each
mention, open each profile, right-click each tiny avatar, and copy each email by hand.
For a page with 10 mentions that is dozens of interactions and the avatars you end up
with are low-resolution.

## The solution

Open the app from any Confluence page. It reads every @mention on the page, resolves
each one to a real Atlassian user, and presents them as a visual grid of user cards.
From there, the whole group (or any subset) is one click away from being usable
elsewhere.

### Core experience

1. **Open** — trigger the app from a Confluence page (context menu on selected text
   today, whole-page in the target experience).
2. **See** — a grid of user cards: large high-quality avatar, display name, email.
3. **Curate** — include/exclude individual users with a toggle on each card, plus
   select-all / select-none. Add a user who isn't mentioned on the page by searching,
   and remove anyone who is mentioned but irrelevant.
4. **Act** — one click to:
   - copy the selected avatars as images, ready to paste directly into Figma
     (also downloadable as PNGs at full available resolution)
   - copy the selected email addresses as a comma- or newline-separated list
   - copy names, or a name + email table

The list of selected users is the single source of truth: every action operates on
exactly what the user has curated, and the count is always visible ("10 of 12
selected").

## Key user stories

- As a designer, I select the 8 people mentioned in a project page and paste their
  avatars straight into a Figma team frame, without hunting down profile photos.
- As a project lead, I copy the email addresses of everyone mentioned in a meeting
  page to send a follow-up, minus the two people who were only mentioned in passing.
- As an EA building a leadership page, I start from the mentions on the page, drop
  three, add two more by search, and copy the resulting name + email table.

## Principles

- **Visual first.** Faces, not rows of text. The grid *is* the interface.
- **Zero setup.** No configuration, no page markup, no macros — it works on pages
  that already exist.
- **Curation is cheap.** Adding and removing users must be a single click each; the
  app never forces an all-or-nothing group.
- **Highest fidelity available.** Always request the largest avatar Atlassian exposes
  so pasted assets hold up in design tools.
- **Read-only and respectful.** The app never modifies pages and only surfaces user
  data the viewer can already see in Confluence.
- **Native feel.** Built with Forge Custom UI and the Atlassian Design System so it
  looks like part of Confluence.

## Scope

### In scope (target experience)

- Reading @mentions from a whole Confluence page, not just a text selection
- Resolving mentions to Atlassian accounts (display name, account id, email, avatar)
- Visual user card grid with per-user include/exclude
- Manual add/remove of users via user search
- Copy avatars for pasting into Figma; download avatars as PNGs
- Copy emails / names / name+email table

### Out of scope (for now)

- Editing Confluence pages or mentions
- Sending email or messages from the app
- Storing or syncing user lists across sessions or people
- Non-Confluence hosts (Jira, Bitbucket)
- Bulk operations across multiple pages or spaces

## Where we are today

The current app is an early slice of this vision: a context menu action that extracts
@mentions from *selected text* and lists the matching email addresses with a single
"copy emails" button.

The gap to close:

| Today | Vision |
| --- | --- |
| Selected text only | Whole page |
| Text list of emails | Visual grid of user cards |
| All-or-nothing | Per-user include/exclude, plus manual add |
| Emails only | Avatars for Figma, emails, names |
| Plain HTML/inline styles | Atlassian Design System components |

## Success looks like

- Going from "page with 10 mentions" to "10 avatars in Figma" in under 10 seconds.
- Getting a curated email list without leaving Confluence or opening a profile.
- Users reach for the app whenever a page is about a group of people.
