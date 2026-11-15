/*
  ============================================================
  ⚙️ script.js — 화면의 "근육(동작)"
  ------------------------------------------------------------
  공부 순서 (하루에 1~2 덩어리씩)
    [덩어리 1]  설정값 SETTINGS (최저임금·보험요율)
    [덩어리 2]  작은 도구들 (칸 찾기, 콤마 붙이기)
    [덩어리 3]  주민번호 가리기
    [덩어리 4]  저장소 (브라우저에 저장/불러오기)
    [덩어리 5]  번호표 발급 (E000001)
    [덩어리 6]  급여 계산기 ★ 가장 중요
    [덩어리 7]  입력칸 읽기 + 미리보기
    [덩어리 8]  저장·초기화·예시 버튼
    [덩어리 9]  조회 표 그리기
    [덩어리 10] 상세보기·수정·삭제·CSV
    [덩어리 11] 탭 전환 + 시작 버튼(초기 실행)

  주석 형식
    ** 설명 ** // ** 이유 **
    ** 변경 전 코드 ** // ** 변경 후 코드 **

  용어 미리보기 (중학생 버전)
    - 변수(const/let): 값을 담는 이름표 붙은 상자. const는 다시 못 바꾸는 상자, let은 바꿀 수 있는 상자
    - 함수(function): 일을 시키는 "레시피". 이름(재료) 넣으면 결과가 나온다
    - 객체({ }): 이름표가 붙은 서랍장. 예) emp.name → emp 서랍장의 name 칸
    - 배열([ ]): 줄 세운 상자들. 예) list[0] → 첫 번째 상자
    - 이벤트: "버튼이 눌렸다", "글자가 바뀌었다" 같은 사건. addEventListener로 사건에 반응한다
  ============================================================
*/

/* ==================== [덩어리 1 / 11] 설정값 SETTINGS ==================== */
/*
  ** 설명: 계산에 쓰는 숫자를 한 곳에 모은 서랍장 // ** 이유: 법이 바뀌면 여기 숫자만 고치면 된다 (CLAUDE.md 절대규칙 3번) **
  ** 변경 전 코드 ** const MIN_WAGE = 10320; const TAX_FREE_LIMIT = 200000;  (화면 코드 곳곳에 흩어짐)
  // ** 변경 후 코드 ** const SETTINGS = { minWage: 10320, mealLimit: 200000, ... }  (한 서랍에 모음)
  → 나중(S1 이후)에는 이 값을 Google 시트 '설정' 탭에서 읽어 오도록 바꿀 예정이다.
  ⚠️ 국민연금 상·하한은 매년 7월에 바뀐다. 실제 신고 전 공단 고시를 꼭 확인할 것.
*/
const SETTINGS = {
  minWage:        { value: 10320,   label: '최저시급',              note: '2026년 최저임금 (원/시간)' },
  monthHours40:   { value: 209,     label: '월 소정근로시간(주40h)', note: '주 40시간 + 주휴 8시간 기준 한 달 시간' },
  mealLimit:      { value: 200000,  label: '식대 비과세 한도',       note: '월 20만원까지 세금·보험 제외' },
  carLimit:       { value: 200000,  label: '자가운전 비과세 한도',   note: '월 20만원까지 세금·보험 제외' },
  overtimeRate:   { value: 1.5,     label: '연장근로 가산율',        note: '통상시급 × 1.5배' },
  npRate:         { value: 0.0475,  label: '국민연금 (근로자)',      note: '총 9.5% 중 근로자 절반 4.75% (2026)' },
  npMinBase:      { value: 400000,  label: '국민연금 기준소득 하한', note: '이보다 적어도 이 금액으로 계산 (매년 7월 변경)' },
  npMaxBase:      { value: 6370000, label: '국민연금 기준소득 상한', note: '이보다 많아도 이 금액까지만 계산 (매년 7월 변경 · 확인 필요)' },
  hiRate:         { value: 0.03595, label: '건강보험 (근로자)',      note: '총 7.19% 중 근로자 절반 3.595% (2026)' },
  ltcRatio:       { value: 0.1314,  label: '장기요양 (건강보험료 대비)', note: '건강보험료 × 13.14% (2026)' },
  eiRate:         { value: 0.009,   label: '고용보험 (근로자)',      note: '실업급여분 0.9%' },
  localTaxRate:   { value: 0.1,     label: '지방소득세',             note: '근로소득세 × 10%' }
};

/* ** 설명: SETTINGS에서 숫자만 꺼내는 짧은 함수 // ** 이유: SETTINGS.minWage.value 처럼 길게 쓰지 않고 S('minWage')로 짧게 쓰려고 ** */
function S(key) {
  return SETTINGS[key].value;
}

/* ** 설명: 고객 목록 (지금은 가짜 데이터) // ** 이유: 업체명이 아닌 client_id로 고르게 하려고. 나중엔 '고객마스터' 탭에서 읽는다 **
   ** 변경 전 코드 ** var clientMap = { "퍼플택스": "1j0p4h...", "오렌지 컴퍼니": "1YUuN_..." };  (업체명 → 시트ID 하드코딩)
   // ** 변경 후 코드 ** const CLIENTS = [{ id: 'C0001', name: '테스트 주식회사' }, ...]  (번호가 주인공, 시트ID는 코드에 안 씀) */
