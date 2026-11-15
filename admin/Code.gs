/*
  ============================================================
  🧠 Code.gs — 서버(구글 쪽)에서 일하는 코드
  ------------------------------------------------------------
  화면(웹페이지)이 "저장해줘", "목록 줘" 하고 부탁하면 이 파일의 api 함수가 시트를 읽고 쓴다.

  공부 순서 (하루 1~2 덩어리)
    [덩어리 1]  기본 이름표
    [덩어리 2]  표 읽기·쓰기 도구 (repo) ★ 시트를 다루는 핵심
    [덩어리 3]  설정 탭 읽기
    [덩어리 4]  주민번호 가리기·검사
    [덩어리 5]  번호표 발급
    [덩어리 6]  급여 계산기 (script.js와 같은 계산)
    [덩어리 7]  감사로그
    [덩어리 8]  화면이 부르는 함수 3개 (api)
    [덩어리 9]  시트 한 줄 ↔ 화면용 기록 바꾸기
    [덩어리 10] 테스트 함수 (편집기에서 ▶ 실행)
    [덩어리 11] 화면 열기 (doGet) — 웹 앱 주소로 들어오면 index.html을 보여준다

  알아두면 좋은 말
    - 함수 이름 끝에 _ 가 붙으면 "내부용": 화면(google.script.run)에서 부를 수 없다. 보안을 위한 약속.
    - 화면에서 부를 수 있는 함수는 api 로 시작하는 3개뿐이다.
  ============================================================
*/

/* ==================== [덩어리 1 / 11] 기본 이름표 ==================== */
/* ** 설명: 탭 이름을 변수에 담아 둔다 // ** 이유: '급여대장'을 여러 곳에 직접 쓰면 오타 하나로 엉뚱한 탭을 찾게 된다 ** */
const TAB = {
  CLIENT: '고객마스터',
  EMP: '직원마스터',
  SECRET: '민감정보',
  PAYROLL: '급여대장',
  SETTING: '설정',
  AUDIT: '감사로그'
};
const TZ = 'Asia/Seoul';


/* ==================== [덩어리 2 / 11] 표 읽기·쓰기 도구 (repo) ==================== */
/*
  핵심 아이디어: 시트의 한 줄을 { 제목: 값 } 서랍장(객체)으로 바꿔서 다룬다.
    시트:  | emp_id  | 성명   |
           | E000001 | 홍길동 |
    코드:  { emp_id: 'E000001', 성명: '홍길동', _row: 2 }   ← _row = 시트에서 몇 번째 줄인지
*/

/* ** 설명: 탭을 이름으로 찾는다. 없으면 쉬운 말로 오류를 낸다 // ** 이유: 탭이 없을 때 "null 오류" 대신 무엇을 해야 하는지 알려주려고 ** */
function sheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('"' + name + '" 탭이 없어요. 편집기에서 setupMasterDb를 먼저 실행해 주세요.');
  return sheet;
}

/* ** 설명: 1행 제목줄을 배열로 읽는다 // ** 이유: 열을 칸 주소가 아니라 제목 이름으로 찾기 위해 (CLAUDE.md 규칙) ** */
function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

/*
  ** 설명: 탭 전체를 읽어 서랍장(객체) 목록으로 돌려준다 // ** 이유: 나머지 코드가 "몇 번째 열"을 몰라도 o['성명']처럼 이름으로 꺼낼 수 있게 **
  ** 변경 전 코드 ** sheet.getRange("B13:D60").getValues() 후 pRow[0], pRow[1] (숫자 위치로 꺼냄)
  // ** 변경 후 코드 ** readTable_('급여대장') 후 o['성명'] (이름으로 꺼냄)
*/
function readTable_(name) {
  const sheet = sheet_(name);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];                                   // 제목줄만 있으면 빈 목록
  const headers = headers_(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();   // 한 번에 읽기 (빠름)
  return values.map(function (row, i) {
    const o = { _row: i + 2 };
    headers.forEach(function (h, c) { if (h) o[h] = row[c]; });
    return o;
  }).filter(function (o) {                                      // 완전히 빈 줄은 버린다
    return headers.some(function (h) { return h && o[h] !== '' && o[h] !== null; });
  });
}

