// Vercel Blob 이미지 업로드 서비스

// Next.js + Vite 호환 환경변수 체크
const isProduction = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'production' 
  : (typeof import.meta !== 'undefined' && import.meta.env?.PROD)

const API_BASE_URL = isProduction
  ? '' // 프로덕션에서는 상대 경로 사용
  : 'http://localhost:3000'; // 개발 환경

/**
 * 이미지 파일을 Vercel Blob에 업로드
 * @param {File} file - 업로드할 파일
 * @param {string} folder - 저장할 폴더 (기본값: 'images')
 * @returns {Promise<Object>} { success, url, filename, size, contentType, error }
 */
export const uploadImage = async (file, folder = 'images') => {
  try {
    // 파일 유효성 검사
    if (!file) {
      return { success: false, error: '파일이 선택되지 않았습니다.' }
    }

    // 이미지 파일 타입 확인
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: '지원되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 가능)' }
    }

    // 파일 크기 확인 (최대 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: '파일 크기가 10MB를 초과합니다.' }
    }

    // FormData 생성
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    // 업로드 요청
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '업로드에 실패했습니다.')
    }

    const result = await response.json()
    return {
      success: true,
      url: result.url,
      filename: result.filename,
      size: result.size,
      contentType: result.contentType
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      success: false, 
      error: error.message || '이미지 업로드에 실패했습니다.' 
    }
  }
}

/**
 * Vercel Blob에서 이미지 삭제
 * @param {string} url - 삭제할 이미지 URL
 * @returns {Promise<Object>} { success, error }
 */
export const deleteImage = async (url) => {
  try {
    if (!url) {
      return { success: false, error: 'URL이 제공되지 않았습니다.' }
    }

    // Vercel Blob URL인지 확인
    if (!url.includes('vercel-storage.com') && !url.includes('blob.vercel-storage.com')) {
      return { success: false, error: 'Vercel Blob URL이 아닙니다.' }
    }

    const response = await fetch(`${API_BASE_URL}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '삭제에 실패했습니다.')
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { 
      success: false, 
      error: error.message || '이미지 삭제에 실패했습니다.' 
    }
  }
}

/**
 * 이미지를 리사이즈하여 업로드 (클라이언트 사이드)
 * @param {File} file - 원본 파일
 * @param {number} maxWidth - 최대 너비 (기본값: 1200)
 * @param {number} maxHeight - 최대 높이 (기본값: 800)
 * @param {number} quality - 품질 0-1 (기본값: 0.85)
 * @returns {Promise<Blob>} 리사이즈된 이미지 Blob
 */
export const resizeImage = async (file, maxWidth = 1200, maxHeight = 800, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // 비율 유지하면서 리사이즈
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => resolve(blob),
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        )
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 리사이즈 후 업로드
 * @param {File} file - 원본 파일
 * @param {string} folder - 저장할 폴더
 * @param {Object} options - 리사이즈 옵션
 * @returns {Promise<Object>} 업로드 결과
 */
export const uploadResizedImage = async (file, folder = 'images', options = {}) => {
  try {
    const { maxWidth = 1200, maxHeight = 800, quality = 0.85 } = options
    
    const resizedBlob = await resizeImage(file, maxWidth, maxHeight, quality)
    const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type })
    
    return await uploadImage(resizedFile, folder)
  } catch (error) {
    console.error('Resize and upload error:', error)
    return { success: false, error: '이미지 처리에 실패했습니다.' }
  }
}
