// 서버를 만들기 위해 필요한 도구(모듈) 불러오기
const express = require('express'); // 웹 서버를 만들기 위한 도구(Express)
const mariadb = require('mariadb'); // MariaDB 연결 모듈
const path = require('path');
const cors = require('cors'); // CORS 불러오기
const moment = require('moment-timezone');
const axios = require('axios');
// dotenv 패키지를 불러오기
require('dotenv').config();

// OpenAI 모듈 추가
const OpenAI = require("openai");

// 서버 만들기 + 실행할 포트 번호 설정
const app = express(); // 서버를 만든다 (이 변수에 서버 기능을 저장)
const PORT = 8000;     // 서버가 사용할 포트 번호

// 'public' 폴더를 정적 파일 제공 폴더로 설정
app.use(express.static('public'));
app.use(cors()); // 모든 요청에 대해 CORS 허용
// POST 요청을 처리하기 위해 express의 json() 사용
app.use(express.json()); // body-parser가 필요하지 않음

// MariaDB 연결 db 생성
const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// 연결 확인
db.getConnection()
  .then(conn => {
    console.log('MariaDB 연결 성공!');
    conn.release(); // 사용 후 연결 반환
  })
  .catch(err => console.error('MariaDB 연결 실패:', err));

// OpenAI 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// reports 테이블 생성 (최초 실행 시)
async function initializeDatabase() {
  let conn;
  try {
    conn = await db.getConnection();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farm_id INT NOT NULL,
        date DATE NOT NULL,
        sensor_summary JSON NOT NULL,
        sensor_changes JSON NOT NULL,
        device_logs JSON NOT NULL,
        ai_analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(farm_id, date),
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createTableQuery);
    console.log('Reports 테이블 생성 성공');
  } catch (err) {
    console.error('Reports 테이블 생성 실패:', err);
  } finally {
    if (conn) conn.release();
  }
}

// 서버 시작 시 테이블 초기화
initializeDatabase();