/* ** 설명: 어떤 열의 값이 일치하는 첫 줄을 찾는다 (없으면 null) // ** 이유: emp_id, pay_id 같은 번호로 정확히 한 줄을 찾으려고 ** */
function findOne_(name, column, value) {
  const rows = readTable_(name);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][column]) === String(value)) return rows[i];
  }
  return null;
}

/*
  ** 설명: 서랍장(객체) 하나를 시트 한 줄로 쓴다. row가 없으면 맨 아래에 새로 추가 // ** 이유: 저장·덮어쓰기를 함수 하나로 처리하려고 **
  - 서랍장에 없는 열은: 새 줄이면 빈칸, 덮어쓰기면 원래 값을 그대로 둔다 (다른 사람이 적어 둔 메모를 지우지 않게)
  - 서식(글자/날짜/돈)을 먼저 입히고 값을 넣는다 → "2026-11"이 날짜로 바뀌는 사고 방지
*/
function writeRow_(name, obj, row) {
  const sheet = sheet_(name);
  const headers = headers_(sheet);
  const target = row || sheet.getLastRow() + 1;
  const range = sheet.getRange(target, 1, 1, headers.length);
  const old = row ? range.getValues()[0] : headers.map(function () { return ''; });

  const values = headers.map(function (h, i) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : old[i]; });
  const formats = headers.map(function (h) { return columnFormat_(h) || 'General'; });   // columnFormat_ 은 Setup.gs에 있음

  range.setNumberFormats([formats]);
  range.setValues([values]);
  return target;
}

/* ** 설명: 날짜(Date)를 글자 "2026-11-25"로 바꾼다. 날짜가 아니면 글자로 그대로 // ** 이유: 화면으로 Date를 그대로 보내면 google.script.run이 전달에 실패한다 ** */
function dateText_(v, pattern) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, pattern || 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}


/* ==================== [덩어리 3 / 11] 설정 탭 읽기 ==================== */
/*
  ** 설명: 설정 탭을 읽어 { minWage: 10320, ... } 로 만든다. 같은 key가 여러 줄이면 "오늘 이전 적용시작일 중 가장 최근" 값 // ** 이유: 법이 바뀌는 날짜에 맞춰 자동으로 새 값을 쓰려고 **
  ** 변경 전 코드 ** 2026년 최저임금 10,320원을 기준으로... (AI 지침 글 속에 숫자를 적어 둠)
  // ** 변경 후 코드 ** getSettings_().minWage (설정 탭 한 곳에서 읽음)
*/
const REQUIRED_SETTINGS = ['minWage', 'monthHours40', 'mealLimit', 'carLimit', 'overtimeRate', 'npRate',
  'npMinBase', 'npMaxBase', 'hiRate', 'ltcRatio', 'eiRate', 'localTaxRate'];

function getSettings_() {
  const now = new Date();
  const picked = {};                                            // { key: { value, start, note } }
  readTable_(TAB.SETTING).forEach(function (o) {
    const key = String(o.key).trim();
    const start = o['적용시작일'] instanceof Date ? o['적용시작일'] : new Date(0);
    if (!key || start > now) return;                            // 아직 시행 전이면 건너뜀
    if (!picked[key] || picked[key].start <= start) {
      picked[key] = { value: Number(o.value), start: start, note: String(o['설명'] || '') };
    }
  });

  const values = {};
  REQUIRED_SETTINGS.forEach(function (key) {
    if (!picked[key] || !isFinite(picked[key].value)) {
      throw new Error('설정 탭에 "' + key + '" 값이 없거나 숫자가 아니에요. setupMasterDb를 다시 실행해 보세요.');
    }
    values[key] = picked[key].value;
  });
  return { values: values, detail: picked };
}


