export function IndexNotReady() {
  return (
    <div className="note">
      <div>
        <b>인덱스 준비 중:</b> 원문·분석 기록 인덱스가 아직 만들어지지 않았습니다 — 배치 파이프라인이
        다음 실행을 마치면 열립니다.
      </div>
    </div>
  );
}
