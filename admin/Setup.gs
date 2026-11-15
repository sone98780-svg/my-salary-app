/*
  ============================================================
  📁 Setup.gs — 마스터DB 시트의 "장부 탭"을 자동으로 만드는 파일
  ------------------------------------------------------------
  - 할 일: setupMasterDb 함수를 ▶ 실행 하면 탭 11개와 제목줄이 생긴다.
  - 여러 번 실행해도 안전하다. 이미 있는 탭·데이터는 지우지 않고, 빠진 것만 채운다.
  - [덩어리 1] ~ [덩어리 4] 로 나뉘어 있다.
  - 주석 형식
    ** 설명 ** // ** 이유 **
    ** 변경 전 코드 ** // ** 변경 후 코드 **
  ============================================================
*/

/* ==================== [덩어리 1 / 4] 탭 설계도 (SCHEMA) ==================== */
/*
  ** 설명: 탭 이름과 제목줄(열 이름)을 한 곳에 적은 설계도 // ** 이유: CLAUDE.md의 '마스터 DB 탭 구조'를 코드로 옮긴 것. 모든 코드가 이 이름으로 열을 찾는다 **
  ** 변경 전 코드 ** sheet.getRange("B13:BD60") (칸 주소로 찾기 → 열 하나만 끼워 넣어도 전부 어긋남)
  // ** 변경 후 코드 ** 제목줄 이름('기본급' 등)으로 열을 찾는다 → 열 순서가 바뀌어도 안전
  ★ '급여대장' 탭은 이번에 새로 추가했다 (한 사람의 한 달 급여 = 한 줄).
*/
const SCHEMA = {
  '고객마스터': ['client_id', '상호', '사업자번호', '대표자', '업종', '사업개시일', '급여일', '담당자명', '담당자이메일', '급여시트ID', '폴더ID', '포털토큰', '이용서비스', '상태', '등록일'],
  '직원마스터': ['emp_id', 'client_id', '성명', '생년월일', '입사일', '퇴사일', '근로유형', '주소정근로시간', '월급', '시급', '비과세식대', '비과세자가운전', '익월납부', '이메일', '상태'],
  '민감정보':   ['emp_id', '주민번호', '등본예정'],
  '피부양자':   ['dep_id', 'emp_id', '성명', '관계', '주민번호', '등본예정', '등록상태'],
  '신고큐':     ['filing_id', 'client_id', 'emp_id', '신고유형', '기관', '사유발생일', '기한', '상태', '처리자', '처리일', '접수번호', '비고'],
  '급여마감':   ['run_id', 'client_id', '귀속연월', '지급일', '상태', '승인자', '승인시각'],
  '급여대장':   ['pay_id', '귀속연월', 'client_id', 'emp_id', '성명', '주민번호(가림)', '근로유형', '주소정근로시간', '지급일',
                 '시급', '연장근로시간', '상여금', '기타과세수당', '식대', '자가운전보조금', '국민연금가입', '건강보험가입', '고용보험가입',
                 '월소정근로시간', '통상시급', '기본급', '연장수당', '비과세합계', '지급총액', '과세급여',
                 '국민연금', '건강보험', '장기요양보험', '고용보험', '근로소득세', '지방소득세', '공제총액', '실수령액',
                 '최저임금', '저장시각', '저장자'],
  '발송로그':   ['log_id', 'run_id', 'emp_id', '수신자', '파일ID', '결과', '시각'],
  '브리핑':     ['brief_id', '연월', '주제', '근거링크', '시행일', '대상업종', '본문', '상태'],
  '설정':       ['key', 'value', '적용시작일', '설명'],
  '감사로그':   ['시각', '사용자', '동작', '대상ID', '결과']
};

/* ** 설명: '글자로만' 저장해야 하는 열 목록 // ** 이유: 구글 시트는 "2026-11"을 날짜로, "0001"을 숫자 1로 멋대로 바꾼다. 번호·연월·주민번호는 글자 그대로 지켜야 한다 ** */
const TEXT_COLUMNS = ['client_id', 'emp_id', 'pay_id', 'dep_id', 'filing_id', 'run_id', 'log_id', 'brief_id',
  '귀속연월', '연월', '사업자번호', '주민번호', '주민번호(가림)', '포털토큰', 'key', '대상ID', '급여시트ID', '폴더ID', '파일ID'];

