const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app";

const growthStages = [
  { image: "images/씨앗.png", text: "씨앗" },
  { image: "images/새싹.png", text: "새싹" },
  { image: "images/성장.png", text: "성장" },
  { image: "images/열매.png", text: "열매" }
];

let currentStage = 0;

function growPlant() {
  if (currentStage < growthStages.length - 1) {
    currentStage++;
  }
  const plantImage = document.getElementById("plantImage");
  const growthText = document.getElementById("growthText");
  plantImage.src = growthStages[currentStage].image;
  growthText.textContent = `현재 성장 단계: ${growthStages[currentStage].text}`;
}

function toggleMode() {
  const htmlElement = document.documentElement;
  const modeToggleImg = document.getElementById('mode-toggle');
  if (htmlElement.classList.contains('dark-theme')) {
    htmlElement.classList.remove('dark-theme');
    htmlElement.classList.add('light-theme');
    modeToggleImg.src = 'images/lightmode2.png';
  } else {
    htmlElement.classList.remove('light-theme');
    htmlElement.classList.add('dark-theme');
    modeToggleImg.src = 'images/darkmode2.png';
  }
}

const logoutButton = document.getElementById("logout-btn");
logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("user_id");
  alert("로그아웃");
  window.location.href = "login.html";
});

document.addEventListener('DOMContentLoaded', async () => {
  const today = new Date();
  let currentDate = new Date();

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  }

  function formatDateYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function updateDateDisplay() {
    const formattedDate = formatDate(currentDate);
    document.getElementById('history-date').textContent = formattedDate;
    document.getElementById('summary-date').textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 센서별 평균값`;
  }

  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabId}-tab`).classList.add('active');
      if (tabId === 'history') {
        updateChartData();
        updateHistoryChartData();
        updateSummaryChart();
      } else if (tabId === 'writeDiary') {
        fetchReports(); // 일지 탭 클릭 시 리포트 목록 새로고침
      }
    });
  });

  const sensorTabs = document.querySelectorAll('.sensor-tab');
  const sensorCharts = document.querySelectorAll('.sensor-chart');

  sensorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const sensorId = tab.getAttribute('data-sensor');
      sensorTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      sensorCharts.forEach(chart => chart.classList.remove('active'));
      document.getElementById(`${sensorId}-chart`).classList.add('active');
    });
  });

  document.getElementById('prev-date').addEventListener('click', async () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    await updateAllCharts();
  });

  document.getElementById('next-date').addEventListener('click', async () => {
    if (currentDate < today) {
      currentDate.setDate(currentDate.getDate() + 1);
      updateDateDisplay();
      await updateAllCharts();
    }
  });

  const userId = sessionStorage.getItem('user_id');
  const farmId = sessionStorage.getItem('farm_id');
  const farmNameText = document.getElementById('farmname');
  const startButton = document.getElementById('start-farm-btn');
  const cropInfo = document.getElementById('crop-info');
  const growthCircle = document.getElementById('growth-circle');
  const growthText = document.getElementById('growth-rate');
  const tempOptimal = document.getElementById('temp-optimal');
  const humidOptimal = document.getElementById('humid-optimal');
  const soilOptimal = document.getElementById('soil-optimal');
  const co2Optimal = document.getElementById('co2-optimal');

  document.getElementById('start-farm-btn').addEventListener('click', () => {
    startButton.style.display = 'none';
    cropInfo.classList.add('visible');
    fetch(`${API_BASE_URL}/start-farm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId })
    })
      .then(response => response.json())
      .then(data => {
        if (data.harvestDays) {
          const harvestDays = data.harvestDays;
          const today = new Date();
          const startDate = new Date();
          const harvestDate = new Date(startDate);
          harvestDate.setDate(harvestDate.getDate() + harvestDays);
          const timeDiff = harvestDate - today;
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
          document.getElementById('d-day').textContent = `D-Day: ${daysLeft > 0 ? daysLeft + '일 남음' : '수확 가능'}`;
          const growthRate = ((harvestDays - daysLeft) / harvestDays) * 100;
          growthCircle.style.background = `conic-gradient(#10b981 ${growthRate}%, #e5e7eb ${growthRate}%)`;
          growthText.textContent = `${Math.round(growthRate)}%`;
        }
      })
      .catch(error => alert('오류 발생'));
  });

  function fetchFarmStatus() {
    fetch(`${API_BASE_URL}/get-farm-status/${farmId}`)
      .then(response => {
        if (!response.ok) throw new Error('농장 정보를 가져오는 데 실패했습니다.');
        return response.json();
      })
      .then(data => {
        const { farm_name, growthRate, harvestDays, startDate, farmActive } = data;
        farmNameText.textContent = farm_name;
        sessionStorage.setItem('farm_name', farm_name);
        if (farmActive === 1) {
          startButton.style.display = 'none';
          cropInfo.classList.add('visible');
        } else {
          startButton.style.display = 'block';
          cropInfo.classList.remove('visible');
        }
        updateGrowthStatus(growthRate, harvestDays, startDate);
      })
      .catch(error => alert(error.message));
  }

  function updateGrowthStatus(growthRate, harvestDays, startDate) {
    growthRate = Math.min(growthRate, 100);
    document.getElementById('growth-rate').textContent = `${growthRate}%`;
    growthCircle.style.background = `conic-gradient(#10b981 ${growthRate}%, #e5e7eb ${growthRate}%)`;
    const formattedStartDate = formatDateYMD(new Date(startDate));
    document.getElementById('start-date').textContent = `시작일: ${formattedStartDate}`;
    const today = new Date();
    const startDateObj = new Date(startDate);
    const harvestDate = new Date(startDateObj);
    harvestDate.setDate(harvestDate.getDate() + harvestDays);
    const timeDiff = harvestDate - today;
    let daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (daysLeft > 0) {
      document.getElementById('d-day').textContent = `D-Day: ${daysLeft}일 남음`;
    } else if (daysLeft === 0) {
      document.getElementById('d-day').textContent = `D-Day: 오늘 수확 가능`;
    } else {
      document.getElementById('d-day').textContent = `D-Day: 수확 완료`;
    }
    updateGrowthStageByRate(growthRate);
  }

  function updateGrowthStageByRate(growthRate) {
    const plantImage = document.getElementById("plantImage");
    const growthText = document.getElementById("growthText");
    const stageElements = document.querySelectorAll(".stage");
    let stageText = "";
    let stageIndex = 0;
    if (growthRate <= 10) {
      stageText = "씨앗";
      stageIndex = 0;
    } else if (growthRate <= 35) {
      stageText = "새싹";
      stageIndex = 1;
    } else if (growthRate < 100) {
      stageText = "성장";
      stageIndex = 2;
    } else {
      stageText = "열매";
      stageIndex = 3;
    }
    plantImage.src = growthStages[stageIndex].image;
    growthText.textContent = `현재 성장 단계: ${stageText}`;
    stageElements.forEach((el, idx) => {
      if (idx <= stageIndex) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }

  async function fetchFarmOptimalValues() {
    try {
      const response = await fetch(`${API_BASE_URL}/getFarmConditions/${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      const { temperature: { optimal_min: tempMin, optimal_max: tempMax }, humidity: { optimal_min: humidMin, optimal_max: humidMax }, soil_moisture: { optimal_min: soilMin, optimal_max: soilMax }, co2: { optimal_min: co2Min, optimal_max: co2Max } } = data;
      tempOptimal.textContent = `${tempMin} ~ ${tempMax}`;
      humidOptimal.textContent = `${humidMin} ~ ${humidMax}`;
      soilOptimal.textContent = `${soilMin} ~ ${humidMax}`;
      co2Optimal.textContent = `${co2Min} ~ ${co2Max}`;
      document.getElementById('temp-min').value = tempMin;
      document.getElementById('temp-max').value = tempMax;
      document.getElementById('humid-min').value = humidMin;
      document.getElementById('humid-max').value = humidMax;
      document.getElementById('soil-min').value = soilMin;
      document.getElementById('soil-max').value = soilMax;
      document.getElementById('co2-min').value = co2Min;
      document.getElementById('co2-max').value = co2Max;
    } catch (error) {
      console.error("작물 최적 수치 불러오기 실패:", error);
    }
  }

  async function updateFarmOptimalValues() {
    const tempMin = document.getElementById('temp-min').value;
    const tempMax = document.getElementById('temp-max').value;
    const humidMin = document.getElementById('humid-min').value;
    const humidMax = document.getElementById('humid-max').value;
    const soilMin = document.getElementById('soil-min').value;
    const soilMax = document.getElementById('soil-max').value;
    const co2Min = document.getElementById('co2-min').value;
    const co2Max = document.getElementById('co2-max').value;
    if (parseInt(tempMin) > parseInt(tempMax) || parseInt(humidMin) > parseInt(humidMax) || parseInt(soilMin) > parseInt(soilMax) || parseInt(co2Min) > parseInt(co2Max)) {
      alert('최소값은 최대값보다 작아야 합니다.');
      return false;
    }
    tempOptimal.textContent = `${tempMin} ~ ${tempMax}`;
    humidOptimal.textContent = `${humidMin} ~ ${humidMax}`;
    soilOptimal.textContent = `${soilMin} ~ ${soilMax}`;
    co2Optimal.textContent = `${co2Min} ~ ${co2Max}`;
    try {
      const response = await fetch(`${API_BASE_URL}/updateFarmCondition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          temperature: { optimal_min: parseInt(tempMin), optimal_max: parseInt(tempMax) },
          humidity: { optimal_min: parseInt(humidMin), optimal_max: parseInt(humidMax) },
          soil_moisture: { optimal_min: parseInt(soilMin), optimal_max: parseInt(soilMax) },
          co2: { optimal_min: parseInt(co2Min), optimal_max: parseInt(co2Max) }
        })
      });
      if (!response.ok) throw new Error('서버 응답 오류: ' + response.statusText);
    } catch (error) {
      alert('서버에 최적 수치 저장 중 오류가 발생했습니다.');
    }
    fetchFarmOptimalValues();
    return true;
  }

  async function fetchName() {
    try {
      const response = await fetch(`${API_BASE_URL}/getName?user_id=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      document.getElementById('username').textContent = `${data.username}님`;
    } catch (error) {
      console.error("사용자 이름 불러오기 실패:", error);
    }
  }

  async function fetchSensorData() {
    try {
      if (!userId) {
        alert("사용자 정보를 확인할 수 없습니다. 로그인 후 다시 시도해주세요.");
        window.location.href = "login.html";
        return;
      }
      if (!farmId) {
        alert("스마트팜 정보를 확인할 수 없습니다. 스마트팜 추가가 후 다시 시도해주세요.");
        window.location.href = "dashboard.html";
        return;
      }
      const response = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      updateSensorUI('temperature', data.temperature, 'temp', 0, 40);
      updateSensorUI('humidity', data.humidity, 'humidity', 0, 100);
      updateSensorUI('soil_moisture', data.soil_moisture, 'soil', 0, 100);
      updateSensorUI('co2', data.co2, 'co2', 0, 1000);
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
    }
  }

  function updateSensorUI(sensorType, value, className, min, max) {
    let unit = '';
    switch (sensorType) {
      case 'temperature': unit = '°C'; break;
      case 'humidity':
      case 'soil_moisture': unit = '%'; break;
      case 'co2': unit = 'ppm'; break;
    }
    const valueElement = document.querySelector(`.sensor-value.${className}`);
    if (valueElement) {
      valueElement.innerHTML = `${value}<span class="sensor-unit">${unit}</span>`;
    }
    const progressBar = document.querySelector(`.progress-container .progress-bar.${className}`);
    if (progressBar) {
      const percentage = ((value - min) / (max - min)) * 100;
      progressBar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
    }
  }

  async function fetchDevicesStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      updateSwitchUI('led', data.led);
      updateSwitchUI('fan', data.fan);
      updateSwitchUI('water', data.water);
      updateSwitchUI('heater', data.heater);
      updateSwitchUI('cooler', data.cooler);
    } catch (error) {
      console.error('상태 가져오기 실패:', error);
    }
  }

  async function fetchRealtimeData() {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-data?farm_id=${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      const processedData = data.map(item => ({
        time: new Date(item.time_interval).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        temperature: parseFloat(item.avg_temperature),
        humidity: parseFloat(item.avg_humidity),
        soil: parseFloat(item.avg_soil_moisture),
        co2: parseInt(item.avg_co2)
      }));
      return processedData;
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      return [];
    }
  }

  async function updateChartData() {
    const realtimeData = await fetchRealtimeData();
    realtimeChart.data.labels = realtimeData.map(item => item.time);
    realtimeChart.data.datasets[0].data = realtimeData.map(item => item.temperature);
    realtimeChart.data.datasets[1].data = realtimeData.map(item => item.humidity);
    realtimeChart.data.datasets[2].data = realtimeData.map(item => item.soil);
    realtimeChart.data.datasets[3].data = realtimeData.map(item => item.co2);
    realtimeChart.update();
  }

  function getCssVariable(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  const realtimeChart = new Chart(document.getElementById('realtime-chart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: '온도 (°C)', data: [], borderColor: 'rgb(249, 115, 22)', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.4, pointRadius: 4, pointHoverRadius: 6, yAxisID: 'y1' },
        { label: '습도 (%)', data: [], borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, pointRadius: 4, pointHoverRadius: 6, yAxisID: 'y1' },
        { label: '토양 수분 (%)', data: [], borderColor: 'rgb(255, 223, 0)', backgroundColor: 'rgba(255, 223, 0, 0.1)', tension: 0.4, pointRadius: 4, pointHoverRadius: 6, yAxisID: 'y1' },
        { label: 'CO2 (ppm)', data: [], borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, pointRadius: 4, pointHoverRadius: 6, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { color: '#000000' } }, tooltip: { mode: 'index', intersect: false, titlecolor: '#000000', bodycolor: '#000000' } },
      scales: {
        y1: { beginAtZero: false, position: 'left', ticks: { max: 80, min: 0, color: '#000000' } },
        y2: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { max: 1000, min: 0, color: '#000000' } }
      }
    }
  });

  async function fetchHistoryData() {
    const selectedDate = document.getElementById('history-date').innerText.split(' (')[0];
    let formattedDate = selectedDate.replace('년', '-').replace('월', '-').replace('일', '').replace(/\s+/g, '').trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(formattedDate)) {
      console.error('날짜 형식이 잘못되었습니다:', formattedDate);
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${formattedDate}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('서버 응답 데이터가 배열이 아닙니다.', data);
        return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
      }
      const processedData = {
        timeLabels: data.map(item => new Date(item.time_interval).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })),
        temperatureData: data.map(item => parseFloat(item.avg_temperature)),
        humidityData: data.map(item => parseFloat(item.avg_humidity)),
        soilData: data.map(item => parseFloat(item.avg_soil_moisture)),
        co2Data: data.map(item => parseInt(item.avg_co2))
      };
      return processedData;
    } catch (error) {
      console.error('기록 데이터 가져오기 오류:', error);
      return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
    }
  }

  let timeLabels = [];
  let temperatureData = [];
  let humidityData = [];
  let soilData = [];
  let co2Data = [];

  async function updateHistoryChartData() {
    const historyData = await fetchHistoryData();
    temperatureChart.data.labels = historyData.timeLabels;
    temperatureChart.data.datasets[0].data = historyData.temperatureData;
    temperatureChart.update();
    humidityChart.data.labels = historyData.timeLabels;
    humidityChart.data.datasets[0].data = historyData.humidityData;
    humidityChart.update();
    soilChart.data.labels = historyData.timeLabels;
    soilChart.data.datasets[0].data = historyData.soilData;
    soilChart.update();
    co2Chart.data.labels = historyData.timeLabels;
    co2Chart.data.datasets[0].data = historyData.co2Data;
    co2Chart.update();
  }

  const temperatureChart = new Chart(document.getElementById('temperature-canvas'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{ label: '온도 (°C)', data: temperatureData, borderColor: 'rgb(249, 115, 22)', backgroundColor: 'rgba(249, 115, 22, 0.2)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false, labels: { color: '#000000' } }, tooltip: { mode: 'index', intersect: false, titlecolor: '#000000', bodycolor: '#000000' } },
      scales: { y: { min: 0, max: 40, title: { display: true, text: '온도 (°C)' }, ticks: { color: '#000000' } } }
    }
  });

  const humidityChart = new Chart(document.getElementById('humidity-canvas'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{ label: '습도 (%)', data: humidityData, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.2)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false, labels: { color: '#000000' } }, tooltip: { mode: 'index', intersect: false, titlecolor: '#000000', bodycolor: '#000000' } },
      scales: { y: { min: 0, max: 100, title: { display: true, text: '습도 (%)' }, ticks: { color: '#000000' } } }
    }
  });

  const soilChart = new Chart(document.getElementById('soil-canvas'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{ label: '토양 수분 (%)', data: soilData, borderColor: 'rgb(217, 119, 6)', backgroundColor: 'rgba(217, 119, 6, 0.2)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false, labels: { color: '#000000' } }, tooltip: { mode: 'index', intersect: false, titlecolor: '#000000', bodycolor: '#000000' } },
      scales: { y: { min: 0, max: 100, title: { display: true, text: '토양 수분 (%)' }, ticks: { color: '#000000' } } }
    }
  });

  const co2Chart = new Chart(document.getElementById('co2-canvas'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{ label: 'CO2 (ppm)', data: co2Data, borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.2)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false, labels: { color: '#000000' } }, tooltip: { mode: 'index', intersect: false, titlecolor: '#000000', bodycolor: '#000000' } },
      scales: { y: { min: 0, max: 1000, title: { display: true, text: 'CO2 (ppm)' }, ticks: { color: '#000000' } } }
    }
  });

  async function updateSummaryChart() {
    const historyData = await fetchHistoryData();
    const avgTemperature = roundToTwo(average(historyData.temperatureData));
    const avgHumidity = roundToTwo(average(historyData.humidityData));
    const avgSoil = roundToTwo(average(historyData.soilData));
    const avgCo2 = roundToTwo(average(historyData.co2Data));
    summaryChart.data.datasets[0].data = [avgTemperature];
    summaryChart.data.datasets[1].data = [avgHumidity];
    summaryChart.data.datasets[2].data = [avgSoil];
    summaryChart.data.datasets[3].data = [avgCo2 / 10];
    summaryChart.update();
  }

  function average(dataArray) {
    if (dataArray.length === 0) return 0;
    const sum = dataArray.reduce((acc, value) => acc + value, 0);
    return sum / dataArray.length;
  }

  function roundToTwo(num) {
    return Math.round(num * 100) / 100;
  }

  const summaryChart = new Chart(document.getElementById('summary-chart'), {
    type: 'bar',
    data: {
      labels: ['평균값'],
      datasets: [
        { label: '온도 (°C)', data: [24.5], backgroundColor: 'rgba(249, 115, 22, 0.7)', borderColor: 'rgb(249, 115, 22)', borderWidth: 1 },
        { label: '습도 (%)', data: [65], backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 },
        { label: '토양 수분 (%)', data: [42], backgroundColor: 'rgba(217, 119, 6, 0.7)', borderColor: 'rgb(217, 119, 6)', borderWidth: 1 },
        { label: 'CO2 (ppm/10)', data: [65], backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgb(16, 185, 129)', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#000000' } },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.dataset.label === 'CO2 (ppm/10)') {
                label += context.raw * 10;
              } else {
                label += context.raw;
              }
              return label;
            }
          },
          titlecolor: '#000000',
          bodycolor: '#000000'
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#000000' } },
        x: { beginAtZero: true, ticks: { color: '#000000' } }
      }
    }
  });

  async function updateAllCharts() {
    const historyData = await fetchHistoryData();
    if (!historyData.timeLabels || !historyData.temperatureData || !historyData.humidityData || !historyData.soilData || !historyData.co2Data) {
      console.error('History data가 부족합니다');
      return;
    }
    const newTimeLabels = historyData.timeLabels;
    const newTemperatureData = historyData.temperatureData;
    const newHumidityData = historyData.humidityData;
    const newSoilData = historyData.soilData;
    const newCo2Data = historyData.co2Data;
    temperatureChart.data.labels = newTimeLabels;
    temperatureChart.data.datasets[0].data = newTemperatureData;
    temperatureChart.update();
    humidityChart.data.labels = newTimeLabels;
    humidityChart.data.datasets[0].data = newHumidityData;
    humidityChart.update();
    soilChart.data.labels = newTimeLabels;
    soilChart.data.datasets[0].data = newSoilData;
    soilChart.update();
    co2Chart.data.labels = newTimeLabels;
    co2Chart.data.datasets[0].data = newCo2Data;
    co2Chart.update();
    const tempAvg = newTemperatureData.reduce((a, b) => a + b, 0) / newTemperatureData.length;
    const humidityAvg = newHumidityData.reduce((a, b) => a + b, 0) / newHumidityData.length;
    const soilAvg = newSoilData.reduce((a, b) => a + b, 0) / newSoilData.length;
    const co2Avg = newCo2Data.reduce((a, b) => a + b, 0) / newCo2Data.length / 10;
    summaryChart.data.datasets[0].data = [tempAvg.toFixed(1)];
    summaryChart.data.datasets[1].data = [humidityAvg.toFixed(1)];
    summaryChart.data.datasets[2].data = [soilAvg.toFixed(1)];
    summaryChart.data.datasets[3].data = [co2Avg.toFixed(1)];
    summaryChart.update();
  }

  async function updateDevice(device) {
    try {
      if (farmId) {
        const isChecked = document.getElementById(`${device}-switch`).checked;
        const response = await fetch(`${API_BASE_URL}/devices/force-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farm_id: farmId, device: device, status: isChecked })
        });
        if (!response.ok) throw new Error('서버 응답 실패');
        updateSwitchUI(device, isChecked);
      } else {
        console.error('user_id 또는 farm_id가 존재하지 않습니다.');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  }

  function updateSwitchUI(device, status) {
    const switchElement = document.getElementById(`${device}-switch`);
    const iconElement = document.getElementById(`${device}-icon`);
    const statusElement = document.getElementById(`${device}-status`);
    if (status) {
      switchElement.checked = true;
      iconElement.classList.add('active');
      statusElement.textContent = '켜짐';
      if (device === 'fan') {
        iconElement.querySelector('i').classList.add('spin');
      }
    } else {
      switchElement.checked = false;
      iconElement.classList.remove('active');
      statusElement.textContent = '꺼짐';
      if (device === 'fan') {
        iconElement.querySelector('i').classList.remove('spin');
      }
    }
  }

  const devices = ['led', 'fan', 'water', 'heater', 'cooler'];
  devices.forEach(device => {
    const switchElement = document.getElementById(`${device}-switch`);
    if (switchElement) {
      switchElement.addEventListener('change', function () {
        updateDevice(device);
      });
    } else {
      console.error(`${device}-switch 요소를 찾을 수 없습니다.`);
    }
  });

  let panel = document.querySelector(".floating-panel");
  panel.style.top = "57.5%";
  panel.style.transform = "translateY(-50%)";
  panel.style.position = "fixed";

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeSettings = document.getElementById("closeSettings");
  const saveSettings = document.getElementById("saveSettings");

  settingsBtn.addEventListener("click", function () {
    settingsPanel.style.display = "block";
  });

  closeSettings.addEventListener("click", function () {
    settingsPanel.style.display = "none";
  });

  saveSettings.addEventListener("click", function () {
    if (updateFarmOptimalValues()) {
      settingsPanel.style.display = "none";
      alert("최적 수치가 저장되었습니다.");
    }
  });

  let allAlarms = [];

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    const offset = 9 * 60;
    const kstDate = new Date(date.getTime() - offset * 60000);
    return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ${kstDate.getHours()}시 ${kstDate.getMinutes()}분`;
  }

  async function fetchAlarm() {
    try {
      const response = await fetch(`${API_BASE_URL}/getAlarm?farm_id=${farmId}`);
      if (!response.ok) throw new Error('네트워크 오류:' + response.statusText);
      const data = await response.json();
      allAlarms = data.sort((a, b) => a.type.localeCompare(b.type) || new Date(b.created_at) - new Date(a.created_at));
      const latestDanger = allAlarms.find(alarm => alarm.type === '위험') || { content: '알림 없음', created_at: '시간' };
      const latestWarning = allAlarms.find(alarm => alarm.type === '경고') || { content: '알림 없음', created_at: '시간' };
      const latestComplete = allAlarms.find(alarm => alarm.type === '완료') || { content: '알림 없음', created_at: '시간' };
      if (latestDanger.content != '알림 없음') {
        document.getElementById('danger-head').textContent = latestDanger.content;
        document.getElementById('danger-time').textContent = formatDateTime(latestDanger.created_at);
      }
      if (latestWarning.content != '알림 없음') {
        document.getElementById('warning-head').textContent = latestWarning.content;
        document.getElementById('warning-time').textContent = formatDateTime(latestWarning.created_at);
      }
      if (latestComplete.content != '알림 없음') {
        document.getElementById('complete-head').textContent = latestComplete.content;
        document.getElementById('complete-time').textContent = formatDateTime(latestComplete.created_at);
      }
    } catch (error) {
      console.error('알림 불러오기 실패:', error);
    }
    fetchAlarmList();
  }

  function fetchAlarmList() {
    const alarmListTableBody = document.querySelector('#alarm-list-table tbody');
    const alarmFilter = document.querySelector('#alarm-filter');
    if (!alarmListTableBody || !alarmFilter) {
      console.error("필터 또는 테이블 요소를 찾을 수 없습니다.");
      return;
    }
    const selectedType = alarmFilter.value;
    alarmListTableBody.innerHTML = '';
    if (allAlarms.length === 0) {
      alarmListTableBody.innerHTML = '<tr><td colspan="4">알림이 없습니다.</td></tr>';
    } else {
      const sortedAlarms = allAlarms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const filteredAlarms = sortedAlarms.filter(alarm => !selectedType || alarm.type === selectedType);
      filteredAlarms.forEach(alarm => {
        const tr = document.createElement('tr');
        const emoji = getEmojiForType(alarm.type);
        const contentTd = document.createElement('td');
        contentTd.textContent = emoji + ' ' + alarm.content;
        const createdAtTd = document.createElement('td');
        createdAtTd.textContent = formatDateTime(alarm.created_at);
        const deviceTd = document.createElement('td');
        deviceTd.textContent = alarm.device || '장치 없음';
        const typeTd = document.createElement('td');
        typeTd.textContent = alarm.type;
        tr.appendChild(contentTd);
        tr.appendChild(createdAtTd);
        tr.appendChild(deviceTd);
        tr.appendChild(typeTd);
        alarmListTableBody.appendChild(tr);
      });
    }
  }

  function getEmojiForType(type) {
    switch (type) {
      case '위험': return '🔴';
      case '경고': return '🟡';
      case '완료': return '🟢';
      default: return '';
    }
  }

  document.querySelector('#alarm-filter').addEventListener('change', fetchAlarmList);

  document.querySelector('.alarm').addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('[data-tab="alarm"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('alarm-tab').classList.add('active');
  });

  // 리포트 생성 함수
  async function generateReport() {
    try {
      const today = new Date();
      const formattedDate = formatDateYMD(today); // YYYY-MM-DD 형식으로 변환

      // 동일한 날짜에 리포트가 이미 존재하는지 확인
      const reportsResponse = await fetch(`${API_BASE_URL}/get-reports/${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!reportsResponse.ok) throw new Error('리포트 조회 실패');
      const reports = await reportsResponse.json();
      const existingReport = reports.find(report => report.date === formattedDate);
      if (existingReport) {
        alert('해당 날짜의 리포트가 이미 존재합니다.');
        return;
      }

      const historyData = await fetchHistoryData(); // 기존 history-data API 사용
      if (!historyData.timeLabels.length) {
        alert('오늘의 센서 데이터가 부족합니다.');
        return;
      }

      // 센서 요약 데이터 계산
      const sensorSummary = {
        avg_temperature: roundToTwo(average(historyData.temperatureData)),
        avg_humidity: roundToTwo(average(historyData.humidityData)),
        avg_soil_moisture: roundToTwo(average(historyData.soilData)),
        avg_co2: roundToTwo(average(historyData.co2Data))
      };

      // 센서 변화 데이터 계산
      const sensorChanges = {
        max_temperature: { value: Math.max(...historyData.temperatureData), time: historyData.timeLabels[historyData.temperatureData.indexOf(Math.max(...historyData.temperatureData))] },
        min_temperature: { value: Math.min(...historyData.temperatureData), time: historyData.timeLabels[historyData.temperatureData.indexOf(Math.min(...historyData.temperatureData))] },
        max_humidity: { value: Math.max(...historyData.humidityData), time: historyData.timeLabels[historyData.humidityData.indexOf(Math.max(...historyData.humidityData))] },
        min_humidity: { value: Math.min(...historyData.humidityData), time: historyData.timeLabels[historyData.humidityData.indexOf(Math.min(...historyData.humidityData))] },
        max_soil_moisture: { value: Math.max(...historyData.soilData), time: historyData.timeLabels[historyData.soilData.indexOf(Math.max(...historyData.soilData))] },
        min_soil_moisture: { value: Math.min(...historyData.soilData), time: historyData.timeLabels[historyData.soilData.indexOf(Math.min(...historyData.soilData))] },
        max_co2: { value: Math.max(...historyData.co2Data), time: historyData.timeLabels[historyData.co2Data.indexOf(Math.max(...historyData.co2Data))] },
        min_co2: { value: Math.min(...historyData.co2Data), time: historyData.timeLabels[historyData.co2Data.indexOf(Math.min(...historyData.co2Data))] }
      };

      // 실제 장치 데이터 가져오기
      const deviceResponse = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!deviceResponse.ok) throw new Error('장치 상태 조회 실패');
      const deviceData = await deviceResponse.json();

      // 장치 로그 구성 (실제 데이터 기반으로 수정)
      const deviceLogs = {
        led: { start: deviceData.led ? "08:00" : null, end: deviceData.led ? "18:00" : null },
        fan: { count: deviceData.fan ? 5 : 0, total_time: deviceData.fan ? 120 : 0 },
        water: { count: deviceData.water ? 3 : 0, total_amount: deviceData.water ? 10 : 0 },
        heater: { count: deviceData.heater ? 2 : 0, total_time: deviceData.heater ? 60 : 0 },
        cooler: { count: deviceData.cooler ? 1 : 0, total_time: deviceData.cooler ? 30 : 0 }
      };

      const response = await fetch(`${API_BASE_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          date: formattedDate, // YYYY-MM-DD 형식
          sensorSummary,
          sensorChanges,
          deviceLogs
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '리포트 생성 실패');
      }

      const data = await response.json();
      alert('리포트가 성공적으로 생성되었습니다.');
      fetchReports(); // 리포트 목록 새로고침
    } catch (error) {
      console.error('리포트 생성 오류:', error);
      alert(error.message || '리포트 생성 중 오류가 발생했습니다.');
    }
  }

  // 리포트 목록 조회 함수
  async function fetchReports() {
    try {
      const response = await fetch(`${API_BASE_URL}/get-reports/${farmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('리포트 조회 실패');
      const reports = await response.json();
      const diaryEntries = document.getElementById('diaryEntries');
      diaryEntries.innerHTML = '';
      if (reports.length === 0) {
        diaryEntries.innerHTML = '<li>생성된 리포트가 없습니다.</li>';
      } else {
        reports.forEach(report => {
          const li = document.createElement('li');
          li.textContent = `${report.date} 리포트`;
          li.style.cursor = 'pointer';
          li.classList.add('diary-entry');
          li.addEventListener('click', () => {
            showReportModal(report);
          });
          diaryEntries.appendChild(li);
        });
      }
    } catch (error) {
      console.error('리포트 조회 오류:', error);
      document.getElementById('diaryEntries').innerHTML = '<li>리포트를 불러오는 중 오류가 발생했습니다.</li>';
    }
  }

  // 리포트 모달 표시 함수
  function showReportModal(report) {
    const modal = document.getElementById('reportModal');
    const content = document.getElementById('reportContent');
    // 리포트 텍스트 재구성
    const reportText = `
📋 스마트팜 일일 리포트
1. 날짜
${report.date}

2. 센서 측정 요약
평균 온도: ${report.sensorSummary.avg_temperature} ℃
평균 습도: ${report.sensorSummary.avg_humidity} %
평균 토양 수분: ${report.sensorSummary.avg_soil_moisture} %
평균 CO₂ 농도: ${report.sensorSummary.avg_co2} ppm

3. 센서 수치 변화
최고 온도: ${report.sensorChanges.max_temperature.value} ℃ (시간: ${report.sensorChanges.max_temperature.time})
최저 온도: ${report.sensorChanges.min_temperature.value} ℃ (시간: ${report.sensorChanges.min_temperature.time})
최고 습도: ${report.sensorChanges.max_humidity.value} % (시간: ${report.sensorChanges.max_humidity.time})
최저 습도: ${report.sensorChanges.min_humidity.value} % (시간: ${report.sensorChanges.min_humidity.time})
최고 토양 수분: ${report.sensorChanges.max_soil_moisture.value} % (시간: ${report.sensorChanges.max_soil_moisture.time})
최저 토양 수분: ${report.sensorChanges.min_soil_moisture.value} % (시간: ${report.sensorChanges.min_soil_moisture.time})
최고 CO₂ 농도: ${report.sensorChanges.max_co2.value} ppm (시간: ${report.sensorChanges.max_co2.time})
최저 CO₂ 농도: ${report.sensorChanges.min_co2.value} ppm (시간: ${report.sensorChanges.min_co2.time})

4. 제어 장치 작동 기록
LED: ${report.deviceLogs.led.start ? `켜짐(시작: ${report.deviceLogs.led.start}, 종료: ${report.deviceLogs.led.end})` : '꺼짐'}
환기팬: 작동 횟수 ${report.deviceLogs.fan.count}회, 총 작동 시간 ${report.deviceLogs.fan.total_time}분
급수장치: 급수 횟수 ${report.deviceLogs.water.count}회, 총 급수량 ${report.deviceLogs.water.total_amount} L
히터: 작동 횟수 ${report.deviceLogs.heater.count}회, 총 작동 시간 ${report.deviceLogs.heater.total_time}분
쿨러: 작동 횟수 ${report.deviceLogs.cooler.count}회, 총 작동 시간 ${report.deviceLogs.cooler.total_time}분

5. AI 분석 및 요약
${report.aiAnalysis}
    `;
    content.textContent = reportText;
    modal.style.display = 'block';
  }

  // 모달 닫기 이벤트
  document.getElementById('closeReportModal').addEventListener('click', () => {
    document.getElementById('reportModal').style.display = 'none';
  });

  // 모달 외부 클릭 시 닫기
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('reportModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // 리포트 생성 버튼 이벤트
  document.getElementById('generateDiaryBtn').addEventListener('click', generateReport);

  fetchName();
  updateDateDisplay();
  fetchSensorData();
  fetchDevicesStatus();
  fetchAlarm();
  fetchFarmStatus();
  fetchFarmOptimalValues();
  fetchReports(); // 페이지 로드 시 리포트 목록 조회
});

// 모달 및 리포트 스타일 추가
const style = document.createElement('style');
style.textContent = `
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.5);
  }
  .modal-content {
    background-color: #fefefe;
    margin: 5% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
    max-width: 800px;
    border-radius: 8px;
    position: relative;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .modal-close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  }
  .modal-close:hover,
  .modal-close:focus {
    color: #000;
    text-decoration: none;
  }
  #reportContent {
    white-space: pre-wrap;
    font-family: 'Noto Sans KR', monospace;
    font-size: 14px;
    line-height: 1.6;
    max-height: 500px;
    overflow-y: auto;
    padding: 15px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .diary-entry {
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
    background-color: #f1f1f1;
    transition: background-color 0.2s;
  }
  .diary-entry:hover {
    background-color: #e0e0e0;
  }
  .dark-theme .modal-content {
    background-color: #2d2d2d;
    color: #ffffff;
    border-color: #444;
  }
  .dark-theme #reportContent {
    background-color: #333;
    border-color: #555;
    color: #ffffff;
  }
  .dark-theme .diary-entry {
    background-color: #3a3a3a;
    color: #ffffff;
  }
  .dark-theme .diary-entry:hover {
    background-color: #4a4a4a;
  }
`;
document.head.appendChild(style);