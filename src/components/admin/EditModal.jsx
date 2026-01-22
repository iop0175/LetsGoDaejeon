import { memo, useState, useRef } from 'react'
import { FiX, FiUpload, FiLoader, FiImage, FiTrash2 } from 'react-icons/fi'
import { uploadImage, uploadResizedImage, deleteImage } from '../../services/blobService'

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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFieldChange = (field, value) => {
    onFormChange({ ...formData, [field]: value })
  }

  // 이미지 파일 선택 처리
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    try {
      // 리사이즈 후 업로드 (최대 1200x800, 품질 85%)
      const result = await uploadResizedImage(file, 'admin-images', {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.85
      })

      if (result.success) {
        handleFieldChange('imageUrl', result.url)
      } else {
        setUploadError(result.error || '업로드 실패')
      }
    } catch (error) {
      setUploadError('이미지 업로드 중 오류가 발생했습니다.')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 이미지 삭제 (Blob에서)
  const handleImageDelete = async () => {
    const imageUrl = formData.imageUrl
    if (!imageUrl) return

    // Vercel Blob URL인 경우만 삭제 시도
    if (imageUrl.includes('vercel-storage.com')) {
      try {
        await deleteImage(imageUrl)
      } catch (error) {
        console.error('Delete error:', error)
      }
    }

    // URL 필드 비우기
    handleFieldChange('imageUrl', '')
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
                <div className="image-upload-section">
                  {/* URL 입력 */}
                  <input
                    type="text"
                    value={formData[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={language === 'ko' ? 'URL 직접 입력 또는 이미지 업로드' : 'Enter URL or upload image'}
                  />
                  
                  {/* 이미지 업로드 버튼 */}
                  <div className="upload-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <FiLoader className="spin" /> {language === 'ko' ? '업로드 중...' : 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <FiUpload /> {language === 'ko' ? '이미지 업로드' : 'Upload Image'}
                        </>
                      )}
                    </button>
                    {formData[field] && (
                      <button
                        type="button"
                        className="delete-image-btn"
                        onClick={handleImageDelete}
                        disabled={uploading}
                      >
                        <FiTrash2 /> {language === 'ko' ? '이미지 삭제' : 'Delete'}
                      </button>
                    )}
                  </div>
                  
                  {/* 업로드 에러 */}
                  {uploadError && (
                    <div className="upload-error">{uploadError}</div>
                  )}
                  
                  {/* 이미지 미리보기 */}
                  {formData[field] && (
                    <div className="image-preview">
                      <img src={formData[field]} alt="Preview" />
                      <span className="preview-label">
                        <FiImage /> {language === 'ko' ? '미리보기' : 'Preview'}
                      </span>
                    </div>
                  )}
                </div>
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
            disabled={saving || uploading}
          >
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button 
            className="save-btn" 
            onClick={onSave}
            disabled={saving || uploading}
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
