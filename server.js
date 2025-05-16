// 서버를 만들기 위해 필요한 도구(모듈) 불러오기
const express = require('express'); // 웹 서버를 만들기 위한 도구(Express)
const mariadb = require('mariadb'); // MariaDB 연결 모듈
const cors = require('cors'); // CORS 불러오기
const moment = require('moment-timezone');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // 비밀번호 해싱용
require('dotenv').config(); // 환경 변수 로드

// JWT 비밀 키
const JWT_SECRET = process.env.JWT_SECRET

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

const API_BASE_URL = "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app"

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
  let conn;

  try {
    conn = await db.getConnection();

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10); // 10은 salt rounds

    const query = 'INSERT INTO users (user_id, password, username) VALUES (?, ?, ?)';
    await conn.query(query, [user_id, hashedPassword, username]);

    console.log(`[POST /signup] 회원가입 성공 - user_id: ${user_id}`);
    return res.status(201).json({ message: '회원가입 성공' });
  } catch (err) {
    console.error('[POST /signup] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

// JWT 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user; // 요청 객체에 사용자 정보 추가
    next();
  });
};

// FCM 토큰 등록
app.post('/register-fcm-token', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { fcm_token } = req.body;

  if (!fcm_token) {
    return res.status(400).json({ message: 'fcm_token이 필요합니다' });
  }

  let conn;
  try {
    conn = await db.getConnection();

    const upsertQuery = `
      INSERT INTO user_tokens (user_id, fcm_token)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token)
    `;

    await conn.query(upsertQuery, [user_id, fcm_token]);
    console.log(`[POST /register-fcm-token] FCM 토큰 등록 성공 - ${user_id}`);
    return res.json({ message: '토큰 등록 성공' });
  } catch (err) {
    console.error('[POST /register-fcm-token] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    if (conn) conn.release();
  }
});

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