/* ==================== [덩어리 4 / 11] 주민번호 가리기·검사 ==================== */

/* ** 설명: 앞 6자리 + "-*******" // ** 이유: 절대규칙 4번. 급여대장·화면·로그에는 이 값만 쓴다 (script.js의 maskRrn과 같은 규칙) ** */
function maskRrn_(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits ? digits.slice(0, 6) + '-*******' : '';
}

/* ** 설명: 숫자 13자리를 "900101-1234567" 모양으로 맞춘다 (13자리가 아니면 null) // ** 이유: 민감정보 탭에 항상 같은 모양으로 저장하려고 ** */
function normalizeRrn_(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 13) return null;
  return digits.slice(0, 6) + '-' + digits.slice(6);
}


/* ==================== [덩어리 5 / 11] 번호표 발급 ==================== */
/* ** 설명: 직원마스터에서 가장 큰 번호 + 1 → E000001 형태 // ** 이유: 번호 발급을 서버 한 곳에서 해야 두 사람이 동시에 저장해도 번호가 겹치지 않는다 (아래 LockService와 함께) ** */
function nextEmpId_() {
  let max = 0;
  readTable_(TAB.EMP).forEach(function (o) {
    const n = Number(String(o.emp_id).replace(/\D/g, ''));
    if (n > max) max = n;
  });
  return 'E' + String(max + 1).padStart(6, '0');
}


/* ==================== [덩어리 6 / 11] 급여 계산기 ==================== */
/*
  ** 설명: script.js의 calcPayroll과 똑같은 계산을 서버에서 한 번 더 한다 // ** 이유: 화면에서 보낸 결과 숫자는 조작될 수 있다. 시트에 남는 숫자는 서버가 직접 계산한 값만 믿는다 **
  ** 변경 전 코드 ** 화면이 계산한 finalPay, displayWage를 그대로 시트에 기록
  // ** 변경 후 코드 ** 화면은 '입력값'만 보내고, 계산은 calcPayroll_ 이 한다
  순수 함수: 시트·메일 등 구글 서비스를 부르지 않는다 (CLAUDE.md 개발 순서 규칙)
*/
function monthlyHours_(weekHours, s) {
  const h = Number(weekHours) || 0;
  if (h >= 40) return s.monthHours40;
  if (h >= 15) return Math.round((h + (h / 40) * 8) * 4.345 * 10) / 10;
  return Math.round(h * 4.345 * 10) / 10;
}

function floor10_(n) {
  return Math.floor(n / 10) * 10;
}

function calcPayroll_(input, s) {
  const mHours = monthlyHours_(input.weekHours, s);
  const base = input.workType === '시급제' ? Math.floor(input.hourlyWage * mHours) : input.base;
  const ordinaryWage = input.workType === '시급제' ? input.hourlyWage : (mHours > 0 ? Math.floor(base / mHours) : 0);
  const overtimePay = Math.floor(ordinaryWage * s.overtimeRate * input.otHours);

  const nonTaxable = Math.min(input.meal, s.mealLimit) + Math.min(input.car, s.carLimit);
  const gross = base + overtimePay + input.bonus + input.etc + input.meal + input.car;
  const taxable = gross - nonTaxable;

  let np = 0;
  if (input.insNp && taxable > 0) {
    const npBase = Math.min(Math.max(Math.floor(taxable / 1000) * 1000, s.npMinBase), s.npMaxBase);
    np = floor10_(npBase * s.npRate);
  }
  const hi = input.insHi ? floor10_(taxable * s.hiRate) : 0;
  const ltc = input.insHi ? floor10_(hi * s.ltcRatio) : 0;
  const ei = input.insEi ? floor10_(taxable * s.eiRate) : 0;
  const incomeTax = input.incomeTax;
  const localTax = floor10_(incomeTax * s.localTaxRate);
  const deductions = np + hi + ltc + ei + incomeTax + localTax;

  return {
    mHours: mHours, base: base, ordinaryWage: ordinaryWage, overtimePay: overtimePay,
    nonTaxable: nonTaxable, gross: gross, taxable: taxable,
    np: np, hi: hi, ltc: ltc, ei: ei, incomeTax: incomeTax, localTax: localTax,
    deductions: deductions, net: gross - deductions, minWageOk: ordinaryWage >= s.minWage
  };
}


