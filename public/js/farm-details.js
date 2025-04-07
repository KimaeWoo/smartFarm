document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app"
  
  // 성장 단계 정의
  const growthStages = [
    { image: "images/11.png", text: "씨앗" },
    { image: "images/22.png", text: "새싹" },
    { image: "images/3.gif", text: "성장" },
    { image: "images/4.gif", text: "열매" },
  ]
  
  const currentStage = 0
  let allAlarms = []
  let isDarkMode = false
  
  // 세션스토리지에서 user_id와 farm_id 가져오기
  const userId = sessionStorage.getItem("user_id")
  const farmId = sessionStorage.getItem("farm_id")
  
  if (!userId || !farmId) {
    window.location.href = "login.html"
    return
  }
  
  // 탭 전환 기능
  const tabs = document.querySelectorAll(".tab")
  const tabContents = document.querySelectorAll(".tab-content")
  
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab")
  
      // 탭 활성화
      tabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
  
      // 탭 컨텐츠 활성화
      tabContents.forEach((content) => content.classList.remove("active"))
      document.getElementById(`${tabId}-tab`).classList.add("active")
  
      if (tabId == "history") {
        updateChartData() // 실시간 차트 가져오기
        updateHistoryChartData() // 기록 차트 가져오기
        updateSummaryChart() // 요약 차트 가져오기
      }
    })
  })
  
  // 센서 탭 전환 기능
  const sensorTabs = document.querySelectorAll(".sensor-tab")
  const sensorCharts = document.querySelectorAll(".sensor-chart")
  
  sensorTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const sensorId = tab.getAttribute("data-sensor")
  
      // 센서 탭 활성화
      sensorTabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
  
      // 센서 차트 활성화
      sensorCharts.forEach((chart) => chart.classList.remove("active"))
      document.getElementById(`${sensorId}-chart`).classList.add("active")
    })
  })
  
  // 테마 변경
  function toggleMode() {
    const htmlElement = document.documentElement
    const modeToggleImg = document.getElementById("mode-toggle")
  
    if (isDarkMode) {
      htmlElement.classList.remove("dark-theme")
      modeToggleImg.src = "images/lightmode2.png" // 라이트 모드 이미지
      isDarkMode = false
    } else {
      htmlElement.classList.add("dark-theme")
      modeToggleImg.src = "images/darkmode2.png" // 다크 모드 이미지
      isDarkMode = true
    }
  }
  
  document.getElementById("mode-toggle").addEventListener("click", toggleMode)
  
  // 로그아웃 처리
  const logoutButton = document.getElementById("logout-btn")
  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("user_id")
    sessionStorage.removeItem("farm_id")
    window.location.href = "login.html"
  })
  
  // 이름 불러오기
  async function fetchName() {
    try {
      const response = await fetch(`${API_BASE_URL}/getName?user_id=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error("네트워크 응답 오류: " + response.statusText)
      }
  
      const username = data.username
      document.getElementById("username").textContent = `${username}님`
    } catch (error) {
      console.error("사용자 이름 불러오기 실패:", error)
    }
  }
  
  // 센서 데이터를 가져와 화면에 업데이트하는 함수
  async function fetchSensorData() {
    try {
      const response = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farmId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error("네트워크 응답 오류: " + response.statusText)
      }
  
      // 각 센서 데이터 업데이트
      updateSensorUI("temperature", data.temperature, "temp", 0, 40) // 온도
      updateSensorUI("humidity", data.humidity, "humidity", 0, 100) // 습도
      updateSensorUI("soil_moisture", data.soil_moisture, "soil", 0, 100) // 토양 수분
      updateSensorUI("co2", data.co2, "co2", 0, 1000) // CO2
    } catch (error) {
      console.error("데이터 가져오기 실패:", error)
    }
  }
  
  // 센서 UI 업데이트 함수
  function updateSensorUI(sensorType, value, className, min, max) {
    // 센서 값과 단위 설정
    let unit = ""
    switch (sensorType) {
      case "temperature":
        unit = "°C"
        break
      case "humidity":
      case "soil_moisture":
        unit = "%"
        break
      case "co2":
        unit = "ppm"
        break
    }
  
    // 센서 값 업데이트
    const valueElement = document.querySelector(`.sensor-value.${className}`)
    if (valueElement) {
      valueElement.innerHTML = `${value}<span class="sensor-unit">${unit}</span>`
    }
  
    // 진행 바 너비 계산 및 업데이트
    const progressBar = document.querySelector(`.progress-container .progress-bar.${className}`)
    if (progressBar) {
      const percentage = ((value - min) / (max - min)) * 100
      progressBar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`
    }
  }
  
  // 상태 가져오기
  async function fetchDevicesStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farmId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error("네트워크 응답 오류: " + response.statusText)
      }
  
      // 각 장치의 상태 업데이트
      updateSwitchUI("led", data.led)
      updateSwitchUI("fan", data.fan)
      updateSwitchUI("water", data.water)
      updateSwitchUI("heater", data.heater)
      updateSwitchUI("cooler", data.cooler)
    } catch (error) {
      console.error("상태 가져오기 실패:", error)
    }
  }
  
  // 스위치 UI 업데이트 함수
  function updateSwitchUI(device, status) {
    const switchElement = document.getElementById(`${device}-switch`)
    const iconElement = document.getElementById(`${device}-icon`)
    const statusElement = document.getElementById(`${device}-status`)
  
    // 장치 상태에 맞게 UI 업데이트
    if (status) {
      switchElement.checked = true
      iconElement.classList.add("active")
      statusElement.textContent = "켜짐"
  
      // 팬이 켜지면 회전 애니메이션 추가
      if (device === "fan") {
        iconElement.querySelector("i").classList.add("spin")
      }
    } else {
      switchElement.checked = false
      iconElement.classList.remove("active")
      statusElement.textContent = "꺼짐"
  
      // 팬이 꺼지면 회전 애니메이션 제거
      if (device === "fan") {
        iconElement.querySelector("i").classList.remove("spin")
      }
    }
  }
  
  // 제어장치 상태 강제 변경하기
  async function updateDevice(device) {
    try {
      // 현재 토글 상태 확인
      const isChecked = document.getElementById(`${device}-switch`).checked
      // 서버로 상태 변경 요청
      const response = await fetch(`${API_BASE_URL}/devices/force-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: farmId,
          device: device,
          status: isChecked,
        }),
      })
  
      if (!response.ok) {
        throw new Error("서버 응답 실패")
      }
  
      // UI 업데이트
      updateSwitchUI(device, isChecked)
    } catch (error) {
      console.error("상태 변경 실패:", error)
    }
  }
  
  // 각 장치의 스위치 요소에 이벤트 리스너 추가
  const devices = ["led", "fan", "water", "heater", "cooler"]
  devices.forEach((device) => {
    const switchElement = document.getElementById(`${device}-switch`)
    if (switchElement) {
      switchElement.addEventListener("change", () => {
        updateDevice(device)
      })
    }
  })
  
  // 농장 상태 가져오기
  async function fetchFarmStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/get-farm-status/${farmId}`)
      if (!response.ok) {
        throw new Error("농장 정보를 가져오는 데 실패했습니다.")
      }
  
      const data = await response.json()
      const { farm_name, farm_type, growthRate, harvestDays, startDate, farmActive } = data
  
      document.getElementById("farmname").textContent = farm_name
      document.getElementById("farm-type").textContent = farm_type
      sessionStorage.setItem("farmName", farm_name)
      sessionStorage.setItem("farmType", farm_type)
  
      // farmActive가 1일 경우, startButton 숨기고 cropInfo 표시
      if (farmActive === 1) {
        document.getElementById("start-farm-btn").style.display = "none" // startButton 숨기기
        document.getElementById("crop-info").classList.add("visible") // cropInfo 보이기
      } else {
        document.getElementById("start-farm-btn").style.display = "block" // startButton 보이기
        document.getElementById("crop-info").classList.remove("visible") // cropInfo 숨기기
      }
  
      // 성장률과 날짜 정보 업데이트
      updateGrowthStatus(growthRate, harvestDays, startDate)
    } catch (error) {
      console.error("농장 상태 불러오기 실패:", error)
    }
  }
  
  function formatDateYMD(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0") // 월은 0부터 시작하므로 +1
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  
  function updateGrowthStatus(growthRate, harvestDays, startDate) {
    // 성장률 100%를 넘지 않도록 보정
    growthRate = Math.min(growthRate, 100)
  
    // 성장률 표시 및 원형 프로그래스 바 업데이트
    document.getElementById("growth-rate").textContent = `${growthRate}%`
    document.getElementById("growth-circle").style.background =
      `conic-gradient(#10b981 ${growthRate}%, #e5e7eb ${growthRate}%)`
  
    // 시작일 표시
    const formattedStartDate = formatDateYMD(startDate)
    document.getElementById("start-date").textContent = `시작일: ${formattedStartDate}`
  
    // D-Day 계산 및 표시
    const today = new Date()
    const startDateObj = new Date(startDate)
    const harvestDate = new Date(startDateObj)
    harvestDate.setDate(harvestDate.getDate() + harvestDays)
  
    const timeDiff = harvestDate - today
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))
  
    if (daysLeft > 0) {
      document.getElementById("d-day").textContent = `D-Day: ${daysLeft}일 남음`
    } else if (daysLeft === 0) {
      document.getElementById("d-day").textContent = `D-Day: 오늘 수확 가능`
    } else {
      document.getElementById("d-day").textContent = `D-Day: 수확 완료`
    }
  
    // 성장 상태, 이미지, 단계 표시 업데이트
    updateGrowthStageByRate(growthRate)
  }
  
  function updateGrowthStageByRate(growthRate) {
    const plantImage = document.getElementById("plantImage")
    const growthText = document.getElementById("growthText")
    const stageElements = document.querySelectorAll(".stage")
  
    let stageText = ""
    let stageIndex = 0
  
    // 성장률에 따라 상태 결정
    if (growthRate <= 10) {
      stageText = "씨앗"
      stageIndex = 0
    } else if (growthRate <= 35) {
      stageText = "새싹"
      stageIndex = 1
    } else if (growthRate < 100) {
      stageText = "성장"
      stageIndex = 2
    } else {
      stageText = "열매"
      stageIndex = 3
    }
  
    // 이미지 및 텍스트 업데이트
    plantImage.src = growthStages[stageIndex].image
    growthText.textContent = `현재 성장 단계: ${stageText}`
  
    // 단계 표시(active 클래스 업데이트)
    stageElements.forEach((el, idx) => {
      if (idx <= stageIndex) {
        el.classList.add("active")
      } else {
        el.classList.remove("active")
      }
    })
  }
  
  // 센서별 최적 수치 불러오기
  async function fetchCropOptimalValues() {
    const farmType = sessionStorage.getItem("farmType")
    try {
      const response = await fetch(`${API_BASE_URL}/get-Crop-OptimalValues?farm_type=${farmType}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error("네트워크 응답 오류: " + response.statusText)
      }
  
      // HTML 요소에 값 적용
      document.getElementById("temp-optimal").textContent =
        `${data.temperature.optimal_min} ~ ${data.temperature.optimal_max}`
      document.getElementById("humid-optimal").textContent =
        `${data.humidity.optimal_min} ~ ${data.humidity.optimal_max}`
      document.getElementById("soil-optimal").textContent =
        `${data.soil_moisture.optimal_min} ~ ${data.soil_moisture.optimal_max}`
      document.getElementById("co2-optimal").textContent = `${data.co2.optimal_min} ~ ${data.co2.optimal_max}`
  
      // 설정 패널에 현재 최적 수치 설정
      document.getElementById("temp-min").value = data.temperature.optimal_min
      document.getElementById("temp-max").value = data.temperature.optimal_max
      document.getElementById("humid-min").value = data.humidity.optimal_min
      document.getElementById("humid-max").value = data.humidity.optimal_max
      document.getElementById("soil-min").value = data.soil_moisture.optimal_min
      document.getElementById("soil-max").value = data.soil_moisture.optimal_max
      document.getElementById("co2-min").value = data.co2.optimal_min
      document.getElementById("co2-max").value = data.co2.optimal_max
  
      // 로컬 스토리지에 저장된 사용자 정의 값이 있으면 불러오기
      loadCustomOptimalValues()
    } catch (error) {
      console.error("작물 최적 수치 불러오기 실패:", error)
    }
  }
  
  // 사용자 정의 최적 수치 불러오기
  function loadCustomOptimalValues() {
    const savedValues = localStorage.getItem(`customOptimalValues_${farmId}`)
  
    if (savedValues) {
      const customValues = JSON.parse(savedValues)
  
      // UI 업데이트
      document.getElementById("temp-optimal").textContent =
        `${customValues.temperature.optimal_min} ~ ${customValues.temperature.optimal_max}`
      document.getElementById("humid-optimal").textContent =
        `${customValues.humidity.optimal_min} ~ ${customValues.humidity.optimal_max}`
      document.getElementById("soil-optimal").textContent =
        `${customValues.soil_moisture.optimal_min} ~ ${customValues.soil_moisture.optimal_max}`
      document.getElementById("co2-optimal").textContent =
        `${customValues.co2.optimal_min} ~ ${customValues.co2.optimal_max}`
  
      // 설정 패널 입력 필드 업데이트
      document.getElementById("temp-min").value = customValues.temperature.optimal_min
      document.getElementById("temp-max").value = customValues.temperature.optimal_max
      document.getElementById("humid-min").value = customValues.humidity.optimal_min
      document.getElementById("humid-max").value = customValues.humidity.optimal_max
      document.getElementById("soil-min").value = customValues.soil_moisture.optimal_min
      document.getElementById("soil-max").value = customValues.soil_moisture.optimal_max
      document.getElementById("co2-min").value = customValues.co2.optimal_min
      document.getElementById("co2-max").value = customValues.co2.optimal_max
    }
  }
  
  // 사용자 정의 최적 수치 저장하기
  async function saveCustomOptimalValues() {
    const tempMin = document.getElementById("temp-min").value
    const tempMax = document.getElementById("temp-max").value
    const humidMin = document.getElementById("humid-min").value
    const humidMax = document.getElementById("humid-max").value
    const soilMin = document.getElementById("soil-min").value
    const soilMax = document.getElementById("soil-max").value
    const co2Min = document.getElementById("co2-min").value
    const co2Max = document.getElementById("co2-max").value
  
    // 유효성 검사
    if (
      Number.parseInt(tempMin) > Number.parseInt(tempMax) ||
      Number.parseInt(humidMin) > Number.parseInt(humidMax) ||
      Number.parseInt(soilMin) > Number.parseInt(soilMax) ||
      Number.parseInt(co2Min) > Number.parseInt(co2Max)
    ) {
      alert("최소값은 최대값보다 작아야 합니다.")
      return false
    }
  
    // 새로운 최적 수치 객체 생성
    const newOptimalValues = {
      temperature: {
        optimal_min: Number.parseInt(tempMin),
        optimal_max: Number.parseInt(tempMax),
      },
      humidity: {
        optimal_min: Number.parseInt(humidMin),
        optimal_max: Number.parseInt(humidMax),
      },
      soil_moisture: {
        optimal_min: Number.parseInt(soilMin),
        optimal_max: Number.parseInt(soilMax),
      },
      co2: {
        optimal_min: Number.parseInt(co2Min),
        optimal_max: Number.parseInt(co2Max),
      },
    }
  
    // 로컬 스토리지에 저장
    localStorage.setItem(`customOptimalValues_${farmId}`, JSON.stringify(newOptimalValues))
  
    // UI 업데이트
    document.getElementById("temp-optimal").textContent = `${tempMin} ~ ${tempMax}`
    document.getElementById("humid-optimal").textContent = `${humidMin} ~ ${humidMax}`
    document.getElementById("soil-optimal").textContent = `${soilMin} ~ ${soilMax}`
    document.getElementById("co2-optimal").textContent = `${co2Min} ~ ${co2Max}`
  
    // 서버에 저장
    try {
      const farmType = sessionStorage.getItem("farmType")
      const response = await fetch(`${API_BASE_URL}/change-Crop-OptimalValues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_type: farmType,
          ...newOptimalValues,
        }),
      })
  
      if (!response.ok) {
        throw new Error("서버 응답 오류")
      }
  
      return true
    } catch (error) {
      console.error("최적 수치 서버 저장 실패:", error)
      alert("서버에 최적 수치 저장 중 오류가 발생했습니다.")
      return false
    }
  }
  
  // 서버에서 알림 데이터 불러오기
  async function fetchAlarm() {
    try {
      const response = await fetch(`${API_BASE_URL}/getAlarm?farm_id=${farmId}`)
      if (!response.ok) throw new Error("네트워크 오류:" + response.statusText)
  
      const data = await response.json()
  
      // 전체 알림 저장 및 정렬 (type 기준 정렬)
      allAlarms = data.sort((a, b) => a.type.localeCompare(b.type) || new Date(b.created_at) - new Date(a.created_at))
  
      // 최신 알림 표시
      const latestDanger = allAlarms.find((alarm) => alarm.type === "위험") || {
        content: "알림 없음",
        created_at: "시간",
      }
      const latestWarning = allAlarms.find((alarm) => alarm.type === "경고") || {
        content: "알림 없음",
        created_at: "시간",
      }
      const latestComplete = allAlarms.find((alarm) => alarm.type === "완료") || {
        content: "알림 없음",
        created_at: "시간",
      }
  
      if (latestDanger.content != "알림 없음") {
        document.getElementById("danger-head").textContent = latestDanger.content
        document.getElementById("danger-time").textContent = formatDateTime(latestDanger.created_at)
      }
      if (latestWarning.content != "알림 없음") {
        document.getElementById("warning-head").textContent = latestWarning.content
        document.getElementById("warning-time").textContent = formatDateTime(latestWarning.created_at)
      }
      if (latestComplete.content != "알림 없음") {
        document.getElementById("complete-head").textContent = latestComplete.content
        document.getElementById("complete-time").textContent = formatDateTime(latestComplete.created_at)
      }
  
      // 알림 리스트 업데이트
      fetchAlarmList()
    } catch (error) {
      console.error("알림 불러오기 실패:", error)
    }
  }
  
  // 알림 리스트를 가져오는 함수
  function fetchAlarmList() {
    const alarmListTableBody = document.querySelector("#alarm-list-table tbody")
    const alarmFilter = document.querySelector("#alarm-filter")
  
    if (!alarmListTableBody || !alarmFilter) {
      console.error("필터 또는 테이블 요소를 찾을 수 없습니다.")
      return
    }
  
    // 선택된 필터 값
    const selectedType = alarmFilter.value
  
    alarmListTableBody.innerHTML = "" // 기존 알림 내용 초기화
  
    if (allAlarms.length === 0) {
      alarmListTableBody.innerHTML = '<tr><td colspan="4">알림이 없습니다.</td></tr>'
    } else {
      // 시간 순으로 알림을 정렬 (가장 최근 알림이 위로 오도록)
      const sortedAlarms = allAlarms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
      // 필터링된 알림 리스트 (type 필터링)
      const filteredAlarms = sortedAlarms.filter((alarm) => {
        if (!selectedType) return true // 필터가 선택되지 않으면 모든 알림을 표시
        return alarm.type === selectedType // type 필터링
      })
  
      // 정렬된 알림을 테이블로 표시
      filteredAlarms.forEach((alarm) => {
        const tr = document.createElement("tr")
  
        // 알림 내용 앞에 이모지 추가
        const emoji = getEmojiForType(alarm.type)
  
        // 각 항목을 <td>로 만들어서 테이블에 추가
        const contentTd = document.createElement("td")
        contentTd.textContent = emoji + " " + alarm.content // 이모지와 알림 내용 결합
  
        const createdAtTd = document.createElement("td")
        createdAtTd.textContent = formatDateTime(alarm.created_at)
  
        const deviceTd = document.createElement("td")
        deviceTd.textContent = alarm.device || "장치 없음"
  
        const typeTd = document.createElement("td")
        typeTd.textContent = alarm.type
  
        // tr에 <td>들 추가
        tr.appendChild(contentTd)
        tr.appendChild(createdAtTd)
        tr.appendChild(deviceTd)
        tr.appendChild(typeTd)
  
        // 테이블 본문에 추가
        alarmListTableBody.appendChild(tr)
      })
    }
  }
  
  // 알림 유형에 맞는 이모지 반환 함수
  function getEmojiForType(type) {
    switch (type) {
      case "위험":
        return "🔴"
      case "경고":
        return "🟡"
      case "완료":
        return "🟢"
      default:
        return ""
    }
  }
  
  // 날짜 포맷팅 함수 (년, 월, 일, 시, 분 형식)
  function formatDateTime(dateString) {
    const date = new Date(dateString)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`
  }
  
  // 농장 시작하기
  async function startFarm() {
    try {
      const response = await fetch(`${API_BASE_URL}/start-farm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ farmId }),
      })
  
      if (response.ok) {
        // 농장 상태 다시 불러오기
        fetchFarmStatus()
      }
    } catch (error) {
      console.error("농장 시작 실패:", error)
    }
  }
  
  // 설정 패널 관련 이벤트 리스너
  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "block"
  })
  
  document.getElementById("closeSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "none"
  })
  
  document.getElementById("saveSettings").addEventListener("click", () => {
    if (saveCustomOptimalValues()) {
      document.getElementById("settingsPanel").style.display = "none"
      alert("최적 수치가 저장되었습니다.")
    }
  })
  
  // 알림 필터 변경 시 알림 리스트 갱신
  document.querySelector("#alarm-filter").addEventListener("change", fetchAlarmList)
  
  // 알림 클릭 시 알림 탭으로 이동
  document.querySelector(".alarm").addEventListener("click", () => {
    // 알림 탭으로 이동하는 코드
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active")
    })
    document.querySelector('[data-tab="alarm"]').classList.add("active")
  
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active")
    })
    document.getElementById("alarm-tab").classList.add("active")
  })
  
  // 시작하기 버튼 클릭 이벤트
  document.getElementById("start-farm-btn").addEventListener("click", startFarm)
  
  // 초기 데이터 로드
  fetchName()
  fetchSensorData()
  fetchDevicesStatus()
  fetchAlarm()
  fetchFarmStatus()
  fetchCropOptimalValues()
  
  // 주기적 데이터 업데이트 (5초마다)
  setInterval(fetchSensorData, 5000)
  setInterval(fetchDevicesStatus, 5000)
  })