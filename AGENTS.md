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
- Keep Clientes under the client-only authenticated layout and retain owner-scoped Cloud policies; route guards hide UI while RLS enforces private data access.
- Use one root auth subscriber for router invalidation; the directory listens only to synchronize account-owned records and discards stale account requests.
- Product catalog is per-account in Cloud; visit math takes the products list as a parameter (defaulting to the base catalog) so custom products flow through liquidation and consignment.