/* ==================== [덩어리 7 / 11] 감사로그 ==================== */
/*
  ** 설명: 감사로그 탭에 "언제, 누가, 무엇을, 어느 번호에, 결과" 한 줄을 남긴다 // ** 이유: 문제가 생겼을 때 추적하려고. 오류를 삼키지 말고 기록한다 (CLAUDE.md 코드 스타일) **
  ⚠️ 주민번호·급여 금액은 절대 여기에 쓰지 않는다. 번호(pay_id 등)만 쓴다.
  ** 변경 전 코드 ** catch (e) { console.error(...) }  (편집기 로그에만 남고 금방 사라짐)
  // ** 변경 후 코드 ** catch (e) { audit_(..., '오류: ' + e.message) }  (시트에 영구 기록)
*/
function audit_(action, targetId, result) {
  try {
    const sheet = sheet_(TAB.AUDIT);
    sheet.appendRow([new Date(), Session.getActiveUser().getEmail() || '(알 수 없음)', action, targetId || '', result]);
  } catch (e) {
    console.error('감사로그 기록 실패: ' + e.message);       // 로그 쓰기 실패가 본 작업을 망치지 않게
  }
}


/* ==================== [덩어리 8 / 11] 화면이 부르는 함수 3개 (api) ==================== */
/*
  약속: 모든 api 함수는 { ok: true, data: ... } 또는 { ok: false, message: '쉬운 설명' } 을 돌려준다.
  ** 이유: 화면이 성공/실패를 항상 같은 방법으로 확인할 수 있게 **
  ** 변경 전 코드 ** return "성공";  /  return "에러 발생: " + e.message;  (글자를 비교해서 성공 여부 판단)
  // ** 변경 후 코드 ** return { ok: true, data: ... };  /  return { ok: false, message: ... };
*/

/* ** 설명: 화면이 처음 열릴 때 한 번에 필요한 것(설정·고객 목록·급여 기록)을 보낸다 // ** 이유: 서버를 여러 번 부르면 느리다. 한 번에 받는다 ** */
function apiGetBootData() {
  try {
    const settings = getSettings_();
    const clients = readTable_(TAB.CLIENT)
      .filter(function (o) { return o['상태'] !== '해지'; })
      .map(function (o) { return { id: String(o.client_id), name: String(o['상호']) }; });
    const records = readTable_(TAB.PAYROLL).map(rowToRecord_);
    const settingList = Object.keys(settings.detail).map(function (k) {
      return { key: k, value: settings.detail[k].value, note: settings.detail[k].note };
    });
    return { ok: true, data: { settings: settings.values, settingList: settingList, clients: clients, records: records } };
  } catch (e) {
    audit_('처음불러오기', '', '오류: ' + e.message);
    return { ok: false, message: '데이터를 불러오지 못했어요. ' + e.message };
  }
}

