const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app"

const growthStages = [
  { image: "images/씨앗.png", text: "씨앗" },
  { image: "images/새싹.png", text: "새싹" },
  { image: "images/성장.png", text: "성장" },
  { image: "images/열매.png", text: "열매" },
]

let currentStage = 0

function growPlant() {
  if (currentStage < growthStages.length - 1) {
    currentStage++
  }
  const plantImage = document.getElementById("plantImage")
  const growthText = document.getElementById("growthText")
  plantImage.src = growthStages[currentStage].image
  growthText.textContent = `현재 성장 단계: ${growthStages[currentStage].text}`
}

function toggleMode() {
  const htmlElement = document.documentElement
  const modeToggleImg = document.getElementById("mode-toggle")
  if (htmlElement.classList.contains("dark-theme")) {
    htmlElement.classList.remove("dark-theme")
    htmlElement.classList.add("light-theme")
    modeToggleImg.src = "images/lightmode2.png"
  } else {
    htmlElement.classList.remove("light-theme")
    htmlElement.classList.add("dark-theme")
    modeToggleImg.src = "images/darkmode2.png"
  }
}

const logoutButton = document.getElementById("logout-btn")
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("user_id")
    alert("로그아웃")
    window.location.href = "login.html?#"
  })
}

const dashboardtButton = document.getElementById("farmname")
if (dashboardtButton) {
  dashboardtButton.addEventListener("click", () => {
    sessionStorage.removeItem("farm_id")
    window.location.href = "dashboard.html"
  })
}

