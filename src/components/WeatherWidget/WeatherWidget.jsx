import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { WiThermometer, WiHumidity, WiStrongWind, WiBarometer, WiDust, WiRefresh, WiDaySunny, WiCloudy, WiRain, WiSnow, WiFog } from 'react-icons/wi';
import { FiMapPin, FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import './WeatherWidget.css';

const WeatherWidget = () => {
  const { language } = useLanguage();
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const text = {
    ko: {
      title: '대전 날씨 정보',
      subtitle: '실시간 기상센서 데이터',
      temperature: '온도',
      humidity: '습도',
      windSpeed: '풍속',
      pressure: '기압',
      dust: '미세먼지',
      loading: '날씨 정보를 불러오는 중...',
      error: '날씨 정보를 불러올 수 없습니다',
      refresh: '새로고침',
      lastUpdate: '마지막 업데이트'
    },
    en: {
      title: 'Daejeon Weather',
      subtitle: 'Real-time sensor data',
      temperature: 'Temp',
      humidity: 'Humidity',
      windSpeed: 'Wind',
      pressure: 'Pressure',
      dust: 'PM',
      loading: 'Loading weather...',
      error: 'Could not load weather',
      refresh: 'Refresh',
      lastUpdate: 'Last update'
    }
  };

  const t = text[language];

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      // Open-Meteo API 사용 (무료, CORS 지원)
      // 대전 좌표: 36.3504, 127.3845
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=36.3504&longitude=127.3845&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m&timezone=Asia/Seoul'
      );
      const data = await response.json();
      
      if (data.current) {
        setWeatherData([{
          snsrNm: '대전광역시',
          temp: data.current.temperature_2m?.toFixed(1) || '22.5',
          humid: data.current.relative_humidity_2m || '65',
          windSpd: data.current.wind_speed_10m?.toFixed(1) || '2.3',
          pressure: data.current.surface_pressure?.toFixed(0) || '1013',
          weatherCode: data.current.weather_code || 0
        }]);
        setLastUpdate(new Date());
      } else {
        throw new Error('No data received');
      }
    } catch (err) {

      // API 실패 시 샘플 데이터 표시
      setWeatherData([{
        snsrNm: '대전광역시',
        temp: '22.5',
        humid: '65',
        windSpd: '2.3',
        pressure: '1013',
        weatherCode: 0
      }]);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  // 날씨 코드에 따른 아이콘과 설명
  const getWeatherInfo = (code) => {
    // WMO Weather interpretation codes
    const weatherCodes = {
      0: { icon: WiDaySunny, label: { ko: '맑음', en: 'Clear' } },
      1: { icon: WiDaySunny, label: { ko: '대체로 맑음', en: 'Mainly clear' } },
      2: { icon: WiCloudy, label: { ko: '구름 조금', en: 'Partly cloudy' } },
      3: { icon: WiCloudy, label: { ko: '흐림', en: 'Overcast' } },
      45: { icon: WiFog, label: { ko: '안개', en: 'Fog' } },
      48: { icon: WiFog, label: { ko: '짙은 안개', en: 'Dense fog' } },
      51: { icon: WiRain, label: { ko: '이슬비', en: 'Drizzle' } },
      53: { icon: WiRain, label: { ko: '이슬비', en: 'Drizzle' } },
      55: { icon: WiRain, label: { ko: '이슬비', en: 'Drizzle' } },
      61: { icon: WiRain, label: { ko: '비', en: 'Rain' } },
      63: { icon: WiRain, label: { ko: '비', en: 'Rain' } },
      65: { icon: WiRain, label: { ko: '폭우', en: 'Heavy rain' } },
      71: { icon: WiSnow, label: { ko: '눈', en: 'Snow' } },
      73: { icon: WiSnow, label: { ko: '눈', en: 'Snow' } },
      75: { icon: WiSnow, label: { ko: '폭설', en: 'Heavy snow' } },
      95: { icon: WiRain, label: { ko: '뇌우', en: 'Thunderstorm' } }
    };
    return weatherCodes[code] || weatherCodes[0];
  };

  // 첫 번째 센서 데이터 사용
  const weather = weatherData[0] || {};

  // 온도에 따른 색상
  const getTempColor = (temp) => {
    const t = parseFloat(temp);
    if (t < 0) return '#4A90D9';
    if (t < 10) return '#5BA8D9';
    if (t < 20) return '#6BC96D';
    if (t < 30) return '#F5A623';
    return '#E74C3C';
  };

  // 미세먼지 상태
  const getDustStatus = (pm10) => {
    const val = parseInt(pm10);
    if (val <= 30) return { status: language === 'ko' ? '좋음' : 'Good', color: '#2ECC71' };
    if (val <= 80) return { status: language === 'ko' ? '보통' : 'Normal', color: '#F39C12' };
    if (val <= 150) return { status: language === 'ko' ? '나쁨' : 'Bad', color: '#E74C3C' };
    return { status: language === 'ko' ? '매우나쁨' : 'Very Bad', color: '#8E44AD' };
  };

  if (loading) {
    return (
      <div className="weather-widget weather-loading">
        <div className="weather-spinner"></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget weather-error">
        <p>{error}</p>
        <button onClick={fetchWeather} className="refresh-btn">
          <WiRefresh /> {t.refresh}
        </button>
      </div>
    );
  }

  return (
    <div className={`weather-widget ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="weather-header">
        <div className="weather-title">
          <h3>{t.title}</h3>
          <span className="weather-location">
            <FiMapPin /> {weather.snsrNm || '대전광역시'}
          </span>
        </div>
        <div className="weather-header-buttons">
          <button onClick={fetchWeather} className="refresh-btn" title={t.refresh}>
            <WiRefresh />
          </button>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="collapse-btn" 
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="weather-main">
            <div className="weather-main-content">
              <div className="weather-icon-large">
                {(() => {
                  const weatherInfo = getWeatherInfo(weather.weatherCode || 0);
                  const IconComponent = weatherInfo.icon;
                  return <IconComponent />;
                })()}
              </div>
              <div className="temperature" style={{ color: getTempColor(weather.temp || 22) }}>
                <span className="temp-value">{weather.temp || '22'}</span>
                <span className="temp-unit">°C</span>
              </div>
            </div>
            <div className="weather-status">
              {getWeatherInfo(weather.weatherCode || 0).label[language]}
            </div>
          </div>

          <div className="weather-details">
            <div className="weather-item">
              <WiHumidity className="weather-icon" />
              <div className="weather-info">
                <span className="weather-label">{t.humidity}</span>
                <span className="weather-value">{weather.humid || '65'}%</span>
              </div>
            </div>
            <div className="weather-item">
              <WiStrongWind className="weather-icon" />
              <div className="weather-info">
                <span className="weather-label">{t.windSpeed}</span>
                <span className="weather-value">{weather.windSpd || '2.3'} m/s</span>
              </div>
            </div>
            <div className="weather-item">
              <WiBarometer className="weather-icon" />
              <div className="weather-info">
                <span className="weather-label">{t.pressure}</span>
                <span className="weather-value">{weather.pressure || '1013'} hPa</span>
              </div>
            </div>
          </div>

          {lastUpdate && (
            <div className="weather-footer">
              <FiClock />
              <span>{t.lastUpdate}: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </>
      )}

      {isCollapsed && (
        <div className="weather-collapsed-info">
          <div className="weather-icon-small">
            {(() => {
              const weatherInfo = getWeatherInfo(weather.weatherCode || 0);
              const IconComponent = weatherInfo.icon;
              return <IconComponent />;
            })()}
          </div>
          <span className="collapsed-temp" style={{ color: getTempColor(weather.temp || 22) }}>
            {weather.temp || '22'}°C
          </span>
          <span className="collapsed-status">
            {getWeatherInfo(weather.weatherCode || 0).label[language]}
          </span>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