async function sendPushNotificationToUser(farm_id, message) {
  let conn;
  try {
    conn = await db.getConnection();

    const [user] = await conn.query(
      `SELECT user_id FROM farms WHERE farm_id = ? LIMIT 1`,
      [farm_id]
    );
    if (!user || !user.user_id) return;

    const [tokenRow] = await conn.query(
      `SELECT fcm_token FROM user_tokens WHERE user_id = ? LIMIT 1`,
      [user.user_id]
    );
    if (!tokenRow || !tokenRow.fcm_token) return;

    const token = tokenRow.fcm_token;

    await axios.post('https://fcm.googleapis.com/fcm/send', {
      to: token,
      notification: {
        title: '🚨 스마트팜 경고',
        body: message,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FCM_SERVER_KEY}`,
      }
    });

    console.log(`[FCM] 알림 전송 성공: ${message}`);
  } catch (err) {
    console.error('[FCM] 알림 전송 실패:', err.message);
  } finally {
    if (conn) conn.release();
  }
}

// 로그인
app.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  const query = 'SELECT * FROM users WHERE user_id = ?';
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id]);

    if (results.length === 0) {
      return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
    }

    const user = results[0];

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`[POST /login] 로그인 실패: ${user_id} - 잘못된 비밀번호`);
      return res.status(401).json({ message: '잘못된 비밀번호입니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' } // 토큰 만료 시간 (1시간)
    );

    console.log(`[POST /login] 로그인 성공: ${user_id}`);
    return res.json({
      message: '로그인 성공',
      token, // 클라이언트에 토큰 반환
      user_id: user.user_id,
    });
  } catch (err) {
    console.error('[POST /login] DB 오류:', err.stack);
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
app.post('/addFarm', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id; // JWT에서 추출
  const { farm_name, farm_location, farm_type } = req.body;

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
    const farm_id = parseInt(farmResult.insertId);
    console.log(`[POST /addFarm] 농장 추가 성공: user_id=${user_id}, farm_id=${farm_id}`);

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

    // 4. 하드웨어 서버로 farm_id, farm_type, 최적 수치 전송
    const optimalConditions = {};
    for (const row of cropConditions) {
      optimalConditions[row.condition_type] = {
        optimal_min: row.optimal_min,
        optimal_max: row.optimal_max
      };
    }

    try {
      await axios.post('http://14.54.126.218:8000/init-farm-data', {
        farm_id,
        farm_type,
        conditions: optimalConditions
      });
      console.log(`[POST /addFarm] 하드웨어 서버로 전송 성공`);
    } catch (axiosError) {
      console.error(`[POST /addFarm] 하드웨어 서버 전송 실패:`, axiosError.message);
    }

    await conn.commit();
    return res.json({ message: '농장 추가 성공', farm_id });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[POST /addFarm] DB 오류:', err.stack);
    return res.status(500).json({ message: 'DB 오류', error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 농장 삭제
app.post('/delFarm', authenticateToken, async (req, res) => {
  const farmIds = req.body.farm_ids; // 요청 body에서 farm_ids 배열 받기
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

// 센서 데이터 저장 및 이상값 감지
// 센서 데이터 저장 및 이상값 감지
app.post('/sensors', async (req, res) => {
  const { farm_id, temperature, humidity, soil_moisture, co2, created_at } = req.body;

  const timestamp = created_at 
    ? moment.tz(created_at, "Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') 
    : moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');

  const insertQuery = `
    INSERT INTO sensors (farm_id, temperature, humidity, soil_moisture, co2, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const conditionQuery = `
    SELECT condition_type, optimal_min, optimal_max 
    FROM farm_conditions 
    WHERE farm_id = ?
  `;

  let conn;

  try {
    conn = await db.getConnection();

    // 1. DB에 센서값 저장
    await conn.query(insertQuery, [farm_id, temperature, humidity, soil_moisture, co2, timestamp]);

    // 2. 이상값 감지 로직
    const [conditions] = await conn.query(conditionQuery, [farm_id]);

    if (!Array.isArray(conditions) || conditions.length === 0) {
      console.warn(`[POST /sensors] farm_id ${farm_id}에 대한 조건 정보 없음`);
    } else {
      const sensorValues = { temperature, humidity, soil_moisture, co2 };
      if (!global.abnormalSensorStatus) global.abnormalSensorStatus = {};

      for (const row of conditions) {
        const { condition_type, optimal_min, optimal_max } = row;
        const value = parseFloat(sensorValues[condition_type]);
        const key = `${farm_id}_${condition_type}`;
        const now = Date.now();

        const isOut = value < optimal_min || value > optimal_max;

        if (isOut) {
          if (!global.abnormalSensorStatus[key]) {
            global.abnormalSensorStatus[key] = { count: 1, firstTime: now, notified: false };
          } else {
            global.abnormalSensorStatus[key].count += 1;
          }

          if (global.abnormalSensorStatus[key].count >= 12 && !global.abnormalSensorStatus[key].notified) {
            global.abnormalSensorStatus[key].notified = true;
            await sendPushNotificationToUser(farm_id, `📡 ${condition_type} 값이 1분 이상 이상 상태입니다.`);
          }
        } else {
          global.abnormalSensorStatus[key] = null;
        }
      }
    }

    return res.json({ message: '센서 데이터 저장 성공' });
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
  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    // 1. devices 테이블 업데이트
    const updateDeviceQuery = `UPDATE devices SET ${device} = ? WHERE farm_id = ?`;
    await conn.query(updateDeviceQuery, [status, farm_id]);
    console.log(`[/devices/:deviceId/status] 제어장치 변경 성공: ${device} -> ${status}`);

    // 2. 알림 추가
    const alarmQuery = `INSERT INTO alarms (farm_id, content, type, device) VALUES (?, ?, ?, ?)`;
    const alarmType = status == 1 ? "경고" : "완료";
    await conn.query(alarmQuery, [farm_id, content, alarmType, device]);
    console.log(`[/devices/:deviceId/status] ${alarmType} 알림 추가 성공`);

    // 3. device_logs 테이블 업데이트 (장치가 켜질 때만 카운트 증가)
    if (status == 1) {
      const today = moment().tz("Asia/Seoul").format("YYYY-MM-DD");
      const deviceLogQuery = `
        INSERT INTO device_logs (farm_id, date, device_type, operation_count)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE operation_count = operation_count + 1
      `;
      await conn.query(deviceLogQuery, [farm_id, today, device]);
      console.log(`[/devices/:deviceId/status] ${device} 작동 횟수 증가: farm_id=${farm_id}, date=${today}`);
    }

    await conn.commit(); // 트랜잭션 커밋
    return res.json({ message: '제어장치 변경 및 알림, 로그 추가 성공' });
  } catch (err) {
    if (conn) await conn.rollback(); // 오류 시 롤백
    console.error('[POST /devices/:deviceId/status] 오류:', err);
    return res.status(500).json({ message: '서버 오류' });
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

    const harvestDays = cropResult[0].harvest_days;

    console.log(`[POST /start-farm] ${farmId} 농장 시작 성공 `);
    res.json({ message: 'success', harvestDays, startDate: currentDate });
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
        temperature: { optimal_min: tempMin, optimal_max: tempMax },
        humidity: { optimal_min: humidMin, optimal_max: humidMax },
        soil_moisture: { optimal_min: soilMin, optimal_max: soilMax },
        co2: { optimal_min: co2Min, optimal_max: co2Max }
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

app.post("/chatbot", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "메시지를 입력하세요." });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || "답변을 가져오지 못했습니다.";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI 호출 오류:", err);
    res.status(500).json({ error: "OpenAI 호출 중 오류 발생" });
  }
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
    console.log('리포트 생성 요청 수신:', req.body);
    const { farmId, date } = req.body;

    // 입력 데이터 검증
    if (!farmId || !date) {
      return res.status(400).json({ error: 'farmId와 date는 필수입니다' });
    }

    // 날짜 형식 검증
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return res.status(400).json({ error: '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD)' });
    }

    // DB 연결
    console.log('데이터베이스 연결 시도');
    conn = await db.getConnection();
    console.log('데이터베이스 연결:', conn ? '성공' : '실패');

    // 중복 리포트 확인
    console.log('중복 리포트 확인');
    const queryResult = await conn.query(
      'SELECT id FROM reports WHERE farm_id = ? AND date = ?',
      [farmId, date]
    );
    console.log('중복 리포트 조회 결과:', queryResult);

    // MariaDB 버전에 따라 결과 처리
    let existingReport = Array.isArray(queryResult) ? queryResult : queryResult?.rows || [];
    console.log('기존 리포트:', existingReport);

    if (existingReport.length > 0) {
      return res.status(409).json({ error: '해당 날짜의 리포트가 이미 존재합니다.' });
    }

    // 센서 데이터 조회
    console.log('센서 데이터 조회');
    let historyData;
    try {
      historyData = await fetchHistoryDataFromDB(farmId, date);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!historyData || !historyData.timeLabels || !historyData.timeLabels.length) {
      return res.status(400).json({ error: '해당 날짜의 센서 데이터가 부족합니다' });
    }

    // 나머지 코드 (sensorSummary, sensorChanges, deviceLogs, OpenAI, DB 저장 등)
    const sensorSummary = {
      avg_temperature: roundToTwo(average(historyData.temperatureData)),
      avg_humidity: roundToTwo(average(historyData.humidityData)),
      avg_soil_moisture: roundToTwo(average(historyData.soilData)),
      avg_co2: roundToTwo(average(historyData.co2Data)),
    };

    const sensorChanges = {
      max_temperature: {
        value: Math.max(...historyData.temperatureData),
        time: historyData.timeLabels[historyData.temperatureData.indexOf(Math.max(...historyData.temperatureData))],
      },
      min_temperature: {
        value: Math.min(...historyData.temperatureData),
        time: historyData.timeLabels[historyData.temperatureData.indexOf(Math.min(...historyData.temperatureData))],
      },
      max_humidity: {
        value: Math.max(...historyData.humidityData),
        time: historyData.timeLabels[historyData.humidityData.indexOf(Math.max(...historyData.humidityData))],
      },
      min_humidity: {
        value: Math.min(...historyData.humidityData),
        time: historyData.timeLabels[historyData.humidityData.indexOf(Math.min(...historyData.humidityData))],
      },
      max_soil_moisture: {
        value: Math.max(...historyData.soilData),
        time: historyData.timeLabels[historyData.soilData.indexOf(Math.max(...historyData.soilData))],
      },
      min_soil_moisture: {
        value: Math.min(...historyData.soilData),
        time: historyData.timeLabels[historyData.soilData.indexOf(Math.min(...historyData.soilData))],
      },
      max_co2: {
        value: Math.max(...historyData.co2Data),
        time: historyData.timeLabels[historyData.co2Data.indexOf(Math.max(...historyData.co2Data))],
      },
      min_co2: {
        value: Math.min(...historyData.co2Data),
        time: historyData.timeLabels[historyData.co2Data.indexOf(Math.min(...historyData.co2Data))],
      },
    };

    // 제어 장치 로그 조회
    console.log('제어 장치 조회');
    const deviceLogs = await fetchDeviceLogs(farmId, date);

    // AI 분석 생성
    console.log('AI 분석 생성');
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
      max_tokens: 600,
    });

    const aiAnalysis = response.choices[0].message.content.trim();
    
    // 리포트 저장
    console.log('리포트 데이터베이스 저장');
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
      aiAnalysis,
    ]);

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

    res.json({ reportText, reportId: Number(result.insertId) });
  } catch (error) {
    console.error('리포트 생성 오류:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '해당 날짜의 리포트가 이미 존재합니다.' });
    }
    res.status(500).json({ error: `리포트 생성 실패: ${error.message}` });
  } finally {
    if (conn) conn.release();
  }
});