const CLIENTS = [
  { id: 'C0001', name: '테스트 주식회사' },
  { id: 'C0002', name: '연습상사' }
];

/* ** 설명: 브라우저 저장소에서 쓸 이름표 // ** 이유: 이름을 한 곳에 두어야 오타로 다른 칸에 저장하는 실수를 막는다 ** */
const STORAGE_KEY = 'peopleAndPurple.payroll.v1';


/* ==================== [덩어리 2 / 11] 작은 도구들 ==================== */

/* ** 설명: id로 화면의 칸 하나를 찾는다 ($ 는 그냥 짧은 이름) // ** 이유: document.getElementById를 매번 길게 쓰지 않으려고 ** */
function $(id) {
  return document.getElementById(id);
}

/* ** 설명: 숫자에 콤마를 붙여 글자로 바꾼다 (2500000 → "2,500,000") // ** 이유: 돈은 콤마가 있어야 한눈에 읽힌다 **
   ** 변경 전 코드 ** const fmt = (n) => !n && n !== 0 ? '0' : Math.floor(n).toLocaleString();
   // ** 변경 후 코드 ** 아래 fmt (숫자가 아닌 값이 와도 0으로 안전하게 처리) */
function fmt(n) {
  const num = Number(n);
  if (!isFinite(num)) return '0';            // 숫자가 아니면 0
  return Math.floor(num).toLocaleString('ko-KR');
}

/* ** 설명: "2,500,000" 같은 글자에서 콤마를 빼고 숫자로 바꾼다 // ** 이유: 계산은 숫자로만 할 수 있다 ** */
function unfmt(text) {
  return Number(String(text).replace(/[^\d.-]/g, '')) || 0;   // 숫자·점·마이너스 말고 전부 지움
}

/* ** 설명: 금액 뒤에 '원'을 붙인다 // ** 이유: 화면 표기 통일 (예전 AGENTS_RULE의 '단위 표기' 규칙) ** */
function won(n) {
  return fmt(n) + '원';
}

/* ** 설명: 10원 미만을 버린다 (1,234 → 1,230) // ** 이유: 4대보험료는 10원 미만을 절사(버림)하는 것이 실무 관행 ** */
function floor10(n) {
  return Math.floor(n / 10) * 10;
}

/* ** 설명: 오늘 날짜를 "2026-11" 형태로 // ** 이유: 귀속연월 칸의 처음 값으로 이번 달을 넣어 주려고 ** */
function thisMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/* ** 설명: 화면 아래에 알림을 2.5초 동안 띄운다 // ** 이유: 저장 성공/실패를 쉬운 한국어로 알리기 (CLAUDE.md 코드 스타일) **
   ** 변경 전 코드 ** alert("에러: " + err);   (창을 눌러 닫아야 함)
   // ** 변경 후 코드 ** toast("저장했어요")  (저절로 사라짐) */
let toastTimer = null;
function toast(message, isError) {
  const box = $('toast');
  box.textContent = message;                     // 글자는 항상 textContent로 넣는다 (아래 덩어리 9 설명 참고)
  box.classList.toggle('error', Boolean(isError));
  box.hidden = false;
  clearTimeout(toastTimer);                      // 이전 타이머가 있으면 취소
  toastTimer = setTimeout(function () { box.hidden = true; }, 2500);
}

/* ** 설명: 돈 칸에 글자를 칠 때마다 콤마를 자동으로 붙인다 // ** 이유: 2500000을 치면 바로 2,500,000으로 보여야 자릿수 실수가 줄어든다 ** */
function attachMoneyFormat() {
  document.querySelectorAll('input.money').forEach(function (input) {
    input.addEventListener('input', function () {
      const n = unfmt(input.value);
      input.value = n === 0 && input.value.trim() === '' ? '' : fmt(n);
    });
  });
}


/* ==================== [덩어리 3 / 11] 주민번호 가리기 ==================== */
/*
  ** 설명: 주민번호 뒤 7자리를 *******로 바꾼다 // ** 이유: 개인정보 보호. 저장·화면·메일에는 가린 번호만 쓴다 (절대규칙 4번) **
  ** 변경 전 코드 ** if (sCell.match(/\d{6}-\d{7}/)) return sCell.substring(0, 8) + "*******";
     → 하이픈 다음 첫 숫자(성별 숫자)까지 남겨서 실제로는 뒤 6자리만 가려졌다.
  // ** 변경 후 코드 ** 숫자만 뽑아 앞 6자리 + "-*******" (하이픈이 있든 없든 똑같이 처리)
*/
function maskRrn(raw) {
  const digits = String(raw || '').replace(/\D/g, '');   // \D = 숫자가 아닌 것 → 전부 지움
  if (digits.length === 0) return '';                     // 비어 있으면 빈칸
  return digits.slice(0, 6) + '-*******';                 // 앞 6자리만 남김
}

/* ** 설명: 주민번호가 13자리인지 검사 (비어 있으면 통과) // ** 이유: 오타가 장부에 들어가면 신고가 반려된다 ** */
function isValidRrn(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 0 || digits.length === 13;
}


