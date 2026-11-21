# Branch `oss`

Upstream [Libredesk](https://github.com/abhinavxd/libredesk) plus the changes
below, built into `ghcr.io/navnand/libredesk:<version>` by
`.github/workflows/oss-image.yml`. Libredesk is AGPL-3.0; this branch is the
source for that image.

## Changes

- **Help articles per page.** A chat inbox's Help settings get page rules:
  page patterns (the same syntax as proactive messages) and up to 10 articles
  each. The widget sends its page address with the help request; the first
  matching rule's articles replace the featured list on the Home screen,
  headed "Help for this page" ("Popular articles" when no rule matches). The
  admin has a rule editor with a filter and "Preview as page". Rules live in
  the inbox config as `help.page_rules`. With no rules, nothing changes.

## Updating to a new Libredesk release

    git fetch upstream --tags
    git rebase --onto vX.Y.Z vPREVIOUS oss   # replay our commits on the new tag
    # fix conflicts, run the tests (CI runs them on push)
    git push --force-with-lease origin oss
    git tag oss/X.Y.Z-oss1 && git push origin oss/X.Y.Z-oss1

The tag builds the image. If the rebase doesn't apply or the tests fail,
nothing is built.
