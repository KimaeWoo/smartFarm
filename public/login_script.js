const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.cc";

const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const formsContainer = document.querySelector('.forms-container');

loginToggle.addEventListener('click', () => {
    formsContainer.style.transform = 'translateX(0)';
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
});

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
    const response = await fetch(`${API_BASE_URL}/check-userid?user_id=${encodeURIComponent(user_id)}`);
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

async function login() {
    const user_id = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `로그인 실패: ${response.status}`);
        }

        const data = await response.json();

        if (data.message === '로그인 성공') {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user_id', user_id);
            window.location.href = "dashboard.html";
        } else {
            alert(data.message || '로그인 실패');
        }
    } catch (error) {
        console.error('로그인 오류:', error.message, error.stack);
        alert('서버와의 연결에 실패했습니다: ' + error.message);
    }
}

async function signup() {
    const user_id = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const username = document.getElementById("signup-name").value;
    const response = await fetch(`${API_BASE_URL}/signup`, {
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