/* ==================== [덩어리 4 / 11] 저장소 (브라우저 localStorage) ==================== */
/*
  ** 설명: 급여 기록을 브라우저 안에 저장하고 꺼낸다 // ** 이유: 아직 Google 시트와 연결 전이라, 연습용으로 브라우저에 보관한다 **
  localStorage = 브라우저마다 있는 작은 메모장. 껐다 켜도 남아 있지만, 이 컴퓨터·이 브라우저에서만 보인다.
  → S2~S4 단계에서 이 부분만 google.script.run(GAS 호출)으로 바꾸면 화면은 그대로 쓸 수 있다.
*/
function loadRecords() {
  try {                                                  // try = "해 보고, 실패하면 catch로"
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? JSON.parse(text) : [];                 // JSON.parse = 글자 → 객체로 되돌리기
  } catch (e) {
    console.error('불러오기 실패', e);                    // 오류를 삼키지 않고 기록 (코드 스타일 규칙)
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));   // JSON.stringify = 객체 → 글자로 바꿔 저장
    return true;
  } catch (e) {
    console.error('저장 실패', e);
    toast('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', true);
    return false;
  }
}


/* ==================== [덩어리 5 / 11] 번호표 발급 ==================== */
/*
  ** 설명: 새 직원에게 E000001, E000002 … 순서로 번호를 준다 // ** 이유: 동명이인이 있어도 번호로 정확히 구분한다 (절대규칙 1번) **
  padStart(6, '0') = 숫자 앞을 0으로 채워 6자리로 맞추기 (7 → "000007")
*/
function nextEmpId(records) {
  let max = 0;
  records.forEach(function (r) {
    const n = Number(String(r.emp_id).replace('E', ''));
    if (n > max) max = n;
  });
  return 'E' + String(max + 1).padStart(6, '0');
}

/* ** 설명: 급여 1건의 고유 번호(pay_id) 만들기 = 귀속연월 + 직원번호 // ** 이유: "같은 달·같은 사람"은 딱 한 건만 있게 해서 중복을 막는다 (절대규칙 6번과 같은 생각) ** */
function makePayId(month, empId) {
  return month + '_' + empId;
}


/* ==================== [덩어리 6 / 11] 급여 계산기 ★ ==================== */

/*
  ** 설명: 주 소정근로시간 → 한 달 소정근로시간으로 바꾼다 // ** 이유: 통상시급(기본급 ÷ 월 시간)과 시급제 월급을 구할 때 필요 **
  - 주 40시간 이상 → 209시간
  - 주 15시간 이상 → (주 시간 + 주휴시간) × 4.345주  (주휴시간 = 주 시간 ÷ 40 × 8)
  - 주 15시간 미만 → 주휴수당이 없으므로 주 시간 × 4.345주
  ** 변경 전 코드 ** const calcTime = (h) => (h >= 40 ? 209 : ...);  (화살표 함수 한 줄)
  // ** 변경 후 코드 ** 아래처럼 if 문으로 풀어 씀 (초보자가 읽기 쉽게, 계산 결과는 같음)
*/
function monthlyHours(weekHours) {
  const h = Number(weekHours) || 0;
  if (h >= 40) return S('monthHours40');
  if (h >= 15) return Math.round((h + (h / 40) * 8) * 4.345 * 10) / 10;
  return Math.round(h * 4.345 * 10) / 10;
}

/*
  ** 설명: 입력값 묶음(input)을 받아 급여 결과 묶음을 돌려주는 "순수 함수" // ** 이유: 화면·저장과 상관없이 계산만 하므로, 나중에 GAS로 그대로 옮겨 쓸 수 있고 테스트하기 쉽다 (CLAUDE.md 개발 순서) **
  순수 함수 = 같은 재료를 넣으면 항상 같은 결과가 나오고, 다른 곳을 건드리지 않는 함수
  ⚠️ 연습용 단순 계산이다. 통상임금 범위, 두루누리 지원, 연말정산 등은 아직 반영하지 않았다.
*/
function calcPayroll(input) {
  // ① 한 달 근로시간
  const mHours = monthlyHours(input.weekHours);

  // ② 기본급: 월급제는 입력한 금액, 시급제는 시급 × 한 달 시간
  const base = input.workType === '시급제'
    ? Math.floor(input.hourlyWage * mHours)
    : input.base;

  // ③ 통상시급 = 기본급 ÷ 한 달 시간 (시급제는 입력한 시급 그대로)
  const ordinaryWage = input.workType === '시급제'
    ? input.hourlyWage
    : (mHours > 0 ? Math.floor(base / mHours) : 0);

  // ④ 연장수당 = 통상시급 × 1.5 × 연장시간
  const overtimePay = Math.floor(ordinaryWage * S('overtimeRate') * input.otHours);

  // ⑤ 비과세: 한도까지만 비과세, 넘는 부분은 과세로 돌린다
  //    Math.min(a, b) = 둘 중 작은 값
  const mealFree = Math.min(input.meal, S('mealLimit'));
  const carFree = Math.min(input.car, S('carLimit'));
  const nonTaxable = mealFree + carFree;

  // ⑥ 지급총액과 과세급여
  const gross = base + overtimePay + input.bonus + input.etc + input.meal + input.car;
  const taxable = gross - nonTaxable;

  // ⑦ 국민연금: 기준소득월액(1,000원 미만 버림)을 하한~상한 사이로 맞춘 뒤 요율 곱하기
  let np = 0;
  if (input.insNp && taxable > 0) {
    const npBase = Math.min(Math.max(Math.floor(taxable / 1000) * 1000, S('npMinBase')), S('npMaxBase'));
    np = floor10(npBase * S('npRate'));
  }

  // ⑧ 건강보험과 장기요양보험 (장기요양 = 건강보험료 × 비율)
  const hi = input.insHi ? floor10(taxable * S('hiRate')) : 0;
  const ltc = input.insHi ? floor10(hi * S('ltcRatio')) : 0;

  // ⑨ 고용보험
  const ei = input.insEi ? floor10(taxable * S('eiRate')) : 0;

  // ⑩ 세금: 소득세는 입력값, 지방소득세는 10%
  const incomeTax = input.incomeTax;
  const localTax = floor10(incomeTax * S('localTaxRate'));

  // ⑪ 공제총액과 실수령액
  const deductions = np + hi + ltc + ei + incomeTax + localTax;
  const net = gross - deductions;

  // ⑫ 최저임금 검사: 통상시급이 최저시급 이상이면 통과
  const minWageOk = ordinaryWage >= S('minWage');

  // 결과를 서랍장(객체) 하나에 담아 돌려준다
  return {
    mHours, base, ordinaryWage, overtimePay,
    nonTaxable, gross, taxable,
    np, hi, ltc, ei, incomeTax, localTax,
    deductions, net, minWageOk
  };
}


