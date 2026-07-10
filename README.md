## Project structure

```
src/
  main.ts               # 애플리케이션 진입점 (부트스트랩, 서버 시작)
  app.module.ts          # 루트 모듈 (컨트롤러/프로바이더 조합)
  app.controller.ts      # 라우팅 및 요청 처리
  app.service.ts         # 비즈니스 로직
  app.controller.spec.ts # 컨트롤러 유닛 테스트
test/
  app.e2e-spec.ts         # e2e 테스트
```

- **main.ts**: `NestFactory.create(AppModule)`로 앱 인스턴스를 생성하고 `PORT` 환경변수(없으면 3000)로 서버를 기동합니다.
- **app.module.ts**: 애플리케이션의 루트 모듈입니다. 새 기능을 추가할 때는 별도 모듈(예: `ScrapeModule`)을 만들어 이곳 `imports`에 등록합니다.
- **app.controller.ts**: HTTP 요청을 받아 서비스에 위임하는 계층입니다. 생성자 주입으로 `AppService`를 받습니다.
- **app.service.ts**: 실제 로직이 들어가는 프로바이더(`@Injectable()`)입니다.