/*
  ** 설명: 급여 1건 저장 (새로 추가 또는 덮어쓰기) // ** 이유: 이 프로그램의 핵심 기능 **
  form = 화면 입력값 묶음, allowOverwrite = "덮어써도 된다"고 사용자가 확인했는지
  순서: ① 잠금 → ② 입력값 정리·검사 → ③ 직원번호 정하기 → ④ 같은 건 있는지 확인 → ⑤ 서버 계산
        → ⑥ 직원마스터 → ⑦ 민감정보 → ⑧ 급여대장 → ⑨ 감사로그 → ⑩ 잠금 풀기
*/
function apiSaveRecord(form, allowOverwrite) {
  // ① LockService = 화장실 열쇠. 한 번에 한 명만 저장하게 해서 번호가 겹치거나 줄이 섞이는 것을 막는다
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);                                       // 최대 10초 기다림
  } catch (e) {
    return { ok: false, message: '다른 저장이 진행 중이에요. 잠시 후 다시 눌러 주세요.' };
  }

  let payId = '';
  try {
    const s = getSettings_().values;

    // ② 입력값 정리 — 화면에서 온 값은 믿지 말고 숫자·글자로 다시 바꾼다
    const input = normalizeInput_(form);
    const problem = validateInput_(input);
    if (problem) return { ok: false, message: problem };

    // ③ 직원번호: 화면이 보낸 번호가 있으면 직원마스터에 진짜 있는지 확인, 없으면 새로 발급
    let emp = null;
    if (input.empId) {
      emp = findOne_(TAB.EMP, 'emp_id', input.empId);
      if (!emp) return { ok: false, message: '직원번호 ' + input.empId + '를 직원마스터에서 찾을 수 없어요.' };
    }
    const empId = emp ? String(emp.emp_id) : nextEmpId_();

    // ④ 같은 귀속연월 + 같은 직원이 이미 있으면, 사용자 확인 없이는 덮어쓰지 않는다
    payId = input.month + '_' + empId;
    const existing = findOne_(TAB.PAYROLL, 'pay_id', payId);
    if (existing && !allowOverwrite) {
      return { ok: false, code: 'EXISTS', message: input.month + ' ' + empId + ' 급여가 이미 있어요. 덮어쓸까요?' };
    }

    // ⑤ 서버가 직접 계산
    const r = calcPayroll_(input, s);

    // ⑥ 직원마스터: 새 직원이면 추가, 있으면 근로조건만 최신으로
    writeRow_(TAB.EMP, {
      emp_id: empId, client_id: input.clientId, 성명: input.name,
      근로유형: input.workType, 주소정근로시간: input.weekHours,
      월급: input.workType === '월급제' ? input.base : '', 시급: input.workType === '시급제' ? input.hourlyWage : '',
      비과세식대: Math.min(input.meal, s.mealLimit), 비과세자가운전: Math.min(input.car, s.carLimit),
      상태: emp ? emp['상태'] || '재직' : '재직'
    }, emp ? emp._row : null);

    // ⑦ 민감정보: 주민번호를 새로 입력했을 때만 원본 저장 (이 탭에만!)
    const secret = findOne_(TAB.SECRET, 'emp_id', empId);
    let rrnMasked = '';
    if (input.rrn) {
      writeRow_(TAB.SECRET, { emp_id: empId, 주민번호: input.rrn, 등본예정: '' }, secret ? secret._row : null);
      rrnMasked = maskRrn_(input.rrn);
    } else if (secret) {
      rrnMasked = maskRrn_(secret['주민번호']);                 // 입력 안 했으면 예전 번호를 가려서 사용
    }

    // ⑧ 급여대장: 한 줄 쓰기
    const yn = function (b) { return b ? 'Y' : 'N'; };
    const rowObj = {
      pay_id: payId, 귀속연월: input.month, client_id: input.clientId, emp_id: empId, 성명: input.name,
      '주민번호(가림)': rrnMasked, 근로유형: input.workType, 주소정근로시간: input.weekHours,
      지급일: input.payDate || '',
      시급: input.workType === '시급제' ? input.hourlyWage : '', 연장근로시간: input.otHours,
      상여금: input.bonus, 기타과세수당: input.etc, 식대: input.meal, 자가운전보조금: input.car,
      국민연금가입: yn(input.insNp), 건강보험가입: yn(input.insHi), 고용보험가입: yn(input.insEi),
      월소정근로시간: r.mHours, 통상시급: r.ordinaryWage, 기본급: r.base, 연장수당: r.overtimePay,
      비과세합계: r.nonTaxable, 지급총액: r.gross, 과세급여: r.taxable,
      국민연금: r.np, 건강보험: r.hi, 장기요양보험: r.ltc, 고용보험: r.ei,
      근로소득세: r.incomeTax, 지방소득세: r.localTax, 공제총액: r.deductions, 실수령액: r.net,
      최저임금: r.minWageOk ? '충족' : '미달',
      저장시각: new Date(), 저장자: Session.getActiveUser().getEmail() || ''
    };
    writeRow_(TAB.PAYROLL, rowObj, existing ? existing._row : null);

    // ⑨ 감사로그 (번호만, 금액·주민번호 없음)
    audit_('급여저장', payId, existing ? '덮어씀' : '새로 저장');

    return { ok: true, data: { record: rowToRecord_(rowObj), isNewEmp: !emp } };
  } catch (e) {
    audit_('급여저장', payId, '오류: ' + e.message);
    return { ok: false, message: '저장 중 문제가 생겼어요. ' + e.message };
  } finally {
    lock.releaseLock();                                         // ⑩ 성공하든 실패하든 열쇠는 꼭 돌려준다
  }
}

