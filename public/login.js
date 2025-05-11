// 토글 버튼 요소 가져오기
const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const formsContainer = document.querySelector('.forms-container');

// JWT 관련 함수
function saveToken(token) {
    localStorage.setItem('jwt_token', token);
}

function getToken() {
    return localStorage.getItem('jwt_token');
}

function removeToken() {
    localStorage.removeItem('jwt_token');
}

function isTokenValid() {
    const token = getToken();
    if (!token) return false;
    
    // 간단한 토큰 유효성 검사 (실제로는 서버에서 검증해야 함)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // 밀리초로 변환
        return Date.now() < expiryTime;
    } catch (e) {
        return false;
    }
}

// 로그인 버튼 클릭 이벤트
loginToggle.addEventListener('click', () => {
    formsContainer.style.transform = 'translateX(0)';
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
});

// 회원가입 버튼 클릭 이벤트
signupToggle.addEventListener('click', () => {
    formsContainer.style.transform = 'translateX(-50%)';
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
});

let isUserIdChecked = false;
let isPasswordMatched = false;
let isUsernameChecked = false;

document.getElementById("signup-email").addEventListener("input", () => {
    isUserIdChecked = false;
    document.getElementById("email-result").textContent = "";
    checkSignupEligibility();
});

document.getElementById("signup-name").addEventListener("input", () => {
    isUsernameChecked = false;
    document.getElementById("name-result").textContent = "";
    checkSignupEligibility();
});

async function checkUserId() {
    const user_id = document.getElementById("signup-email").value;
    if (!user_id) {
        document.getElementById("email-result").textContent = "이메일을 입력하세요.";
        document.getElementById("email-result").style.color = "red";
        return;
    }
    const response = await fetch(`https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/check-userid?user_id=${encodeURIComponent(user_id)}`);
    const data = await response.json();

    if (response.ok) {
        document.getElementById("email-result").textContent = "사용 가능한 아이디입니다.";
        document.getElementById("email-result").style.color = "lightgreen";
        isUserIdChecked = true;
    } else {
        document.getElementById("email-result").textContent = "이미 사용 중인 아이디입니다.";
        document.getElementById("email-result").style.color = "red";
        isUserIdChecked = false;
    }
    checkSignupEligibility();
}

function checkPasswordMatch() {
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const message = document.getElementById("confirm-password-result");

    if (!password || !confirmPassword) {
        message.textContent = "";
        isPasswordMatched = false;
    } else if (password === confirmPassword) {
        message.textContent = "비밀번호가 일치합니다.";
        message.style.color = "lightgreen";
        isPasswordMatched = true;
    } else {
        message.textContent = "비밀번호가 일치하지 않습니다.";
        message.style.color = "red";
        isPasswordMatched = false;
    }

    checkSignupEligibility();
}

function checkSignupEligibility() {
    document.getElementById("signupBtn").disabled = !(isUserIdChecked && isPasswordMatched);
}

// 로그인 요청
async function login() {
    const user_id = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const response = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, password })
    });

    const data = await response.json();

    if (response.ok) {
        // 로그인 성공 시 user_id와 JWT 토큰을 저장
        sessionStorage.setItem('user_id', user_id);
        
        // JWT 토큰 저장 (서버에서 토큰을 제공한다고 가정)
        if (data.token) {
            saveToken(data.token);
        } else {
            // 서버에서 토큰을 제공하지 않는 경우 임시 토큰 생성
            const dummyToken = generateDummyToken(user_id);
            saveToken(dummyToken);
        }
        
        window.location.href = "dashboard.html";
    } else {
        alert(data.message || '로그인 실패');
    }
}

// 임시 토큰 생성 함수 (실제 환경에서는 서버에서 발급해야 함)
function generateDummyToken(userId) {
    // 간단한 JWT 형식의 토큰 생성 (실제 환경에서는 사용하지 말 것)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: userId,
        name: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24시간 유효
    }));
    const signature = btoa('dummy_signature'); // 실제로는 비밀키로 서명해야 함
    
    return `${header}.${payload}.${signature}`;
}

// 회원가입 요청
async function signup() {
    const user_id = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const username = document.getElementById("signup-name").value;
    const response = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, password, username })
    });

    const data = await response.json();

    if (response.ok) {
        alert('회원가입 성공!');
        loginToggle.click(); // 가입 후 로그인 화면으로 이동
    } else {
        alert(data.message || '회원가입 실패');
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    // 중복확인 버튼 이벤트
    document.querySelector('.check-btn').addEventListener('click', checkUserId);
    
    // 비밀번호 확인 이벤트
    document.getElementById('signup-confirm-password').addEventListener('input', checkPasswordMatch);
    document.getElementById('signup-password').addEventListener('input', checkPasswordMatch);
    
    // 로그인 폼 제출 이벤트
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
    
    // 회원가입 폼 제출 이벤트
    document.getElementById('signup-form').addEventListener('submit', function(e) {
        e.preventDefault();
        signup();
    });
    
    // 토큰이 유효하면 자동으로 대시보드로 이동
    if (isTokenValid()) {
        window.location.href = "dashboard.html";
    }
});