/* ==================== [덩어리 7 / 11] 입력칸 읽기 + 미리보기 ==================== */

/* ** 설명: 화면의 입력칸들을 읽어 '입력값 묶음' 하나로 만든다 // ** 이유: 계산기(calcPayroll)는 화면을 모르고, 이 함수가 화면 ↔ 계산기를 이어 준다 ** */
function readForm() {
  const checked = document.querySelector('input[name="worktype"]:checked');
  return {
    month: $('f-month').value,
    clientId: $('f-client').value,
    payDate: $('f-paydate').value,
    empId: $('f-empid').value,
    name: $('f-name').value.trim(),
    rrn: $('f-rrn').value.trim(),
    workType: checked ? checked.value : '월급제',
    weekHours: Number($('f-weekhours').value) || 0,
    base: unfmt($('f-base').value),
    hourlyWage: unfmt($('f-hourly').value),
    otHours: Number($('f-othours').value) || 0,
    bonus: unfmt($('f-bonus').value),
    etc: unfmt($('f-etc').value),
    meal: unfmt($('f-meal').value),
    car: unfmt($('f-car').value),
    insNp: $('f-ins-np').checked,
    insHi: $('f-ins-hi').checked,
    insEi: $('f-ins-ei').checked,
    incomeTax: unfmt($('f-tax').value)
  };
}

/*
  ** 설명: dl 목록 안에 "항목명 : 금액" 한 줄씩 그려 넣는다 // ** 이유: 미리보기와 상세보기에서 똑같이 쓰려고 함수로 만듦 **
  ** 변경 전 코드 ** div.innerHTML = text.replace(/\n/g, '<br>');
     → innerHTML은 글자 속 <script> 같은 '명령'까지 실행할 수 있어 해킹(XSS) 위험이 있다.
  // ** 변경 후 코드 ** dt.textContent = label;  (글자는 언제나 글자로만 넣는다, 절대규칙 9번)
*/
function renderPairs(dlElement, pairs) {
  dlElement.textContent = '';                            // 안을 비운다
  pairs.forEach(function (pair) {
    const row = document.createElement('div');           // 새 칸 만들기
    if (pair[2]) row.className = pair[2];                // 3번째 값이 있으면 꾸밈용 이름표
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = pair[0];
    dd.textContent = pair[1];
    row.append(dt, dd);                                  // 칸 안에 이름·값 넣기
    dlElement.appendChild(row);                          // 목록에 붙이기
  });
}

/* ** 설명: 계산 결과를 [항목명, 값] 목록으로 정리 // ** 이유: 0원인 항목은 빼서 보기 좋게 (예전 AGENTS_RULE '0원 항목 숨기기' 규칙을 화면에 적용) ** */
function resultPairs(r) {
  const all = [
    ['월 소정근로시간', r.mHours + '시간'],
    ['통상시급', won(r.ordinaryWage)],
    ['기본급', won(r.base)],
    ['연장수당', r.overtimePay ? won(r.overtimePay) : null],
    ['비과세 합계', won(r.nonTaxable)],
    ['지급총액', won(r.gross)],
    ['과세급여', won(r.taxable)],
    ['국민연금', r.np ? won(r.np) : null],
    ['건강보험', r.hi ? won(r.hi) : null],
    ['장기요양보험', r.ltc ? won(r.ltc) : null],
    ['고용보험', r.ei ? won(r.ei) : null],
    ['근로소득세', r.incomeTax ? won(r.incomeTax) : null],
    ['지방소득세', r.localTax ? won(r.localTax) : null],
    ['공제총액', won(r.deductions)],
    ['실수령액', won(r.net), 'total']
  ];
  return all.filter(function (p) { return p[1] !== null; });   // null(0원)인 줄은 걸러냄
}

