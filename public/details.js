
    const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app";

    const growthStages = [
      { image: "images/씨앗.png", text: "씨앗" },
      { image: "images/새싹.png", text: "새싹" },
      { image: "images/성장.gif", text: "성장" },
      { image: "images/열매.gif", text: "열매" }
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

    // 테마 변경
    function toggleMode() {
      const htmlElement = document.documentElement;
      const modeToggleImg = document.getElementById('mode-toggle');

      if (htmlElement.classList.contains('dark-theme')) {
          htmlElement.classList.remove('dark-theme');
          htmlElement.classList.add('light-theme');
          modeToggleImg.src = 'images/lightmode2.png'; // 라이트 모드 이미지
      } else {
          htmlElement.classList.remove('light-theme');
          htmlElement.classList.add('dark-theme');
          modeToggleImg.src = 'images/darkmode2.png'; // 다크 모드 이미지
      }
    }

    // 로그아웃 처리 
    const logoutButton = document.getElementById("logout-btn");       
    logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem("user_id");
      alert("로그아웃");
      window.location.href = "Login.html";
    });

    document.addEventListener('DOMContentLoaded', async () => {
      // 현재 날짜 설정
      const today = new Date();
      let currentDate = new Date();

      // 날짜 포맷 함수
      function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const weekday = weekdays[date.getDay()];

        // 날짜 포맷: "2025년 02월 27일 (금요일)"
        return `${year}년 ${month}월 ${day}일 (${weekday})`;
      }

      // 날짜 표시 업데이트
      function updateDateDisplay() {
        // 날짜 표시 업데이트
        const formattedDate = formatDate(currentDate);
        
        // 'currentDate'와 'history-date'에 날짜만 표시
        //document.getElementById('currentDate').textContent = formattedDate.split(' (')[0];
        document.getElementById('history-date').textContent = formattedDate;
        document.getElementById('summary-date').textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 센서별 평균값`;
      }

      // 탭 전환 기능
      const tabs = document.querySelectorAll('.tab');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.getAttribute('data-tab');
          
          // 탭 활성화
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          // 탭 컨텐츠 활성화
          tabContents.forEach(content => content.classList.remove('active'));
          document.getElementById(`${tabId}-tab`).classList.add('active');

          if (tabId == 'history'){
            updateChartData(); // 실시간 차트 가져오기
            updateHistoryChartData(); // 기록 차트 가져오기
            updateSummaryChart(); // 요약 차트 가져오기
          }
        });
      });
      
      // 센서 탭 전환 기능
      const sensorTabs = document.querySelectorAll('.sensor-tab');
      const sensorCharts = document.querySelectorAll('.sensor-chart');
      
      sensorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const sensorId = tab.getAttribute('data-sensor');
          
          // 센서 탭 활성화
          sensorTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          // 센서 차트 활성화
          sensorCharts.forEach(chart => chart.classList.remove('active'));
          document.getElementById(`${sensorId}-chart`).classList.add('active');
        });
      });
      
      document.getElementById('prev-date').addEventListener('click', async () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
        await updateAllCharts(); // 데이터를 기다리고 차트 업데이트
      });
      
      document.getElementById('next-date').addEventListener('click', async () => {
        if (currentDate < today) {
          currentDate.setDate(currentDate.getDate() + 1);
          updateDateDisplay();
          await updateAllCharts(); // 데이터를 기다리고 차트 업데이트
        }
      });

      // 세션스토리지에서 user_id와 farm_id 가져오기
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
      // 시작 버튼 클릭 시 농장 상태 가져오기
      document.getElementById('start-farm-btn').addEventListener('click', () => {
        startButton.style.display = 'none';
        cropInfo.classList.add('visible');
        
        fetch(`${API_BASE_URL}/start-farm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ farmId })
        })
        .then(response => response.json())
        .then(data => {
          if (data.harvestDays) {
            const harvestDays = data.harvestDays;
            const today = new Date();
            const startDate = new Date();
            const harvestDate = new Date(startDate);
            harvestDate.setDate(harvestDate.getDate() + harvestDays); // 수확일 계산

            const timeDiff = harvestDate - today;
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24)); // 남은 일수 계산

            // D-Day 출력
            document.getElementById('d-day').textContent = `D-Day: ${daysLeft > 0 ? daysLeft + '일 남음' : '수확 가능'}`;

            // 원형 바 업데이트
            const growthRate = ((harvestDays - daysLeft) / harvestDays) * 100; // 성장률 계산

            growthCircle.style.background = `conic-gradient(#10b981 ${growthRate}%, #e5e7eb ${growthRate}%)`;
            growthText.textContent = `${Math.round(growthRate)}%`;
          }
        })
        .catch(error => alert('오류 발생'));
      });

      function fetchFarmStatus() {
        fetch(`${API_BASE_URL}/get-farm-status/${farmId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('농장 정보를 가져오는 데 실패했습니다.');
            }
            return response.json();
          })
          .then(data => {
            const { farm_name, growthRate, harvestDays, startDate, farmActive } = data;

            farmNameText.textContent = farm_name;
            sessionStorage.setItem('farmName', farm_name);

            // farmActive가 1일 경우, startButton 숨기고 cropInfo 표시
            if (farmActive === 1) {
              startButton.style.display = 'none'; // startButton 숨기기
              cropInfo.classList.add('visible'); // cropInfo 보이기
            } else {
              startButton.style.display = 'block'; // startButton 보이기
              cropInfo.classList.remove('visible'); // cropInfo 숨기기
            }
            
            // 성장률과 날짜 정보 업데이트
            updateGrowthStatus(growthRate, harvestDays, startDate);
          })
          .catch(error => {
            alert(error.message);
          });
      }

      function formatDateYMD(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      function updateGrowthStatus(growthRate, harvestDays, startDate) {
        // 성장률 100%를 넘지 않도록 보정
        growthRate = Math.min(growthRate, 100);
      
        // 성장률 표시 및 원형 프로그래스 바 업데이트
        document.getElementById('growth-rate').textContent = `${growthRate}%`;
        growthCircle.style.background = `conic-gradient(#10b981 ${growthRate}%, #e5e7eb ${growthRate}%)`;
      
        // 시작일 표시
        const formattedStartDate = formatDateYMD(startDate);
        document.getElementById('start-date').textContent = `시작일: ${formattedStartDate}`;
      
        // D-Day 계산 및 표시
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
      
        // 성장 상태, 이미지, 단계 표시 업데이트
        updateGrowthStageByRate(growthRate);
      }
      
      function updateGrowthStageByRate(growthRate) {
        const plantImage = document.getElementById("plantImage");
        const growthText = document.getElementById("growthText");
        const stageElements = document.querySelectorAll(".stage");
      
        let stageText = "";
        let stageIndex = 0;
      
        // 성장률에 따라 상태 결정
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
      
        // 이미지 및 텍스트 업데이트
        plantImage.src = growthStages[stageIndex].image;
        growthText.textContent = `현재 성장 단계: ${stageText}`;
      
        // 단계 표시(active 클래스 업데이트)
        stageElements.forEach((el, idx) => {
          if (idx <= stageIndex) {
            el.classList.add("active");
          } else {
            el.classList.remove("active");
          }
        });
      }

      // 센서별 최적 수치 불러오기
      async function fetchCropOptimalValues() {
        const farmType = sessionStorage.getItem('farmType');
        console.log("작물 종류" + farmType);
        try {
          const response = await fetch(`${API_BASE_URL}/get-Crop-OptimalValues?farm_type=${farmType}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }

          // data (conditions)에서 값 추출
          const {
            temperature: { optimal_min: tempMin, optimal_max: tempMax },
            humidity: { optimal_min: humidMin, optimal_max: humidMax },
            soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
            co2: { optimal_min: co2Min, optimal_max: co2Max }
          } = data;

          // HTML 요소에 값 적용
          tempOptimal.textContent = `${tempMin} ~ ${tempMax}`;
          humidOptimal.textContent = `${humidMin} ~ ${humidMax}`;
          soilOptimal.textContent = `${soilMin} ~ ${soilMax}`;
          co2Optimal.textContent = `${co2Min} ~ ${co2Max}`;

          // 설정 패널에 현재 최적 수치 설정
          document.getElementById('temp-min').value = tempMin;
          document.getElementById('temp-max').value = tempMax;
          document.getElementById('humid-min').value = humidMin;
          document.getElementById('humid-max').value = humidMax;
          document.getElementById('soil-min').value = soilMin;
          document.getElementById('soil-max').value = soilMax;
          document.getElementById('co2-min').value = co2Min;
          document.getElementById('co2-max').value = co2Max;

          // 로컬 스토리지에 저장된 사용자 정의 값이 있으면 불러오기
          loadCustomOptimalValues();

        } catch (error) {
          console.error("작물 최적 수치 불러오기 실패:", error);
        }
      }

      // 사용자 정의 최적 수치 저장하기
      async function saveCustomOptimalValues() {
        const tempMin = document.getElementById('temp-min').value;
        const tempMax = document.getElementById('temp-max').value;
        const humidMin = document.getElementById('humid-min').value;
        const humidMax = document.getElementById('humid-max').value;
        const soilMin = document.getElementById('soil-min').value;
        const soilMax = document.getElementById('soil-max').value;
        const co2Min = document.getElementById('co2-min').value;
        const co2Max = document.getElementById('co2-max').value;

        // 유효성 검사
        if (parseInt(tempMin) > parseInt(tempMax) || 
            parseInt(humidMin) > parseInt(humidMax) || 
            parseInt(soilMin) > parseInt(soilMax) || 
            parseInt(co2Min) > parseInt(co2Max)) {
          alert('최소값은 최대값보다 작아야 합니다.');
          return false;
        }

        // 로컬 스토리지에 저장
        const customValues = {
          temperature: { optimal_min: tempMin, optimal_max: tempMax },
          humidity: { optimal_min: humidMin, optimal_max: humidMax },
          soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
          co2: { optimal_min: co2Min, optimal_max: co2Max }
        };

        localStorage.setItem(`customOptimalValues_${farmId}`, JSON.stringify(customValues));

        // UI 업데이트
        tempOptimal.textContent = `${tempMin} ~ ${tempMax}`;
        humidOptimal.textContent = `${humidMin} ~ ${humidMax}`;
        soilOptimal.textContent = `${soilMin} ~ ${soilMax}`;
        co2Optimal.textContent = `${co2Min} ~ ${co2Max}`;

        // 서버에 저장
        try {
          const farmType = sessionStorage.getItem('farmType');
          const response = await fetch(`${API_BASE_URL}/change-Crop-OptimalValues`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              farm_type: farmType,
              temperature: {
                optimal_min: parseInt(tempMin),
                optimal_max: parseInt(tempMax)
              },
              humidity: {
                optimal_min: parseInt(humidMin),
                optimal_max: parseInt(humidMax)
              },
              soil_moisture: {
                optimal_min: parseInt(soilMin),
                optimal_max: parseInt(soilMax)
              },
              co2: {
                optimal_min: parseInt(co2Min),
                optimal_max: parseInt(co2Max)
              }
            })
          });

          if (!response.ok) {
            throw new Error('서버 응답 오류: ' + response.statusText);
          }

          const result = await response.json();
          console.log('최적 수치 업데이트 결과:', result);
          
        } catch (error) {
          console.error('최적 수치 서버 저장 실패:', error);
          alert('서버에 최적 수치 저장 중 오류가 발생했습니다.');
        }

        return true;
      }

      // 사용자 정의 최적 수치 불러오기
      function loadCustomOptimalValues() {
        const savedValues = localStorage.getItem(`customOptimalValues_${farmId}`);
        
        if (savedValues) {
          const customValues = JSON.parse(savedValues);
          
          // UI 업데이트
          tempOptimal.textContent = `${customValues.temperature.optimal_min} ~ ${customValues.temperature.optimal_max}`;
          humidOptimal.textContent = `${customValues.humidity.optimal_min} ~ ${customValues.humidity.optimal_max}`;
          soilOptimal.textContent = `${customValues.soil_moisture.optimal_min} ~ ${customValues.soil_moisture.optimal_max}`;
          co2Optimal.textContent = `${customValues.co2.optimal_min} ~ ${customValues.co2.optimal_max}`;
          
          // 설정 패널 입력 필드 업데이트
          document.getElementById('temp-min').value = customValues.temperature.optimal_min;
          document.getElementById('temp-max').value = customValues.temperature.optimal_max;
          document.getElementById('humid-min').value = customValues.humidity.optimal_min;
          document.getElementById('humid-max').value = customValues.humidity.optimal_max;
          document.getElementById('soil-min').value = customValues.soil_moisture.optimal_min;
          document.getElementById('soil-max').value = customValues.soil_moisture.optimal_max;
          document.getElementById('co2-min').value = customValues.co2.optimal_min;
          document.getElementById('co2-max').value = customValues.co2.optimal_max;
        }
      }

      // 이름 불러오기
      async function fetchName() {
        try {
          const response = await fetch(`${API_BASE_URL}/getName?user_id=${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }

          const username = data.username;
          document.getElementById('username').textContent = `${username}님`;
        } catch (error) {
          console.error("사용자 이름 불러오기 실패:", error);
        }
      }

      // 센서 데이터를 가져와 화면에 업데이트하는 함수
      async function fetchSensorData() {
        try {
          //if (!userId) {
          //  alert("사용자 정보를 확인할 수 없습니다. 로그인 후 다시 시도해주세요.");
          //  window.location.href = "Login.html";
          //  return;
          //}

          //if (!farmId) {
          //  alert("스마트팜 정보를 확인할 수 없습니다. 스마트팜 추가가 후 다시 시도해주세요.");
          //  window.location.href = "farm.html";
          //  return;
          //}

          const response = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farmId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }

          // 각 센서 데이터 업데이트
          updateSensorUI('temperature', data.temperature, 'temp', 0, 40); // 온도
          updateSensorUI('humidity', data.humidity, 'humidity', 0, 100); // 습도
          updateSensorUI('soil_moisture', data.soil_moisture, 'soil', 0, 100); // 토양 수분
          updateSensorUI('co2', data.co2, 'co2', 0, 1000); // CO2
        } catch (error) {
          console.error('데이터 가져오기 실패:', error);
        }
      }

      // 센서 UI 업데이트 함수
      function updateSensorUI(sensorType, value, className, min, max) {
        // 센서 값과 단위 설정
        let unit = '';
        switch (sensorType) {
          case 'temperature':
            unit = '°C';
            break;
          case 'humidity':
          case 'soil_moisture':
            unit = '%';
            break;
          case 'co2':
            unit = 'ppm';
            break;
        }

        // 센서 값 업데이트
        const valueElement = document.querySelector(`.sensor-value.${className}`);
        if (valueElement) {
          valueElement.innerHTML = `${value}<span class="sensor-unit">${unit}</span>`;
        }

        // 진행 바 너비 계산 및 업데이트
        const progressBar = document.querySelector(`.progress-container .progress-bar.${className}`);
        if (progressBar) {
          const percentage = ((value - min) / (max - min)) * 100;
          progressBar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
        }
      }

      // 상태 가져오기
      async function fetchDevicesStatus() {
        try {
          const response = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farmId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }

          // 각 장치의 상태 업데이트
          updateSwitchUI('led', data.led);
          updateSwitchUI('fan', data.fan);
          updateSwitchUI('water', data.water);
          updateSwitchUI('heater', data.heater);
          updateSwitchUI('cooler', data.cooler);
        } catch (error) {
          console.error('상태 가져오기 실패:', error);
        }
      }

      // 실시간 데이터 불러오기
      async function fetchRealtimeData() {
        try {
          const response = await fetch(`${API_BASE_URL}/realtime-data?farm_id=${farmId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }

          // 서버 응답 데이터 형식에 따라 가공
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

      // 실시간 차트 데이터 업데이트
      async function updateChartData() {
        const realtimeData = await fetchRealtimeData();
        
        // 차트 데이터 갱신
        realtimeChart.data.labels = realtimeData.map(item => item.time);
        realtimeChart.data.datasets[0].data = realtimeData.map(item => item.temperature);
        realtimeChart.data.datasets[1].data = realtimeData.map(item => item.humidity);
        realtimeChart.data.datasets[2].data = realtimeData.map(item => item.soil);
        realtimeChart.data.datasets[3].data = realtimeData.map(item => item.co2);
        
        realtimeChart.update();
      }

      // CSS 변수 값을 가져오는 함수
      function getCssVariable(variable) {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
      }

      // 차트 초기화
      const realtimeChart = new Chart(
        document.getElementById('realtime-chart'),
        {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: '온도 (°C)',
                data: [],
                borderColor: 'rgb(249, 115, 22)',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y1', 
              },
              {
                label: '습도 (%)',
                data: [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y1',  
              },
              {
                label: '토양 수분 (%)',
                data: [],
                borderColor: 'rgb(255, 223, 0)',
                backgroundColor: 'rgba(255, 223, 0, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y1', 
              },
              {
                label: 'CO2 (ppm)',
                data: [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y2',  
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                titlecolor: '#000000',
                bodycolor: '#000000'
              }
            },
            scales: {
              // 좌측 y축 (온도, 습도, 토양 수분)
              y1: {
                beginAtZero: false,
                position: 'left',
                ticks: {
                  max: 80, 
                  min: 0, 
                  color: '#000000'
                }
              },
              // 우측 y축 (CO2)
              y2: {
                beginAtZero: false,
                position: 'right',
                grid: {
                  drawOnChartArea: false, 
                },
                ticks: {
                  max: 1000, 
                  min: 0,
                  color: '#000000'
                }
              }
            }
          }
        }
      );
      
      // 기록 데이터 가져오기
      async function fetchHistoryData() {
        // "2025년 02월 27일 (목요일)"에서 "2025년 02월 27일"만 추출
        const selectedDate = document.getElementById('history-date').innerText.split(' (')[0];
      
        // 날짜 변환: "2025년 02월 27일" -> "2025-02-27"
        let formattedDate = selectedDate.replace('년', '-').replace('월', '-').replace('일', '').replace(/\s+/g, '').trim();
      
        // '2025-02-27' 형식인지 확인하고, 아니면 오류 처리
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (!datePattern.test(formattedDate)) {
          console.error('날짜 형식이 잘못되었습니다:', formattedDate);
          return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
        }
      
        try {
          const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${formattedDate}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
      
          const data = await response.json();
      
          if (!response.ok) {
            throw new Error('네트워크 응답 오류: ' + response.statusText);
          }
          
          // 서버 응답이 배열인지 확인
          if (!Array.isArray(data)) {
            console.error('서버 응답 데이터가 배열이 아닙니다.', data);
            return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
          }
      
          // 서버 응답 데이터 가공
          const processedData = {
            timeLabels: data.map(item => new Date(item.time_interval).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })),
            temperatureData: data.map(item => parseFloat(item.avg_temperature)),
            humidityData: data.map(item => parseFloat(item.avg_humidity)),
            soilData: data.map(item => parseFloat(item.avg_soil_moisture)),
            co2Data: data.map(item => parseInt(item.avg_co2)),
          };
      
          return processedData;
        } catch (error) {
          console.error('기록 데이터 가져오기 오류:', error);
          return { timeLabels: [], temperatureData: [], humidityData: [], soilData: [], co2Data: [] };
        }
      }

      // 변수 선언을 추가합니다.
      let timeLabels = [];
      let temperatureData = [];
      let humidityData = [];
      let soilData = [];
      let co2Data = [];

      // 기록 차트 데이터 갱신
      async function updateHistoryChartData() {
        const historyData = await fetchHistoryData();
      
        // 온도 차트 업데이트
        temperatureChart.data.labels = historyData.timeLabels;
        temperatureChart.data.datasets[0].data = historyData.temperatureData;
        temperatureChart.update();
      
        // 습도 차트 업데이트
        humidityChart.data.labels = historyData.timeLabels;
        humidityChart.data.datasets[0].data = historyData.humidityData;
        humidityChart.update();
      
        // 토양 수분 차트 업데이트
        soilChart.data.labels = historyData.timeLabels;
        soilChart.data.datasets[0].data = historyData.soilData;
        soilChart.update();
      
        // CO2 차트 업데이트
        co2Chart.data.labels = historyData.timeLabels;
        co2Chart.data.datasets[0].data = historyData.co2Data;
        co2Chart.update();
      }    

      // 온도 차트
      const temperatureChart = new Chart(
        document.getElementById('temperature-canvas'),
        {
          type: 'line',
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: '온도 (°C)',
                data: temperatureData,
                borderColor: 'rgb(249, 115, 22)',
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                titlecolor: '#000000',
                bodycolor: '#000000'
              }
            },
            scales: {
              y: {
                min: 0,
                max: 40,
                title: {
                  display: true,
                  text: '온도 (°C)'
                },
                ticks: {
                  color: '#000000'
                }
              }
            }
          }
        }
      );
      
      // 습도 차트
      const humidityChart = new Chart(
        document.getElementById('humidity-canvas'),
        {
          type: 'line',
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: '습도 (%)',
                data: humidityData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,titlecolor: '#000000',
                bodycolor: '#000000'
              }
            },
            scales: {
              y: {
                min: 0,
                max: 100,
                title: {
                  display: true,
                  text: '습도 (%)'
                },
                ticks: {
                  color: '#000000'
                }
              }
            }
          }
        }
      );
      
      // 토양 수분 차트
      const soilChart = new Chart(
        document.getElementById('soil-canvas'),
        {
          type: 'line',
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: '토양 수분 (%)',
                data: soilData,
                borderColor: 'rgb(217, 119, 6)',
                backgroundColor: 'rgba(217, 119, 6, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                titlecolor: '#000000',
                bodycolor: '#000000'
              }
            },
            scales: {
              y: {
                min: 0,
                max: 100,
                title: {
                  display: true,
                  text: '토양 수분 (%)'
                },
                ticks: {
                  color: '#000000'
                }
              }
            }
          }
        }
      );
      
      // CO2 차트
      const co2Chart = new Chart(
        document.getElementById('co2-canvas'),
        {
          type: 'line',
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: 'CO2 (ppm)',
                data: co2Data,
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                titlecolor: '#000000',
                bodycolor: '#000000'
              }
            },
            scales: {
              y: {
                min: 0,
                max: 1000,
                title: {
                  display: true,
                  text: 'CO2 (ppm)'
                },
                ticks: {
                  color: '#000000'
                }
              }
            }
          }
        }
      );

      // 평균 데이터
      async function updateSummaryChart() {
        const historyData = await fetchHistoryData();
        
        // 각 항목의 평균값 계산
        const avgTemperature = roundToTwo(average(historyData.temperatureData));
        const avgHumidity = roundToTwo(average(historyData.humidityData));
        const avgSoil = roundToTwo(average(historyData.soilData));
        const avgCo2 = roundToTwo(average(historyData.co2Data)); // CO2는 10으로 나누지 않음, 후에 차트에서 나누기
        
        // 요약 차트 데이터 업데이트
        summaryChart.data.datasets[0].data = [avgTemperature]; // 온도 평균값
        summaryChart.data.datasets[1].data = [avgHumidity];   // 습도 평균값
        summaryChart.data.datasets[2].data = [avgSoil];       // 토양 수분 평균값
        summaryChart.data.datasets[3].data = [avgCo2 / 10];   // CO2 평균값 (차트에서만 나누기)
        
        summaryChart.update();
      }
      
      // 평균값 계산 함수
      function average(dataArray) {
        if (dataArray.length === 0) return 0;
        const sum = dataArray.reduce((acc, value) => acc + value, 0);
        return sum / dataArray.length;
      }
      
      // 소수점 2자리 반올림 함수
      function roundToTwo(num) {
        return Math.round(num * 100) / 100;
      }

      // 요약 차트
      const summaryChart = new Chart(
        document.getElementById('summary-chart'),
        {
          type: 'bar',
          data: {
            labels: ['평균값'],
            datasets: [
              {
                label: '온도 (°C)',
                data: [24.5],
                backgroundColor: 'rgba(249, 115, 22, 0.7)',
                borderColor: 'rgb(249, 115, 22)',
                borderWidth: 1
              },
              {
                label: '습도 (%)',
                data: [65],
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
              },
              {
                label: '토양 수분 (%)',
                data: [42],
                backgroundColor: 'rgba(217, 119, 6, 0.7)',
                borderColor: 'rgb(217, 119, 6)',
                borderWidth: 1
              },
              {
                label: 'CO2 (ppm/10)',
                data: [65],
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#000000'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.dataset.label === 'CO2 (ppm/10)') {
                      label += context.raw * 10; // 툴팁에서 원본 CO2 값으로 복원
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
              y: {
                beginAtZero: true,
                ticks: {
                  color: '#000000'
                }
              },
              x: {
                beginAtZero: true,
                ticks: {
                  color: '#000000'
                }
              }
            }
          }
        }
      );   

      // 기록, 요약 차트 업데이트 함수
      async function updateAllCharts() {
        const historyData = await fetchHistoryData();

        // historyData가 필요한 데이터를 모두 가지고 있는지 확인
        if (!historyData.timeLabels || !historyData.temperatureData || !historyData.humidityData || !historyData.soilData || !historyData.co2Data) {
          console.error('History data가 부족합니다');
          return;
        }

        // 새로운 데이터 할당
        const newTimeLabels = historyData.timeLabels;
        const newTemperatureData = historyData.temperatureData;
        const newHumidityData = historyData.humidityData;
        const newSoilData = historyData.soilData;
        const newCo2Data = historyData.co2Data;

        // temperatureChart 업데이트
        temperatureChart.data.labels = newTimeLabels;
        temperatureChart.data.datasets[0].data = newTemperatureData;
        temperatureChart.update();

        // humidityChart 업데이트
        humidityChart.data.labels = newTimeLabels;
        humidityChart.data.datasets[0].data = newHumidityData;
        humidityChart.update();

        // soilChart 업데이트
        soilChart.data.labels = newTimeLabels;
        soilChart.data.datasets[0].data = newSoilData;
        soilChart.update();

        // co2Chart 업데이트
        co2Chart.data.labels = newTimeLabels;
        co2Chart.data.datasets[0].data = newCo2Data;
        co2Chart.update();

        // summaryChart 평균값으로 업데이트
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

      // 제어장치 상태 강제 변경하기
      async function updateDevice(device) {
        try {
          if (farmId) {
            // 현재 토글 상태 확인
            const isChecked = document.getElementById(`${device}-switch`).checked;
            // 서버로 상태 변경 요청
            const response = await fetch(`${API_BASE_URL}/devices/force-status`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                farm_id: farmId, 
                device: device, 
                status: isChecked
              })
            });

            if (!response.ok) {
              throw new Error('서버 응답 실패');
            }

            // UI 업데이트
            updateSwitchUI(device, isChecked);

          } else {
            console.error('user_id 또는 farm_id가 존재하지 않습니다.');
          }
        } catch (error) {
          console.error('상태 변경 실패:', error);
        }
      }

      // 스위치 UI 업데이트 함수
      function updateSwitchUI(device, status) {
        const switchElement = document.getElementById(`${device}-switch`);
        const iconElement = document.getElementById(`${device}-icon`);
        const statusElement = document.getElementById(`${device}-status`);

        // 장치 상태에 맞게 UI 업데이트
        if (status) {
          switchElement.checked = true;
          iconElement.classList.add('active');
          statusElement.textContent = '켜짐';

          // 팬이 켜지면 회전 애니메이션 추가
          if (device === 'fan') {
            iconElement.querySelector('i').classList.add('spin');
          }
        } else {
          switchElement.checked = false;
          iconElement.classList.remove('active');
          statusElement.textContent = '꺼짐';

          // 팬이 꺼지면 회전 애니메이션 제거
          if (device === 'fan') {
            iconElement.querySelector('i').classList.remove('spin');
          }
        }
      }

      // 각 장치의 스위치 요소를 가져오기
      const devices = ['led', 'fan', 'water', 'heater', 'cooler'];
        
      // 각 장치에 대해 이벤트 리스너 추가
      devices.forEach(device => {
        const switchElement = document.getElementById(`${device}-switch`);
        if (switchElement) {
          switchElement.addEventListener('change', function() {
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

      // 설정 버튼 클릭 시 패널 표시
      settingsBtn.addEventListener("click", function () {
          settingsPanel.style.display = "block";
      });

      // 닫기 버튼 클릭 시 패널 숨김
      closeSettings.addEventListener("click", function () {
          settingsPanel.style.display = "none";
      });

      // 저장 버튼 클릭 시 설정 저장
      saveSettings.addEventListener("click", function () {
          if (saveCustomOptimalValues()) {
              settingsPanel.style.display = "none";
              alert("최적 수치가 저장되었습니다.");
          }
      });

      // 전체 알림 데이터 저장용
      let allAlarms = [];

      // 날짜 포맷팅 함수 (년, 월, 일, 시, 분 형식)
      function formatDateTime(dateString) {
          const date = new Date(dateString);
          const offset = 9 * 60; // KST offset (UTC+9)
          const kstDate = new Date(date.getTime() - offset * 60000);
          return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ${kstDate.getHours()}시 ${kstDate.getMinutes()}분`;
      }

      // 서버에서 알림 데이터 불러오기
      async function fetchAlarm() {
          try {
              const response = await fetch(`${API_BASE_URL}/getAlarm?farm_id=${farmId}`);
              if (!response.ok) throw new Error('네트워크 오류:' + response.statusText);

              const data = await response.json();

              // 전체 알림 저장 및 정렬 (type 기준 정렬)
              allAlarms = data.sort((a, b) => a.type.localeCompare(b.type) || new Date(b.created_at) - new Date(a.created_at));

              // 최신 알림 표시
              const latestDanger = allAlarms.find(alarm => alarm.type === '위험') || { content: '알림 없음', created_at: '시간' };
              const latestWarning = allAlarms.find(alarm => alarm.type === '경고') || { content: '알림 없음', created_at: '시간' };
              const latestComplete = allAlarms.find(alarm => alarm.type === '완료') || { content: '알림 없음', created_at: '시간' };

              if(latestDanger.content != '알림 없음'){
                document.getElementById('danger-head').textContent = latestDanger.content;
                document.getElementById('danger-time').textContent = formatDateTime(latestDanger.created_at);  
              }
              if(latestWarning.content != '알림 없음'){
                document.getElementById('warning-head').textContent = latestWarning.content;
                document.getElementById('warning-time').textContent = formatDateTime(latestWarning.created_at);
              }
              if(latestComplete.content != '알림 없음'){
                document.getElementById('complete-head').textContent = latestComplete.content;
                document.getElementById('complete-time').textContent = formatDateTime(latestComplete.created_at);
              }
          } catch (error) {
              console.error('알림 불러오기 실패:', error);
          }
          fetchAlarmList();
      }

      // 알림 리스트를 가져오는 함수
      function fetchAlarmList() {
        const alarmListTableBody = document.querySelector('#alarm-list-table tbody');
        const alarmFilter = document.querySelector('#alarm-filter');

        if (!alarmListTableBody || !alarmFilter) {
          console.error("필터 또는 테이블 요소를 찾을 수 없습니다.");
          return;
        }

        // 선택된 필터 값
        const selectedType = alarmFilter.value;

        alarmListTableBody.innerHTML = ''; // 기존 알림 내용 초기화

        if (allAlarms.length === 0) {
          alarmListTableBody.innerHTML = '<tr><td colspan="4">알림이 없습니다.</td></tr>';
        } else {
          // 시간 순으로 알림을 정렬 (가장 최근 알림이 위로 오도록)
          const sortedAlarms = allAlarms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          // 필터링된 알림 리스트 (type 필터링)
          const filteredAlarms = sortedAlarms.filter(alarm => {
            if (!selectedType) return true; // 필터가 선택되지 않으면 모든 알림을 표시
            return alarm.type === selectedType; // type 필터링
          });

          // 정렬된 알림을 테이블로 표시
          filteredAlarms.forEach(alarm => {
            const tr = document.createElement('tr');

            // 알림 내용 앞에 이모지 추가
            const emoji = getEmojiForType(alarm.type);

            // 각 항목을 <td>로 만들어서 테이블에 추가
            const contentTd = document.createElement('td');
            contentTd.textContent = emoji + ' ' + alarm.content;  // 이모지와 알림 내용 결합

            const createdAtTd = document.createElement('td');
            createdAtTd.textContent = formatDateTime(alarm.created_at);

            const deviceTd = document.createElement('td');
            deviceTd.textContent = alarm.device || '장치 없음';

            const typeTd = document.createElement('td');
            typeTd.textContent = alarm.type;

            // tr에 <td>들 추가
            tr.appendChild(contentTd);
            tr.appendChild(createdAtTd);
            tr.appendChild(deviceTd);
            tr.appendChild(typeTd);

            // 테이블 본문에 추가
            alarmListTableBody.appendChild(tr);
          });
        }
      }

      // 알림 유형에 맞는 이모지 반환 함수
      function getEmojiForType(type) {
        switch (type) {
          case '위험':
            return '🔴'; 
          case '경고':
            return '🟡'; 
          case '완료':
            return '🟢'; 
          default:
            return '';
        }
      }

      // 필터 변경 시 알림 리스트 갱신
      document.querySelector('#alarm-filter').addEventListener('change', fetchAlarmList);        

      document.querySelector('.alarm').addEventListener('click', () => {
        // 알림 탭으로 이동하는 코드
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('[data-tab="alarm"]').classList.add('active');
    
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('alarm-tab').classList.add('active');
      });
    
      fetchName(); // 사용자 이름 가져오기
      updateDateDisplay(); // 날짜 표시 업데이트
      fetchSensorData(); // 센서 데이터 가져오기
      fetchDevicesStatus(); // 장치 상태 가져오기
      fetchAlarm(); // 알림 가져오기
      fetchFarmStatus(); // D-DAY 가져오기
      fetchCropOptimalValues(); // 작물의 최적 수치 가져오기
      //setInterval(fetchSensorData, 5000);
      //setInterval(updateChartData, 300000);
    });
  