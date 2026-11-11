# 플래너

달력과 프랭클린 플래너를 합친 개인 할일 관리 페이지입니다.

- 주소: https://minaritime.github.io/franklin-planner/
- 할일 데이터는 이 저장소가 아니라 각 기기의 브라우저와 비공개 Gist에만 저장됩니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 로직 점검 (Vitest)
npm run e2e      # 화면 흐름 점검 (Playwright)
npm run build
```

`main` 에 push 하면 GitHub Actions 가 점검과 빌드를 거쳐 자동으로 배포합니다.
