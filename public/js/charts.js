// 차트 관련 함수들
// 이 파일은 farm-details.js에서 import하여 사용합니다.

// 실시간 차트 데이터 업데이트
async function updateChartData() {
  const realtimeData = await fetchRealtimeData()

  // 차트 데이터 갱신
  realtimeChart.data.labels = realtimeData.map((item) => item.time)
  realtimeChart.data.datasets[0].data = realtimeData.map((item) => item.temperature)
  realtimeChart.data.datasets[1].data = realtimeData.map((item) => item.humidity)
  realtimeChart.data.datasets[2].data = realtimeData.map((item) => item.soil)
  realtimeChart.data.datasets[3].data = realtimeData.map((item) => item.co2)

  realtimeChart.update()
}

// 실시간 데이터 불러오기
async function fetchRealtimeData() {
  try {
    const farmId = sessionStorage.getItem("farm_id")
    const response = await fetch(`${API_BASE_URL}/realtime-data?farm_id=${farmId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error("네트워크 응답 오류: " + response.statusText)
    }

    // 서버 응답 데이터 형식에 따라 가공
    const processedData = data.map((item) => ({
      time: new Date(item.time_interval).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
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

// 기록 데이터 가져오기
async function fetchHistoryData() {
  // "2025년 02월 27일 (목요일)"에서 "2025년 02월 27일"만 추출
  const selectedDate = document.getElementById("history-date").innerText.split(" (")[0]

  // 날짜 변환: "2025년 02월 27일" -> "2025-02-27"
  const formattedDate = selectedDate.replace("년", "-").replace("월", "-").replace("일", "").replace(/\s+/g, "").trim()

  // '2025-02-27' 형식인지 확인하고, 아니면 오류 처리
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (!datePattern.test(formattedDate)) {
    console.error("날짜 형식이 잘못되었습니다:", formattedDate)
    return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
  }

  try {
    const farmId = sessionStorage.getItem("farm_id")
    const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${formattedDate}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error("네트워크 응답 오류: " + response.statusText)
    }

    // 서버 응답이 배열인지 확인
    if (!Array.isArray(data)) {
      console.error("서버 응답 데이터가 배열이 아닙니다.", data)
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] }
    }

    // 서버 응답 데이터 가공
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

// 기록 차트 데이터 갱신
async function updateHistoryChartData() {
  const historyData = await fetchHistoryData()

  // 온도 차트 업데이트
  temperatureChart.data.labels = historyData.timeLabels
  temperatureChart.data.datasets[0].data = historyData.temperatureData
  temperatureChart.update()

  // 습도 차트 업데이트
  humidityChart.data.labels = historyData.timeLabels
  humidityChart.data.datasets[0].data = historyData.humidityData
  humidityChart.update()

  // 토양 수분 차트 업데이트
  soilChart.data.labels = historyData.timeLabels
  soilChart.data.datasets[0].data = historyData.soilData
  soilChart.update()

  // CO2 차트 업데이트
  co2Chart.data.labels = historyData.timeLabels
  co2Chart.data.datasets[0].data = historyData.co2Data
  co2Chart.update()
}

// 평균 데이터
async function updateSummaryChart() {
  const historyData = await fetchHistoryData()

  // 각 항목의 평균값 계산
  const avgTemperature = roundToTwo(average(historyData.temperatureData))
  const avgHumidity = roundToTwo(average(historyData.humidityData))
  const avgSoil = roundToTwo(average(historyData.soilData))
  const avgCo2 = roundToTwo(average(historyData.co2Data)) // CO2는 10으로 나누지 않음, 후에 차트에서 나누기

  // 요약 차트 데이터 업데이트
  summaryChart.data.datasets[0].data = [avgTemperature] // 온도 평균값
  summaryChart.data.datasets[1].data = [avgHumidity] // 습도 평균값
  summaryChart.data.datasets[2].data = [avgSoil] // 토양 수분 평균값
  summaryChart.data.datasets[3].data = [avgCo2 / 10] // CO2 평균값 (차트에서만 나누기)

  summaryChart.update()
}

// 평균값 계산 함수
function average(dataArray) {
  if (dataArray.length === 0) return 0
  const sum = dataArray.reduce((acc, value) => acc + value, 0)
  return sum / dataArray.length
}

// 소수점 2자리 반올림 함수
function roundToTwo(num) {
  return Math.round(num * 100) / 100
}

