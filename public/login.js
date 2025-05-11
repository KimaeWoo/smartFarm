// 토글 버튼 요소 가져오기
const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const formsContainer = document.querySelector('.forms-container');

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
  console.log('로그인 함수 호출됨'); // 함수 호출 확인
  const user_id = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  console.log('로그인 요청:', { user_id, password });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('서버 응답 상태:', response.status, response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('서버 에러 응답:', errorData);
      throw new Error(errorData.message || `로그인 실패: ${response.status}`);
    }

    const data = await response.json();
    console.log('서버 응답 데이터:', data);

    if (data.message === '로그인 성공') {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user_id', user_id);
      console.log('로그인 성공, 페이지 이동');
      window.location.href = "dashboard.html";
    } else {
      console.warn('예상치 못한 응답:', data);
      alert(data.message || '로그인 실패');
    }
  } catch (error) {
    console.error('로그인 오류:', error.message, error.stack);
    alert('서버와의 연결에 실패했습니다: ' + error.message);
  }
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
        toggleForm(); // 가입 후 로그인 화면으로 이동
    } else {
        alert(data.message || '회원가입 실패');
    }
}
