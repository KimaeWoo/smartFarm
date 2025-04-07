document.addEventListener("DOMContentLoaded", () => {
  // 토글 버튼 요소 가져오기
  const loginToggle = document.getElementById("login-toggle")
  const signupToggle = document.getElementById("signup-toggle")
  const formsContainer = document.querySelector(".forms-container")

  // 로그인 폼 요소
  const loginForm = document.getElementById("login-form")
  const loginEmail = document.getElementById("login-email")
  const loginPassword = document.getElementById("login-password")

  // 회원가입 폼 요소
  const signupForm = document.getElementById("signup-form")
  const signupEmail = document.getElementById("signup-email")
  const signupName = document.getElementById("signup-name")
  const signupPassword = document.getElementById("signup-password")
  const signupConfirmPassword = document.getElementById("signup-confirm-password")
  const checkUserIdBtn = document.getElementById("check-userid-btn")
  const signupBtn = document.getElementById("signup-btn")

  // 결과 메시지 요소
  const emailResult = document.getElementById("email-result")
  const confirmPasswordResult = document.getElementById("confirm-password-result")

  // 상태 변수
  let isUserIdChecked = false
  let isPasswordMatched = false

  // 로그인 버튼 클릭 이벤트
  loginToggle.addEventListener("click", () => {
    formsContainer.style.transform = "translateX(0)"
    loginToggle.classList.add("active")
    signupToggle.classList.remove("active")
  })

  // 회원가입 버튼 클릭 이벤트
  signupToggle.addEventListener("click", () => {
    formsContainer.style.transform = "translateX(-50%)"
    signupToggle.classList.add("active")
    loginToggle.classList.remove("active")
  })

  // 이메일 입력 시 중복확인 상태 초기화
  signupEmail.addEventListener("input", () => {
    isUserIdChecked = false
    emailResult.textContent = ""
    emailResult.className = "result-message"
    checkSignupEligibility()
  })

  // 비밀번호 확인 입력 시 일치 여부 확인
  signupPassword.addEventListener("input", checkPasswordMatch)
  signupConfirmPassword.addEventListener("input", checkPasswordMatch)

  // 중복확인 버튼 클릭 이벤트
  checkUserIdBtn.addEventListener("click", checkUserId)

  // 로그인 폼 제출 이벤트
  loginForm.addEventListener("submit", handleLogin)

  // 회원가입 폼 제출 이벤트
  signupForm.addEventListener("submit", handleSignup)

  // 이메일 중복 확인 함수
  async function checkUserId() {
    const user_id = signupEmail.value
    if (!user_id) {
      emailResult.textContent = "이메일을 입력하세요."
      emailResult.className = "result-message error"
      return
    }

    try {
      const response = await fetch(
        `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/check-userid?user_id=${encodeURIComponent(user_id)}`,
      )

      if (response.ok) {
        emailResult.textContent = "사용 가능한 아이디입니다."
        emailResult.className = "result-message success"
        isUserIdChecked = true
      } else {
        emailResult.textContent = "이미 사용 중인 아이디입니다."
        emailResult.className = "result-message error"
        isUserIdChecked = false
      }

      checkSignupEligibility()
    } catch (error) {
      emailResult.textContent = "확인 중 오류가 발생했습니다."
      emailResult.className = "result-message error"
      isUserIdChecked = false
      checkSignupEligibility()
    }
  }

  // 비밀번호 일치 확인 함수
  function checkPasswordMatch() {
    const password = signupPassword.value
    const confirmPassword = signupConfirmPassword.value

    if (!password || !confirmPassword) {
      confirmPasswordResult.textContent = ""
      confirmPasswordResult.className = "result-message"
      isPasswordMatched = false
    } else if (password === confirmPassword) {
      confirmPasswordResult.textContent = "비밀번호가 일치합니다."
      confirmPasswordResult.className = "result-message success"
      isPasswordMatched = true
    } else {
      confirmPasswordResult.textContent = "비밀번호가 일치하지 않습니다."
      confirmPasswordResult.className = "result-message error"
      isPasswordMatched = false
    }

    checkSignupEligibility()
  }

  // 회원가입 버튼 활성화 여부 확인 함수
  function checkSignupEligibility() {
    signupBtn.disabled = !(isUserIdChecked && isPasswordMatched)
  }

  // 로그인 처리 함수
  async function handleLogin(e) {
    e.preventDefault()

    try {
      const response = await fetch("https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: loginEmail.value,
          password: loginPassword.value,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 로그인 성공 시 user_id 저장
        sessionStorage.setItem("user_id", loginEmail.value)
        window.location.href = "dashboard.html"
      } else {
        showToast(data.message || "로그인 실패", "error")
      }
    } catch (error) {
      showToast("서버 연결에 문제가 있습니다.", "error")
    }
  }

  // 회원가입 처리 함수
  async function handleSignup(e) {
    e.preventDefault()

    if (!isUserIdChecked || !isPasswordMatched) {
      showToast("이메일 중복확인과 비밀번호 확인이 필요합니다.", "error")
      return
    }

    try {
      const response = await fetch("https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: signupEmail.value,
          password: signupPassword.value,
          username: signupName.value,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast("회원가입 성공! 로그인 화면으로 이동합니다.", "success")
        setTimeout(() => {
          // 로그인 화면으로 전환
          loginToggle.click()
        }, 1500)
      } else {
        showToast(data.message || "회원가입 실패", "error")
      }
    } catch (error) {
      showToast("서버 연결에 문제가 있습니다.", "error")
    }
  }

  // 토스트 메시지 표시 함수
  function showToast(message, type = "error") {
    const toast = document.getElementById("toast")
    toast.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
      toast.className = "toast"
    }, 3000)
  }
})