/* ** 설명: 입력값을 읽어 계산하고 미리보기 상자를 다시 그린다 // ** 이유: 칸을 고칠 때마다 결과가 바로 바뀌어야 실수를 바로 발견한다 ** */
function updatePreview() {
  const input = readForm();
  const r = calcPayroll(input);
  renderPairs($('preview-list'), resultPairs(r));

  const check = $('wage-check');
  if (r.minWageOk) {
    check.className = 'wage-check ok';
    check.textContent = '✅ 최저임금 충족 (통상시급 ' + won(r.ordinaryWage) + ' ≥ ' + won(S('minWage')) + ')';
  } else {
    check.className = 'wage-check bad';
    check.textContent = '⚠️ 최저임금 미달! 통상시급 ' + won(r.ordinaryWage) + ' < ' + won(S('minWage')) + ' — 근로조건을 다시 확인하세요.';
  }
}

/* ** 설명: 월급제/시급제에 따라 기본급 칸·시급 칸 중 하나만 보이게 // ** 이유: 필요 없는 칸이 보이면 헷갈린다 ** */
function toggleWorkTypeFields() {
  const isHourly = readForm().workType === '시급제';
  document.querySelectorAll('.only-monthly').forEach(function (el) { el.hidden = isHourly; });
  document.querySelectorAll('.only-hourly').forEach(function (el) { el.hidden = !isHourly; });
}


/* ==================== [덩어리 8 / 11] 저장·초기화·예시 버튼 ==================== */

/* ** 설명: 필수 칸이 비었거나 틀렸는지 검사하고, 문제가 있으면 쉬운 말로 알려준다 // ** 이유: 빈 값·틀린 값이 장부에 들어가는 것을 입구에서 막는다 ** */
function validate(input) {
  ['f-month', 'f-name', 'f-rrn'].forEach(function (id) { $(id).classList.remove('invalid'); });
  if (!input.month) { $('f-month').classList.add('invalid'); return '귀속연월을 골라 주세요.'; }
  if (!input.name)  { $('f-name').classList.add('invalid');  return '성명을 입력해 주세요.'; }
  if (!isValidRrn(input.rrn)) { $('f-rrn').classList.add('invalid'); return '주민번호는 숫자 13자리로 입력해 주세요.'; }
  if (input.workType === '시급제' && input.hourlyWage <= 0) return '시급을 입력해 주세요.';
  if (input.workType === '월급제' && input.base <= 0) return '기본급을 입력해 주세요.';
  return '';   // 빈 글자 = 문제 없음
}

/*
  ** 설명: 저장 버튼을 누르면 실행. 검사 → 계산 → 장부에 한 줄 추가(또는 덮어쓰기) // ** 이유: 이 화면의 핵심 기능 **
  ** 변경 전 코드 ** sheet.getRange(lastRow + 1, ...).setValues(rows)  (같은 사람을 두 번 보내면 두 줄이 생김)
  // ** 변경 후 코드 ** 같은 pay_id(귀속연월+직원번호)가 있으면 "덮어쓸까요?" 물어본 뒤 교체
*/
function handleSave(event) {
  event.preventDefault();               // form의 기본 동작(페이지 새로고침)을 막는다

  const input = readForm();
  const error = validate(input);
  if (error) { toast(error, true); return; }

  const records = loadRecords();
  const isNewEmp = !input.empId;
  const empId = input.empId || nextEmpId(records);       // 번호가 없으면 새로 발급
  const payId = makePayId(input.month, empId);
  const r = calcPayroll(input);

  // 같은 달·같은 직원 기록이 이미 있는지 찾는다 (findIndex: 찾으면 위치, 없으면 -1)
  const oldIndex = records.findIndex(function (x) { return x.pay_id === payId; });
  if (oldIndex !== -1 && !confirm(input.month + ' ' + empId + ' 급여가 이미 있어요. 덮어쓸까요?')) {
    return;
  }

  // 주민번호 칸을 비워 두었으면, 같은 직원의 예전 '가린 번호'를 그대로 이어 쓴다
  const prevSame = records.find(function (x) { return x.emp_id === empId && x.rrn_masked; });
  const rrnMasked = input.rrn ? maskRrn(input.rrn) : (prevSame ? prevSame.rrn_masked : '');

  // 장부 한 줄. 주민번호는 가린 값만 저장한다 (원본은 저장하지 않음)
  const record = {
    pay_id: payId,
    month: input.month,
    client_id: input.clientId,
    pay_date: input.payDate,
    emp_id: empId,
    name: input.name,
    rrn_masked: rrnMasked,
    work_type: input.workType,
    week_hours: input.weekHours,
    input: {                       // 다시 수정할 때 칸을 채우려고 입력값도 보관 (주민번호 원본은 제외)
      base: input.base, hourlyWage: input.hourlyWage, otHours: input.otHours,
      bonus: input.bonus, etc: input.etc, meal: input.meal, car: input.car,
      insNp: input.insNp, insHi: input.insHi, insEi: input.insEi, incomeTax: input.incomeTax
    },
    result: r,
    saved_at: new Date().toISOString()
  };

  if (oldIndex !== -1) records[oldIndex] = record;   // 덮어쓰기
  else records.push(record);                          // 새로 추가

  if (saveRecords(records)) {
    toast((isNewEmp ? '새 직원 ' + empId + ' 등록 + ' : '') + '급여를 저장했어요 ✅');
    resetForm();
    refreshEmpPicker();
    renderLedger();
  }
}

