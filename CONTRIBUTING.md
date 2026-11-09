# Contributing to MoboMap

Thank you for helping. Bug reports, ideas, design systems, map styles and translations are very welcome.

## Licence of contributions

MoboMap is dual-licensed (AGPL-3.0 and a commercial licence, see [NOTICE.md](NOTICE.md)). To keep that
possible, every contribution needs this agreement:

> By submitting a contribution (code, data, text, translations, designs) to this repository, you
> confirm that you have the right to do so, you license it under the GNU AGPL-3.0, **and** you grant
> Morten Bonding a perpetual, worldwide, non-exclusive, royalty-free, irrevocable licence to use,
> modify, sublicense and distribute your contribution under other licence terms, including commercial
> licences. You keep the copyright to your contribution.

Please confirm it by adding this line to your commit messages (`git commit -s` does it for you):

```
Signed-off-by: Your Name <your@email>
```

## Practical notes

- Run `npm run check` before opening a pull request (build, syntax, translations in all 10 languages).
- `npm run format` formats the sources (Prettier).
- Never commit private or client design systems or logos – `designsystems/private/` is ignored for that.
