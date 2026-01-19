import { memo } from 'react'

/**
 * 페이지네이션 컴포넌트
 */
const Pagination = memo(({ 
  currentPage, 
  totalPages, 
  onPageChange,
  language = 'ko'
}) => {
  if (totalPages <= 1) return null

  // 표시할 페이지 번호 계산
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i)
    }
    
    return pages
  }

  const texts = {
    ko: { first: '처음', prev: '이전', next: '다음', last: '마지막' },
    en: { first: 'First', prev: 'Prev', next: 'Next', last: 'Last' }
  }
  const t = texts[language] || texts.ko

  return (
    <div className="admin-pagination">
      <button 
        className="page-btn"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        {t.first}
      </button>
      <button 
        className="page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        {t.prev}
      </button>
      
      <div className="page-numbers">
        {getPageNumbers().map(pageNum => (
          <button
            key={pageNum}
            className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </button>
        ))}
      </div>
      
      <button 
        className="page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        {t.next}
      </button>
      <button 
        className="page-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        {t.last}
      </button>
    </div>
  )
})

Pagination.displayName = 'Pagination'

export default Pagination