// 리포트 센서 데이터 조회
async function fetchHistoryDataFromDB(farmId, date) {
  try {
    console.log(`센서 데이터 조회 중 - 농장 ID: ${farmId}, 날짜: ${date}`);
    
    // /history-data API 호출
    const response = await fetch(`${API_BASE_URL}/history-data?farm_id=${farmId}&date=${date}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '센서 데이터를 불러오는데 실패했습니다');
    }

    const historyData = await response.json();

    if (!historyData || historyData.length === 0) {
      throw new Error('해당 농장과 날짜에 대한 센서 데이터가 없습니다');
    }

    // /history-data의 응답을 /generate-report에 맞게 가공
    const result = {
      timeLabels: historyData.map(row => new Date(row.time_interval).toISOString().slice(11, 16)),
      temperatureData: historyData.map(row => Number(row.avg_temperature) || 0),
      humidityData: historyData.map(row => Number(row.avg_humidity) || 0),
      soilData: historyData.map(row => Number(row.avg_soil_moisture) || 0),
      co2Data: historyData.map(row => Number(row.avg_co2) || 0),
    };

    console.log('가공된 센서 데이터:', result);
    return result;
  } catch (error) {
    console.error(`센서 데이터 조회 실패 - 농장 ID: ${farmId}, 날짜: ${date}`, error);
    throw new Error(`센서 데이터 불러오기 실패: ${error.message}`);
  }
}

// [리포트 생성] 장치 상태 조회 
async function fetchDeviceLogs(farmId, date) {
  let conn;
  try {
    conn = await db.getConnection();
    const query = `
      SELECT device_type, operation_count, total_duration
      FROM device_logs
      WHERE farm_id = ? AND date = ?
    `;
    const result = await conn.query(query, [farmId, date]);
    
    // 기본 장치 로그 객체
    const deviceLogs = {
      led: { count: 0, total_time: 0 },
      fan: { count: 0, total_time: 0 },
      water: { count: 0, total_amount: 0 },
      heater: { count: 0, total_time: 0 },
      cooler: { count: 0, total_time: 0 },
    };

    // 조회된 데이터를 기반으로 deviceLogs 채우기
    result.forEach(row => {
      if (row.device_type === 'led') {
        deviceLogs.led.count = row.operation_count;
        deviceLogs.led.total_time = row.total_duration || 0;
        // LED의 경우 시작/종료 시간은 임의로 설정 (필요 시 별도 로직 추가)
        deviceLogs.led.start = row.operation_count > 0 ? '08:00' : null;
        deviceLogs.led.end = row.operation_count > 0 ? '18:00' : null;
      } else if (row.device_type === 'fan') {
        deviceLogs.fan.count = row.operation_count;
        deviceLogs.fan.total_time = row.total_duration || 0;
      } else if (row.device_type === 'water') {
        deviceLogs.water.count = row.operation_count;
        deviceLogs.water.total_amount = row.operation_count * 3.33; // 예: 1회당 3.33L로 가정
      } else if (row.device_type === 'heater') {
        deviceLogs.heater.count = row.operation_count;
        deviceLogs.heater.total_time = row.total_duration || 0;
      } else if (row.device_type === 'cooler') {
        deviceLogs.cooler.count = row.operation_count;
        deviceLogs.cooler.total_time = row.total_duration || 0;
      }
    });

    console.log(`[fetchDeviceLogs] farmId: ${farmId}, date: ${date}`, deviceLogs);
    return deviceLogs;
  } catch (error) {
    console.error(`[fetchDeviceLogs] 오류: farmId=${farmId}, date=${date}`, error);
    throw new Error('장치 로그 조회 실패');
  } finally {
    if (conn) conn.release();
  }
}

// [리포트 생성] 평균 계산
function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// [리포트 생성] 소수점 둘째 자리 반올림
function roundToTwo(num) {
  return Math.round(num * 100) / 100;
}

// 리포트 불러오기기
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('서버가 실행 중입니다.');
});