/* ** 설명: pay_id로 급여 1건을 지운다 // ** 이유: 잘못 저장한 건을 지우려고. 직원마스터·민감정보는 다른 달 기록이 쓸 수 있어 지우지 않는다 ** */
function apiDeleteRecord(payId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, message: '다른 작업이 진행 중이에요. 잠시 후 다시 눌러 주세요.' };
  }
  try {
    const row = findOne_(TAB.PAYROLL, 'pay_id', payId);
    if (!row) return { ok: false, message: '지울 기록을 찾지 못했어요. 새로고침 해 보세요.' };
    sheet_(TAB.PAYROLL).deleteRow(row._row);
    audit_('급여삭제', payId, '삭제함');
    return { ok: true, data: { payId: payId } };
  } catch (e) {
    audit_('급여삭제', payId, '오류: ' + e.message);
    return { ok: false, message: '삭제 중 문제가 생겼어요. ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/* ** 설명: 화면에서 온 값을 숫자·글자·참거짓으로 다시 정리한다 // ** 이유: "2,500,000" 같은 글자나 이상한 값이 와도 계산이 깨지지 않게 ** */
function normalizeInput_(f) {
  f = f || {};
  const num = function (v) { return Math.max(0, Number(String(v === undefined ? '' : v).replace(/[^\d.]/g, '')) || 0); };
  const rrnText = String(f.rrn || '').trim();
  return {
    month: String(f.month || '').trim(),
    clientId: String(f.clientId || '').trim(),
    // 지급일 "2026-11-25" → 한국 시간 기준 날짜. 형식이 틀리면 Invalid Date가 되어 아래 검사에서 걸린다
    payDate: f.payDate
      ? (/^\d{4}-\d{2}-\d{2}$/.test(String(f.payDate)) ? Utilities.parseDate(String(f.payDate), TZ, 'yyyy-MM-dd') : new Date(NaN))
      : '',
    empId: String(f.empId || '').trim().toUpperCase(),
    name: String(f.name || '').trim().slice(0, 20),
    rrn: rrnText ? normalizeRrn_(rrnText) : '',
    rrnInvalid: rrnText !== '' && !normalizeRrn_(rrnText),
    workType: f.workType === '시급제' ? '시급제' : '월급제',
    weekHours: Math.min(num(f.weekHours), 40),
    base: num(f.base), hourlyWage: num(f.hourlyWage), otHours: num(f.otHours),
    bonus: num(f.bonus), etc: num(f.etc), meal: num(f.meal), car: num(f.car),
    insNp: f.insNp === true, insHi: f.insHi === true, insEi: f.insEi === true,
    incomeTax: num(f.incomeTax)
  };
}

/* ** 설명: 정리된 입력값을 검사해 문제가 있으면 쉬운 설명을, 없으면 빈 글자를 돌려준다 // ** 이유: 화면에서도 검사하지만, 서버에서 한 번 더 막아야 안전하다 ** */
function validateInput_(i) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(i.month)) return '귀속연월을 골라 주세요.';
  if (!i.name) return '성명을 입력해 주세요.';
  if (i.rrnInvalid) return '주민번호는 숫자 13자리로 입력해 주세요.';
  if (i.weekHours <= 0) return '주 소정근로시간을 입력해 주세요.';
  if (i.workType === '월급제' && i.base <= 0) return '기본급을 입력해 주세요.';
  if (i.workType === '시급제' && i.hourlyWage <= 0) return '시급을 입력해 주세요.';
  if (i.payDate && isNaN(i.payDate.getTime())) return '지급일 형식이 올바르지 않아요.';
  const client = findOne_(TAB.CLIENT, 'client_id', i.clientId);
  if (!client) return '고객번호 ' + i.clientId + '를 고객마스터에서 찾을 수 없어요.';
  if (client['상태'] === '해지') return '해지된 고객이에요: ' + i.clientId;
  return '';
}


