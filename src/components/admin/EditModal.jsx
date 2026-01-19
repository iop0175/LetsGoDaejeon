import { memo } from 'react'
import { FiX } from 'react-icons/fi'

/**
 * 데이터 수정 모달 컴포넌트
 */
const EditModal = memo(({
  isOpen,
  onClose,
  title,
  fields = [],
  labels = {},
  formData = {},
  onFormChange,
  onSave,
  saving = false,
  language = 'ko'
}) => {
  if (!isOpen) return null

  const handleFieldChange = (field, value) => {
    onFormChange({ ...formData, [field]: value })
  }

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={e => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>{title || (language === 'ko' ? '데이터 수정' : 'Edit Data')}</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="edit-modal-content">
          {fields.map(field => (
            <div key={field} className="form-group">
              <label>{labels[field] || field}</label>
              {field === 'imageUrl' ? (
                <>
                  <input
                    type="text"
                    value={formData[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={`${labels[field] || field} 입력`}
                  />
                  {formData[field] && (
                    <div className="image-preview-small">
                      <img src={formData[field]} alt="Preview" />
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={formData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={`${labels[field] || field} 입력`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="edit-modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={saving}
          >
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button 
            className="save-btn" 
            onClick={onSave}
            disabled={saving}
          >
            {saving 
              ? (language === 'ko' ? '저장 중...' : 'Saving...') 
              : (language === 'ko' ? '저장' : 'Save')
            }
          </button>
        </div>
      </div>
    </div>
  )
})

EditModal.displayName = 'EditModal'

export default EditModal
