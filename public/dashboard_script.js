const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app";
// 전역 변수
let allFarms = [];
let farmSensors = {};
let farmDevices = {};
let farmOptimalConditions = {};
let isDeleteMode = false;
let selectedFarmIds = [];

// 상태 텍스트 가져오기
function getStatusText(status) {
  return {
    healthy: "정상",
    warning: "주의",
    critical: "위험"
  }[status];
}

// 상태 클래스 가져오기
function getStatusClass(status) {
  return {
    healthy: "status-healthy",
    warning: "status-warning",
    critical: "status-critical"
  }[status];
}

// 센서 상태 판단 (최적 조건 기반)
function getSensorStatus(type, value, farm_id) {
  if (value === null || value === undefined) return '';

  const conditions = farmOptimalConditions[farm_id];
  if (!conditions || !conditions[type]) return '';

  const { optimal_min, optimal_max } = conditions[type];

  if (value < optimal_min - 2 || value > optimal_max + 2) return 'critical';
  if (value < optimal_min || value > optimal_max) return 'warning';
  return 'healthy';
}

// 센서 아이콘 가져오기
function getSensorIcon(type) {
  switch(type) {
    case 'temperature':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
      </svg>`;
    case 'humidity':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path>
      </svg>`;
    case 'soil_moisture':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 16a5 5 0 0 0 10 0c0-6-5-12-5-12s-5 6-5 12z"></path>
      </svg>`;
    case 'co2':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 7H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4"></path>
        <path d="M6 11h.01"></path>
        <path d="M18 7h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2"></path>
        <path d="M10 7h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"></path>
      </svg>`;
    default:
      return '';
  }
}