/* ** 설명: 날짜 모양으로 보여줄 열 목록 // ** 이유: CLAUDE.md "날짜는 날짜 형식 그대로 저장" 규칙 ** */
const DATE_COLUMNS = ['사업개시일', '등록일', '생년월일', '입사일', '퇴사일', '사유발생일', '기한', '처리일', '지급일', '시행일', '적용시작일'];
const DATETIME_COLUMNS = ['승인시각', '시각', '저장시각'];

/* ** 설명: 돈 열은 3자리 콤마로 보여준다 // ** 이유: 시트를 직접 열어 볼 때 읽기 쉽게 ** */
const MONEY_COLUMNS = ['월급', '시급', '비과세식대', '비과세자가운전', '상여금', '기타과세수당', '식대', '자가운전보조금',
  '통상시급', '기본급', '연장수당', '비과세합계', '지급총액', '과세급여', '국민연금', '건강보험', '장기요양보험', '고용보험',
  '근로소득세', '지방소득세', '공제총액', '실수령액'];


/* ==================== [덩어리 2 / 4] 탭 만들기 (메인 함수) ==================== */
/*
  ** 설명: 설계도(SCHEMA)대로 탭과 제목줄을 만든다. ▶ 실행 버튼으로 돌리는 함수 // ** 이유: 탭 11개를 손으로 만들면 오타가 나기 쉽다 **
  ⚠️ 데이터를 지우는 코드는 없다. 없는 것만 새로 만든다.
*/
function setupMasterDb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');            // 시간대를 한국으로 (CLAUDE.md 규칙)
  const report = [];                                   // 무엇을 했는지 적어 둘 메모장

  Object.keys(SCHEMA).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);                   // 탭이 없으면 새로 만든다
      report.push('🆕 ' + name + ' 탭을 만들었어요');
    }
    const added = ensureHeaders_(sheet, SCHEMA[name]);
    if (added.length) report.push('➕ ' + name + ': 제목 추가 ' + added.join(', '));
    applyColumnFormats_(sheet);
  });

  seedSettings_(ss, report);
  seedClients_(ss, report);
  removeEmptyDefaultSheet_(ss, report);

  const message = report.length ? report.join('\n') : '이미 모두 준비되어 있어요. 바뀐 것 없음 ✅';
  Logger.log(message);                                 // 편집기 아래 '실행 로그'에 보인다
  return message;
}


/* ==================== [덩어리 3 / 4] 제목줄·서식 도우미 ==================== */

/*
  ** 설명: 1행 제목줄을 확인하고, 빠진 제목만 오른쪽 끝에 붙인다 // ** 이유: 나중에 설계도에 열이 늘어나도 기존 데이터를 지키며 열만 추가하려고 **
  함수 이름 끝의 _ (밑줄) = Apps Script에서 "화면에서 직접 부를 수 없는 내부용 함수"라는 표시
*/
function ensureHeaders_(sheet, headers) {
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); })
    : [];
  const missing = headers.filter(function (h) { return current.indexOf(h) === -1; });

  if (missing.length) {
    const startCol = current.filter(String).length + 1;     // 비어 있지 않은 제목 다음 칸부터
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }
  const all = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  all.setFontWeight('bold').setBackground('#f3e8ff');        // 제목줄은 굵게 + 연보라
  sheet.setFrozenRows(1);                                     // 스크롤해도 제목줄 고정
  return missing;
}

