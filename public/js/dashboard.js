document.addEventListener("DOMContentLoaded", () => {
  // 전역 변수
  const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app"
  let allFarms = []
  const farmSensors = {}
  const farmDevices = {}
  let isDeleteMode = false
  let selectedFarmIds = []

  // 초기 데이터 로딩
  loadFarmData()

  // 농장 데이터 불러오기
  async function loadFarmData() {
    try {
      // 세션스토리지에서 user_id 가져오기
      const userId = sessionStorage.getItem("user_id")
      if (!userId) {
        showMessage("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.", "error")
        window.location.href = "login.html"
        return
      }

      // 농장 목록 불러오기
      const farmsResponse = await fetch(`${API_BASE_URL}/getFarms?user_id=${userId}`)
      if (!farmsResponse.ok) {
        throw new Error("농장 목록을 불러오는데 실패했습니다.")
      }

      const farmsData = await farmsResponse.json()
      allFarms = farmsData.farms

      // 각 농장별 센서 및 제어장치 데이터 불러오기
      await Promise.all(
        allFarms.map(async (farm) => {
          try {
            // 센서 데이터 불러오기
            const sensorsResponse = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farm.farm_id}`)
            if (sensorsResponse.ok) {
              const sensorData = await sensorsResponse.json()
              farmSensors[farm.farm_id] = sensorData
            }

            // 제어장치 데이터 불러오기
            const devicesResponse = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farm.farm_id}`)
            if (devicesResponse.ok) {
              const deviceData = await devicesResponse.json()
              farmDevices[farm.farm_id] = deviceData
            }
          } catch (err) {
            console.error(`농장 ID ${farm.farm_id}의 데이터를 불러오는데 실패했습니다:`, err)
          }
        }),
      )

      // 농장 카드 렌더링
      renderFarmCards()
    } catch (err) {
      console.error("데이터 로딩 오류:", err)
      showMessage("데이터를 불러오는데 실패했습니다: " + err.message, "error")
    }
  }

  // 상태 텍스트 가져오기
  function getStatusText(status) {
    return {
      healthy: "정상",
      warning: "주의",
      critical: "위험",
    }[status]
  }

  // 상태 클래스 가져오기
  function getStatusClass(status) {
    return {
      healthy: "status-healthy",
      warning: "status-warning",
      critical: "status-critical",
    }[status]
  }

  // 센서 상태 확인
  function getSensorStatus(type, value) {
    if (value === null || value === undefined) return ""

    switch (type) {
      case "temperature":
        return value > 30 || value < 15 ? "critical" : value > 28 || value < 18 ? "warning" : ""
      case "humidity":
        return value < 30 ? "critical" : value > 80 ? "warning" : ""
      case "soil_moisture":
        return value < 20 ? "critical" : value < 30 ? "warning" : ""
      case "co2":
        return value > 800 ? "critical" : value > 600 ? "warning" : ""
      default:
        return ""
    }
  }

  // 센서 아이콘 가져오기
  function getSensorIcon(type) {
    switch (type) {
      case "temperature":
        return `<i class="fas fa-temperature-high"></i>`
      case "humidity":
        return `<i class="fas fa-tint"></i>`
      case "soil_moisture":
        return `<i class="fas fa-seedling"></i>`
      case "co2":
        return `<i class="fas fa-wind"></i>`
      default:
        return ""
    }
  }

  // 제어장치 아이콘 가져오기
  function getControlIcon(type) {
    switch (type) {
      case "led":
        return `<i class="fas fa-lightbulb"></i>`
      case "water":
        return `<i class="fas fa-tint"></i>`
      case "fan":
        return `<i class="fas fa-fan"></i>`
      case "heater":
        return `<i class="fas fa-fire"></i>`
      case "cooler":
        return `<i class="fas fa-wind"></i>`
      default:
        return ""
    }
  }

  // 센서 값 단위 가져오기
  function getSensorUnit(type) {
    switch (type) {
      case "temperature":
        return "°C"
      case "humidity":
      case "soil_moisture":
        return "%"
      case "co2":
        return "ppm"
      default:
        return ""
    }
  }

  // 센서 이름 가져오기
  function getSensorName(type) {
    switch (type) {
      case "temperature":
        return "온도"
      case "humidity":
        return "습도"
      case "soil_moisture":
        return "토양수분"
      case "co2":
        return "CO2"
      default:
        return ""
    }
  }

  // 제어장치 이름 가져오기
  function getControlName(type) {
    switch (type) {
      case "led":
        return "LED"
      case "water":
        return "급수"
      case "fan":
        return "환기"
      case "heater":
        return "히터"
      case "cooler":
        return "쿨러"
      default:
        return ""
    }
  }

  // 농장 상태 계산
  function calculateFarmStatus(sensors) {
    if (!sensors) return "healthy"

    const criticalCount = Object.entries(sensors).filter(([key, value]) => {
      if (key === "id" || key === "farm_id" || key === "created_at") return false
      return getSensorStatus(key, value) === "critical"
    }).length

    const warningCount = Object.entries(sensors).filter(([key, value]) => {
      if (key === "id" || key === "farm_id" || key === "created_at") return false
      return getSensorStatus(key, value) === "warning"
    }).length

    if (criticalCount > 0) return "critical"
    if (warningCount > 0) return "warning"
    return "healthy"
  }

  // 경고 메시지 생성
  function generateAlerts(sensors) {
    if (!sensors) return []

    const alerts = []

    if (sensors.temperature !== null && sensors.temperature !== undefined) {
      if (sensors.temperature > 30) {
        alerts.push({ type: "온도 경고", message: `온도가 너무 높습니다 (${sensors.temperature}°C)` })
      } else if (sensors.temperature < 15) {
        alerts.push({ type: "온도 경고", message: `온도가 너무 낮습니다 (${sensors.temperature}°C)` })
      } else if (sensors.temperature > 28 || sensors.temperature < 18) {
        alerts.push({ type: "온도 경고", message: `온도가 적정 범위를 벗어났습니다 (${sensors.temperature}°C)` })
      }
    }

    if (sensors.humidity !== null && sensors.humidity !== undefined) {
      if (sensors.humidity < 30) {
        alerts.push({ type: "습도 경고", message: `습도가 너무 낮습니다 (${sensors.humidity}%)` })
      } else if (sensors.humidity > 80) {
        alerts.push({ type: "습도 경고", message: `습도가 너무 높습니다 (${sensors.humidity}%)` })
      }
    }

    if (sensors.soil_moisture !== null && sensors.soil_moisture !== undefined) {
      if (sensors.soil_moisture < 20) {
        alerts.push({ type: "토양수분 경고", message: `토양이 매우 건조합니다 (${sensors.soil_moisture}%)` })
      } else if (sensors.soil_moisture < 30) {
        alerts.push({ type: "토양수분 경고", message: `토양이 건조합니다 (${sensors.soil_moisture}%)` })
      }
    }

    if (sensors.co2 !== null && sensors.co2 !== undefined) {
      if (sensors.co2 > 800) {
        alerts.push({ type: "CO2 경고", message: `CO2 농도가 너무 높습니다 (${sensors.co2}ppm)` })
      } else if (sensors.co2 > 600) {
        alerts.push({ type: "CO2 경고", message: `CO2 농도가 높습니다 (${sensors.co2}ppm)` })
      }
    }

    return alerts
  }

  // 메시지 표시
  function showMessage(message, type = "error") {
    const messageContainer = document.getElementById("message-container")
    const className = type === "success" ? "success-message" : "error-message"
    messageContainer.innerHTML = `<div class="${className}">${message}</div>`

    // 3초 후 메시지 사라짐
    setTimeout(() => {
      messageContainer.innerHTML = ""
    }, 3000)
  }

  // 토스트 메시지 표시
  function showToast(message, type = "error") {
    const toast = document.getElementById("toast")
    toast.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
      toast.className = "toast"
    }, 3000)
  }

  // 농장 카드 렌더링
  function renderFarmCards(filteredFarms = allFarms) {
    const container = document.getElementById("farm-grid")
    container.innerHTML = ""

    if (filteredFarms.length === 0) {
      container.innerHTML =
        '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #666;">검색 결과가 없습니다</div>'
      return
    }

    // 삭제 모드일 때 클래스 추가
    if (isDeleteMode) {
      container.classList.add("delete-mode")
    } else {
      container.classList.remove("delete-mode")
    }

    filteredFarms.forEach((farm) => {
      const sensors = farmSensors[farm.farm_id]
      const devices = farmDevices[farm.farm_id]
      const status = calculateFarmStatus(sensors)
      const alerts = generateAlerts(sensors)

      const card = document.createElement("div")
      card.className = `farm-card ${status === "critical" ? "critical" : ""}`
      card.dataset.farmId = farm.farm_id

      // 삭제 모드일 때 체크박스 추가
      if (isDeleteMode) {
        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.className = "farm-checkbox"
        checkbox.dataset.farmId = farm.farm_id
        checkbox.checked = selectedFarmIds.includes(farm.farm_id)
        checkbox.addEventListener("change", function () {
          if (this.checked) {
            if (!selectedFarmIds.includes(farm.farm_id)) {
              selectedFarmIds.push(farm.farm_id)
            }
          } else {
            selectedFarmIds = selectedFarmIds.filter((id) => id !== farm.farm_id)
          }
          updateSelectedCount()
        })
        card.appendChild(checkbox)
      }

      // 카드 내용 컨테이너 추가
      const cardContent = document.createElement("div")
      cardContent.className = "farm-card-content"

      // 삭제 모드가 아닐 때만 클릭 이벤트 추가
      if (!isDeleteMode) {
        cardContent.addEventListener("click", () => {
          sessionStorage.setItem("farm_id", farm.farm_id)
          window.location.href = "farm-details.html"
        })
      }

      // 센서 HTML 생성
      let sensorsHtml = '<div class="farm-sensors">'
      if (sensors) {
        const sensorFields = [
          { key: "temperature", value: sensors.temperature },
          { key: "humidity", value: sensors.humidity },
          { key: "soil_moisture", value: sensors.soil_moisture },
          { key: "co2", value: sensors.co2 },
        ]

        sensorFields.forEach(({ key, value }) => {
          if (value !== null && value !== undefined) {
            const status = getSensorStatus(key, value)
            sensorsHtml += `
                            <div class="sensor">
                                <div class="sensor-icon">
                                    ${getSensorIcon(key)}
                                </div>
                                <div class="sensor-info">
                                    <div class="sensor-label">${getSensorName(key)}</div>
                                    <div class="sensor-value ${status}">${value}${getSensorUnit(key)}</div>
                                </div>
                            </div>
                        `
          }
        })
      } else {
        sensorsHtml += '<div style="padding: 10px; text-align: center; color: #666;">센서 데이터 없음</div>'
      }
      sensorsHtml += "</div>"

      // 제어장치 HTML 생성
      let controlsHtml = '<div class="farm-controls">'
      if (devices) {
        const controlFields = [
          { key: "led", value: devices.led },
          { key: "water", value: devices.water },
          { key: "fan", value: devices.fan },
          { key: "heater", value: devices.heater },
          { key: "cooler", value: devices.cooler },
        ]

        controlFields.forEach(({ key, value }) => {
          if (value !== null && value !== undefined) {
            controlsHtml += `
                            <div class="control">
                                <div class="control-icon">
                                    ${getControlIcon(key)}
                                </div>
                                <div class="control-label">${getControlName(key)}</div>
                                <div class="control-status ${value ? "status-on" : "status-off"}"></div>
                            </div>
                        `
          }
        })
      } else {
        controlsHtml += '<div style="padding: 10px; text-align: center; color: #666;">제어장치 데이터 없음</div>'
      }
      controlsHtml += "</div>"

      // 경고 HTML 생성
      let alertsHtml = ""
      if (alerts && alerts.length > 0) {
        alertsHtml = '<div class="farm-alerts">'
        alertsHtml += `<div class="alert-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${alerts.length}개의 경고
                </div>`

        alerts.forEach((alert) => {
          alertsHtml += `<div class="alert-message">${alert.message}</div>`
        })

        alertsHtml += "</div>"
      }

      const lastUpdated = sensors ? new Date(sensors.created_at).toLocaleString() : "데이터 없음"

      cardContent.innerHTML = `
                <div class="farm-header">
                    <div>
                        <div class="farm-name">${farm.farm_name}</div>
                        <div class="farm-location">${farm.farm_location}</div>
                    </div>
                    <div class="status ${getStatusClass(status)}">${getStatusText(status)}</div>
                </div>
                
                <div class="farm-data">
                    ${sensorsHtml}
                    ${controlsHtml}
                </div>
                
                <div class="farm-info">
                    <strong>작물:</strong> ${farm.farm_type || "일반"}
                </div>
                
                ${alertsHtml}
                
                <div class="last-updated">
                    마지막 업데이트: ${lastUpdated}
                </div>
            `

      card.appendChild(cardContent)
      container.appendChild(card)
    })
  }

  // 농장 추가하기
  async function addFarm(farmData) {
    try {
      const response = await fetch(`${API_BASE_URL}/addFarm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(farmData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "농장 추가에 실패했습니다.")
      }

      const result = await response.json()
      showMessage(result.message || "농장이 성공적으로 추가되었습니다.", "success")

      // 농장 목록 새로고침
      await loadFarmData()

      return true
    } catch (err) {
      console.error("농장 추가 오류:", err)
      showMessage("농장 추가에 실패했습니다: " + err.message, "error")
      return false
    }
  }

  // 농장 삭제하기
  async function deleteFarms(farmIds) {
    try {
      const response = await fetch(`${API_BASE_URL}/delFarm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_ids: farmIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "농장 삭제에 실패했습니다.")
      }

      const result = await response.json()
      showMessage(result.message || "농장이 성공적으로 삭제되었습니다.", "success")

      // 농장 목록 새로고침
      await loadFarmData()

      return true
    } catch (err) {
      console.error("농장 삭제 오류:", err)
      showMessage("농장 삭제에 실패했습니다: " + err.message, "error")
      return false
    }
  }

  // 선택된 농장 수 업데이트
  function updateSelectedCount() {
    document.getElementById("selected-count").textContent = selectedFarmIds.length
    const confirmDeleteBtn = document.getElementById("confirm-delete-selected-btn")
    if (selectedFarmIds.length > 0) {
      confirmDeleteBtn.disabled = false
    } else {
      confirmDeleteBtn.disabled = true
    }
  }

  // 삭제 모드 활성화
  function enableDeleteMode() {
    isDeleteMode = true
    selectedFarmIds = []
    document.getElementById("delete-mode-container").style.display = "block"
    document.getElementById("add-farm-btn").style.display = "none"
    document.getElementById("delete-farms-btn").style.display = "none"
    updateSelectedCount()
    renderFarmCards()
  }

  // 삭제 모드 비활성화
  function disableDeleteMode() {
    isDeleteMode = false
    selectedFarmIds = []
    document.getElementById("delete-mode-container").style.display = "none"
    document.getElementById("add-farm-btn").style.display = "block"
    document.getElementById("delete-farms-btn").style.display = "block"
    renderFarmCards()
  }

  // 모달 열기
  function openModal(modalId) {
    document.getElementById(modalId).classList.add("active")
  }

  // 모달 닫기
  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active")
  }

  // 활성 필터 설정
  function setActiveFilter(filter) {
    document.querySelectorAll(".filter-button").forEach((btn) => {
      btn.classList.remove("active")
    })

    if (filter === "all") {
      document.getElementById("filter-all").classList.add("active")
    } else {
      document.getElementById(`filter-${filter}`).classList.add("active")
    }
  }

  // 이벤트 리스너 설정

  // 검색 기능
  document.getElementById("search-input").addEventListener("input", (e) => {
    const searchQuery = e.target.value.toLowerCase()
    const filteredFarms = allFarms.filter(
      (farm) =>
        farm.farm_name.toLowerCase().includes(searchQuery) ||
        farm.farm_location.toLowerCase().includes(searchQuery) ||
        (farm.farm_type && farm.farm_type.toLowerCase().includes(searchQuery)),
    )
    renderFarmCards(filteredFarms)
  })

  // 필터 버튼
  document.getElementById("filter-all").addEventListener("click", () => {
    setActiveFilter("all")
    renderFarmCards(allFarms)
  })

  document.getElementById("filter-critical").addEventListener("click", () => {
    setActiveFilter("critical")
    const filteredFarms = allFarms.filter((farm) => calculateFarmStatus(farmSensors[farm.farm_id]) === "critical")
    renderFarmCards(filteredFarms)
  })

  document.getElementById("filter-warning").addEventListener("click", () => {
    setActiveFilter("warning")
    const filteredFarms = allFarms.filter((farm) => calculateFarmStatus(farmSensors[farm.farm_id]) === "warning")
    renderFarmCards(filteredFarms)
  })

  document.getElementById("filter-healthy").addEventListener("click", () => {
    setActiveFilter("healthy")
    const filteredFarms = allFarms.filter((farm) => calculateFarmStatus(farmSensors[farm.farm_id]) === "healthy")
    renderFarmCards(filteredFarms)
  })

  // 농장 추가 버튼
  document.getElementById("add-farm-btn").addEventListener("click", () => {
    openModal("add-farm-modal")
  })

  // 농장 삭제 버튼
  document.getElementById("delete-farms-btn").addEventListener("click", enableDeleteMode)

  // 삭제 모드 취소 버튼
  document.getElementById("cancel-delete-mode-btn").addEventListener("click", disableDeleteMode)

  // 선택 삭제 버튼
  document.getElementById("confirm-delete-selected-btn").addEventListener("click", () => {
    if (selectedFarmIds.length > 0) {
      document.getElementById("delete-count").textContent = selectedFarmIds.length
      openModal("confirm-delete-modal")
    }
  })

  // 모달 닫기 버튼
  document.querySelector(".close-modal").addEventListener("click", () => {
    closeModal("add-farm-modal")
  })

  document.querySelector(".cancel-btn").addEventListener("click", () => {
    closeModal("add-farm-modal")
  })

  // 모달 외부 클릭 시 닫기
  document.getElementById("add-farm-modal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal("add-farm-modal")
    }
  })

  // 농장 추가 폼 제출
  document.getElementById("add-farm-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const userId = sessionStorage.getItem("user_id")
    if (!userId) {
      showMessage("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.", "error")
      return
    }

    const farmName = document.getElementById("farm-name").value
    const farmLocation = document.getElementById("farm-location").value
    const farmType = document.getElementById("farm-type").value

    const farmData = {
      user_id: userId,
      farm_name: farmName,
      farm_location: farmLocation,
      farm_type: farmType,
    }

    const success = await addFarm(farmData)
    if (success) {
      closeModal("add-farm-modal")
      document.getElementById("add-farm-form").reset()
    }
  })

  // 삭제 확인 모달 이벤트
  document.getElementById("cancel-delete-btn").addEventListener("click", () => {
    closeModal("confirm-delete-modal")
  })

  document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
    if (selectedFarmIds.length > 0) {
      const success = await deleteFarms(selectedFarmIds)
      if (success) {
        closeModal("confirm-delete-modal")
        disableDeleteMode()
      }
    }
  })

  // 삭제 확인 모달 외부 클릭 시 닫기
  document.getElementById("confirm-delete-modal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal("confirm-delete-modal")
    }
  })
})