// 제어장치 아이콘 가져오기
function getControlIcon(type) {
  switch(type) {
    case 'led':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>
      </svg>`;
    case 'water':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
      </svg>`;
    case 'fan':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 12c-3-2.5-3-6.5 0-9 1.5 2.5 1.5 6.5 0 9"></path>
        <path d="M12 12c2.5-3 6.5-3 9 0-2.5 1.5-6.5 1.5-9 0"></path>
        <path d="M12 12c3 2.5 3 6.5 0 9-1.5-2.5-1.5-6.5 0-9"></path>
        <path d="M12 12c-2.5 3-6.5 3-9 0 2.5-1.5 6.5-1.5 9 0"></path>
      </svg>`;
    case 'heater':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 15a5 5 0 1 0 8 0H8Z"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="M12 2v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 4.93-1.41 1.41"></path>
        <path d="M12 10v4"></path>
      </svg>`;
    case 'cooler':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m2 12 10 10V2L2 12Z"></path>
        <path d="m12 2 10 10-10 10V2Z"></path>
      </svg>`;
    default:
      return '';
  }
}

// 센서 값 단위 가져오기
function getSensorUnit(type) {
  switch(type) {
    case 'temperature':
      return '°C';
    case 'humidity':
    case 'soil_moisture':
      return '%';
    case 'co2':
      return 'ppm';
    default:
      return '';
  }
}

// 센서 이름 가져오기
function getSensorName(type) {
  switch(type) {
    case 'temperature':
      return '온도';
    case 'humidity':
      return '습도';
    case 'soil_moisture':
      return '토양수분';
    case 'co2':
      return 'CO2';
    default:
      return '';
  }
}

// 제어장치 이름 가져오기
function getControlName(type) {
  switch(type) {
    case 'led':
      return 'LED';
    case 'water':
      return '급수';
    case 'fan':
      return '환기';
    case 'heater':
      return '히터';
    case 'cooler':
      return '쿨러';
    default:
      return '';
  }
}

// 농장 상태 계산
function calculateFarmStatus(sensors, farm_id) {
  if (!sensors) return 'healthy';

  const entries = Object.entries(sensors).filter(([key]) => !['id', 'farm_id', 'created_at'].includes(key));
  let criticalCount = 0;
  let warningCount = 0;

  entries.forEach(([key, value]) => {
    const status = getSensorStatus(key, value, farm_id);
    if (status === 'critical') criticalCount++;
    else if (status === 'warning') warningCount++;
  });

  if (criticalCount > 0) return 'critical';
  if (warningCount > 0) return 'warning';
  return 'healthy';
}

// 경고 메시지 생성
function generateAlerts(sensors) {
  if (!sensors) return [];
  
  const alerts = [];
  
  if (sensors.temperature !== null && sensors.temperature !== undefined) {
    if (sensors.temperature > 30) {
      alerts.push({ type: "온도 경고", message: `온도가 너무 높습니다 (${sensors.temperature}°C)` });
    } else if (sensors.temperature < 15) {
      alerts.push({ type: "온도 경고", message: `온도가 너무 낮습니다 (${sensors.temperature}°C)` });
    } else if (sensors.temperature > 28 || sensors.temperature < 18) {
      alerts.push({ type: "온도 경고", message: `온도가 적정 범위를 벗어났습니다 (${sensors.temperature}°C)` });
    }
  }
  
  if (sensors.humidity !== null && sensors.humidity !== undefined) {
    if (sensors.humidity < 30) {
      alerts.push({ type: "습도 경고", message: `습도가 너무 낮습니다 (${sensors.humidity}%)` });
    } else if (sensors.humidity > 80) {
      alerts.push({ type: "습도 경고", message: `습도가 너무 높습니다 (${sensors.humidity}%)` });
    }
  }
  
  if (sensors.soil_moisture !== null && sensors.soil_moisture !== undefined) {
    if (sensors.soil_moisture < 20) {
      alerts.push({ type: "토양수분 경고", message: `토양이 매우 건조합니다 (${sensors.soil_moisture}%)` });
    } else if (sensors.soil_moisture < 30) {
      alerts.push({ type: "토양수분 경고", message: `토양이 건조합니다 (${sensors.soil_moisture}%)` });
    }
  }
  
  if (sensors.co2 !== null && sensors.co2 !== undefined) {
    if (sensors.co2 > 800) {
      alerts.push({ type: "CO2 경고", message: `CO2 농도가 너무 높습니다 (${sensors.co2}ppm)` });
    } else if (sensors.co2 > 600) {
      alerts.push({ type: "CO2 경고", message: `CO2 농도가 높습니다 (${sensors.co2}ppm)` });
    }
  }
  
  return alerts;
}

// 메시지 표시
function showMessage(message, type = 'error') {
  const messageContainer = document.getElementById('message-container');
  const className = type === 'success' ? 'success-message' : 'error-message';
  messageContainer.innerHTML = `<div class="${className}">${message}</div>`;
  
  // 3초 후 메시지 사라짐
  setTimeout(() => {
    messageContainer.innerHTML = '';
  }, 3000);
}

// 농장 카드 렌더링
function renderFarmCards(filteredFarms = allFarms) {
  const container = document.getElementById('farm-grid');
  container.innerHTML = '';
  
  if (filteredFarms.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #666;">검색 결과가 없습니다</div>';
    return;
  }
  
  // 삭제 모드일 때 클래스 추가
  if (isDeleteMode) {
    container.classList.add('delete-mode');
  } else {
    container.classList.remove('delete-mode');
  }
  
  filteredFarms.forEach(farm => {
    const sensors = farmSensors[farm.farm_id];
    const devices = farmDevices[farm.farm_id];
    const status = calculateFarmStatus(sensors, farm.farm_id);
    const alerts = generateAlerts(sensors, farm.farm_id);
    
    const card = document.createElement('div');
    card.className = `farm-card ${status === 'critical' ? 'critical' : ''}`;
    card.dataset.farmId = farm.farm_id;
    
    // 삭제 모드일 때 체크박스 추가
    if (isDeleteMode) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'farm-checkbox';
      checkbox.dataset.farmId = farm.farm_id;
      checkbox.checked = selectedFarmIds.includes(farm.farm_id);
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          if (!selectedFarmIds.includes(farm.farm_id)) {
            selectedFarmIds.push(farm.farm_id);
          }
        } else {
          selectedFarmIds = selectedFarmIds.filter(id => id !== farm.farm_id);
        }
        updateSelectedCount();
      });
      card.appendChild(checkbox);
    }
    
    // 카드 내용 컨테이너 추가
    const cardContent = document.createElement('div');
    cardContent.className = 'farm-card-content';
    
    // 삭제 모드가 아닐 때만 클릭 이벤트 추가
    if (!isDeleteMode) {
      cardContent.addEventListener('click', () => {
        sessionStorage.setItem('farm_id', farm.farm_id);
        console.log(farm.farm_id,farm.farm_type);
        sessionStorage.setItem('farm_type', farm.farm_type);
        sessionStorage.setItem('farm_name', farm.farm_name);
        alert(`${farm.farm_name} 농장을 선택했습니다.`);
        window.location.href = 'details.html';
      });
    }
    
    // 센서 HTML 생성
    let sensorsHtml = '<div class="farm-sensors">';
    if (sensors) {
      const sensorFields = [
        { key: 'temperature', value: sensors.temperature },
        { key: 'humidity', value: sensors.humidity },
        { key: 'soil_moisture', value: sensors.soil_moisture },
        { key: 'co2', value: sensors.co2 }
      ];
      
      sensorFields.forEach(({ key, value }) => {
        if (value !== null && value !== undefined) {
          const sensorStatus = getSensorStatus(type, value, farm.farm_id);
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
          `;
        }
      });
    } else {
      sensorsHtml += '<div style="padding: 10px; text-align: center; color: #666;">센서 데이터 없음</div>';
    }
    sensorsHtml += '</div>';
    
    // 제어장치 HTML 생성
    let controlsHtml = '<div class="farm-controls">';
    if (devices) {
      const controlFields = [
        { key: 'led', value: devices.led },
        { key: 'water', value: devices.water },
        { key: 'fan', value: devices.fan },
        { key: 'heater', value: devices.heater },
        { key: 'cooler', value: devices.cooler }
      ];
      
      controlFields.forEach(({ key, value }) => {
        if (value !== null && value !== undefined) {
          controlsHtml += `
            <div class="control">
              <div class="control-icon">
                ${getControlIcon(key)}
              </div>
              <div class="control-label">${getControlName(key)}</div>
              <div class="control-status ${value ? 'status-on' : 'status-off'}"></div>
            </div>
          `;
        }
      });
    } else {
      controlsHtml += '<div style="padding: 10px; text-align: center; color: #666;">제어장치 데이터 없음</div>';
    }
    controlsHtml += '</div>';
    
    // 경고 HTML 생성
    let alertsHtml = '';
    if (alerts && alerts.length > 0) {
      alertsHtml = '<div class="farm-alerts">';
      alertsHtml += `<div class="alert-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        ${alerts.length}개의 경고
      </div>`;
      
      alerts.forEach(alert => {
        alertsHtml += `<div class="alert-message">${alert.message}</div>`;
      });
      
      alertsHtml += '</div>';
    }
    
    const lastUpdated = sensors ? new Date(sensors.created_at).toLocaleString() : '데이터 없음';
    
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
        <strong>작물:</strong> ${farm.farm_type || '일반'}
      </div>
      
      ${alertsHtml}
      
      <div class="last-updated">
        마지막 업데이트: ${lastUpdated}
      </div>
    `;
    
    card.appendChild(cardContent);
    container.appendChild(card);
  });
}

// 농장 데이터 불러오기
async function loadFarmData() {
  try {
    // 세션스토리지에서 user_id 가져오기
    const userId = sessionStorage.getItem('user_id');
    const token = sessionStorage.getItem('token'); // 저장된 토큰 가져오기

    // if (!userId) {
    //   showMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
    //   return;
    // }
    
    // 농장 목록 불러오기
    const farmsResponse = await fetch(`${API_BASE_URL}/getFarms?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // 토큰 포함
        'Content-Type': 'application/json',
      },
    });

    if (!farmsResponse.ok) {
      const errorData = await farmsResponse.json();
      throw new Error(errorData.message || '농장 목록을 불러오는데 실패했습니다.');
    }
    
    const farmsData = await farmsResponse.json();
    allFarms = farmsData.farms;
    
    // 각 농장별 센서 및 제어장치 데이터 불러오기
    await Promise.all(allFarms.map(async (farm) => {
      try {
        // 센서 데이터 불러오기
        const sensorsResponse = await fetch(`${API_BASE_URL}/sensors/status?farm_id=${farm.farm_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`, // 토큰 포함
          },
        });
        if (sensorsResponse.ok) {
          const sensorData = await sensorsResponse.json();
          farmSensors[farm.farm_id] = sensorData;
        }

        // 제어장치 데이터 불러오기
        const devicesResponse = await fetch(`${API_BASE_URL}/devices/status?farm_id=${farm.farm_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`, // 토큰 포함
          },
        });
        if (devicesResponse.ok) {
          const deviceData = await devicesResponse.json();
          farmDevices[farm.farm_id] = deviceData;
        }
        // 🔸 최적 조건 데이터
        const conditionRes = await fetch(`${API_BASE_URL}/getFarmConditions/${farmId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (conditionRes.ok) {
          farmOptimalConditions[farmId] = await conditionRes.json();
        }
      } catch (err) {
        console.error(`농장 ID ${farm.farm_id}의 데이터를 불러오는데 실패했습니다:`, err);
      }
    }));
    
    // 농장 카드 렌더링
    renderFarmCards();
    
  } catch (err) {
    console.error('데이터 로딩 오류:', err);
    showMessage('데이터를 불러오는데 실패했습니다: ' + err.message);
  }
}

// 농장 추가하기
async function addFarm(farmData) {
  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/addFarm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // 토큰 포함
      },
      body: JSON.stringify(farmData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '농장 추가에 실패했습니다.');
    }

    const result = await response.json();
    showMessage(result.message || '농장이 성공적으로 추가되었습니다.', 'success');

    // 농장 목록 새로고침
    await loadFarmData();

    return true;
  } catch (err) {
    console.error('농장 추가 오류:', err);
    showMessage('농장 추가에 실패했습니다: ' + err.message);
    return false;
  }
}

// 농장 삭제하기
async function deleteFarms(farmIds) {
  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/delFarm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // 토큰 포함
      },
      body: JSON.stringify({
        farm_ids: farmIds
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '농장 삭제에 실패했습니다.');
    }
    
    const result = await response.json();
    showMessage(result.message || '농장이 성공적으로 삭제되었습니다.', 'success');
    
    // 농장 목록 새로고침
    await loadFarmData();
    
    return true;
  } catch (err) {
    console.error('농장 삭제 오류:', err);
    showMessage('농장 삭제에 실패했습니다: ' + err.message);
    return false;
  }
}

// 모달 열기
function openModal() {
  document.getElementById('add-farm-modal').classList.add('active');
}

// 모달 닫기
function closeModal() {
  document.getElementById('add-farm-modal').classList.remove('active');
  document.getElementById('add-farm-form').reset();
}

// 삭제 확인 모달 열기
function openDeleteConfirmModal() {
  document.getElementById('delete-count').textContent = selectedFarmIds.length;
  document.getElementById('confirm-delete-modal').classList.add('active');
}

// 삭제 확인 모달 닫기
function closeDeleteConfirmModal() {
  document.getElementById('confirm-delete-modal').classList.remove('active');
}

// 삭제 모드 활성화
function enableDeleteMode() {
  isDeleteMode = true;
  selectedFarmIds = [];
  document.getElementById('delete-mode-container').style.display = 'block';
  document.getElementById('add-farm-btn').style.display = 'none';
  document.getElementById('delete-farms-btn').style.display = 'none';
  updateSelectedCount();
  renderFarmCards();
}

// 삭제 모드 비활성화
function disableDeleteMode() {
  isDeleteMode = false;
  selectedFarmIds = [];
  document.getElementById('delete-mode-container').style.display = 'none';
  document.getElementById('add-farm-btn').style.display = 'block';
  document.getElementById('delete-farms-btn').style.display = 'block';
  renderFarmCards();
}

// 선택된 농장 수 업데이트
function updateSelectedCount() {
  document.getElementById('selected-count').textContent = selectedFarmIds.length;
  const confirmDeleteBtn = document.getElementById('confirm-delete-selected-btn');
  if (selectedFarmIds.length > 0) {
    confirmDeleteBtn.disabled = false;
  } else {
    confirmDeleteBtn.disabled = true;
  }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
  // 초기 데이터 로딩
  loadFarmData();
  
  // 세션스토리지에서 user_id 가져오기
  const userId = sessionStorage.getItem('user_id');
  
  // 검색 기능
  document.getElementById('search-input').addEventListener('input', function(e) {
    const searchQuery = e.target.value.toLowerCase();
    const filteredFarms = allFarms.filter(farm => 
      farm.farm_name.toLowerCase().includes(searchQuery) || 
      farm.farm_location.toLowerCase().includes(searchQuery) ||
      (farm.farm_type && farm.farm_type.toLowerCase().includes(searchQuery))
    );
    renderFarmCards(filteredFarms);
  });
  
  // 필터 버튼
  document.getElementById('filter-all').addEventListener('click', function() {
    setActiveFilter('all');
    renderFarmCards(allFarms);
  });
  
  document.getElementById('filter-critical').addEventListener('click', function() {
    setActiveFilter('critical');
    const filteredFarms = allFarms.filter(farm => 
      calculateFarmStatus(farmSensors[farm.farm_id]) === 'critical'
    );
    renderFarmCards(filteredFarms);
  });
  
  document.getElementById('filter-warning').addEventListener('click', function() {
    setActiveFilter('warning');
    const filteredFarms = allFarms.filter(farm => 
      calculateFarmStatus(farmSensors[farm.farm_id]) === 'warning'
    );
    renderFarmCards(filteredFarms);
  });
  
  document.getElementById('filter-healthy').addEventListener('click', function() {
    setActiveFilter('healthy');
    const filteredFarms = allFarms.filter(farm => 
      calculateFarmStatus(farmSensors[farm.farm_id]) === 'healthy'
    );
    renderFarmCards(filteredFarms);
  });
  
  // 농장 추가 버튼
  document.getElementById('add-farm-btn').addEventListener('click', openModal);
  
  // 농장 삭제 버튼
  document.getElementById('delete-farms-btn').addEventListener('click', enableDeleteMode);
  
  // 삭제 모드 취소 버튼
  document.getElementById('cancel-delete-mode-btn').addEventListener('click', disableDeleteMode);
  
  // 선택 삭제 버튼
  document.getElementById('confirm-delete-selected-btn').addEventListener('click', function() {
    if (selectedFarmIds.length > 0) {
      openDeleteConfirmModal();
    }
  });
  
  // 모달 닫기 버튼
  document.querySelector('.close-modal').addEventListener('click', closeModal);
  document.querySelector('.cancel-btn').addEventListener('click', closeModal);
  
  // 모달 외부 클릭 시 닫기
  document.getElementById('add-farm-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // 농장 추가 폼 제출
  document.getElementById('add-farm-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = sessionStorage.getItem('user_id');
    // if (!userId) {
    //   showMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
    //   return;
    // }
    
    const farmName = document.getElementById('farm-name').value;
    const farmLocation = document.getElementById('farm-location').value;
    const farmType = document.getElementById('farm-type').value;
    
    const farmData = {
      user_id: userId,
      farm_name: farmName,
      farm_location: farmLocation,
      farm_type: farmType
    };
    
    const success = await addFarm(farmData);
    if (success) {
      closeModal();
    }
  });
  
  // 삭제 확인 모달 이벤트
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteConfirmModal);
  
  document.getElementById('confirm-delete-btn').addEventListener('click', async function() {
    if (selectedFarmIds.length > 0) {
      const success = await deleteFarms(selectedFarmIds);
      if (success) {
        closeDeleteConfirmModal();
        disableDeleteMode();
      }
    }
  });
  
  // 삭제 확인 모달 외부 클릭 시 닫기
  document.getElementById('confirm-delete-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeDeleteConfirmModal();
    }
  });
  
  async function fetchName() {
  try {
    const userId = sessionStorage.getItem('user_id');
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/getName?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // 토큰 포함
      },
    });
    if (!response.ok) throw new Error('네트워크 응답 오류: ' + response.statusText);
    const data = await response.json();
    sessionStorage.setItem('user_name', data.username);
  } catch (error) {
    console.error('사용자 이름 불러오기 실패:', error);
  }
}

  fetchName();
});

// 활성 필터 설정
function setActiveFilter(filter) {
  document.querySelectorAll('.filter-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (filter === 'all') {
    document.getElementById('filter-all').classList.add('active');
  } else {
    document.getElementById(`filter-${filter}`).classList.add('active');
  }
}