/* ** 설명: 열 이름을 보고 글자/날짜/돈 서식을 열 전체에 입힌다 // ** 이유: 처음에 서식을 정해 두면 시트가 값을 멋대로 바꾸지 않는다 ** */
function applyColumnFormats_(sheet) {
  const lastCol = sheet.getLastColumn();
  const rows = sheet.getMaxRows() - 1;                       // 제목줄 뺀 나머지 줄 수
  if (rows < 1 || lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  headers.forEach(function (h, i) {
    const format = columnFormat_(String(h).trim());
    if (format) sheet.getRange(2, i + 1, rows, 1).setNumberFormat(format);
  });
}

/* ** 설명: 열 이름 하나를 받아 알맞은 서식 글자를 돌려준다 // ** 이유: Code.gs에서 새 줄을 쓸 때도 같은 규칙을 쓰려고 함수로 분리 ** */
function columnFormat_(header) {
  if (TEXT_COLUMNS.indexOf(header) !== -1) return '@';                 // @ = 글자 그대로
  if (DATE_COLUMNS.indexOf(header) !== -1) return 'yyyy-mm-dd';
  if (DATETIME_COLUMNS.indexOf(header) !== -1) return 'yyyy-mm-dd hh:mm:ss';
  if (MONEY_COLUMNS.indexOf(header) !== -1) return '#,##0';
  return null;                                                          // 나머지는 그대로
}


/* ==================== [덩어리 4 / 4] 처음 값 채우기 (설정·테스트 고객) ==================== */

/*
  ** 설명: '설정' 탭에 최저임금·보험요율 등 처음 값을 넣는다. 이미 있는 key는 건드리지 않는다 // ** 이유: CLAUDE.md 절대규칙 3번 — 바뀌는 숫자는 설정 탭에서 읽는다 **
  ** 변경 전 코드 ** script.js 안의 const SETTINGS = { minWage: { value: 10320, ... } }
  // ** 변경 후 코드 ** 설정 탭의 한 줄: minWage | 10320 | 2026-01-01 | 최저시급 — 2026년 최저임금
  ⚠️ 국민연금 상·하한은 매년 7월 바뀐다. 바뀌면 같은 key로 새 줄을 넣고 적용시작일을 적으면, 날짜가 지난 것 중 가장 최근 값이 쓰인다.
*/
function seedSettings_(ss, report) {
  const defaults = [
    ['minWage',      10320,   '최저시급 — 2026년 최저임금 (원/시간)'],
    ['monthHours40', 209,     '월 소정근로시간(주40h) — 주 40시간 + 주휴 8시간 기준'],
    ['mealLimit',    200000,  '식대 비과세 한도 — 월 20만원'],
    ['carLimit',     200000,  '자가운전 비과세 한도 — 월 20만원'],
    ['overtimeRate', 1.5,     '연장근로 가산율 — 통상시급 × 1.5배'],
    ['npRate',       0.0475,  '국민연금 (근로자) — 총 9.5% 중 절반'],
    ['npMinBase',    400000,  '국민연금 기준소득 하한 — 매년 7월 변경'],
    ['npMaxBase',    6370000, '국민연금 기준소득 상한 — 매년 7월 변경 · 공단 고시 확인 필요'],
    ['hiRate',       0.03595, '건강보험 (근로자) — 총 7.19% 중 절반'],
    ['ltcRatio',     0.1314,  '장기요양 — 건강보험료 × 13.14%'],
    ['eiRate',       0.009,   '고용보험 (근로자) — 실업급여분 0.9%'],
    ['localTaxRate', 0.1,     '지방소득세 — 근로소득세 × 10%']
  ];
  const sheet = ss.getSheetByName('설정');
  const existingKeys = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); })
    : [];
  const start = new Date(2026, 0, 1);                        // 2026-01-01 (월은 0부터 셈: 0 = 1월)
  const rows = defaults
    .filter(function (d) { return existingKeys.indexOf(d[0]) === -1; })
    .map(function (d) { return [d[0], d[1], start, d[2]]; });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
    report.push('⚙️ 설정 값 ' + rows.length + '개를 넣었어요');
  }
}

/* ** 설명: 고객마스터가 비어 있으면 가짜 테스트 고객 2곳을 넣는다 // ** 이유: DEV(연습용)에는 가짜 데이터만 쓴다 (안전수칙 2번) ** */
function seedClients_(ss, report) {
  const sheet = ss.getSheetByName('고객마스터');
  if (sheet.getLastRow() > 1) return;                        // 이미 고객이 있으면 그대로 둠
  const headers = SCHEMA['고객마스터'];
  const today = new Date();
  const clients = [
    { client_id: 'C0001', 상호: '테스트 주식회사', 상태: '이용중', 등록일: today },
    { client_id: 'C0002', 상호: '연습상사',       상태: '이용중', 등록일: today }
  ];
  const rows = clients.map(function (c) {
    return headers.map(function (h) { return c[h] !== undefined ? c[h] : ''; });   // 제목 순서대로 칸 채우기
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  report.push('🏢 테스트 고객 C0001, C0002를 넣었어요');
}

/* ** 설명: 처음부터 있던 빈 '시트1' 탭을 지운다 (내용이 하나라도 있으면 지우지 않음) // ** 이유: 쓰지 않는 탭이 있으면 헷갈린다 ** */
function removeEmptyDefaultSheet_(ss, report) {
  ['시트1', 'Sheet1'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
      report.push('🧹 빈 ' + name + ' 탭을 지웠어요');
    }
  });
}
