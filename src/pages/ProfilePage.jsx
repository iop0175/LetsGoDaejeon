import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import './ProfilePage.css'

const ProfilePage = () => {
  const { isDark } = useTheme()
  const { user, loading: authLoading, loginWithKakao, logout } = useAuth()
  const navigate = useNavigate()

  // 프로필 상태
  const [profile, setProfile] = useState({
    nickname: '',
    avatar_url: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)

  // 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('프로필 로드 에러:', error)
          return
        }

        if (data) {
          setProfile({
            nickname: data.nickname || '',
            avatar_url: data.avatar_url || ''
          })
        } else {
          // 프로필이 없으면 기본값으로 카카오 정보 사용
          setProfile({
            nickname: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
          })
        }
      } catch (err) {
        console.error('프로필 로드 실패:', err)
      }
    }

    loadProfile()
  }, [user])

  // 프로필 저장
  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 닉네임 유효성 검사
      if (!profile.nickname.trim()) {
        setMessage({ type: 'error', text: '닉네임을 입력해주세요.' })
        setIsSaving(false)
        return
      }

      if (profile.nickname.trim().length < 2) {
        setMessage({ type: 'error', text: '닉네임은 2글자 이상이어야 합니다.' })
        setIsSaving(false)
        return
      }

      if (profile.nickname.trim().length > 20) {
        setMessage({ type: 'error', text: '닉네임은 20글자 이하여야 합니다.' })
        setIsSaving(false)
        return
      }

      // upsert로 프로필 저장 (없으면 생성, 있으면 업데이트)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nickname: profile.nickname.trim(),
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (error) {
        console.error('프로필 저장 에러:', error)
        setMessage({ type: 'error', text: '프로필 저장에 실패했습니다.' })
      } else {
        setMessage({ type: 'success', text: '프로필이 저장되었습니다!' })
        setIsEditing(false)
      }
    } catch (err) {
      console.error('프로필 저장 실패:', err)
      setMessage({ type: 'error', text: '프로필 저장에 실패했습니다.' })
    }

    setIsSaving(false)
  }

  // 아바타 URL 변경
  const handleAvatarChange = (e) => {
    const url = e.target.value
    setProfile(prev => ({ ...prev, avatar_url: url }))
    setAvatarPreview(url)
  }

  // 로그아웃
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (err) {
      console.error('로그아웃 실패:', err)
    }
  }

  // 로딩 중
  if (authLoading) {
    return (
      <div className={`profile-page ${isDark ? 'dark' : ''}`}>
        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  // 비로그인 상태
  if (!user) {
    return (
      <div className={`profile-page ${isDark ? 'dark' : ''}`}>
        <div className="profile-login-required">
          <div className="profile-login-icon">👤</div>
          <h2>로그인이 필요합니다</h2>
          <p>프로필 설정을 위해 로그인해주세요.</p>
          <button 
            className="profile-kakao-login-btn"
            onClick={() => loginWithKakao('/profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            카카오로 로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`profile-page ${isDark ? 'dark' : ''}`}>
      <div className="profile-container">
        <div className="profile-header">
          <h1>프로필 설정</h1>
          <p>회원 정보를 관리하세요</p>
        </div>

        {/* 메시지 표시 */}
        {message.text && (
          <div className={`profile-message profile-message--${message.type}`}>
            {message.type === 'success' ? '✓' : '⚠'} {message.text}
          </div>
        )}

        <div className="profile-card">
          {/* 아바타 섹션 */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              {avatarPreview || profile.avatar_url ? (
                <img 
                  src={avatarPreview || profile.avatar_url} 
                  alt="프로필 이미지" 
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextElementSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="profile-avatar-placeholder"
                style={{ display: (avatarPreview || profile.avatar_url) ? 'none' : 'flex' }}
              >
                {profile.nickname ? profile.nickname[0].toUpperCase() : '?'}
              </div>
            </div>
          </div>

          {/* 정보 섹션 */}
          <div className="profile-info-section">
            {/* 이메일 (읽기 전용) */}
            <div className="profile-field">
              <label>이메일</label>
              <div className="profile-field-value profile-field-readonly">
                {user.email || '이메일 없음'}
              </div>
            </div>

            {/* 로그인 방식 */}
            <div className="profile-field">
              <label>로그인 방식</label>
              <div className="profile-field-value profile-field-readonly">
                {user.app_metadata?.provider === 'kakao' ? (
                  <span className="profile-provider-badge profile-provider-kakao">
                    카카오
                  </span>
                ) : (
                  <span className="profile-provider-badge">
                    {user.app_metadata?.provider || '이메일'}
                  </span>
                )}
              </div>
            </div>

            {/* 닉네임 */}
            <div className="profile-field">
              <label>닉네임</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.nickname}
                  onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="닉네임을 입력하세요"
                  className="profile-input"
                  maxLength={20}
                />
              ) : (
                <div className="profile-field-value">
                  {profile.nickname || '닉네임 없음'}
                </div>
              )}
            </div>

            {/* 아바타 URL (수정 모드에서만) */}
            {isEditing && (
              <div className="profile-field">
                <label>프로필 이미지 URL</label>
                <input
                  type="url"
                  value={profile.avatar_url}
                  onChange={handleAvatarChange}
                  placeholder="이미지 URL을 입력하세요"
                  className="profile-input"
                />
                <p className="profile-field-hint">
                  외부 이미지 URL을 입력하세요 (https://...)
                </p>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="profile-actions">
            {isEditing ? (
              <>
                <button 
                  className="profile-btn profile-btn--secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setAvatarPreview(null)
                    setMessage({ type: '', text: '' })
                  }}
                  disabled={isSaving}
                >
                  취소
                </button>
                <button 
                  className="profile-btn profile-btn--primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <button 
                className="profile-btn profile-btn--primary"
                onClick={() => setIsEditing(true)}
              >
                프로필 수정
              </button>
            )}
          </div>
        </div>

        {/* 계정 관리 섹션 */}
        <div className="profile-card profile-card--danger">
          <h3>계정 관리</h3>
          <div className="profile-account-actions">
            <button 
              className="profile-btn profile-btn--danger"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
