// 서버를 만들기 위해 필요한 도구(모듈) 불러오기
const express = require('express'); // 웹 서버를 만들기 위한 도구(Express)
const mariadb = require('mariadb'); // MariaDB 연결 모듈
const path = require('path');
const cors = require('cors'); // CORS 불러오기
const moment = require('moment-timezone');
const axios = require('axios');
// dotenv 패키지를 불러오기
require('dotenv').config();

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
  host: "svc.sel4.cloudtype.app",
  port: 31171,
  user: "root",
  password: "12345678",
  database: "smartfarm",
  connectionLimit: 5
});

// 연결 확인
db.getConnection()
  .then(conn => {
    console.log('MariaDB 연결 성공!');
    conn.release(); // 사용 후 연결 반환
  })
  .catch(err => console.error('MariaDB 연결 실패:', err));

// 로그인 페이지
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
    conn.release();
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
    conn.release();
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
    conn.release();
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
    conn.release();
  }
});

// 스마트팜 이름 불러오기
app.get('/getFarmName', async (req,res) => {
  const user_id = req.query.user_id;
  const query = `SELECT farm_name from farms where user_id = ?`;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id]);

    if (results.length > 0) {
      console.log('[GET /getFarmName] 스마트팜 이름:',results[0].farm_name);
      return res.json({ farmname: results[0].farm_name });
    }
    console.log('[GET /getFarmName] 스마트팜 정보를 찾을 수 없습니다.')
    return res.status(404).json({ message:'사용자 정보를 찾을 수 없습니다.' });
  } catch (err) {
    console.error('[GET /getFarmName] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
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
    conn.release();
  }
});