document.addEventListener("DOMContentLoaded", async () => {
  let pendingDevice = null;

  function showDurationModal(device) {
    pendingDevice = device;
    document.getElementById("durationModal").style.display = "flex";
  }

  document.querySelectorAll(".switch input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (e) => {
      e.preventDefault();
      e.target.checked = !e.target.checked; // 잠시 되돌림
      const device = e.target.id.split("-")[0];
      showDurationModal(device);
    });
  });

  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("customDuration").value = btn.dataset.minutes;
    });
  });

  document.getElementById("cancelDuration").addEventListener("click", () => {
    document.getElementById("durationModal").style.display = "none";
    pendingDevice = null;
  });

  document.getElementById("confirmDuration").addEventListener("click", () => {
    const minutes = parseInt(document.getElementById("customDuration").value);
    if (!minutes || minutes <= 0) {
      alert("유효한 시간을 입력하세요");
      return;
    }
    const seconds = minutes * 60;
    toggleDeviceWithDuration(pendingDevice, seconds);
    document.getElementById("durationModal").style.display = "none";
  });

  async function toggleDeviceWithDuration(device, duration) {
    const switchElement = document.getElementById(`${device}-switch`);
    const status = !switchElement.checked;
    try {
      const response = await fetch(`${API_BASE_URL}/devices/force-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: sessionStorage.getItem("farm_id"),
          device,
          status,
          duration
        })
      });
      if (!response.ok) throw new Error("요청 실패");
      switchElement.checked = status;
      updateSwitchUI(device, status);
    } catch (err) {
      alert("장치 제어 실패: " + err.message);
    }
  }
  
  const today = new Date()
  const currentDate = new Date()

  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
    const weekday = weekdays[date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  function formatDateYMD(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function updateDateDisplay() {
    const formattedDate = formatDate(currentDate)
    const historyDateEl = document.getElementById("history-date")
    const summaryDateEl = document.getElementById("summary-date")
    const datePickerEl = document.getElementById("date-picker")

    if (historyDateEl) {
      historyDateEl.textContent = formattedDate
    }

    if (summaryDateEl) {
      summaryDateEl.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 센서별 평균값`
    }

    if (datePickerEl) {
      datePickerEl.value = formatDateYMD(currentDate)
    }
  }

  const tabs = document.querySelectorAll(".tab")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab")
      tabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      tabContents.forEach((content) => content.classList.remove("active"))
      document.getElementById(`${tabId}-tab`).classList.add("active")
      if (tabId === "history") {
        updateChartData()
        updateHistoryChartData()
        updateSummaryChart()
      } else if (tabId === "writeDiary") {
        fetchReports() // 일지 탭 클릭 시 리포트 목록 새로고침
      }
    })
  })

  const sensorTabs = document.querySelectorAll(".sensor-tab")
  const sensorCharts = document.querySelectorAll(".sensor-chart")

  sensorTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const sensorId = tab.getAttribute("data-sensor")
      sensorTabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      sensorCharts.forEach((chart) => chart.classList.remove("active"))
      document.getElementById(`${sensorId}-chart`).classList.add("active")
    })
  })

  // 달력 선택 이벤트 추가
  const datePickerEl = document.getElementById("date-picker")
  if (datePickerEl) {
    // 최대 날짜를 오늘로 제한
    datePickerEl.max = formatDateYMD(today)
    datePickerEl.addEventListener("change", async () => {
      const selectedDate = new Date(datePickerEl.value)
      if (selectedDate <= today) {
        currentDate.setTime(selectedDate.getTime())
        updateDateDisplay()
        await updateAllCharts()
      } else {
        alert("미래 날짜는 선택할 수 없습니다.")
        datePickerEl.value = formatDateYMD(currentDate)
      }
    })
  }

  const prevDateBtn = document.getElementById("prev-date")
  if (prevDateBtn) {
    prevDateBtn.addEventListener("click", async () => {
      currentDate.setDate(currentDate.getDate() - 1)
      updateDateDisplay()
      await updateAllCharts()
    })
  }

  const nextDateBtn = document.getElementById("next-date")
  if (nextDateBtn) {
    nextDateBtn.addEventListener("click", async () => {
      if (currentDate < today) {
        currentDate.setDate(currentDate.getDate() + 1)
        updateDateDisplay()
        await updateAllCharts()
      }
    })
  }
  
  const userId = sessionStorage.getItem("user_id")
  const farmId = sessionStorage.getItem("farm_id")
  const farmType = sessionStorage.getItem("farm_type")
  const userName = sessionStorage.getItem("user_name")
  const farmName = sessionStorage.getItem("farm_name")
  const farmLocation = sessionStorage.getItem("farm_location")

  const username = document.getElementById("username")
  const farmNameText = document.getElementById("farmname")
  const startButton = document.getElementById("start-farm-btn")
  const cropInfo = document.getElementById("crop-info")
  const growthText = document.getElementById("growth-rate")
  const tempOptimal = document.getElementById("temp-optimal")
  const humidOptimal = document.getElementById("humid-optimal")
  const soilOptimal = document.getElementById("soil-optimal")
  const co2Optimal = document.getElementById("co2-optimal")
  
  function fetchData() {
    if (farmNameText) {
      farmNameText.textContent = farmName
    }
    if (username) {
      username.textContent = `${userName}님`
    }
    const farmtype = document.getElementById("farm-type")
    if (farmtype) {
      farmtype.textContent = `작물: ${farmType}`
    }

    const farmlocation = document.getElementById("farm-location")
    if (farmlocation) {
      farmlocation.textContent = `위치: ${farmLocation}`
    }
  }

  async function startFarm() {
    try {
      const response = await fetch(`${API_BASE_URL}/start-farm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      });

      if (!response.ok) throw new Error("서버 오류");

      const data = await response.json();

      const { harvestDays, startDate } = data;
      console.log("start-farm 응답:", data);
      console.log("harvestDays:", harvestDays);
      console.log("startDate:", startDate);
      if (!harvestDays || !startDate) {
        throw new Error("작물 정보 누락");
      }

      // 버튼 숨김, 작물 정보 표시
      if (startButton) startButton.style.display = "none";
      if (cropInfo) cropInfo.classList.add("visible");

      // 성장률 계산 및 UI 갱신
      const today = new Date();
      const startDateObj = new Date(startDate);
      const harvestDate = new Date(startDateObj);
      harvestDate.setDate(harvestDate.getDate() + harvestDays);
      const timeDiff = harvestDate - today;
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const growthRate = ((harvestDays - daysLeft) / harvestDays) * 100;

      updateGrowthStatus(growthRate, harvestDays, startDate);

      // 농장 상태 갱신
      await fetchFarmStatus();

      alert("농장이 성공적으로 시작되었습니다.");
    } catch (error) {
      console.error("농장 시작 실패:", error);
      alert("농장 시작 중 오류 발생");
    }
  }

  if (startButton) {
    startButton.addEventListener("click", startFarm);
  }

  // 농장 정보 가져오기
  function fetchFarmStatus() {
    fetch(`${API_BASE_URL}/get-farm-status/${farmId}`)
      .then((response) => {
        if (!response.ok) throw new Error("농장 정보를 가져오는 데 실패했습니다.")
        return response.json()
      })
      .then((data) => {
        const { farmname, growthRate, harvestDays, startDate, farmActive } = data
        if (farmActive === 1) {
          if (startButton) startButton.style.display = "none"
          if (cropInfo) cropInfo.classList.add("visible")
        } else {
          if (startButton) startButton.style.display = "block"
          if (cropInfo) cropInfo.classList.remove("visible")
        }
        updateGrowthStatus(growthRate, harvestDays, startDate)
      })
      .catch((error) => console.error(error.message))
  }

  function updateGrowthStatus(growthRate, harvestDays, startDate) {
    growthRate = Math.max(0, Math.min(growthRate, 100)); // 0~100으로 보정

    const growthRateEl = document.getElementById("growth-rate");
    if (growthRateEl) {
      growthRateEl.textContent = `${Math.round(growthRate)}%`;
    }

    const growthCircle = document.getElementById("growth-circle")
    if (growthCircle) {
      growthCircle.style.background = `conic-gradient(#ffffff 0deg ${growthRate * 3.6}deg, rgba(255,255,255,0.3) ${growthRate * 3.6}deg 360deg)`;

    }

    const formattedStartDate = formatDateYMD(new Date(startDate));
    const startDateEl = document.getElementById("start-date");
    if (startDateEl) {
      startDateEl.textContent = `시작일: ${formattedStartDate}`;
    }

    const today = new Date();
    const harvestDate = new Date(startDate);
    harvestDate.setDate(harvestDate.getDate() + harvestDays);
    const timeDiff = harvestDate - today;
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const dDayEl = document.getElementById("d-day");
    if (dDayEl) {
      if (daysLeft > 0) {
        dDayEl.textContent = `D-Day: ${daysLeft}일 남음`;
      } else if (daysLeft === 0) {
        dDayEl.textContent = `D-Day: 오늘 수확 가능`;
      } else {
        dDayEl.textContent = `D-Day: 수확 완료`;
      }
    }

    updateGrowthStageByRate(growthRate);
  }

  function updateGrowthStageByRate(growthRate) {
    const plantImage = document.getElementById("plantImage")
    const growthTextEl = document.getElementById("growthText")
    const stageElements = document.querySelectorAll(".stage")

    if (!plantImage || !growthTextEl) return

    let stageText = ""
    let stageIndex = 0

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

    plantImage.src = growthStages[stageIndex].image
    growthTextEl.textContent = `현재 성장 단계: ${stageText}`

    stageElements.forEach((el, idx) => {
      if (idx <= stageIndex) {
        el.classList.add("active")
      } else {
        el.classList.remove("active")
      }
    })
  }

  async function fetchFarmOptimalValues() {
    try {
      const response = await fetch(`${API_BASE_URL}/getFarmConditions/${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      const {
        temperature: { optimal_min: tempMin, optimal_max: tempMax },
        humidity: { optimal_min: humidMin, optimal_max: humidMax },
        soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
        co2: { optimal_min: co2Min, optimal_max: co2Max },
      } = data

      if (tempOptimal) tempOptimal.textContent = `${tempMin} ~ ${tempMax}`
      if (humidOptimal) humidOptimal.textContent = `${humidMin} ~ ${humidMax}`
      if (soilOptimal) soilOptimal.textContent = `${soilMin} ~ ${soilMax}`
      if (co2Optimal) co2Optimal.textContent = `${co2Min} ~ ${co2Max}`

      const tempMinEl = document.getElementById("temp-min")
      const tempMaxEl = document.getElementById("temp-max")
      const humidMinEl = document.getElementById("humid-min")
      const humidMaxEl = document.getElementById("humid-max")
      const soilMinEl = document.getElementById("soil-min")
      const soilMaxEl = document.getElementById("soil-max")
      const co2MinEl = document.getElementById("co2-min")
      const co2MaxEl = document.getElementById("co2-max")

      if (tempMinEl) tempMinEl.value = tempMin
      if (tempMaxEl) tempMaxEl.value = tempMax
      if (humidMinEl) humidMinEl.value = humidMin
      if (humidMaxEl) humidMaxEl.value = humidMax
      if (soilMinEl) soilMinEl.value = soilMin
      if (soilMaxEl) soilMaxEl.value = soilMax
      if (co2MinEl) co2MinEl.value = co2Min
      if (co2MaxEl) co2MaxEl.value = co2Max
    } catch (error) {
      console.error("작물 최적 수치 불러오기 실패:", error)
    }
  }

  async function updateFarmOptimalValues() {
    const tempMinEl = document.getElementById("temp-min")
    const tempMaxEl = document.getElementById("temp-max")
    const humidMinEl = document.getElementById("humid-min")
    const humidMaxEl = document.getElementById("humid-max")
    const soilMinEl = document.getElementById("soil-min")
    const soilMaxEl = document.getElementById("soil-max")
    const co2MinEl = document.getElementById("co2-min")
    const co2MaxEl = document.getElementById("co2-max")

    if (!tempMinEl || !tempMaxEl || !humidMinEl || !humidMaxEl || !soilMinEl || !soilMaxEl || !co2MinEl || !co2MaxEl) {
      return false
    }

    const tempMin = tempMinEl.value
    const tempMax = tempMaxEl.value
    const humidMin = humidMinEl.value
    const humidMax = humidMaxEl.value
    const soilMin = soilMinEl.value
    const soilMax = soilMaxEl.value
    const co2Min = co2MinEl.value
    const co2Max = co2MaxEl.value

    if (
      Number.parseInt(tempMin) > Number.parseInt(tempMax) ||
      Number.parseInt(humidMin) > Number.parseInt(humidMax) ||
      Number.parseInt(soilMin) > Number.parseInt(soilMax) ||
      Number.parseInt(co2Min) > Number.parseInt(co2Max)
    ) {
      alert("최소값은 최대값보다 작아야 합니다.")
      return false
    }

    if (tempOptimal) tempOptimal.textContent = `${tempMin} ~ ${tempMax}`
    if (humidOptimal) humidOptimal.textContent = `${humidMin} ~ ${humidMax}`
    if (soilOptimal) soilOptimal.textContent = `${soilMin} ~ ${soilMax}`
    if (co2Optimal) co2Optimal.textContent = `${co2Min} ~ ${co2Max}`

    try {
      const response = await fetch(`${API_BASE_URL}/updateFarmCondition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: farmId,
          temperature: { optimal_min: Number.parseInt(tempMin), optimal_max: Number.parseInt(tempMax) },
          humidity: { optimal_min: Number.parseInt(humidMin), optimal_max: Number.parseInt(humidMax) },
          soil_moisture: { optimal_min: Number.parseInt(soilMin), optimal_max: Number.parseInt(soilMax) },
          co2: { optimal_min: Number.parseInt(co2Min), optimal_max: Number.parseInt(co2Max) },
        }),
      })
      if (!response.ok) throw new Error("서버 응답 오류: " + response.statusText)
    } catch (error) {
      alert("서버에 최적 수치 저장 중 오류가 발생했습니다.")
    }
    fetchFarmOptimalValues()
    return true
  }

  // 챗봇 기능
  const chatInput = document.getElementById("chat-input-field");
  const sendButton = document.getElementById("send-button");

  // 메시지 전송 함수
  async function sendChatMessage() {
    const input = chatInput.value.trim();
    if (!input) return;

    addMessageToChat("user", input);
    chatInput.value = "";

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      addMessageToChat("bot", data.reply || "답변 없음");
    } catch (error) {
      addMessageToChat("bot", "서버 오류 발생");
    }
  }

  // 전송 버튼 클릭
  sendButton.addEventListener("click", sendChatMessage);

  // 🔹 엔터 키 입력 처리
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // form 제출 방지
      sendChatMessage();
    }
  });

  // 채팅 메시지 출력 함수
  function addMessageToChat(role, text) {
    const container = document.querySelector(".chat-messages");
    const message = document.createElement("div");
    message.className = `message ${role}`;
    message.innerHTML = `<div class="message-content">${text}</div>`;
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
  }

  async function fetchSensorData() {
    try {
      // if (!userId) {
      //   alert("사용자 정보를 확인할 수 없습니다. 로그인 후 다시 시도해주세요.")
      //   window.location.href = "login.html"
      //   return
      // }
      // if (!farmId) {
      //   alert("스마트팜 정보를 확인할 수 없습니다. 스마트팜 추가가 후 다시 시도해주세요.")
      //   window.location.href = "dashboard.html"
      //   return
      // }
      const response = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      updateSensorUI("temperature", data.temperature, "temp", 0, 40)
      updateSensorUI("humidity", data.humidity, "humidity", 0, 100)
      updateSensorUI("soil_moisture", data.soil_moisture, "soil", 0, 100)
      updateSensorUI("co2", data.co2, "co2", 800, 1300)
    } catch (error) {
      console.error("데이터 가져오기 실패:", error)
    }
  }

  function updateSensorUI(sensorType, value, className, min, max) {
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
    const valueElement = document.querySelector(`.sensor-value.${className}`)
    if (valueElement) {
      valueElement.innerHTML = `${value}<span class="sensor-unit">${unit}</span>`
    }
    const progressBar = document.querySelector(`.progress-container .progress-bar.${className}`)
    if (progressBar) {
      const percentage = ((value - min) / (max - min)) * 100
      progressBar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`
    }
  }

  async function fetchDevicesStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      updateSwitchUI("led", data.led)
      updateSwitchUI("fan", data.fan)
      updateSwitchUI("water", data.water)
      updateSwitchUI("heater", data.heater)
      updateSwitchUI("cooler", data.cooler)
    } catch (error) {
      console.error("상태 가져오기 실패:", error)
    }
  }

  async function fetchRealtimeData() {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-data?farm_id=${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      const processedData = data.map((item) => ({
        time: new Date(item.time_interval).toLocaleString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: Number.parseFloat(item.avg_temperature),
        humidity: Number.parseFloat(item.avg_humidity),
        soil: Number.parseFloat(item.avg_soil_moisture),
        co2: Number.parseInt(item.avg_co2),
      }))
      return processedData
    } catch (error) {
      console.error("데이터 가져오기 오류:", error)
      return []
    }
  }

  async function updateChartData() {
    const realtimeData = await fetchRealtimeData()
    const realtimeChartEl = document.getElementById("realtime-chart")
    if (!realtimeChartEl) return

    const ctx = realtimeChartEl.getContext("2d")
    if (!window.realtimeChart) {
      window.realtimeChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: realtimeData.map((item) => item.time),
          datasets: [
            {
              label: "온도 (°C)",
              data: realtimeData.map((item) => item.temperature),
              borderColor: "rgb(249, 115, 22)",
              backgroundColor: "rgba(249, 115, 22, 0.1)",
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: "y1",
            },
            {
              label: "습도 (%)",
              data: realtimeData.map((item) => item.humidity),
              borderColor: "rgb(59, 130, 246)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: "y1",
            },
            {
              label: "토양 수분 (%)",
              data: realtimeData.map((item) => item.soil),
              borderColor: "rgb(255, 223, 0)",
              backgroundColor: "rgba(255, 223, 0, 0.1)",
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: "y1",
            },
            {
              label: "CO2 (ppm)",
              data: realtimeData.map((item) => item.co2),
              borderColor: "rgb(16, 185, 129)",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: "y2",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: "#000000" } },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            y1: { beginAtZero: false, position: "left", ticks: { max: 80, min: 0, color: "#000000" } },
            y2: {
              beginAtZero: false,
              position: "right",
              grid: { drawOnChartArea: false },
              ticks: { max: 1000, min: 0, color: "#000000" },
            },
          },
        },
      })
    } else {
      window.realtimeChart.data.labels = realtimeData.map((item) => item.time)
      window.realtimeChart.data.datasets[0].data = realtimeData.map((item) => item.temperature)
      window.realtimeChart.data.datasets[1].data = realtimeData.map((item) => item.humidity)
      window.realtimeChart.data.datasets[2].data = realtimeData.map((item) => item.soil)
      window.realtimeChart.data.datasets[3].data = realtimeData.map((item) => item.co2)
      window.realtimeChart.update()
    }
  }

  function getCssVariable(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  }

  async function fetchHistoryData() {
    const historyDateEl = document.getElementById("history-date")
    if (!historyDateEl) {
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
    }

    const selectedDate = historyDateEl.innerText.split(" (")[0]
    const formattedDate = selectedDate
      .replace("년", "-")
      .replace("월", "-")
      .replace("일", "")
      .replace(/\s+/g, "")
      .trim()
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(formattedDate)) {
      console.error("날짜 형식이 잘못되었습니다:", formattedDate)
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
    }
    try {
      const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${formattedDate}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      if (!Array.isArray(data)) {
        console.error("서버 응답 데이터가 배열이 아닙니다.", data)
        return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
      }
      const processedData = {
        timeLabels: data.map((item) =>
          new Date(item.time_interval).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
        ),
        temperatureData: data.map((item) => Number.parseFloat(item.avg_temperature)),
        humidityData: data.map((item) => Number.parseFloat(item.avg_humidity)),
        soilData: data.map((item) => Number.parseFloat(item.avg_soil_moisture)),
        co2Data: data.map((item) => Number.parseInt(item.avg_co2)),
      }
      return processedData
    } catch (error) {
      console.error("기록 데이터 가져오기 오류:", error)
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
    }
  }

  const timeLabels = []
  const temperatureData = []
  const humidityData = []
  const soilData = []
  const co2Data = []

  async function updateHistoryChartData() {
    const historyData = await fetchHistoryData()

    // 온도 차트 업데이트
    const temperatureCanvasEl = document.getElementById("temperature-canvas")
    if (temperatureCanvasEl) {
      const ctx = temperatureCanvasEl.getContext("2d")
      if (!window.temperatureChart) {
        window.temperatureChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: historyData.timeLabels,
            datasets: [
              {
                label: "온도 (°C)",
                data: historyData.temperatureData,
                borderColor: "rgb(249, 115, 22)",
                backgroundColor: "rgba(249, 115, 22, 0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false, labels: { color: "#000000" } },
              tooltip: { mode: "index", intersect: false },
            },
            scales: {
              y: { min: 0, max: 40, title: { display: true, text: "온도 (°C)" }, ticks: { color: "#000000" } },
            },
          },
        })
      } else {
        window.temperatureChart.data.labels = historyData.timeLabels
        window.temperatureChart.data.datasets[0].data = historyData.temperatureData
        window.temperatureChart.update()
      }
    }

    // 습도 차트 업데이트
    const humidityCanvasEl = document.getElementById("humidity-canvas")
    if (humidityCanvasEl) {
      const ctx = humidityCanvasEl.getContext("2d")
      if (!window.humidityChart) {
        window.humidityChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: historyData.timeLabels,
            datasets: [
              {
                label: "습도 (%)",
                data: historyData.humidityData,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false, labels: { color: "#000000" } },
              tooltip: { mode: "index", intersect: false },
            },
            scales: {
              y: { min: 0, max: 100, title: { display: true, text: "습도 (%)" }, ticks: { color: "#000000" } },
            },
          },
        })
      } else {
        window.humidityChart.data.labels = historyData.timeLabels
        window.humidityChart.data.datasets[0].data = historyData.humidityData
        window.humidityChart.update()
      }
    }

    // 토양 수분 차트 업데이트
    const soilCanvasEl = document.getElementById("soil-canvas")
    if (soilCanvasEl) {
      const ctx = soilCanvasEl.getContext("2d")
      if (!window.soilChart) {
        window.soilChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: historyData.timeLabels,
            datasets: [
              {
                label: "토양 수분 (%)",
                data: historyData.soilData,
                borderColor: "rgb(217, 119, 6)",
                backgroundColor: "rgba(217, 119, 6, 0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false, labels: { color: "#000000" } },
              tooltip: { mode: "index", intersect: false },
            },
            scales: {
              y: { min: 0, max: 100, title: { display: true, text: "토양 수분 (%)" }, ticks: { color: "#000000" } },
            },
          },
        })
      } else {
        window.soilChart.data.labels = historyData.timeLabels
        window.soilChart.data.datasets[0].data = historyData.soilData
        window.soilChart.update()
      }
    }

    // CO2 차트 업데이트
    const co2CanvasEl = document.getElementById("co2-canvas")
    if (co2CanvasEl) {
      const ctx = co2CanvasEl.getContext("2d")
      if (!window.co2Chart) {
        window.co2Chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: historyData.timeLabels,
            datasets: [
              {
                label: "CO2 (ppm)",
                data: historyData.co2Data,
                borderColor: "rgb(16, 185, 129)",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false, labels: { color: "#000000" } },
              tooltip: { mode: "index", intersect: false },
            },
            scales: {
              y: { min: 0, max: 1000, title: { display: true, text: "CO2 (ppm)" }, ticks: { color: "#000000" } },
            },
          },
        })
      } else {
        window.co2Chart.data.labels = historyData.timeLabels
        window.co2Chart.data.datasets[0].data = historyData.co2Data
        window.co2Chart.update()
      }
    }
  }

  async function updateSummaryChart() {
    const historyData = await fetchHistoryData()
    const avgTemperature = roundToTwo(average(historyData.temperatureData))
    const avgHumidity = roundToTwo(average(historyData.humidityData))
    const avgSoil = roundToTwo(average(historyData.soilData))
    const avgCo2 = roundToTwo(average(historyData.co2Data))

    const summaryChartEl = document.getElementById("summary-chart")
    if (!summaryChartEl) return

    const ctx = summaryChartEl.getContext("2d")
    if (!window.summaryChart) {
      window.summaryChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["평균값"],
          datasets: [
            {
              label: "온도 (°C)",
              data: [avgTemperature],
              backgroundColor: "rgba(249, 115, 22, 0.7)",
              borderColor: "rgb(249, 115, 22)",
              borderWidth: 1,
            },
            {
              label: "습도 (%)",
              data: [avgHumidity],
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgb(59, 130, 246)",
              borderWidth: 1,
            },
            {
              label: "토양 수분 (%)",
              data: [avgSoil],
              backgroundColor: "rgba(217, 119, 6, 0.7)",
              borderColor: "rgb(217, 119, 6)",
              borderWidth: 1,
            },
            {
              label: "CO2 (ppm/10)",
              data: [avgCo2 / 10],
              backgroundColor: "rgba(16, 185, 129, 0.7)",
              borderColor: "rgb(16, 185, 129)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: "#000000" } },
            tooltip: {
              callbacks: {
                label: (context) => {
                  let label = context.dataset.label || ""
                  if (label) label += ": "
                  if (context.dataset.label === "CO2 (ppm/10)") {
                    label += context.raw * 10
                  } else {
                    label += context.raw
                  }
                  return label
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: "#000000" } },
            x: { beginAtZero: true, ticks: { color: "#000000" } },
          },
        },
      })
    } else {
      window.summaryChart.data.datasets[0].data = [avgTemperature]
      window.summaryChart.data.datasets[1].data = [avgHumidity]
      window.summaryChart.data.datasets[2].data = [avgSoil]
      window.summaryChart.data.datasets[3].data = [avgCo2 / 10]
      window.summaryChart.update()
    }
  }

  function average(dataArray) {
    if (dataArray.length === 0) return 0
    const sum = dataArray.reduce((acc, value) => acc + value, 0)
    return sum / dataArray.length
  }

  function roundToTwo(num) {
    return Math.round(num * 100) / 100
  }

  async function updateAllCharts() {
    const historyData = await fetchHistoryData()
    if (
      !historyData.timeLabels ||
      !historyData.temperatureData ||
      !historyData.humidityData ||
      !historyData.soilData ||
      !historyData.co2Data
    ) {
      console.error("History data가 부족합니다")
      return
    }

    if (window.temperatureChart) {
      window.temperatureChart.data.labels = historyData.timeLabels
      window.temperatureChart.data.datasets[0].data = historyData.temperatureData
      window.temperatureChart.update()
    }

    if (window.humidityChart) {
      window.humidityChart.data.labels = historyData.timeLabels
      window.humidityChart.data.datasets[0].data = historyData.humidityData
      window.humidityChart.update()
    }

    if (window.soilChart) {
      window.soilChart.data.labels = historyData.timeLabels
      window.soilChart.data.datasets[0].data = historyData.soilData
      window.soilChart.update()
    }

    if (window.co2Chart) {
      window.co2Chart.data.labels = historyData.timeLabels
      window.co2Chart.data.datasets[0].data = historyData.co2Data
      window.co2Chart.update()
    }

    const tempAvg = historyData.temperatureData.reduce((a, b) => a + b, 0) / historyData.temperatureData.length
    const humidityAvg = historyData.humidityData.reduce((a, b) => a + b, 0) / historyData.humidityData.length
    const soilAvg = historyData.soilData.reduce((a, b) => a + b, 0) / historyData.soilData.length
    const co2Avg = historyData.co2Data.reduce((a, b) => a + b, 0) / historyData.co2Data.length / 10

    if (window.summaryChart) {
      window.summaryChart.data.datasets[0].data = [tempAvg.toFixed(1)]
      window.summaryChart.data.datasets[1].data = [humidityAvg.toFixed(1)]
      window.summaryChart.data.datasets[2].data = [soilAvg.toFixed(1)]
      window.summaryChart.data.datasets[3].data = [co2Avg.toFixed(1)]
      window.summaryChart.update()
    }
  }

  async function updateDevice(device) {
    try {
      if (farmId) {
        const switchElement = document.getElementById(`${device}-switch`)
        if (!switchElement) return

        const isChecked = switchElement.checked
        const response = await fetch(`${API_BASE_URL}/devices/force-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farm_id: farmId, device: device, status: isChecked }),
        })
        if (!response.ok) throw new Error("서버 응답 실패")
        updateSwitchUI(device, isChecked)
      } else {
        console.error("user_id 또는 farm_id가 존재하지 않습니다.")
      }
    } catch (error) {
      console.error("상태 변경 실패:", error)
    }
  }

  function updateSwitchUI(device, status) {
    const switchElement = document.getElementById(`${device}-switch`)
    const iconElement = document.getElementById(`${device}-icon`)
    const statusElement = document.getElementById(`${device}-status`)

    if (!switchElement || !iconElement || !statusElement) return

    if (status) {
      switchElement.checked = true
      iconElement.classList.add("active")
      statusElement.textContent = "켜짐"
      if (device === "fan") {
        const fanIcon = iconElement.querySelector("i")
        if (fanIcon) fanIcon.classList.add("spin")
      }
    } else {
      switchElement.checked = false
      iconElement.classList.remove("active")
      statusElement.textContent = "꺼짐"
      if (device === "fan") {
        const fanIcon = iconElement.querySelector("i")
        if (fanIcon) fanIcon.classList.remove("spin")
      }
    }
  }

  const devices = ["led", "fan", "water", "heater", "cooler"]
  devices.forEach((device) => {
    const switchElement = document.getElementById(`${device}-switch`)
    if (switchElement) {
      switchElement.addEventListener("change", () => {
        updateDevice(device)
      })
    }
  })

  const panel = document.querySelector(".floating-panel")
  if (panel) {
    panel.style.top = "57.5%"
    panel.style.transform = "translateY(-50%)"
    panel.style.position = "fixed"
  }

  const settingsBtn = document.getElementById("settingsBtn")
  const settingsPanel = document.getElementById("settingsPanel")
  const closeSettings = document.getElementById("closeSettings")
  const saveSettings = document.getElementById("saveSettings")

  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener("click", () => {
      settingsPanel.style.display = "block"
    })
  }

  if (closeSettings && settingsPanel) {
    closeSettings.addEventListener("click", () => {
      settingsPanel.style.display = "none"
    })
  }

  if (saveSettings && settingsPanel) {
    saveSettings.addEventListener("click", () => {
      if (updateFarmOptimalValues()) {
        settingsPanel.style.display = "none"
        alert("최적 수치가 저장되었습니다.")
      }
    })
  }

  let allAlarms = []

  function formatDateTime(dateString) {
    const date = new Date(dateString)
    const offset = 9 * 60
    const kstDate = new Date(date.getTime() - offset * 60000)
    return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ${kstDate.getHours()}시 ${kstDate.getMinutes()}분`
  }

  async function fetchAlarm() {
    try {
      const response = await fetch(`${API_BASE_URL}/getAlarm?farm_id=${farmId}`);
      if (!response.ok) throw new Error("네트워크 오류:" + response.statusText);
      const data = await response.json();
      allAlarms = data.sort((a, b) => a.type.localeCompare(b.type) || new Date(b.created_at) - new Date(a.created_at));
      const latestDanger = allAlarms.find((alarm) => alarm.type === "위험") || {
        content: "알림 없음",
        created_at: "시간",
      };
      const latestWarning = allAlarms.find((alarm) => alarm.type === "경고") || {
        content: "알림 없음",
        created_at: "시간",
      };
      const latestComplete = allAlarms.find((alarm) => alarm.type === "완료") || {
        content: "알림 없음",
        created_at: "시간",
      };

      const dangerHeadEl = document.querySelector(".danger-head");
      const dangerTimeEl = document.querySelector(".danger-time");
      const warningHeadEl = document.querySelector(".warning-head");
      const warningTimeEl = document.querySelector(".warning-time");
      const completeHeadEl = document.querySelector(".complete-head");
      const completeTimeEl = document.querySelector(".complete-time");

      if (latestDanger.content !== "알림 없음" && dangerHeadEl && dangerTimeEl) {
        dangerHeadEl.innerHTML = latestDanger.content;
        dangerTimeEl.textContent = formatDateTime(latestDanger.created_at);
      } else if (dangerHeadEl && dangerTimeEl) {
        dangerHeadEl.textContent = "알림 없음";
        dangerTimeEl.textContent = "시간";
      }

      if (latestWarning.content !== "알림 없음" && warningHeadEl && warningTimeEl) {
        warningHeadEl.innerHTML =latestWarning.content;
        warningTimeEl.textContent = formatDateTime(latestWarning.created_at);
      } else if (warningHeadEl && warningTimeEl) {
        warningHeadEl.textContent = "알림 없음";
        warningTimeEl.textContent = "시간";
      }

      if (latestComplete.content !== "알림 없음" && completeHeadEl && completeTimeEl) {
        completeHeadEl.innerHTML = latestComplete.content;
        completeTimeEl.textContent = formatDateTime(latestComplete.created_at);
      } else if (completeHeadEl && completeTimeEl) {
        completeHeadEl.textContent = "알림 없음";
        completeTimeEl.textContent = "시간";
      }
    } catch (error) {
      console.error("알림 불러오기 실패:", error);
    }
    fetchAlarmList();
  }

  function fetchAlarmList() {
    const alarmListTableBody = document.querySelector("#alarm-list-table tbody");
    const alarmFilter = document.querySelector("#alarm-filter");
    if (!alarmListTableBody || !alarmFilter) {
      console.error("필터 또는 테이블 요소를 찾을 수 없습니다.");
      return;
    }

    const selectedType = alarmFilter.value;
    alarmListTableBody.innerHTML = "";

    if (allAlarms.length === 0) {
      alarmListTableBody.innerHTML = '<tr><td colspan="4">알림이 없습니다.</td></tr>';
    } else {
      const sortedAlarms = allAlarms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const filteredAlarms = sortedAlarms.filter((alarm) => !selectedType || alarm.type === selectedType);

      filteredAlarms.forEach((alarm) => {
        const tr = document.createElement("tr");
        const icon = getIconForType(alarm.type);

        const contentTd = document.createElement("td");
        contentTd.textContent = alarm.content;

        const createdAtTd = document.createElement("td");
        createdAtTd.textContent = formatDateTime(alarm.created_at);

        const deviceTd = document.createElement("td");
        deviceTd.textContent = alarm.device || "장치 없음";

        const typeTd = document.createElement("td");
        typeTd.innerHTML = `${icon} ${alarm.type}`;

        tr.appendChild(contentTd);
        tr.appendChild(createdAtTd);
        tr.appendChild(deviceTd);
        tr.appendChild(typeTd);

        alarmListTableBody.appendChild(tr);
      });
    }
  }

  function getIconForType(type) {
    switch (type) {
      case "위험":
        return '<span class="banner-icon danger"><i class="fas fa-exclamation-circle"></i></span>';
      case "경고":
        return '<span class="banner-icon warning"><i class="fas fa-exclamation-triangle"></i></span>';
      case "완료":
        return '<span class="banner-icon success"><i class="fas fa-check-circle"></i></span>';
      default:
        return '';
    }
  }

  const alarmFilterEl = document.querySelector("#alarm-filter")
  if (alarmFilterEl) {
    alarmFilterEl.addEventListener("change", fetchAlarmList)
  }

  const alarmEl = document.querySelector(".alarm")
  if (alarmEl) {
    alarmEl.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"))
      const alarmTab = document.querySelector('[data-tab="alarm"]')
      if (alarmTab) alarmTab.classList.add("active")

      document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))
      const alarmTabContent = document.getElementById("alarm-tab")
      if (alarmTabContent) alarmTabContent.classList.add("active")
    })
  }

  // ===== OpenAI API 연동 추가 코드 =====
  
  // 실시간 리포트 생성 관련 변수
  let openAIReportContent = "";
  let isGeneratingOpenAIReport = false;

  // 리포트 생성 함수
  async function generateReport() {
    try {
      // 이미 생성 중이면 중복 실행 방지
      if (isGeneratingOpenAIReport) {
        alert("리포트가 이미 생성 중입니다. 잠시만 기다려주세요.");
        return;
      }

      // 리포트 생성 모달 표시
      const liveReportModal = document.getElementById("liveReportModal");
      if (liveReportModal) {
        liveReportModal.style.display = "block";
      }

      // 상태 초기화
      isGeneratingOpenAIReport = true;
      openAIReportContent = "";
      updateReportProgress(0);
      updateReportStatus("데이터 수집 중");
      
      // 현재 날짜 표시
      const today = new Date();
      const formattedDate = formatDateYMD(today);
      const reportCurrentDateEl = document.getElementById("report-current-date");
      if (reportCurrentDateEl) {
        reportCurrentDateEl.textContent = formatDate(today);
      }
      
      // 로딩 스켈레톤 표시
      const loadingSkeleton = document.getElementById("report-loading-skeleton");
      const contentContainer = document.getElementById("report-content-container");
      if (loadingSkeleton && contentContainer) {
        loadingSkeleton.style.display = "block";
        contentContainer.style.display = "none";
      }
      
      // 센서 데이터 수집
      const sensorData = await fetchSensorDataForReport(formattedDate);
      
      // 장치 로그 수집
      const deviceLogs = await fetchDeviceLogsForReport(formattedDate);
      
      // 작물 정보 수집
      const cropInfo = await fetchCropInfoForReport();
      
      // 데이터 수집 완료, 리포트 생성 시작
      updateReportProgress(20);
      updateReportStatus("리포트 생성 중");
      
      // 로딩 스켈레톤 숨기고 콘텐츠 컨테이너 표시
      if (loadingSkeleton && contentContainer) {
        loadingSkeleton.style.display = "none";
        contentContainer.style.display = "block";
      }
      
      // OpenAI API 호출 준비
      const prompt = createOpenAIPrompt(formattedDate, sensorData, deviceLogs, cropInfo);
      
      // 실제 환경에서는 아래 API 호출을 사용합니다
      // 현재는 API 키가 없으므로 시뮬레이션으로 대체합니다
      /*
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer YOUR_OPENAI_API_KEY` // 실제 API 키로 대체
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "당신은 스마트팜 데이터 분석 전문가입니다. 센서 데이터를 기반으로 상세한 리포트를 생성합니다."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`);
        }

        // 스트리밍 응답 처리
        await processOpenAIStream(response);
      } catch (error) {
        console.error("OpenAI API 호출 오류:", error);
        throw error;
      }
      */
      
      // 시뮬레이션 (실제 구현 시 제거)
      simulateReportGeneration(sensorData, deviceLogs, cropInfo);
      
      // 서버에 리포트 저장 요청
      const serverResponse = await fetch(`${API_BASE_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          date: formattedDate,
          aiAnalysis: openAIReportContent
        }),
      });
      
      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        throw new Error(errorData.error || '리포트 저장 실패');
      }
      
      await serverResponse.json();
      
      // 리포트 생성 완료
      updateReportProgress(100);
      updateReportStatus("완료");
      
      // 다운로드 버튼 활성화
      const downloadBtn = document.getElementById("downloadLiveReportBtn");
      if (downloadBtn) {
        downloadBtn.disabled = false;
      }
      
      // 리포트 목록 새로고침
      fetchReports();
      
    } catch (error) {
      console.error('리포트 생성 오류:', error);
      const reportContentEl = document.getElementById("report-content");
      if (reportContentEl) {
        reportContentEl.textContent = '리포트 생성 중 오류가 발생했습니다: ' + error.message;
      }
      updateReportStatus("오류 발생");
      updateReportProgress(100);
    } finally {
      isGeneratingOpenAIReport = false;
    }
  }

  // OpenAI 스트리밍 처리 함수
  async function processOpenAIStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    let done = false;
    let accumulatedText = "";
    let progress = 20;
    const reportContentEl = document.getElementById("report-content");
    
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content = parsed.choices[0].delta.content;
              accumulatedText += content;
              
              // 실시간 텍스트 업데이트
              if (reportContentEl) {
                reportContentEl.textContent = accumulatedText;
                reportContentEl.scrollTop = reportContentEl.scrollHeight;
              }
              
              // 진행률 업데이트 (20%에서 시작해서 100%까지)
              progress = Math.min(20 + Math.floor((accumulatedText.length / 3000) * 80), 100);
              updateReportProgress(progress);
            }
          } catch (e) {
            console.error('JSON 파싱 오류:', e);
          }
        }
      }
    }
    
    // 완료 처리
    openAIReportContent = accumulatedText;
    return accumulatedText;
  }

  // 리포트 생성을 위한 센서 데이터 수집
  async function fetchSensorDataForReport(date) {
    try {
      const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${date}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("센서 데이터 가져오기 실패");
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return {
          temperature: { avg: 25.7, min: { value: 21.3, time: '05:15' }, max: { value: 32.1, time: '14:30' } },
          humidity: { avg: 58.2, min: { value: 48.2, time: '14:45' }, max: { value: 68.5, time: '06:20' } },
          soil_moisture: { avg: 52.8, min: { value: 42.1, time: '18:30' }, max: { value: 65.3, time: '09:10' } },
          co2: { avg: 450, min: { value: 380, time: '03:45' }, max: { value: 520, time: '12:15' } }
        };
      }
      
      // 데이터 처리
      const temperatureValues = data.map(item => Number.parseFloat(item.avg_temperature));
      const humidityValues = data.map(item => Number.parseFloat(item.avg_humidity));
      const soilValues = data.map(item => Number.parseFloat(item.avg_soil_moisture));
      const co2Values = data.map(item => Number.parseInt(item.avg_co2));
      
      // 최소/최대값 및 시간 찾기
      const tempMin = Math.min(...temperatureValues);
      const tempMax = Math.max(...temperatureValues);
      const humidMin = Math.min(...humidityValues);
      const humidMax = Math.max(...humidityValues);
      const soilMin = Math.min(...soilValues);
      const soilMax = Math.max(...soilValues);
      const co2Min = Math.min(...co2Values);
      const co2Max = Math.max(...co2Values);
      
      const tempMinIndex = temperatureValues.indexOf(tempMin);
      const tempMaxIndex = temperatureValues.indexOf(tempMax);
      const humidMinIndex = humidityValues.indexOf(humidMin);
      const humidMaxIndex = humidityValues.indexOf(humidMax);
      const soilMinIndex = soilValues.indexOf(soilMin);
      const soilMaxIndex = soilValues.indexOf(soilMax);
      const co2MinIndex = co2Values.indexOf(co2Min);
      const co2MaxIndex = co2Values.indexOf(co2Max);
      
      const tempMinTime = new Date(data[tempMinIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const tempMaxTime = new Date(data[tempMaxIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const humidMinTime = new Date(data[humidMinIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const humidMaxTime = new Date(data[humidMaxIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const soilMinTime = new Date(data[soilMinIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const soilMaxTime = new Date(data[soilMaxIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const co2MinTime = new Date(data[co2MinIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const co2MaxTime = new Date(data[co2MaxIndex].time_interval).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      
      return {
        temperature: {
          avg: average(temperatureValues).toFixed(1),
          min: { value: tempMin.toFixed(1), time: tempMinTime },
          max: { value: tempMax.toFixed(1), time: tempMaxTime }
        },
        humidity: {
          avg: average(humidityValues).toFixed(1),
          min: { value: humidMin.toFixed(1), time: humidMinTime },
          max: { value: humidMax.toFixed(1), time: humidMaxTime }
        },
        soil_moisture: {
          avg: average(soilValues).toFixed(1),
          min: { value: soilMin.toFixed(1), time: soilMinTime },
          max: { value: soilMax.toFixed(1), time: soilMaxTime }
        },
        co2: {
          avg: Math.round(average(co2Values)),
          min: { value: co2Min, time: co2MinTime },
          max: { value: co2Max, time: co2MaxTime }
        }
      };
    } catch (error) {
      console.error("센서 데이터 가져오기 오류:", error);
      // 기본값 반환
      return {
        temperature: { avg: 25.7, min: { value: 21.3, time: '05:15' }, max: { value: 32.1, time: '14:30' } },
        humidity: { avg: 58.2, min: { value: 48.2, time: '14:45' }, max: { value: 68.5, time: '06:20' } },
        soil_moisture: { avg: 52.8, min: { value: 42.1, time: '18:30' }, max: { value: 65.3, time: '09:10' } },
        co2: { avg: 450, min: { value: 380, time: '03:45' }, max: { value: 520, time: '12:15' } }
      };
    }
  }

  // 리포트 생성을 위한 장치 로그 수집
  async function fetchDeviceLogsForReport(date) {
    try {
      const response = await fetch(`${API_BASE_URL}/device-logs?farm_id=${farmId}&date=${date}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("장치 로그 가져오기 실패");
      
      const data = await response.json();
      
      // 데이터 처리
      return {
        led: { 
          status: data.led?.status || 'on', 
          duration: data.led?.duration || '12시간 (06:00 ~ 18:00)' 
        },
        fan: { 
          count: data.fan?.count || 5, 
          total_time: data.fan?.total_time || 120 
        },
        water: { 
          count: data.water?.count || 3, 
          total_amount: data.water?.total_amount || 2.5 
        },
        heater: { 
          count: data.heater?.count || 2, 
          total_time: data.heater?.total_time || 45 
        },
        cooler: { 
          count: data.cooler?.count || 4, 
          total_time: data.cooler?.total_time || 90 
        }
      };
    } catch (error) {
      console.error("장치 로그 가져오기 오류:", error);
      // 기본값 반환
      return {
        led: { status: 'on', duration: '12시간 (06:00 ~ 18:00)' },
        fan: { count: 5, total_time: 120 },
        water: { count: 3, total_amount: 2.5 },
        heater: { count: 2, total_time: 45 },
        cooler: { count: 4, total_time: 90 }
      };
    }
  }

  // 리포트 생성을 위한 작물 정보 수집
  async function fetchCropInfoForReport() {
    try {
      const response = await fetch(`${API_BASE_URL}/get-farm-status/${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("작물 정보 가져오기 실패");
      
      const data = await response.json();
      
      // 데이터 처리
      return {
        type: farmType || '토마토',
        growth_stage: getGrowthStageText(data.growthRate || 65),
        growth_rate: data.growthRate || 65,
        start_date: data.startDate || '2023-04-15',
        harvest_date: data.harvestDate || '2023-06-15'
      };
    } catch (error) {
      console.error("작물 정보 가져오기 오류:", error);
      // 기본값 반환
      return {
        type: farmType || '토마토',
        growth_stage: '성장기',
        growth_rate: 65,
        start_date: '2023-04-15',
        harvest_date: '2023-06-15'
      };
    }
  }

  // 성장 단계 텍스트 반환
  function getGrowthStageText(growthRate) {
    if (growthRate <= 10) return "씨앗";
    if (growthRate <= 35) return "새싹";
    if (growthRate < 100) return "성장기";
    return "열매";
  }

  // OpenAI 프롬프트 생성
  function createOpenAIPrompt(date, sensorData, deviceLogs, cropInfo) {
    return `
다음 스마트팜 데이터를 기반으로 일일 리포트를 생성해주세요.
날짜: ${date}

센서 데이터 요약:
- 평균 온도: ${sensorData.temperature.avg}°C (최저: ${sensorData.temperature.min.value}°C (${sensorData.temperature.min.time}), 최고: ${sensorData.temperature.max.value}°C (${sensorData.temperature.max.time}))
- 평균 습도: ${sensorData.humidity.avg}% (최저: ${sensorData.humidity.min.value}% (${sensorData.humidity.min.time}), 최고: ${sensorData.humidity.max.value}% (${sensorData.humidity.max.time}))
- 평균 토양 수분: ${sensorData.soil_moisture.avg}% (최저: ${sensorData.soil_moisture.min.value}% (${sensorData.soil_moisture.min.time}), 최고: ${sensorData.soil_moisture.max.value}% (${sensorData.soil_moisture.max.time}))
- 평균 CO₂ 농도: ${sensorData.co2.avg}ppm (최저: ${sensorData.co2.min.value}ppm (${sensorData.co2.min.time}), 최고: ${sensorData.co2.max.value}ppm (${sensorData.co2.max.time}))

장치 작동 기록:
- LED: 작동 시간 ${deviceLogs.led.duration}
- 환기팬: 작동 횟수 ${deviceLogs.fan.count}회, 총 작동 시간 ${deviceLogs.fan.total_time}분
- 급수장치: 급수 횟수 ${deviceLogs.water.count}회, 총 급수량 ${deviceLogs.water.total_amount}L
- 히터: 작동 횟수 ${deviceLogs.heater.count}회, 총 작동 시간 ${deviceLogs.heater.total_time}분
- 쿨러: 작동 횟수 ${deviceLogs.cooler.count}회, 총 작동 시간 ${deviceLogs.cooler.total_time}분

작물 정보:
- 작물 종류: ${cropInfo.type}
- 성장 단계: ${cropInfo.growth_stage} (성장률 ${cropInfo.growth_rate}%)
- 재배 시작일: ${cropInfo.start_date}
- 예상 수확일: ${cropInfo.harvest_date}

리포트는 다음 섹션으로 구성해주세요:
1. 일일 환경 조건 요약
2. 센서 데이터 분석 및 추이
3. 장치 작동 분석
4. 작물 성장 상태 평가
5. 문제점 및 개선 사항
6. 내일을 위한 권장 사항

각 섹션은 상세하게 작성하고, 데이터를 기반으로 한 인사이트를 제공해주세요.
`;
  }

  // 진행 상태 바 업데이트
  function updateReportProgress(percentage) {
    const progressBarEl = document.getElementById("report-progress-bar");
    const progressTextEl = document.getElementById("report-progress-percentage");
    
    if (progressBarEl && progressTextEl) {
      progressBarEl.style.width = `${percentage}%`;
      progressTextEl.textContent = `${percentage}%`;
    }
  }

  // 리포트 상태 배지 업데이트
  function updateReportStatus(status) {
    const statusTextEl = document.getElementById("report-status-text");
    const statusBadgeEl = document.getElementById("report-status-badge");
    
    if (statusTextEl) {
      statusTextEl.textContent = status;
    }
    
    if (statusBadgeEl) {
      // 상태에 따라 배지 색상 변경
      if (status === "데이터 수집 중" || status === "데이터 분석 중") {
        statusBadgeEl.style.backgroundColor = "var(--primary-color)";
      } else if (status === "리포트 생성 중") {
        statusBadgeEl.style.backgroundColor = "var(--warning-color)";
      } else if (status === "완료") {
        statusBadgeEl.style.backgroundColor = "var(--success-color)";
      } else if (status === "오류 발생") {
        statusBadgeEl.style.backgroundColor = "var(--danger-color)";
      }
    }
  }

  // 리포트 모달 닫기
  function closeLiveReportModal() {
    const liveReportModal = document.getElementById("liveReportModal");
    if (liveReportModal) {
      liveReportModal.style.display = "none";
    }
  }

  // 리포트 다운로드
  function downloadLiveReport() {
    if (!openAIReportContent) return;
    
    const today = new Date();
    const formattedDate = formatDateYMD(today);
    const filename = `스마트팜_AI리포트_${formattedDate}.txt`;
    
    const header = `스마트팜 일일 AI 리포트
날짜: ${formatDate(today)}

`;
    const fullContent = header + openAIReportContent;
    
    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 리포트 생성 시뮬레이션
  function simulateReportGeneration(sensorData, deviceLogs, cropInfo) {
    const sampleReport = `# 스마트팜 일일 리포트

## 1. 일일 환경 조건 요약

오늘의 스마트팜 환경은 전반적으로 ${cropInfo.type} 재배에 적합한 조건을 유지했습니다. 평균 온도는 ${sensorData.temperature.avg}°C로 적정 범위 내에 있었으며, 습도는 평균 ${sensorData.humidity.avg}%를 기록했습니다. 토양 수분은 ${sensorData.soil_moisture.avg}%로 유지되었고, CO₂ 농도는 ${sensorData.co2.avg}ppm으로 측정되었습니다.

## 2. 센서 데이터 분석 및 추이

### 온도 분석
- 평균: ${sensorData.temperature.avg}°C
- 최저: ${sensorData.temperature.min.value}°C (${sensorData.temperature.min.time})
- 최고: ${sensorData.temperature.max.value}°C (${sensorData.temperature.max.time})

오전에는 온도가 낮게 유지되다가 오후 2시경 최고치인 ${sensorData.temperature.max.value}°C까지 상승했습니다. 이는 일반적인 일일 온도 변화 패턴과 일치하며, 최고 온도가 ${cropInfo.type}의 최적 생장 온도를 약간 초과했으나 심각한 수준은 아니었습니다.

### 습도 분석
- 평균: ${sensorData.humidity.avg}%
- 최저: ${sensorData.humidity.min.value}% (${sensorData.humidity.min.time})
- 최고: ${sensorData.humidity.max.value}% (${sensorData.humidity.max.time})

습도는 아침에 가장 높았고 오후에 점차 감소하는 패턴을 보였습니다. 이러한 패턴은 자연적인 일일 습도 변화와 일치하며, 전반적으로 작물 생장에 적합한 범위를 유지했습니다.

### 토양 수분 분석
- 평균: ${sensorData.soil_moisture.avg}%
- 최저: ${sensorData.soil_moisture.min.value}% (${sensorData.soil_moisture.min.time})
- 최고: ${sensorData.soil_moisture.max.value}% (${sensorData.soil_moisture.max.time})

토양 수분은 오전 급수 후 최고치를 기록했으며, 저녁에 최저치를 기록했습니다. 하루 중 변동폭이 적절한 수준의 변화를 보였습니다.

### CO₂ 농도 분석
- 평균: ${sensorData.co2.avg}ppm
- 최저: ${sensorData.co2.min.value}ppm (${sensorData.co2.min.time})
- 최고: ${sensorData.co2.max.value}ppm (${sensorData.co2.max.time})

CO₂ 농도는 식물의 광합성 활동이 활발한 낮 시간대에 증가하는 패턴을 보였으며, 전반적으로 적정 범위 내에서 유지되었습니다.

## 3. 장치 작동 분석

### LED 조명
- 작동 시간: ${deviceLogs.led.duration}
- 분석: 식물 생장에 필요한 적정 광주기를 제공했습니다.

### 환기팬
- 작동 횟수: ${deviceLogs.fan.count}회
- 총 작동 시간: ${deviceLogs.fan.total_time}분
- 분석: 주로 온도가 상승한 오후 시간대에 작동하여 온도 조절에 기여했습니다.

### 급수 시스템
- 급수 횟수: ${deviceLogs.water.count}회
- 총 급수량: ${deviceLogs.water.total_amount}L
- 분석: 토양 수분이 감소할 때 적절히 작동하여 수분 수준을 유지했습니다.

### 히터
- 작동 횟수: ${deviceLogs.heater.count}회
- 총 작동 시간: ${deviceLogs.heater.total_time}분
- 분석: 주로 이른 아침 시간대에 작동하여 최저 온도를 적정 수준으로 유지했습니다.

### 쿨러
- 작동 횟수: ${deviceLogs.cooler.count}회
- 총 작동 시간: ${deviceLogs.cooler.total_time}분
- 분석: 온도가 최고치에 도달한 오후 시간대에 작동하여 과열을 방지했습니다.

## 4. 작물 성장 상태 평가

현재 ${cropInfo.type}은(는) ${cropInfo.growth_stage} 단계에 있으며, 성장률은 ${cropInfo.growth_rate}%입니다. 시작일(${cropInfo.start_date})부터 현재까지의 성장 속도는 예상 수확일(${cropInfo.harvest_date})에 맞춰 적절히 진행되고 있습니다.

잎의 색상과 크기는 정상적이며, 줄기의 강도도 양호합니다. 현재 성장 단계에서 기대되는 발달 수준에 부합하고 있으며, 특별한 이상 징후는 관찰되지 않았습니다.

## 5. 문제점 및 개선 사항

### 식별된 문제점
1. 오후 2시경 온도가 최적 범위를 약간 초과했습니다.
2. 저녁 시간대 토양 수분이 다소 낮아졌습니다.

### 개선 사항
1. 온도 관리: 오후 시간대에 쿨러 작동 시간을 약간 늘리거나, 차광막을 활용하여 온도 상승을 제한하는 것이 좋겠습니다.
2. 수분 관리: 저녁 급수 일정을 조정하여 밤 시간대 토양 수분 감소를 방지하는 것이 좋겠습니다.

## 6. 내일을 위한 권장 사항

1. 급수 일정 조정: 저녁 시간대(17:00-18:00)에 추가 급수를 실시하여 밤 시간 동안 토양 수분 수준을 유지하세요.
2. 환기 시스템 최적화: 오후 1시부터 3시까지 환기팬 작동 빈도를 높여 온도 상승을 제한하세요.
3. 영양분 관리: 현재 성장 단계에 맞는 영양분 공급을 유지하세요.
4. 모니터링 강화: 내일은 특히 오후 시간대 온도와 저녁 시간대 토양 수분을 주의 깊게 모니터링하세요.

이상의 권장 사항을 따르면 작물의 건강한 성장을 촉진하고 잠재적인 문제를 예방할 수 있을 것입니다.`;

    // 텍스트를 한 글자씩 출력하는 시뮬레이션
    let index = 0;
    const reportContentEl = document.getElementById("report-content");
    const typingInterval = setInterval(() => {
      if (index < sampleReport.length) {
        openAIReportContent += sampleReport.charAt(index);
        reportContentEl.textContent = openAIReportContent;
        
        // 스크롤을 항상 아래로 유지
        reportContentEl.scrollTop = reportContentEl.scrollHeight;
        
        // 진행률 업데이트 (20%에서 시작해서 100%까지)
        const progress = Math.min(20 + Math.floor((index / sampleReport.length) * 80), 100);
        updateReportProgress(progress);
        
        index++;
      } else {
        // 타이핑 완료
        clearInterval(typingInterval);
        updateReportStatus("완료");
        isGeneratingOpenAIReport = false;
        
        // 다운로드 버튼 활성화
        const downloadBtn = document.getElementById("downloadLiveReportBtn");
        if (downloadBtn) {
          downloadBtn.disabled = false;
        }
      }
    }, 20); // 타이핑 속도 조절 (밀리초)
  }

  // 리포트 목록 조회 함수
  async function fetchReports() {
    try {
      const response = await fetch(`${API_BASE_URL}/get-reports/${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("리포트 조회 실패")
      const reports = await response.json()

      const diaryEntries = document.getElementById("diaryEntries")
      const reportCount = document.getElementById("reportCount")

      if (!diaryEntries || !reportCount) return

      diaryEntries.innerHTML = ""
      reportCount.textContent = `${reports.length}개`

      if (reports.length === 0) {
        diaryEntries.innerHTML = '<li class="no-reports">생성된 리포트가 없습니다.</li>'
      } else {
        // 날짜 기준으로 정렬 (최신순)
        const sortedReports = reports.sort((a, b) => new Date(b.date) - new Date(a.date))

        sortedReports.forEach((report) => {
          const li = document.createElement("li")
          li.className = "diary-entry"

          // 날짜 형식 변환 (YYYY-MM-DD -> YYYY년 MM월 DD일)
          const reportDate = new Date(report.date)
          const formattedDate = `${reportDate.getFullYear()}년 ${reportDate.getMonth() + 1}월 ${reportDate.getDate()}일`

          li.textContent = `${formattedDate} 리포트`
          li.addEventListener("click", () => {
            showReportModal(report)
          })
          diaryEntries.appendChild(li)
        })
      }

      // 검색 기능 설정
      const searchInput = document.getElementById("reportSearchInput")
      if (searchInput) {
        searchInput.addEventListener("input", function () {
          const searchTerm = this.value.toLowerCase()
          const entries = diaryEntries.querySelectorAll(".diary-entry")

          entries.forEach((entry) => {
            const text = entry.textContent.toLowerCase()
            if (text.includes(searchTerm)) {
              entry.style.display = ""
            } else {
              entry.style.display = "none"
            }
          })
        })
      }
    } catch (error) {
      console.error("리포트 조회 오류:", error)
      const diaryEntries = document.getElementById("diaryEntries")
      if (diaryEntries) {
        diaryEntries.innerHTML = '<li class="no-reports">리포트를 불러오는 중 오류가 발생했습니다.</li>'
      }
    }
  }

  // 리포트 모달 표시 함수
  function showReportModal(report) {
    const modal = document.getElementById("reportModal")
    if (!modal) return

    // 날짜 정보 설정
    const reportDateEl = document.getElementById("reportDate")
    if (reportDateEl) reportDateEl.textContent = report.date

    // 센서 요약 정보 설정
    const avgTempEl = document.getElementById("avgTemp")
    const avgHumidityEl = document.getElementById("avgHumidity")
    const avgSoilEl = document.getElementById("avgSoil")
    const avgCo2El = document.getElementById("avgCo2")

    if (avgTempEl) avgTempEl.textContent = `${report.sensorSummary.avg_temperature} °C`
    if (avgHumidityEl) avgHumidityEl.textContent = `${report.sensorSummary.avg_humidity} %`
    if (avgSoilEl) avgSoilEl.textContent = `${report.sensorSummary.avg_soil_moisture} %`
    if (avgCo2El) avgCo2El.textContent = `${report.sensorSummary.avg_co2} ppm`

    // 센서 변화 정보 설정
    const maxTempEl = document.getElementById("maxTemp")
    const maxTempTimeEl = document.getElementById("maxTempTime")
    const minTempEl = document.getElementById("minTemp")
    const minTempTimeEl = document.getElementById("minTempTime")

    if (maxTempEl) maxTempEl.textContent = `${report.sensorChanges.max_temperature.value} °C`
    if (maxTempTimeEl) maxTempTimeEl.textContent = report.sensorChanges.max_temperature.time
    if (minTempEl) minTempEl.textContent = `${report.sensorChanges.min_temperature.value} °C`
    if (minTempTimeEl) minTempTimeEl.textContent = report.sensorChanges.min_temperature.time

    const maxHumidityEl = document.getElementById("maxHumidity")
    const maxHumidityTimeEl = document.getElementById("maxHumidityTime")
    const minHumidityEl = document.getElementById("minHumidity")
    const minHumidityTimeEl = document.getElementById("minHumidityTime")

    if (maxHumidityEl) maxHumidityEl.textContent = `${report.sensorChanges.max_humidity.value} %`
    if (maxHumidityTimeEl) maxHumidityTimeEl.textContent = report.sensorChanges.max_humidity.time
    if (minHumidityEl) minHumidityEl.textContent = `${report.sensorChanges.min_humidity.value} %`
    if (minHumidityTimeEl) minHumidityTimeEl.textContent = report.sensorChanges.min_humidity.time

    const maxSoilEl = document.getElementById("maxSoil")
    const maxSoilTimeEl = document.getElementById("maxSoilTime")
    const minSoilEl = document.getElementById("minSoil")
    const minSoilTimeEl = document.getElementById("minSoilTime")

    if (maxSoilEl) maxSoilEl.textContent = `${report.sensorChanges.max_soil_moisture.value} %`
    if (maxSoilTimeEl) maxSoilTimeEl.textContent = report.sensorChanges.max_soil_moisture.time
    if (minSoilEl) minSoilEl.textContent = `${report.sensorChanges.min_soil_moisture.value} %`
    if (minSoilTimeEl) minSoilTimeEl.textContent = report.sensorChanges.min_soil_moisture.time

    const maxCo2El = document.getElementById("maxCo2")
    const maxCo2TimeEl = document.getElementById("maxCo2Time")
    const minCo2El = document.getElementById("minCo2")
    const minCo2TimeEl = document.getElementById("minCo2Time")

    if (maxCo2El) maxCo2El.textContent = `${report.sensorChanges.max_co2.value} ppm`
    if (maxCo2TimeEl) maxCo2TimeEl.textContent = report.sensorChanges.max_co2.time
    if (minCo2El) minCo2El.textContent = `${report.sensorChanges.min_co2.value} ppm`
    if (minCo2TimeEl) minCo2TimeEl.textContent = report.sensorChanges.min_co2.time

    // 장치 로그 정보 설정
    const ledLogEl = document.getElementById("ledLog")
    const fanLogEl = document.getElementById("fanLog")
    const waterLogEl = document.getElementById("waterLog")
    const heaterLogEl = document.getElementById("heaterLog")
    const coolerLogEl = document.getElementById("coolerLog")

    if (ledLogEl) {
      ledLogEl.textContent = report.deviceLogs.led.start
        ? `켜짐 (시작: ${report.deviceLogs.led.start}, 종료: ${report.deviceLogs.led.end})`
        : "꺼짐"
    }

    if (fanLogEl) {
      fanLogEl.textContent = `작동 횟수 ${report.deviceLogs.fan.count}회, 총 작동 시간 ${report.deviceLogs.fan.total_time}분`
    }

    if (waterLogEl) {
      waterLogEl.textContent = `급수 횟수 ${report.deviceLogs.water.count}회, 총 급수량 ${report.deviceLogs.water.total_amount} L`
    }

    if (heaterLogEl) {
      heaterLogEl.textContent = `작동 횟수 ${report.deviceLogs.heater.count}회, 총 작동 시간 ${report.deviceLogs.heater.total_time}분`
    }

    if (coolerLogEl) {
      coolerLogEl.textContent = `작동 횟수 ${report.deviceLogs.cooler.count}회, 총 작동 시간 ${report.deviceLogs.cooler.total_time}분`
    }

    // AI 분석 정보 설정
    const aiAnalysisEl = document.getElementById("aiAnalysis")
    if (aiAnalysisEl) {
      aiAnalysisEl.textContent = report.aiAnalysis || "AI 분석 데이터가 없습니다."
    }

    // 모달 표시
    modal.style.display = "block"

    // 다운로드 버튼 이벤트 설정
    const downloadReportBtn = document.getElementById("downloadReportBtn")
    if (downloadReportBtn) {
      // 이전 이벤트 리스너 제거
      const newDownloadBtn = downloadReportBtn.cloneNode(true)
      downloadReportBtn.parentNode.replaceChild(newDownloadBtn, downloadReportBtn)

      newDownloadBtn.addEventListener("click", () => {
        downloadReport(report)
      })
    }
  }

  // 리포트 다운로드 함수
  function downloadReport(report) {
    const reportText = `
스마트팜 일일 리포트
날짜: ${report.date}

1. 센서 측정 요약
평균 온도: ${report.sensorSummary.avg_temperature} °C
평균 습도: ${report.sensorSummary.avg_humidity} %
평균 토양 수분: ${report.sensorSummary.avg_soil_moisture} %
평균 CO₂ 농도: ${report.sensorSummary.avg_co2} ppm

2. 센서 수치 변화
최고 온도: ${report.sensorChanges.max_temperature.value} °C (시간: ${report.sensorChanges.max_temperature.time})
최저 온도: ${report.sensorChanges.min_temperature.value} °C (시간: ${report.sensorChanges.min_temperature.time})
최고 습도: ${report.sensorChanges.max_humidity.value} % (시간: ${report.sensorChanges.max_humidity.time})
최저 습도: ${report.sensorChanges.min_humidity.value} % (시간: ${report.sensorChanges.min_humidity.time})
최고 토양 수분: ${report.sensorChanges.max_soil_moisture.value} % (시간: ${report.sensorChanges.max_soil_moisture.time})
최저 토양 수분: ${report.sensorChanges.min_soil_moisture.value} % (시간: ${report.sensorChanges.min_soil_moisture.time})
최고 CO₂ 농도: ${report.sensorChanges.max_co2.value} ppm (시간: ${report.sensorChanges.max_co2.time})
최저 CO₂ 농도: ${report.sensorChanges.min_co2.value} ppm (시간: ${report.sensorChanges.min_co2.time})

3. 제어 장치 작동 기록
LED: ${report.deviceLogs.led.start ? `켜짐(시작: ${report.deviceLogs.led.start}, 종료: ${report.deviceLogs.led.end})` : "꺼짐"}
환기팬: 작동 횟수 ${report.deviceLogs.fan.count}회, 총 작동 시간 ${report.deviceLogs.fan.total_time}분
급수장치: 급수 횟수 ${report.deviceLogs.water.count}회, 총 급수량 ${report.deviceLogs.water.total_amount} L
히터: 작동 횟수 ${report.deviceLogs.heater.count}회, 총 작동 시간 ${report.deviceLogs.heater.total_time}분
쿨러: 작동 횟수 ${report.deviceLogs.cooler.count}회, 총 작동 시간 ${report.deviceLogs.cooler.total_time}분

4. AI 분석 및 요약
${report.aiAnalysis || "AI 분석 데이터가 없습니다."}
    `

    const blob = new Blob([reportText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `스마트팜_리포트_${report.date}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 모달 닫기 이벤트
  const closeReportModalBtn = document.getElementById("closeReportModal")
  if (closeReportModalBtn) {
    closeReportModalBtn.addEventListener("click", () => {
      const reportModal = document.getElementById("reportModal")
      if (reportModal) reportModal.style.display = "none"
    })
  }

  const closeReportBtn = document.getElementById("closeReportBtn")
  if (closeReportBtn) {
    closeReportBtn.addEventListener("click", () => {
      const reportModal = document.getElementById("reportModal")
      if (reportModal) reportModal.style.display = "none"
    })
  }

  // 모달 외부 클릭 시 닫기
  window.addEventListener("click", (event) => {
    const reportModal = document.getElementById("reportModal")
    if (reportModal && event.target === reportModal) {
      reportModal.style.display = "none"
    }
  })

  // 실시간 리포트 모달 닫기 이벤트
  const closeLiveReportModalBtn = document.getElementById("closeLiveReportModal");
  const closeLiveReportBtn = document.getElementById("closeLiveReportBtn");
  if (closeLiveReportModalBtn) {
    closeLiveReportModalBtn.addEventListener("click", closeLiveReportModal);
  }
  if (closeLiveReportBtn) {
    closeLiveReportBtn.addEventListener("click", closeLiveReportModal);
  }

  // 실시간 리포트 모달 외부 클릭 시 닫기
  window.addEventListener("click", (event) => {
    const liveReportModal = document.getElementById("liveReportModal");
    if (liveReportModal && event.target === liveReportModal) {
      closeLiveReportModal();
    }
  });

  // 실시간 리포트 다운로드 버튼 이벤트
  const downloadLiveReportBtn = document.getElementById("downloadLiveReportBtn");
  if (downloadLiveReportBtn) {
    downloadLiveReportBtn.addEventListener("click", downloadLiveReport);
  }

  // 리포트 생성 버튼 이벤트
  const generateDiaryBtn = document.getElementById("generateDiaryBtn")
  if (generateDiaryBtn) {
    generateDiaryBtn.addEventListener("click", generateReport)
  }

  // 초기 데이터 로드
  fetchData()
  updateDateDisplay()
  fetchSensorData()
  fetchDevicesStatus()
  fetchAlarm()
  fetchFarmStatus()
  fetchFarmOptimalValues()
  fetchReports() // 페이지 로드 시 리포트 목록 조회
})