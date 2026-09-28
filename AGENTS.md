# Repository Guidelines

## Project Structure & Module Organization

This is the BonisTech personal blog, built with Next.js Pages Router, React, and Tailwind CSS.

- `pages/` contains routes; `pages/api/` contains newsletter integrations.
- `components/` holds reusable UI; `layouts/` contains author, post, and listing layouts.
- `data/blog/` stores Markdown/MDX posts; `data/authors/` stores author profiles. Navigation and site settings live in `data/headerNavLinks.js` and `data/siteMetadata.js`.
- `lib/` handles MDX processing, tags, RSS, and utilities; `scripts/` contains content and build helpers.
- `public/static/` holds images and other public assets; `css/` contains styles.
- `.next/` is generated output. Do not edit it.

## Build, Test, and Development Commands

This codebase is best developed in GitHub Codespaces or a local devcontainer using `.devcontainer/devcontainer.json`. The container provides Node.js 24, installs dependencies automatically, and forwards port 3000. In VS Code, choose **Dev Containers: Reopen in Container**.

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start the local development server.
- `npm start`: start development with the custom content watcher for `data/`.
- `npm run build`: create the production build and generate the sitemap.
- `npm run serve`: serve an existing production build.
- `npm run analyze`: build with bundle analysis enabled.
- `npx eslint pages components lib layouts scripts`: run lint checks directly. The existing `npm run lint` uses legacy `next lint`, which is unavailable in Next.js 15.
- `npx prettier --check <files>`: check formatting; use `--write` to fix it.

## Coding Style & Naming Conventions

Use two spaces, single quotes, no semicolons, ES5 trailing commas, and a 100-character line width. Prettier also orders Tailwind classes. Use PascalCase for React components and layouts, camelCase for utilities, and kebab-case for post filenames. Follow Pages Router filename conventions and configured `@/components`, `@/data`, and `@/lib` import aliases. Husky runs lint-staged before commits.

## Testing Guidelines

No automated test framework, test script, or coverage threshold is configured. Run lint, formatting checks, and the production build for code changes. Check affected routes locally, including mobile navigation, light/dark themes, links, and MDX rendering. Preserve post frontmatter and verify publication status when editing content.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `fix package versions` and `draft compiler post`; no mandatory Conventional Commits format is evident. Keep commits focused. PRs should describe the change, include validation results, link relevant issues, and provide screenshots for visible UI changes.

## Configuration & Secrets

Use `.env.example` as a reference for local configuration. Keep credentials out of commits; `NEXT_PUBLIC_` variables are browser-visible. Store newsletter API keys only in server-side environment variables.
