# Palettes

Use these palettes as complete CSS token sets. Keep token names consistent across designs so a deck can switch palettes without rewriting layout CSS.

## Palette 01: Trust Blue

Default company-like palette. Use for polished SaaS, AI, workflow, education, internal training, and technology decks.

```css
:root {
  --color-primary: #3182F6;
  --color-primary-deep: #1B64DA;
  --color-primary-soft: #E8F3FF;
  --color-primary-bg: #F2F8FF;
  --color-text: #191F28;
  --color-text-muted: #4E5968;
  --color-text-subtle: #8B95A1;
  --color-line: #D1D6DB;
  --color-line-soft: #F2F4F6;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F9FAFB;
  --color-page-bg: #E5E8EB;
  --color-success: #00C896;
  --color-warning: #FF7E36;
  --color-violet: #8B5CF6;
}
```

Use for: company presentations, AI education, SaaS workflows, internal training, product overviews.

## Palette 02: Graphite Focus

Executive palette with neutral graphite surfaces and a precise blue accent. Use when the deck should feel calm, analytical, and decision-oriented.

```css
:root {
  --color-primary: #2563EB;
  --color-primary-deep: #1E3A8A;
  --color-primary-soft: #EAF1FF;
  --color-primary-bg: #F5F7FB;
  --color-text: #111827;
  --color-text-muted: #4B5563;
  --color-text-subtle: #9CA3AF;
  --color-line: #D1D5DB;
  --color-line-soft: #EEF0F4;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F7F8FA;
  --color-page-bg: #E7EAEE;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-violet: #6D5BD0;
}
```

Use for: executive briefings, strategy decks, KPI reviews, market analysis, board updates.

## Palette 03: Signal Green

Operational growth palette with green as the primary signal. Use when the deck should suggest progress, health, systems, and momentum.

```css
:root {
  --color-primary: #10B981;
  --color-primary-deep: #047857;
  --color-primary-soft: #DFF8EE;
  --color-primary-bg: #F1FBF6;
  --color-text: #14201B;
  --color-text-muted: #476158;
  --color-text-subtle: #8AA09A;
  --color-line: #CFE1DA;
  --color-line-soft: #EAF2EF;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F7FAF8;
  --color-page-bg: #E6EEE9;
  --color-success: #16A34A;
  --color-warning: #F97316;
  --color-violet: #6366F1;
}
```

Use for: operations, growth, adoption, process improvement, health metrics, positive momentum.

## Palette 04: Warm Editorial

Human-centered editorial palette with warm coral accents and soft paper-like surfaces. Use when the deck should feel narrative, thoughtful, and approachable.

```css
:root {
  --color-primary: #F9735B;
  --color-primary-deep: #C2412D;
  --color-primary-soft: #FFE8E1;
  --color-primary-bg: #FFF6F2;
  --color-text: #2A1F1B;
  --color-text-muted: #6B5550;
  --color-text-subtle: #A99690;
  --color-line: #E7D7D0;
  --color-line-soft: #F5ECE8;
  --color-surface: #FFFFFF;
  --color-surface-muted: #FFFAF7;
  --color-page-bg: #EFE6E1;
  --color-success: #2F9E75;
  --color-warning: #E99A2C;
  --color-violet: #9B6DFF;
}
```

Use for: storytelling, brand narrative, customer stories, culture decks, reflective lessons.

## Shared Usage Guidance

- Use `--color-primary` for key words, tags, slide numbers, and chart highlights.
- Use `--color-primary-deep` for high-emphasis gradients and selected states.
- Use `--color-primary-soft` and `--color-primary-bg` for subtle containers.
- Use `--color-text` for headings and `--color-text-muted` for body copy.
- Use `--color-warning`, `--color-success`, and `--color-violet` sparingly for secondary distinctions.

Suggested gradient:

```css
background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%);
```

Suggested page shell:

```css
body { background: var(--color-page-bg); }
.slide { background: var(--color-surface); color: var(--color-text); }
```

## User-Facing Choice Labels

Use these short labels when asking the user to choose:

- `Palette 01 Trust Blue`: 현재 회사색과 가까운 밝은 블루 SaaS 팔레트.
- `Palette 02 Graphite Focus`: 임원 보고와 전략 자료에 맞는 차분한 그레이/블루 팔레트.
- `Palette 03 Signal Green`: 성장, 운영, 성과, 개선 흐름에 맞는 그린 팔레트.
- `Palette 04 Warm Editorial`: 스토리텔링과 브랜드 내러티브에 맞는 따뜻한 코랄 팔레트.
- `회사색 직접 입력`: 사용자가 primary color hex or brand asset을 제공하면 같은 토큰 구조에 매핑.
- `추천`: 주제와 청중을 보고 가장 적합한 팔레트를 선택.