// 농장 추가하기
app.post('/addFarm', async (req, res) => {
  const { user_id, farm_name, farm_location, farm_type } = req.body;
  const query = `INSERT INTO farms (user_id, farm_name, farm_location, farm_type) VALUES (?, ?, ?, ?)`;
  let conn;

  try {
    conn = await db.getConnection();

    const results = await conn.query(query, [user_id, farm_name, farm_location, farm_type]);
    const farm_id = results.insertId;
    console.log('[POST /addFarm] 농장 추가 성공');

    // devices 테이블에 초기값 삽입
    const addDeviceQuery = `INSERT INTO devices (user_id, farm_id, led, fan, water, heater, cooler) VALUES (?, ?, false, false, false, false, false)`;
    
    await conn.query(addDeviceQuery, [user_id, farm_id]);
    console.log('[POST /addFarm] devices 초기값 추가 성공');
    return res.json({ message: '농장 추가 성공' });
  } catch (err) {
    console.error('[POST /addFarm] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
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
    conn.release();
  }
});

// 센서 데이터 저장
app.post('/sensors', async (req, res) => {
  const { user_id, farm_id, temperature, humidity, soil_moisture, co2, created_at } = req.body;
  
  // created_at이 없으면 현재 시간을 한국 시간으로 설정
  const timestamp = created_at 
    ? moment.tz(created_at, "Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') 
    : moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
  
  const query = `INSERT INTO sensors (user_id, farm_id, temperature, humidity, soil_moisture, co2, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const selectQuery = `SELECT * FROM sensors WHERE id = ?`;
  let conn;
  
  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id, farm_id, temperature, humidity, soil_moisture, co2, timestamp]);
  
    // 방금 삽입된 튜플의 id 가져오기
    const insertedId = results.insertId;

    try {
      const selectResults = await conn.query(selectQuery, [insertedId]);
      console.log('[POST /sensors] 삽입된 데이터:', selectResults[0]);
      res.json({ message: '센서 데이터 저장 성공' });
    
      // 저장된 센서 데이터를 기반으로 제어 여부 체크 및 실행
      //Controldevice(user_id, farm_id, temperature, humidity, soil_moisture, co2);
      
    } catch (err) {
      console.error('[POST /sensors] 데이터 조회 오류:', err);
      return res.status(500).json({ message: 'DB 오류' });
    }
  } catch (err) {
    console.error('[POST /sensors] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// 장비 제어 함수
function Controldevice(user_id, farm_id, temperature, humidity, soil_moisture, co2) {
  let fanStatus = 0; 
  let waterStatus = 0; 

  // 온도에 따른 환기팬 제어
  if (temperature >= 22) {
    fanStatus = 1;
    console.log('환기팬 켬 (온도 22°C 이상)');
  } else if (temperature <= 18) {
    fanStatus = 0; 
    console.log('환기팬 끔 (온도 18°C 이하)');
  } else {
    // 온도가 적절한 범위에 있을 때만 습도 조건 체크
    if (humidity >= 70) {
      fanStatus = 1;
      console.log('환기팬 켬 (습도 70% 이상)');
    } else if (humidity <= 60) {
      fanStatus = 0;
      console.log('환기팬 끔 (습도 60% 이하)');
    }
  }

  // 토양 수분에 따른 물 공급 제어
  if (soil_moisture <= 50) {
    waterStatus = 1; 
    console.log('물 공급 (토양 수분 50% 이하)');
  } else if (soil_moisture >= 70) {
    waterStatus = 0;  
    console.log('물 공급 중지 (토양 수분 70% 이상)');
  }

  // 상태 제어를 위한 DB 업데이트
  updateDevice(user_id, farm_id, fanStatus, waterStatus);
}

// 최근 센서 데이터 조회
app.get('/sensors/status', async (req, res) => {
  const { user_id, farm_id } = req.query;
  const query = `SELECT * FROM sensors WHERE user_id = ? AND farm_id = ? ORDER BY created_at DESC LIMIT 1`;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id, farm_id]);
    if (results.length === 0) {
      console.log('[GET /sensors/status] 조회된 데이터 없음');
      return res.status(404).json({ message:'해당 조건에 맞는 데이터가 없습니다.' });
    }
    console.log('[GET /sensors/status] 조회된 데이터:', results[0]);
    return res.json(results[0]); 
  } catch (err) {
    console.error('[GET /sensors/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// 제어장치 상태 가져오기
app.get('/devices/status', async(req, res) => {
  const { user_id, farm_id } = req.query;
  const query = `SELECT * FROM devices WHERE user_id = ? AND farm_id = ?`
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id, farm_id]);

    console.log('[GET /devices/status] 조회된 상태:', results[0]);
    return res.json(results[0]);
  } catch (err) {
    console.error('[GET /devices/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// 제어장치 상태 변경하기
app.post('/devices/:deviceId/status', async (req, res) => {
  const { user_id, farm_id, device } = req.body;
  const query = `UPDATE devices SET ${device} = NOT ${device} WHERE user_id = ? AND farm_id = ?`;
  let conn;

  try {
    conn = await db.getConnection();
    await conn.query(query, [user_id, farm_id]);

    console.log('[/devices/:deviceId/status] 제어장치 변경:', device);
    return res.json({ message: '제어장치 변경 성공' });
  } catch (err) {
    console.error('[POST /devices/:deviceId/status] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// 실시간 데이터 불러오기 (1시간 단위 평균)
app.get('/realtime-data', async (req, res) => {
  const { user_id, farm_id } = req.query;
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
      user_id = ? 
      AND farm_id = ? 
      AND created_at >= NOW() - INTERVAL 24 HOUR
    GROUP BY 
      time_interval
    ORDER BY 
      time_interval ASC;
  `;
  let conn;
  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id, farm_id]);

    if (results.length === 0) {
      console.log('[GET /real-time-data] 조회된 데이터가 없습니다.');
      return res.status(404).json({ message:'데이터가 없습니다.' });
    }

    console.log(`[GET /real-time-data] 실시간 데이터: ${results.length}개 반환`, results);
    return res.json(results);
  } catch (err) {
    console.error('[GET /realtime-data] DB 오류:', err);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// 기록 데이터 API (날짜별 센서 데이터)
app.get('/history-data', async (req, res) => {
  const { user_id, farm_id, date } = req.query;

  // 날짜 파싱 (YYYY-MM-DD 형태)
  const formattedDate = new Date(date);

  // 날짜가 유효하지 않으면 오류 반환
  if (isNaN(formattedDate)) {
    return res.status(400).json({ message:'유효한 날짜 형식이 아닙니다.' });
  }

  // 시작 시간을 계산하기 위해서 formattedDate의 복사본을 사용하여 시간을 설정 (UTC 기준)
  const startOfDayUTC = new Date(formattedDate);
  startOfDayUTC.setHours(0, 0, 0, 0);

  // 끝 시간을 계산하기 위해서 formattedDate의 복사본을 사용하여 시간을 설정 (UTC 기준)
  const endOfDayUTC = new Date(formattedDate);
  endOfDayUTC.setHours(23, 59, 59, 999);

  console.log('[GET /history-data] 시작 시간(UTC):', startOfDayUTC, '끝 시간(UTC):', endOfDayUTC);

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
      user_id = ? 
      AND farm_id = ? 
      AND created_at BETWEEN ? AND ?
    GROUP BY 
      time_interval
    ORDER BY 
      time_interval ASC;
  `;
  let conn;

  try {
    conn = await db.getConnection();
    const results = await conn.query(query, [user_id, farm_id, startOfDayUTC, endOfDayUTC]);
  
    if (results.length === 0) {
      console.log('[GET /history-data] 조회된 데이터가 없습니다.');
      return res.status(404).json({ message:'해당 날짜에 기록된 데이터가 없습니다.' });
    }

    console.log(`[GET /history-data] 기록 데이터: ${results.length}개 반환`, results);
    res.json(results);
  } catch (err) {
    console.error('[GET /history-data] DB 오류: ', err.stack);
    return res.status(500).json({ message: 'DB 오류' });
  } finally {
    conn.release();
  }
});

// Together AI API Key
app.get('/api-key', (req, res) => {
  res.json({ apiKey: process.env.TOGETHER_AI_API_KEY });
});

// 센서 데이터 가져오기
app.get('/get-sensor-data', async (req, res) => {
  const { user_id, farm_id, date } = req.query;

  console.log('📌 요청 데이터:', { user_id, farm_id, date });

  const query = `
    SELECT 
      AVG(temperature) AS avg_temp,
      AVG(humidity) AS avg_humidity,
      AVG(soil_moisture) AS avg_soil_moisture,
      AVG(co2) AS avg_co2
    FROM sensors
    WHERE user_id = ? AND farm_id = ? AND DATE(created_at) = ?
  `;
  let conn;

  try {
    conn = await db.getConnection();
    const rows = await conn.query(query, [user_id, farm_id, date]);

    console.log('📌 조회된 데이터:', rows);
    console.log('📌 rows 길이이:', rows.length);
    console.log('📌 rows 타입:', typeof rows);
    if (rows.length > 0) {
      return res.json(rows[0]);
    } else {
      return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('센서 데이터 조회 오류:', error);
    res.status(500).json({ error: '센서 데이터를 가져오는 중 오류 발생' });
  } finally {
    conn.release();
  }
});

// 일지 저장 
app.post('/save-diary', async (req, res) => {
  const { user_id, farm_id, content } = req.body;

  const query = `
    INSERT INTO diaries (user_id, farm_id, content, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  let conn;

  try {
    conn = db.getConnection();
    await conn.query(query, [user_id, farm_id, content]);
    res.json({ success: true });
  } catch (error) {
    console.error('일지 저장 오류:', error);
    res.status(500).json({ success: false, message: '일지 저장 실패' });
  } finally {
    conn.release();
  }
});

// 일지 목록 가져오기
app.get('/get-diary-entries', async (req, res) => {
  const { user_id, farm_id } = req.query;

  const query = `
    SELECT id, content, created_at
    FROM diaries
    WHERE user_id = ? AND farm_id = ?
    ORDER BY created_at DESC
  `;
  let conn;

  try {
    conn = db.getConnection();
    const [rows] = await conn.query(query, [user_id, farm_id]);
    res.json(rows);
  } catch (error) {
    console.error('일지 목록 조회 오류:', error);
    res.status(500).json({ error: '일지 목록을 가져오는 중 오류 발생' });
  } finally {
    conn.release();
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