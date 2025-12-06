
# NPM 환각 패키지를 이용한 환경변수 탈취 PoC

- 이 레포지토리는 **교육 및 연구 목적**으로만 사용해야 합니다.  
- 실제 서비스 운영 환경에 악성 패키지나 PoC 코드를 배포하지 마세요.

---

## 개요
이 프로젝트는 LLM이 추천한 **존재하지 않는 NPM 패키지(환각 패키지, hallucinated package)** 를  
공격자가 실제로 등록했을 때, 개발자가 `npm install` 한 번만으로  
환경변수(`process.env`) 전체가 외부 공격자 서버로 유출될 수 있는지를 보여주는 PoC입니다.

프로젝트는 다음 두 부분으로 구성됩니다.
1. 공격 시나리오 PoC
   - 공격자 컨테이너, 피해자 컨테이너, 악성 NPM 패키지 구조
   - 패키지 설치 시 자동 실행되는 'install' 스크립트를 악용하여 환경변수를 탈취
2. LLM 환각 패키지 분석 결과(선택)
   - 여러 LLM이 추천한 NPM 패키지 이름을 수집
   - 실제 존재하지 않는 패키지(진짜 환각)를 추출하고,  
     이 중 즉시 등록 가능한 패키지 수(= Slopsquatting 위험)를 정량적으로 분석
     
---

## 아키텍처

간단한 구조는 다음과 같습니다.

Victim Server  --(POST)->  Attacker Server

Victim Server에서 install script (npm)
[Malicious NPM Package]
   - package.json (scripts.install)
   - install.js (remote payload download & eval)
   - payload (exfiltrate process.env)