/* ** 설명: 입력칸을 처음 상태로 되돌린다 // ** 이유: 다음 사람을 입력하기 전 깨끗하게 ** */
function resetForm() {
  const keepMonth = $('f-month').value;          // 귀속연월은 다음 사람도 같을 때가 많아 유지
  const keepClient = $('f-client').value;
  $('pay-form').reset();                         // form 안 칸들을 HTML에 적힌 처음 값으로
  $('f-month').value = keepMonth || thisMonth();
  $('f-client').value = keepClient;
  $('f-empid').value = '';
  $('edit-badge').hidden = true;
  toggleWorkTypeFields();
  updatePreview();
}

/* ** 설명: 가짜 직원 '홍길동'을 칸에 채워 넣는다 // ** 이유: 연습할 때 매번 타이핑하지 않으려고. 실제 데이터는 절대 쓰지 않는다 (안전수칙 2번) ** */
function fillSample() {
  $('f-month').value = thisMonth();
  $('f-name').value = '홍길동';
  $('f-rrn').value = '900101-1234567';
  document.querySelector('input[name="worktype"][value="월급제"]').checked = true;
  $('f-weekhours').value = 40;
  $('f-base').value = fmt(2500000);
  $('f-othours').value = 10;
  $('f-bonus').value = '0';
  $('f-etc').value = '0';
  $('f-meal').value = fmt(200000);
  $('f-car').value = fmt(200000);
  $('f-tax').value = fmt(52000);
  toggleWorkTypeFields();
  updatePreview();
  toast('예시 데이터(가짜)를 채웠어요');
}

/* ** 설명: '기존 직원 불러오기' 목록을 채운다. 직원번호마다 가장 최근 기록 한 개만 // ** 이유: 같은 사람이 달마다 여러 줄 있어도 목록에는 한 번만 보이게 ** */
function refreshEmpPicker() {
  const picker = $('f-emp-pick');
  const latest = {};                                   // { E000001: 가장 최근 기록, ... }
  loadRecords().forEach(function (r) {
    if (!latest[r.emp_id] || latest[r.emp_id].month < r.month) latest[r.emp_id] = r;
  });

  picker.length = 1;                                   // 첫 줄("새 직원")만 남기고 지움
  Object.keys(latest).sort().forEach(function (empId) {
    const opt = document.createElement('option');
    opt.value = empId;
    opt.textContent = empId + ' · ' + latest[empId].name;
    picker.appendChild(opt);
  });
  picker.dataset.latest = JSON.stringify(latest);      // 고를 때 다시 쓰려고 보관
}

/* ** 설명: 목록에서 직원을 고르면 그 사람의 지난 급여 조건으로 칸을 채운다 // ** 이유: 매달 같은 조건을 다시 입력하는 수고를 줄인다 ** */
function handleEmpPick() {
  const empId = $('f-emp-pick').value;
  if (!empId) { $('f-empid').value = ''; return; }
  const latest = JSON.parse($('f-emp-pick').dataset.latest || '{}');
  if (latest[empId]) fillFormFromRecord(latest[empId], false);
}


/* ==================== [덩어리 9 / 11] 조회 표 그리기 ==================== */

/* ** 설명: 표의 칸(td) 하나를 만든다. data-label에 칸 이름을 붙여 둔다 // ** 이유: 폰에서 표가 카드로 바뀔 때 CSS가 이 이름을 왼쪽에 보여준다 (style.css 덩어리 7) ** */
function makeCell(label, text, className) {
  const td = document.createElement('td');
  td.dataset.label = label;                     // → <td data-label="성명">
  td.textContent = text;                        // innerHTML 대신 textContent (절대규칙 9번)
  if (className) td.className = className;
  return td;
}

/* ** 설명: 검색 조건에 맞는 기록만 골라낸다 (filter = 조건에 맞는 것만 남기기) // ** 이유: 직원은 이름이 아니라 번호로 검색한다 (절대규칙 1번) ** */
function getFilteredRecords() {
  const month = $('q-month').value;
  const client = $('q-client').value;
  const empKey = $('q-empid').value.trim().toUpperCase();
  return loadRecords()
    .filter(function (r) { return !month || r.month === month; })
    .filter(function (r) { return !client || r.client_id === client; })
    .filter(function (r) { return !empKey || r.emp_id.indexOf(empKey) !== -1; })
    .sort(function (a, b) {                     // 최신 달 먼저, 같은 달이면 직원번호 순
      return a.month === b.month ? a.emp_id.localeCompare(b.emp_id) : b.month.localeCompare(a.month);
    });
}

/* ** 설명: 조회 표와 합계 카드를 다시 그린다 // ** 이유: 저장·삭제·검색할 때마다 화면이 최신 상태여야 한다 ** */
function renderLedger() {
  const list = getFilteredRecords();
  const body = $('ledger-body');
  body.textContent = '';                        // 표 내용 비우기

  let sumGross = 0;
  let sumNet = 0;

  list.forEach(function (r) {
    sumGross += r.result.gross;
    sumNet += r.result.net;

    const tr = document.createElement('tr');
    tr.append(
      makeCell('귀속연월', r.month),
      makeCell('직원번호', r.emp_id),
      makeCell('성명', r.name),
      makeCell('주민번호', r.rrn_masked || '-'),
      makeCell('지급총액', won(r.result.gross), 'num'),
      makeCell('비과세', won(r.result.nonTaxable), 'num'),
      makeCell('공제총액', won(r.result.deductions), 'num'),
      makeCell('실수령액', won(r.result.net), 'num'),
      makeCell('최저임금', r.result.minWageOk ? '충족' : '미달', r.result.minWageOk ? 'ok' : 'bad')
    );

    // 관리 버튼 3개 (상세/수정/삭제). 어떤 기록인지 data-id에 pay_id를 붙여 둔다
    const tdBtn = document.createElement('td');
    tdBtn.dataset.label = '관리';
    [['상세', 'detail'], ['수정', 'edit'], ['삭제', 'delete']].forEach(function (b) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm ' + (b[1] === 'delete' ? 'btn-danger' : 'btn-ghost');
      btn.textContent = b[0];
      btn.dataset.action = b[1];
      btn.dataset.id = r.pay_id;
      tdBtn.appendChild(btn);
    });
    tr.appendChild(tdBtn);
    body.appendChild(tr);
  });

  $('empty-msg').hidden = list.length > 0;
  $('sum-count').textContent = list.length + '명';
  $('sum-gross').textContent = won(sumGross);
  $('sum-net').textContent = won(sumNet);
}