/* ==================== [덩어리 9 / 11] 시트 한 줄 → 화면용 기록 ==================== */
/*
  ** 설명: 급여대장 한 줄을 script.js가 쓰던 기록 모양으로 바꾼다 // ** 이유: 화면 코드(표 그리기, 상세보기)를 거의 고치지 않고 그대로 쓰려고 **
  ⚠️ Date는 글자로 바꿔서 보낸다 (dateText_)
*/
function rowToRecord_(o) {
  const n = function (v) { return Number(v) || 0; };
  const isHourly = o['근로유형'] === '시급제';
  return {
    pay_id: String(o.pay_id),
    month: dateText_(o['귀속연월'], 'yyyy-MM'),
    client_id: String(o.client_id),
    pay_date: dateText_(o['지급일']),
    emp_id: String(o.emp_id),
    name: String(o['성명']),
    rrn_masked: String(o['주민번호(가림)'] || ''),
    work_type: isHourly ? '시급제' : '월급제',
    week_hours: n(o['주소정근로시간']),
    input: {
      base: n(o['기본급']), hourlyWage: n(o['시급']), otHours: n(o['연장근로시간']),
      bonus: n(o['상여금']), etc: n(o['기타과세수당']), meal: n(o['식대']), car: n(o['자가운전보조금']),
      insNp: o['국민연금가입'] === 'Y', insHi: o['건강보험가입'] === 'Y', insEi: o['고용보험가입'] === 'Y',
      incomeTax: n(o['근로소득세'])
    },
    result: {
      mHours: n(o['월소정근로시간']), base: n(o['기본급']), ordinaryWage: n(o['통상시급']), overtimePay: n(o['연장수당']),
      nonTaxable: n(o['비과세합계']), gross: n(o['지급총액']), taxable: n(o['과세급여']),
      np: n(o['국민연금']), hi: n(o['건강보험']), ltc: n(o['장기요양보험']), ei: n(o['고용보험']),
      incomeTax: n(o['근로소득세']), localTax: n(o['지방소득세']), deductions: n(o['공제총액']), net: n(o['실수령액']),
      minWageOk: o['최저임금'] === '충족'
    },
    saved_at: dateText_(o['저장시각'], 'yyyy-MM-dd HH:mm:ss')
  };
}


