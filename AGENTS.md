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

- Standalone builds use `npm run build:node` (NITRO_PRESET=node-server); why: the project must run outside Lovable.
- All DB migrations live in supabase/migrations only; why: one ordered source for fresh Supabase projects.

- Keep development-team presentation in EquipoDesarrollo with local Radix dialog state and bundled original portraits; why: opening credits must not alter access, session, navigation or require a database.
