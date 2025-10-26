<img src="https://github.com/user-attachments/assets/04579553-47de-4cfb-8ec2-e934435381ff" width="70%" />

## 프로젝트 개요

> Smart Farm Monitoring System은 IoT 센서를 통해 농장 환경 데이터를 실시간 수집하고, 웹 대시보드와 모바일 앱을 통해 모니터링, 분석, 제어가 가능한 스마트 농장 관리 시스템입니다.
>
> 센서 기반 데이터와 AI 분석을 활용해 농작물 생육 최적화 및 관리 효율성을 향상시키는 것을 목표로 개발되었습니다.

- 개발 기간: 2024.10 ~ 2025.06  
- 팀 규모: 3인 (백엔드/DB/웹, 하드웨어, 모바일 앱)  
- 역할: 백엔드, 데이터베이스, 웹 프론트엔드 개발  
- 주요 기술: Node.js (Express), MariaDB, ReactNative, Raspberry Pi, Python, FastAPI, Firebase, OpenAI API

## 나의 역할 및 기여

- **백엔드**
    - RESTful API 설계 및 구현
    - 사용자 인증 및 권한 관리 (JWT)
    - 센서 데이터 수집, 장치 제어 로직 구현
- **데이터베이스**
    - MariaDB 기반 스키마 설계 및 구축
    - 센서/장치/리포트 데이터 CRUD 관리
- **웹 프론트엔드**
    - 관리자 대시보드 개발
    - 실시간 데이터 시각화 및 UX/UI 구현 (Chart.js 활용)
- **외부 서비스 연동**
    - OpenAI API 연동으로 농장 상태 분석 리포트 자동 생성
    - Firebase Storage 연동으로 이미지 파일 관리

**팀원 역할 분담**

- 나: 백엔드, DB, 웹 프론트엔드
- 팀원 A: 하드웨어(H/W) 구현 및 센서/액추에이터 인터페이스 개발
- 팀원 B: 모바일 앱 프론트엔드 개발

---

## 주요 기능 구현

### 1. 실시간 농장 환경 모니터링

- 백엔드(Node.js)와 하드웨어 간의 통신 로직을 구현하여 온도, 습도, 토양 수분 등 주요 센서 데이터를 실시간으로 수집하고 저장.
- 웹 대시보드에서 최신 데이터를 즉시 반영하여 농장 환경 변화를 감지.

### 2. 데이터 시각화

- Chart.js를 활용하여 수집된 센서 데이터를 시계열 그래프로 변환.
- 사용자에게 기간별 환경 변화 추이를 직관적으로 제공하여 문제 발생 시점을 쉽게 파악할 수 있도록 지원.

### 3. 자동 리포트 생성 (AI 분석)

- 농장 환경 데이터와 제어 기록을 기반으로 OpenAI API를 호출하여 농장 운영에 대한 전문적인 분석 리포트를 자동 생성.
- 리포트 내용을 통해 작물 상태 진단 및 환경 최적화 방안을 제안.

### 4. 농장 자동 및 수동 제어

- 수동 제어: 웹 대시보드에서 펌프, 환풍기 등의 장치를 관리자가 즉시 ON/OFF하거나 지속 시간을 설정하여 제어 가능.
- 자동 제어 로직: (옵션: 센서 값에 따른 자동 작동 로직도 구현되었다면 추가 설명 가능)

### 데모 영상

<div align="center">

<table>
<tr>
<td>
    <img src="https://github.com/user-attachments/assets/df3e6d50-c793-46c7-bab9-4e907226afa6" width="100%" />
    <p align="center">로그인 및 사용자 인증</p>
</td>
<td>
    <img src="https://github.com/user-attachments/assets/b589c4ab-27f0-4cd5-b200-84af12fc457e" width="100%" />
    <p align="center">농장 목록</p>
</td>
</tr>
    
<tr>
<td>
    <img src="https://github.com/user-attachments/assets/a4761200-3387-4731-8fee-e59104673765" width="100%" />
    <p align="center">센서 데이터 및 제어장치</p>