/* ==================== [덩어리 10 / 11] 상세보기·수정·삭제·CSV ==================== */

/*
  ** 설명: 표 안의 버튼 클릭을 한 곳에서 처리한다 (이벤트 위임) // ** 이유: 버튼마다 따로 연결하지 않고, 표 전체에 한 번만 연결하면 줄이 늘어도 잘 동작한다 **
  event.target.closest('button') = 누른 곳에서 가장 가까운 버튼 찾기
*/
function handleLedgerClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const records = loadRecords();
  const record = records.find(function (r) { return r.pay_id === btn.dataset.id; });
  if (!record) { toast('기록을 찾을 수 없어요. 새로고침 해 보세요.', true); return; }

  if (btn.dataset.action === 'detail') showDetail(record);
  if (btn.dataset.action === 'edit') { fillFormFromRecord(record, true); switchTab('input-section'); }
  if (btn.dataset.action === 'delete') {
    if (!confirm(record.month + ' ' + record.emp_id + ' ' + record.name + ' 급여를 삭제할까요?')) return;
    if (saveRecords(records.filter(function (r) { return r.pay_id !== record.pay_id; }))) {
      toast('삭제했어요');
      refreshEmpPicker();
      renderLedger();
    }
  }
}

/* ** 설명: 상세보기 팝업을 띄운다 // ** 이유: 표에 없는 4대보험·세금 내역을 하나하나 확인하려고 ** */
function showDetail(record) {
  const client = CLIENTS.find(function (c) { return c.id === record.client_id; });
  $('detail-title').textContent = record.month + ' · ' + record.emp_id + ' · ' + record.name;
  renderPairs($('detail-list'), [
    ['고객', record.client_id + (client ? ' ' + client.name : '')],
    ['주민번호', record.rrn_masked || '-'],
    ['근로유형', record.work_type + ' / 주 ' + record.week_hours + '시간'],
    ['지급일', record.pay_date || '-']
  ].concat(resultPairs(record.result)));
  $('detail-dialog').showModal();               // 팝업 열기
}

/*
  ** 설명: 저장된 기록으로 입력칸을 채운다 // ** 이유: '수정' 버튼과 '기존 직원 불러오기'에서 같이 쓴다 **
  isEdit가 true면 귀속연월까지 그대로(=같은 건 고치기), false면 조건만 가져오고 달은 그대로(=새 달 입력)
  ⚠️ 주민번호 원본은 저장하지 않았으므로 칸을 비워 둔다 → 비워 두고 저장하면 기존 가린 번호를 유지
*/
function fillFormFromRecord(record, isEdit) {
  const inp = record.input;
  if (isEdit) $('f-month').value = record.month;
  $('f-client').value = record.client_id;
  $('f-paydate').value = isEdit ? (record.pay_date || '') : '';
  $('f-empid').value = record.emp_id;
  $('f-name').value = record.name;
  $('f-rrn').value = '';
  $('f-rrn').placeholder = record.rrn_masked || '900101-1234567';
  document.querySelector('input[name="worktype"][value="' + record.work_type + '"]').checked = true;
  $('f-weekhours').value = record.week_hours;
  $('f-base').value = fmt(inp.base);
  $('f-hourly').value = fmt(inp.hourlyWage);
  $('f-othours').value = isEdit ? inp.otHours : 0;   // 연장시간·상여는 달마다 달라서 새 달이면 0
  $('f-bonus').value = fmt(isEdit ? inp.bonus : 0);
  $('f-etc').value = fmt(inp.etc);
  $('f-meal').value = fmt(inp.meal);
  $('f-car').value = fmt(inp.car);
  $('f-ins-np').checked = inp.insNp;
  $('f-ins-hi').checked = inp.insHi;
  $('f-ins-ei').checked = inp.insEi;
  $('f-tax').value = fmt(inp.incomeTax);
  $('edit-badge').hidden = !isEdit;
  toggleWorkTypeFields();
  updatePreview();
}