/* ==================== [덩어리 10 / 11] 테스트 함수 (편집기에서 ▶ 실행) ==================== */
/*
  ** 설명: 화면 없이도 저장이 되는지 확인하는 함수 // ** 이유: 화면(4단계)을 붙이기 전에 서버 코드가 맞는지 먼저 확인 (CLAUDE.md 개발 순서 3번) **
  실행하면: 가짜 직원 홍길동이 C0001에 저장되고, 실행 로그에 실수령액이 찍힌다.
  웹 화면 예시 데이터와 같은 값이므로 실수령액이 2,761,885원 이면 계산이 화면과 같다는 뜻.
*/
function testSaveSample() {
  const month = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  // E000001이 이미 있으면 그 번호를 다시 써서, 여러 번 실행해도 홍길동이 늘어나지 않게 한다
  const first = findOne_(TAB.EMP, 'emp_id', 'E000001');
  const result = apiSaveRecord({
    month: month, clientId: 'C0001', payDate: '', empId: first ? 'E000001' : '',
    name: '홍길동', rrn: '900101-1234567', workType: '월급제', weekHours: 40,
    base: 2500000, hourlyWage: 0, otHours: 10, bonus: 0, etc: 0, meal: 200000, car: 200000,
    insNp: true, insHi: true, insEi: true, incomeTax: 52000
  }, true);
  Logger.log(result.ok
    ? '✅ 저장 성공: ' + result.data.record.pay_id + ' / 실수령액 ' + result.data.record.result.net.toLocaleString() + '원 (기대값 2,761,885원)'
    : '❌ 실패: ' + result.message);
}

/* ** 설명: 지금 시트에 저장된 급여 건수와 첫 건을 로그로 보여준다 // ** 이유: 화면이 받게 될 데이터를 미리 눈으로 확인 ** */
function testBootData() {
  const res = apiGetBootData();
  if (!res.ok) { Logger.log('❌ ' + res.message); return; }
  Logger.log('✅ 고객 ' + res.data.clients.length + '곳, 급여 ' + res.data.records.length + '건, 최저시급 ' + res.data.settings.minWage + '원');
  if (res.data.records.length) Logger.log(JSON.stringify(res.data.records[0]));
}


/* ==================== [덩어리 11 / 11] 화면 열기 (doGet) ==================== */
/*
  ** 설명: 화면 제목 (날짜·시간·용량 포함) // ** 이유: 어느 버전인지 한눈에 구분. index.html의 <title>이 이 값을 가져다 쓴다 ** */
const APP_TITLE = '피플 앤 퍼플 시트연결 26년도 11월 15일 오후 2시 7분 112.5KB';

/*
  ** 설명: 웹 앱 주소로 들어오면 실행되는 "현관문" 함수. index 파일을 틀(템플릿)로 읽어 완성된 화면을 돌려준다 // ** 이유: Apps Script 웹 앱은 doGet이 있어야 화면이 열린다 **
  ** 변경 전 코드 ** HtmlService.createHtmlOutputFromFile('퍼플 택스 01') ... .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
  // ** 변경 후 코드 ** createTemplateFromFile('index').evaluate()  (ALLOWALL 삭제)
  → ALLOWALL은 "아무 사이트나 내 화면을 액자로 끼워 넣어도 된다"는 뜻이라, 남의 사이트가 내 급여 화면을 몰래 띄워 클릭을 유도할 수 있다(클릭재킹). 기본값이 안전하다.
*/
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()                                                   // 틀 안의 <?= ?> 자리를 채워 완성
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // 폰 화면 맞춤 (Apps Script는 html 안의 viewport를 무시해서 여기서 다시 넣는다)
}

/*
  ** 설명: _css, _js 파일 내용을 글자로 꺼내 index 안에 붙여 넣는 도구 // ** 이유: Apps Script는 style.css처럼 파일 주소로 불러올 수 없어서 내용을 직접 붙인다 **
  ** 변경 전 코드 ** function include(filename) (CLAUDE.md 예시)
  // ** 변경 후 코드 ** function include_(filename) — 이름 끝 _ 로 "화면에서 직접 부를 수 없는 함수"로 만듦 (틀 안에서는 그대로 쓸 수 있다)
*/
function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