</td>
<td>
    <img src="https://github.com/user-attachments/assets/125741e6-6608-4eec-a13f-2ab629fad741" width="100%" />
    <p align="center">통계 데이터</p>
</td>
</tr>

<tr>
<td>
    <img src="https://github.com/user-attachments/assets/4c5047bc-b3a1-46e1-a21e-895c87c49aa9" width="100%" />
    <p align="center">CCTV 및 캡쳐</p>
</td>
<td>
    <img src="https://github.com/user-attachments/assets/8a9ae81c-9c59-42b0-a202-63cb25ae3dd0" width="100%" />
    <p align="center">리포트 생성</p>
</td>
</tr>

<tr>
<td>
    <img src="https://github.com/user-attachments/assets/d505eaec-46f5-4e13-9ebc-0cb6d11db128" width="100%" />
    <p align="center">챗봇</p>
</td>

</tr>
</table>

</div>

---

## 주요 트러블슈팅 및 해결 과정

### 1. RDBMS 환경에서 비정형 데이터(이미지) 관리 문제 해결

- 문제 상황
    
    프로젝트 초기, 모든 데이터를 정형 데이터로 판단하여 관계형 데이터베이스(RDBMS)인 MariaDB로 시스템을 설계했습니다. 그러나 개발 후반, 스마트팜의 상태를 시각적으로 확인하고 싶다는 요구에 따라 작물의 이미지를 주기적으로 저장하고 관리해야 하는 기능이 갑작스럽게 추가되었습니다. 이미지와 같은 대용량의 비정형 데이터는 RDBMS에 적합하지 않았으며, 이미 상당 부분 개발이 진행된 DB 스키마를 NoSQL로 마이그레이션하기에는 시간적 여유가 부족했습니다. 이는 기존 설계를 유지하면서도 서비스를 고도화해야 하는 도전 과제였습니다.
    
- 해결 과정 (Firebase Storage 도입)
    
    기존 시스템 구조를 최대한 유지하면서 새로운 요구사항을 수용하기 위해, 대용량 파일 저장에 특화된 Firebase Storage를 해결책으로 선택했습니다.
    
    1. DB 분리 저장: MariaDB에는 이미지의 메타데이터와 공개 URL만 저장.
    2. 파일 저장: 실제 이미지 파일은 Node.js 백엔드에서 Multer로 받은 후, Firebase Storage에 업로드하여 관리.
- 결과
    
    DB 마이그레이션이라는 큰 공수 없이도 이미지 데이터를 효율적으로 관리할 수 있게 되었으며, 시스템의 확장성을 확보하고 비용 효율적인 비정형 데이터 처리 아키텍처를 구축했습니다.
    

### 2. AI 리포트 생성 시 비용 및 효율성 최적화

- 문제 상황
    
    AI 리포트 생성 기능을 구현할 때, 과거 24시간 동안의 모든 센서 기록과 제어 장치 작동 기록을 AI 모델(OpenAI API)에 전송했습니다. 이로 인해 API 요청 시 전송되는 토큰 수가 과도하게 증가하여 AI 사용 비용이 상승하고 응답 시간이 길어지는 문제가 발생했습니다.
    
- 해결 과정
    
    AI 분석의 정확도를 유지하면서 전송 데이터 크기를 최소화하기 위해 백엔드 로직을 개선했습니다.
    
    1. 데이터 최소화 원칙: AI 분석에 필수적인 '주요 통계 요약 값' (평균, 최솟값, 최댓값 등)과 '주요 이벤트 기록' (예: 급격한 변화가 발생한 시점의 값, 장치 작동 기록)만 선별하도록 결정.
    2. SQL 최적화: AI 리포트 생성 API 호출 직전에 MariaDB 쿼리를 실행하여, 전체 원시 데이터 대신 SUM(), AVG(), WHERE 조건 등을 활용해 AI 프롬프트에 필요한 핵심 요약 정보만 추출하도록 구현.
- 결과
    
    불필요한 데이터 전송을 절감하여 AI API 사용 비용을 절감했습니다. 
    또한, 입력 토큰 수 감소는 곧 응답 시간 단축으로 이어져 서비스의 성능과 경제성을 동시에 확보했습니다.
