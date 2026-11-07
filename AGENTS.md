<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Rebuild persisted browser state through a validating loader (`loadState` in `src/lib/visit.ts`) before rendering, and keep the visit math tolerant of missing entries — a half-saved or corrupt visit must degrade to a valid state, never blank the screen.
- Store client records and completed visits in Cloud with owner-scoped RLS; the shared directory provider supplies dashboard and client administration so edits stay consistent.
- Keep browser visit drafts separated by account and pass the current directory to loadState so custom client IDs survive validated restoration.
