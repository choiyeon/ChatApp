# 🐾 ChatApp Service 🐾

웹 소캣을 활용한 간단한 채팅 서비스입니다.

## 🚀 기능

- **회원 관리**: 회원가입, 로그인
- **채팅**: 다른 사용자와 1대1 채팅

## 📦 설정 방법

### 1. 프로젝트 클론
레포지토리를 클론합니다.
```bash
git clone https://github.com/choiyeon/ChatApp.git
cd frontend
```

### 2. React 패키지 설치
필요한 패키지를 설치합니다.
```bash
npm install
```

### 3. 프론트 서버 실행
서버를 실행합니다.
```bash
yarn dev
```

### 4. Back-end 폴더로 이돔
레포지토리를 클론합니다.
```bash
cd backend
```

### 5. .env 파일 준비
루트 디렉토리에 `.env` 파일을 생성하고 아래 내용을 추가하세요.
```
MONGO_URL={Your MongoDB URL} # MongoDB 데이터베이스 URL
JWT_SECRET = {Your JWT SECRET KEY} # JWT 인증에 사용될 비밀 키
CLIENT_URL={Your CLIENT URL} # 클라이언트 애플리케이션 URL
```

### 6. Node.js 패키지 설치
필요한 패키지를 설치합니다.
```bash
npm install
```

### 7. 서버 실행
서버를 실행합니다.
```bash
nodemon server.js
```

