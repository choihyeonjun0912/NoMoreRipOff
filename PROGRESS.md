# PROGRESS

## 2026-07-29
- Done:
  - Next.js(App Router, TS) + Tailwind 프로젝트 수동 스캐폴딩 (Phase 0)
  - `.env.local.example` 작성, `.gitignore`에 `.env*` 포함 확인, README 초안
  - `data/checklist.json`(9개 항목) / `data/constants.json`(2026 최저임금 10,320원) 작성
  - `/api/analyze` 구현: Anthropic vision 호출, 엄격한 JSON 검증(프롬프트 인젝션 방어),
    4.5MB 제한, 20초 타임아웃, 4xx/5xx/파싱 오류 구분, 인메모리 IP 레이트리밋(10회/10분)
  - 프론트엔드: 카메라 캡처 UI + Canvas 압축(1568px/0.85), 로딩/오류/결과 화면,
    고정 면책 문구 푸터
  - `npm run build`, `tsc --noEmit`, `npm run lint` 통과
- Blocked on:
  - 실제 ANTHROPIC_API_KEY 미보유 → 라이브 API 호출/curl 테스트 미수행
- Next:
  - API 키 등록 후 curl로 `/api/analyze` 단독 테스트
  - 고용노동부 표준근로계약서·근로기준법 대조로 체크리스트 문구 최종 검증 (Phase 1)
  - Vercel 배포 및 합성 계약서 검증 (Phase 4)
