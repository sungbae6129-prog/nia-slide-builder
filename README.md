[README.md](https://github.com/user-attachments/files/28822258/README.md)
# NIA Slide Builder

NIA 내부 보고용 HTML 슬라이드를 만들고 PDF와 편집 가능한 텍스트가 포함된 PPTX로 내보내는 Codex Skill입니다.

## 주요 규칙

- 표지 슬라이드에 NIA CI 1개와 냐냐 캐릭터 1개를 포함합니다.
- 마지막에 `감사합니다.` 슬라이드를 추가하고 CI를 하단 중앙에 배치합니다.
- 상황에 맞는 투명 배경 냐냐 PNG를 자동 선택합니다.
- 한국어 명사구와 조사가 어색하게 분리되지 않도록 줄바꿈합니다.
- 의미상 음수 또는 감소 값은 마이너스 대신 `△`로 표시합니다.
- PDF와 PPTX를 함께 생성합니다.
- PPTX의 표시 텍스트를 편집 가능한 PowerPoint 텍스트 상자로 복원합니다.

## 공개 배포

이 저장소에는 외부 홈페이지에 공개된 NIA CI와 냐냐 캐릭터 이미지가 포함되어 있으며, 공개 GitHub 저장소에서 함께 배포할 수 있도록 구성되어 있습니다.

## 설치 방법

### Windows PowerShell

```powershell
git clone https://github.com/sungbae6129-prog/nia-slide-builder.git "$env:USERPROFILE\.codex\skills\nia-slide-builder"
cd "$env:USERPROFILE\.codex\skills\nia-slide-builder"
npm install
```

PowerShell 실행 정책 때문에 `npm` 명령이 차단되면 다음 명령을 사용하세요.

```powershell
npm.cmd install
```

### macOS / Linux

```bash
git clone https://github.com/sungbae612-prog/nia-slide-builder.git ~/.codex/skills/nia-slide-builder
cd ~/.codex/skills/nia-slide-builder
npm install
```

설치 후 Codex를 다시 시작하고 다음처럼 요청합니다.

```text
nia-slide-builder를 이용해 NIA 내부 보고용 슬라이드를 만들어줘.
```

## 정상 설치 확인

스킬 폴더 바로 아래에 `SKILL.md`가 있어야 합니다.

```text
nia-slide-builder/
├── SKILL.md
├── agents/
├── assets/
├── references/
├── scripts/
├── package.json
└── package-lock.json
```

다음 명령으로 샘플 표지와 마감 슬라이드를 검사할 수 있습니다.

```powershell
node scripts/qa_html_slides.mjs examples/nia-brand-shell
```

오류 없이 `"errorCount": 0`이 출력되면 정상입니다.

## 다른 사람에게 설치를 요청하는 문장

```text
다음 GitHub 저장소의 nia-slide-builder 스킬을 설치하고 필수 패키지도 설치해줘:
https://github.com/sungbae6129-prog/nia-slide-builder
```

Public 저장소로 공개하면 누구나 저장소 주소를 통해 설치할 수 있으며 별도의 GitHub 초대는 필요하지 않습니다.

## 폴더 설명

- `SKILL.md`: 스킬의 핵심 제작 규칙
- `agents/openai.yaml`: Codex 스킬 표시 정보
- `assets/nia-brand/`: NIA CI와 투명 배경 냐냐 이미지
- `assets/templates/`: 표지 및 감사합니다 슬라이드 템플릿
- `references/`: 캐릭터 선택 기준
- `scripts/`: HTML QA와 PDF/PPTX 내보내기 도구
- `examples/nia-brand-shell/`: 설치 확인용 최소 예제
