
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

## NPM 패키지 

실제로 우리는 llm 환각증세로 나온 패키지명 중 estree-util, metro-evaluator로 NPM 패키지를 등록하였다.

"estree-util" npm 패키지 주소(환경변수 노출 실습) : https://www.npmjs.com/package/estree-util 
	
"metro-evaluator" npm 패키지 주소(리버스쉘 실습) : https://www.npmjs.com/package/metro-evaluator

---

## 프로젝트 구조 설명

이 레포지토리는 LLM 환각 패키지를 이용한 환경변수 탈취 실험 전체를 재현할 수 있도록 세 개의 주요 폴더로 구성되어 있다. 
각 폴더는 로컬 도커 환경, 실제 서버 환경, 악성 NPM 패키지를 담당한다.

1.	docker-server/ — 로컬 테스트용 도커 환경
이 디렉터리에는 attacker와 victim 두 개의 서버가 포함되어 있으며, 로컬 도커 환경에서 PoC 전체 흐름이 작동하는지 테스트하기 위한 코드가 들어 있다.

	docker-server/attacker/

   - Python 기반 간단한 HTTP 서버.
   - 피해자 서버로부터 환경변수 exfiltration payload를 수신하는 역할.
	
	docker-server/victim/
 
   - Express + sqlite 기반의 간단한 웹 서비스.
   - DB_PASSWORD, API_KEY 등 환경변수를 가진 상태에서 악성 NPM 패키지를 설치하면 환경변수 탈취가 발생하는 구조.

2.	real-server/ — 실제 공격/피해자 서버 환경 구성
이 디렉터리는 로컬이 아닌 실제 서버 환경 공격을 재현하기 위한 코드가 들어 있다.

	real-server/victim/

	- 피해자 서버는 아무 서버여도 무관하며, 기존 victim 코드 구조와 동일하게 동작한다.

	real-server/attacker/
	
	- AWS EC2 상에서 실행하는 공격자 서버 코드이다.
	- 이 디렉터리의 파일이 그대로 AWS에서 동작하며, 실제 외부에서 탈취 요청이 들어오면 로그를 실시간으로 확인할 수 있다.

3.	hallucination-npm-package/ — LLM 환각 패키지를 실제로 NPM에 등록한 악성 패키지 코드
이 디렉터리에는 다음 내용이 포함된다.
	- 여러 LLM에서 가장 자주 환각된 패키지명을 수집하고 실제 npm에 등록함
	- 등록한 패키지에 악성 install 스크립트와 payload 로직 구현
	- package.json에는 “install: node install.js”가 포함
	- install.js는 외부 URL에서 payload를 다운로드 후 실행
	- payload.txt는 실제 payload가 들어 있는 GitHub raw URL을 가리키며, 설치 시 해당 파일을 자동으로 불러와 실행됨

주의: payload.txt가 위치한 Github 저장소는 private이기 때문에, 실제 NPM 설치 시 실행되지 않는다. 테스트를 원할 경우 Github 저장소를 public으로 변경하면 정상 작동한다.

⸻

작동 방법
1.	로컬 도커 환경에서 테스트 (docker-server)

(1) 도커 네트워크 생성

	docker network create env-net

(2) 공격자 서버 실행

	cd docker-server/attacker
	docker build -t attack-server
	docker run -d –name attack-con –network env-net -p 8000:8000 attack-server
	docker logs -f attack-con   (로그 모니터링)

(3) 피해자 서버 실행

	cd docker-server/victim
	docker build -t victim-server

	docker run -d 
		–name victim-con 
		–network env-net 
		-p 5001:5000 
		-e DB_PASSWORD=‘dummy-pass’ 
		-e API_KEY=‘dummy-key’ 
		-e JWT_SECRET=‘dummy-jwt’ 
		victim-server

(4) 피해자 컨테이너 내부에서 악성 패키지 설치

	npm install /path/to/malicious-package.tgz

(5) 공격자 서버 로그에서 환경변수 유출 확인

	docker logs -f attack-con

2.	실제 서버 환경에서 테스트 (real-server)

(1) 공격자 서버(AWS EC2)에 real-server/attacker 배포

	scp -r real-server/attacker ec2-user@AWS_PUBLIC_IP:/home/ec2-user/
	ssh ec2-user@AWS_PUBLIC_IP
	cd attacker
	python3 server.py

(2) 피해자 서버는 아무 서버여도 무관

	- npm install 시 외부 AWS 공격자 서버로 payload가 전송됨.

(3) 악성 npm 패키지 설치

	npm install 

(4) 환경변수 탈취 결과는 AWS 공격자 서버 로그에서 확인
	
3.	실제 NPM 패키지 설치 테스트 (hallucination-npm-package)
(1) 환각 패키지명을 실제 npm에 publish한 상태
(2) payload.txt는 Github raw URL을 통해 install.js에서 자동으로 불러옴
(3) npm install  실행
(4) 공격자 서버 쪽에서 env 탈취 결과 확인 가능

주의: private Github repo일 경우 install 단계에서 payload 다운로드가 불가능함. 테스트 시 public으로 변경 필요.

4.	최종 요약
	- docker-server/: 로컬 도커 테스트용 attacker + victim 환경
	- real-server/: 실제 인터넷 환경 공격 시연용(AWS attacker 포함)
	- hallucination-npm-package/: LLM 환각 패키지를 실제 npm에 등록한 악성 패키지 코드
	- payload.txt는 Github raw URL을 불러오며, repo가 private이면 작동하지 않음 → public 필요
	
⸻

## 추가정보

환경변수(.env) 노출 공격 payload GitHub 주소 : https://github.com/JunYeopAn/rdd-remote-payload-test
	
리버스쉘 공격 payload GitHub 주소 : https://github.com/JunYeopAn/rdd-remote-payload-test2



	
