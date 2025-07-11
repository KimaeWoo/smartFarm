const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app"

const growthStages = [{ text: "씨앗" }, { text: "새싹" }, { text: "성장" }, { text: "열매" }]

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
  let pendingDevice = null

  function showDurationModal(device) {
    pendingDevice = device
    document.getElementById("durationModal").style.display = "flex"
  }

  document.querySelectorAll(".switch input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (e) => {
      e.preventDefault()
      e.target.checked = !e.target.checked // 잠시 되돌림
      const device = e.target.id.split("-")[0]
      showDurationModal(device)
    })
  })

  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("customDuration").value = btn.dataset.minutes
    })
  })

  document.getElementById("cancelDuration").addEventListener("click", () => {
    document.getElementById("durationModal").style.display = "none"
    pendingDevice = null
  })

  document.getElementById("confirmDuration").addEventListener("click", () => {
    const minutes = Number.parseInt(document.getElementById("customDuration").value)
    if (!minutes || minutes <= 0) {
      alert("유효한 시간을 입력하세요")
      return
    }
    const seconds = minutes * 60
    toggleDeviceWithDuration(pendingDevice, seconds)
    document.getElementById("durationModal").style.display = "none"
  })

  async function toggleDeviceWithDuration(device, duration) {
    const switchElement = document.getElementById(`${device}-switch`)
    const status = !switchElement.checked
    try {
      const response = await fetch(`${API_BASE_URL}/devices/force-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: sessionStorage.getItem("farm_id"),
          device,
          status,
          duration,
        }),
      })
      if (!response.ok) throw new Error("요청 실패")
      switchElement.checked = status
      updateSwitchUI(device, status)
    } catch (err) {
      alert("장치 제어 실패: " + err.message)
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
      } else if (tabId === "writeDiary") {
        fetchReports()
      } else if (tabId === "cctv") {
        fetchAllImages(farmId)
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
      document.getElementById(`${sensorId}-sensor-chart`).classList.add("active")
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

  const captureButton = document.getElementById("capture-button")

  captureButton.addEventListener("click", async () => {
    const resultDiv = document.getElementById("capture-result")

    try {
      const response = await fetch(`https://api.hotpotato.me/get-image?farmId=${farmId}`, {
        method: "GET",
      })

      const result = await response.json()
      alert("이미지 저장 성공")
      fetchAllImages(farmId)
    } catch (err) {
      console.error("외부 서버 요청 중 오류:", err)
      resultDiv.innerHTML = "요청 중 오류가 발생했습니다."
    }
  })

  let allImages = []
  let currentSort = "newest"

  async function fetchAllImages(farmId) {
    const galleryLoading = document.getElementById("gallery-loading")
    const imageList = document.getElementById("image-list")
    const galleryEmpty = document.getElementById("gallery-empty")

    // Show loading
    galleryLoading.style.display = "flex"
    imageList.style.display = "none"
    galleryEmpty.style.display = "none"

    try {
      const res = await fetch(`${API_BASE_URL}/all-image?farmId=${farmId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "이미지를 불러오지 못했습니다.")
      }

      allImages = data.images || []
      updateImageCount()
      renderImages()
    } catch (err) {
      console.error("이미지 목록 로드 실패:", err)
      galleryLoading.style.display = "none"
      galleryEmpty.style.display = "flex"
      galleryEmpty.querySelector(".empty-state h3").textContent = "이미지 로드 실패"
      galleryEmpty.querySelector(".empty-state p").textContent = err.message
    } finally {
      galleryLoading.style.display = "none"
    }
  }

  function updateImageCount() {
    const imageCount = document.getElementById("image-count")
    if (imageCount) {
      imageCount.textContent = `${allImages.length}개의 이미지`
    }
  }

  function renderImages() {
    const imageList = document.getElementById("image-list")
    const galleryEmpty = document.getElementById("gallery-empty")

    if (allImages.length === 0) {
      imageList.style.display = "none"
      galleryEmpty.style.display = "flex"
      return
    }

    // Sort images
    const sortedImages = [...allImages].sort((a, b) => {
      const dateA = new Date(a.uploadedAt ? `${a.uploadedAt.year}-${a.uploadedAt.month}-${a.uploadedAt.day}` : 0)
      const dateB = new Date(b.uploadedAt ? `${b.uploadedAt.year}-${b.uploadedAt.month}-${b.uploadedAt.day}` : 0)

      return currentSort === "newest" ? dateB - dateA : dateA - dateB
    })

    imageList.innerHTML = ""
    imageList.style.display = "grid"
    galleryEmpty.style.display = "none"

    sortedImages.forEach((image, index) => {
      const { publicUrl, uploadedAt } = image

      // Format date
      const dateStr = uploadedAt
        ? `${uploadedAt.year}-${String(uploadedAt.month).padStart(2, "0")}-${String(uploadedAt.day).padStart(2, "0")}`
        : "날짜 정보 없음"

      const imageItem = document.createElement("div")
      imageItem.className = "image-item"
      imageItem.innerHTML = `
        <div class="image-wrapper">
          <img src="${publicUrl}" alt="CCTV 이미지" loading="lazy" />
          <div class="image-overlay">
            <div class="image-overlay-content">
              <i class="fas fa-search-plus"></i> 클릭하여 확대
            </div>
          </div>
        </div>
        <div class="image-info">
          <div class="image-date">
            <i class="fas fa-calendar-alt"></i>
            ${dateStr}
          </div>
        </div>
      `

      // Add click event to open modal
      imageItem.addEventListener("click", () => {
        openImageModal(publicUrl, dateStr, timeStr)
      })

      imageList.appendChild(imageItem)
    })
  }

  // Sort functionality
  const sortSelect = document.getElementById("sort-select")
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value
      renderImages()
    })
  }

  // Refresh functionality
  const refreshBtn = document.getElementById("refresh-images")
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      fetchAllImages(farmId)
    })
  }

  // Image modal functionality
  function openImageModal(imageUrl, date, timeStr) {
    const modal = document.getElementById("imageModal")
    const modalImage = document.getElementById("modal-image")
    const modalDate = document.getElementById("modal-image-date")
    const modalTime = document.getElementById("modal-image-time")

    modalImage.src = imageUrl
    modalDate.textContent = `촬영일: ${date}`
    modalTime.textContent = timeStr

    modal.style.display = "block"
    document.body.style.overflow = "hidden"
  }

  function closeImageModal() {
    const modal = document.getElementById("imageModal")
    modal.style.display = "none"
    document.body.style.overflow = "auto"
  }

  // Modal event listeners
  const closeImageModalBtn = document.getElementById("closeImageModal")
  if (closeImageModalBtn) {
    closeImageModalBtn.addEventListener("click", closeImageModal)
  }

  const downloadImageBtn = document.getElementById("download-image")
  if (downloadImageBtn) {
    downloadImageBtn.addEventListener("click", () => {
      const modalImage = document.getElementById("modal-image")
      const link = document.createElement("a")
      link.href = modalImage.src
      link.download = `cctv-image-${new Date().toISOString().split("T")[0]}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    })
  }

  const deleteImageBtn = document.getElementById("delete-image")
  if (deleteImageBtn) {
    deleteImageBtn.addEventListener("click", () => {
      if (confirm("이 이미지를 삭제하시겠습니까?")) {
        // Implement delete functionality here
        alert("삭제 기능은 서버 API 구현이 필요합니다.")
      }
    })
  }

  // Close modal when clicking outside
  const imageModal = document.getElementById("imageModal")
  if (imageModal) {
    imageModal.addEventListener("click", (e) => {
      if (e.target === imageModal) {
        closeImageModal()
      }
    })
  }

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
      })

      if (!response.ok) throw new Error("서버 오류")

      const data = await response.json()

      const { harvestDays, startDate } = data
      console.log("start-farm 응답:", data)
      console.log("harvestDays:", harvestDays)
      console.log("startDate:", startDate)
      if (!harvestDays || !startDate) {
        throw new Error("작물 정보 누락")
      }

      // 버튼 숨김, 작물 정보 표시
      if (startButton) startButton.style.display = "none"
      if (cropInfo) cropInfo.classList.add("visible")

      // 성장률 계산 및 UI 갱신
      const today = new Date()
      const startDateObj = new Date(startDate)
      const harvestDate = new Date(startDateObj)
      harvestDate.setDate(harvestDate.getDate() + harvestDays)
      const timeDiff = harvestDate - today
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))
      const growthRate = ((harvestDays - daysLeft) / harvestDays) * 100

      updateGrowthStatus(growthRate, harvestDays, startDate)

      // 농장 상태 갱신
      await fetchFarmStatus()

      alert("농장이 성공적으로 시작되었습니다.")
    } catch (error) {
      console.error("농장 시작 실패:", error)
      alert("농장 시작 중 오류 발생")
    }
  }

  if (startButton) {
    startButton.addEventListener("click", startFarm)
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
    growthRate = Math.max(0, Math.min(growthRate, 100)) // 0~100으로 보정

    const growthRateEl = document.getElementById("growth-rate")
    if (growthRateEl) {
      growthRateEl.textContent = `${Math.round(growthRate)}%`
    }

    const growthCircle = document.getElementById("growth-circle")
    if (growthCircle) {
      growthCircle.style.background = `conic-gradient(#ffffff 0deg ${growthRate * 3.6}deg, rgba(255,255,255,0.3) ${growthRate * 3.6}deg 360deg)`
    }

    const formattedStartDate = formatDateYMD(new Date(startDate))
    const startDateEl = document.getElementById("start-date")
    if (startDateEl) {
      startDateEl.textContent = `시작일: ${formattedStartDate}`
    }

    const today = new Date()
    const harvestDate = new Date(startDate)
    harvestDate.setDate(harvestDate.getDate() + harvestDays)
    const timeDiff = harvestDate - today
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))

    const dDayEl = document.getElementById("d-day")
    if (dDayEl) {
      if (daysLeft > 0) {
        dDayEl.textContent = `D-Day: ${daysLeft}일 남음`
      } else if (daysLeft === 0) {
        dDayEl.textContent = `D-Day: 오늘 수확 가능`
      } else {
        dDayEl.textContent = `D-Day: 수확 완료`
      }
    }

    updateGrowthStageByRate(growthRate)
  }

  function updateGrowthStageByRate(growthRate) {
    const growthTextEl = document.getElementById("growthText")
    const stageElements = document.querySelectorAll(".stage")

    if (!growthTextEl) return

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
  const chatInput = document.getElementById("chat-input-field")
  const sendButton = document.getElementById("send-button")

  // 메시지 전송 함수
  async function sendChatMessage() {
    const input = chatInput.value.trim()
    if (!input) return

    addMessageToChat("user", input)
    chatInput.value = ""

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      })

      const data = await response.json()
      addMessageToChat("bot", data.reply || "답변 없음")
    } catch (error) {
      addMessageToChat("bot", "서버 오류 발생")
    }
  }

  // 전송 버튼 클릭
  sendButton.addEventListener("click", sendChatMessage)

  // 🔹 엔터 키 입력 처리
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault() // form 제출 방지
      sendChatMessage()
    }
  })

  // 채팅 메시지 출력 함수
  function addMessageToChat(role, text) {
    const container = document.querySelector(".chat-messages")
    const message = document.createElement("div")
    message.className = `message ${role}`
    message.innerHTML = `<div class="message-content">${text}</div>`
    container.appendChild(message)
    container.scrollTop = container.scrollHeight
  }

  async function fetchSensorData() {
    try {
      const response = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farmId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("네트워크 응답 오류: " + response.statusText)
      const data = await response.json()
      updateSensorUI("temperature", data.temperature, "temp", 15, 30)
      updateSensorUI("humidity", data.humidity, "humidity", 0, 100)
      updateSensorUI("soil_moisture", data.soil_moisture, "soil", 0, 100)
      updateSensorUI("co2", data.co2, "co2", 500, 1500)
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

  // 오늘 데이터 불러오기 (1시간 단위 평균)
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

  // 오늘 데이터 불러오기 (1시간 단위 평균)
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
              y: { min: 10, max: 30, title: { display: true, text: "온도 (°C)" }, ticks: { color: "#000000" } },
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
              y: { min: 500, max: 1500, title: { display: true, text: "CO2 (ppm)" }, ticks: { color: "#000000" } },
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
      const response = await fetch(`${API_BASE_URL}/getAlarm?farm_id=${farmId}`)
      if (!response.ok) throw new Error("네트워크 오류:" + response.statusText)
      const data = await response.json()
      allAlarms = data.sort((a, b) => a.type.localeCompare(b.type) || new Date(b.created_at) - new Date(a.created_at))
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

      const dangerHeadEl = document.querySelector(".danger-head")
      const dangerTimeEl = document.querySelector(".danger-time")
      const warningHeadEl = document.querySelector(".warning-head")
      const warningTimeEl = document.querySelector(".warning-time")
      const completeHeadEl = document.querySelector(".complete-head")
      const completeTimeEl = document.querySelector(".complete-time")

      if (latestDanger.content !== "알림 없음" && dangerHeadEl && dangerTimeEl) {
        dangerHeadEl.innerHTML = latestDanger.content
        dangerTimeEl.textContent = formatDateTime(latestDanger.created_at)
      } else if (dangerHeadEl && dangerTimeEl) {
        dangerHeadEl.textContent = "알림 없음"
        dangerTimeEl.textContent = "시간"
      }

      if (latestWarning.content !== "알림 없음" && warningHeadEl && warningTimeEl) {
        warningHeadEl.innerHTML = latestWarning.content
        warningTimeEl.textContent = formatDateTime(latestWarning.created_at)
      } else if (warningHeadEl && warningTimeEl) {
        warningHeadEl.textContent = "알림 없음"
        warningTimeEl.textContent = "시간"
      }

      if (latestComplete.content !== "알림 없음" && completeHeadEl && completeTimeEl) {
        completeHeadEl.innerHTML = latestComplete.content
        completeTimeEl.textContent = formatDateTime(latestComplete.created_at)
      } else if (completeHeadEl && completeTimeEl) {
        completeHeadEl.textContent = "알림 없음"
        completeTimeEl.textContent = "시간"
      }
    } catch (error) {
      console.error("알림 불러오기 실패:", error)
    }
    fetchAlarmList()
  }

  function fetchAlarmList() {
    const alarmListTableBody = document.querySelector("#alarm-list-table tbody")
    const alarmFilter = document.querySelector("#alarm-filter")
    if (!alarmListTableBody || !alarmFilter) {
      console.error("필터 또는 테이블 요소를 찾을 수 없습니다.")
      return
    }

    const selectedType = alarmFilter.value
    alarmListTableBody.innerHTML = ""

    if (allAlarms.length === 0) {
      alarmListTableBody.innerHTML = '<tr><td colspan="4">알림이 없습니다.</td></tr>'
    } else {
      const sortedAlarms = allAlarms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const filteredAlarms = sortedAlarms.filter((alarm) => !selectedType || alarm.type === selectedType)

      filteredAlarms.forEach((alarm) => {
        const tr = document.createElement("tr")
        const icon = getIconForType(alarm.type)

        const contentTd = document.createElement("td")
        contentTd.textContent = alarm.content

        const createdAtTd = document.createElement("td")
        createdAtTd.textContent = formatDateTime(alarm.created_at)

        const deviceTd = document.createElement("td")
        deviceTd.textContent = alarm.device || "장치 없음"

        const typeTd = document.createElement("td")
        typeTd.innerHTML = `${icon} ${alarm.type}`

        tr.appendChild(contentTd)
        tr.appendChild(createdAtTd)
        tr.appendChild(deviceTd)
        tr.appendChild(typeTd)

        alarmListTableBody.appendChild(tr)
      })
    }
  }

  function getIconForType(type) {
    switch (type) {
      case "위험":
        return '<span class="banner-icon danger"><i class="fas fa-exclamation-circle"></i></span>'
      case "경고":
        return '<span class="banner-icon warning"><i class="fas fa-exclamation-triangle"></i></span>'
      case "완료":
        return '<span class="banner-icon success"><i class="fas fa-check-circle"></i></span>'
      default:
        return ""
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

  const reportDatePicker = document.getElementById("reportDatePicker")
  if (reportDatePicker) {
    const today = new Date()
    reportDatePicker.max = formatDateYMD(today)
  }

  // 리포트 생성 함수
  async function generateReport() {
    try {
      const selectedDate = reportDatePicker.value
      if (!selectedDate) {
        alert("생성할 날짜를 선택해주세요.")
        return
      }

      // 리포트 생성 컨테이너 생성 또는 가져오기
      let reportGenContainer = document.getElementById("reportGenerationContainer")
      if (!reportGenContainer) {
        reportGenContainer = document.createElement("div")
        reportGenContainer.id = "reportGenerationContainer"
        reportGenContainer.className = "report-generation-container"
        document.querySelector(".diary-list").appendChild(reportGenContainer)
      }

      // 컨테이너를 표시하고 상태를 "데이터 수집 중"으로 업데이트
      reportGenContainer.style.display = "block"
      reportGenContainer.innerHTML = `
        <div class="report-generation-status">
          <div class="report-generation-icon"><i class="fas fa-spinner fa-spin"></i></div>
          <div class="report-generation-text">데이터 수집 중...</div>
        </div>
        <div class="report-generation-content"></div>
      `

      // API 호출하여 리포트 생성 시작
      const response = await fetch(`${API_BASE_URL}/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          date: selectedDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "리포트 생성 실패")
      }

      // 리포트 데이터 가져오기
      const reportData = await response.json()

      // 상태를 "리포트 작성 중"으로 업데이트
      const statusEl = reportGenContainer.querySelector(".report-generation-text")
      statusEl.textContent = "리포트 작성 중..."

      // 타이핑 애니메이션을 위한 컨텐츠 컨테이너 가져오기
      const contentEl = reportGenContainer.querySelector(".report-generation-content")

      // AI 분석 텍스트에 대한 타이핑 애니메이션 시뮬레이션
      const aiAnalysis = reportData.aiAnalysis || "AI 분석 데이터가 없습니다."
      let index = 0

      function typeText() {
        if (index < aiAnalysis.length) {
          contentEl.textContent += aiAnalysis.charAt(index)
          index++
          setTimeout(typeText, 20) // 속도 조절 가능
        } else {
          // 타이핑 완료 후 짧은 지연 시간 후 모달 표시
          setTimeout(() => {
            reportGenContainer.style.display = "none"
            showReportModal(reportData)
          }, 1000)
        }
      }

      // 타이핑 애니메이션 시작
      typeText()

      // 리포트 목록 새로고침
      fetchReports()
    } catch (error) {
      console.error("리포트 생성 오류:", error)
      alert(error.message || "리포트 생성 중 오류가 발생했습니다.")

      // 오류 발생 시 생성 컨테이너 숨기기
      const reportGenContainer = document.getElementById("reportGenerationContainer")
      if (reportGenContainer) {
        reportGenContainer.style.display = "none"
      }
    }
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

  async function fetchLatestPlantImage() {
    const imageElement = document.getElementById("latestPlantImage")
    if (!imageElement) {
      console.warn("[Client] 이미지 엘리먼트가 없습니다.")
      return
    }

    if (!farmId) {
      console.warn("[Client] farmId가 없습니다.")
      imageElement.src = "images/no-image.jpg"
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/latest-image?farmId=${farmId}`)

      if (!response.ok) {
        console.warn("[Client] API 응답 실패:", await response.text())
        imageElement.src = "images/no-image.jpg"
        return
      }

      const data = await response.json()

      if (data.url) {
        imageElement.src = data.url
      } else {
        console.warn("[Client] URL이 없습니다. 기본 이미지로 변경")
        imageElement.src = "images/no-image.jpg"
      }

      imageElement.onerror = () => {
        console.error("[Client] 이미지 로드 실패, 기본 이미지로 대체")
        imageElement.src = "images/no-image.jpg"
      }
    } catch (err) {
      console.error("[Client] 최근 작물 이미지 불러오기 오류:", err)
      imageElement.src = "images/no-image.jpg"
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

    // 이미지 URL 설정
    const reportImageEl = document.getElementById("reportImage")
    if (reportImageEl) {
      reportImageEl.src = report.imageUrl || "images/no-image.jpg"
    }

    // AI 분석 정보 설정 (줄바꿈 처리)
    const aiAnalysisEl = document.getElementById("aiAnalysis")
    if (aiAnalysisEl) {
      aiAnalysisEl.innerHTML = report.aiAnalysis
        ? report.aiAnalysis.replace(/\n/g, "<br>")
        : "AI 분석 데이터가 없습니다."
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

  // 리포트 생성 버튼 이벤트
  const generateDiaryBtn = document.getElementById("generateDiaryBtn")
  if (generateDiaryBtn) {
    generateDiaryBtn.addEventListener("click", generateReport)
  }

  // 초기 데이터 로드
  fetchData() // 초기 값
  updateDateDisplay() // 날짜
  fetchSensorData() // 센서
  fetchDevicesStatus() // 제어 장치
  fetchAlarm() // 알람
  fetchFarmStatus() // 성장도
  fetchFarmOptimalValues() // 농장 최적 수치
  fetchReports() // 리포트 목록 조회
  fetchLatestPlantImage() // 식물 사진

  setInterval(() => {
    fetchSensorData()
    fetchDevicesStatus()
    updateHistoryChartData()
    updateChartData()
  }, 5000)
})
