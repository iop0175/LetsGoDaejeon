import { memo, useState } from 'react'
import { FiDatabase, FiSave, FiCheck, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi'

/**
 * 페이지 데이터 테이블 컴포넌트
 */
const DataTable = memo(({ 
  data, 
  fields, 
  labels, 
  currentPage, 
  itemsPerPage,
  loading,
  language,
  onSaveItem,
  onEditItem,
  onDeleteItem,
  showSaveButton = false,
  showEditButton = false,
  showDeleteButton = false,
  savedItems = []
}) => {
  const [savingItems, setSavingItems] = useState({})

  const handleSave = async (item, idx) => {
    if (!onSaveItem) return
    
    const itemKey = `${currentPage}-${idx}`
    setSavingItems(prev => ({ ...prev, [itemKey]: 'saving' }))
    
    try {
      await onSaveItem(item)
      setSavingItems(prev => ({ ...prev, [itemKey]: 'saved' }))
      setTimeout(() => {
        setSavingItems(prev => {
          const updated = { ...prev }
          delete updated[itemKey]
          return updated
        })
      }, 2000)
    } catch (error) {
      console.error('저장 실패:', error)
      setSavingItems(prev => ({ ...prev, [itemKey]: 'error' }))
      setTimeout(() => {
        setSavingItems(prev => {
          const updated = { ...prev }
          delete updated[itemKey]
          return updated
        })
      }, 2000)
    }
  }

  // 아이템 고유 ID 생성 (첫 번째 필드 값 사용)
  const getItemId = (item) => {
    const firstField = fields[0]
    return item[firstField] || JSON.stringify(item)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="no-data">
        <FiDatabase size={48} />
        <p>{language === 'ko' ? '데이터 없음' : 'No data'}</p>
      </div>
    )
  }

  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              {fields.map(field => (
                <th key={field}>{labels[field] || field}</th>
              ))}
              {showSaveButton && <th>{language === 'ko' ? '저장' : 'Save'}</th>}
              {(showEditButton || showDeleteButton) && <th>{language === 'ko' ? '관리' : 'Actions'}</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const itemKey = `${currentPage}-${idx}`
              const itemId = getItemId(item)
              const isSaved = savedItems.includes(itemId)
              const saveStatus = savingItems[itemKey]
              
              return (
                <tr key={idx} className={isSaved ? 'saved-row' : ''}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  {fields.map(field => {
                    const value = item[field]
                    const strValue = value ? String(value) : ''
                    return (
                      <td key={field} title={strValue}>
                        {strValue ? strValue.substring(0, 60) : '-'}
                        {strValue.length > 60 ? '...' : ''}
                      </td>
                    )
                  })}
                  {showSaveButton && (
                    <td className="save-cell">
                      {isSaved ? (
                        <span className="saved-badge" title={language === 'ko' ? '저장됨' : 'Saved'}>
                          <FiCheck />
                        </span>
                      ) : saveStatus === 'saving' ? (
                        <span className="saving-spinner"></span>
                      ) : saveStatus === 'saved' ? (
                        <span className="save-success"><FiCheck /></span>
                      ) : saveStatus === 'error' ? (
                        <span className="save-error"><FiX /></span>
                      ) : (
                        <button 
                          className="save-item-btn"
                          onClick={() => handleSave(item, idx)}
                          title={language === 'ko' ? 'DB에 저장' : 'Save to DB'}
                        >
                          <FiSave />
                        </button>
                      )}
                    </td>
                  )}
                  {(showEditButton || showDeleteButton) && (
                    <td className="action-cell">
                      {showEditButton && onEditItem && (
                        <button 
                          className="edit-item-btn"
                          onClick={() => onEditItem(item)}
                          title={language === 'ko' ? '수정' : 'Edit'}
                        >
                          <FiEdit2 />
                        </button>
                      )}
                      {showDeleteButton && onDeleteItem && (
                        <button 
                          className="delete-item-btn"
                          onClick={() => onDeleteItem(item)}
                          title={language === 'ko' ? '삭제' : 'Delete'}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

DataTable.displayName = 'DataTable'

export default DataTable
