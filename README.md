# NoMoreRipOff

근로계약서(아르바이트/기간제)를 휴대폰으로 촬영하면, 한국 노동법 기준으로 위법 소지가 있는
조항을 9개 체크리스트로 즉시 짚어주는 모바일 웹 서비스입니다. 링크만으로 사용 — 설치·가입 없음.

> ⚠️ 본 서비스의 결과는 법률 자문이 아닌 참고용 정보입니다.
> 정확한 상담: 고용노동부 1350, 대한법률구조공단 132

## 기술 스택

- Next.js (App Router, TypeScript) + Tailwind CSS
- Anthropic Messages API (vision) — 이미지·결과는 어디에도 저장하지 않음
- 브라우저 Canvas API로 클라이언트 측 이미지 압축

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local 에 ANTHROPIC_API_KEY 입력 (절대 커밋 금지)
npm run dev
```

http://localhost:3000 접속 (모바일 화면 기준 UI).

## 구조

- `app/page.tsx` — 촬영/업로드 → 검사 → 결과 화면 (단일 페이지)
- `app/api/analyze/route.ts` — Anthropic API 호출 (API 키는 서버에만 존재)
- `lib/compressImage.ts` — Canvas 리사이즈(최대 1568px) + JPEG 압축(≤3MB)
- `data/checklist.json` — 9개 점검 항목 (컴포넌트/프롬프트에 하드코딩 금지)
- `data/constants.json` — 연도별 수치(최저임금 등), 매년 갱신