// 리포트 생성 엔드포인트
app.post('/generate-report', async (req, res) => {
  let conn;
  try {
    const { farmId, date, sensorSummary, sensorChanges, deviceLogs } = req.body;

    // 입력 데이터 검증
    if (!farmId || !date || !sensorSummary || !sensorChanges || !deviceLogs) {
      return res.status(400).json({ error: '모든 필드가 필요합니다' });
    }

    // 날짜 형식이 YYYY-MM-DD인지 확인
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return res.status(400).json({ error: '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD)' });
    }

    // OpenAI로 AI 분석 생성
    const prompt = `
      스마트팜 일일 리포트를 분석하고 요약해주세요. 다음 데이터를 기반으로:

      1. 센서 측정 요약:
      ${JSON.stringify(sensorSummary, null, 2)}

      2. 센서 수치 변화:
      ${JSON.stringify(sensorChanges, null, 2)}

      3. 제어 장치 작동 기록:
      ${JSON.stringify(deviceLogs, null, 2)}

      출력 형식:
      - 오늘 온도는 [안정적/변동이 심함]했습니다.
      - 습도는 [적정 수준/낮은 경향/높은 경향]을 보였습니다.
      - 토양 수분은 [충분/부족/과다] 상태를 유지했습니다.
      - CO₂ 농도는 [안정적/변동 있음]였습니다.
      - 주요 문제점: (문제점 설명)
      - 개선 제안: (개선 제안)
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '당신은 스마트팜 데이터 분석 전문가입니다.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    });

    const aiAnalysis = response.choices[0].message.content.trim();

    // MariaDB에 리포트 저장
    conn = await db.getConnection();
    const insertQuery = `
      INSERT INTO reports (farm_id, date, sensor_summary, sensor_changes, device_logs, ai_analysis)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await conn.query(insertQuery, [
      farmId,
      date,
      JSON.stringify(sensorSummary),
      JSON.stringify(sensorChanges),
      JSON.stringify(deviceLogs),
      aiAnalysis
    ]);

    // 리포트 텍스트 생성
    const reportText = `
📋 스마트팜 일일 리포트
1. 날짜
${date}

2. 센서 측정 요약
평균 온도: ${sensorSummary.avg_temperature} ℃
평균 습도: ${sensorSummary.avg_humidity} %
평균 토양 수분: ${sensorSummary.avg_soil_moisture} %
평균 CO₂ 농도: ${sensorSummary.avg_co2} ppm

3. 센서 수치 변화
최고 온도: ${sensorChanges.max_temperature.value} ℃ (시간: ${sensorChanges.max_temperature.time})
최저 온도: ${sensorChanges.min_temperature.value} ℃ (시간: ${sensorChanges.min_temperature.time})
최고 습도: ${sensorChanges.max_humidity.value} % (시간: ${sensorChanges.max_humidity.time})
최저 습도: ${sensorChanges.min_humidity.value} % (시간: ${sensorChanges.min_humidity.time})
최고 토양 수분: ${sensorChanges.max_soil_moisture.value} % (시간: ${sensorChanges.max_soil_moisture.time})
최저 토양 수분: ${sensorChanges.min_soil_moisture.value} % (시간: ${sensorChanges.min_soil_moisture.time})
최고 CO₂ 농도: ${sensorChanges.max_co2.value} ppm (시간: ${sensorChanges.max_co2.time})
최저 CO₂ 농도: ${sensorChanges.min_co2.value} ppm (시간: ${sensorChanges.min_co2.time})

4. 제어 장치 작동 기록
LED: ${deviceLogs.led.start ? `켜짐(시작: ${deviceLogs.led.start}, 종료: ${deviceLogs.led.end})` : '꺼짐'}
환기팬: 작동 횟수 ${deviceLogs.fan.count}회, 총 작동 시간 ${deviceLogs.fan.total_time}분
급수장치: 급수 횟수 ${deviceLogs.water.count}회, 총 급수량 ${deviceLogs.water.total_amount} L
히터: 작동 횟수 ${deviceLogs.heater.count}회, 총 작동 시간 ${deviceLogs.heater.total_time}분
쿨러: 작동 횟수 ${deviceLogs.cooler.count}회, 총 작동 시간 ${deviceLogs.cooler.total_time}분

5. AI 분석 및 요약
${aiAnalysis}
    `;

    // BigInt를 Number로 변환하여 직렬화 문제 해결
    res.json({ reportText, reportId: Number(result.insertId) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '해당 날짜의 리포트가 이미 존재합니다.' });
    }
    console.error('리포트 생성 오류:', error);
    res.status(500).json({ error: '리포트 생성 실패' });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/get-reports/:farmId', async (req, res) => {
  let conn;
  try {
    const { farmId } = req.params;
    conn = await db.getConnection();
    const selectQuery = `
      SELECT id, farm_id, date, sensor_summary, sensor_changes, device_logs, ai_analysis, created_at
      FROM reports
      WHERE farm_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const reports = await conn.query(selectQuery, [farmId]);

    const formattedReports = reports.map(report => {
      // JSON 필드가 문자열인지 객체인지 확인
      const sensorSummary = typeof report.sensor_summary === 'string' ? JSON.parse(report.sensor_summary) : report.sensor_summary;
      const sensorChanges = typeof report.sensor_changes === 'string' ? JSON.parse(report.sensor_changes) : report.sensor_changes;
      const deviceLogs = typeof report.device_logs === 'string' ? JSON.parse(report.device_logs) : report.device_logs;

      return {
        id: Number(report.id), // BigInt를 Number로 변환
        farmId: Number(report.farm_id),
        date: report.date.toISOString().split('T')[0],
        sensorSummary,
        sensorChanges,
        deviceLogs,
        aiAnalysis: report.ai_analysis,
        createdAt: report.created_at
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error('리포트 조회 오류:', error);
    res.status(500).json({ error: '리포트 조회 실패' });
  } finally {
    if (conn) conn.release();
  }
});

// 아이디 중복 확인 API (Promise 기반으로 수정)
app.get('/check-userid', async (req, res) => {
  const { user_id } = req.query;
  const query = 'SELECT * FROM users WHERE user_id = ?';
  let conn;

  try {
    conn = await db.getConnection(); // DB 연결
    const results = await conn.query(query, [user_id]);

    if (results.length > 0) {
      console.log(`[GET /check-userid] 이미 사용 중인 아이디: ${user_id}`);
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }
    console.log(`[GET /check-userid] 사용 가능한 아이디: ${user_id}`);
    return res.status(200).json({ message: '사용 가능한 아이디입니다.' });
  } catch (err) {
    console.error('[GET /check-userid] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 회원가입 API
app.post('/signup', async (req, res) => {
  const { user_id, password, username } = req.body;
  const query = 'INSERT INTO users (user_id, password, username) VALUES (?, ?, ?)';
  let conn;

  try {
    conn = await db.getConnection();
    await conn.query(query, [user_id, password, username]);

    console.log(`[POST /signup] 회원가입 성공 - user_id: ${user_id}`);
    return res.status(201).json({ message: '회원가입 성공' });
  } catch (err) {
    console.error('[POST /signup] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 로그인
app.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  const query = 'SELECT * FROM users WHERE user_id = ?';
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id]);

    if (results.length === 0) {
      return res.status(401).json({ message:'존재하지 않는 이메일입니다.' });
    } else {
      const user = results[0];
      // 비밀번호 비교
      if (user.password === password) {
        console.log(`[POST /login] 로그인 성공: ${user_id}`);
        return res.json({ message: '로그인 성공'});
      } else {
        // 비밀번호가 틀린 경우
        console.log(`[POST /login] 로그인 실패: ${user_id} - 잘못된 비밀번호`);
        return res.status(401).json({ message:'잘못된 비밀번호입니다.' });
      } 
    }
  } catch (err) {
    console.error('[POST /login] DB 오류: ' + err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 사용자 이름 불러오기
app.get('/getName', async (req,res) => {
  const user_id = req.query.user_id;
  const query = `SELECT username from users where user_id = ?`;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id]);

    if (results.length > 0) {
      console.log('[GET /getName] 사용자 이름:',results[0].username);
      return res.json({ username: results[0].username });
    }
    console.log('[GET /getName] 사용자 정보를 찾을 수 없습니다.')
    return res.status(404).json({ message:'사용자 정보를 찾을 수 없습니다.' });
  } catch (err) {
    console.error('[GET /getName] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 목록 불러오기
app.get('/getFarms', async(req, res) => {
  const user_id = req.query.user_id;
  const query = `SELECT farm_id, farm_name, farm_location, farm_type, farm_active FROM farms WHERE user_id = ?`;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id]);

    console.log('[GET /getFarms] 농장 목록 불러오기 성공:', results);  // 농장 목록 출력
    return res.json({ farms: results, message: '농장 목록 불러오기 성공' });
  } catch (err) {
    console.error('[GET /getFarms] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 추가하기
app.post('/addFarm', async (req, res) => {
  const { user_id, farm_name, farm_location, farm_type } = req.body;
  const insertFarmQuery = `
    INSERT INTO farms (user_id, farm_name, farm_location, farm_type)
    VALUES (?, ?, ?, ?)
  `;
  const insertDeviceQuery = `
    INSERT INTO devices (farm_id, led, fan, water, heater, cooler)
    VALUES (?, false, false, false, false, false)
  `;
  const selectCropConditionsQuery = `
    SELECT condition_type, min_value, optimal_min, optimal_max, max_value, unit
    FROM crop_conditions
    WHERE crop_type = ?
  `;
  const insertFarmConditionsQuery = `
    INSERT INTO farm_conditions (farm_id, condition_type, min_value, optimal_min, optimal_max, max_value, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. 농장 삽입
    const farmResult = await conn.query(insertFarmQuery, [user_id, farm_name, farm_location, farm_type]);
    const farm_id = farmResult.insertId;
    console.log('[POST /addFarm] 농장 추가 성공');

    // 2. devices 초기화
    await conn.query(insertDeviceQuery, [farm_id]);
    console.log('[POST /addFarm] devices 초기값 추가 성공');

    // 3. crop_conditions에서 조건 복사
    const cropConditions = await conn.query(selectCropConditionsQuery, [farm_type]);

    for (const row of cropConditions) {
      const { condition_type, min_value, optimal_min, optimal_max, max_value, unit } = row;
      await conn.query(insertFarmConditionsQuery, [
        farm_id, condition_type, min_value, optimal_min, optimal_max, max_value, unit
      ]);
    }
    console.log('[POST /addFarm] farm_conditions 복사 성공');

    await conn.commit();
    return res.json({ message: '농장 추가 성공' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[POST /addFarm] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 삭제
app.post('/delFarm', async (req, res) => {
  const farmIds = req.body.farm_ids; // farm_ids 배열이 전달됨
  const deleteDevicesQuery = `DELETE FROM devices WHERE farm_id IN (?)`;
  const deleteSensorsQuery = `DELETE FROM sensors WHERE farm_id IN (?)`;
  const deleteFarmsQuery = `DELETE FROM farms WHERE farm_id IN (?)`;
  let conn;

  try {
    conn = await db.getConnection();
    await conn.query(deleteDevicesQuery, [farmIds]);
    await conn.query(deleteSensorsQuery, [farmIds]);
    const farmResults = await conn.query(deleteFarmsQuery, [farmIds]);

    if (farmResults.affectedRows === 0) {
      return res.status(400).json({ message:'해당 농장이 DB에 존재하지 않습니다.' });
    }

    console.log('[Post /delFarm] 삭제된 농장 id:', farmIds);
    return res.json({ message: '농장 삭제 성공' });
  } catch (err) {
    console.error('DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 센서 데이터 저장
app.post('/sensors', async (req, res) => {
  const { farm_id, temperature, humidity, soil_moisture, co2, created_at } = req.body;
  
  // created_at이 없으면 현재 시간을 한국 시간으로 설정
  const timestamp = created_at 
    ? moment.tz(created_at, "Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') 
    : moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
  
  const query = `INSERT INTO sensors (farm_id, temperature, humidity, soil_moisture, co2, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  const selectQuery = `SELECT * FROM sensors WHERE id = ?`;
  let conn;
  
  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id, temperature, humidity, soil_moisture, co2, timestamp]);
  
    // 방금 삽입된 튜플의 id 가져오기
    const insertedId = results.insertId;

    try {
      const selectResults = await conn.query(selectQuery, [insertedId]);
      console.log('[POST /sensors] 삽입된 데이터:', selectResults[0]);
      res.json({ message: '센서 데이터 저장 성공' });
    
      // 저장된 센서 데이터를 기반으로 제어 여부 체크 및 실행
      //Controldevice(farm_id, temperature, humidity, soil_moisture, co2);
      
    } catch (err) {
      console.error('[POST /sensors] 데이터 조회 오류:', err);
      return res.status(500).json({ message: 'DB 오류' });
    }
  } catch (err) {
    console.error('[POST /sensors] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 최근 센서 데이터 조회
app.get('/sensors/status', async (req, res) => {
  const { farm_id } = req.query;
  const query = `SELECT * FROM sensors WHERE farm_id = ? ORDER BY created_at DESC LIMIT 1`;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);
    if (results.length === 0) {
      console.log('[GET /sensors/status] 조회된 데이터 없음');
      return res.status(404).json({ message:'해당 조건에 맞는 데이터가 없습니다.' });
    }
    console.log('[GET /sensors/status] 센서 조회 성공');
    return res.json(results[0]); 
  } catch (err) {
    console.error('[GET /sensors/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 제어장치 상태 가져오기
app.get('/devices/status', async(req, res) => {
  const { farm_id } = req.query;
  const query = `SELECT * FROM devices WHERE farm_id = ?`
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);

    console.log('[GET /devices/status] 제어장치 조회 성공:');
    return res.json(results[0]);
  } catch (err) {
    console.error('[GET /devices/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 제어장치 상태 변경하기
app.post('/devices/:deviceId/status', async (req, res) => {
  const { farm_id, device, status, content } = req.body;
  const query = `UPDATE devices SET ${device} = ? WHERE farm_id = ?`;
  const alarm_query = `INSERT INTO alarms (farm_id, content, type, device) VALUES (?, ?, ?, ?)`;
  let conn;

  try {
    conn = await db.getConnection();
    await conn.query(query, [status, farm_id]);
    console.log('[/devices/:deviceId/status] 제어장치 변경 성공', device, status);
    
    if (status == 1) {
      await conn.query(alarm_query, [farm_id, content, "경고", device]);
      console.log('[/devices/:deviceId/status] warning 알림 추가 성공');
    } else {
      await conn.query(alarm_query, [farm_id, content, "완료", device]);
      console.log('[/devices/:deviceId/status] complete 알림 추가 성공');
    }
    return res.json({ message: '제어장치 변경 및 알림 추가 성공' });
  } catch (err) {
    console.error('[POST /devices/:deviceId/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 제어장치 상태 강제 변경
app.post('/devices/force-status', async (req, res) => {
  const { farm_id, device, status } = req.body;

  if (!farm_id || !device) {
    return res.status(400).json({ message: '잘못된 요청입니다. 모든 필드가 필요합니다.' });
  }

  const query = `UPDATE devices SET ${device} = ? WHERE farm_id = ?`;
  let conn;

  try {
    conn = await db.getConnection();
    await conn.query(query, [status, farm_id]);
    console.log(`[/devices/force-status] ${device} 상태 변경 성공`);
    const status_val = status ? 1 : 0;
    
    // 다른 서버 API 호출
    await axios.post('http://14.54.126.218:8000/update', {
      farm_id,
      devices: device,
      status: status_val
    });

    console.log('[/devices/force-status] H/W 서버에 상태 전달 성공');
    return res.json({ message: '제어장치 상태 강제 변경 성공' });

  } catch (err) {
    console.error('[POST /devices/force-status] 오류:', err);
    return res.status(500).json({ message: '서버 오류 발생' });
  } finally {
    if (conn) conn.release();
  }
});

// 실시간 데이터 불러오기 (1시간 단위 평균)
app.get('/realtime-data', async (req, res) => {
  const { farm_id } = req.query;
  const query = `
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS time_interval,
      AVG(temperature) AS avg_temperature,
      AVG(humidity) AS avg_humidity,
      AVG(soil_moisture) AS avg_soil_moisture,
      AVG(co2) AS avg_co2
    FROM 
      sensors
    WHERE 
      farm_id = ? 
      AND created_at >= NOW() - INTERVAL 24 HOUR
    GROUP BY 
      time_interval
    ORDER BY 
      time_interval ASC;
  `;
  let conn;
  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);

    if (results.length === 0) {
      console.log('[GET /real-time-data] 조회된 데이터가 없습니다.');
      return res.status(404).json({ message:'데이터가 없습니다.' });
    }

    console.log(`[GET /real-time-data] 실시간 데이터: ${results.length}개 반환`);
    return res.json(results);
  } catch (err) {
    console.error('[GET /realtime-data] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 기록 데이터 API (날짜별 센서 데이터)
app.get('/history-data', async (req, res) => {
  const { farm_id, date } = req.query;

  // 날짜 파싱 (YYYY-MM-DD 형태)
  const formattedDate = new Date(date);

  // 날짜가 유효하지 않으면 오류 반환
  if (isNaN(formattedDate)) {
    return res.status(400).json({ message:'유효한 날짜 형식이 아닙니다.' });
  }

  const start = new Date(formattedDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(formattedDate);
  end.setHours(23, 59, 59, 999);
 
  // 1시간 단위로 데이터를 그룹화하여 평균값 계산
  const query = `
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS time_interval,
      AVG(temperature) AS avg_temperature,
      AVG(humidity) AS avg_humidity,
      AVG(soil_moisture) AS avg_soil_moisture,
      AVG(co2) AS avg_co2
    FROM 
      sensors
    WHERE 
      farm_id = ? 
      AND created_at BETWEEN ? AND ?
    GROUP BY 
      time_interval
    ORDER BY 
      time_interval ASC;
  `;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id, start, end]);
  
    if (results.length === 0) {
      console.log('[GET /history-data] 조회된 데이터가 없습니다.');
      return res.status(404).json({ message:'해당 날짜에 기록된 데이터가 없습니다.' });
    }

    console.log(`[GET /history-data] 기록 데이터: ${results.length}개 반환`);
    res.json(results);
  } catch (err) {
    console.error('[GET /history-data] DB 오류: ', err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 알림 리스트 불러오기
app.get('/getAlarm', async (req, res) => {
  const { farm_id } = req.query;
  const query = `SELECT  type, content, created_at, device FROM alarms 
                 WHERE farm_id = ?`;
  let conn;

  // 현재 날짜 가져오기 (한국 시간 기준)
  // const now = new Date();
  // const year = now.getFullYear();
  // const month = String(now.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작
  // const day = String(now.getDate()).padStart(2, '0');

  // const formattedDate = `${year}-${month}-${day}`;

  // const start = new Date(formattedDate);
  // start.setHours(0, 0, 0, 0);

  // const end = new Date(formattedDate);
  // end.setHours(23, 59, 59, 999);

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);

    if (results.length === 0) {
      console.log('[GET /getAlarm] 조회된 데이터가 없습니다.');
      return res.status(404).json({ message: '해당 날짜에 기록된 데이터가 없습니다.' });
    } else {
      console.log(`[GET /getAlarm] 알림 ${results.length}개`);
      res.json(results);
    }
  } catch (err) {
    console.log('[GET /getAlarm] DB 오류:', err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 시작 버튼 클릭 시 farms 테이블 업데이트
app.post('/start-farm', async (req, res) => {
  const { farmId } = req.body;
  
  // 현재 날짜 구하기
  const currentDate = new Date().toISOString().split('T')[0];

  // farm_active를 TRUE로, start_date를 현재 날짜로 업데이트
  const updateFarmQuery = `
    UPDATE farms
    SET farm_active = TRUE, start_date = ?
    WHERE farm_id = ?
  `;
  let conn;

  try {
    conn = await db.getConnection();

    // farms 테이블 업데이트
    const updateResult = await conn.query(updateFarmQuery, [currentDate, farmId]);

    if (updateResult.affectedRows === 0) {
      return res.status(500).send('농장 업데이트 실패');
    }

    // farm_type에 맞는 harvest_days 가져오기
    const getCropQuery = `
      SELECT c.harvest_days
      FROM crops c
      JOIN farms f ON f.farm_type = c.name
      WHERE f.farm_id = ?
    `;
    
    // 작물 정보 가져오기
    const cropResult = await conn.query(getCropQuery, [farmId]);

    if (cropResult.length === 0) {
      return res.status(500).send('작물 정보 조회 실패');
    }

    const harvestDays = cropResult.harvest_days;
    console.log(`[POST /start-farm] ${farmId} 농장 시작 성공 `);
    res.json({ message: '성공적으로 시작되었습니다.', harvestDays, startDate: currentDate });
  } catch (err) {
    console.log('[POST /start-farm] DB 오류:', err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 상태를 가져오는 API
app.get('/get-farm-status/:farmId', async (req, res) => {
  const farmId = req.params.farmId;

  const query = `
    SELECT f.farm_name, f.growth_rate, c.harvest_days, f.start_date, f.farm_active
    FROM farms f
    JOIN crops c ON f.farm_type = c.name
    WHERE f.farm_id = ?
  `;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farmId]);

    // 농장 정보가 없으면 404 반환
    if (results.length === 0) {
      return res.status(404).send('농장 정보가 없습니다.');
    }

    const { farm_name, growth_rate, harvest_days, start_date, farm_active } = results[0];

    // 값이 없으면 처리
    if (farm_name === null || growth_rate === null || harvest_days === null || start_date === null || farm_active === null) {
      return res.status(400).json({ message: '농장 정보에 누락된 값이 있습니다.' });
    }

    // 오늘 날짜 계산
    const today = new Date();
    const startDate = new Date(start_date);
    const harvestDate = new Date(startDate);
    harvestDate.setDate(harvestDate.getDate() + harvest_days);

    // 수확일까지 남은 일수 계산
    const timeDiff = harvestDate - today;
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24)); // 남은 일수 계산

    // 성장률 계산
    const progress = (harvest_days - daysLeft) / harvest_days;
    let newGrowthRate = progress * 100;

    // growth_rate가 이미 있을 경우, 기존 값에 누적해서 반영
    //if (growth_rate !== null) {
    //  newGrowthRate = Math.max(newGrowthRate, growth_rate);  // 기존 성장률보다 더 높을 수 없도록
    //}

    newGrowthRate = Math.min(newGrowthRate, 100); // 100%를 넘지 않도록 처리

    // 성장률 소수점 없애기 (정수로 반영)
    newGrowthRate = Math.round(newGrowthRate);

    // 성장률 업데이트
    const updateGrowthQuery = `
      UPDATE farms
      SET growth_rate = ?
      WHERE farm_id = ?
    `;
    await conn.query(updateGrowthQuery, [newGrowthRate, farmId]);

    // 농장 활성 상태에 따른 UI 업데이트
    if (farm_active === 1) {
      // farm_active가 1일 경우, startButton 숨기고 cropInfo 표시
      // startButton을 'none'으로 숨기고 cropInfo를 'visible'로 표시
      // 이 부분은 클라이언트 측에서 처리해야 하는 부분입니다.
      console.log(`[GET /get-farm-status] ${farmId} 농장 D-DAY 조회 성공(활성화)`);
      res.json({
        success: true,
        message: '성장률 업데이트 완료',
        farm_name: farm_name,
        growthRate: newGrowthRate,
        harvestDays: harvest_days,
        startDate: start_date,
        farmActive: farm_active
      });
    } else {
      console.log(`[GET /get-farm-status] ${farmId} 농장 D-DAY 조회 성공(비활성화)`);
      res.json({
        farm_name: farm_name,
        growthRate: newGrowthRate,
        harvestDays: harvest_days,
        startDate: start_date,
        farmActive: farm_active
      });
    }
  } catch (err) {
    console.log('[GET /get-farm-status] DB 오류:', err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 제어장치 상태 가져오기
app.get('/devices/status', async(req, res) => {
  const { farm_id } = req.query;
  const query = `SELECT * FROM devices WHERE farm_id = ?`
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);

    console.log('[GET /devices/status] 제어장치 조회 성공:');
    return res.json(results[0]);
  } catch (err) {
    console.error('[GET /devices/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 센서별 최적 수치 불러오기
app.get('/getFarmConditions/:farm_id', async(req, res) => {
  const farm_id = req.params.farm_id;
  const query = `
    SELECT condition_type, optimal_min, optimal_max
    FROM farm_conditions
    WHERE farm_id = ?
  `;

  let conn;
  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [farm_id]);
    if (results.length === 0) {
      return res.status(404).json({ error: `${farm_id}농장에 대한 데이터가 없습니다` });
    }

    const conditions = {};
    results.forEach(row => {
      conditions[row.condition_type] = {
        optimal_min: row.optimal_min,
        optimal_max: row.optimal_max
      };
    });

    console.log('[GET /getFarmConditions] 조회 성공');
    return res.json(conditions);
  } catch (err) {
    console.error('[GET /getFarmConditions] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// 센서별 최적 수치 업데이트
app.post('/updateFarmCondition', async (req, res) => {
  const {
    farm_id,
    temperature: { optimal_min: tempMin, optimal_max: tempMax },
    humidity: { optimal_min: humidMin, optimal_max: humidMax },
    soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
    co2: { optimal_min: co2Min, optimal_max: co2Max }
  } = req.body;

  if (!farm_id || !tempMin || !tempMax || !humidMin || !humidMax || !soilMin || !soilMax || !co2Min || !co2Max) {
    return res.status(400).json({ error: '모든 필드가 필요합니다' });
  }

  const updateQuery = `
    UPDATE farm_conditions 
    SET optimal_min = ?, optimal_max = ?
    WHERE farm_id = ? AND condition_type = ?
  `;

  const values = {
    temperature: [tempMin, tempMax],
    humidity: [humidMin, humidMax],
    soil_moisture: [soilMin, soilMax],
    co2: [co2Min, co2Max]
  };

  let conn;
  try {
    conn = await db.getConnection();
    
    // DB 업데이트
    for (const [type, [min, max]] of Object.entries(values)) {
      const result = await conn.query(updateQuery, [min, max, farm_id, type]);

      if (result.affectedRows === 0) {
        console.warn(`[POST /updateFarmCondition] 데이터 없음: ${farm_id} - ${type} (업데이트 안 됨)`);
      }
    }

    // 하드웨어 서버로 최적 수치 전송
    try {
      await axios.post('http://14.54.126.218:8000/level', {
        farm_id,
        conditions: {
          temperature: { optimal_min: tempMin, optimal_max: tempMax },
          humidity: { optimal_min: humidMin, optimal_max: humidMax },
          soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
          co2: { optimal_min: co2Min, optimal_max: co2Max }
        }
      });
      console.log(`[POST /updateFarmCondition] 하드웨어 서버로 ${farm_id} 농장 최적 수치 전송 완료`);
    } catch (axiosError) {
      console.error('[POST /updateFarmCondition] 하드웨어 서버 전송 오류:', axiosError.message);
      // 하드웨어 서버 전송 실패 시, 필요에 따라 클라이언트에 경고를 반환하거나 무시
      // return res.status(500).json({ error: '하드웨어 서버 전송 실패' });
    }

    console.log(`[POST /updateFarmCondition] ${farm_id}농장 최적 수치 업데이트 완료`);
    return res.json({ message: `${farm_id}농장의 최적 수치가 성공적으로 업데이트되었습니다` });
  } catch (err) {
    console.error('[POST /updateFarmCondition] DB 오류:', err);
    return res.status(500).json({ error: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('서버가 실행 중입니다.');
});

// 닉네임 중복 확인 API
// app.get('/check-username', async (req, res) => {
//   const { username } = req.query;
//   const query = 'SELECT * FROM users WHERE username = ?';
//   let conn;

//   try {
//     conn = await db.getConnection();
//     const results = await conn.query(query, [username]);

//     if (results.length > 0) {
//       console.log(`[GET /check-username] 이미 사용 중인 닉네임: ${username}`);
//       return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });
//     }

//     console.log(`[GET /check-username] 사용 가능한 닉네임: ${username}`);
//     res.status(200).json({ message: '사용 가능한 닉네임입니다.' });
//   } catch (err) {
//     console.error('[GET /check-username] 쿼리 실행 실패:', err);
//     return res.status(500).json({ message: '서버 오류' });
//   } finally {
//     if (conn) conn.release();
//   }
// });

// 날짜별 센서 데이터
// app.get('/sensors/data', (req, res) => {
//   const { date, userId, farmId } = req.query;

//   // 필수 파라미터 검증
//   if (!date || !userId || !farmId) {
//       return res.status(400).json({ error: "date, userId, farmId가 필요합니다." });
//   }

//   const query = `
//       SELECT 
//           temperature, 
//           humidity, 
//           soil_moisture, 
//           co2, 
//           CONVERT_TZ(created_at, '+00:00', '+09:00') AS created_at
//       FROM sensors 
//       WHERE user_id = ? 
//       AND farm_id = ? 
//       AND DATE(created_at) = ?
//       ORDER BY created_at ASC
//   `;

//   db.query(query, [userId, farmId, date], (err, results) => {
//       if (err) {
//           console.error('[GET /sensors/data] DB 오류:', err);
//           return res.status(500).json({ error: 'DB 오류 발생' });
//       }

//       console.log(`[GET /sensors/data] ${date} 데이터 조회 성공: ${results.length}개 반환`, results);

//       // 데이터를 그대로 응답
//       res.json(results);
//   });
// });

// 통계 데이터 조회 API
// app.get('/sensors/average', (req, res) => {
//   const { type, userId, farmId } = req.query;

//   if (!userId || !farmId) {
//     return res.status(400).send('userId와 farmId가 필요합니다.');
//   }

//   let groupBy = '';
//   if (type === 'day') {
//     groupBy = 'DATE(created_at)';
//   } else if (type === 'week') {
//     groupBy = 'YEARWEEK(created_at)';
//   } else if (type === 'month') {
//     groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
//   } else {
//     return res.status(400).send('유효하지 않은 type 파라미터입니다.');
//   }

//   const query = `
//     SELECT 
//       ${groupBy} AS period, 
//       AVG(temperature) AS avg_temperature, 
//       AVG(humidity) AS avg_humidity, 
//       AVG(soil_moisture) AS avg_soil_moisture,
//       AVG(co2) AS avg_co2
//     FROM sensors
//     WHERE user_id = ? AND farm_id = ?
//     GROUP BY period
//     ORDER BY period ASC`;

//   db.query(query, [userId, farmId], (err, results) => {
//     if (err) {
//       console.error('[GET /sensors/average] DB 오류:', err);
//       return res.status(500).send('DB 오류 발생');
//     }
//     console.log('[GET /sensors/average] 통계 데이터 조회 성공', results);
//     res.json(results);
//   });
// });