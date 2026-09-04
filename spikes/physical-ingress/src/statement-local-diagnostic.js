const REVIEW_CODE_MAP = Object.freeze({
  STATEMENT_PERIOD_AMBIGUOUS: 'STMT_PERIOD_AMBIGUOUS',
  STATEMENT_HEADER_GEOMETRY_UNKNOWN: 'STMT_HEADER_GEOMETRY',
  STATEMENT_ROW_BOTH_DEBIT_CREDIT: 'STMT_ROW_BOTH_SIDES',
  STATEMENT_ROW_BOTH_INCOME_EXPENSE: 'STMT_ROW_BOTH_SIDES'
});

export function compactStatementReviewCode(review = []) {
  const codes = Array.isArray(review)
    ? review.map(item => String(item?.code ?? '')).filter(Boolean)
    : [];
  for (const code of codes) {
    if (REVIEW_CODE_MAP[code]) return REVIEW_CODE_MAP[code];
  }
  return 'STMT_LAYOUT_REVIEW';
}