/*
  ** 설명: 지금 조회된 목록을 CSV(엑셀로 열 수 있는 글자 파일)로 내려받는다 // ** 이유: 엑셀·구글시트로 옮겨 확인하거나 보관하려고 **
  '﻿' = 엑셀이 한글을 깨뜨리지 않게 파일 맨 앞에 붙이는 표시(BOM)
*/
function downloadCsv() {
  const list = getFilteredRecords();
  if (list.length === 0) { toast('내려받을 데이터가 없어요', true); return; }

  const header = ['귀속연월', 'client_id', 'emp_id', '성명', '주민번호(가림)', '근로유형', '기본급', '연장수당',
    '비과세', '지급총액', '국민연금', '건강보험', '장기요양', '고용보험', '소득세', '지방소득세', '공제총액', '실수령액'];
  const rows = list.map(function (r) {
    const x = r.result;
    return [r.month, r.client_id, r.emp_id, r.name, r.rrn_masked, r.work_type, x.base, x.overtimePay,
      x.nonTaxable, x.gross, x.np, x.hi, x.ltc, x.ei, x.incomeTax, x.localTax, x.deductions, x.net];
  });

  // 칸 안에 쉼표·따옴표가 있어도 깨지지 않게 "로 감싼다
  const csv = [header].concat(rows).map(function (row) {
    return row.map(function (v) { return '"' + String(v === undefined ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });   // Blob = 파일 덩어리
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '급여대장_' + ($('q-month').value || '전체') + '.csv';
  a.click();                                                                       // 보이지 않는 링크를 눌러 다운로드
  URL.revokeObjectURL(a.href);
}


/* ==================== [덩어리 11 / 11] 탭 전환 + 시작 ==================== */

/* ** 설명: 탭 버튼을 누르면 해당 구역만 보이게 // ** 이유: is-shown, is-active 이름표를 옮겨 붙이면 CSS가 알아서 보이기/숨기기를 한다 ** */
function switchTab(targetId) {
  document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('is-shown', p.id === targetId); });
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.target === targetId); });
  if (targetId === 'list-section') renderLedger();
  window.scrollTo(0, 0);
}

/* ** 설명: 고객 선택 목록을 채운다 // ** 이유: 입력 화면과 조회 화면 두 곳에서 같은 고객 목록을 쓴다 ** */
function fillClientSelect(select, withAll) {
  if (withAll) select.appendChild(new Option('전체', ''));          // new Option(보이는 글자, 값)
  CLIENTS.forEach(function (c) { select.appendChild(new Option(c.id + ' · ' + c.name, c.id)); });
}

/* ** 설명: 설정값 표를 그린다 // ** 이유: 지금 어떤 숫자로 계산하는지 눈으로 확인할 수 있게 ** */
function renderSettings() {
  const body = $('settings-body');
  Object.keys(SETTINGS).forEach(function (key) {
    const s = SETTINGS[key];
    const shown = s.value < 1 ? (Math.round(s.value * 100000) / 1000) + '%'   // 0.0475 → 4.75%
      : (s.value < 10 ? s.value + '배' : fmt(s.value));
    const tr = document.createElement('tr');
    tr.append(makeCell('항목', s.label), makeCell('값', shown), makeCell('설명', s.note));
    body.appendChild(tr);
  });
}

/* ** 설명: <title>에 적힌 제목(날짜·용량 포함)을 화면 큰 제목에도 똑같이 넣는다 // ** 이유: 제목을 한 곳만 고치면 되게 ** */
function syncTitle() {
  $('app-title').textContent = document.title;
}

/*
  ** 설명: 페이지가 다 열리면 딱 한 번 실행되는 "시작 버튼" // ** 이유: 칸 채우기, 버튼 연결 등 준비 작업을 순서대로 한다 **
  DOMContentLoaded = "HTML 뼈대를 다 읽었다"는 사건
*/
document.addEventListener('DOMContentLoaded', function () {
  // 1) 제목·목록·설정 화면 준비
  syncTitle();
  fillClientSelect($('f-client'), false);
  fillClientSelect($('q-client'), true);
  renderSettings();
  $('f-month').value = thisMonth();
  $('q-month').value = thisMonth();

  // 2) 탭 버튼 연결
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { switchTab(tab.dataset.target); });
  });

  // 3) 입력 화면: 칸이 바뀔 때마다 미리보기 다시 계산
  attachMoneyFormat();
  $('pay-form').addEventListener('input', updatePreview);
  $('pay-form').addEventListener('change', function (e) {
    if (e.target.name === 'worktype') toggleWorkTypeFields();
    updatePreview();
  });
  $('pay-form').addEventListener('submit', handleSave);
  $('btn-reset').addEventListener('click', resetForm);
  $('btn-sample').addEventListener('click', fillSample);
  $('f-emp-pick').addEventListener('change', handleEmpPick);

  // 4) 조회 화면: 검색칸이 바뀌면 표 다시 그리기
  ['q-month', 'q-client', 'q-empid'].forEach(function (id) {
    $(id).addEventListener('input', renderLedger);
  });
  $('ledger-body').addEventListener('click', handleLedgerClick);
  $('btn-csv').addEventListener('click', downloadCsv);

  // 5) 팝업 닫기, 전체 삭제
  $('btn-close-detail').addEventListener('click', function () { $('detail-dialog').close(); });
  $('btn-clear-all').addEventListener('click', function () {
    if (!confirm('연습 데이터를 모두 지울까요? 되돌릴 수 없어요.')) return;
    if (saveRecords([])) { refreshEmpPicker(); renderLedger(); toast('모두 지웠어요'); }
  });

  // 6) 처음 화면 그리기
  refreshEmpPicker();
  toggleWorkTypeFields();
  updatePreview();
  renderLedger();
});
